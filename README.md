# Ферма Артёма

Полноценная среда для симуляции фермерского хозяйства. Проект включает три основных
сервиса:

- **frontend** — одностраничное приложение на React/Vite.
- **backend** — REST API на Express с MySQL и интеграцией с OpenSearch.
- **nginx** — единая точка входа, проксирующая SPA, API и OpenSearch Dashboards.

## Быстрый старт

```bash
docker compose up --build
```

По умолчанию для OpenSearch задаётся безопасный пароль `ChangeMe123!`. При
необходимости замените его, передав переменную окружения
`OPENSEARCH_INITIAL_ADMIN_PASSWORD` при запуске `docker compose`.


После успешного запуска будут доступны:

- UI фермы — <http://localhost>
- Swagger UI — <http://localhost/api/docs>
- Почта (MailHog) — <http://localhost:8025>
- OpenSearch Dashboards — <http://localhost/opensearch>
- Kafka UI — <http://localhost:8080>

Для корректной работы необходимо, чтобы в `backend/.env` и `frontend/.env`
прописаны значения по примеру из соответствующих `*.env.example`.

## Сервисы

| Сервис | Назначение | Порт внутри Docker | Порт на хосте |
| ------ | ---------- | ------------------ | ------------- |
| mysql | Хранение данных пользователей и игры | 3306 | 3306 |
| opensearch | Хранение логов | 9200 | 9200 |
| opensearch-dashboards | Дашборды для логов | 5601 | 5601 |
| zookeeper | Координация Kafka | 2181 | 2181 |
| kafka | Брокер сообщений для очереди посадки | 9092/29092 | 9092/29092 |
| kafka-ui | UI для просмотра топиков Kafka | 8080 | 8080 |
| mailhog | Тестовая SMTP-песочница и веб-интерфейс писем | 1025/8025 | 1025/8025 |
| backend | REST API и миграции | 3000 | 3000 |
| frontend | Статическая сборка SPA | 80 | 5173 |
| nginx | Reverse proxy и единая точка входа | 80 | 80 |

Backend запускает миграции при старте контейнера и экспортирует `GET /api/health`
для healthcheck'ов. Логи запросов пишутся в stdout и, при наличии настроенного
OpenSearch, индексируются в `ferm-logs`.

## Переменные окружения

### Backend

Все ключевые параметры описаны в `backend/.env.example`. Дополнительно поддерживается
`DB_CONNECTION_LIMIT` для настройки пула подключений и параметры OpenSearch:

- `OPENSEARCH_NODE`
- `OPENSEARCH_USERNAME`
- `OPENSEARCH_PASSWORD`
- `OPENSEARCH_TLS_REJECT_UNAUTHORIZED`

Для очереди посадки используются переменные Kafka:

- `KAFKA_ENABLED`
- `KAFKA_BROKERS`
- `KAFKA_CLIENT_ID`
- `KAFKA_CONSUMER_GROUP`
- `KAFKA_PLANT_TOPIC`

### Frontend

SPA использует `VITE_API_BASE` (по умолчанию `/api`). Значение можно изменить в
`frontend/.env`.

## Локальная разработка

- **Backend:** `npm run dev` из директории `backend` (требуется Node.js 20+).
- **Frontend:** `npm run dev` из директории `frontend`.

Перед запуском убедитесь, что MySQL и OpenSearch доступны и заполнены значения в `.env`.

## Логи и наблюдаемость

По умолчанию `/opensearch` на nginx проксирует OpenSearch Dashboards с базовым путём
`/opensearch`. Это устраняет конфликт между SPA и консолью аналитики.

Логи backend отправляются в OpenSearch асинхронно и не блокируют обработку запросов.

## Асинхронная посадка через Kafka

Запрос `POST /api/garden/plant` ставит задачу в Kafka-топик, а воркер backend
повторно валидирует данные и проводит транзакцию посадки. Статус и содержимое
топиков можно смотреть в Kafka UI по адресу <http://localhost:8080>.
