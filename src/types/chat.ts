// ---- Core types ----

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  /** Present on user messages submitted via a custom input component */
  customInputData?: unknown;
  /** Title of the component that produced this message */
  customInputTitle?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface CustomInputComponent {
  title: string;
  description: string;
  code: string;
  persistent: boolean;
}

// ---- Content block types (matching Anthropic API response shape) ----

interface TextBlock {
  type: "text";
  text: string;
}

interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export type ContentBlock = TextBlock | ToolUseBlock;

// ---- Factory functions ----

let counter = 0;

function generateId(): string {
  return `msg_${Date.now()}_${counter++}`;
}

export function createUserMessage(content: string): Message {
  return {
    id: generateId(),
    role: "user",
    content,
    timestamp: Date.now(),
  };
}

export function createAssistantMessage(content: string): Message {
  return {
    id: generateId(),
    role: "assistant",
    content,
    timestamp: Date.now(),
  };
}

export function createCustomInputMessage(title: string, data: unknown): Message {
  const json = JSON.stringify(data);
  return {
    id: generateId(),
    role: "user",
    content: `[Custom Input: ${title}] ${json}`,
    timestamp: Date.now(),
    customInputData: data,
    customInputTitle: title,
  };
}

// ---- Parsing helpers ----

const CUSTOM_INPUT_RE = /^\[Custom Input: (.*?)\] ([\s\S]+)$/;

export function isCustomInputMessage(content: string): boolean {
  return CUSTOM_INPUT_RE.test(content);
}

export function parseCustomInputMessage(
  content: string
): { title: string; data: unknown } | null {
  const match = content.match(CUSTOM_INPUT_RE);
  if (!match) return null;
  try {
    return { title: match[1], data: JSON.parse(match[2]) };
  } catch {
    return null;
  }
}

// ---- Tool call extraction ----

export function extractToolCalls(content: ContentBlock[]): ToolCall[] {
  return content
    .filter((block): block is ToolUseBlock => block.type === "tool_use")
    .map((block) => ({
      id: block.id,
      name: block.name,
      input: block.input,
    }));
}
