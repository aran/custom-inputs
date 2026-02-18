import { test, expect } from "@playwright/test";

test("page loads with app title", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Custom Inputs/i);
});

test("text input is visible", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("textarea")).toBeVisible();
});

test("API key prompt is visible", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByPlaceholder("sk-ant-...")).toBeVisible();
});
