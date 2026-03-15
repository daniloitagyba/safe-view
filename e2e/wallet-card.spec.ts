import { test, expect } from "@playwright/test";
import {
  mockAuthenticatedUser,
  setupApiMocks,
  TEST_WALLET,
} from "./fixtures/mock-data";

test.describe("Wallet Card", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
    await setupApiMocks(page, { wallets: [TEST_WALLET] });
    await page.goto("/");
  });

  test("displays wallet label", async ({ page }) => {
    const walletCard = page.getByTestId(`wallet-card-${TEST_WALLET.id}`);
    await expect(walletCard.getByTestId("wallet-label")).toHaveText(
      TEST_WALLET.label!
    );
  });

  test("displays truncated wallet address as chip", async ({ page }) => {
    const walletCard = page.getByTestId(`wallet-card-${TEST_WALLET.id}`);
    const shortAddress = `0x1234...5678`;
    await expect(walletCard.getByText(shortAddress)).toBeVisible();
  });

  test("displays ETH balance row", async ({ page }) => {
    const walletCard = page.getByTestId(`wallet-card-${TEST_WALLET.id}`);
    await expect(walletCard.getByText("Ethereum")).toBeVisible({ timeout: 5000 });
    await expect(walletCard.getByText("ETH", { exact: true })).toBeVisible();
  });

  test("displays token balances", async ({ page }) => {
    const walletCard = page.getByTestId(`wallet-card-${TEST_WALLET.id}`);
    await expect(walletCard.getByText("USD Coin")).toBeVisible({ timeout: 5000 });
    await expect(walletCard.getByText("USDC")).toBeVisible();
  });

  test("displays total value label", async ({ page }) => {
    const walletCard = page.getByTestId(`wallet-card-${TEST_WALLET.id}`);
    await expect(
      walletCard.getByText(/^Total \·/)
    ).toBeVisible({ timeout: 5000 });
  });

  test("has refresh button", async ({ page }) => {
    const walletCard = page.getByTestId(`wallet-card-${TEST_WALLET.id}`);
    await expect(walletCard.getByTestId("refresh-button")).toBeVisible();
  });

  test("can click refresh button", async ({ page }) => {
    const walletCard = page.getByTestId(`wallet-card-${TEST_WALLET.id}`);
    await walletCard.getByTestId("refresh-button").click();
    await expect(walletCard.getByTestId("refresh-button")).toBeVisible();
  });
});
