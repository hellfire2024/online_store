# CLAUDE.md — AdaptiveGIS Online Store

Governance file for AI-assisted development. Read this before making any changes.

---

## Project Overview

A full-stack ecommerce platform deployed via Coolify (Docker Compose + Traefik).

- **Backend:** Node.js + Express + TypeScript, compiles to `dist/` and runs as `node dist/server.js`
- **Frontend:** React + TypeScript + Vite, builds a static SPA served by nginx
- **Database:** MySQL 8.0
- **Auth:** JWT (admin + customer token types, both signed with the same `JWT_SECRET`)
- **Payments:** Stripe, PayPal, Square, Authorize.Net (configured via Admin > Settings)
- **Shipping:** EasyPost, Shippo, ShipStation (configured via Admin > Settings)

---

## Directory Structure

```
backend-src/          Source TypeScript for the Express API
  db/                 DB connection, migrations, seed, schema checks
  middleware/auth.ts  JWT verification — requireAdmin / requireCustomer / requireAuth
  routes/             One file per API route group
  services/           Email, shipping carrier service wrappers
  utils/              Encryption, template parser, watermark, route helpers
  server.ts           Express app entry point

dist/                 Compiled JS output (git-ignored, built at deploy time)

frontend/             React SPA (Vite)
  src/App.tsx         Router root
  pages/              Page-level components (flat + admin/ subfolder)
  components/         Shared UI components (admin/ subfolder)
  context/            React Contexts (Auth, Cart, Admin, SiteSettings, ...)
  services/           API client + service-layer helpers
  hooks/              Custom React hooks

db/                   Compiled DB helpers (mirrors backend-src/db/)

docker-compose.yaml           Dev environment (Coolify target)
docker-compose.prod.yaml      Production environment (uses env var substitution)
docker-compose.yml            Legacy/alternate compose file
Dockerfile                    Frontend nginx image
Dockerfile.backend            Backend Node image (multi-stage, alpine)
```

---

## Environment Variables

**Never hardcode credentials.** All secrets must come from environment variables.

| Variable | Required | Notes |
|---|---|---|
| `NODE_ENV` | Yes | `production` in all Docker deployments |
| `APP_ENV` | Yes | `dev` or `prod` — governs DB isolation guard |
| `JWT_SECRET` | Yes | Must be a strong random value, never the default |
| `DB_HOST/PORT/USER/PASSWORD/NAME` | Yes | MySQL connection |
| `CORS_ORIGIN` | Yes | Comma-separated allowed origins |
| `SERVICE_URL_BACKEND` | Yes | Full URL of the API (for CORS + reset email links) |
| `SERVICE_URL_FRONTEND` | Yes | Full URL of the frontend |
| `INITIAL_ADMIN_USERNAME/PASSWORD/EMAIL` | First deploy | Seeded once if admins table is empty |
| `RATE_LIMIT_WINDOW_MS` | No | Default 900000 (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | No | Default 100 per window |

For the dev compose, set these via Coolify environment variable UI — **not** hardcoded in `docker-compose.yaml`.

---

## Auth Model

- Two token types: `type: "admin"` and `type: "customer"` in JWT payload
- `requireAdmin` — admin endpoints only
- `requireCustomer` — customer account endpoints only
- `requireAuth` — either type
- Fallback secret `"dev-secret"` in code is intentional for local dev only; production must set `JWT_SECRET`

---

## Key Constraints

1. **DB isolation guard** — `APP_ENV=dev` must use a DB with `dev` in the name; `APP_ENV=prod` must use a prod-named DB. This prevents accidental cross-env writes.
2. **Settings GET is intentionally public** — `GET /api/settings` is unauthenticated so the frontend can load theme/logo before login.
3. **Image uploads return base64** — images are stored as base64 data URLs in the DB, not on disk.
4. **Migrations are idempotent** — run on every startup; safe to re-run.
5. **Demo mode** — `DEMO_MODE=1` uses mock data from `demoRoutes.js` and skips the DB entirely.

---

## Development Workflow

```bash
# Backend dev (hot-reload)
npm run dev

# Frontend dev
cd frontend && npm run dev

# Full build (backend + frontend)
npm run build
cd frontend && npm run build

# DB migration only
npm run db:migrate

# Seed (first time or empty DB)
npm run db:seed
```

---

## Deployment (Coolify)

1. Push to `dev` branch → Coolify rebuilds `docker-compose.yaml` stack
2. Push to `main` branch → Coolify rebuilds `docker-compose.prod.yaml` stack
3. All secrets injected by Coolify as environment variables — do NOT commit secrets to compose files
4. Frontend is served by nginx on port 8080; API on port 3001
5. Traefik handles TLS termination and routing

---

## What NOT to Change Without Discussion

- `backend-src/db/migrate.ts` — migrations are append-only; never edit existing migrations
- `backend-src/middleware/auth.ts` — auth logic affects all protected routes
- `docker-compose.prod.yaml` — production compose; changes deploy immediately
- JWT token structure — changing payload shape invalidates all active sessions
- `MYSQL_ROOT_PASSWORD` in compose — change in Coolify env, not in file
