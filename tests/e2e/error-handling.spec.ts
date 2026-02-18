import { test, expect } from "@playwright/test";

test.describe("Error handling", () => {
  test("network error shows user-friendly message", async ({ page }) => {
    await page.route("/api/chat", async (route) => {
      await route.abort("connectionrefused");
    });

    await page.goto("/");
    await page.getByPlaceholder("sk-ant-...").fill("sk-ant-test-key");
    await page.getByRole("button", { name: "Save" }).click();

    await page.locator("textarea").fill("hello");
    await page.getByRole("button", { name: "Send" }).click();

    // Should show an error message in the chat
    await expect(page.getByText(/Error:/)).toBeVisible({ timeout: 10000 });
  });

  test("API error response shows error message", async ({ page }) => {
    await page.route("/api/chat", async (route) => {
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
        body: `data: ${JSON.stringify({ type: "error", error: "Invalid API key" })}\n\ndata: [DONE]\n\n`,
      });
    });

    await page.goto("/");
    await page.getByPlaceholder("sk-ant-...").fill("sk-ant-test-key");
    await page.getByRole("button", { name: "Save" }).click();

    await page.locator("textarea").fill("hello");
    await page.getByRole("button", { name: "Send" }).click();

    await expect(page.getByText("Error: Invalid API key")).toBeVisible();
  });

  test("mobile viewport is usable", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Title visible
    await expect(page.getByText("Custom Inputs")).toBeVisible();

    // Text input usable
    await expect(page.locator("textarea")).toBeVisible();

    // API key input usable
    await expect(page.getByPlaceholder("sk-ant-...")).toBeVisible();
  });
});
