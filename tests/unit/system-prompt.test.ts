import { describe, it, expect } from "vitest";
import { buildSystemPrompt, buildComponentGenerationPrompt } from "@/lib/system-prompt";
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

  it("shows persistent mode label for persistent component", () => {
    const component: CustomInputComponent = {
      title: "Color Picker",
      description: "Pick colors",
      code: "<div>picker</div>",
      persistent: true,
    };
    const prompt = buildSystemPrompt(component);
    expect(prompt).toContain("Persistent");
  });

  it("shows self-closing mode label for non-persistent component", () => {
    const component: CustomInputComponent = {
      title: "Confirm",
      description: "Yes or no",
      code: "<div>confirm</div>",
      persistent: false,
    };
    const prompt = buildSystemPrompt(component);
    expect(prompt).toContain("Self-closing");
  });
});

describe("Component generation prompt", () => {
  const baseRequest = {
    title: "Mood Logger",
    description: "Log your mood",
    requirements: "Slider 1-10, optional note field, submit button",
    persistent: false,
  };

  it("includes the component title, description, and requirements", () => {
    const prompt = buildComponentGenerationPrompt(baseRequest);
    expect(prompt).toContain("Mood Logger");
    expect(prompt).toContain("Log your mood");
    expect(prompt).toContain("Slider 1-10");
  });

  it("includes technical environment constraints", () => {
    const prompt = buildComponentGenerationPrompt(baseRequest);
    expect(prompt).toContain("Tailwind CSS");
    expect(prompt).toContain("submitInput");
    expect(prompt).toContain("Do NOT include <html>");
  });

  it("instructs compact layout and no scrolling", () => {
    const prompt = buildComponentGenerationPrompt(baseRequest);
    expect(prompt).toMatch(/compact|space efficient/i);
    expect(prompt).toMatch(/scroll/i);
  });

  it("instructs against mandatory inputs unless essential", () => {
    const prompt = buildComponentGenerationPrompt(baseRequest);
    expect(prompt).toMatch(/optional|sensible defaults/i);
  });

  it("instructs not to duplicate title in body", () => {
    const prompt = buildComponentGenerationPrompt(baseRequest);
    expect(prompt).toMatch(/not.*title.*body|no.*title.*heading/i);
  });

  it("shows self-closing mode for non-persistent", () => {
    const prompt = buildComponentGenerationPrompt({ ...baseRequest, persistent: false });
    expect(prompt).toContain("Self-closing");
  });

  it("shows persistent mode for persistent", () => {
    const prompt = buildComponentGenerationPrompt({ ...baseRequest, persistent: true });
    expect(prompt).toContain("Persistent");
  });
});
