import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import { buildApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { getJson } from "../lib/redis.js";
import { waitForSync, invalidateAndSync } from "../lib/sync-worker.js";
import type { CachedWalletData } from "../lib/alchemy.js";

const app = buildApp();

const JWT_SECRET = "test-jwt-secret-that-is-at-least-32-chars-long";
const USER_ID = "user-1";
const TOKEN = jwt.sign({ userId: USER_ID }, JWT_SECRET, { expiresIn: "7d" });
const AUTH_HEADERS = { authorization: `Bearer ${TOKEN}` };

const VALID_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
const WALLET_RECORD = {
  id: "wallet-1",
  address: VALID_ADDRESS.toLowerCase(),
  label: "Main",
  userId: USER_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const CACHED_DATA: CachedWalletData = {
  ethBalanceWei: "1000000000000000000",
  tokens: [
    {
      contractAddress: "0xdac17f958d2ee523a2206206994597c13d831ec7",
      tokenName: "Tether USD",
      tokenSymbol: "USDT",
      tokenDecimal: 6,
      balance: "100000000",
      balanceFormatted: 100,
      imageUrl: "https://example.com/usdt.png",
      prices: { usd: 1.0, eur: 0.92, brl: 5.0 },
    },
  ],
  ethPrices: { usd: 2500, eur: 2300, brl: 12500 },
  syncedAt: Date.now(),
};

beforeAll(async () => {
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/wallets", () => {
  it("returns user wallets", async () => {
    vi.mocked(prisma.wallet.findMany).mockResolvedValueOnce([WALLET_RECORD]);

    const response = await app.inject({
      method: "GET",
      url: "/api/wallets",
      headers: AUTH_HEADERS,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().wallets).toHaveLength(1);
    expect(response.json().wallets[0].address).toBe(VALID_ADDRESS.toLowerCase());
  });

  it("returns 401 without auth", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/wallets",
    });

    expect(response.statusCode).toBe(401);
  });
});

describe("POST /api/wallets", () => {
  it("creates a wallet with valid address", async () => {
    vi.mocked(prisma.wallet.findUnique).mockResolvedValueOnce(null);
    vi.mocked(prisma.wallet.create).mockResolvedValueOnce(WALLET_RECORD);

    const response = await app.inject({
      method: "POST",
      url: "/api/wallets",
      headers: AUTH_HEADERS,
      payload: { address: VALID_ADDRESS, label: "Main" },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().wallet.address).toBe(VALID_ADDRESS.toLowerCase());
  });

  it("normalizes address to lowercase", async () => {
    vi.mocked(prisma.wallet.findUnique).mockResolvedValueOnce(null);
    vi.mocked(prisma.wallet.create).mockResolvedValueOnce(WALLET_RECORD);

    await app.inject({
      method: "POST",
      url: "/api/wallets",
      headers: AUTH_HEADERS,
      payload: { address: "0xABCDEF1234567890ABCDEF1234567890ABCDEF12" },
    });

    expect(prisma.wallet.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          address: "0xabcdef1234567890abcdef1234567890abcdef12",
        }),
      })
    );
  });

  it("returns 409 for duplicate wallet", async () => {
    vi.mocked(prisma.wallet.findUnique).mockResolvedValueOnce(WALLET_RECORD);

    const response = await app.inject({
      method: "POST",
      url: "/api/wallets",
      headers: AUTH_HEADERS,
      payload: { address: VALID_ADDRESS },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error).toBe("Wallet already added");
  });

  it("returns 400 for invalid address", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/wallets",
      headers: AUTH_HEADERS,
      payload: { address: "not-an-address" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("returns 400 for address without 0x prefix", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/wallets",
      headers: AUTH_HEADERS,
      payload: { address: "1234567890abcdef1234567890abcdef12345678" },
    });

    expect(response.statusCode).toBe(400);
  });
});

