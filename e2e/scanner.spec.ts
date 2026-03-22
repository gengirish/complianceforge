import { test, expect } from "@playwright/test";
import { loginAsDemo, expectNoServerError } from "./helpers";

test.describe("GitHub Scanner", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
    await expectNoServerError(page);
    await page.goto("/scanner");
    await page.waitForURL("**/scanner", { timeout: 30000 });
    await expectNoServerError(page);
  });

  test("displays scanner heading", async ({ page }) => {
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("shows repository input field", async ({ page }) => {
    await expect.soft(
      page.locator('input[placeholder*="owner/repo"]').first()
    ).toBeVisible();
  });

  test("shows scan button", async ({ page }) => {
    await expect.soft(
      page.locator("button:has-text('Scan')").first()
    ).toBeVisible();
  });
});
