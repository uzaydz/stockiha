const { contextBridge, ipcRenderer } = require('electron');

// تعطيل التحقق من السياق في الإنتاج لتسريع الأداء
if (process.env.NODE_ENV === 'production') {
  // تسريع الوصول للـ API
  contextBridge.exposeInMainWorld('electronAPI', {
  // معلومات التطبيق
  getAppVersion: () => ipcRenderer.invoke('app-version'),
  getAppName: () => ipcRenderer.invoke('app-name'),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  
  // إدارة النوافذ
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  hideWindow: () => ipcRenderer.invoke('window-hide'),
  showWindow: () => ipcRenderer.invoke('window-show'),
  
  // إدارة الملفات
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),
  
  // إدارة الحوارات
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  
  // إدارة الإشعارات
  showNotification: (options) => ipcRenderer.invoke('show-notification', options),
  
  // إدارة الطلبات
  makeRequest: (options) => ipcRenderer.invoke('make-request', options),
  
  // مستمعات الأحداث
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-new', callback);
    ipcRenderer.on('menu-open-file', (event, filePath) => callback('open-file', filePath));
    ipcRenderer.on('menu-settings', () => callback('settings'));
  },
  
  // إزالة المستمعات
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  
  // معلومات النظام
  platform: process.platform,
  isMac: process.platform === 'darwin',
  isWindows: process.platform === 'win32',
  isLinux: process.platform === 'linux',
  
  // إدارة التطبيق
  quit: () => ipcRenderer.invoke('app-quit'),
  
  // إدارة الذاكرة
  getMemoryUsage: () => process.memoryUsage(),
  
  // إدارة الشبكة
  isOnline: () => navigator.onLine,
  
  secureSession: {
    getOrCreateKey: async () => {
      const result = await ipcRenderer.invoke('secure-session:get-key');
      if (!result || result.success !== true || !result.key) {
        throw new Error(result?.error || 'secure_session_key_failed');
      }
      return result.key;
    },
    clearKey: async () => {
      const result = await ipcRenderer.invoke('secure-session:clear-key');
      if (!result || result.success !== true) {
        throw new Error(result?.error || 'secure_session_clear_failed');
      }
      return true;
    }
  },
  
  // إدارة التخزين المحلي (عبر IPC - آمن)
  getLocalStorage: (key) => ipcRenderer.invoke('storage:get', key),
  setLocalStorage: (key, value) => ipcRenderer.invoke('storage:set', key, value),
  removeLocalStorage: (key) => ipcRenderer.invoke('storage:remove', key),
  clearLocalStorage: () => ipcRenderer.invoke('storage:clear'),

  // ======= نظام التحديثات التلقائية =======
  updater: {
    // التحقق من التحديثات
    checkForUpdates: () => ipcRenderer.invoke('updater:check-for-updates'),
    // تنزيل التحديث
    downloadUpdate: () => ipcRenderer.invoke('updater:download-update'),
    // تثبيت التحديث وإعادة التشغيل
    quitAndInstall: () => ipcRenderer.invoke('updater:quit-and-install'),
    // الحصول على الإصدار الحالي
    getVersion: () => ipcRenderer.invoke('updater:get-version'),
    
    // مستمعات الأحداث
    onCheckingForUpdate: (callback) => {
      ipcRenderer.on('checking-for-update', callback);
      return () => ipcRenderer.removeListener('checking-for-update', callback);
    },
    onUpdateAvailable: (callback) => {
      ipcRenderer.on('update-available', (event, info) => callback(info));
      return () => ipcRenderer.removeListener('update-available', callback);
    },
    onUpdateNotAvailable: (callback) => {
      ipcRenderer.on('update-not-available', (event, info) => callback(info));
      return () => ipcRenderer.removeListener('update-not-available', callback);
    },
    onDownloadProgress: (callback) => {
      ipcRenderer.on('download-progress', (event, progress) => callback(progress));
      return () => ipcRenderer.removeListener('download-progress', callback);
    },
    onUpdateDownloaded: (callback) => {
      ipcRenderer.on('update-downloaded', (event, info) => callback(info));
      return () => ipcRenderer.removeListener('update-downloaded', callback);
    },
    onUpdateError: (callback) => {
      ipcRenderer.on('update-error', (event, error) => callback(error));
      return () => ipcRenderer.removeListener('update-error', callback);
    },
  },
  
  // إدارة الكوكيز (سيتم التعامل معها في renderer process)
  // ملاحظة: الكوكيز يجب أن تُدار في renderer process وليس في preload
  
  // إدارة الجلسة (سيتم التعامل معها في renderer process)
  // ملاحظة: sessionStorage يجب أن يُدار في renderer process وليس في preload
  
  // معلومات إضافية
  isElectron: true,
  isDevelopment: process.env.NODE_ENV === 'development',
  
  // إدارة التخزين المحلي (عبر IPC - آمن)
  getSessionStorage: (key) => {
    // sessionStorage غير متاح في preload، يجب استخدامه في renderer
    console.warn('sessionStorage should be used in renderer process');
    return null;
  },
  
  setSessionStorage: (key, value) => {
    // sessionStorage غير متاح في preload، يجب استخدامه في renderer
    console.warn('sessionStorage should be used in renderer process');
    return false;
  },
  
  // إدارة الفهرس
  getIndexedDB: (dbName, storeName, key) => {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(dbName);
        request.onsuccess = (event) => {
          const db = event.target.result;
          const transaction = db.transaction([storeName], 'readonly');
          const store = transaction.objectStore(storeName);
          const getRequest = store.get(key);
          
          getRequest.onsuccess = () => {
            resolve(getRequest.result);
          };
          
          getRequest.onerror = () => {
            reject(getRequest.error);
          };
        };
        
        request.onerror = () => {
          reject(request.error);
        };
      } catch (error) {
        reject(error);
      }
    });
  },
  
  setIndexedDB: (dbName, storeName, key, value) => {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(dbName);
        request.onsuccess = (event) => {
          const db = event.target.result;
          const transaction = db.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          const putRequest = store.put(value, key);
          
          putRequest.onsuccess = () => {
            resolve(true);
          };
          
          putRequest.onerror = () => {
            reject(putRequest.error);
          };
        };
        
        request.onerror = () => {
          reject(request.error);
        };
      } catch (error) {
        reject(error);
      }
    });
  },
  
  // إدارة الطلبات المحسنة
  fetch: async (url, options = {}) => {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Stockiha-Desktop/2.0.0',
          ...options.headers
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // إدارة التخزين المؤقت
  cache: {
    set: (key, value, ttl = 3600000) => { // TTL افتراضي: ساعة واحدة
      try {
        const item = {
          value,
          timestamp: Date.now(),
          ttl
        };
        localStorage.setItem(`cache_${key}`, JSON.stringify(item));
        return true;
      } catch (error) {
        console.error('خطأ في كتابة التخزين المؤقت:', error);
        return false;
      }
    },
    
    get: (key) => {
      try {
        const item = localStorage.getItem(`cache_${key}`);
        if (!item) return null;
        
        const parsed = JSON.parse(item);
        const now = Date.now();
        
        if (now - parsed.timestamp > parsed.ttl) {
          localStorage.removeItem(`cache_${key}`);
          return null;
        }
        
        return parsed.value;
      } catch (error) {
        console.error('خطأ في قراءة التخزين المؤقت:', error);
        return null;
      }
    },
    
    clear: () => {
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('cache_')) {
            localStorage.removeItem(key);
          }
        });
        return true;
      } catch (error) {
        console.error('خطأ في مسح التخزين المؤقت:', error);
        return false;
      }
    }
  },
  
  // إدارة الإشعارات المحسنة
  notifications: {
    show: (title, options = {}) => {
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(title, {
            body: options.body || '',
            icon: options.icon || '/assets/icon.png',
            badge: options.badge || '/assets/badge.png',
            tag: options.tag || 'stockiha-notification',
            requireInteraction: options.requireInteraction || false,
            silent: options.silent || false
          });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification(title, options);
            }
          });
        }
      }
    },
    
    requestPermission: () => {
      if ('Notification' in window) {
        return Notification.requestPermission();
      }
      return Promise.resolve('denied');
    },
    
    getPermission: () => {
      if ('Notification' in window) {
        return Notification.permission;
      }
      return 'denied';
    }
  },
  
  // إدارة الطباعة
  print: () => {
    window.print();
  },
  
  // إدارة النسخ
  copyToClipboard: async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('خطأ في النسخ إلى الحافظة:', error);
      return false;
    }
  },
  
  // إدارة اللصق
  pasteFromClipboard: async () => {
    try {
      const text = await navigator.clipboard.readText();
      return { success: true, text };
    } catch (error) {
      console.error('خطأ في اللصق من الحافظة:', error);
      return { success: false, error: error.message };
    }
  },
  
  // إدارة الشاشة
  screen: {
    getSize: () => {
      return {
        width: window.screen.width,
        height: window.screen.height,
        availWidth: window.screen.availWidth,
        availHeight: window.screen.availHeight
      };
    },
    
    getColorDepth: () => window.screen.colorDepth,
    getPixelDepth: () => window.screen.pixelDepth
  },
  
  // إدارة الشبكة
  network: {
    isOnline: () => navigator.onLine,
    getConnection: () => {
      if ('connection' in navigator) {
        return {
          effectiveType: navigator.connection.effectiveType,
          downlink: navigator.connection.downlink,
          rtt: navigator.connection.rtt
        };
      }
      return null;
    }
  },
  
  // إدارة الأجهزة
  device: {
    getBattery: () => {
      if ('getBattery' in navigator) {
        return navigator.getBattery();
      }
      return null;
    },
    
    getVibrate: () => {
      if ('vibrate' in navigator) {
        return navigator.vibrate;
      }
      return null;
    }
  },
  
  // إدارة الأمان
  security: {
    generateUUID: () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    },
    
    hashString: async (str) => {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (error) {
        console.error('خطأ في تشفير النص:', error);
        return null;
      }
    }
  }
});

