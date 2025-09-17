
# Artem Ferm — Учебный «фермерский» сайт (React + Node/Express + MySQL)

Стек: React (Vite, TypeScript), Node.js/Express, MySQL, JWT, Swagger UI.
Деплой: Docker Compose + Nginx (реверс-прокси).
Домен: `artem-ferm.ru` (Swagger: `https://artem-ferm.ru/api/docs`).

## Быстрый старт (локально с Docker)

```bash
# 1) Скопируйте .env.example → .env в каждом сервисе и при необходимости поправьте
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 2) Соберите и запустите
docker compose up -d --build

# 3) Откройте
# Сайт:     http://localhost
# Swagger:  http://localhost/api/docs
```

## Деплой на сервер (artem-ferm.ru)

1. Установите Docker и Docker Compose plugin.
2. Скопируйте репозиторий на сервер.
3. Заполните `.env` по образцу `*.env.example`.
4. В `nginx/nginx.conf` укажите ваш домен `server_name artem-ferm.ru;`
5. Запустите:
```bash
docker compose up -d --build
```
6. (Необязательно) Настройте HTTPS через reverse-proxy с certbot/traefik/caddy.
   В конфиге уже всё готово для реверс-прокси Nginx в этом compose.

## Архитектура/логика

- **Аутентификация**: /api/auth/register, /api/auth/login (JWT Bearer). После регистрации токен возвращается, но автоматический вход не выполняется.
- **Профиль**: /api/profile GET/PUT. При включенном чекбоксе «Ты крутой фермер?» используются поля nickname/passport, иначе ФИО. Валидация по правилам задачи.
- **Инвентарь**: семена, собранные, помытые. /api/inventory (GET), /api/inventory/wash/{id} (PATCH).
- **Магазин**: /api/shop/prices (GET), /api/shop/buy (POST), /api/shop/sell (POST). Продажи увеличивают счётчик.
- **Грядка**: 6 слотов. /api/garden/plots (GET), /api/garden/plant (POST), /api/garden/harvest (POST).
  Созревание — через 10 минут: бек хранит planted_at и вычисляет созревание по времени «сейчас - planted_at >= 10 минут».
- **Уровни**: уровень 2 после 50 проданных овощей (открываются манго/картофель/баклажан).

## Миграции SQL

См. `backend/migrations/*.sql` — автоматически применяются на старте контейнера backend.
