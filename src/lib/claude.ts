import Anthropic from "@anthropic-ai/sdk";
import type { CustomInputComponent } from "@/types/chat";
import { buildSystemPrompt } from "@/lib/system-prompt";

// ---- Model constants ----

export const MODELS = {
  "sonnet-4.6": "claude-sonnet-4-6",
  "opus-4.6": "claude-opus-4-6",
} as const;

export type ModelKey = keyof typeof MODELS;
export const DEFAULT_CHAT_MODEL: ModelKey = "sonnet-4.6";

// ---- Tool definitions: Chat model (declares intent) ----

export const CHAT_TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: "request_input_component",
    description:
      "Request a custom input component to be generated and displayed to the user. " +
      "Describe what you want — the system will generate the implementation. " +
      "The component renders in a sandboxed iframe with Tailwind CSS available.",
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
        requirements: {
          type: "string",
          description:
            "Detailed natural-language requirements for the component: layout, fields, " +
            "behavior, validation, styling, data format for submitInput(data), etc.",
        },
        persistent: {
          type: "boolean",
          description:
            "false (default) = self-closing: auto-dismisses after user submits. " +
            "true = persistent: stays visible for multiple interactions until explicitly dismissed.",
        },
      },
      required: ["title", "description", "requirements"],
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

// ---- Tool definitions: Component generation (Opus produces code) ----

export const GENERATION_TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: "create_input_component",
    description:
      "Create a self-contained HTML/CSS/JS component for a sandboxed iframe with Tailwind CSS available. " +
      "Call window.submitInput(data) to send structured data back to the chat.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "Short title for the component",
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
];

// ---- Legacy combined definitions (for tests/backwards compat) ----

export const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  ...CHAT_TOOL_DEFINITIONS,
  ...GENERATION_TOOL_DEFINITIONS,
];

export interface ChatRequestOptions {
  apiKey: string;
  messages: Anthropic.MessageParam[];
  activeComponent: CustomInputComponent | null;
  model?: ModelKey;
}

export function createClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

export async function sendChatRequest({
  apiKey,
  messages,
  activeComponent,
  model = DEFAULT_CHAT_MODEL,
}: ChatRequestOptions): Promise<Anthropic.Message> {
  const client = createClient(apiKey);
  return client.messages.create({
    model: MODELS[model],
    max_tokens: 4096,
    system: buildSystemPrompt(activeComponent),
    tools: CHAT_TOOL_DEFINITIONS,
    messages,
  });
}

export function createStreamingChatRequest({
  apiKey,
  messages,
  activeComponent,
  model = DEFAULT_CHAT_MODEL,
}: ChatRequestOptions) {
  const client = createClient(apiKey);
  return client.messages.stream({
    model: MODELS[model],
    max_tokens: 4096,
    system: buildSystemPrompt(activeComponent),
    tools: CHAT_TOOL_DEFINITIONS,
    messages,
  });
}
