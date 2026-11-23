# AdaptiveGIS Online Store

Full-stack ecommerce platform. React/TypeScript frontend + Node.js/Express/TypeScript backend + MySQL, deployed via Coolify (Docker Compose + Traefik).

> See `CLAUDE.md` for architecture details, constraints, and development guidance.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite 5, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | MySQL 8.0 |
| Auth | JWT (admin + customer tokens) |
| Payments | Stripe, PayPal, Square, Authorize.Net |
| Shipping | EasyPost, Shippo, ShipStation |
| Deploy | Coolify, Docker Compose, Traefik TLS |

## Prerequisites

- Node.js 18+
- Docker + Docker Compose (for full stack)
- MySQL 8 (for local backend dev without Docker)

## Quick Start

### Local development (without Docker)

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Copy env file and fill in values
cp .env.example .env

# Start backend (hot-reload)
npm run dev

# Start frontend (separate terminal)
cd frontend && npm run dev
```

Frontend: http://localhost:5173  
Backend API: http://localhost:3001

### Docker Compose (local full stack)

```bash
cp .env.example .env
# Edit .env with your values (see Required Environment Variables below)
docker compose -f docker-compose.yml up --build
```

## Required Environment Variables

Copy `.env.example` to `.env` and set:

| Variable | Description |
|---|---|
| `DB_USER` / `DB_PASSWORD` / `DB_NAME` | MySQL credentials |
| `MYSQL_USER` / `MYSQL_PASSWORD` / `MYSQL_DATABASE` / `MYSQL_ROOT_PASSWORD` | MySQL Docker vars |
| `JWT_SECRET` | Strong random string (min 32 chars) — **never use `dev-secret` in production** |
| `CORS_ORIGIN` | Allowed frontend origin(s), comma-separated |
| `INITIAL_ADMIN_USERNAME` / `INITIAL_ADMIN_PASSWORD` / `INITIAL_ADMIN_EMAIL` | Seeded on first deploy if admins table is empty |

See `.env.example` for a full list.

## Build

```bash
# Build backend
npm run build

# Build frontend
cd frontend && npm run build
```

## Database

```bash
# Run migrations (idempotent — safe to re-run)
npm run db:migrate

# Seed initial data (first deploy only)
npm run db:seed
```

## Deployment (Coolify)

All secrets are injected as environment variables via the Coolify UI — **never hardcode credentials in compose files**.

- `docker-compose.yaml` → dev environment
- `docker-compose.prod.yaml` → production environment

## Project Structure

```
backend-src/       Express API source (TypeScript)
  db/              Migrations, seed, connection
  middleware/      JWT auth middleware
  routes/          API route handlers
  services/        Email, shipping provider wrappers
  utils/           Helpers (encryption, templates, watermark)
  server.ts        App entry point

frontend/          React SPA (Vite)
  src/App.tsx      Router root
  pages/           Page components
  components/      Shared UI components
  context/         React Contexts
  services/        API client and service helpers
  hooks/           Custom React hooks

dist/              Compiled backend (git-ignored)
```

## Support

- Vite: https://vitejs.dev
- React: https://react.dev
- Express: https://expressjs.com
