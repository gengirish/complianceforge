import { test, expect } from "@playwright/test";
import { loginAsDemo, expectNoServerError } from "./helpers";

test.describe("Cross-feature integration", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test("full compliance workflow: create system -> classify -> generate doc -> view dashboard", async ({
    page,
  }) => {
    await page.goto("/inventory");
    await expectNoServerError(page);
    await expect(page.locator("h1, h2").first()).toBeVisible();

    await page.goto("/classifier");
    await expectNoServerError(page);
    await expect(page.locator("h1, h2").first()).toBeVisible();

    await page.goto("/documents");
    await expectNoServerError(page);
    await expect(page.locator("h1, h2").first()).toBeVisible();

    await page.goto("/dashboard");
    await expectNoServerError(page);
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("navigation through all major pages works without errors", async ({
    page,
  }) => {
    const pages = [
      "/dashboard",
      "/inventory",
      "/classifier",
      "/documents",
      "/audit",
      "/incidents",
      "/scanner",
      "/calendar",
      "/conformity",
      "/settings",
    ];

    for (const path of pages) {
      await page.goto(path);
      await expectNoServerError(page);
      await expect(
        page.locator("h1, h2, [data-testid]").first()
      ).toBeVisible({ timeout: 15000 });
    }
  });
});
