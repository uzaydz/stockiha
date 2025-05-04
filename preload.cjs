const { contextBridge, ipcRenderer } = require('electron');

// Polyfills para Supabase en Electron (usado solo en el contexto de preload)
try {
  // Asegurar que los polyfills estén disponibles globalmente en el preload
  global.Buffer = global.Buffer || require('buffer').Buffer;
  global.process = global.process || require('process');
  
  // Preparar los valores para exponer al renderer
  const bufferPolyfill = {
    from: function(data, encoding) { 
      if (typeof data === 'string') {
        const encoder = new TextEncoder();
        return encoder.encode(data);
      }
      return new Uint8Array(data);
    },
    isBuffer: function(obj) { return false; },
    alloc: function(size) { return new Uint8Array(size); },
    allocUnsafe: function(size) { return new Uint8Array(size); },
    toString: function(buffer, encoding) {
      if (encoding === 'base64') {
        return btoa(String.fromCharCode.apply(null, buffer));
      }
      return String.fromCharCode.apply(null, buffer);
    }
  };
  
  const processPolyfill = { 
    env: {}, 
    browser: true,
    version: process.version,
    versions: process.versions,
    platform: process.platform
  };
  
  console.log('[Preload] Polyfills preparados correctamente');
} catch (err) {
  console.error('[Preload] Error preparando polyfills:', err);
}

// تابع لتسجيل الرسائل التشخيصية
function logDiagnostic(message) {
  console.log(`[Preload] ${message}`);
}

// تسجيل بداية تحميل ملف preload
logDiagnostic('بدء تحميل ملف preload.cjs');
logDiagnostic('Información del entorno:');
logDiagnostic(`- Directorio de trabajo: ${process.cwd()}`);
logDiagnostic(`- Plataforma: ${process.platform}`);
logDiagnostic(`- Versión de Node: ${process.versions.node}`);
logDiagnostic(`- Versión de Electron: ${process.versions.electron || 'No disponible'}`);
logDiagnostic(`- Versión de Chrome: ${process.versions.chrome || 'No disponible'}`);

// التعرض للوظائف من العملية الرئيسية إلى المتصفح
contextBridge.exposeInMainWorld('electronAPI', {
  // مثال على وظيفة للتواصل بين العمليات
  setTitle: (title) => ipcRenderer.send('set-title', title),
  // إضافة وظيفة لتسجيل الأخطاء
  logError: (error) => console.error('[Renderer Error]', error),
  // وظيفة للتحقق من الاتصال بـ Electron
  isElectron: true,
  // إضافة وظيفة لإعادة تحميل التطبيق
  reloadApp: () => ipcRenderer.send('reload-app'),
  // وظيفة لتوفير معلومات عن المسار الحالي
  getCurrentPath: () => process.cwd(),
  // وظيفة للحصول على معلومات النظام
  getSystemInfo: () => ({
    platform: process.platform,
    arch: process.arch,
    versions: process.versions,
    env: process.env.NODE_ENV
  }),
  // إضافة وظائف جديدة للتوجيه
  routing: {
    cleanPath: (path) => {
      if (path && typeof path === 'string' && path.startsWith('file://')) {
        return path.replace(/^file:\/\/.*?\/dist/, '');
      }
      return path;
    },
    getBasePath: () => '/',
    isElectronPath: (path) => path && typeof path === 'string' && path.startsWith('file://')
  },
  
  // واجهة قاعدة البيانات المحلية
  db: {
    // تهيئة قاعدة البيانات
    init: () => ipcRenderer.invoke('db:init'),
    // إغلاق قاعدة البيانات
    close: () => ipcRenderer.invoke('db:close'),
    // تنفيذ استعلام SQL مباشر
    execute: (sql, params) => ipcRenderer.invoke('db:execute', sql, params),
    // إدراج سجل في جدول
    insert: (table, data) => ipcRenderer.invoke('db:insert', table, data),
    // تحديث سجل في جدول
    update: (table, id, data) => ipcRenderer.invoke('db:update', table, id, data),
    // حذف سجل من جدول
    remove: (table, id) => ipcRenderer.invoke('db:remove', table, id),
    // الاستعلام عن سجلات
    query: (table, options) => ipcRenderer.invoke('db:query', table, options),
    // الحصول على عدد التغييرات المعلقة
    pendingChanges: () => ipcRenderer.invoke('db:pending-changes')
  },
  
  // واجهة المزامنة
  sync: {
    // بدء عملية المزامنة
    start: () => ipcRenderer.invoke('sync:start'),
    // مزامنة جدول من الخادم
    fromServer: (table, options) => ipcRenderer.invoke('sync:from-server', table, options),
    // مزامنة كاملة للبيانات
    full: (tables) => ipcRenderer.invoke('sync:full', tables),
    // الاستماع لتحديثات المزامنة
    onUpdate: (callback) => {
      const listener = (event, data) => callback(data);
      ipcRenderer.on('sync:update', listener);
      return () => ipcRenderer.removeListener('sync:update', listener);
    }
  },
  
  // الحصول على مسار بيانات المستخدم
  getUserDataPath: () => {
    try {
      const { app } = require('electron').remote || require('@electron/remote');
      return app.getPath('userData');
    } catch (e) {
      console.error('خطأ في الحصول على مسار بيانات المستخدم:', e);
      return './';
    }
  },
  
  // توفير واجهة invoke مباشرة لأي استخدام
  invoke: (channel, ...args) => {
    const allowedChannels = [
      'db:init', 'db:close', 'db:execute', 'db:insert', 'db:update', 
      'db:remove', 'db:query', 'db:pending-changes',
      'sync:start', 'sync:from-server', 'sync:full'
    ];
    
    if (allowedChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    } else {
      console.error(`قناة غير مسموح بها: ${channel}`);
      return Promise.reject(new Error(`قناة غير مسموح بها: ${channel}`));
    }
  },
  
  // توفير واجهة send مباشرة لأي استخدام
  send: (channel, ...args) => {
    const allowedChannels = ['set-title', 'reload-app'];
    
    if (allowedChannels.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    } else {
      console.error(`قناة غير مسموح بها: ${channel}`);
    }
  }
});

