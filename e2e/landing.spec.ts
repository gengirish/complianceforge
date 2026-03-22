import { test, expect } from "@playwright/test";
import { expectNoServerError } from "./helpers";

test.describe("Landing Page", () => {
  test("renders hero section with branding", async ({ page }) => {
    await page.goto("/");
    await expectNoServerError(page);
    await expect(page.locator("h1")).toContainText("EU AI Act Compliance");
    await expect.soft(page.locator("h1")).toContainText("Minutes, Not Months");
  });

  test("shows enforcement deadline banner", async ({ page }) => {
    await page.goto("/");
    await expectNoServerError(page);
    await expect(
      page.locator("text=EU AI Act enforcement in").first()
    ).toBeVisible();
    await expect.soft(page.locator("text=August 2, 2026").first()).toBeVisible();
  });

  test("displays all 6 feature cards", async ({ page }) => {
    await page.goto("/");
    await expectNoServerError(page);
    const features = [
      "Risk Classifier Engine",
      "Doc Generator",
      "GitHub Scanner",
      "Compliance Dashboard",
      "Audit Trail",
      "Incident Reporter",
    ];
    for (const feature of features) {
      await expect.soft(page.locator(`text=${feature}`).first()).toBeVisible();
    }
  });

  test("displays 4 pricing tiers", async ({ page }) => {
    await page.goto("/");
    await expectNoServerError(page);
    const tiers = ["Free", "Starter", "Growth", "Enterprise"];
    for (const tier of tiers) {
      await expect.soft(
        page.locator(`h3:has-text("${tier}")`).first()
      ).toBeVisible();
    }
  });

  test("has CTA linking to login", async ({ page }) => {
    await page.goto("/");
    await expectNoServerError(page);
    const cta = page.getByText("Start Free").first();
    await expect(cta).toBeVisible();
  });

  test("shows footer with company name", async ({ page }) => {
    await page.goto("/");
    await expectNoServerError(page);
    await expect.soft(page.locator("footer")).toContainText("ComplianceForge");
  });
});
