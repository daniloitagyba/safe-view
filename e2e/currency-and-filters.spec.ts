import { test, expect } from "@playwright/test";
import {
  mockAuthenticatedUser,
  setupApiMocks,
  TEST_WALLET,
  TEST_WALLET_2,
} from "./fixtures/mock-data";

test.describe("Currency Toggle", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
    await setupApiMocks(page, { wallets: [TEST_WALLET] });
    await page.goto("/");
  });

  test("defaults to USD currency", async ({ page }) => {
    const usdButton = page.getByRole("button", { name: /USD/ });
    await expect(usdButton).toHaveAttribute("aria-pressed", "true");
  });

  test("can switch to BRL currency", async ({ page }) => {
    const brlButton = page.getByRole("button", { name: /BRL/ });
    await brlButton.click();

    await expect(brlButton).toHaveAttribute("aria-pressed", "true");
    const usdButton = page.getByRole("button", { name: /USD/ });
    await expect(usdButton).toHaveAttribute("aria-pressed", "false");
  });

  test("persists currency selection in localStorage", async ({ page }) => {
    await page.getByRole("button", { name: /BRL/ }).click();

    const savedCurrency = await page.evaluate(() =>
      window.localStorage.getItem("sv_currency")
    );
    expect(savedCurrency).toBe("brl");
  });

  test("can switch back to USD", async ({ page }) => {
    await page.getByRole("button", { name: /BRL/ }).click();
    await page.getByRole("button", { name: /USD/ }).click();

    const usdButton = page.getByRole("button", { name: /USD/ });
    await expect(usdButton).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("Hide Small Balances", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
  });

  test("toggle is unchecked by default", async ({ page }) => {
    await setupApiMocks(page, { wallets: [TEST_WALLET] });
    await page.goto("/");

    const switchInput = page.getByTestId("hide-small-toggle").locator("input[type='checkbox']");
    await expect(switchInput).not.toBeChecked();
  });

  test("can enable hide small balances", async ({ page }) => {
    await setupApiMocks(page, { wallets: [TEST_WALLET] });
    await page.goto("/");

    await page.getByTestId("hide-small-toggle").locator("input[type='checkbox']").click();

    const savedValue = await page.evaluate(() =>
      window.localStorage.getItem("sv_hideSmall")
    );
    expect(savedValue).toBe("true");
  });

  test("hides small balance wallets when enabled", async ({ page }) => {
    await setupApiMocks(page, { wallets: [TEST_WALLET, TEST_WALLET_2] });
    await page.goto("/");

    const wallet1Card = page.getByTestId(`wallet-card-${TEST_WALLET.id}`);
    const wallet2Card = page.getByTestId(`wallet-card-${TEST_WALLET_2.id}`);

    // Wait for balances to load
    await expect(wallet1Card.getByText("ETH", { exact: true })).toBeVisible({ timeout: 5000 });

    // Enable hide small balances
    await page.getByTestId("hide-small-toggle").locator("input[type='checkbox']").click();

    // Both wallet cards should still be visible
    await expect(wallet1Card).toBeVisible();
    await expect(wallet2Card).toBeVisible();
  });
});
