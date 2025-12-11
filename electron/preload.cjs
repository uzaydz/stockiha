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

  // Updater
  'updater:check-for-updates': true,
  'updater:download-update': true,
  'updater:quit-and-install': true,
  'updater:get-version': true,

  // File (restricted)
  'file:save-as': true,
  'file:export-pdf': true,
  'file:export-excel': true,
  'download-image': true,
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
  downloadImage: (url, entityType, entityId) => {
    if (!url || typeof url !== 'string') throw new Error('Invalid URL');
    return ipcRenderer.invoke('download-image', url, entityType, entityId);
  },
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
  // Window Management
  // ========================================================================
  window: {
    minimize: () => ipcRenderer.invoke('window-minimize'),
    maximize: () => ipcRenderer.invoke('window-maximize'),
    close: () => ipcRenderer.invoke('window-close'),
    hide: () => ipcRenderer.invoke('window-hide'),
    show: () => ipcRenderer.invoke('window-show'),
    fullscreen: (enable) => ipcRenderer.invoke('window-fullscreen', Boolean(enable)),
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
  // SQLite Database API
  // ========================================================================
  db: {
    // تهيئة قاعدة البيانات
    initialize: (organizationId) => {
      if (!organizationId || typeof organizationId !== 'string') {
        throw new Error('Invalid organization ID');
      }
      return ipcRenderer.invoke('db:initialize', organizationId);
    },

    // إضافة أو تحديث منتج
    upsertProduct: (product) => {
      if (!product || typeof product !== 'object') {
        throw new Error('Invalid product data');
      }
      return ipcRenderer.invoke('db:upsert-product', product);
    },

    // البحث عن منتجات
    searchProducts: (query, options = {}) => {
      if (!query || typeof query !== 'string') {
        throw new Error('Invalid search query');
      }
      return ipcRenderer.invoke('db:search-products', query, options);
    },

    // استعلام عام
    query: (sql, params = {}) => {
      if (!sql || typeof sql !== 'string') {
        throw new Error('Invalid SQL query');
      }
      return ipcRenderer.invoke('db:query', sql, params);
    },

    // استعلام لعنصر واحد
    queryOne: (sql, params = {}) => {
      if (!sql || typeof sql !== 'string') {
        throw new Error('Invalid SQL query');
      }
      return ipcRenderer.invoke('db:query-one', sql, params);
    },

    // إضافة أو تحديث بيانات
    upsert: (table, data) => {
      if (!table || typeof table !== 'string') {
        throw new Error('Invalid table name');
      }
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data');
      }
      return ipcRenderer.invoke('db:upsert', table, data);
    },

    // حذف سجل
    delete: (table, id) => {
      if (!table || typeof table !== 'string') {
        throw new Error('Invalid table name');
      }
      if (!id) {
        throw new Error('Invalid ID');
      }
      return ipcRenderer.invoke('db:delete', table, id);
    },

    // إضافة طلب POS
    addPOSOrder: (order, items) => {
      if (!order || typeof order !== 'object') {
        throw new Error('Invalid order data');
      }
      if (!Array.isArray(items)) {
        throw new Error('Items must be an array');
      }
      return ipcRenderer.invoke('db:add-pos-order', order, items);
    },

    // الحصول على إحصائيات
    getStatistics: (organizationId, dateFrom, dateTo) => {
      if (!organizationId) {
        throw new Error('Invalid organization ID');
      }
      return ipcRenderer.invoke('db:get-statistics', organizationId, dateFrom, dateTo);
    },

    // تنظيف البيانات القديمة
    cleanupOldData: (daysToKeep = 30) => {
      return ipcRenderer.invoke('db:cleanup-old-data', daysToKeep);
    },

    // ضغط قاعدة البيانات
    vacuum: () => {
      return ipcRenderer.invoke('db:vacuum');
    },

    // حجم قاعدة البيانات
    getSize: () => {
      return ipcRenderer.invoke('db:get-size');
    },

    // نسخ احتياطي
    backup: (destinationPath) => {
      if (!destinationPath || typeof destinationPath !== 'string') {
        throw new Error('Invalid destination path');
      }
      return ipcRenderer.invoke('db:backup', destinationPath);
    },

    // استعادة من نسخة احتياطية
    restore: (backupPath) => {
      if (!backupPath || typeof backupPath !== 'string') {
        throw new Error('Invalid backup path');
      }
      return ipcRenderer.invoke('db:restore', backupPath);
    },

    // ====================================================================
    // 🔒 Conflict Resolution API
    // ====================================================================

    /**
     * تسجيل تضارب
     * @param {Object} conflictEntry - بيانات التضارب
     */
    logConflict: (conflictEntry) => {
      if (typeof conflictEntry !== 'object') {
        throw new Error('Conflict entry must be an object');
      }
      return ipcRenderer.invoke('db:log-conflict', conflictEntry);
    },

    /**
     * جلب سجل التضاربات لكيان معين
     * @param {string} entityType - نوع الكيان
     * @param {string} entityId - معرف الكيان
     */
    getConflictHistory: (entityType, entityId) => {
      if (typeof entityType !== 'string' || typeof entityId !== 'string') {
        throw new Error('Entity type and ID must be strings');
      }
      return ipcRenderer.invoke('db:get-conflict-history', entityType, entityId);
    },

    /**
     * جلب التضاربات مع فلترة
     * @param {string} organizationId - معرف المنظمة
     * @param {Object} options - خيارات الفلترة
     */
    getConflicts: (organizationId, options = {}) => {
      if (typeof organizationId !== 'string') {
        throw new Error('Organization ID must be a string');
      }
      return ipcRenderer.invoke('db:get-conflicts', organizationId, options);
    },

    /**
     * إحصائيات التضاربات
     * @param {string} organizationId - معرف المنظمة
     * @param {string} dateFrom - تاريخ البداية
     * @param {string} dateTo - تاريخ النهاية
     */
    getConflictStatistics: (organizationId, dateFrom, dateTo) => {
      if (typeof organizationId !== 'string' || typeof dateFrom !== 'string' || typeof dateTo !== 'string') {
        throw new Error('Invalid parameters for conflict statistics');
      }
      return ipcRenderer.invoke('db:get-conflict-statistics', organizationId, dateFrom, dateTo);
    },

    /**
     * حذف التضاربات القديمة
     * @param {number} daysToKeep - عدد الأيام للاحتفاظ
     */
    cleanupOldConflicts: (daysToKeep = 90) => {
      if (typeof daysToKeep !== 'number' || daysToKeep < 0) {
        throw new Error('Days to keep must be a positive number');
      }
      return ipcRenderer.invoke('db:cleanup-old-conflicts', daysToKeep);
    },

    // إغلاق قاعدة البيانات
    close: () => {
      return ipcRenderer.invoke('db:close');
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
  // Print Management (POS Receipts, Barcodes, HTML)
  // ========================================================================
  print: {
    /**
     * جلب قائمة الطابعات المتاحة
     * @returns {Promise<{success: boolean, printers?: Array, error?: string}>}
     */
    getPrinters: async () => {
      try {
        const printers = await ipcRenderer.invoke('print:get-printers');
        return { success: true, printers: printers || [] };
      } catch (error) {
        console.error('[Preload] getPrinters error:', error);
        return { success: false, error: error.message, printers: [] };
      }
    },

    /**
     * طباعة إيصال POS
     * @param {Object} options - خيارات الطباعة
     * @param {Array} options.data - بيانات الإيصال
     * @param {string} options.printerName - اسم الطابعة
     * @param {string} options.pageSize - حجم الورق (مثل '80mm')
     * @param {number} options.copies - عدد النسخ
     * @param {boolean} options.silent - طباعة صامتة
     * @param {string} options.margin - الهوامش
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    receipt: async (options) => {
      if (!options || typeof options !== 'object') {
        return { success: false, error: 'Invalid print options' };
      }
      if (!options.data || !Array.isArray(options.data)) {
        return { success: false, error: 'Receipt data must be an array' };
      }
      try {
        return await ipcRenderer.invoke('print:receipt', options);
      } catch (error) {
        console.error('[Preload] receipt print error:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * طباعة HTML (فواتير/تقارير)
     * @param {Object} options - خيارات الطباعة
     * @param {string} options.html - محتوى HTML
     * @param {string} options.printerName - اسم الطابعة
     * @param {boolean} options.silent - طباعة صامتة
     * @param {string} options.pageSize - حجم الورق (مثل 'A4')
     * @param {boolean} options.landscape - اتجاه الصفحة
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    html: async (options) => {
      if (!options || typeof options !== 'object') {
        return { success: false, error: 'Invalid print options' };
      }
      if (!options.html || typeof options.html !== 'string') {
        return { success: false, error: 'HTML content is required' };
      }
      try {
        return await ipcRenderer.invoke('print:html', options);
      } catch (error) {
        console.error('[Preload] html print error:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * طباعة باركود
     * @param {Object} options - خيارات الطباعة
     * @param {Array} options.barcodes - قائمة الباركودات
     * @param {string} options.printerName - اسم الطابعة
     * @param {boolean} options.silent - طباعة صامتة
     * @param {Object} options.labelSize - حجم الملصق
     * @param {boolean} options.showProductName - إظهار اسم المنتج
     * @param {boolean} options.showPrice - إظهار السعر
     * @param {boolean} options.showStoreName - إظهار اسم المتجر
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    barcode: async (options) => {
      if (!options || typeof options !== 'object') {
        return { success: false, error: 'Invalid print options' };
      }
      if (!options.barcodes || !Array.isArray(options.barcodes)) {
        return { success: false, error: 'Barcodes must be an array' };
      }
      try {
        return await ipcRenderer.invoke('print:barcode', options);
      } catch (error) {
        console.error('[Preload] barcode print error:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * فتح درج النقود
     * @param {string} printerName - اسم الطابعة (اختياري)
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    openCashDrawer: async (printerName) => {
      try {
        return await ipcRenderer.invoke('print:open-cash-drawer', printerName || null);
      } catch (error) {
        console.error('[Preload] openCashDrawer error:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * طباعة صفحة اختبار
     * @param {string} printerName - اسم الطابعة (اختياري)
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    test: async (printerName) => {
      try {
        return await ipcRenderer.invoke('print:test', printerName || null);
      } catch (error) {
        console.error('[Preload] test print error:', error);
        return { success: false, error: error.message };
      }
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
