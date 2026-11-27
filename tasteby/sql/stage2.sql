-- Этап 2 TASTE BY: профиль автора, подборки, находки, фото (Supabase tscsjsenfsnafqyhmovv)
alter table public.profiles add column if not exists bio text not null default '';
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists published boolean not null default false;
alter table public.profiles add column if not exists onboarded boolean not null default false;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
alter table public.profiles add constraint profiles_bio_len check (char_length(bio) <= 300) not valid;
alter table public.profiles add constraint profiles_name_len check (char_length(name) between 1 and 80) not valid;

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 40),
  sort integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists collections_user_idx on public.collections(user_id, sort);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  collection_id uuid references public.collections(id) on delete set null,
  title text not null check (char_length(title) between 1 and 120),
  url text not null check (url ~* '^https?://' and char_length(url) <= 2000),
  shop text not null default '' check (char_length(shop) <= 80),
  photo_url text check (photo_url is null or char_length(photo_url) <= 2000),
  comment text not null default '' check (char_length(comment) <= 500),
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists items_user_idx on public.items(user_id, sort);
create index if not exists items_collection_idx on public.items(collection_id);

alter table public.collections enable row level security;
alter table public.items enable row level security;
create policy "collections: свои" on public.collections for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "items: свои" on public.items for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create or replace function public.items_check_collection() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.collection_id is not null and not exists (select 1 from public.collections c where c.id = new.collection_id and c.user_id = new.user_id) then
    raise exception 'collection does not belong to user';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger items_check_collection before insert or update on public.items for each row execute function public.items_check_collection();

-- Профиль: автор меняет имя, описание, фото, публикацию; адрес и роль не меняются
alter policy "profiles: своё имя менять" on public.profiles rename to "profiles: свой профиль менять";
create or replace function public.profiles_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'authenticated' then
    new.role := old.role; new.handle := old.handle; new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger profiles_guard before update on public.profiles for each row execute function public.profiles_guard();

-- Публичная страница: опубликованные авторы; владелец видит свою и до публикации
create or replace function public.get_page(h text) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'handle', p.handle, 'name', p.name, 'bio', p.bio, 'avatar_url', p.avatar_url, 'published', p.published, 'own', (p.id = (select auth.uid())),
    'collections', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'title', c.title) order by c.sort, c.created_at) from public.collections c where c.user_id = p.id), '[]'::jsonb),
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'collection_id', i.collection_id, 'title', i.title, 'url', i.url, 'shop', i.shop, 'photo_url', i.photo_url, 'comment', i.comment) order by i.sort, i.created_at) from public.items i where i.user_id = p.id), '[]'::jsonb)
  )
  from public.profiles p
  where p.handle = lower(h) and p.role = 'creator' and (p.published or p.id = (select auth.uid()))
$$;
revoke all on function public.get_page(text) from public;
grant execute on function public.get_page(text) to anon, authenticated;
revoke all on function public.items_check_collection() from public, anon, authenticated;
revoke all on function public.profiles_guard() from public, anon, authenticated;

-- Фото: публичное чтение, запись только в свою папку
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tb-media', 'tb-media', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy "tb-media: своя папка добавить" on storage.objects for insert to authenticated
  with check (bucket_id = 'tb-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "tb-media: своя папка менять" on storage.objects for update to authenticated
  using (bucket_id = 'tb-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "tb-media: своя папка удалить" on storage.objects for delete to authenticated
  using (bucket_id = 'tb-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
