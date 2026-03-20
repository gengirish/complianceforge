import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText("ComplianceForge");
    await expect(page.locator("text=Sign In").first()).toBeVisible();
    await expect(page.locator("text=Launch Demo")).toBeVisible();
  });

  test("login page has pre-filled demo credentials", async ({ page }) => {
    await page.goto("/login");
    const emailInput = page.locator('input[name="email"]');
    await expect(emailInput).toHaveValue("demo@complianceforge-ai.com");
    const nameInput = page.locator('input[name="name"]');
    await expect(nameInput).toHaveValue("Demo User");
  });

  test("demo login redirects to dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.click("text=Launch Demo");
    await page.waitForURL("**/dashboard", { timeout: 15000 });
    await expect(page.url()).toContain("/dashboard");
  });

  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL("**/login", { timeout: 10000 });
    await expect(page.url()).toContain("/login");
  });

  test("unauthenticated access to inventory redirects", async ({ page }) => {
    await page.goto("/inventory");
    await page.waitForURL("**/login", { timeout: 10000 });
    await expect(page.url()).toContain("/login");
  });

  test("authenticated user on login page redirects to dashboard", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.click("text=Launch Demo");
    await page.waitForURL("**/dashboard", { timeout: 15000 });

    await page.goto("/login");
    await page.waitForURL("**/dashboard", { timeout: 10000 });
    await expect(page.url()).toContain("/dashboard");
  });

  test("sign out returns to login page", async ({ page }) => {
    await page.goto("/login");
    await page.click("text=Launch Demo");
    await page.waitForURL("**/dashboard", { timeout: 15000 });

    await page.click("text=Sign Out");
    await page.waitForURL("**/login", { timeout: 10000 });
    await expect(page.url()).toContain("/login");
  });
});
