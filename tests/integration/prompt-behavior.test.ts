import { describe, it, expect } from "vitest";
import { sendChatRequest } from "@/lib/claude";
import type { CustomInputComponent } from "@/types/chat";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Integration tests that make real Claude API calls to verify
 * the system prompt produces correct agent behavior.
 *
 * These require ANTHROPIC_API_KEY in the environment.
 * Skip with: SKIP_API_TESTS=1 npx vitest run
 */

const API_KEY = process.env.ANTHROPIC_API_KEY;
const SKIP = !API_KEY || process.env.SKIP_API_TESTS === "1";

function describeApi(name: string, fn: () => void) {
  if (SKIP) {
    describe.skip(name, fn);
  } else {
    describe(name, fn);
  }
}

function getTextContent(response: Anthropic.Message): string {
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

function getToolUses(response: Anthropic.Message): Anthropic.ToolUseBlock[] {
  return response.content.filter(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
  );
}

describeApi("Prompt behavior — real Claude API", () => {
  it("requests a component when user asks to track workouts", { timeout: 30000 }, async () => {
    const response = await sendChatRequest({
      apiKey: API_KEY!,
      messages: [
        { role: "user", content: "I want to track my workout sets today — bench press, squat, etc." },
      ],
      activeComponent: null,
    });

    const toolUses = getToolUses(response);
    expect(toolUses.length).toBeGreaterThanOrEqual(1);

    const requestCall = toolUses.find((t) => t.name === "request_input_component");
    expect(requestCall).toBeDefined();

    const input = requestCall!.input as Record<string, string>;
    expect(input.title).toBeDefined();
    expect(input.requirements).toBeDefined();
  });

  it("request includes descriptive requirements", { timeout: 30000 }, async () => {
    const response = await sendChatRequest({
      apiKey: API_KEY!,
      messages: [
        { role: "user", content: "Create an input for me to log my mood on a scale of 1-10 with a note" },
      ],
      activeComponent: null,
    });

    const toolUses = getToolUses(response);
    const requestCall = toolUses.find((t) => t.name === "request_input_component");
    expect(requestCall).toBeDefined();

    const input = requestCall!.input as Record<string, string>;
    expect(input.requirements).toBeDefined();
    expect(input.requirements.length).toBeGreaterThan(10);
  });

  it("responds meaningfully to custom input data", { timeout: 30000 }, async () => {
    const workoutData = JSON.stringify({
      exercise: "squat",
      weight: 185,
      reps: 8,
      rpe: 7,
    });

    const response = await sendChatRequest({
      apiKey: API_KEY!,
      messages: [
        { role: "user", content: "I want to track my workout sets" },
        {
          role: "assistant",
          content: [
            { type: "text", text: "I've created a set tracker for you!" },
            {
              type: "tool_use",
              id: "tool_1",
              name: "request_input_component",
              input: {
                title: "Set Tracker",
                description: "Track workout sets",
                requirements: "Exercise selector, weight, reps, RPE fields",
              },
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: "tool_1",
              content: "Component generated and displayed to user.",
            },
          ],
        },
        {
          role: "user",
          content: `[Custom Input: Set Tracker] ${workoutData}`,
        },
      ],
      activeComponent: {
        title: "Set Tracker",
        description: "Track workout sets",
        code: "<div>tracker</div>",
        persistent: false,
      },
    });

    const text = getTextContent(response).toLowerCase();
    expect(
      text.includes("squat") ||
        text.includes("185") ||
        text.includes("8 rep") ||
        text.includes("rpe")
    ).toBe(true);
  });

  it("requests a modified component when asked to add a field", { timeout: 30000 }, async () => {
    const existingComponent: CustomInputComponent = {
      title: "Set Tracker",
      description: "Track workout sets",
      code: `<div class="p-4">
  <select id="exercise"><option>squat</option><option>bench</option></select>
  <input type="number" id="weight" placeholder="Weight">
  <input type="number" id="reps" placeholder="Reps">
  <button onclick="window.submitInput({exercise: document.getElementById('exercise').value, weight: Number(document.getElementById('weight').value), reps: Number(document.getElementById('reps').value)})">Log Set</button>
</div>`,
      persistent: false,
    };

    const response = await sendChatRequest({
      apiKey: API_KEY!,
      messages: [
        { role: "user", content: "I want to track my workout sets" },
        {
          role: "assistant",
          content: [
            { type: "text", text: "Here's your set tracker!" },
            {
              type: "tool_use",
              id: "tool_1",
              name: "request_input_component",
              input: {
                title: "Set Tracker",
                description: "Track workout sets",
                requirements: "Exercise selector, weight, reps fields",
              },
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: "tool_1",
              content: "Component generated and displayed to user.",
            },
          ],
        },
        {
          role: "user",
          content: "Can you add a notes field to the tracker so I can jot down how the set felt?",
        },
      ],
      activeComponent: existingComponent,
    });

    const toolUses = getToolUses(response);
    const requestCall = toolUses.find((t) => t.name === "request_input_component");
    expect(requestCall).toBeDefined();

    const input = requestCall!.input as Record<string, string>;
    expect(input.requirements).toMatch(/note/i);
  });

  it("responds with text only when no custom input is needed", { timeout: 30000 }, async () => {
    const response = await sendChatRequest({
      apiKey: API_KEY!,
      messages: [{ role: "user", content: "What is 2 + 2?" }],
      activeComponent: null,
    });

    const toolUses = getToolUses(response);
    expect(toolUses).toHaveLength(0);

    const text = getTextContent(response);
    expect(text).toContain("4");
  });

  it("proactively requests a component for structured input scenarios", { timeout: 30000 }, async () => {
    const response = await sendChatRequest({
      apiKey: API_KEY!,
      messages: [
        {
          role: "user",
          content:
            "I eat the same 5 meals every day (chicken & rice, salmon bowl, protein shake, turkey wrap, pasta). I want to start logging which one I had for each meal.",
        },
      ],
      activeComponent: null,
    });

    const toolUses = getToolUses(response);
    expect(toolUses.length).toBeGreaterThanOrEqual(1);
    const requestCall = toolUses.find((t) => t.name === "request_input_component");
    expect(requestCall).toBeDefined();
  });
});
