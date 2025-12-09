/**
 * Desktop Storage API
 * Wrapper around Electron secure storage with localStorage fallback
 */

import { isElectron } from './platform';

/**
 * Get the Electron storage API
 */
function getStorageApi() {
  if (!isElectron() || !window.electronAPI?.storage) {
    return null;
  }
  return window.electronAPI.storage;
}

/**
 * Get a value from storage
 */
export async function get<T = unknown>(key: string): Promise<T | null> {
  const api = getStorageApi();

  if (api) {
    return await api.get<T>(key);
  }

  // LocalStorage fallback
  try {
    const value = localStorage.getItem(key);
    if (value === null) return null;
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/**
 * Set a value in storage
 */
export async function set<T = unknown>(key: string, value: T): Promise<void> {
  const api = getStorageApi();

  if (api) {
    await api.set(key, value);
    return;
  }

  // LocalStorage fallback
  localStorage.setItem(key, JSON.stringify(value));
}

/**
 * Remove a value from storage
 */
export async function remove(key: string): Promise<void> {
  const api = getStorageApi();

  if (api) {
    await api.remove(key);
    return;
  }

  // LocalStorage fallback
  localStorage.removeItem(key);
}

/**
 * Clear all storage
 */
export async function clear(): Promise<void> {
  const api = getStorageApi();

  if (api) {
    await api.clear();
    return;
  }

  // LocalStorage fallback
  localStorage.clear();
}

/**
 * Check if a key exists in storage
 */
export async function has(key: string): Promise<boolean> {
  const api = getStorageApi();

  if (api) {
    return await api.has(key);
  }

  // LocalStorage fallback
  return localStorage.getItem(key) !== null;
}

// ============================================================================
// Storage Object
// ============================================================================

export const storage = {
  get,
  set,
  remove,
  clear,
  has,

  /**
   * Check if using Electron secure storage
   */
  isSecure(): boolean {
    return getStorageApi() !== null;
  },
};

export default storage;
