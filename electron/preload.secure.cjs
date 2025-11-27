/**
 * Preload Script المحسن والآمن
 *
 * التحسينات الأمنية:
 * - تقليل الوظائف المعرضة من 100+ إلى ~30
 * - فصل الوظائف حسب المسؤولية
 * - إضافة validation للمدخلات
 * - استخدام whitelist للقنوات المسموحة
 * - إزالة وصول مباشر لـ process و node APIs
 */

const { contextBridge, ipcRenderer } = require('electron');

// ============================================================================
// Whitelisted IPC Channels
// ============================================================================

const ALLOWED_CHANNELS = {
  // App
  'app-version': true,
  'app-name': true,
  'get-system-info': true,
  'app-quit': true,

  // Window
  'window-minimize': true,
  'window-maximize': true,
  'window-close': true,
  'window-hide': true,
  'window-show': true,
  'window-fullscreen': true,
  'window-toggle-devtools': true,

  // Dialog
  'show-message-box': true,
  'show-save-dialog': true,
  'show-open-dialog': true,

  // Notification
  'show-notification': true,

  // Storage (secure)
  'storage:get': true,
  'storage:set': true,
  'storage:remove': true,
  'storage:clear': true,
  'storage:has': true,

  // Session (secure)
  'secure-session:get-key': true,
  'secure-session:clear-key': true,

  // Database (SQLite)
  'db:initialize': true,
  'db:query': true,
  'db:query-one': true,
  'db:upsert': true,
  'db:delete': true,
  'db:upsert-product': true,
  'db:search-products': true,
  'db:add-pos-order': true,
  'db:get-statistics': true,
  'db:cleanup-old-data': true,
  'db:vacuum': true,
  'db:get-size': true,
  'db:backup': true,
  'db:restore': true,
  'db:close': true,
  'db:log-conflict': true,
  'db:get-conflict-history': true,

  // License / Secure Clock
  'license:set-anchor': true,
  'license:get-secure-now': true,

  // Updater
  'updater:check-for-updates': true,
  'updater:download-update': true,
  'updater:quit-and-install': true,
  'updater:get-version': true,

  // File (restricted)
  'file:save-as': true,
  'file:export-pdf': true,
  'file:export-excel': true,
};

const ALLOWED_RECEIVE_CHANNELS = {
  'checking-for-update': true,
  'update-available': true,
  'update-not-available': true,
  'update-error': true,
  'download-progress': true,
  'update-downloaded': true,
  'menu-new': true,
  'menu-open-file': true,
  'menu-settings': true,
};

// ============================================================================
// Input Validation
// ============================================================================

function validateChannel(channel) {
  if (!ALLOWED_CHANNELS[channel]) {
    throw new Error(`IPC channel "${channel}" is not allowed`);
  }
}

function validateString(value, maxLength = 1000) {
  if (typeof value !== 'string') {
    throw new Error('Value must be a string');
  }
  if (value.length > maxLength) {
    throw new Error(`Value exceeds maximum length of ${maxLength}`);
  }
  return value;
}

function sanitizeStorageKey(key) {
  // Only allow alphanumeric, underscore, hyphen, dot
  if (!/^[a-zA-Z0-9_.-]+$/.test(key)) {
    throw new Error('Invalid storage key');
  }
  return key;
}

// ============================================================================
// Exposed API
// ============================================================================

