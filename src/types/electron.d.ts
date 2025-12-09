// TypeScript definitions for Electron API

interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
}

interface DownloadProgress {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

interface UpdateError {
  message: string;
}

interface UpdaterAPI {
  // دوال التحديث
  checkForUpdates: () => Promise<{ success: boolean; message?: string }>;
  downloadUpdate: () => Promise<{ success: boolean; message?: string }>;
  quitAndInstall: () => Promise<{ success: boolean; message?: string }>;
  getVersion: () => Promise<string>;

  // مستمعات الأحداث
  onCheckingForUpdate: (callback: () => void) => () => void;
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void;
  onUpdateNotAvailable: (callback: (info: { currentVersion: string }) => void) => () => void;
  onDownloadProgress: (callback: (progress: DownloadProgress) => void) => () => void;
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => () => void;
  onUpdateError: (callback: (error: UpdateError) => void) => () => void;
}

interface SecureSessionAPI {
  getOrCreateKey: () => Promise<string>;
  clearKey: () => Promise<boolean>;
}

interface CacheAPI {
  set: (key: string, value: any, ttl?: number) => boolean;
  get: (key: string) => any;
  clear: () => boolean;
}

interface NotificationsAPI {
  show: (title: string, options?: any) => void;
  requestPermission: () => Promise<string>;
  getPermission: () => string;
}

interface ScreenAPI {
  getSize: () => {
    width: number;
    height: number;
    availWidth: number;
    availHeight: number;
  };
  getColorDepth: () => number;
  getPixelDepth: () => number;
}

interface NetworkAPI {
  isOnline: () => boolean;
  getConnection: () => {
    effectiveType: string;
    downlink: number;
    rtt: number;
  } | null;
}

interface DeviceAPI {
  getBattery: () => Promise<any> | null;
  getVibrate: () => ((pattern: number | number[]) => boolean) | null;
}

interface SecurityAPI {
  generateUUID: () => string;
  hashString: (str: string) => Promise<string | null>;
}

interface LicenseAPI {
  setAnchor: (organizationId: string | null, serverNowMs: number) => Promise<{ success: boolean; error?: string }>;
  getSecureNow: (
    organizationId: string | null
  ) => Promise<{ success: boolean; secureNowMs: number; tamperDetected?: boolean; tamperCount?: number; error?: string }>;
}

// =================== Printing API ===================

interface PrinterInfo {
  name: string;
  displayName: string;
  description: string;
  status: number;
  isDefault: boolean;
}

interface PrintResult {
  success: boolean;
  error?: string;
}

interface PrintReceiptOptions {
  data: PrintDataItem[];
  printerName?: string;
  pageSize?: string;
  copies?: number;
  silent?: boolean;
  margin?: string;
}

interface PrintHtmlOptions {
  html: string;
  printerName?: string;
  silent?: boolean;
  pageSize?: string;
  landscape?: boolean;
  margins?: {
    marginType?: 'default' | 'none' | 'custom';
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
}

interface PrintBarcodeOptions {
  barcodes: BarcodeData[];
  printerName?: string;
  pageSize?: string;
  silent?: boolean;
  labelSize?: { width: string; height: string };
  showProductName?: boolean;
  showPrice?: boolean;
  showStoreName?: boolean;
}

interface PrintDataItem {
  type: 'text' | 'barCode' | 'qrCode' | 'image' | 'table';
  value: string;
  style?: Record<string, string>;
  height?: number;
  width?: number;
  displayValue?: boolean;
  position?: 'above' | 'below';
  fontsize?: number;
  font?: string;
  [key: string]: any;
}

interface BarcodeData {
  value: string;
  productName?: string;
  price?: number | string;
  storeName?: string;
  height?: number;
  width?: number;
  showValue?: boolean;
}

interface PrintAPI {
  /** الحصول على قائمة الطابعات المتاحة */
  getPrinters: () => Promise<{ success: boolean; printers: PrinterInfo[]; error?: string }>;

  /** طباعة إيصال POS */
  receipt: (options: PrintReceiptOptions) => Promise<PrintResult>;

  /** طباعة HTML مخصص (للفواتير والتقارير) */
  html: (options: PrintHtmlOptions) => Promise<PrintResult>;

  /** طباعة باركود */
  barcode: (options: PrintBarcodeOptions) => Promise<PrintResult>;

  /** فتح درج النقود */
  openCashDrawer: (printerName?: string | null) => Promise<PrintResult>;

  /** طباعة صفحة اختبار */
  test: (printerName?: string | null) => Promise<PrintResult>;
}

interface ElectronAPI {
  // معلومات التطبيق
  getAppVersion: () => Promise<string>;
  getAppName: () => Promise<string>;
  getSystemInfo: () => Promise<any>;

  // إدارة النوافذ
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  hideWindow: () => Promise<void>;
  showWindow: () => Promise<void>;

  // إدارة الملفات
  readFile: (filePath: string) => Promise<{ success: boolean; data?: string; error?: string }>;
  writeFile: (filePath: string, data: string) => Promise<{ success: boolean; error?: string }>;
  downloadImage: (url: string, entityType: string, entityId: string) => Promise<{ success: boolean; localPath?: string; size?: number; mimeType?: string; error?: string }>;

  // إدارة الحوارات
  showMessageBox: (options: any) => Promise<any>;
  showSaveDialog: (options: any) => Promise<any>;
  showOpenDialog: (options: any) => Promise<any>;

  // إدارة الإشعارات
  showNotification: (options: any) => Promise<void>;

  // إدارة الطلبات
  makeRequest: (options: any) => Promise<any>;

