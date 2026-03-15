import { test, expect } from "@playwright/test";
import {
  mockAuthenticatedUser,
  setupApiMocks,
  TEST_USER,
} from "./fixtures/mock-data";

test.describe("Authentication", () => {
  test("shows login page for unauthenticated users", async ({ page }) => {
    await setupApiMocks(page, { failAuth: true });
    await page.goto("/login");

    await expect(page.getByTestId("login-page")).toBeVisible();
    await expect(page.getByTestId("login-title")).toHaveText("SafeView");
    await expect(page.getByTestId("login-subtitle")).toHaveText(
      "Track your Ethereum portfolio — balances, tokens, and real-time values."
    );
  });

  test("redirects unauthenticated users from dashboard to login", async ({
    page,
  }) => {
    await setupApiMocks(page, { failAuth: true });
    await page.goto("/");

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByTestId("login-page")).toBeVisible();
  });

  test("redirects authenticated users from login to dashboard", async ({
    page,
  }) => {
    await mockAuthenticatedUser(page);
    await setupApiMocks(page);
    await page.goto("/login");

    await expect(page).toHaveURL("/");
    await expect(page.getByTestId("dashboard-page")).toBeVisible();
  });

  test("shows user avatar in header when authenticated", async ({ page }) => {
    await mockAuthenticatedUser(page);
    await setupApiMocks(page);
    await page.goto("/");

    await expect(page.getByTestId("user-menu-button")).toBeVisible();
  });

  test("opens user menu and shows email", async ({ page }) => {
    await mockAuthenticatedUser(page);
    await setupApiMocks(page);
    await page.goto("/");

    await page.getByTestId("user-menu-button").click();
    await expect(page.getByText(TEST_USER.email)).toBeVisible();
    await expect(page.getByTestId("logout-button")).toBeVisible();
  });

  test("logs out and redirects to login page", async ({ page }) => {
    await mockAuthenticatedUser(page);
    await setupApiMocks(page);
    await page.goto("/");

    await page.getByTestId("user-menu-button").click();

    // After clicking logout, the app will remove the token and re-check auth
    await setupApiMocks(page, { failAuth: true });
    await page.getByTestId("logout-button").click();

    await expect(page).toHaveURL(/\/login/);
  });
});