// IMPORTANTE: Exponer variables globales para compatibilidad con bibliotecas
try {
  // NO usar exposeInMainWorld para 'process' y 'global' debido a problemas con propiedades de solo lectura
  // En su lugar, exponemos las propiedades necesarias en un nuevo objeto
  
  // Crear un objeto para los polyfills
  contextBridge.exposeInMainWorld('_electronPolyfills', {
    // Process propiedades
    process: {
      browser: true,
      env: process.env || {},
      versions: process.versions || {},
      platform: process.platform || 'unknown'
    },
    
    // Buffer implementación simplificada
    Buffer: {
      from: function(data, encoding) { 
        if (typeof data === 'string') {
          const encoder = new TextEncoder();
          return encoder.encode(data);
        }
        return new Uint8Array(data);
      },
      isBuffer: function(obj) { return false; },
      alloc: function(size) { return new Uint8Array(size); },
      allocUnsafe: function(size) { return new Uint8Array(size); },
      toString: function(buffer, encoding) {
        if (encoding === 'base64') {
          return btoa(String.fromCharCode.apply(null, buffer));
        }
        return String.fromCharCode.apply(null, buffer);
      }
    },
    
    // Módulos necesarios para Supabase
    stream: {
      Readable: function() { 
        this.pipe = function() { return this; };
        this.on = function() { return this; };
        return this;
      },
      PassThrough: function() {
        this.pipe = function() { return this; };
        this.on = function() { return this; };
        return this;
      }
    },
    
    http: { 
      STATUS_CODES: {
        '200': 'OK',
        '201': 'Created',
        '400': 'Bad Request',
        '401': 'Unauthorized',
        '404': 'Not Found',
        '500': 'Internal Server Error'
      }
    },
    
    url: { 
      URL: typeof URL !== 'undefined' ? URL : null,
      parse: function(urlString) {
        try {
          const parsedUrl = new URL(urlString);
          return {
            protocol: parsedUrl.protocol,
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            pathname: parsedUrl.pathname,
            search: parsedUrl.search,
            hash: parsedUrl.hash,
            href: parsedUrl.href
          };
        } catch(e) {
          console.error('Error parsing URL:', e);
          return {};
        }
      },
      format: function(urlObj) {
        try {
          if (urlObj instanceof URL) {
            return urlObj.href;
          }
          return urlObj.href || '';
        } catch(e) {
          return '';
        }
      }
    }
  });
  
  logDiagnostic('Variables globales expuestas correctamente');
} catch (err) {
  console.error('[Preload] Error exponiendo variables globales:', err);
}

logDiagnostic('تم تعريف واجهة API للـ Electron');

// استخدام متغير عام للتتبع محاولات تحميل المحتوى
let contentLoadAttempts = 0;
const MAX_LOAD_ATTEMPTS = 5;