describe("PATCH /api/wallets/:id", () => {
  it("updates wallet label", async () => {
    vi.mocked(prisma.wallet.findFirst).mockResolvedValueOnce(WALLET_RECORD);
    vi.mocked(prisma.wallet.update).mockResolvedValueOnce({
      ...WALLET_RECORD,
      label: "Updated",
    });

    const response = await app.inject({
      method: "PATCH",
      url: "/api/wallets/wallet-1",
      headers: AUTH_HEADERS,
      payload: { label: "Updated" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().wallet.label).toBe("Updated");
  });

  it("returns 404 for non-existent wallet", async () => {
    vi.mocked(prisma.wallet.findFirst).mockResolvedValueOnce(null);

    const response = await app.inject({
      method: "PATCH",
      url: "/api/wallets/nonexistent",
      headers: AUTH_HEADERS,
      payload: { label: "Test" },
    });

    expect(response.statusCode).toBe(404);
  });
});

describe("DELETE /api/wallets/:id", () => {
  it("deletes existing wallet", async () => {
    vi.mocked(prisma.wallet.findFirst).mockResolvedValueOnce(WALLET_RECORD);
    vi.mocked(prisma.wallet.delete).mockResolvedValueOnce(WALLET_RECORD);

    const response = await app.inject({
      method: "DELETE",
      url: "/api/wallets/wallet-1",
      headers: AUTH_HEADERS,
    });

    expect(response.statusCode).toBe(204);
  });

  it("returns 404 for non-existent wallet", async () => {
    vi.mocked(prisma.wallet.findFirst).mockResolvedValueOnce(null);

    const response = await app.inject({
      method: "DELETE",
      url: "/api/wallets/nonexistent",
      headers: AUTH_HEADERS,
    });

    expect(response.statusCode).toBe(404);
  });
});

describe("GET /api/wallets/:id/balances", () => {
  it("returns balances from cache", async () => {
    vi.mocked(prisma.wallet.findFirst).mockResolvedValueOnce(WALLET_RECORD);
    vi.mocked(getJson).mockResolvedValueOnce(CACHED_DATA);

    const response = await app.inject({
      method: "GET",
      url: "/api/wallets/wallet-1/balances?currency=usd",
      headers: AUTH_HEADERS,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.currency).toBe("usd");
    expect(body.ethBalance).toBe(1);
    expect(body.ethPrice).toBe(2500);
    expect(body.ethValue).toBe(2500);
    expect(body.tokens).toHaveLength(1);
    expect(body.tokens[0].valueFiat).toBe(100); // 100 USDT * $1
    expect(body.totalValue).toBe(2600); // 2500 ETH + 100 USDT
  });

  it("triggers sync when cache is empty", async () => {
    vi.mocked(prisma.wallet.findFirst).mockResolvedValueOnce(WALLET_RECORD);
    vi.mocked(getJson).mockResolvedValueOnce(null);
    vi.mocked(waitForSync).mockResolvedValueOnce(CACHED_DATA);

    const response = await app.inject({
      method: "GET",
      url: "/api/wallets/wallet-1/balances",
      headers: AUTH_HEADERS,
    });

    expect(response.statusCode).toBe(200);
    expect(waitForSync).toHaveBeenCalledWith(WALLET_RECORD.address);
  });

  it("returns 504 when sync times out", async () => {
    vi.mocked(prisma.wallet.findFirst).mockResolvedValueOnce(WALLET_RECORD);
    vi.mocked(getJson).mockResolvedValueOnce(null);
    vi.mocked(waitForSync).mockRejectedValueOnce(new Error("timeout"));

    const response = await app.inject({
      method: "GET",
      url: "/api/wallets/wallet-1/balances",
      headers: AUTH_HEADERS,
    });

    expect(response.statusCode).toBe(504);
  });

  it("returns balances in BRL", async () => {
    vi.mocked(prisma.wallet.findFirst).mockResolvedValueOnce(WALLET_RECORD);
    vi.mocked(getJson).mockResolvedValueOnce(CACHED_DATA);

    const response = await app.inject({
      method: "GET",
      url: "/api/wallets/wallet-1/balances?currency=brl",
      headers: AUTH_HEADERS,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.currency).toBe("brl");
    expect(body.ethPrice).toBe(12500);
    expect(body.tokens[0].valueFiat).toBe(500); // 100 USDT * R$5
  });

  it("returns 404 for wallet not owned by user", async () => {
    vi.mocked(prisma.wallet.findFirst).mockResolvedValueOnce(null);

    const response = await app.inject({
      method: "GET",
      url: "/api/wallets/other-wallet/balances",
      headers: AUTH_HEADERS,
    });

    expect(response.statusCode).toBe(404);
  });
});

describe("POST /api/wallets/:id/refresh", () => {
  it("invalidates cache and returns fresh data", async () => {
    vi.mocked(prisma.wallet.findFirst).mockResolvedValueOnce(WALLET_RECORD);
    vi.mocked(invalidateAndSync).mockResolvedValueOnce(CACHED_DATA);

    const response = await app.inject({
      method: "POST",
      url: "/api/wallets/wallet-1/refresh?currency=usd",
      headers: AUTH_HEADERS,
    });

    expect(response.statusCode).toBe(200);
    expect(invalidateAndSync).toHaveBeenCalledWith(WALLET_RECORD.address);
  });

  it("returns 504 when refresh times out", async () => {
    vi.mocked(prisma.wallet.findFirst).mockResolvedValueOnce(WALLET_RECORD);
    vi.mocked(invalidateAndSync).mockRejectedValueOnce(new Error("timeout"));

    const response = await app.inject({
      method: "POST",
      url: "/api/wallets/wallet-1/refresh",
      headers: AUTH_HEADERS,
    });

    expect(response.statusCode).toBe(504);
  });
});

describe("GET /health", () => {
  it("returns ok when redis is connected", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok", redis: "connected" });
  });
});