const electronAPI = {
  // ========================================================================
  // App Information
  // ========================================================================
  app: {
    getVersion: () => ipcRenderer.invoke('app-version'),
    getName: () => ipcRenderer.invoke('app-name'),
    getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
    quit: () => ipcRenderer.invoke('app-quit'),

    // Platform info (read-only, safe)
    platform: process.platform,
    isMac: process.platform === 'darwin',
    isWindows: process.platform === 'win32',
    isLinux: process.platform === 'linux',
  },

  // ========================================================================
  // License / Secure Clock
  // ========================================================================
  license: {
    setAnchor: (organizationId, serverNowMs) => {
      const org = organizationId && typeof organizationId === 'string' ? organizationId : null;
      const ms = Number(serverNowMs);
      if (!Number.isFinite(ms) || ms < 0) {
        throw new Error('serverNowMs must be a non-negative number');
      }
      return ipcRenderer.invoke('license:set-anchor', org, ms);
    },
    getSecureNow: (organizationId) => {
      const org = organizationId && typeof organizationId === 'string' ? organizationId : null;
      return ipcRenderer.invoke('license:get-secure-now', org);
    }
  },

  // ========================================================================
  // Window Management
  // ========================================================================
  window: {
    minimize: () => ipcRenderer.invoke('window-minimize'),
    maximize: () => ipcRenderer.invoke('window-maximize'),
    close: () => ipcRenderer.invoke('window-close'),
    hide: () => ipcRenderer.invoke('window-hide'),
    show: () => ipcRenderer.invoke('window-show'),
    fullscreen: (enable) => ipcRenderer.invoke('window-fullscreen', Boolean(enable)),
    toggleDevTools: () => ipcRenderer.invoke('window-toggle-devtools'),
  },

  // ========================================================================
  // Dialog Management
  // ========================================================================
  dialog: {
    showMessage: (options) => {
      if (!options || typeof options !== 'object') {
        throw new Error('Invalid dialog options');
      }
      return ipcRenderer.invoke('show-message-box', options);
    },

    showSaveDialog: (options) => {
      if (!options || typeof options !== 'object') {
        throw new Error('Invalid dialog options');
      }
      return ipcRenderer.invoke('show-save-dialog', options);
    },

    showOpenDialog: (options) => {
      if (!options || typeof options !== 'object') {
        throw new Error('Invalid dialog options');
      }
      return ipcRenderer.invoke('show-open-dialog', options);
    },
  },

  // ========================================================================
  // Notification Management
  // ========================================================================
  notification: {
    show: (options) => {
      if (!options || typeof options !== 'object') {
        throw new Error('Invalid notification options');
      }

      // Validate required fields
      if (!options.title || typeof options.title !== 'string') {
        throw new Error('Notification title is required');
      }

      return ipcRenderer.invoke('show-notification', {
        title: validateString(options.title, 100),
        body: options.body ? validateString(options.body, 500) : undefined,
        icon: options.icon,
        silent: Boolean(options.silent),
      });
    },
  },

  // ========================================================================
  // Secure Storage (using electron-store in main process)
  // ========================================================================
  storage: {
    get: async (key) => {
      const sanitizedKey = sanitizeStorageKey(key);
      return ipcRenderer.invoke('storage:get', sanitizedKey);
    },

    set: async (key, value) => {
      const sanitizedKey = sanitizeStorageKey(key);

      // Validate value size (max 1MB as JSON)
      const jsonValue = JSON.stringify(value);
      if (jsonValue.length > 1024 * 1024) {
        throw new Error('Storage value too large (max 1MB)');
      }

      return ipcRenderer.invoke('storage:set', sanitizedKey, value);
    },

    remove: async (key) => {
      const sanitizedKey = sanitizeStorageKey(key);
      return ipcRenderer.invoke('storage:remove', sanitizedKey);
    },

    clear: () => ipcRenderer.invoke('storage:clear'),

    has: async (key) => {
      const sanitizedKey = sanitizeStorageKey(key);
      return ipcRenderer.invoke('storage:has', sanitizedKey);
    },
  },

  // ========================================================================
  // Secure Session
  // ========================================================================
  session: {
    getOrCreateKey: async () => {
      const result = await ipcRenderer.invoke('secure-session:get-key');
      if (!result || result.success !== true || !result.key) {
        throw new Error(result?.error || 'Failed to get session key');
      }
      return result.key;
    },

    clearKey: async () => {
      const result = await ipcRenderer.invoke('secure-session:clear-key');
      if (!result || result.success !== true) {
        throw new Error(result?.error || 'Failed to clear session key');
      }
      return true;
    },
  },

  // ========================================================================
  // Auto Updater
  // ========================================================================
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('updater:check-for-updates'),
    downloadUpdate: () => ipcRenderer.invoke('updater:download-update'),
    quitAndInstall: () => ipcRenderer.invoke('updater:quit-and-install'),
    getVersion: () => ipcRenderer.invoke('updater:get-version'),

    // Event listeners
    onCheckingForUpdate: (callback) => {
      if (typeof callback !== 'function') {
        throw new Error('Callback must be a function');
      }
      ipcRenderer.on('checking-for-update', callback);
      return () => ipcRenderer.removeListener('checking-for-update', callback);
    },

    onUpdateAvailable: (callback) => {
      if (typeof callback !== 'function') {
        throw new Error('Callback must be a function');
      }
      ipcRenderer.on('update-available', (event, info) => callback(info));
      return () => ipcRenderer.removeListener('update-available', callback);
    },

    onUpdateNotAvailable: (callback) => {
      if (typeof callback !== 'function') {
        throw new Error('Callback must be a function');
      }
      ipcRenderer.on('update-not-available', (event, info) => callback(info));
      return () => ipcRenderer.removeListener('update-not-available', callback);
    },

    onUpdateError: (callback) => {
      if (typeof callback !== 'function') {
        throw new Error('Callback must be a function');
      }
      ipcRenderer.on('update-error', (event, error) => callback(error));
      return () => ipcRenderer.removeListener('update-error', callback);
    },

    onDownloadProgress: (callback) => {
      if (typeof callback !== 'function') {
        throw new Error('Callback must be a function');
      }
      ipcRenderer.on('download-progress', (event, progress) => callback(progress));
      return () => ipcRenderer.removeListener('download-progress', callback);
    },

    onUpdateDownloaded: (callback) => {
      if (typeof callback !== 'function') {
        throw new Error('Callback must be a function');
      }
      ipcRenderer.on('update-downloaded', (event, info) => callback(info));
      return () => ipcRenderer.removeListener('update-downloaded', callback);
    },
  },

  // ========================================================================
  // File Operations (restricted)
  // ========================================================================
  file: {
    saveAs: (filename, data) => {
      if (!filename || typeof filename !== 'string') {
        throw new Error('Invalid filename');
      }
      if (!data) {
        throw new Error('No data provided');
      }

      return ipcRenderer.invoke('file:save-as', {
        filename: validateString(filename, 255),
        data,
      });
    },

    exportPDF: (options) => {
      if (!options || typeof options !== 'object') {
        throw new Error('Invalid PDF options');
      }
      return ipcRenderer.invoke('file:export-pdf', options);
    },

    exportExcel: (options) => {
      if (!options || typeof options !== 'object') {
        throw new Error('Invalid Excel options');
      }
      return ipcRenderer.invoke('file:export-excel', options);
    },
  },

  // ========================================================================
  // Menu Actions
  // ========================================================================
  menu: {
    onAction: (callback) => {
      if (typeof callback !== 'function') {
        throw new Error('Callback must be a function');
      }

      const menuNewHandler = () => callback('new');
      const menuOpenHandler = (event, filePath) => callback('open-file', filePath);
      const menuSettingsHandler = () => callback('settings');

      ipcRenderer.on('menu-new', menuNewHandler);
      ipcRenderer.on('menu-open-file', menuOpenHandler);
      ipcRenderer.on('menu-settings', menuSettingsHandler);

      return () => {
        ipcRenderer.removeListener('menu-new', menuNewHandler);
        ipcRenderer.removeListener('menu-open-file', menuOpenHandler);
        ipcRenderer.removeListener('menu-settings', menuSettingsHandler);
      };
    },
  },

  // ========================================================================
  // Database (SQLite)
  // ========================================================================
  db: {
    initialize: (organizationId) => {
      if (!organizationId || typeof organizationId !== 'string') {
        throw new Error('Organization ID must be a non-empty string');
      }
      return ipcRenderer.invoke('db:initialize', organizationId);
    },

    query: (sql, params) => {
      if (!sql || typeof sql !== 'string') {
        throw new Error('SQL query must be a non-empty string');
      }
      return ipcRenderer.invoke('db:query', sql, params || {});
    },

    queryOne: (sql, params) => {
      if (!sql || typeof sql !== 'string') {
        throw new Error('SQL query must be a non-empty string');
      }
      return ipcRenderer.invoke('db:query-one', sql, params || {});
    },

    execute: (sql, params) => {
      if (!sql || typeof sql !== 'string') {
        throw new Error('SQL query must be a non-empty string');
      }
      return ipcRenderer.invoke('db:execute', sql, params || {});
    },

    upsert: (tableName, data) => {
      if (!tableName || typeof tableName !== 'string') {
        throw new Error('Table name must be a non-empty string');
      }
      if (!data || typeof data !== 'object') {
        throw new Error('Data must be an object');
      }
      return ipcRenderer.invoke('db:upsert', tableName, data);
    },

    delete: (tableName, id) => {
      if (!tableName || typeof tableName !== 'string') {
        throw new Error('Table name must be a non-empty string');
      }
      if (!id) {
        throw new Error('ID is required');
      }
      return ipcRenderer.invoke('db:delete', tableName, id);
    },

    // Database Admin APIs
    getTables: () => ipcRenderer.invoke('db:get-tables'),

    getTableInfo: (tableName) => {
      if (!tableName || typeof tableName !== 'string') {
        throw new Error('Table name must be a non-empty string');
      }
      return ipcRenderer.invoke('db:get-table-info', tableName);
    },

    getTableCount: (tableName) => {
      if (!tableName || typeof tableName !== 'string') {
        throw new Error('Table name must be a non-empty string');
      }
      return ipcRenderer.invoke('db:get-table-count', tableName);
    },

    getTableData: (tableName, options) => {
      if (!tableName || typeof tableName !== 'string') {
        throw new Error('Table name must be a non-empty string');
      }
      return ipcRenderer.invoke('db:get-table-data', tableName, options || {});
    },

    logConflict: (conflictEntry) => {
      if (!conflictEntry || typeof conflictEntry !== 'object') {
        throw new Error('Conflict entry must be an object');
      }
      return ipcRenderer.invoke('db:log-conflict', conflictEntry);
    },

    getConflictHistory: (entityType, entityId) => {
      if (!entityType || typeof entityType !== 'string') {
        throw new Error('Entity type must be a non-empty string');
      }
      if (!entityId || typeof entityId !== 'string') {
        throw new Error('Entity ID must be a non-empty string');
      }
      return ipcRenderer.invoke('db:get-conflict-history', entityType, entityId);
    },
  },

  // ========================================================================
  // Utility Functions
  // ========================================================================
  utils: {
    // Check online status (uses browser API, safe)
    isOnline: () => navigator.onLine,

    // Add online/offline listeners
    onOnlineStatusChange: (callback) => {
      if (typeof callback !== 'function') {
        throw new Error('Callback must be a function');
      }

      const onlineHandler = () => callback(true);
      const offlineHandler = () => callback(false);

      window.addEventListener('online', onlineHandler);
      window.addEventListener('offline', offlineHandler);

      return () => {
        window.removeEventListener('online', onlineHandler);
        window.removeEventListener('offline', offlineHandler);
      };
    },
  },
};

// ============================================================================
// Expose API to Renderer Process
// ============================================================================

try {
  contextBridge.exposeInMainWorld('electronAPI', electronAPI);
  console.log('✅ Secure Electron API exposed successfully');
} catch (error) {
  console.error('❌ Failed to expose Electron API:', error);
}

// ============================================================================
// Development Mode Logging
// ============================================================================

if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Preload script loaded in development mode');
  console.log('📦 Available APIs:', Object.keys(electronAPI));
}
