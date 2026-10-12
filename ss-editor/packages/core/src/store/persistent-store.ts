// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export function loadPersistedState<T extends object>(
  storageKey: string,
  getDefaultState: () => T,
  merge?: (saved: Partial<T>, defaults: T) => T,
): T {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<T>;
      const defaults = getDefaultState();
      return merge ? merge(parsed, defaults) : { ...defaults, ...parsed } as T;
    }
  } catch {
    console.error(`Failed to load state from localStorage key: ${storageKey}`);
  }
  return getDefaultState();
}

export function persistState<T>(storageKey: string, state: T): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch (err) {
    console.error(`[${storageKey}] Failed to persist state:`, err);
  }
}