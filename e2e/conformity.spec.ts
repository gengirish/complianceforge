import { test, expect } from "@playwright/test";
import { loginAsDemo, expectNoServerError } from "./helpers";

test.describe("Conformity Assessment", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
    await expectNoServerError(page);
    await page.goto("/conformity");
    await page.waitForURL("**/conformity", { timeout: 30000 });
    await expectNoServerError(page);
  });

  test("displays conformity heading", async ({ page }) => {
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("shows high-risk systems for assessment", async ({ page }) => {
    await expect.soft(
      page.locator("text=high").first()
    ).toBeVisible({ timeout: 10000 });
  });
});