// وظيفة للتحقق من محتوى الصفحة وإعادة المحاولة إذا كان فارغاً
function checkPageContent() {
  contentLoadAttempts++;
  logDiagnostic(`فحص محتوى الصفحة، محاولة ${contentLoadAttempts}`);
  
  // Verificar si el documento está disponible
  if (!document || !document.body) {
    logDiagnostic('El documento o body no está disponible todavía');
    if (contentLoadAttempts < MAX_LOAD_ATTEMPTS) {
      setTimeout(checkPageContent, 500);
    }
    return;
  }
  
  if (document.body && document.body.innerHTML.trim() === '') {
    console.error('تم تحميل HTML، لكن body فارغ!');
    
    if (contentLoadAttempts < MAX_LOAD_ATTEMPTS) {
      logDiagnostic('محاولة إعادة تحميل المحتوى...');
      setTimeout(() => {
        // محاولة إعادة تنشيط المحتوى
        if (window.location.href.includes('index.html') || window.location.pathname === '/') {
          window.history.replaceState({}, '', '/');
          try {
            window.dispatchEvent(new PopStateEvent('popstate'));
            window.dispatchEvent(new Event('DOMContentLoaded', {
              bubbles: true,
              cancelable: true
            }));
          } catch (e) {
            console.error('خطأ في إعادة تنشيط المحتوى:', e);
          }
        }
        checkPageContent();
      }, 500);
    } else {
      console.error('فشلت كل محاولات تحميل المحتوى');
      ipcRenderer.send('reload-app');
    }
  } else {
    logDiagnostic('تم تحميل محتوى الصفحة بنجاح');
  }
}

// إضافة معالجة خاصة للتوجيه في Electron
window.addEventListener('DOMContentLoaded', () => {
  logDiagnostic('تم تحميل DOM');
  
  try {
    // تعريف متغيرات عامة للتطبيق
    window.__ELECTRON_APP__ = true;
    window.__BASE_PATH__ = '/';

    // تجاوز window.location.href لتوفير مسار نسبي
    Object.defineProperty(window, 'electronAppPath', {
      value: '/',
      writable: false
    });

    // تعديل history.pushState للتعامل مع المسارات
    const originalPushState = window.history.pushState;
    window.history.pushState = function() {
      try {
        const [state, title, url] = arguments;
        if (url && typeof url === 'string') {
          // Asegurarnos de que la URL nunca sea vacía o null
          let cleanUrl = url;
          
          if (url.startsWith('file://')) {
            cleanUrl = url.replace(/^file:\/\/.*?\/dist/, '');
            // Si la URL queda vacía después de limpiarla, usar /
            if (!cleanUrl || cleanUrl === '') {
              cleanUrl = '/';
            }
          }
          
          console.log('[Router] تحويل المسار من', url, 'إلى', cleanUrl);
          return originalPushState.call(this, state, title, cleanUrl);
        }
        return originalPushState.apply(this, arguments);
      } catch (e) {
        console.error('[Router] خطأ في pushState:', e);
        return originalPushState.apply(this, arguments);
      }
    };

    // تعديل history.replaceState للتعامل مع المسارات
    const originalReplaceState = window.history.replaceState;
    window.history.replaceState = function() {
      try {
        const [state, title, url] = arguments;
        if (url && typeof url === 'string') {
          // Asegurarnos de que la URL nunca sea vacía o null
          let cleanUrl = url;
          
          if (url.startsWith('file://')) {
            cleanUrl = url.replace(/^file:\/\/.*?\/dist/, '');
            // Si la URL queda vacía después de limpiarla, usar /
            if (!cleanUrl || cleanUrl === '') {
              cleanUrl = '/';
            }
          }
          
          console.log('[Router] تحويل المسار من', url, 'إلى', cleanUrl);
          return originalReplaceState.call(this, state, title, cleanUrl);
        }
        return originalReplaceState.apply(this, arguments);
      } catch (e) {
        console.error('[Router] خطأ في replaceState:', e);
        return originalReplaceState.apply(this, arguments);
      }
    };

    // التوجيه المباشر إلى الصفحة الرئيسية
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname === '') {
      console.log('[Router] توجيه إلى الصفحة الرئيسية');
      try {
        window.history.replaceState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch (e) {
        console.error('[Router] خطأ في التوجيه الأولي:', e);
      }
    }

    logDiagnostic('تم إعداد التوجيه بنجاح');
    
    // فحص محتوى الصفحة بعد التحميل
    setTimeout(checkPageContent, 500);
    
  } catch (err) {
    console.error('خطأ أثناء إعداد التوجيه:', err);
  }

  // إضافة تسجيل للأخطاء
  window.addEventListener('error', (event) => {
    console.error('خطأ في JS:', event.error);
    // Mostrar mensaje con más detalles
    console.log('Error en:', event.filename);
    console.log('Línea:', event.lineno, 'Columna:', event.colno);
    console.log('Mensaje:', event.message);
  });
  
  // إضافة مراقب لأخطاء الوعود غير المعالجة
  window.addEventListener('unhandledrejection', (event) => {
    console.error('وعد غير معالج:', event.reason);
  });
}); 