/**
 * Secure Storage Handler using electron-store
 *
 * يستبدل استخدام executeJavaScript غير الآمن بـ electron-store
 *
 * التحسينات الأمنية:
 * - تشفير البيانات الحساسة
 * - validation للمفاتيح والقيم
 * - schema validation
 * - error handling آمن
 */

const Store = require('electron-store');
const { app } = require('electron');
const path = require('path');

// ============================================================================
// Store Configuration
// ============================================================================

const schema = {
  // App settings
  theme: {
    type: 'string',
    enum: ['light', 'dark', 'system'],
    default: 'system',
  },
  language: {
    type: 'string',
    default: 'ar',
  },

  // Window settings
  windowBounds: {
    type: 'object',
    properties: {
      x: { type: 'number' },
      y: { type: 'number' },
      width: { type: 'number', minimum: 800 },
      height: { type: 'number', minimum: 600 },
    },
  },

  // User preferences
  lastSync: {
    type: 'string', // ISO date string
    default: null,
  },

  // Cache (not encrypted)
  cache: {
    type: 'object',
    default: {},
  },
};

// ============================================================================
// Initialize Stores
// ============================================================================

// Main store (encrypted for sensitive data)
const mainStore = new Store({
  name: 'config',
  cwd: app.getPath('userData'),
  schema,
  encryptionKey: 'stockiha-secure-encryption-key-2024', // TODO: Use dynamic key
  clearInvalidConfig: true,
});

// Session store (temporary, cleared on app restart)
const sessionStore = new Store({
  name: 'session',
  cwd: path.join(app.getPath('userData'), 'temp'),
  encryptionKey: 'stockiha-session-key-2024',
  clearInvalidConfig: true,
});

// Cache store (not encrypted, for non-sensitive data)
const cacheStore = new Store({
  name: 'cache',
  cwd: path.join(app.getPath('userData'), 'cache'),
  clearInvalidConfig: true,
});

// ============================================================================
// Validation Functions
// ============================================================================

function validateKey(key) {
  if (typeof key !== 'string') {
    throw new Error('Key must be a string');
  }

  if (key.length === 0 || key.length > 100) {
    throw new Error('Key length must be between 1 and 100 characters');
  }

  // Only allow alphanumeric, underscore, hyphen, dot, colon
  if (!/^[a-zA-Z0-9_.-:]+$/.test(key)) {
    throw new Error('Key contains invalid characters');
  }

  return true;
}

function validateValue(value) {
  // Check if value is serializable
  try {
    const jsonString = JSON.stringify(value);

    // Check size (max 10MB)
    if (jsonString.length > 10 * 1024 * 1024) {
      throw new Error('Value size exceeds 10MB limit');
    }

    return true;
  } catch (error) {
    throw new Error('Value is not serializable');
  }
}

// ============================================================================
// Storage Operations
// ============================================================================

class SecureStorage {
  /**
   * Get value from store
   */
  static get(key, defaultValue = null) {
    try {
      validateKey(key);
      return mainStore.get(key, defaultValue);
    } catch (error) {
      console.error('Storage get error:', error);
      return defaultValue;
    }
  }

  /**
   * Set value in store
   */
  static set(key, value) {
    try {
      validateKey(key);
      validateValue(value);
      mainStore.set(key, value);
      return { success: true };
    } catch (error) {
      console.error('Storage set error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove value from store
   */
  static remove(key) {
    try {
      validateKey(key);
      mainStore.delete(key);
      return { success: true };
    } catch (error) {
      console.error('Storage remove error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clear all data
   */
  static clear() {
    try {
      mainStore.clear();
      return { success: true };
    } catch (error) {
      console.error('Storage clear error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if key exists
   */
  static has(key) {
    try {
      validateKey(key);
      return mainStore.has(key);
    } catch (error) {
      console.error('Storage has error:', error);
      return false;
    }
  }

  /**
   * Get all keys
   */
  static keys() {
    try {
      const store = mainStore.store;
      return Object.keys(store);
    } catch (error) {
      console.error('Storage keys error:', error);
      return [];
    }
  }

  /**
   * Get store size
   */
  static size() {
    try {
      return mainStore.size;
    } catch (error) {
      console.error('Storage size error:', error);
      return 0;
    }
  }

  /**
   * Get store path
   */
  static path() {
    return mainStore.path;
  }
}

// ============================================================================
// Session Storage Operations
// ============================================================================

class SessionStorage {
  static get(key, defaultValue = null) {
    try {
      validateKey(key);
      return sessionStore.get(key, defaultValue);
    } catch (error) {
      console.error('Session get error:', error);
      return defaultValue;
    }
  }

  static set(key, value) {
    try {
      validateKey(key);
      validateValue(value);
      sessionStore.set(key, value);
      return { success: true };
    } catch (error) {
      console.error('Session set error:', error);
      return { success: false, error: error.message };
    }
  }

  static remove(key) {
    try {
      validateKey(key);
      sessionStore.delete(key);
      return { success: true };
    } catch (error) {
      console.error('Session remove error:', error);
      return { success: false, error: error.message };
    }
  }

  static clear() {
    try {
      sessionStore.clear();
      return { success: true };
    } catch (error) {
      console.error('Session clear error:', error);
      return { success: false, error: error.message };
    }
  }
}

// ============================================================================
// Cache Storage Operations (Fast, unencrypted)
// ============================================================================

class CacheStorage {
  static get(key, defaultValue = null) {
    try {
      validateKey(key);
      return cacheStore.get(key, defaultValue);
    } catch (error) {
      console.error('Cache get error:', error);
      return defaultValue;
    }
  }

  static set(key, value, ttl = null) {
    try {
      validateKey(key);
      validateValue(value);

      const data = {
        value,
        timestamp: Date.now(),
        ttl, // Time to live in milliseconds
      };

      cacheStore.set(key, data);
      return { success: true };
    } catch (error) {
      console.error('Cache set error:', error);
      return { success: false, error: error.message };
    }
  }

  static remove(key) {
    try {
      validateKey(key);
      cacheStore.delete(key);
      return { success: true };
    } catch (error) {
      console.error('Cache remove error:', error);
      return { success: false, error: error.message };
    }
  }

  static clear() {
    try {
      cacheStore.clear();
      return { success: true };
    } catch (error) {
      console.error('Cache clear error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clean expired cache entries
   */
  static cleanExpired() {
    try {
      const store = cacheStore.store;
      const now = Date.now();
      let cleaned = 0;

      Object.keys(store).forEach(key => {
        const data = store[key];
        if (data.ttl && now - data.timestamp > data.ttl) {
          cacheStore.delete(key);
          cleaned++;
        }
      });

      return { success: true, cleaned };
    } catch (error) {
      console.error('Cache clean error:', error);
      return { success: false, error: error.message };
    }
  }
}

// ============================================================================
// Auto-cleanup on app start
// ============================================================================

// Clear session store on app start
sessionStore.clear();

// Clean expired cache entries
CacheStorage.cleanExpired();

// ============================================================================
// Export
// ============================================================================

module.exports = {
  SecureStorage,
  SessionStorage,
  CacheStorage,
};
