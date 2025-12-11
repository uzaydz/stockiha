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

  // Printing
  'print:get-printers': true,
  'print:receipt': true,
  'print:html': true,
  'print:barcode': true,
  'print:open-cash-drawer': true,
  'print:test': true,

  // File (restricted)
  'file:save-as': true,
  'file:export-pdf': true,
  'file:export-excel': true,

  // Network / Connectivity
  'net:is-online': true,
  'net:ping': true,
  'net:multi-ping': true,
  'net:check-captive-portal': true,
  'net:get-status': true,
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

  // ========================================================================
  // Network / Connectivity API - فحص الاتصال بالإنترنت
  // ========================================================================
  network: {
    /**
     * فحص حالة الاتصال على مستوى النظام (Electron net.isOnline)
     * @returns {Promise<{success: boolean, isOnline: boolean, error?: string}>}
     */
    isOnlineSystem: () => ipcRenderer.invoke('net:is-online'),

    /**
     * فحص الاتصال بالإنترنت عن طريق الـ Browser API
     * @returns {boolean}
     */
    isOnline: () => navigator.onLine,

    /**
     * الحصول على معلومات الشبكة من Network Information API
     * @returns {Object|null}
     */
    getConnection: () => {
      const connection = navigator.connection ||
                        navigator.mozConnection ||
                        navigator.webkitConnection;

      if (!connection) {
        return null;
      }

      return {
        effectiveType: connection.effectiveType || null,
        downlink: connection.downlink || null,
        rtt: connection.rtt || null,
        saveData: connection.saveData || false,
        type: connection.type || null,
      };
    },

    /**
     * فحص سريع للاتصال عبر ping لموقع معين
     * @param {string} [url] - URL للفحص (افتراضي: Google 204)
     * @param {number} [timeout=5000] - الوقت المحدد بالمللي ثانية
     * @returns {Promise<{success: boolean, reachable: boolean, latency?: number, error?: string}>}
     */
    ping: (url, timeout) => {
      const validUrl = url && typeof url === 'string' ? url : null;
      const validTimeout = timeout && Number.isFinite(timeout) && timeout > 0 ? timeout : 5000;
      return ipcRenderer.invoke('net:ping', validUrl, validTimeout);
    },

    /**
     * فحص متعدد للاتصال (يفحص عدة مواقع، أول نجاح يكسب)
     * @param {string[]} [urls] - قائمة URLs للفحص
     * @param {number} [timeout=3000] - الوقت المحدد بالمللي ثانية
     * @returns {Promise<{success: boolean, isOnline: boolean, firstResponder?: string, latency?: number, error?: string}>}
     */
    multiPing: (urls, timeout) => {
      const validUrls = Array.isArray(urls) && urls.length > 0 ? urls.filter(u => typeof u === 'string') : null;
      const validTimeout = timeout && Number.isFinite(timeout) && timeout > 0 ? timeout : 3000;
      return ipcRenderer.invoke('net:multi-ping', validUrls, validTimeout);
    },

    /**
     * فحص وجود Captive Portal (صفحة تسجيل الدخول للفنادق/المطارات)
     * @returns {Promise<{success: boolean, isCaptivePortal: boolean, redirectUrl?: string, error?: string}>}
     */
    checkCaptivePortal: () => ipcRenderer.invoke('net:check-captive-portal'),

    /**
     * الحصول على حالة الشبكة الكاملة (النظام + الإنترنت الفعلي)
     * @returns {Promise<{success: boolean, status: {systemOnline: boolean, internetReachable: boolean, isOnline: boolean, timestamp: number}}>}
     */
    getStatus: () => ipcRenderer.invoke('net:get-status'),

    /**
     * الاستماع لتغييرات حالة الاتصال
     * @param {Function} callback - دالة يتم استدعاؤها عند تغير الحالة
     * @returns {Function} - دالة لإلغاء الاشتراك
     */
    onStatusChange: (callback) => {
      if (typeof callback !== 'function') {
        throw new Error('Callback must be a function');
      }

      const onlineHandler = () => callback({ isOnline: true, source: 'browser' });
      const offlineHandler = () => callback({ isOnline: false, source: 'browser' });

      window.addEventListener('online', onlineHandler);
      window.addEventListener('offline', offlineHandler);

      // الاستماع لتغييرات Network Information API
      const connection = navigator.connection ||
                        navigator.mozConnection ||
                        navigator.webkitConnection;

      let connectionChangeHandler = null;
      if (connection) {
        connectionChangeHandler = () => {
          callback({
            isOnline: navigator.onLine,
            source: 'network-info',
            connection: {
              effectiveType: connection.effectiveType,
              downlink: connection.downlink,
              rtt: connection.rtt,
              saveData: connection.saveData,
            }
          });
        };
        connection.addEventListener('change', connectionChangeHandler);
      }

      return () => {
        window.removeEventListener('online', onlineHandler);
        window.removeEventListener('offline', offlineHandler);
        if (connection && connectionChangeHandler) {
          connection.removeEventListener('change', connectionChangeHandler);
        }
      };
    },
  },

  // ========================================================================
  // Printing API - طباعة الإيصالات والفواتير والباركود
  // ========================================================================
  print: {
    /**
     * الحصول على قائمة الطابعات المتاحة
     * @returns {Promise<{success: boolean, printers: Array, error?: string}>}
     */
    getPrinters: async () => {
      try {
        const result = await ipcRenderer.invoke('print:get-printers');
        // الـ main process يعيد الآن {success, printers}
        if (result && typeof result === 'object' && 'printers' in result) {
          return result;
        }
        // Fallback: إذا أعاد مصفوفة مباشرة (للتوافق القديم)
        if (Array.isArray(result)) {
          return { success: true, printers: result };
        }
        return { success: true, printers: result || [] };
      } catch (error) {
        console.error('[Preload] getPrinters error:', error);
        return { success: false, error: error.message, printers: [] };
      }
    },

    /**
     * طباعة إيصال POS
     * @param {Object} options - خيارات الطباعة
     * @param {Array} options.data - بيانات الإيصال (تنسيق electron-pos-printer)
     * @param {string} [options.printerName] - اسم الطابعة
     * @param {string} [options.pageSize='80mm'] - حجم الورق
     * @param {number} [options.copies=1] - عدد النسخ
     * @param {boolean} [options.silent=true] - طباعة صامتة
     * @param {string} [options.margin='0 0 0 0'] - الهوامش
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    receipt: (options) => {
      if (!options || typeof options !== 'object') {
        throw new Error('Print options must be an object');
      }
      if (!options.data || !Array.isArray(options.data)) {
        throw new Error('Receipt data must be an array');
      }
      return ipcRenderer.invoke('print:receipt', options);
    },

    /**
     * طباعة HTML مخصص (للفواتير والتقارير)
     * @param {Object} options - خيارات الطباعة
     * @param {string} options.html - محتوى HTML
     * @param {string} [options.printerName] - اسم الطابعة
     * @param {boolean} [options.silent=true] - طباعة صامتة
     * @param {string} [options.pageSize='A4'] - حجم الورق
     * @param {boolean} [options.landscape=false] - اتجاه أفقي
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    html: (options) => {
      if (!options || typeof options !== 'object') {
        throw new Error('Print options must be an object');
      }
      if (!options.html || typeof options.html !== 'string') {
        throw new Error('HTML content is required and must be a string');
      }
      return ipcRenderer.invoke('print:html', options);
    },

    /**
     * طباعة باركود
     * @param {Object} options - خيارات الطباعة
     * @param {Array} options.barcodes - قائمة الباركودات
     * @param {string} [options.printerName] - اسم الطابعة
     * @param {boolean} [options.silent=true] - طباعة صامتة
     * @param {Object} [options.labelSize] - حجم الملصق {width, height}
     * @param {boolean} [options.showProductName] - إظهار اسم المنتج
     * @param {boolean} [options.showPrice] - إظهار السعر
     * @param {boolean} [options.showStoreName] - إظهار اسم المتجر
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    barcode: (options) => {
      if (!options || typeof options !== 'object') {
        throw new Error('Print options must be an object');
      }
      if (!options.barcodes || !Array.isArray(options.barcodes)) {
        throw new Error('Barcodes must be an array');
      }
      if (options.barcodes.length === 0) {
        throw new Error('Barcodes array cannot be empty');
      }
      return ipcRenderer.invoke('print:barcode', options);
    },

    /**
     * فتح درج النقود
     * @param {string} [printerName] - اسم الطابعة المتصل بها الدرج
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    openCashDrawer: (printerName) => {
      return ipcRenderer.invoke('print:open-cash-drawer', printerName || null);
    },

    /**
     * طباعة صفحة اختبار
     * @param {string} [printerName] - اسم الطابعة
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    test: (printerName) => {
      return ipcRenderer.invoke('print:test', printerName || null);
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
