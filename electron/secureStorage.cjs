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

const { app } = require('electron');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

let Store = null;
let storeLoadAttempted = false;

async function resolveElectronStore() {
  if (Store || storeLoadAttempted) {
    return Store;
  }

  storeLoadAttempted = true;

  try {
    Store = require('electron-store');
    return Store;
  } catch (error) {
    const errorCode = error?.code;
    if (errorCode !== 'ERR_REQUIRE_ESM' && errorCode !== 'MODULE_NOT_FOUND') {
      console.warn('[SecureStorage] electron-store require failed:', error?.message || error);
    }
  }

  try {
    const mod = await import('electron-store');
    Store = mod?.default || mod;
    return Store;
  } catch (error) {
    console.warn('[SecureStorage] electron-store not available, using JSON fallback:', error?.message || error);
  }

  return null;
}

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
    type: ['string', 'null'], // ISO date string or null
    default: null,
  },

  // Cache (not encrypted)
  cache: {
    type: 'object',
    default: {},
  },
};

// ============================================================================
// Initialize Stores (lazy, with dynamic encryption key)
// ============================================================================

let mainStore = null;
let sessionStore = null;
let cacheStore = null;
let storesInitialized = false;

function deriveKey(baseKey, purpose) {
  return crypto
    .createHash('sha256')
    .update(`${baseKey}:${purpose}`)
    .digest('hex');
}

class JsonStore {
  constructor({ name, cwd }) {
    this.name = name;
    this.cwd = cwd;
    fs.mkdirSync(cwd, { recursive: true });
    this.path = path.join(cwd, `${name}.json`);
    this._store = this._read();
  }

  _read() {
    try {
      if (!fs.existsSync(this.path)) return {};
      const raw = fs.readFileSync(this.path, 'utf8');
      if (!raw) return {};
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  _write() {
    try {
      fs.writeFileSync(this.path, JSON.stringify(this._store || {}), 'utf8');
    } catch (error) {
      console.error('[SecureStorage] Failed to write JSON store:', error?.message || error);
    }
  }

  get(key, defaultValue) {
    return Object.prototype.hasOwnProperty.call(this._store, key)
      ? this._store[key]
      : defaultValue;
  }

  set(key, value) {
    this._store[key] = value;
    this._write();
  }

  delete(key) {
    delete this._store[key];
    this._write();
  }

  clear() {
    this._store = {};
    this._write();
  }

  has(key) {
    return Object.prototype.hasOwnProperty.call(this._store, key);
  }

  get store() {
    return this._store || {};
  }

  get size() {
    return Object.keys(this._store || {}).length;
  }
}

async function initializeSecureStorage(encryptionKey) {
  if (storesInitialized) return true;
  if (!encryptionKey || typeof encryptionKey !== 'string') {
    throw new Error('Secure storage encryption key is required');
  }

  const userDataPath = app.getPath('userData');
  const mainKey = deriveKey(encryptionKey, 'main');
  const sessionKey = deriveKey(encryptionKey, 'session');

  const rawStoreModule = await resolveElectronStore();
  const StoreModule = typeof rawStoreModule === 'function'
    ? rawStoreModule
    : (rawStoreModule && typeof rawStoreModule.default === 'function' ? rawStoreModule.default : null);

  if (StoreModule) {
    // Main store (encrypted for sensitive data)
    mainStore = new StoreModule({
      name: 'config',
      cwd: userDataPath,
      schema,
      encryptionKey: mainKey,
      clearInvalidConfig: true,
    });

    // Session store (temporary, cleared on app restart)
    sessionStore = new StoreModule({
      name: 'session',
      cwd: path.join(userDataPath, 'temp'),
      encryptionKey: sessionKey,
      clearInvalidConfig: true,
    });

    // Cache store (not encrypted, for non-sensitive data)
    cacheStore = new StoreModule({
      name: 'cache',
      cwd: path.join(userDataPath, 'cache'),
      clearInvalidConfig: true,
    });
  } else {
    console.warn('[SecureStorage] Using JSON fallback store (no encryption).');
    mainStore = new JsonStore({ name: 'config', cwd: userDataPath });
    sessionStore = new JsonStore({ name: 'session', cwd: path.join(userDataPath, 'temp') });
    cacheStore = new JsonStore({ name: 'cache', cwd: path.join(userDataPath, 'cache') });
  }

  sessionStore.clear();
  CacheStorage.cleanExpired();

  storesInitialized = true;
  return true;
}

function ensureStores() {
  if (!storesInitialized || !mainStore || !sessionStore || !cacheStore) {
    throw new Error('Secure storage is not initialized');
  }
}

// ============================================================================
// Validation Functions
// ============================================================================

function validateKey(key) {
  if (typeof key !== 'string') {
    throw new Error('Key must be a string');
  }

  if (key.length === 0 || key.length > 200) {
    throw new Error('Key length must be between 1 and 200 characters');
  }

  if (/[\x00-\x1F\x7F]/.test(key)) {
    throw new Error('Key contains control characters');
  }

  const lowered = key.toLowerCase();
  if (lowered === '__proto__' || lowered === 'constructor' || lowered === 'prototype') {
    throw new Error('Key contains unsafe value');
  }

  if (key.includes('.')) {
    const parts = key.split('.');
    for (const part of parts) {
      const partLowered = part.toLowerCase();
      if (partLowered === '__proto__' || partLowered === 'constructor' || partLowered === 'prototype') {
        throw new Error('Key contains unsafe value');
      }
    }
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
      ensureStores();
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
      ensureStores();
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
      ensureStores();
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
      ensureStores();
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
      ensureStores();
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
      ensureStores();
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
      ensureStores();
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
    ensureStores();
    return mainStore.path;
  }
}

// ============================================================================
// Session Storage Operations
// ============================================================================

class SessionStorage {
  static get(key, defaultValue = null) {
    try {
      ensureStores();
      validateKey(key);
      return sessionStore.get(key, defaultValue);
    } catch (error) {
      console.error('Session get error:', error);
      return defaultValue;
    }
  }

  static set(key, value) {
    try {
      ensureStores();
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
      ensureStores();
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
      ensureStores();
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
      ensureStores();
      validateKey(key);
      return cacheStore.get(key, defaultValue);
    } catch (error) {
      console.error('Cache get error:', error);
      return defaultValue;
    }
  }

  static set(key, value, ttl = null) {
    try {
      ensureStores();
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
      ensureStores();
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
      ensureStores();
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
      if (!cacheStore) return { success: true, cleaned: 0 };
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
// Export
// ============================================================================

module.exports = {
  initializeSecureStorage,
  SecureStorage,
  SessionStorage,
  CacheStorage,
};
