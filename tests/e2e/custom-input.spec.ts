import { test, expect } from "@playwright/test";

test.describe("Custom input panel", () => {
  test("mock API tool call makes custom input panel appear", async ({
    page,
  }) => {
    // Intercept the chat API to return a mock tool call response
    await page.route("/api/chat", async (route) => {
      const mockResponse = {
        type: "message_complete",
        message: {
          content: [
            {
              type: "text",
              text: "I've created a workout tracker for you!",
            },
            {
              type: "tool_use",
              id: "tool_123",
              name: "create_input_component",
              input: {
                title: "Set Tracker",
                description: "Track your workout sets",
                code: `<div class="p-4 space-y-3">
                  <h2 class="text-lg font-bold">Log a Set</h2>
                  <select id="exercise" class="border rounded p-2 w-full">
                    <option>Squat</option>
                    <option>Bench Press</option>
                    <option>Deadlift</option>
                  </select>
                  <input id="weight" type="number" placeholder="Weight (lbs)" class="border rounded p-2 w-full">
                  <input id="reps" type="number" placeholder="Reps" class="border rounded p-2 w-full">
                  <button onclick="window.submitInput({
                    exercise: document.getElementById('exercise').value,
                    weight: Number(document.getElementById('weight').value),
                    reps: Number(document.getElementById('reps').value)
                  })" class="bg-blue-500 text-white rounded p-2 w-full hover:bg-blue-600">
                    Log Set
                  </button>
                </div>`,
              },
            },
          ],
        },
      };

      const body = `data: ${JSON.stringify(mockResponse)}\n\ndata: [DONE]\n\n`;

      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
        body,
      });
    });

    await page.goto("/");

    // Set API key
    await page.getByPlaceholder("sk-ant-...").fill("sk-ant-test-key");
    await page.getByRole("button", { name: "Save" }).click();

    // Send a message
    await page.locator("textarea").fill("I want to track my workouts");
    await page.getByRole("button", { name: "Send" }).click();

    // User message should appear
    await expect(page.getByText("I want to track my workouts")).toBeVisible();

    // Assistant message should appear
    await expect(
      page.getByText("I've created a workout tracker for you!")
    ).toBeVisible();

    // Custom input panel should appear with the Set Tracker title
    await expect(page.getByText("Set Tracker")).toBeVisible();

    // The iframe should be present
    const iframe = page.locator('iframe[title="Set Tracker"]');
    await expect(iframe).toBeVisible();
  });

  test("text input remains visible alongside custom input panel", async ({
    page,
  }) => {
    await page.route("/api/chat", async (route) => {
      const mockResponse = {
        type: "message_complete",
        message: {
          content: [
            { type: "text", text: "Here's a tracker!" },
            {
              type: "tool_use",
              id: "tool_1",
              name: "create_input_component",
              input: {
                title: "Test Input",
                description: "Test",
                code: '<button onclick="window.submitInput(42)">Submit</button>',
              },
            },
          ],
        },
      };

      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
        body: `data: ${JSON.stringify(mockResponse)}\n\ndata: [DONE]\n\n`,
      });
    });

    await page.goto("/");
    await page.getByPlaceholder("sk-ant-...").fill("sk-ant-test-key");
    await page.getByRole("button", { name: "Save" }).click();

    await page.locator("textarea").fill("test");
    await page.getByRole("button", { name: "Send" }).click();

    // Both custom input panel and text input should be visible
    await expect(page.locator('iframe[title="Test Input"]')).toBeVisible();
    await expect(page.locator("textarea")).toBeVisible();
  });

  test("custom input submission appears as formatted user message", async ({
    page,
  }) => {
    let callCount = 0;
    await page.route("/api/chat", async (route) => {
      callCount++;
      if (callCount === 1) {
        // First call: return a component
        const mockResponse = {
          type: "message_complete",
          message: {
            content: [
              { type: "text", text: "Here's your tracker!" },
              {
                type: "tool_use",
                id: "tool_1",
                name: "create_input_component",
                input: {
                  title: "Simple Input",
                  description: "Test",
                  code: '<div><button id="submit-btn" onclick="window.submitInput({value: 42})">Submit 42</button></div>',
                },
              },
            ],
          },
        };
        await route.fulfill({
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
          body: `data: ${JSON.stringify(mockResponse)}\n\ndata: [DONE]\n\n`,
        });
      } else {
        // Second call: Claude responds to the submitted data
        const mockResponse = {
          type: "message_complete",
          message: {
            content: [
              { type: "text", text: "Got your submission: 42!" },
            ],
          },
        };
        await route.fulfill({
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
          body: `data: ${JSON.stringify(mockResponse)}\n\ndata: [DONE]\n\n`,
        });
      }
    });

    await page.goto("/");
    await page.getByPlaceholder("sk-ant-...").fill("sk-ant-test-key");
    await page.getByRole("button", { name: "Save" }).click();

    await page.locator("textarea").fill("give me an input");
    await page.getByRole("button", { name: "Send" }).click();

    // Wait for the iframe to load
    const iframe = page.locator('iframe[title="Simple Input"]');
    await expect(iframe).toBeVisible();

    // Click the submit button inside the iframe
    const frame = iframe.contentFrame();
    await frame.locator("#submit-btn").click();

    // The custom input data should appear as a formatted message in the chat bubble
    await expect(page.locator(".bg-blue-600").getByText("Simple Input")).toBeVisible();

    // Claude's response to the data should appear
    await expect(page.getByText("Got your submission: 42!")).toBeVisible();
  });

  test("second tool call replaces the component (not stacking)", async ({
    page,
  }) => {
    let callCount = 0;
    await page.route("/api/chat", async (route) => {
      callCount++;
      if (callCount === 1) {
        const mockResponse = {
          type: "message_complete",
          message: {
            content: [
              { type: "text", text: "First component!" },
              {
                type: "tool_use",
                id: "tool_1",
                name: "create_input_component",
                input: {
                  title: "Component A",
                  description: "First",
                  code: "<div>Component A content</div>",
                },
              },
            ],
          },
        };
        await route.fulfill({
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
          body: `data: ${JSON.stringify(mockResponse)}\n\ndata: [DONE]\n\n`,
        });
      } else {
        const mockResponse = {
          type: "message_complete",
          message: {
            content: [
              { type: "text", text: "Replaced!" },
              {
                type: "tool_use",
                id: "tool_2",
                name: "create_input_component",
                input: {
                  title: "Component B",
                  description: "Second",
                  code: "<div>Component B content</div>",
                },
              },
            ],
          },
        };
        await route.fulfill({
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
          body: `data: ${JSON.stringify(mockResponse)}\n\ndata: [DONE]\n\n`,
        });
      }
    });

    await page.goto("/");
    await page.getByPlaceholder("sk-ant-...").fill("sk-ant-test-key");
    await page.getByRole("button", { name: "Save" }).click();

    // Trigger first component
    await page.locator("textarea").fill("first");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Component A")).toBeVisible();

    // Trigger second component
    await page.locator("textarea").fill("second");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Component B")).toBeVisible();

    // Only one iframe should exist (replacement, not stacking)
    const iframes = await page.locator("iframe").count();
    expect(iframes).toBe(1);
  });

  test("text-only response preserves existing component", async ({ page }) => {
    let callCount = 0;
    await page.route("/api/chat", async (route) => {
      callCount++;
      if (callCount === 1) {
        const mockResponse = {
          type: "message_complete",
          message: {
            content: [
              { type: "text", text: "Here's your component!" },
              {
                type: "tool_use",
                id: "tool_1",
                name: "create_input_component",
                input: {
                  title: "Persistent Input",
                  description: "Should stay",
                  code: "<div>I should persist</div>",
                },
              },
            ],
          },
        };
        await route.fulfill({
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
          body: `data: ${JSON.stringify(mockResponse)}\n\ndata: [DONE]\n\n`,
        });
      } else {
        // Text-only response — no tool call
        const mockResponse = {
          type: "message_complete",
          message: {
            content: [{ type: "text", text: "Just text, no new component." }],
          },
        };
        await route.fulfill({
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
          body: `data: ${JSON.stringify(mockResponse)}\n\ndata: [DONE]\n\n`,
        });
      }
    });

    await page.goto("/");
    await page.getByPlaceholder("sk-ant-...").fill("sk-ant-test-key");
    await page.getByRole("button", { name: "Save" }).click();

    // Create component
    await page.locator("textarea").fill("create input");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Persistent Input")).toBeVisible();

    // Send text message
    await page.locator("textarea").fill("just chatting");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(
      page.getByText("Just text, no new component.")
    ).toBeVisible();

    // Component should still be there
    await expect(page.getByText("Persistent Input")).toBeVisible();
  });

  test("clear_input_component tool call removes the active component", async ({ page }) => {
    let callCount = 0;
    await page.route("/api/chat", async (route) => {
      callCount++;
      if (callCount === 1) {
        // First response: create a component
        const mockResponse = {
          type: "message_complete",
          message: {
            content: [
              { type: "text", text: "Here's a tracker!" },
              {
                type: "tool_use",
                id: "tool_1",
                name: "create_input_component",
                input: {
                  title: "Removable Tracker",
                  description: "Will be cleared",
                  code: "<div class='p-4'>Track stuff</div>",
                },
              },
            ],
          },
        };
        await route.fulfill({
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
          body: `data: ${JSON.stringify(mockResponse)}\n\ndata: [DONE]\n\n`,
        });
      } else {
        // Second response: clear the component
        const mockResponse = {
          type: "message_complete",
          message: {
            content: [
              { type: "text", text: "Got it, I've removed the tracker." },
              {
                type: "tool_use",
                id: "tool_2",
                name: "clear_input_component",
                input: {},
              },
            ],
          },
        };
        await route.fulfill({
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
          body: `data: ${JSON.stringify(mockResponse)}\n\ndata: [DONE]\n\n`,
        });
      }
    });

    await page.goto("/");
    await page.getByPlaceholder("sk-ant-...").fill("sk-ant-test-key");
    await page.getByRole("button", { name: "Save" }).click();

    // Create component
    await page.locator("textarea").fill("make me a tracker");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Removable Tracker")).toBeVisible();
    const iframe = page.locator("iframe");
    await expect(iframe).toBeVisible();

    // Ask to clear it
    await page.locator("textarea").fill("never mind, remove it");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("I've removed the tracker")).toBeVisible();

    // Component should be gone
    await expect(iframe).not.toBeVisible();
    await expect(page.getByText("Removable Tracker")).not.toBeVisible();
  });

  test("shows building indicator while tool_use block is being generated", async ({ page }) => {
    // Use a real HTTP server to send chunked SSE with controlled timing.
    // Playwright's route.fulfill sends everything at once — no way to test
    // intermediate streaming states without actual chunked delivery.
    const { createServer } = await import("http");

    const textEvents = [
      { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
      { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "Let me build " } },
      { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "that for you!" } },
      { type: "content_block_stop", index: 0 },
      { type: "content_block_start", index: 1, content_block: { type: "tool_use", id: "tool_1", name: "create_input_component" } },
    ];

    const messageComplete = {
      type: "message_complete",
      message: {
        content: [
          { type: "text", text: "Let me build that for you!" },
          {
            type: "tool_use",
            id: "tool_1",
            name: "create_input_component",
            input: {
              title: "Test Component",
              description: "A test",
              code: "<div class='p-4'><button onclick='window.submitInput(1)'>Go</button></div>",
            },
          },
        ],
      },
    };

    const server = createServer((_req, res) => {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      });
      // Send text events + tool_use start immediately
      for (const event of textEvents) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
      // Delay 1.5s before sending message_complete (simulates tool construction)
      setTimeout(() => {
        res.write(`data: ${JSON.stringify(messageComplete)}\n\n`);
        res.write(`data: [DONE]\n\n`);
        res.end();
      }, 1500);
    });

    const serverPort: number = await new Promise((resolve) => {
      server.listen(0, () => {
        resolve((server.address() as import("net").AddressInfo).port);
      });
    });

    // Redirect /api/chat to our test server for chunked streaming
    await page.route("/api/chat", (route) => {
      route.continue({ url: `http://localhost:${serverPort}/api/chat` });
    });

    await page.goto("/");
    await page.getByPlaceholder("sk-ant-...").fill("sk-ant-test-key");
    await page.getByRole("button", { name: "Save" }).click();

    await page.locator("textarea").fill("make me a component");
    await page.getByRole("button", { name: "Send" }).click();

    // The streaming text should appear
    await expect(page.getByText("Let me build that for you!")).toBeVisible({ timeout: 5000 });

    // While the tool_use block is being generated, a "building" indicator should appear
    await expect(page.getByText("Building component")).toBeVisible({ timeout: 3000 });

    // Eventually the component should render
    await expect(page.getByText("Test Component")).toBeVisible({ timeout: 10000 });

    server.close();
  });
});
