import { vi } from "vitest";

// Mock env before anything imports it
vi.mock("../config/env.js", () => ({
  env: {
    NODE_ENV: "development",
    DATABASE_URL: "file:./test.db",
    GOOGLE_CLIENT_ID: "test-google-client-id",
    GOOGLE_CLIENT_SECRET: "test-google-client-secret",
    JWT_SECRET: "test-jwt-secret-that-is-at-least-32-chars-long",
    ALCHEMY_API_KEY: "test-alchemy-key",
    REDIS_URL: "redis://127.0.0.1:6379",
    FRONTEND_URL: "http://localhost:5173",
    PORT: 3003,
  },
  isDev: true,
}));

// Mock redis
vi.mock("../lib/redis.js", () => ({
  redis: { ping: vi.fn().mockResolvedValue("PONG"), get: vi.fn(), set: vi.fn(), del: vi.fn() },
  redisOptions: {},
  getJson: vi.fn().mockResolvedValue(null),
  setJson: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
}));

// Mock prisma
vi.mock("../lib/prisma.js", () => ({
  prisma: {
    user: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
    wallet: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// Mock sync-worker
vi.mock("../lib/sync-worker.js", () => ({
  enqueueSyncWallet: vi.fn().mockResolvedValue(undefined),
  invalidateAndSync: vi.fn(),
  waitForSync: vi.fn(),
  cleanupAddress: vi.fn().mockResolvedValue(undefined),
  KEYS: {
    walletData: (address: string) => `sv:wallet_data:${address}`,
    ethPrices: () => "sv:eth_prices",
  },
}));

// Mock logger (Fastify requires fatal and trace)
vi.mock("../lib/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
    child: vi.fn().mockReturnThis(),
    level: "info",
  },
}));
