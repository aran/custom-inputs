import { test, expect } from "@playwright/test";

test.describe("Agent component iteration", () => {
  test("component modification replaces with updated version", async ({
    page,
  }) => {
    let callCount = 0;
    await page.route("/api/chat", async (route) => {
      callCount++;

      // Parse the request to verify component state is included
      const reqBody = JSON.parse((await route.request().postData()) || "{}");

      if (callCount === 1) {
        // First call: create initial component
        await route.fulfill({
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
          body: `data: ${JSON.stringify({
            type: "message_complete",
            message: {
              content: [
                { type: "text", text: "Here's a basic tracker!" },
                {
                  type: "tool_use",
                  id: "tool_1",
                  name: "create_input_component",
                  input: {
                    title: "Tracker v1",
                    description: "Basic tracker",
                    code: '<div><input id="val" type="text"><button id="btn" onclick="window.submitInput(document.getElementById(\'val\').value)">Submit</button></div>',
                  },
                },
              ],
            },
          })}\n\ndata: [DONE]\n\n`,
        });
      } else if (callCount === 2) {
        // Second call: verify activeComponent is included in the request
        expect(reqBody.activeComponent).toBeTruthy();
        expect(reqBody.activeComponent.title).toBe("Tracker v1");

        // Return an updated component
        await route.fulfill({
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
          body: `data: ${JSON.stringify({
            type: "message_complete",
            message: {
              content: [
                { type: "text", text: "Updated with a blue submit button!" },
                {
                  type: "tool_use",
                  id: "tool_2",
                  name: "create_input_component",
                  input: {
                    title: "Tracker v2",
                    description: "Updated tracker with blue button",
                    code: '<div><input id="val" type="text"><textarea id="notes" placeholder="Notes"></textarea><button id="btn" class="bg-blue-500 text-white p-2 rounded" onclick="window.submitInput({value: document.getElementById(\'val\').value, notes: document.getElementById(\'notes\').value})">Submit</button></div>',
                  },
                },
              ],
            },
          })}\n\ndata: [DONE]\n\n`,
        });
      }
    });

    await page.goto("/");
    await page.getByPlaceholder("sk-ant-...").fill("sk-ant-test-key");
    await page.getByRole("button", { name: "Save" }).click();

    // Create initial component
    await page.locator("textarea").fill("create a tracker");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Tracker v1")).toBeVisible();

    // Request modification
    await page.locator("textarea").fill("make the submit button blue and add notes");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Tracker v2")).toBeVisible();

    // Only one iframe (replaced, not stacked)
    const iframes = await page.locator("iframe").count();
    expect(iframes).toBe(1);

    // Verify the updated component has a notes textarea
    const iframe = page.locator("iframe").first();
    const frame = iframe.contentFrame();
    await expect(frame.locator("#notes")).toBeVisible();
  });

  test("activeComponent sent in API request includes code", async ({
    page,
  }) => {
    let capturedRequest: Record<string, unknown> | null = null;

    await page.route("/api/chat", async (route) => {
      const reqBody = JSON.parse((await route.request().postData()) || "{}");

      if (!capturedRequest && reqBody.activeComponent) {
        capturedRequest = reqBody;
      }

      // First call returns a component, subsequent calls return text
      if (!reqBody.activeComponent) {
        await route.fulfill({
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
          body: `data: ${JSON.stringify({
            type: "message_complete",
            message: {
              content: [
                { type: "text", text: "Created!" },
                {
                  type: "tool_use",
                  id: "tool_1",
                  name: "create_input_component",
                  input: {
                    title: "Test",
                    description: "Test component",
                    code: "<div>test component code here</div>",
                  },
                },
              ],
            },
          })}\n\ndata: [DONE]\n\n`,
        });
      } else {
        await route.fulfill({
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
          body: `data: ${JSON.stringify({
            type: "message_complete",
            message: {
              content: [{ type: "text", text: "I can see the component!" }],
            },
          })}\n\ndata: [DONE]\n\n`,
        });
      }
    });

    await page.goto("/");
    await page.getByPlaceholder("sk-ant-...").fill("sk-ant-test-key");
    await page.getByRole("button", { name: "Save" }).click();

    // Create a component
    await page.locator("textarea").fill("create something");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Test", { exact: true })).toBeVisible();

    // Ask about it (triggers second API call with activeComponent)
    await page.locator("textarea").fill("what does the current input look like?");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("I can see the component!")).toBeVisible();

    // Verify the API request included the component code
    expect(capturedRequest).toBeTruthy();
    const ac = (capturedRequest as Record<string, unknown>)
      .activeComponent as Record<string, string>;
    expect(ac.title).toBe("Test");
    expect(ac.code).toContain("test component code here");
  });
});
