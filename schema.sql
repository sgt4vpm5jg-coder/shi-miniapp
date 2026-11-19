-- SHI мини-приложение: схема базы для Supabase.
-- Выполнить один раз в SQL Editor. Потом в Authentication → Providers → Email
-- выключить "Allow new users to sign up" и создать одного пользователя для админки.

create extension if not exists pgcrypto;

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  brand text,
  category text,                 -- Макияж, Уход, Тело, Парфюм, Аксессуары
  subcategory text,              -- Губы, Лицо, Глаза
  price integer,                 -- в рублях, null = «цена по запросу»
  is_limited boolean not null default false,
  is_gift boolean not null default false,
  description text,
  photos text[] not null default '{}',
  video text,
  source_post integer,           -- номер поста в канале SHI SHOP, для переноса
  sort integer not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists banners (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in ('media','shop','buyer','partners')),
  media_url text,
  media_type text not null default 'image' check (media_type in ('image','video')),
  title text,
  subtitle text,
  button_text text,
  link text,
  sort integer not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists pages (
  key text primary key check (key in ('media','buyer','partners')),
  title text,
  subtitle text,
  body text,
  cards jsonb not null default '[]',    -- [{title, text, dark}]
  buttons jsonb not null default '[]',  -- [{label, url}]
  updated_at timestamptz not null default now()
);

create table if not exists settings (
  key text primary key,
  value text
);

-- Права: читать могут все, менять только вошедший в админку.
alter table products enable row level security;
alter table banners  enable row level security;
alter table pages    enable row level security;
alter table settings enable row level security;

create policy "read products" on products for select using (visible or auth.role() = 'authenticated');
create policy "read banners"  on banners  for select using (visible or auth.role() = 'authenticated');
create policy "read pages"    on pages    for select using (true);
create policy "read settings" on settings for select using (true);

create policy "admin products" on products for all to authenticated using (true) with check (true);
create policy "admin banners"  on banners  for all to authenticated using (true) with check (true);
create policy "admin pages"    on pages    for all to authenticated using (true) with check (true);
create policy "admin settings" on settings for all to authenticated using (true) with check (true);

-- Хранилище фото и видео.
insert into storage.buckets (id, name, public) values ('media', 'media', true)
  on conflict (id) do nothing;

create policy "read media"  on storage.objects for select using (bucket_id = 'media');
create policy "admin media" on storage.objects for all to authenticated
  using (bucket_id = 'media') with check (bucket_id = 'media');

-- Стартовые тексты (дальше правятся в админке).
insert into pages (key, title, subtitle, body, cards, buttons) values
('media', 'SHI MEDIA', 'INDEPENDENT BEAUTY MEDIA',
 'Мы придумали независимую бьюти-редакцию. Мы говорим о красоте как о части культуры, с её историей, противоречиями и вечными попытками объяснить женщинам, как они должны выглядеть.

Мы не верим, что красота требует жертв. И не считаем, что женщины должны кому-то нравиться. Нам интересна красота как способ самовыражения, территория свободы и право делать со своей внешностью всё, что хочется. В том числе ничего.

За SHI стоят журналисты, редакторы, визажисты и контент-креаторы. И у нас есть одна общая идея: «Это по-настоящему полезно, потому что красиво».',
 '[]', '[{"label":"INSTAGRAM","url":"https://instagram.com/shi.with.me"},{"label":"TELEGRAM","url":"https://t.me/shi_shopping"}]'),
('buyer', 'SHI BUYER', null,
 'Пришлите фото или ссылку, посчитаем цену с доставкой.',
 '[{"title":"SHI BUYER","text":"Привезём из любой точки мира то, чего нет в каталоге.","dark":false},{"title":"SHI BUYER VIP","text":"Достаём лимитки и то, что не достать. Привозим в кратчайшие сроки.","dark":true}]',
 '[{"label":"НАПИСАТЬ","url":""}]'),
('partners', 'SHI PARTNERS', null,
 'Совместные проекты с блогерами, салонами и магазинами. Расскажите о себе, обсудим условия.',
 '[]', '[{"label":"СТАТЬ ПАРТНЁРОМ","url":""}]')
on conflict (key) do nothing;

insert into settings (key, value) values
('contact_username', 'zakaz_sb'),
('instagram_url', 'https://instagram.com/shi.with.me'),
('telegram_url', 'https://t.me/shi_shopping')
on conflict (key) do nothing;
