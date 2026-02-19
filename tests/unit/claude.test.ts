import { describe, it, expect } from "vitest";
import {
  MODELS,
  DEFAULT_CHAT_MODEL,
  CHAT_TOOL_DEFINITIONS,
  GENERATION_TOOL_DEFINITIONS,
  TOOL_DEFINITIONS,
} from "@/lib/claude";

describe("Model constants", () => {
  it("maps sonnet-4.6 to correct model ID", () => {
    expect(MODELS["sonnet-4.6"]).toBe("claude-sonnet-4-6");
  });

  it("maps opus-4.6 to correct model ID", () => {
    expect(MODELS["opus-4.6"]).toBe("claude-opus-4-6");
  });

  it("defaults to sonnet", () => {
    expect(DEFAULT_CHAT_MODEL).toBe("sonnet-4.6");
  });
});

describe("Tool definitions", () => {
  it("chat tools include request_input_component and clear_input_component", () => {
    const names = CHAT_TOOL_DEFINITIONS.map((t) => t.name);
    expect(names).toContain("request_input_component");
    expect(names).toContain("clear_input_component");
    expect(names).not.toContain("create_input_component");
  });

  it("request_input_component has requirements and persistent fields", () => {
    const tool = CHAT_TOOL_DEFINITIONS.find((t) => t.name === "request_input_component")!;
    const props = (tool.input_schema as { properties: Record<string, unknown> }).properties;
    expect(props.requirements).toBeDefined();
    expect(props.persistent).toBeDefined();
    expect(props.code).toBeUndefined();
  });

  it("generation tools include create_input_component with code field", () => {
    const names = GENERATION_TOOL_DEFINITIONS.map((t) => t.name);
    expect(names).toContain("create_input_component");
    expect(names).not.toContain("request_input_component");

    const tool = GENERATION_TOOL_DEFINITIONS.find((t) => t.name === "create_input_component")!;
    const props = (tool.input_schema as { properties: Record<string, unknown> }).properties;
    expect(props.code).toBeDefined();
  });

  it("legacy TOOL_DEFINITIONS combines both sets", () => {
    const names = TOOL_DEFINITIONS.map((t) => t.name);
    expect(names).toContain("request_input_component");
    expect(names).toContain("clear_input_component");
    expect(names).toContain("create_input_component");
  });
});
