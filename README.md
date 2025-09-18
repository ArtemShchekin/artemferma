
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
# Логи:     http://localhost:5601 (OpenSearch Dashboards)
```
## Просмотр логов

- В состав docker-compose теперь входят `opensearch` и `opensearch-dashboards`.
- Backend автоматически отправляет структурированные логи HTTP-запросов и ошибок в индекс `ferm-logs` (можно переопределить через `OPENSEARCH_LOG_INDEX`).
- После запуска проекта откройте [http://localhost:5601](http://localhost:5601) и выберите индекс `ferm-logs*`, чтобы увидеть логи (в dev-сборке security-плагины отключены, авторизация не требуется).
- Для запуска вне Docker задайте переменные окружения `OPENSEARCH_NODE`, `OPENSEARCH_LOG_INDEX` и при необходимости `OPENSEARCH_USERNAME`/`OPENSEARCH_PASSWORD`.


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
- **Инвентарь**: семена, собранные, помытые. /api/inventory (GET), /api/inventory/wash (POST).
- **Магазин**: /api/shop/prices (GET), /api/shop/buy (POST), /api/shop/sell (POST). Продажи увеличивают счётчик.
- **Грядка**: 6 слотов. /api/garden/plots (GET), /api/garden/plant (POST), /api/garden/harvest (POST).
  Созревание — через 10 минут: бек хранит planted_at и вычисляет созревание по времени «сейчас - planted_at >= 10 минут».
- **Уровни**: уровень 2 после 50 проданных овощей (открываются манго/картофель/баклажан).

## Миграции SQL

См. `backend/migrations/*.sql` — автоматически применяются на старте контейнера backend.
