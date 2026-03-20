import { test, expect } from "@playwright/test";

test.describe("GitHub Scanner", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.click("text=Launch Demo");
    await page.waitForURL("**/dashboard", { timeout: 30000 });
    await page.goto("/scanner");
    await page.waitForURL("**/scanner", { timeout: 30000 });
  });

  test("displays scanner heading", async ({ page }) => {
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("shows repository input field", async ({ page }) => {
    await expect(
      page.locator('input[placeholder*="owner/repo"]').first()
    ).toBeVisible();
  });

  test("shows scan button", async ({ page }) => {
    await expect(
      page.locator("button:has-text('Scan')").first()
    ).toBeVisible();
  });
});
