// Polyfill localStorage for Node 22+ where the built-in localStorage
// has a limited API (missing removeItem, clear, setItem as methods).
// This provides a full Web Storage API implementation for tests.

const store = new Map<string, string>();

const localStorageMock: Storage = {
  getItem(key: string): string | null {
    return store.get(key) ?? null;
  },
  setItem(key: string, value: string): void {
    store.set(key, value);
  },
  removeItem(key: string): void {
    store.delete(key);
  },
  clear(): void {
    store.clear();
  },
  get length(): number {
    return store.size;
  },
  key(index: number): string | null {
    const keys = Array.from(store.keys());
    return keys[index] ?? null;
  },
};

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
  configurable: true,
});
