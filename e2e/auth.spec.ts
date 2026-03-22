import { test, expect } from "@playwright/test";
import { loginAsDemo, expectNoServerError } from "./helpers";

test.describe("Authentication", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");
    await expectNoServerError(page);
    await expect(page.locator("h1")).toContainText("ComplianceForge");
    await expect.soft(page.getByText("Sign In").first()).toBeVisible();
    await expect.soft(page.getByText("Launch Demo")).toBeVisible();
  });

  test("login page has pre-filled demo credentials", async ({ page }) => {
    await page.goto("/login");
    await expectNoServerError(page);
    const emailInput = page.locator('input[name="email"]');
    await expect(emailInput).toHaveValue("demo@complianceforge-ai.com");
    const nameInput = page.locator('input[name="name"]');
    await expect.soft(nameInput).toHaveValue("Demo User");
  });

  test("demo login redirects to dashboard", async ({ page }) => {
    await page.goto("/login");
    await expectNoServerError(page);
    await page.click("text=Launch Demo");
    await page.waitForURL("**/dashboard", { timeout: 30000 });
    await expectNoServerError(page);
    await expect(page.url()).toContain("/dashboard");
  });

  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL("**/login", { timeout: 30000 });
    await expectNoServerError(page);
    await expect(page.url()).toContain("/login");
  });

  test("unauthenticated access to inventory redirects", async ({ page }) => {
    await page.goto("/inventory");
    await page.waitForURL("**/login", { timeout: 30000 });
    await expectNoServerError(page);
    await expect(page.url()).toContain("/login");
  });

  test("authenticated user on login page redirects to dashboard", async ({
    page,
  }) => {
    await loginAsDemo(page);
    await expectNoServerError(page);

    await page.goto("/login");
    await page.waitForURL("**/dashboard", { timeout: 30000 });
    await expectNoServerError(page);
    await expect(page.url()).toContain("/dashboard");
  });

  test("shows OAuth login options", async ({ page }) => {
    await page.goto("/login");
    await expectNoServerError(page);
    await expect.soft(
      page.getByText("Continue with Google").first()
    ).toBeVisible();
    await expect.soft(
      page.getByText("Continue with GitHub").first()
    ).toBeVisible();
  });
});
