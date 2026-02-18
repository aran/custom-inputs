import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "@/lib/system-prompt";
import type { CustomInputComponent } from "@/types/chat";

describe("System prompt construction", () => {
  it("includes tool usage instructions", () => {
    const prompt = buildSystemPrompt(null);
    expect(prompt).toContain("create_input_component");
    expect(prompt).toContain("window.submitInput");
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
    };
    const prompt = buildSystemPrompt(component);
    expect(prompt).toContain("Set Tracker");
    expect(prompt).toContain(component.code);
    expect(prompt).not.toContain("No custom input component is currently active");
  });

  it("includes Tailwind CSS availability mention", () => {
    const prompt = buildSystemPrompt(null);
    expect(prompt).toContain("Tailwind");
  });

  it("includes sandbox environment constraints", () => {
    const prompt = buildSystemPrompt(null);
    expect(prompt).toContain("sandboxed iframe");
  });

  it("documents when to create custom inputs", () => {
    const prompt = buildSystemPrompt(null);
    expect(prompt).toContain("repeated structured data");
  });

  it("documents component modification capability", () => {
    const prompt = buildSystemPrompt(null);
    expect(prompt).toContain("create_input_component");
    expect(prompt).toContain("replace");
  });
});
