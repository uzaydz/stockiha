/**
 * Desktop Secure Session API
 * Wrapper around Electron secure session storage
 */

import { isElectron } from './platform';

/**
 * Get the Electron session API
 */
function getSessionApi() {
  if (!isElectron() || !window.electronAPI?.session) {
    return null;
  }
  return window.electronAPI.session;
}

/**
 * Get or create a secure session key
 */
export async function getOrCreateKey(): Promise<string> {
  const api = getSessionApi();

  if (api) {
    return await api.getOrCreateKey();
  }

  // Fallback: generate and store in localStorage
  // Note: This is less secure than Electron's keytar-based storage
  const STORAGE_KEY = 'stockiha_session_key';
  let key = localStorage.getItem(STORAGE_KEY);

  if (!key) {
    // Generate a random key
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    key = Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(STORAGE_KEY, key);
  }

  return key;
}

/**
 * Clear the session key
 */
export async function clearKey(): Promise<boolean> {
  const api = getSessionApi();

  if (api) {
    return await api.clearKey();
  }

  // Fallback: remove from localStorage
  const STORAGE_KEY = 'stockiha_session_key';
  localStorage.removeItem(STORAGE_KEY);
  return true;
}

// ============================================================================
// Session Object
// ============================================================================

export const session = {
  getOrCreateKey,
  clearKey,

  /**
   * Check if using secure session storage
   */
  isSecure(): boolean {
    return getSessionApi() !== null;
  },
};

export default session;
