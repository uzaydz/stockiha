import { isSQLiteAvailable } from '@/lib/db/sqliteAPI';

// A Supabase-compatible async storage backed by Electron's secure storage (electron-store)
// This avoids using the main SQLite database for auth tokens, preventing connection thrashing.

const STORAGE_KEY_PREFIX = 'supabase.auth.token';

// Helper to access the secure storage API
const getStorage = () => {
  if (typeof window !== 'undefined' && (window as any).electronAPI?.storage) {
    return (window as any).electronAPI.storage;
  }
  return null;
};

export const sqliteAuthStorage = {
  async getItem(key: string): Promise<string | null> {
    const storage = getStorage();
    if (storage) {
      try {
        // Try to get from electron-store first
        const value = await storage.get(key);
        if (value) return value;
      } catch (error) {
        console.warn('[AuthStorage] Failed to get item from electron storage:', error);
      }
    }

    // Fallback to localStorage if available (for web mode or if electron storage fails)
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }

    return null;
  },

  async setItem(key: string, value: string): Promise<void> {
    const storage = getStorage();
    if (storage) {
      try {
        await storage.set(key, value);
      } catch (error) {
        console.error('[AuthStorage] Failed to set item in electron storage:', error);
      }
    }

    // Always mirror to localStorage for redundancy and web compatibility
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  },

  async removeItem(key: string): Promise<void> {
    const storage = getStorage();
    if (storage) {
      try {
        await storage.remove(key);
      } catch (error) {
        console.error('[AuthStorage] Failed to remove item from electron storage:', error);
      }
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  }
};
