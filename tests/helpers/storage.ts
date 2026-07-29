type StorageRecord = Record<string, string>;

export function installStorageMocks() {
  function createStorage() {
    let store: StorageRecord = {};
    return {
      clear() {
        store = {};
      },
      getItem(key: string) {
        return store[key] ?? null;
      },
      key(index: number) {
        return Object.keys(store)[index] ?? null;
      },
      get length() {
        return Object.keys(store).length;
      },
      removeItem(key: string) {
        delete store[key];
      },
      setItem(key: string, value: string) {
        store[key] = String(value);
      },
    } satisfies Storage;
  }

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: createStorage(),
  });
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: createStorage(),
  });
}
