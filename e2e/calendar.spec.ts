import { test, expect } from "@playwright/test";

test.describe("Compliance Calendar", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.click("text=Launch Demo");
    await page.waitForURL("**/dashboard", { timeout: 30000 });
    await page.goto("/calendar");
    await page.waitForURL("**/calendar", { timeout: 30000 });
  });

  test("displays calendar heading", async ({ page }) => {
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("shows enforcement deadline", async ({ page }) => {
    await expect(
      page.locator("text=enforcement").first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("shows add deadline button", async ({ page }) => {
    await expect(
      page.locator("button:has-text('Add Deadline')").first()
    ).toBeVisible();
  });

  test("shows filter tabs", async ({ page }) => {
    await expect(page.getByText("All", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByText("Overdue", { exact: true }).first()
    ).toBeVisible();
  });
});
