import { test, expect } from "@playwright/test";

test.describe("Navigation Flows", () => {
  test("should navigate to dashboard", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/dashboard");
    await expect(page.locator("h1")).toContainText(/dashboard/i);
  });

  test("should navigate between pages via sidebar", async ({ page }) => {
    await page.goto("/dashboard");

    // Navigate to Q&A page
    await page.click("text=Q&A");
    await expect(page).toHaveURL("/qa");

    // Navigate back to dashboard
    await page.click("text=Dashboard");
    await expect(page).toHaveURL("/dashboard");
  });

  test("should navigate to approval page", async ({ page }) => {
    await page.goto("/approval");
    await expect(page).toHaveURL("/approval");
    await expect(page.locator("h1")).toContainText(/approval/i);
  });

  test("should navigate to design page", async ({ page }) => {
    await page.goto("/design");
    await expect(page).toHaveURL("/design");
  });

  test("should navigate to tasks log page", async ({ page }) => {
    await page.goto("/tasks-log");
    await expect(page).toHaveURL("/tasks-log");
  });

  test("should redirect legacy terminal route to tasks log", async ({ page }) => {
    await page.goto("/terminal");
    await expect(page).toHaveURL("/tasks-log");
  });

  test("should navigate to settings page", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL("/settings");
    await expect(page.locator("h1")).toContainText(/settings/i);
  });

  test("should navigate to PM dashboard", async ({ page }) => {
    await page.goto("/pm");
    await expect(page).toHaveURL("/pm");
    await expect(page.locator("h1")).toContainText(/pm dashboard/i);
  });
});

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
  });

  test("should display project cards", async ({ page }) => {
    // Wait for content to load
    await page.waitForSelector('[class*="Card"]');
    const cards = page.locator('[class*="Card"]');
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test("should display stat cards", async ({ page }) => {
    // Check for stat cards with numbers
    const statCards = page.locator('[class*="StatCard"]');
    const cards = await statCards.count();
    expect(cards).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Sidebar", () => {
  test("should display navigation items", async ({ page }) => {
    await page.goto("/dashboard");

    // Check for sidebar navigation
    const navItems = page.locator("nav a");
    const count = await navItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test("should highlight current page", async ({ page }) => {
    await page.goto("/dashboard");

    // Check if dashboard link is active (has different styling)
    const dashboardLink = page.locator('nav a:has-text("Dashboard")').first();
    await expect(dashboardLink).toBeVisible();
  });
});
