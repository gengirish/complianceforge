import { test, expect } from "@playwright/test";
import { loginAsDemo, expectNoServerError } from "./helpers";

test.describe("Incidents", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
    await expectNoServerError(page);
    await page.goto("/incidents");
    await page.waitForURL("**/incidents", { timeout: 30000 });
    await expectNoServerError(page);
  });

  test("displays incidents heading", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Incident");
  });

  test("shows report incident button", async ({ page }) => {
    await expect.soft(
      page.locator("button:has-text('Report Incident')").first()
    ).toBeVisible();
  });

  test("shows filter tabs", async ({ page }) => {
    await expect.soft(page.getByText("All", { exact: true }).first()).toBeVisible();
    await expect.soft(
      page.getByText("Open", { exact: true }).first()
    ).toBeVisible();
  });

  test("shows incident table or empty state", async ({ page }) => {
    const hasTable = await page
      .locator("table")
      .first()
      .isVisible()
      .catch(() => false);
    const hasEmptyState = await page
      .locator("text=No incidents")
      .first()
      .isVisible()
      .catch(() => false);
    expect.soft(hasTable || hasEmptyState).toBeTruthy();
  });
});
