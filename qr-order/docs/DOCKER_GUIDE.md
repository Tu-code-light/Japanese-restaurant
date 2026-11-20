# Docker Guide

## Services

| Service | Purpose | Port |
| --- | --- | --- |
| `postgres` | PostgreSQL 16 persistent database | `5432` |
| `backend` | Express API, Socket.IO and database migrations | `4000` |
| `frontend` | Nginx static frontend and API/Socket proxy | `80` |

## Environment

From `qr-order/`:

```bash
Copy-Item .env.example .env
```

Set at least a production `JWT_SECRET`. The Compose database variables are `POSTGRES_USER`, `POSTGRES_PASSWORD` and `POSTGRES_DB`.

## Start

```bash
cd qr-order
docker compose up -d --build
```

The backend waits for PostgreSQL health, applies `db/schema.sql`, applies SQL migrations idempotently, seeds once, then starts Express and Socket.IO.

## Validate

```bash
docker compose config -q
docker compose ps
docker compose logs -f
```

Health endpoints:

- Frontend: `http://localhost/`
- API: `http://localhost/api/health`
- API direct: `http://localhost:4000/api/health`

## Stop and restart

```bash
docker compose restart
docker compose stop
docker compose down
```

Do not use `docker compose down -v` unless intentionally deleting the named database and upload volumes.

## Backup and restore

```bash
docker compose exec -T postgres pg_dump -U postgres qr_order > qr-order-backup.sql
docker compose exec -T postgres psql -U postgres qr_order < qr-order-backup.sql
```

## Troubleshooting

- Inspect backend logs: `docker compose logs -f backend`
- Inspect frontend logs: `docker compose logs -f frontend`
- Inspect database logs: `docker compose logs -f postgres`
- Rebuild after Dockerfile changes: `docker compose up -d --build`
