# SafeView

Ethereum ERC-20 wallet viewer. Add wallet addresses, view token balances, and track portfolio value in USD, EUR, and BRL.

## Architecture

```
[Frontend] --GET /balances--> [API: reads Redis cache] --cache miss--> [waits for sync job]
                               POST /refresh ---------> [enqueues priority job, waits for result]

[BullMQ Worker] --every 2min--> sync-all --> sync-wallet (per address)
                                              |-> Alchemy APIs (ETH balance, ERC-20 tokens)
                                              |-> CryptoCompare (prices USD/EUR/BRL)
                                              |-> stores in Redis (TTL 120s)
```

The worker runs in the same process as Fastify to save memory.

## Tech Stack

### Backend (`apps/api`)
- Node.js + TypeScript
- Fastify
- Prisma + SQLite
- BullMQ + Redis (background sync & caching)
- Zod (validation)
- Google OAuth 2.0 + JWT

### Frontend (`apps/web`)
- React 19 + TypeScript
- Vite
- Tailwind CSS + Material UI
- React Router
- Axios

## Prerequisites

- Node.js 22+
- pnpm 10+
- Redis 7+
- [Google OAuth Client ID](https://console.cloud.google.com/apis/credentials)
- [Alchemy API Key](https://dashboard.alchemy.com/)

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

**API** — copy and edit `apps/api/.env`:

```bash
cp apps/api/.env.example apps/api/.env
```

```env
DATABASE_URL="file:./dev.db"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
JWT_SECRET="your-jwt-secret"
ALCHEMY_API_KEY="your-alchemy-api-key"
REDIS_URL="redis://127.0.0.1:6379"
FRONTEND_URL="http://localhost:5173"
PORT=3003
```

**Web** — create `apps/web/.env`:

```env
VITE_GOOGLE_CLIENT_ID="your-google-client-id"
```

### 3. Start Redis

```bash
# macOS
brew services start redis

# Linux
sudo systemctl start redis-server

# Verify
redis-cli ping  # → PONG
```

### 4. Run database migrations

```bash
pnpm db:migrate
```

### 5. Start the development servers

```bash
pnpm dev
```

- API: `http://localhost:3003`
- Web: `http://localhost:5173`

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start both API and Web in dev mode |
| `pnpm dev:api` | Start API only |
| `pnpm dev:web` | Start Web only |
| `pnpm build` | Build all packages |
| `pnpm lint` | Lint all packages |
| `pnpm test` | Run unit & integration tests |
| `pnpm test:e2e` | Run Playwright e2e tests |
| `pnpm test:e2e:ui` | Open Playwright interactive UI |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:generate` | Regenerate Prisma Client |

## Project Structure

```
safe-view/
├── apps/
│   ├── api/
│   │   ├── prisma/                  # Schema & migrations
│   │   └── src/
│   │       ├── config/env.ts        # Zod-validated environment
│   │       ├── lib/alchemy.ts       # Alchemy + CryptoCompare API calls
│   │       ├── lib/redis.ts         # Redis client + JSON helpers
│   │       ├── lib/sync-worker.ts   # BullMQ queue, worker & scheduler
│   │       ├── lib/prisma.ts        # Prisma client
│   │       ├── modules/auth/        # Google OAuth + JWT
│   │       ├── modules/wallet/      # Wallet CRUD + balances
│   │       ├── app.ts              # Fastify app setup
│   │       └── server.ts           # Entry point + worker init
│   └── web/
│       └── src/
│           ├── components/          # Header, AddWalletForm, WalletCard
│           ├── contexts/            # AuthContext, ThemeContext
│           ├── hooks/               # useWallets, useWalletBalances
│           ├── pages/               # LoginPage, DashboardPage
│           ├── services/            # Axios API client
│           └── types/               # TypeScript interfaces
├── nginx/                           # Nginx config for production
├── package.json
└── pnpm-workspace.yaml
```

## API Endpoints

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/google` | Authenticate with Google credential |
| `GET` | `/auth/me` | Get current user |

### Wallets (requires auth)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/wallets` | List user wallets |
| `POST` | `/api/wallets` | Add a wallet (triggers background sync) |
| `PATCH` | `/api/wallets/:id` | Update wallet label |
| `DELETE` | `/api/wallets/:id` | Remove a wallet (cleans Redis if unused) |
| `GET` | `/api/wallets/:id/balances?currency=usd` | Get balances from Redis cache |
| `POST` | `/api/wallets/:id/refresh?currency=usd` | Force refresh balances |

### Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check (includes Redis status) |

## Tests

### Unit & Integration Tests (Vitest)

Unit and integration tests for both API and frontend using Vitest.

```bash
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # Coverage report
```

| Package | Files | Coverage |
|---------|-------|----------|
| `apps/api` | 5 suites, 41 tests | Auth routes, wallet routes, Alchemy API, health check, error handler |
| `apps/web` | 9 suites, 64 tests | Contexts (Auth, Theme), pages (Login, Dashboard), components (Header, WalletCard, AddWalletForm), hooks, API service |

### E2E Tests (Playwright)

End-to-end tests with Playwright covering all user flows. APIs are mocked via `page.route()` for fast, deterministic tests without requiring the backend.

```bash
pnpm test:e2e          # Run headless
pnpm test:e2e:headed   # Run with visible browser
pnpm test:e2e:ui       # Open Playwright interactive UI
```

| File | Tests | Coverage |
|------|-------|----------|
| `e2e/auth.spec.ts` | 6 | Login page, route guards, user menu, logout |
| `e2e/dashboard.spec.ts` | 6 | Empty state, wallet list, grand total, controls |
| `e2e/wallet-management.spec.ts` | 10 | Add wallet (validation, success, errors), edit label (save, cancel, keyboard), delete |
| `e2e/wallet-card.spec.ts` | 7 | Label, address, ETH/token balances, total, refresh |
| `e2e/currency-and-filters.spec.ts` | 7 | USD/BRL toggle, localStorage persistence, hide small balances filter |
| `e2e/theme.spec.ts` | 3 | Theme toggle, persistence, round-trip |

**Total: 40 e2e tests**

## Deployment

Deploys automatically on push to `main` via GitHub Actions:

1. Builds API and Web
2. Rsync to VPS over Cloudflare Tunnel
3. Runs Prisma migrations
4. Ensures Redis is running
5. Restarts API via pm2
6. Reloads nginx

### VPS requirements

- Node.js 22 (via nvm)
- pnpm
- Redis server
- pm2
- nginx

## License

ISC
