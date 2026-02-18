/** Messages sent from parent to sandbox iframe */
export interface SandboxRenderMessage {
  type: "render";
  code: string;
}

/** Messages sent from sandbox iframe to parent */
export interface SandboxSubmitMessage {
  type: "submit";
  data: unknown;
}

export interface SandboxResizeMessage {
  type: "resize";
  height: number;
}

export type SandboxToParentMessage = SandboxSubmitMessage | SandboxResizeMessage;

export function isSandboxMessage(
  data: unknown
): data is SandboxToParentMessage {
  if (typeof data !== "object" || data === null) return false;
  const msg = data as Record<string, unknown>;
  return msg.type === "submit" || msg.type === "resize";
}

export function createRenderMessage(code: string): SandboxRenderMessage {
  return { type: "render", code };
}
