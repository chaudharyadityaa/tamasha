# Deployment

Tamasha runs entirely on free tiers.

| Piece | Service | Notes |
|---|---|---|
| Frontend | Cloudflare Pages | Built from `frontend/` on every push to `main` (`npm run build`, output `dist`) |
| Backend | Render free web service (Docker) | Built from `backend/Dockerfile` on every push to `main`. Sleeps after 15 idle minutes |
| Database | Neon free Postgres 17 | Direct (non-pooled) connection with `sslmode=require`. Compute sleeps after 5 idle minutes |

## Backend environment variables (set in Render, never committed)

| Variable | Purpose |
|---|---|
| `EVENTHUB_DB_URL`, `EVENTHUB_DB_USER`, `EVENTHUB_DB_PASSWORD` | Neon connection |
| `EVENTHUB_DB_POOL_SIZE` | `5`, small so the free database is never overwhelmed |
| `EVENTHUB_JWT_SECRET` | Token signing key, generated randomly for this deployment |
| `EVENTHUB_ADMIN_EMAIL`, `EVENTHUB_ADMIN_PASSWORD` | Creates the first administrator at startup |
| `EVENTHUB_DEMO_PAYMENTS` | `true`: simulated payments only, no money moves |
| `EVENTHUB_FORWARD_HEADERS` | `native`: the real client address behind Render's proxy, needed by the rate limiter |
| `EVENTHUB_CORS_ORIGINS` | The exact address of the Pages site |

## Frontend build variables (set in Cloudflare Pages)

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | The Render address. It is baked into the build, so changing it needs a new deploy |
| `NODE_VERSION` | Node version used by the build |

## Things to remember

- **No health check path on Render.** A health check would query the database constantly and keep it awake, using up Neon's free monthly compute hours.
- **No uptime pinger**, for the same reason.
- The frontend warms the server on load and shows a notice while a sleeping server wakes up.
- To rotate secrets, change the variable in Render; the service redeploys itself. A new `EVENTHUB_JWT_SECRET` logs everybody out.