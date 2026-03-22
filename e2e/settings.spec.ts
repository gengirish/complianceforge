import { test, expect } from "@playwright/test";
import { loginAsDemo, expectNoServerError } from "./helpers";

test.describe("Settings Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
    await expectNoServerError(page);
    await page.goto("/settings");
    await page.waitForURL("**/settings", { timeout: 30000 });
    await expectNoServerError(page);
  });

  test("displays settings heading", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Settings");
  });

  test("shows profile section with demo user info", async ({ page }) => {
    await expect.soft(page.locator("text=Profile")).toBeVisible();
    await expect.soft(
      page.locator("text=demo@complianceforge-ai.com")
    ).toBeVisible();
  });

  test("shows organization section", async ({ page }) => {
    await expect.soft(page.locator("text=Organization").first()).toBeVisible();
  });

  test("shows billing section", async ({ page }) => {
    await expect.soft(page.locator("text=Billing").first()).toBeVisible();
    await expect.soft(page.locator("text=Current plan").first()).toBeVisible();
  });

  test("shows compliance status with deadline", async ({ page }) => {
    await expect.soft(
      page.locator("text=Compliance Status").first()
    ).toBeVisible();
    await expect.soft(page.getByText("August 2, 2026").first()).toBeVisible();
  });

  test("shows integrations section", async ({ page }) => {
    await expect.soft(page.locator("text=Integrations")).toBeVisible();
    await expect.soft(page.locator("text=Claude AI").first()).toBeVisible();
    await expect.soft(page.locator("text=REST API").first()).toBeVisible();
  });

  test("shows team management link", async ({ page }) => {
    await expect.soft(page.locator("text=Team").first()).toBeVisible();
  });
});
