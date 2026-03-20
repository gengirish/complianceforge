import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("renders hero section with branding", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("EU AI Act Compliance");
    await expect(page.locator("h1")).toContainText("Minutes, Not Months");
  });

  test("shows enforcement deadline banner", async ({ page }) => {
    await page.goto("/");
    const banner = page.locator("text=EU AI Act enforcement in");
    await expect(banner).toBeVisible();
    await expect(page.locator("text=August 2, 2026")).toBeVisible();
  });

  test("displays all 6 feature cards", async ({ page }) => {
    await page.goto("/");
    const features = [
      "Risk Classifier Engine",
      "Doc Generator",
      "GitHub Scanner",
      "Compliance Dashboard",
      "Audit Trail",
      "Incident Reporter",
    ];
    for (const feature of features) {
      await expect(page.locator(`text=${feature}`).first()).toBeVisible();
    }
  });

  test("displays 4 pricing tiers", async ({ page }) => {
    await page.goto("/");
    const tiers = ["Free", "Starter", "Growth", "Enterprise"];
    for (const tier of tiers) {
      await expect(
        page.locator(`h3:has-text("${tier}")`).first()
      ).toBeVisible();
    }
  });

  test("has CTA linking to login", async ({ page }) => {
    await page.goto("/");
    const cta = page.locator('a:has-text("Start Free")');
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/login");
  });

  test("shows footer with company name", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("footer")).toContainText("ComplianceForge");
  });
});
