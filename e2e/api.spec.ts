import { test, expect } from "@playwright/test";
import { loginAsDemo, expectNoServerError } from "./helpers";

test.describe("API Key Management", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
    await expectNoServerError(page);
    await page.goto("/settings/api");
    await page.waitForURL("**/settings/api", { timeout: 30000 });
    await expectNoServerError(page);
  });

  test("displays API keys heading", async ({ page }) => {
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("shows create API key button", async ({ page }) => {
    await expect.soft(
      page.locator("button:has-text('Create')").first()
    ).toBeVisible();
  });

  test("shows API documentation section", async ({ page }) => {
    await expect.soft(
      page.locator("text=REST API").first()
    ).toBeVisible();
  });
});
