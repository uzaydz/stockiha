// Simple global head mutation guard to prevent duplicate/flickering updates

declare global {
  interface Window {
    __STORE_HEAD_ACTIVE__?: boolean;
  }
}

export function setStoreHeadActive(active: boolean): void {
  try {
    window.__STORE_HEAD_ACTIVE__ = active;
  } catch {}
}

export function isStoreHeadActive(): boolean {
  try {
    return window.__STORE_HEAD_ACTIVE__ === true;
  } catch {
    return false;
  }
}

export function canMutateHead(): boolean {
  return !isStoreHeadActive();
}

