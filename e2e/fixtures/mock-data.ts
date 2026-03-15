import type { Page } from "@playwright/test";

export const TEST_USER = {
  id: "user-1",
  email: "test@example.com",
  name: "Test User",
  avatarUrl: null,
  googleId: "google-123",
};

export const TEST_TOKEN = "fake-jwt-token-for-e2e";

export const TEST_WALLET = {
  id: "wallet-1",
  address: "0x1234567890abcdef1234567890abcdef12345678",
  label: "My Main Wallet",
  userId: "user-1",
  createdAt: "2025-01-01T00:00:00.000Z",
};

export const TEST_WALLET_2 = {
  id: "wallet-2",
  address: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
  label: null,
  userId: "user-1",
  createdAt: "2025-01-02T00:00:00.000Z",
};

export const TEST_BALANCES = {
  address: TEST_WALLET.address,
  currency: "usd" as const,
  ethBalance: 1.5,
  ethPrice: 3500,
  ethValue: 5250,
  totalValue: 7750,
  tokens: [
    {
      contractAddress: "0xtoken1",
      tokenName: "USD Coin",
      tokenSymbol: "USDC",
      tokenDecimal: 6,
      balance: "2500000000",
      balanceFormatted: 2500,
      imageUrl: "https://example.com/usdc.png",
      valueFiat: 2500,
      prices: { usd: 1, brl: 5.5 },
    },
  ],
  syncedAt: Date.now(),
};

export const TEST_BALANCES_BRL = {
  ...TEST_BALANCES,
  currency: "brl" as const,
  ethPrice: 19250,
  ethValue: 28875,
  totalValue: 42625,
  tokens: [
    {
      ...TEST_BALANCES.tokens[0],
      valueFiat: 13750,
    },
  ],
};

export const TEST_BALANCES_WALLET_2 = {
  address: TEST_WALLET_2.address,
  currency: "usd" as const,
  ethBalance: 0.001,
  ethPrice: 3500,
  ethValue: 3.5,
  totalValue: 3.5,
  tokens: [],
  syncedAt: Date.now(),
};

export async function mockAuthenticatedUser(page: Page) {
  await page.addInitScript((token) => {
    window.localStorage.setItem("token", token);
  }, TEST_TOKEN);
}

export async function setupApiMocks(
  page: Page,
  options: {
    wallets?: typeof TEST_WALLET[];
    failAuth?: boolean;
    failAddWallet?: boolean;
    duplicateWallet?: boolean;
  } = {}
) {
  const { wallets = [], failAuth = false, failAddWallet = false, duplicateWallet = false } = options;

  await page.route("**/auth/me", (route) => {
    if (failAuth) {
      return route.fulfill({ status: 401, json: { error: "Unauthorized" } });
    }
    return route.fulfill({ status: 200, json: { user: TEST_USER } });
  });

  await page.route("**/api/wallets", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ status: 200, json: { wallets } });
    }

    if (route.request().method() === "POST") {
      if (failAddWallet) {
        return route.fulfill({ status: 500, json: { error: "Server error" } });
      }
      if (duplicateWallet) {
        return route.fulfill({ status: 409, json: { error: "Wallet already added" } });
      }
      const body = route.request().postDataJSON();
      const newWallet = {
        id: `wallet-${Date.now()}`,
        address: body.address.toLowerCase(),
        label: body.label || null,
        userId: TEST_USER.id,
        createdAt: new Date().toISOString(),
      };
      return route.fulfill({ status: 201, json: { wallet: newWallet } });
    }

    return route.continue();
  });

  await page.route("**/api/wallets/*/balances*", (route) => {
    const url = route.request().url();
    const walletId = url.match(/wallets\/([^/]+)\/balances/)?.[1];
    const currency = new URL(url).searchParams.get("currency") || "usd";

    if (walletId === TEST_WALLET.id) {
      const balances = currency === "brl" ? TEST_BALANCES_BRL : TEST_BALANCES;
      return route.fulfill({ status: 200, json: balances });
    }
    if (walletId === TEST_WALLET_2.id) {
      return route.fulfill({ status: 200, json: TEST_BALANCES_WALLET_2 });
    }

    // For dynamically added wallets, return a basic balance
    return route.fulfill({
      status: 200,
      json: {
        address: "0x0000000000000000000000000000000000000000",
        currency,
        ethBalance: 0.5,
        ethPrice: 3500,
        ethValue: 1750,
        totalValue: 1750,
        tokens: [],
        syncedAt: Date.now(),
      },
    });
  });

  await page.route("**/api/wallets/*", (route) => {
    const method = route.request().method();
    const url = route.request().url();

    if (method === "PATCH") {
      const body = route.request().postDataJSON();
      const walletId = url.match(/wallets\/([^/?]+)$/)?.[1];
      const wallet = wallets.find((w) => w.id === walletId) || TEST_WALLET;
      return route.fulfill({
        status: 200,
        json: { wallet: { ...wallet, label: body.label } },
      });
    }

    if (method === "DELETE") {
      return route.fulfill({ status: 204, body: "" });
    }

    return route.continue();
  });

  await page.route("**/api/wallets/*/refresh*", (route) => {
    return route.fulfill({ status: 200, json: TEST_BALANCES });
  });
}
