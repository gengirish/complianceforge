import { test, expect } from "@playwright/test";

test.describe("API Key Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.click("text=Launch Demo");
    await page.waitForURL("**/dashboard", { timeout: 30000 });
    await page.goto("/settings/api");
    await page.waitForURL("**/settings/api", { timeout: 30000 });
  });

  test("displays API keys heading", async ({ page }) => {
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("shows create API key button", async ({ page }) => {
    await expect(
      page.locator("button:has-text('Create')").first()
    ).toBeVisible();
  });

  test("shows API documentation section", async ({ page }) => {
    await expect(
      page.locator("text=Documentation").first()
    ).toBeVisible();
  });
});
