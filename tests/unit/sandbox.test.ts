import { describe, it, expect } from "vitest";
import {
  isSandboxMessage,
  createRenderMessage,
} from "@/lib/sandbox";

describe("Sandbox postMessage protocol", () => {
  it("createRenderMessage produces correct shape", () => {
    const msg = createRenderMessage("<div>hello</div>");
    expect(msg.type).toBe("render");
    expect(msg.code).toBe("<div>hello</div>");
  });

  it("isSandboxMessage accepts submit messages", () => {
    expect(isSandboxMessage({ type: "submit", data: { foo: 1 } })).toBe(true);
  });

  it("isSandboxMessage accepts resize messages", () => {
    expect(isSandboxMessage({ type: "resize", height: 300 })).toBe(true);
  });

  it("isSandboxMessage rejects unknown types", () => {
    expect(isSandboxMessage({ type: "unknown" })).toBe(false);
  });

  it("isSandboxMessage rejects non-objects", () => {
    expect(isSandboxMessage(null)).toBe(false);
    expect(isSandboxMessage("string")).toBe(false);
    expect(isSandboxMessage(42)).toBe(false);
  });
});
