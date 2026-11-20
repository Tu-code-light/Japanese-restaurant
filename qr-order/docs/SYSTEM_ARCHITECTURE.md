# System Architecture

## Runtime

- Frontend: React 18, Vite, React Router, Zustand
- Backend: Node.js, Express
- Realtime: Socket.IO over the same HTTP server
- Database: PostgreSQL 16 through `pg`
- Validation: Zod
- Authentication: JWT
- Product images: local storage under `UPLOAD_DIR`

## Request flow

```text
Customer QR (/t/:token)
  -> public table/menu API
  -> public order API
  -> PostgreSQL transaction
  -> Socket.IO order:new
  -> staff store room

Staff JWT
  -> protected REST API
  -> PostgreSQL update
  -> Socket.IO order_status_updated
  -> customer table room
```

Staff sockets join the store room. Customer sockets join the table room. The server also emits a temporary notification event for kitchen observers.

## Main directories

- `backend/src/application`: business services
- `backend/src/domain`: order constants
- `backend/src/infrastructure`: database, repositories, storage, Socket.IO
- `backend/src/presentation`: HTTP controllers, DTOs, routes
- `backend/src/main`: composition root and server lifecycle
- `backend/test`: unit, realtime, and integration tests
- `frontend/src/pages`: customer and staff screens
- `frontend/src/components`: reusable UI
- `frontend/src/api`: API wrapper
- `frontend/src/lib/socket.js`: Socket.IO client
