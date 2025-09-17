
UI Pack — «Фермерские» фон и иконки
-----------------------------------

Содержимое распаковать в проект поверх существующих файлов:
  copy frontend/src/ui/assets/*  → в ваш проект
  copy frontend/src/ui/styles.css → заменить
  copy frontend/src/ui/App.tsx    → заменить

После замены пересоберите фронтенд:
  docker compose build frontend
  docker compose up -d frontend

Если используете локально `npm run dev` — просто перезапустите dev-сервер.

