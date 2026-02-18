import { describe, it, expect, beforeEach } from "vitest";
import { getApiKey, setApiKey, clearApiKey, isValidApiKeyFormat } from "@/lib/storage";

describe("localStorage helpers", () => {
  beforeEach(() => {
    clearApiKey();
  });

  it("returns null when no key stored", () => {
    expect(getApiKey()).toBeNull();
  });

  it("stores and retrieves an API key", () => {
    setApiKey("sk-ant-api03-test-key");
    expect(getApiKey()).toBe("sk-ant-api03-test-key");
  });

  it("clears the API key", () => {
    setApiKey("sk-ant-api03-test-key");
    clearApiKey();
    expect(getApiKey()).toBeNull();
  });

  it("overwrites a previous key", () => {
    setApiKey("sk-ant-api03-first");
    setApiKey("sk-ant-api03-second");
    expect(getApiKey()).toBe("sk-ant-api03-second");
  });
});

describe("API key format validation", () => {
  it("accepts keys starting with sk-ant-", () => {
    expect(isValidApiKeyFormat("sk-ant-api03-abcdef123")).toBe(true);
  });

  it("rejects empty string", () => {
    expect(isValidApiKeyFormat("")).toBe(false);
  });

  it("rejects keys that don't start with sk-ant-", () => {
    expect(isValidApiKeyFormat("invalid-key-format")).toBe(false);
  });

  it("rejects whitespace-only", () => {
    expect(isValidApiKeyFormat("   ")).toBe(false);
  });
});
