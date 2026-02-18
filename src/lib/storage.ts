const API_KEY_STORAGE_KEY = "custom-inputs-api-key";

export function getApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(API_KEY_STORAGE_KEY);
}

export function setApiKey(key: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(API_KEY_STORAGE_KEY, key);
}

export function clearApiKey(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(API_KEY_STORAGE_KEY);
}

export function isValidApiKeyFormat(key: string): boolean {
  const trimmed = key.trim();
  if (!trimmed) return false;
  return trimmed.startsWith("sk-ant-");
}
