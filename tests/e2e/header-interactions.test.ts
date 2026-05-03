import { test, expect } from "@playwright/test";

const altOrigin = process.env.PLAYWRIGHT_ALT_ORIGIN || "http://127.0.0.1:3000";

test.describe("Header Interactions", () => {
  test("opens the Claude Code modal from the dashboard header", async ({ page }) => {
    await page.goto("/dashboard");

    await page.getByRole("button", { name: "Claude Code" }).click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Continue or start a project session" })
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Current Project" })).toBeVisible();

    await page.getByRole("button", { name: "Close Claude Code panel" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("keeps header actions interactive on 127.0.0.1 dev origin", async ({ page }) => {
    await page.goto(`${altOrigin}/dashboard`);

    await page.getByRole("button", { name: /^Open$/ }).click();
    await expect(page).toHaveURL(/\/tasks-log$/);
  });
});
