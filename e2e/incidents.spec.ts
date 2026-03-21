import { test, expect } from "@playwright/test";

test.describe("Incidents", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.click("text=Launch Demo");
    await page.waitForURL("**/dashboard", { timeout: 30000 });
    await page.goto("/incidents");
    await page.waitForURL("**/incidents", { timeout: 30000 });
  });

  test("displays incidents heading", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Incident");
  });

  test("shows report incident button", async ({ page }) => {
    await expect(
      page.locator("button:has-text('Report Incident')").first()
    ).toBeVisible();
  });

  test("shows filter tabs", async ({ page }) => {
    await expect(page.getByText("All", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByText("Open", { exact: true }).first()
    ).toBeVisible();
  });

  test("shows incident table or empty state", async ({ page }) => {
    const hasTable = await page.locator("table").first().isVisible().catch(() => false);
    const hasEmptyState = await page.locator("text=No incidents").first().isVisible().catch(() => false);
    expect(hasTable || hasEmptyState).toBeTruthy();
  });
});
