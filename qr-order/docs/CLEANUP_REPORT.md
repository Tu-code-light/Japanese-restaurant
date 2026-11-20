# Repository Cleanup Report

## A. Initial structure

The Git repository root was:

```text
C:\Users\Dang Thanh Tu\OneDrive\Máy tính\năm 2 kì 2\laptrinhmang\qr-order
```

The outer repository contained a nested repository copy at `Japanese-restaurant-latest/`. The outer index staged that copy as Git subproject commit `4a787da` (resolved nested HEAD).

There were also two source trees:

- `qr-order/`
- `Japanese-restaurant-latest/qr-order/`

The nested repository had no working-tree or untracked-file changes and was 20 commits behind its branch. The outer `qr-order/` tree contained newer Docker, realtime, reports, integration-test, frontend and documentation work.

## B. Comparison

| Item | Outer `qr-order/` | Nested `Japanese-restaurant-latest/qr-order/` | Result |
| --- | --- | --- | --- |
| Backend | 123 source/config/test files excluding dependencies | 104 source/config/test files excluding dependencies | Outer kept; contains reports, Docker, live E2E and additional fixes |
| Frontend | Full customer/staff/admin implementation | Older implementation | Outer kept; contains sales report and newer components |
| Docs | Database, wireframes and handover documents | Database and wireframes | Outer kept; Docker, testing, architecture and cleanup docs preserved |
| README | Project instructions | Older nested instructions | Merged key Docker/test instructions into repository-root README |
| Docker | Backend/frontend/PostgreSQL Compose stack | PostgreSQL-only Compose stack | Outer Docker stack kept |
| Git | Main repository `devdevelop` | Nested repository `devdevelop`, clean, 20 commits behind | Nested repository copy removed after verification |

SHA256 comparison: 47 identical files, 57 differing files, 19 files only in the outer tree, and no source file only in the nested tree.

## C. Files processed

| Path | Action | Reason |
| --- | --- | --- |
| `Japanese-restaurant-latest/` | Remove | Clean nested repository copy; outer source tree superseded it |
| `package-lock.json` | Remove | Empty root lockfile had no matching root `package.json` |
| `qr-order/.gitignore` | Merge then remove | Consolidated under repository-root `.gitignore` |
| `qr-order/README.md` | Merge then remove | Repository-root README is the official project README |
| `qr-order/backend/` | Keep | Complete, newer backend implementation |
| `qr-order/frontend/` | Keep | Complete, newer frontend implementation |
| `qr-order/docker-compose.yml` | Keep | Valid full-stack PostgreSQL/backend/frontend configuration |

## D. Structure after cleanup

```text
qr-order/
├── .gitignore
├── .vscode/
│   └── launch.json
├── README.md
├── qr-order/
│   ├── backend/
│   ├── frontend/
│   ├── docs/
│   ├── .gitignore (removed; consolidated at root)
│   ├── docker-compose.yml
│   └── README.md (removed; consolidated at root)
└── package-lock.json (removed)
```

The workspace is now the outer repository with one `qr-order/` source directory.

## E. Validation

- Git root: outer repository
- Branch: `devdevelop`
- Existing nested repository: removed
- Docker Compose: configuration validation passed
- Docker containers: PostgreSQL, backend and frontend remained available
- Backend tests: 11/11 passed after cleanup
- Frontend build: Vite production build passed
- Live E2E/realtime test: passed within the backend test suite

## F. Current state

- No nested `Japanese-restaurant-latest/` directory remains.
- No nested `qr-order/qr-order/` directory remains.
- VS Code launch settings retain the local Vite port 5173 and add the Docker frontend port 80.

## G. Remaining issues

- The Docker Desktop/PostgreSQL environment may contain test data from earlier load/E2E runs.
- Replace sample JWT secrets and credentials before production deployment.
- Run database backup/reset procedures before destructive production operations.
