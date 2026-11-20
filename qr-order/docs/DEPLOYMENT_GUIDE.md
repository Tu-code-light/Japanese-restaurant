# Deployment Guide

## Local Docker deployment

Set production values, then start all services:

```bash
cd qr-order
JWT_SECRET="<32+ character secret>" CUSTOMER_APP_URL="https://app.example.com" CORS_ORIGINS="https://app.example.com" docker compose up -d --build
```

The stack provides PostgreSQL, the API/WebSocket backend, and the nginx frontend. The backend image runs `node src/main/server.js`; the frontend proxy forwards `/api`, `/socket.io`, and `/uploads`.

On Windows PowerShell, set environment variables before `docker compose up -d --build`.

## Database

The local PostgreSQL service uses a named volume. Back it up before upgrades:

```bash
docker exec qr_order_postgres pg_dump -U postgres qr_order > backup.sql
```

Restore:

```bash
docker exec -i qr_order_postgres psql -U postgres qr_order < backup.sql
```

For a cloud PostgreSQL provider, set `DATABASE_URL` to the provider's connection string and run:

```bash
cd qr-order/backend
npm run db:init
```

Do not commit real database credentials or JWT secrets. Keep `.env.example` and deployment environment variables free of real secrets.

## Cloud hosting

Suitable backend hosts are Render or a VPS that keeps a Node process running and supports WebSocket upgrades. Deploy the frontend as static nginx/container hosting with HTTPS. Configure:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CUSTOMER_APP_URL`
- `CORS_ORIGINS`
- `UPLOAD_DIR`

Use HTTPS for `CUSTOMER_APP_URL` and CORS origins, and use WSS when the frontend and backend use separate origins.

## Verification and rollback

```text
GET /api/health
```

Verify migrations, authentication, QR table lookup, order creation, WebSocket events, frontend routing, and image serving before release.

For rollback, deploy the previous backend/frontend images and restore the database backup only if a migration or data change requires it.
