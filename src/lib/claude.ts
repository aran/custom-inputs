import Anthropic from "@anthropic-ai/sdk";
import type { CustomInputComponent } from "@/types/chat";
import { buildSystemPrompt } from "@/lib/system-prompt";

export const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: "create_input_component",
    description:
      "Create or replace the custom input component displayed to the user. " +
      "The component renders in a sandboxed iframe with Tailwind CSS available. " +
      "Use window.submitInput(data) to send structured data back to the chat.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "Short title for the component (shown in the UI header)",
        },
        description: {
          type: "string",
          description: "Brief description of what this component does",
        },
        code: {
          type: "string",
          description:
            "Self-contained HTML/CSS/JS code for the component. " +
            "Use Tailwind classes for styling. " +
            "Call window.submitInput(data) to send data. " +
            "Do NOT include <html>/<head>/<body> tags.",
        },
      },
      required: ["title", "description", "code"],
    },
  },
  {
    name: "clear_input_component",
    description:
      "Remove the currently active custom input component. " +
      "Use this when the component is no longer relevant to the conversation.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

export interface ChatRequestOptions {
  apiKey: string;
  messages: Anthropic.MessageParam[];
  activeComponent: CustomInputComponent | null;
}

export function createClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

export async function sendChatRequest({
  apiKey,
  messages,
  activeComponent,
}: ChatRequestOptions): Promise<Anthropic.Message> {
  const client = createClient(apiKey);
  return client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: buildSystemPrompt(activeComponent),
    tools: TOOL_DEFINITIONS,
    messages,
  });
}

export function createStreamingChatRequest({
  apiKey,
  messages,
  activeComponent,
}: ChatRequestOptions) {
  const client = createClient(apiKey);
  return client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: buildSystemPrompt(activeComponent),
    tools: TOOL_DEFINITIONS,
    messages,
  });
}
