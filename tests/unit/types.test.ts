import { describe, it, expect } from "vitest";
import {
  type CustomInputComponent,
  createUserMessage,
  createAssistantMessage,
  createCustomInputMessage,
  parseCustomInputMessage,
  isCustomInputMessage,
  extractToolCalls,
} from "@/types/chat";

describe("Message types", () => {
  it("creates a user message", () => {
    const msg = createUserMessage("hello");
    expect(msg.role).toBe("user");
    expect(msg.content).toBe("hello");
    expect(msg.id).toBeDefined();
    expect(msg.timestamp).toBeGreaterThan(0);
  });

  it("creates an assistant message", () => {
    const msg = createAssistantMessage("hi there");
    expect(msg.role).toBe("assistant");
    expect(msg.content).toBe("hi there");
  });

  it("creates a custom input message with structured data", () => {
    const data = { exercise: "squat", weight: 135, reps: 10 };
    const msg = createCustomInputMessage("Set Tracker", data);
    expect(msg.role).toBe("user");
    expect(msg.content).toBe('[Custom Input: Set Tracker] {"exercise":"squat","weight":135,"reps":10}');
    expect(msg.customInputData).toEqual(data);
    expect(msg.customInputTitle).toBe("Set Tracker");
  });

  it("custom input message works with string data", () => {
    const msg = createCustomInputMessage("Mood Picker", "happy");
    expect(msg.content).toBe('[Custom Input: Mood Picker] "happy"');
  });

  it("custom input message works with array data", () => {
    const msg = createCustomInputMessage("Meal Log", ["chicken", "rice"]);
    expect(msg.content).toBe('[Custom Input: Meal Log] ["chicken","rice"]');
  });
});

describe("Custom input message parsing", () => {
  it("detects custom input messages", () => {
    expect(isCustomInputMessage('[Custom Input: Set Tracker] {"exercise":"squat"}')).toBe(true);
    expect(isCustomInputMessage("hello world")).toBe(false);
    expect(isCustomInputMessage("[Custom Input: ] {}")).toBe(true);
  });

  it("parses custom input messages", () => {
    const result = parseCustomInputMessage('[Custom Input: Set Tracker] {"exercise":"squat","reps":10}');
    expect(result).not.toBeNull();
    expect(result!.title).toBe("Set Tracker");
    expect(result!.data).toEqual({ exercise: "squat", reps: 10 });
  });

  it("returns null for non-custom-input messages", () => {
    expect(parseCustomInputMessage("hello world")).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    expect(parseCustomInputMessage("[Custom Input: Test] not-json")).toBeNull();
  });
});

describe("Tool call extraction", () => {
  it("extracts create_input_component tool call from API response", () => {
    const apiResponse = {
      content: [
        { type: "text" as const, text: "Here's a workout tracker!" },
        {
          type: "tool_use" as const,
          id: "tool_1",
          name: "create_input_component",
          input: {
            title: "Set Tracker",
            description: "Track your workout sets",
            code: "<div>tracker</div>",
          },
        },
      ],
    };

    const toolCalls = extractToolCalls(apiResponse.content);
    expect(toolCalls).toHaveLength(1);
    expect(toolCalls[0].name).toBe("create_input_component");
    expect(toolCalls[0].input.title).toBe("Set Tracker");
    expect(toolCalls[0].input.code).toBe("<div>tracker</div>");
  });

  it("returns empty array when no tool calls present", () => {
    const apiResponse = {
      content: [{ type: "text" as const, text: "Just text" }],
    };
    const toolCalls = extractToolCalls(apiResponse.content);
    expect(toolCalls).toHaveLength(0);
  });

  it("extracts text content alongside tool calls", () => {
    const content = [
      { type: "text" as const, text: "Here you go!" },
      {
        type: "tool_use" as const,
        id: "tool_1",
        name: "create_input_component",
        input: { title: "Test", description: "desc", code: "<div/>" },
      },
    ];

    const toolCalls = extractToolCalls(content);
    expect(toolCalls).toHaveLength(1);
  });
});

describe("Component state transitions", () => {
  it("component can be null (no active component)", () => {
    const component: CustomInputComponent | null = null;
    expect(component).toBeNull();
  });

  it("component has required fields", () => {
    const component: CustomInputComponent = {
      title: "Set Tracker",
      description: "Track workout sets",
      code: "<div>tracker</div>",
      persistent: false,
    };
    expect(component.title).toBe("Set Tracker");
    expect(component.description).toBe("Track workout sets");
    expect(component.code).toBe("<div>tracker</div>");
  });

  it("component replacement produces a new component object", () => {
    const old: CustomInputComponent = {
      title: "Set Tracker",
      description: "Track sets",
      code: "<div>v1</div>",
      persistent: false,
    };
    const updated: CustomInputComponent = {
      title: "Set Tracker",
      description: "Track sets with RPE",
      code: "<div>v2</div>",
      persistent: false,
    };
    expect(old).not.toEqual(updated);
    expect(updated.code).toContain("v2");
  });
});
