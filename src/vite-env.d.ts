/// <reference types="vite/client" />

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
  showNotification: (options: { title: string; body?: string }) => Promise<void>;

  // إدارة الطلبات
  makeRequest: (options: any) => Promise<any>;

  // مستمعات الأحداث
  onMenuAction: (callback: (action: string, data?: any) => void) => void;

  // إزالة المستمعات
  removeAllListeners: (channel: string) => void;

  // معلومات النظام
  platform: string;
  isMac: boolean;
  isWindows: boolean;
  isLinux: boolean;

  // إدارة التطبيق
  quit: () => Promise<void>;

  // إدارة الذاكرة
  getMemoryUsage: () => any;

  // إدارة الشبكة
  isOnline: () => boolean;
  secureSession?: {
    getOrCreateKey: () => Promise<string>;
    clearKey: () => Promise<boolean>;
  };

  // إدارة التخزين المحلي
  getLocalStorage: (key: string) => string | null;
  setLocalStorage: (key: string, value: string) => boolean;
  removeLocalStorage: (key: string) => boolean;

  // إدارة الكوكيز
  getCookie: (name: string) => string | null;
  setCookie: (name: string, value: string, days?: number) => boolean;

  // إدارة الجلسة
  getSessionStorage: (key: string) => string | null;
  setSessionStorage: (key: string, value: string) => boolean;

  // إدارة الفهرس
  getIndexedDB: (dbName: string, storeName: string, key: string) => Promise<any>;
  setIndexedDB: (dbName: string, storeName: string, key: string, value: any) => Promise<boolean>;

  // إدارة الطلبات المحسنة
  fetch: (url: string, options?: any) => Promise<{ success: boolean; data?: any; error?: string }>;

  // إدارة التخزين المؤقت
  cache: {
    set: (key: string, value: any, ttl?: number) => boolean;
    get: (key: string) => any;
    clear: () => boolean;
  };

  // إدارة الإشعارات المحسنة
  notifications: {
    show: (title: string, options?: any) => void;
    requestPermission: () => Promise<string>;
    getPermission: () => string;
  };

  // إدارة الطباعة
  print: () => void;

  // إدارة النسخ
  copyToClipboard: (text: string) => Promise<boolean>;

  // إدارة اللصق
  pasteFromClipboard: () => Promise<{ success: boolean; text?: string; error?: string }>;

  // إدارة الشاشة
  screen: {
    getSize: () => { width: number; height: number; availWidth: number; availHeight: number };
    getColorDepth: () => number;
    getPixelDepth: () => number;
  };

  // إدارة الشبكة
  network: {
    isOnline: () => boolean;
    getConnection: () => any;
  };

  // إدارة الأجهزة
  device: {
    getBattery: () => Promise<any>;
    getVibrate: () => any;
  };

  // إدارة الأمان
  security: {
    generateUUID: () => string;
    hashString: (str: string) => Promise<string | null>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
