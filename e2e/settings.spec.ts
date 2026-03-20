import { test, expect } from "@playwright/test";

test.describe("Settings Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.click("text=Launch Demo");
    await page.waitForURL("**/dashboard", { timeout: 30000 });
    await page.goto("/settings");
    await page.waitForURL("**/settings", { timeout: 30000 });
  });

  test("displays settings heading", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Settings");
  });

  test("shows profile section with demo user info", async ({ page }) => {
    await expect(page.locator("text=Profile")).toBeVisible();
    await expect(
      page.locator("text=demo@complianceforge-ai.com")
    ).toBeVisible();
  });

  test("shows organization section", async ({ page }) => {
    await expect(page.locator("text=Organization").first()).toBeVisible();
  });

  test("shows billing section", async ({ page }) => {
    await expect(page.locator("text=Billing").first()).toBeVisible();
    await expect(page.locator("text=Current plan").first()).toBeVisible();
  });

  test("shows compliance status with deadline", async ({ page }) => {
    await expect(
      page.locator("text=Compliance Status").first()
    ).toBeVisible();
    await expect(page.getByText("August 2, 2026").first()).toBeVisible();
  });

  test("shows integrations section", async ({ page }) => {
    await expect(page.locator("text=Integrations")).toBeVisible();
    await expect(page.locator("text=Claude AI").first()).toBeVisible();
    await expect(page.locator("text=REST API").first()).toBeVisible();
  });

  test("shows team management link", async ({ page }) => {
    await expect(page.locator("text=Team").first()).toBeVisible();
  });
});