  // مستمعات الأحداث
  onMenuAction: (callback: (action: string, data?: any) => void) => void;
  removeAllListeners: (channel: string) => void;

  // معلومات النظام
  platform: string;
  isMac: boolean;
  isWindows: boolean;
  isLinux: boolean;

  // إدارة التطبيق
  quit?: () => Promise<void>;

  // إدارة الذاكرة
  getMemoryUsage: () => any;

  // إدارة الشبكة
  isOnline: () => boolean;

  // الجلسات الآمنة
  secureSession: SecureSessionAPI;

  // إدارة التخزين المحلي
  getLocalStorage: (key: string) => Promise<string | null> | string | null;
  setLocalStorage: (key: string, value: string) => Promise<boolean> | boolean;
  removeLocalStorage: (key: string) => Promise<boolean> | boolean;
  clearLocalStorage?: () => Promise<boolean>;

  // نظام التحديثات التلقائية
  updater: UpdaterAPI;

  // الساعة الآمنة/الترخيص
  license?: LicenseAPI;

  // إدارة الكوكيز
  getCookie?: (name: string) => string | null;
  setCookie?: (name: string, value: string, days?: number) => boolean;

  // إدارة الجلسة
  getSessionStorage?: (key: string) => string | null;
  setSessionStorage?: (key: string, value: string) => boolean;

  // إدارة الفهرس
  getIndexedDB?: (dbName: string, storeName: string, key: string) => Promise<any>;
  setIndexedDB?: (dbName: string, storeName: string, key: string, value: any) => Promise<boolean>;

  // إدارة الطلبات المحسنة
  fetch?: (url: string, options?: any) => Promise<{ success: boolean; data?: any; error?: string }>;

  // إدارة التخزين المؤقت
  cache?: CacheAPI;

  // إدارة الإشعارات المحسنة
  notifications?: NotificationsAPI;

  // إدارة الطباعة
  print?: PrintAPI;

  // إدارة النسخ
  copyToClipboard?: (text: string) => Promise<boolean>;
  pasteFromClipboard?: () => Promise<{ success: boolean; text?: string; error?: string }>;

  // إدارة الشاشة
  screen?: ScreenAPI;

  // إدارة الشبكة
  network?: NetworkAPI;

  // إدارة الأجهزة
  device?: DeviceAPI;

  // إدارة الأمان
  security?: SecurityAPI;

  // قاعدة بيانات SQLite
  db?: {
    initialize: (organizationId: string) => Promise<{ success: boolean; path?: string; error?: string; size?: number }>;
    upsertProduct: (product: any) => Promise<{ success: boolean; changes?: number; error?: string }>;
    searchProducts: (query: string, options?: any) => Promise<{ success: boolean; data: any[]; error?: string }>;
    query: (sql: string, params?: any) => Promise<{ success: boolean; data: any[]; error?: string }>;
    queryOne: (sql: string, params?: any) => Promise<{ success: boolean; data: any; error?: string }>;
    execute: (sql: string, params?: any) => Promise<{ success: boolean; changes?: number; lastInsertRowid?: number; error?: string }>;
    upsert: (table: string, data: any) => Promise<{ success: boolean; changes?: number; error?: string }>;
    delete: (table: string, id: string) => Promise<{ success: boolean; changes?: number; error?: string }>;
    addPOSOrder: (order: any, items: any[]) => Promise<{ success: boolean; error?: string }>;
    getStatistics: (organizationId: string, dateFrom: string, dateTo: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    cleanupOldData: (daysToKeep?: number) => Promise<{ success: boolean; ordersDeleted?: number; invoicesDeleted?: number; error?: string }>;
    vacuum: () => Promise<{ success: boolean; before?: number; after?: number; saved?: number; error?: string }>;
    getSize: () => Promise<{ success: boolean; size?: number; error?: string }>;
    backup: (destinationPath: string) => Promise<{ success: boolean; path?: string; error?: string }>;
    restore: (backupPath: string) => Promise<{ success: boolean; error?: string }>;
    close: () => Promise<{ success: boolean; error?: string }>;
    logConflict: (conflictEntry: {
      id: string;
      entityType: 'product' | 'customer' | 'invoice' | 'order';
      entityId: string;
      localVersion: any;
      serverVersion: any;
      conflictFields: string[];
      severity: number;
      resolution: 'server_wins' | 'client_wins' | 'merge' | 'manual';
      resolvedVersion: any;
      resolvedBy?: string;
      detectedAt: string;
      resolvedAt: string;
      userId: string;
      organizationId: string;
      localTimestamp: string;
      serverTimestamp: string;
      notes?: string;
    }) => Promise<{ success: boolean; changes?: number; error?: string }>;
    getConflictHistory: (entityType: string, entityId: string) => Promise<{ success: boolean; data: any[]; error?: string }>;
    getConflicts: (
      organizationId: string,
      options?: {
        entityType?: string;
        resolution?: string;
        minSeverity?: number;
        dateFrom?: string;
        dateTo?: string;
        limit?: number;
        offset?: number;
      }
    ) => Promise<{ success: boolean; data: any[]; count: number; error?: string }>;
    getConflictStatistics: (
      organizationId: string,
      dateFrom: string,
      dateTo: string
    ) => Promise<{ success: boolean; data?: any; error?: string }>;
    cleanupOldConflicts: (daysToKeep?: number) => Promise<{ success: boolean; deleted?: number; error?: string }>;
  };

  // معلومات إضافية
  isElectron: boolean;
  isDevelopment: boolean;
}

// تعريف window.electronAPI
declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export { };
