import { test, expect } from "@playwright/test";

test.describe("Conformity Assessment", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.click("text=Launch Demo");
    await page.waitForURL("**/dashboard", { timeout: 30000 });
    await page.goto("/conformity");
    await page.waitForURL("**/conformity", { timeout: 30000 });
  });

  test("displays conformity heading", async ({ page }) => {
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("shows high-risk systems for assessment", async ({ page }) => {
    await expect(
      page.locator("text=high").first()
    ).toBeVisible({ timeout: 10000 });
  });
});
