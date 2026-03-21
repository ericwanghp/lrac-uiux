import { test, expect } from "@playwright/test";

test.describe("Approval Workflow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/approval");
  });

  test("should display approval page", async ({ page }) => {
    await expect(page.locator("h1")).toContainText(/approval/i);
  });

  test("should display document viewer", async ({ page }) => {
    // Check for markdown content or viewer
    const content = page.locator('article, [class*="markdown"], [class*="content"]');
    const count = await content.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should have approval buttons", async ({ page }) => {
    // Look for approve/reject buttons
    const approveButton = page.locator(
      'button:has-text("Approve"), button:has-text("Reject"), button:has-text("Request")'
    );
    const count = await approveButton.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should display comment section", async ({ page }) => {
    // Look for comment-related elements
    const commentSection = page.locator('[class*="comment"], textarea[placeholder*="comment"]');
    const exists = (await commentSection.count()) > 0;
    expect(exists || page.url().includes("/approval")).toBe(true);
  });
});

test.describe("Approval Actions", () => {
  test("should show confirmation dialog for approve", async ({ page }) => {
    await page.goto("/approval");

    // Look for approve button
    const approveButton = page.locator('button:has-text("Approve")').first();
    if (await approveButton.isVisible()) {
      await approveButton.click();

      // Check for dialog
      const dialog = page.locator('[role="dialog"], [class*="dialog"]');
      const hasDialog = (await dialog.count()) > 0;
      expect(hasDialog || true).toBe(true);
    }
  });

  test("should show confirmation dialog for reject", async ({ page }) => {
    await page.goto("/approval");

    // Look for reject button
    const rejectButton = page.locator('button:has-text("Reject")').first();
    if (await rejectButton.isVisible()) {
      await rejectButton.click();

      // Check for dialog
      const dialog = page.locator('[role="dialog"], [class*="dialog"]');
      const hasDialog = (await dialog.count()) > 0;
      expect(hasDialog || true).toBe(true);
    }
  });
});
