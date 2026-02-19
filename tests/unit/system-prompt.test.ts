import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "@/lib/system-prompt";
import type { CustomInputComponent } from "@/types/chat";

describe("System prompt construction", () => {
  it("includes tool usage instructions", () => {
    const prompt = buildSystemPrompt(null);
    expect(prompt).toContain("request_input_component");
    expect(prompt).toContain("submitInput");
  });

  it("includes data format documentation", () => {
    const prompt = buildSystemPrompt(null);
    expect(prompt).toContain("[Custom Input:");
  });

  it("says no component active when none provided", () => {
    const prompt = buildSystemPrompt(null);
    expect(prompt).toContain("No custom input component is currently active");
  });

  it("includes component title and code when active", () => {
    const component: CustomInputComponent = {
      title: "Set Tracker",
      description: "Track workout sets",
      code: '<div class="tracker"><button onclick="window.submitInput({reps:10})">Submit</button></div>',
      persistent: false,
    };
    const prompt = buildSystemPrompt(component);
    expect(prompt).toContain("Set Tracker");
    expect(prompt).toContain(component.code);
    expect(prompt).not.toContain("No custom input component is currently active");
  });

  it("documents persistent flag options", () => {
    const prompt = buildSystemPrompt(null);
    expect(prompt).toContain("persistent: false");
    expect(prompt).toContain("persistent: true");
  });

  it("explains requirements field", () => {
    const prompt = buildSystemPrompt(null);
    expect(prompt).toContain("requirements");
    expect(prompt).toContain("submitInput");
  });

  it("documents when to create custom inputs", () => {
    const prompt = buildSystemPrompt(null);
    expect(prompt).toContain("repeated structured data");
  });

  it("documents component modification capability", () => {
    const prompt = buildSystemPrompt(null);
    expect(prompt).toContain("request_input_component");
    expect(prompt).toContain("replace");
  });

  it("documents clear_input_component tool", () => {
    const prompt = buildSystemPrompt(null);
    expect(prompt).toContain("clear_input_component");
  });

  it("encourages clearing component when no longer relevant", () => {
    const prompt = buildSystemPrompt(null);
    expect(prompt).toMatch(/clear.*no longer relevant|remove.*no longer needed/i);
  });
});
