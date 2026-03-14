# SafeView

Ethereum ERC20 wallet viewer. Add wallet addresses, view token balances, and track portfolio value in USD.

## Tech Stack

### Backend (`apps/api`)
- Node.js + TypeScript
- Fastify
- Prisma + SQLite
- Zod (validation)
- Google OAuth 2.0 + JWT

### Frontend (`apps/web`)
- React + TypeScript
- Vite
- Tailwind CSS + Material UI
- React Router
- Axios

## Prerequisites

- Node.js 20+
- pnpm 10+
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
FRONTEND_URL="http://localhost:5173"
PORT=3003
```

**Web** — create `apps/web/.env`:

```env
VITE_GOOGLE_CLIENT_ID="your-google-client-id"
```

### 3. Run database migrations

```bash
pnpm db:migrate
```

### 4. Start the development servers

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
│   │       ├── lib/alchemy.ts       # Alchemy + CoinGecko API client
│   │       ├── lib/prisma.ts        # Prisma client
│   │       ├── modules/auth/        # Google OAuth + JWT
│   │       ├── modules/wallet/      # Wallet CRUD + balances
│   │       ├── app.ts              # Fastify app setup
│   │       └── server.ts           # Entry point
│   └── web/
│       └── src/
│           ├── components/          # Header, AddWalletForm, WalletCard
│           ├── contexts/            # AuthContext
│           ├── hooks/               # useWallets
│           ├── pages/               # LoginPage, DashboardPage
│           ├── services/            # Axios API client
│           └── types/               # TypeScript interfaces
├── package.json
└── pnpm-workspace.yaml
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/google` | Authenticate with Google credential |
| `GET` | `/auth/me` | Get current user |
| `GET` | `/api/wallets` | List user wallets |
| `POST` | `/api/wallets` | Add a wallet |
| `DELETE` | `/api/wallets/:id` | Remove a wallet |
| `GET` | `/api/wallets/:id/balances` | Get wallet ETH + token balances |

## License

ISC
