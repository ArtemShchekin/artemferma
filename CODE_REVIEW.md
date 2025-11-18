# Code review summary

## Reverse proxy (nginx/nginx.conf)
- The `nginx` service proxies `/` and `/api/` to hosts named `frontend` and `backend`, but every service in `docker-compose.yml` overrides its `container_name` (for example, `ferm-frontend`, `ferm-backend`). Docker Compose only publishes DNS entries for actual container names, so `frontend`/`backend` never resolve from inside the nginx container, yielding `502 Bad Gateway` for both the UI and Swagger UI. Use the declared container names (or add explicit `networks.aliases`) when configuring upstreams. 【F:nginx/nginx.conf†L1-L83】【F:docker-compose.yml†L39-L115】
- `/opensearch/` is documented in `README.md`, but the previous config returned `404` before it even reached OpenSearch Dashboards, so the analytics UI was unreachable. It should rewrite the prefix and proxy to the dashboards container instead of short-circuiting the request. 【F:README.md†L31-L42】【F:nginx/nginx.conf†L52-L72】
- The log format block lacked a terminating `;`, which prevented nginx from reloading cleanly.

## Backend logging
- Authentication handlers log both the incoming email and the full JSON response, which includes freshly minted access and refresh tokens. This leaks credentials into log storage (and into OpenSearch) and allows anyone with log access to impersonate users. Avoid logging raw tokens or redact the sensitive fields before writing to the log. 【F:backend/src/routes/auth.js†L26-L109】
- The database instrumentation logs every SQL statement *and* normalized parameters, so plaintext passwords and refresh tokens that are stored in the database will be echoed into the log stream as soon as those queries execute. Consider hashing/redacting sensitive parameters or opt-out specific statements from verbose logging. 【F:backend/src/db/pool.js†L52-L119】

