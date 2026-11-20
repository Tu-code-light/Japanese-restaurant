# Testing Guide

## Prerequisites

- Node.js 20+
- PostgreSQL 16, or Docker Desktop with Docker Compose
- Backend dependencies installed with `npm ci`
- Frontend dependencies installed with `npm ci`

## Unit and realtime tests

```bash
cd qr-order/backend
npm test
npm run test:realtime
```

The realtime suite starts an isolated HTTP and Socket.IO server on an ephemeral port. It does not require PostgreSQL.

## Database and end-to-end tests

Start PostgreSQL and initialize the seed data:

```bash
cd qr-order
docker compose up -d postgres
cd backend
npm run db:init
npm run dev
```

In a second terminal:

```bash
cd qr-order/backend
npm run test:integration
```

Set `API_URL` to test another environment:

```bash
API_URL=http://localhost:4000 npm run test:integration
```

On Windows PowerShell:

```powershell
$env:API_URL="http://localhost:4000"; npm run test:integration
```

## Load test

The load script requires a running backend and initialized database.

```bash
cd qr-order/backend
CONCURRENCY=50 STAFF_CONNECTIONS=3 npm run test:load
```

Use only local/staging environments. Record the printed success rate, throughput, latency, Socket.IO event delivery, and environment limits. CPU and memory are not reported unless measured by the host.
