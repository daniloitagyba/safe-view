import { test, expect } from "@playwright/test";
import {
  mockAuthenticatedUser,
  setupApiMocks,
  TEST_WALLET,
} from "./fixtures/mock-data";

const VALID_ETH_ADDRESS = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

test.describe("Wallet Management", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
  });

  test.describe("Add Wallet", () => {
    test("add button is disabled with empty input", async ({ page }) => {
      await setupApiMocks(page, { wallets: [] });
      await page.goto("/");

      await expect(page.getByTestId("add-wallet-button")).toBeDisabled();
    });

    test("shows validation error for invalid address", async ({ page }) => {
      await setupApiMocks(page, { wallets: [] });
      await page.goto("/");

      await page
        .getByTestId("wallet-address-input")
        .locator("input")
        .fill("not-a-valid-address");

      await expect(
        page.getByText("Invalid Ethereum address")
      ).toBeVisible();
      await expect(page.getByTestId("add-wallet-button")).toBeDisabled();
    });

    test("enables add button with valid address", async ({ page }) => {
      await setupApiMocks(page, { wallets: [] });
      await page.goto("/");

      await page
        .getByTestId("wallet-address-input")
        .locator("input")
        .fill(VALID_ETH_ADDRESS);

      await expect(page.getByTestId("add-wallet-button")).toBeEnabled();
    });

    test("adds a wallet successfully", async ({ page }) => {
      await setupApiMocks(page, { wallets: [] });
      await page.goto("/");

      await page
        .getByTestId("wallet-address-input")
        .locator("input")
        .fill(VALID_ETH_ADDRESS);
      await page
        .getByTestId("wallet-label-input")
        .locator("input")
        .fill("Vitalik");
      await page.getByTestId("add-wallet-button").click();

      await expect(page.getByText("Wallet added successfully")).toBeVisible();
      // Form should be cleared after successful add
      await expect(
        page.getByTestId("wallet-address-input").locator("input")
      ).toHaveValue("");
      await expect(
        page.getByTestId("wallet-label-input").locator("input")
      ).toHaveValue("");
    });

    test("shows error when adding duplicate wallet", async ({ page }) => {
      await setupApiMocks(page, { wallets: [], duplicateWallet: true });
      await page.goto("/");

      await page
        .getByTestId("wallet-address-input")
        .locator("input")
        .fill(VALID_ETH_ADDRESS);
      await page.getByTestId("add-wallet-button").click();

      await expect(page.getByText("Wallet already added")).toBeVisible();
    });

    test("shows error toast on server failure", async ({ page }) => {
      await setupApiMocks(page, { wallets: [], failAddWallet: true });
      await page.goto("/");

      await page
        .getByTestId("wallet-address-input")
        .locator("input")
        .fill(VALID_ETH_ADDRESS);
      await page.getByTestId("add-wallet-button").click();

      await expect(page.getByText("Server error")).toBeVisible();
    });
  });

  test.describe("Edit Wallet Label", () => {
    test("can edit wallet label", async ({ page }) => {
      await setupApiMocks(page, { wallets: [TEST_WALLET] });
      await page.goto("/");

      const walletCard = page.getByTestId(`wallet-card-${TEST_WALLET.id}`);
      await expect(walletCard).toBeVisible();

      await walletCard.getByTestId("edit-label-button").click();
      await expect(walletCard.getByTestId("edit-label-input")).toBeVisible();

      const input = walletCard.getByTestId("edit-label-input").locator("input");
      await input.clear();
      await input.fill("Updated Label");
      await walletCard.getByTestId("save-label-button").click();

      await expect(page.getByText("Label updated")).toBeVisible();
    });

    test("can cancel label editing", async ({ page }) => {
      await setupApiMocks(page, { wallets: [TEST_WALLET] });
      await page.goto("/");

      const walletCard = page.getByTestId(`wallet-card-${TEST_WALLET.id}`);
      await walletCard.getByTestId("edit-label-button").click();
      await expect(walletCard.getByTestId("edit-label-input")).toBeVisible();

      await walletCard.getByTestId("cancel-label-button").click();
      await expect(
        walletCard.getByTestId("edit-label-input")
      ).not.toBeVisible();
    });

    test("saves label on Enter key", async ({ page }) => {
      await setupApiMocks(page, { wallets: [TEST_WALLET] });
      await page.goto("/");

      const walletCard = page.getByTestId(`wallet-card-${TEST_WALLET.id}`);
      await walletCard.getByTestId("edit-label-button").click();

      const input = walletCard.getByTestId("edit-label-input").locator("input");
      await input.clear();
      await input.fill("Enter Label");
      await input.press("Enter");

      await expect(page.getByText("Label updated")).toBeVisible();
    });

    test("cancels label editing on Escape key", async ({ page }) => {
      await setupApiMocks(page, { wallets: [TEST_WALLET] });
      await page.goto("/");

      const walletCard = page.getByTestId(`wallet-card-${TEST_WALLET.id}`);
      await walletCard.getByTestId("edit-label-button").click();

      const input = walletCard.getByTestId("edit-label-input").locator("input");
      await input.press("Escape");

      await expect(
        walletCard.getByTestId("edit-label-input")
      ).not.toBeVisible();
    });
  });

  test.describe("Delete Wallet", () => {
    test("removes a wallet from the list", async ({ page }) => {
      await setupApiMocks(page, { wallets: [TEST_WALLET] });
      await page.goto("/");

      const walletCard = page.getByTestId(`wallet-card-${TEST_WALLET.id}`);
      await expect(walletCard).toBeVisible();

      await walletCard.getByTestId("delete-wallet-button").click();

      await expect(walletCard).not.toBeVisible();
    });
  });
});
