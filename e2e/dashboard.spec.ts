import { test, expect } from "@playwright/test";
import {
  mockAuthenticatedUser,
  setupApiMocks,
  TEST_WALLET,
  TEST_WALLET_2,
} from "./fixtures/mock-data";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
  });

  test("shows empty state when no wallets exist", async ({ page }) => {
    await setupApiMocks(page, { wallets: [] });
    await page.goto("/");

    await expect(page.getByTestId("dashboard-title")).toHaveText("My Wallets");
    await expect(page.getByTestId("empty-state")).toBeVisible();
    await expect(page.getByText("No wallets added yet")).toBeVisible();
    await expect(
      page.getByText("Add an Ethereum address above to start tracking.")
    ).toBeVisible();
  });

  test("shows wallet cards when wallets exist", async ({ page }) => {
    await setupApiMocks(page, { wallets: [TEST_WALLET, TEST_WALLET_2] });
    await page.goto("/");

    await expect(
      page.getByTestId(`wallet-card-${TEST_WALLET.id}`)
    ).toBeVisible();
    await expect(
      page.getByTestId(`wallet-card-${TEST_WALLET_2.id}`)
    ).toBeVisible();
  });

  test("displays grand total when wallets have balances", async ({ page }) => {
    await setupApiMocks(page, { wallets: [TEST_WALLET] });
    await page.goto("/");

    await expect(page.getByTestId("grand-total")).toBeVisible({ timeout: 5000 });
  });

  test("shows currency toggle with USD and BRL options", async ({ page }) => {
    await setupApiMocks(page, { wallets: [] });
    await page.goto("/");

    await expect(page.getByTestId("currency-toggle")).toBeVisible();
    await expect(page.getByRole("button", { name: /USD/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /BRL/ })).toBeVisible();
  });

  test("shows hide small balances toggle", async ({ page }) => {
    await setupApiMocks(page, { wallets: [] });
    await page.goto("/");

    await expect(page.getByTestId("hide-small-toggle")).toBeVisible();
  });

  test("shows add wallet form", async ({ page }) => {
    await setupApiMocks(page, { wallets: [] });
    await page.goto("/");

    await expect(page.getByTestId("wallet-address-input")).toBeVisible();
    await expect(page.getByTestId("wallet-label-input")).toBeVisible();
    await expect(page.getByTestId("add-wallet-button")).toBeVisible();
  });
});
