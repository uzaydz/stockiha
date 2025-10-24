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
  print?: () => void;

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

  // معلومات إضافية
  isElectron: boolean;
  isDevelopment: boolean;
}

// تعريف window.electronAPI
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