// إدارة الأحداث العامة
window.addEventListener('DOMContentLoaded', () => {
  // إعداد التطبيق عند تحميل الصفحة
  console.log('سطوكيها - تطبيق سطح المكتب جاهز');
  
  // إعداد الإشعارات
  if ('Notification' in window) {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
  
// لا نقوم بتسجيل Service Worker في تطبيق Electron
});

// إدارة الأخطاء العامة
window.addEventListener('error', (event) => {
  console.error('خطأ في التطبيق:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('رفض غير معالج:', event.reason);
});

// إدارة التحديثات
window.addEventListener('beforeunload', (event) => {
  // حفظ البيانات قبل إغلاق التطبيق
  if (window.electronAPI) {
    // يمكن إضافة منطق حفظ البيانات هنا
  }
});
} else {
  // في التطوير، الواجهة الكاملة
  contextBridge.exposeInMainWorld('electronAPI', {
  // معلومات التطبيق
  getAppVersion: () => ipcRenderer.invoke('app-version'),
  getAppName: () => ipcRenderer.invoke('app-name'),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

  // إدارة النوافذ
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  hideWindow: () => ipcRenderer.invoke('window-hide'),
  showWindow: () => ipcRenderer.invoke('window-show'),

  // إدارة الملفات
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),

  // إدارة الحوارات
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),

  // إدارة الإشعارات
  showNotification: (options) => ipcRenderer.invoke('show-notification', options),

  // إدارة الطلبات
  makeRequest: (options) => ipcRenderer.invoke('make-request', options),

  // مستمعات الأحداث
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-new', callback);
    ipcRenderer.on('menu-open-file', (event, filePath) => callback('open-file', filePath));
    ipcRenderer.on('menu-settings', () => callback('settings'));
  },

  // إزالة المستمعات
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),

  // معلومات النظام
  platform: process.platform,
  isMac: process.platform === 'darwin',
  isWindows: process.platform === 'win32',
  isLinux: process.platform === 'linux',

  // إدارة التطبيق
  quit: () => ipcRenderer.invoke('app-quit'),

  // إدارة الذاكرة
  getMemoryUsage: () => process.memoryUsage(),

  // إدارة الشبكة
  isOnline: () => navigator.onLine,

  secureSession: {
    getOrCreateKey: async () => {
      const result = await ipcRenderer.invoke('secure-session:get-key');
      if (!result || result.success !== true || !result.key) {
        throw new Error(result?.error || 'secure_session_key_failed');
      }
      return result.key;
    },
    clearKey: async () => {
      const result = await ipcRenderer.invoke('secure-session:clear-key');
      if (!result || result.success !== true) {
        throw new Error(result?.error || 'secure_session_clear_failed');
      }
      return true;
    }
  },

  // ======= نظام التحديثات التلقائية =======
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('updater:check-for-updates'),
    downloadUpdate: () => ipcRenderer.invoke('updater:download-update'),
    quitAndInstall: () => ipcRenderer.invoke('updater:quit-and-install'),
    getVersion: () => ipcRenderer.invoke('updater:get-version'),
    onCheckingForUpdate: (callback) => {
      ipcRenderer.on('checking-for-update', callback);
      return () => ipcRenderer.removeListener('checking-for-update', callback);
    },
    onUpdateAvailable: (callback) => {
      ipcRenderer.on('update-available', (event, info) => callback(info));
      return () => ipcRenderer.removeListener('update-available', callback);
    },
    onUpdateNotAvailable: (callback) => {
      ipcRenderer.on('update-not-available', (event, info) => callback(info));
      return () => ipcRenderer.removeListener('update-not-available', callback);
    },
    onDownloadProgress: (callback) => {
      ipcRenderer.on('download-progress', (event, progress) => callback(progress));
      return () => ipcRenderer.removeListener('download-progress', callback);
    },
    onUpdateDownloaded: (callback) => {
      ipcRenderer.on('update-downloaded', (event, info) => callback(info));
      return () => ipcRenderer.removeListener('update-downloaded', callback);
    },
    onUpdateError: (callback) => {
      ipcRenderer.on('update-error', (event, error) => callback(error));
      return () => ipcRenderer.removeListener('update-error', callback);
    },
  },

  // إدارة التخزين المحلي
  getLocalStorage: (key) => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('خطأ في قراءة التخزين المحلي:', error);
      return null;
    }
  },

  setLocalStorage: (key, value) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error('خطأ في كتابة التخزين المحلي:', error);
      return false;
    }
  },

  removeLocalStorage: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('خطأ في حذف التخزين المحلي:', error);
      return false;
    }
  },

  // إدارة الكوكيز
  getCookie: (name) => {
    try {
      const cookies = document.cookie.split(';');
      for (let cookie of cookies) {
        const [key, value] = cookie.trim().split('=');
        if (key === name) {
          return decodeURIComponent(value);
        }
      }
      return null;
    } catch (error) {
      console.error('خطأ في قراءة الكوكيز:', error);
      return null;
    }
  },

  setCookie: (name, value, days = 7) => {
    try {
      const expires = new Date();
      expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
      document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/`;
      return true;
    } catch (error) {
      console.error('خطأ في كتابة الكوكيز:', error);
      return false;
    }
  },

  // إدارة الجلسة
  getSessionStorage: (key) => {
    try {
      return sessionStorage.getItem(key);
    } catch (error) {
      console.error('خطأ في قراءة تخزين الجلسة:', error);
      return null;
    }
  },

  setSessionStorage: (key, value) => {
    try {
      sessionStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error('خطأ في كتابة تخزين الجلسة:', error);
      return false;
    }
  },

  // إدارة الفهرس
  getIndexedDB: (dbName, storeName, key) => {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(dbName);
        request.onsuccess = (event) => {
          const db = event.target.result;
          const transaction = db.transaction([storeName], 'readonly');
          const store = transaction.objectStore(storeName);
          const getRequest = store.get(key);

          getRequest.onsuccess = () => {
            resolve(getRequest.result);
          };

          getRequest.onerror = () => {
            reject(getRequest.error);
          };
        };

        request.onerror = () => {
          reject(request.error);
        };
      } catch (error) {
        reject(error);
      }
    });
  },

  setIndexedDB: (dbName, storeName, key, value) => {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(dbName);
        request.onsuccess = (event) => {
          const db = event.target.result;
          const transaction = db.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          const putRequest = store.put(value, key);

          putRequest.onsuccess = () => {
            resolve(true);
          };

          putRequest.onerror = () => {
            reject(putRequest.error);
          };
        };

        request.onerror = () => {
          reject(request.error);
        };
      } catch (error) {
        reject(error);
      }
    });
  },

  // إدارة الطلبات المحسنة
  fetch: async (url, options = {}) => {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Stockiha-Desktop/2.0.0',
          ...options.headers
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // إدارة التخزين المؤقت
  cache: {
    set: (key, value, ttl = 3600000) => { // TTL افتراضي: ساعة واحدة
      try {
        const item = {
          value,
          timestamp: Date.now(),
          ttl
        };
        localStorage.setItem(`cache_${key}`, JSON.stringify(item));
        return true;
      } catch (error) {
        console.error('خطأ في كتابة التخزين المؤقت:', error);
        return false;
      }
    },

    get: (key) => {
      try {
        const item = localStorage.getItem(`cache_${key}`);
        if (!item) return null;

        const parsed = JSON.parse(item);
        const now = Date.now();

        if (now - parsed.timestamp > parsed.ttl) {
          localStorage.removeItem(`cache_${key}`);
          return null;
        }

        return parsed.value;
      } catch (error) {
        console.error('خطأ في قراءة التخزين المؤقت:', error);
        return null;
      }
    },

    clear: () => {
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('cache_')) {
            localStorage.removeItem(key);
          }
        });
        return true;
      } catch (error) {
          console.error('خطأ في مسح التخزين المؤقت:', error);
          return false;
        }
      }
    },

    // إدارة الإشعارات المحسنة
    notifications: {
      show: (title, options = {}) => {
        if ('Notification' in window) {
          if (Notification.permission === 'granted') {
            new Notification(title, {
              body: options.body || '',
              icon: options.icon || '/assets/icon.png',
              badge: options.badge || '/assets/badge.png',
              tag: options.tag || 'stockiha-notification',
              requireInteraction: options.requireInteraction || false,
              silent: options.silent || false
            });
          } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
              if (permission === 'granted') {
                new Notification(title, options);
              }
            });
          }
        }
      },

      requestPermission: () => {
        if ('Notification' in window) {
          return Notification.requestPermission();
        }
        return Promise.resolve('denied');
      },

      getPermission: () => {
        if ('Notification' in window) {
          return Notification.permission;
        }
        return 'denied';
      }
    },

    // إدارة الطباعة
    print: () => {
      window.print();
    },

    // إدارة النسخ
    copyToClipboard: async (text) => {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        console.error('خطأ في النسخ إلى الحافظة:', error);
        return false;
      }
    },

    // إدارة اللصق
    pasteFromClipboard: async () => {
      try {
        const text = await navigator.clipboard.readText();
        return { success: true, text };
      } catch (error) {
        console.error('خطأ في اللصق من الحافظة:', error);
        return { success: false, error: error.message };
      }
    },

    // إدارة الشاشة
    screen: {
      getSize: () => {
        return {
          width: window.screen.width,
          height: window.screen.height,
          availWidth: window.screen.availWidth,
          availHeight: window.screen.availHeight
        };
      },

      getColorDepth: () => window.screen.colorDepth,
      getPixelDepth: () => window.screen.pixelDepth
    },

    // إدارة الشبكة
    network: {
      isOnline: () => navigator.onLine,
      getConnection: () => {
        if ('connection' in navigator) {
          return {
            effectiveType: navigator.connection.effectiveType,
            downlink: navigator.connection.downlink,
            rtt: navigator.connection.rtt
          };
        }
        return null;
      }
    },

    // إدارة الأجهزة
    device: {
      getBattery: () => {
        if ('getBattery' in navigator) {
          return navigator.getBattery();
        }
        return null;
      },

      getVibrate: () => {
        if ('vibrate' in navigator) {
          return navigator.vibrate;
        }
        return null;
      }
    },

    // إدارة الأمان
    security: {
      generateUUID: () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      },

      hashString: async (str) => {
        try {
          const encoder = new TextEncoder();
          const data = encoder.encode(str);
          const hashBuffer = await crypto.subtle.digest('SHA-256', data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (error) {
          console.error('خطأ في تشفير النص:', error);
          return null;
        }
      }
    }
  });
}

// إدارة الأحداث العامة
window.addEventListener('DOMContentLoaded', () => {
  // إعداد التطبيق عند تحميل الصفحة
  console.log('سطوكيها - تطبيق سطح المكتب جاهز');

  // إعداد الإشعارات
  if ('Notification' in window) {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  // لا نقوم بتسجيل Service Worker في وضع التطوير داخل Electron
});

// إدارة الأخطاء العامة
window.addEventListener('error', (event) => {
  console.error('خطأ في التطبيق:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('رفض غير معالج:', event.reason);
});

// إدارة التحديثات
window.addEventListener('beforeunload', (event) => {
  // حفظ البيانات قبل إغلاق التطبيق
  if (window.electronAPI) {
    // يمكن إضافة منطق حفظ البيانات هنا
  }
});

// تصدير الواجهة للاستخدام في التطبيق
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.electronAPI;
}
