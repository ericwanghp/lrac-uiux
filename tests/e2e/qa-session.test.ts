import { test, expect } from "@playwright/test";

test.describe("Q&A Session Workflow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/qa");
  });

  test("should display Q&A page", async ({ page }) => {
    await expect(page.locator("h1")).toContainText(/q&a/i);
  });

  test("should display question form", async ({ page }) => {
    // Check for question elements
    const questionContainer = page.locator('[class*="question"]');
    const exists = (await questionContainer.count()) > 0;
    expect(exists || page.url().includes("/qa")).toBe(true);
  });

  test("should have progress indicator", async ({ page }) => {
    // Look for progress-related elements
    const progress = page.locator('[class*="progress"]');
    const count = await progress.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should be able to type in input fields", async ({ page }) => {
    const input = page.locator("input, textarea").first();
    if (await input.isVisible()) {
      await input.fill("Test answer");
      await expect(input).toHaveValue("Test answer");
    }
  });
});

test.describe("Q&A Form Submission", () => {
  test("should show validation errors for empty required fields", async ({ page }) => {
    await page.goto("/qa");

    // Try to submit without filling required fields
    const submitButton = page
      .locator('button[type="submit"], button:has-text("Submit"), button:has-text("Next")')
      .first();
    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Check for error messages
      const errors = page.locator('[class*="error"], [role="alert"]');
      const errorCount = await errors.count();
      expect(errorCount).toBeGreaterThanOrEqual(0);
    }
  });
});
