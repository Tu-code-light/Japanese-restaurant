# Docker Deployment Report

## A. Created files

- `backend/Dockerfile`
- `backend/.dockerignore`
- `frontend/Dockerfile`
- `frontend/.dockerignore`
- `frontend/nginx.conf`
- `.env.example`
- `docs/DOCKER_GUIDE.md`

## B. Modified files

- `docker-compose.yml`: PostgreSQL/frontend/backend healthchecks, healthy-dependency conditions, persistent volumes and internal database URL.
- `backend/Dockerfile`: runs schema/migrations/seed initialization before server start.
- `frontend/Dockerfile`: production nginx build and frontend healthcheck.
- `backend/scripts/loadTest.js`: filters load events to the current load run.
- `backend/test/e2e.integration.test.js`: notification and cleanup filters now match the test order safely.

## C. Docker services

| Service | Image/Build | Port | Status |
| --- | --- | --- | --- |
| Frontend | `qr-order/frontend` nginx image | `80` | Healthy |
| Backend | `qr-order/backend` Node 20 image | `4000` | Healthy |
| Database | `postgres:16-alpine` | `5432` | Healthy |

## D. Test results

| Hạng mục | Kết quả |
| --- | --- |
| Docker Compose validation | PASS |
| Docker build | PASS |
| Database healthcheck | PASS |
| Backend healthcheck | PASS |
| Frontend healthcheck | PASS |
| Frontend/API proxy | PASS |
| Integration test | PASS |
| Backend suite | PASS, 11/11 |
| Socket.IO/realtime | PASS |
| Load test | PASS, 10 users, 100% success, 10/10 events |
| Persistence after restart | PASS, order count remained unchanged |
| Backend restart | PASS, backend returned healthy after restart |
| Frontend health | PASS, nginx returned healthy after IPv4 healthcheck fix |
| LAN QR URL | PASS, QR URL used `http://192.168.2.230/t/<token>` and LAN customer API returned successfully |

Measured load test: 10 concurrent customers; throughput 35.80 requests/second; API p95 89 ms; event end-to-end p95 87 ms.

## E. Run

```bash
cd qr-order
docker compose up -d --build
```

- Frontend: `http://localhost`
- Backend: `http://localhost:4000`
- Health: `http://localhost/api/health`

## F. Remaining issues

- Cloud hosting credentials and production domains are not configured.
- Replace sample production credentials and sample staff passwords before public deployment.
- Load/P99/CPU/RAM measurements require a larger staging environment.
