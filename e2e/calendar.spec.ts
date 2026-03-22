import { test, expect } from "@playwright/test";
import { loginAsDemo, expectNoServerError } from "./helpers";

test.describe("Compliance Calendar", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
    await expectNoServerError(page);
    await page.goto("/calendar");
    await page.waitForURL("**/calendar", { timeout: 30000 });
    await expectNoServerError(page);
  });

  test("displays calendar heading", async ({ page }) => {
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("shows enforcement deadline", async ({ page }) => {
    await expect.soft(
      page.locator("text=enforcement").first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("shows add deadline button", async ({ page }) => {
    await expect.soft(
      page.locator("button:has-text('Add Deadline')").first()
    ).toBeVisible();
  });

  test("shows filter tabs", async ({ page }) => {
    await expect.soft(page.getByText("All", { exact: true }).first()).toBeVisible();
    await expect.soft(
      page.getByText("Overdue", { exact: true }).first()
    ).toBeVisible();
  });
});
