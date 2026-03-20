import { test, expect } from "@playwright/test";

test.describe("Audit Trail", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.click("text=Launch Demo");
    await page.waitForURL("**/dashboard", { timeout: 30000 });
    await page.goto("/audit");
    await page.waitForURL("**/audit", { timeout: 30000 });
  });

  test("displays audit trail heading", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Audit Trail");
  });

  test("shows activity log with entries", async ({ page }) => {
    await expect(
      page.getByText("Activity Log", { exact: true })
    ).toBeVisible();
  });

  test("shows article 12 reference", async ({ page }) => {
    await expect(page.locator("text=Article 12").first()).toBeVisible();
  });

  test("audit entries show action badges", async ({ page }) => {
    await expect(page.locator("text=create").first()).toBeVisible({
      timeout: 10000,
    });
  });
});
