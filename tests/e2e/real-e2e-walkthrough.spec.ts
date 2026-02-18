import { test, expect } from "@playwright/test";

/**
 * Real end-to-end walkthrough — no mocks, real Claude API.
 * Requires ANTHROPIC_API_KEY in the environment.
 * Takes screenshots at every stage to visually verify the experience.
 */

const API_KEY = process.env.ANTHROPIC_API_KEY;

/**
 * Wait for the API call to finish by checking the textarea is enabled
 * (not the Send button, which also requires non-empty input).
 */
async function waitForResponse(page: import("@playwright/test").Page, timeout = 60000) {
  await expect(page.locator("textarea")).toBeEnabled({ timeout });
}

test.describe("Real E2E walkthrough", () => {
  test.skip(!API_KEY, "Requires ANTHROPIC_API_KEY");

  test("full workout tracking flow with real Claude", async ({ page }) => {
    test.setTimeout(180000); // 3 min — real API calls are slow

    await page.goto("/");
    await page.screenshot({ path: "test-results/01-initial-load.png", fullPage: true });

    // Step 1: Enter API key
    await page.getByPlaceholder("sk-ant-...").fill(API_KEY!);
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("API key saved")).toBeVisible();
    await page.screenshot({ path: "test-results/02-api-key-saved.png", fullPage: true });

    // Step 2: Send a message asking to track workouts
    await page.locator("textarea").fill("I want to track my bench press sets today. Can you make me an input for that?");
    await page.getByRole("button", { name: "Send" }).click();
    await page.screenshot({ path: "test-results/03-message-sent.png", fullPage: true });

    // Step 3: Wait for Claude's response — should include a tool call that creates a component
    await waitForResponse(page);
    await page.screenshot({ path: "test-results/04-claude-responded.png", fullPage: true });

    // Step 4: Verify a custom input panel appeared
    const iframe = page.locator("iframe");
    const iframeCount = await iframe.count();
    console.log(`Iframe count after first message: ${iframeCount}`);

    if (iframeCount > 0) {
      // Custom input was created! Let's interact with it.
      await page.waitForTimeout(2000); // Give Tailwind CDN time to load in iframe
      await page.screenshot({ path: "test-results/05-custom-input-visible.png", fullPage: true });

      // Step 5: Try to interact with the component inside the iframe
      const frame = iframe.first().contentFrame();

      // Find and fill inputs (Claude may generate different element structures)
      const inputs = frame.locator("input, select, textarea");
      const inputCount = await inputs.count();
      console.log(`Found ${inputCount} interactive elements in iframe`);

      // Try to fill in workout data
      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);
        const tagName = await input.evaluate((el) => el.tagName.toLowerCase());
        const type = await input.getAttribute("type");

        if (tagName === "select") {
          // Pick the first non-empty option
          const options = await input.locator("option").allTextContents();
          console.log(`Select options: ${options.join(", ")}`);
        } else if (tagName === "input" && (type === "number" || type === "range")) {
          await input.fill("135");
        } else if (tagName === "input" && type === "text") {
          await input.fill("Bench Press");
        } else if (tagName === "textarea") {
          await input.fill("Felt strong today");
        }
      }

      await page.screenshot({ path: "test-results/06-filled-inputs.png", fullPage: true });

      // Step 6: Click the submit/log button
      const buttons = frame.locator("button");
      const buttonCount = await buttons.count();
      console.log(`Found ${buttonCount} buttons in iframe`);

      if (buttonCount > 0) {
        // Click the first (or most prominent) button
        await buttons.first().click();
        await page.screenshot({ path: "test-results/07-submitted-data.png", fullPage: true });

        // Step 7: Wait for Claude to respond to the submitted data
        await waitForResponse(page);
        await page.screenshot({ path: "test-results/08-claude-responded-to-data.png", fullPage: true });

        // Step 8: Ask Claude to modify the component
        await page.locator("textarea").fill("Can you add an RPE field (rate of perceived exertion, 1-10) to the tracker?");
        await page.getByRole("button", { name: "Send" }).click();
        await waitForResponse(page);
        await page.screenshot({ path: "test-results/09-modified-component.png", fullPage: true });

        // Step 9: Send a text message while the component is active
        await page.locator("textarea").fill("What exercises should I do after bench press?");
        await page.getByRole("button", { name: "Send" }).click();
        await waitForResponse(page);
        await page.screenshot({ path: "test-results/10-text-alongside-component.png", fullPage: true });
      }
    } else {
      // Claude responded with text only — still take a screenshot
      console.log("No custom input was created — Claude may have responded with text only");
      await page.screenshot({ path: "test-results/05-no-component-text-only.png", fullPage: true });
    }

    // Final state
    await page.screenshot({ path: "test-results/11-final-state.png", fullPage: true });
    console.log("Walkthrough complete!");
  });
});
