import { test, expect } from "@playwright/test";
import {
  mockAuthenticatedUser,
  setupApiMocks,
} from "./fixtures/mock-data";

test.describe("Theme Toggle", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
    await setupApiMocks(page, { wallets: [] });
    await page.goto("/");
  });

  test("shows theme toggle button", async ({ page }) => {
    await expect(page.getByTestId("theme-toggle")).toBeVisible();
  });

  test("can toggle theme", async ({ page }) => {
    const themeButton = page.getByTestId("theme-toggle");

    // Default is dark, toggle to light
    await themeButton.click();

    const themeMode = await page.evaluate(() =>
      window.localStorage.getItem("sv_theme")
    );
    expect(themeMode).toBe("light");
  });

  test("can toggle theme back and forth", async ({ page }) => {
    const themeButton = page.getByTestId("theme-toggle");

    // Default is dark → toggle to light
    await themeButton.click();
    const afterFirstToggle = await page.evaluate(() =>
      window.localStorage.getItem("sv_theme")
    );
    expect(afterFirstToggle).toBe("light");

    // Toggle back to dark
    await themeButton.click();
    const afterSecondToggle = await page.evaluate(() =>
      window.localStorage.getItem("sv_theme")
    );
    expect(afterSecondToggle).toBe("dark");
  });
});
