# SHI — мини-приложение в Telegram

Витрина: `index.html` (разделы SHI MEDIA, SHI SHOP, SHI BUYER, SHI PARTNERS, каталог, карточка товара, поиск).
Админка: `admin.html` (товары с фото и видео, баннеры и видео главной, тексты страниц, контакт для заявок).
База и файлы: Supabase (бесплатный тариф). Хостинг: GitHub Pages.

## Запуск

1. Supabase: новый проект, регион Европа (Frankfurt). В SQL Editor выполнить `schema.sql`.
2. Authentication → Providers → Email: выключить «Allow new users to sign up». Users → Add user: почта и пароль для админки (пароль задаёт владелец сам).
3. Project Settings → API: URL проекта и anon public key вписать в `config.js`.
4. Залить файлы в репозиторий, включить GitHub Pages (Settings → Pages → Deploy from branch → main / root).
5. В @BotFather: бот → Bot Settings → Configure Mini App → ссылка на GitHub Pages. Кнопку в канале SHI SHOP сделать ссылкой на мини-приложение.
6. Перенос товаров из канала: скрипт переноса запускается из веб-версии Telegram (фото уходят сразу в хранилище Supabase).

## Ограничения бесплатного тарифа

- Файл до 50 МБ: видео перед загрузкой сжимать (для баннера достаточно 5–15 МБ, 1080p, без звука).
- Хранилище 1 ГБ. Если неделю никто не заходит, Supabase ставит бесплатный проект на паузу, включается вручную в панели. При живом трафике этого не бывает.

## Что не входит

Корзина и онлайн-оплата (ЮKassa или Robokassa) делаются отдельно.
