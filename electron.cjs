const { app, BrowserWindow, ipcMain, dialog, session, protocol } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');
// استيراد fetch للتحقق من الاتصال
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
// Importar el inicializador de Electron
const { isElectronReady } = require('./electron-init.cjs');

// حفظ مرجع للنافذة العامة لتجنب إغلاقها تلقائيًا عند جمع البيانات المهملة
let mainWindow;

// تكوين بيانات تسجيل الدخول الافتراضية - تستخدم للتطوير فقط
const DEFAULT_LOGIN = {
  email: 'admin@bazaar.com',
  password: 'password123'
};

// إنشاء مجلد لحفظ السجلات إذا كان غير موجود
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Registrar los polyfills para Node.js
function registerNodeModules() {
  if (process.env.NODE_ENV !== 'production') {
    app.allowRendererProcessReuse = false;
  }
  
  // Registrar esquema node:// una sola vez
  try {
    // Solo ejecutar si protocol está disponible
    if (protocol && protocol.registerSchemesAsPrivileged) {
      protocol.registerSchemesAsPrivileged([
        { 
          scheme: 'node', 
          privileges: { 
            standard: true, 
            secure: true, 
            supportFetchAPI: true,
            corsEnabled: true,
            bypassCSP: true
          } 
        }
      ]);
      console.log('Esquema node:// registrado correctamente');
    } else {
      console.warn('protocol.registerSchemesAsPrivileged no está disponible');
    }
  } catch (err) {
    console.error('Error registrando esquema node://', err.message);
  }
  
  console.log('Módulos Node.js registrados correctamente');
}

// كتابة الأخطاء في ملف سجل
function logError(error) {
  const logFile = path.join(logDir, `app-error-${new Date().toISOString().replace(/:/g, '-')}.log`);
  const errorMessage = `${new Date().toISOString()}: ${error.stack || error}\n`;
  fs.appendFileSync(logFile, errorMessage);
  console.error(error);
}

// فحص محتويات مجلد الموارد
function checkAssetsFolder(basePath) {
  const assetsPath = path.join(basePath, 'assets');
  console.log(`فحص مجلد الموارد: ${assetsPath}`);
  
  if (!fs.existsSync(assetsPath)) {
    console.error(`مجلد الموارد غير موجود: ${assetsPath}`);
    return false;
  }
  
  // قراءة محتويات المجلد للتشخيص
  const files = fs.readdirSync(assetsPath);
  console.log(`محتويات مجلد الموارد (${files.length} ملفات):`);
  files.forEach(file => console.log(` - ${file}`));
  
  // Verificar subcarpetas de assets que son esenciales
  const requiredSubfolders = ['js', 'css', 'img'];
  for (const subfolder of requiredSubfolders) {
    const subfolderPath = path.join(assetsPath, subfolder);
    if (fs.existsSync(subfolderPath)) {
      const subfolderFiles = fs.readdirSync(subfolderPath);
      console.log(`محتويات مجلد ${subfolder} (${subfolderFiles.length} ملفات):`);
      subfolderFiles.forEach(file => console.log(` -- ${subfolder}/${file}`));
    } else {
      console.warn(`مجلد ${subfolder} غير موجود`);
    }
  }
  
  return true;
}

function createWindow() {
  // Registrar los módulos de Node.js antes de crear la ventana
  registerNodeModules();
  
  // إنشاء نافذة المتصفح
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,  // SOLO para desarrollo
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      devTools: true,
      // Opciones de seguridad (para desarrollo)
      webSecurity: false,     // SOLO para desarrollo
      allowRunningInsecureContent: true, // SOLO para desarrollo
      sandbox: false,         // SOLO para desarrollo
      // Habilitar el uso de módulos de Node.js
      additionalArguments: ['--enable-node-modules-access'],
      // Más opciones para solucionar problemas con Node.js en Electron
      nodeIntegrationInWorker: true,
      nodeIntegrationInSubFrames: true,
      v8CacheOptions: 'none'
    },
    autoHideMenuBar: false,
    show: false, // No mostrar hasta que esté listo
    backgroundColor: '#f8f9fa',
    icon: path.join(__dirname, 'public/favicon.ico')
  });

  // Inicializar polyfills en la ventana
  mainWindow.webContents.on('did-start-loading', () => {
    console.log('Iniciando carga de contenido');
    
    // Registrar manejadores de errores
    mainWindow.webContents.on('render-process-gone', (event, details) => {
      console.error('El proceso de renderizado ha fallado:', details.reason);
      logError(`Proceso de renderizado fallido: ${details.reason}`);
    });
    
    mainWindow.webContents.on('unresponsive', () => {
      console.error('La ventana de la aplicación no responde');
      logError('Ventana no responde');
      
      // Intentar reiniciar la ventana si no responde
      dialog.showMessageBox({
        type: 'warning',
        title: 'La aplicación no responde',
        message: 'La aplicación no responde. ¿Desea reiniciarla?',
        buttons: ['Reiniciar', 'Esperar']
      }).then(({ response }) => {
        if (response === 0) {
          // Reiniciar la ventana
          if (mainWindow) {
            mainWindow.destroy();
            createWindow();
          }
        }
      });
    });
  });

  // تمكين تصميم الويب وتعيين سياسة الأمان
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: ws:;",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:;",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;",
          "font-src 'self' https://fonts.gstatic.com;",
          "img-src 'self' data: blob: https:;",
          "media-src 'self' data:;",
          "connect-src 'self' https: wss:;"
        ].join(' ')
      }
    });
  });

  // تحديد المسار الصحيح لملف index.html
  const indexPath = path.join(__dirname, 'dist/index.html');
  
  if (!fs.existsSync(indexPath)) {
    console.error(`لم يتم العثور على ملف index.html في المسار: ${indexPath}`);
    dialog.showErrorBox(
      'خطأ في تحميل التطبيق',
      `لم يتم العثور على ملفات التطبيق الضرورية. يرجى التأكد من وجود مجلد dist ومحتوياته.`
    );
    app.quit();
    return;
  }

  // إنشاء ملف react-loader.js إذا لم يكن موجودًا
  const reactLoaderPath = path.join(path.dirname(indexPath), 'react-loader.js');
  if (!fs.existsSync(reactLoaderPath)) {
    console.log('إنشاء ملف react-loader.js...');
    
    // محتوى أساسي لملف react-loader.js
    const reactLoaderContent = `
/**
 * حلّ مشكلة تحميل React
 * ملف مخصص لإصلاح مشكلة "Cannot read properties of undefined (reading 'prototype')"
 */

(function() {
  console.log('[ReactLoader] بدء تنفيذ حل مشكلة تحميل React');

  // إصلاح مشكلة prototype
  const fixPrototypeError = function() {
    try {
      // إصلاح مشكلة stream.Readable.prototype
      if (window.stream && !window.stream.Readable) {
        window.stream.Readable = function() {};
        window.stream.Readable.prototype = {
          pipe: function() { return this; },
          on: function() { return this; },
          once: function() { return this; },
          emit: function() { return true; },
          end: function() { return this; },
          destroy: function() { return this; }
        };
      }
      
      console.log('[ReactLoader] تم إصلاح مشكلة Prototype بنجاح');
      return true;
    } catch (e) {
      console.error('[ReactLoader] خطأ أثناء إصلاح مشكلة Prototype:', e);
      return false;
    }
  };
  
  // تنفيذ الإصلاحات فورًا
  fixPrototypeError();
})();`;
    
    // كتابة الملف
    fs.writeFileSync(reactLoaderPath, reactLoaderContent);
    console.log('تم إنشاء ملف react-loader.js بنجاح');
  }

  // فحص مجلد الموارد
  checkAssetsFolder(path.dirname(indexPath));

  // تكوين معلومات التطبيق
  const appInfo = {
    DEFAULT_LOGIN: DEFAULT_LOGIN
  };
  
  // استخدام عنوان الويب مباشرة بدلاً من الملفات المحلية
  let startUrl = 'http://localhost:8080/login';
  console.log('URL البداية:', startUrl);
  
  // Cargar URL con script de preload
  mainWindow.loadURL(startUrl, {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Electron/28.1.0'
  }).then(() => {
    // تنفيذ سكريبت بسيط بدلاً من كل التعقيدات السابقة
    mainWindow.webContents.executeJavaScript(`
      console.log('تم تحميل الموقع مباشرة من الويب');
      window.__ELECTRON_APP__ = true;
      
      // منع إعادة التوجيه المستمر
      let redirectCount = 0;
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;
      
      history.pushState = function() {
        redirectCount++;
        if (redirectCount > 5) {
          console.warn('تم اكتشاف العديد من عمليات إعادة التوجيه، توقف مؤقتًا');
          setTimeout(() => { redirectCount = 0; }, 5000);
          return;
        }
        return originalPushState.apply(this, arguments);
      };
      
      history.replaceState = function() {
        redirectCount++;
        if (redirectCount > 5) {
          console.warn('تم اكتشاف العديد من عمليات استبدال الحالة، توقف مؤقتًا');
          setTimeout(() => { redirectCount = 0; }, 5000);
          return;
        }
        return originalReplaceState.apply(this, arguments);
      };
    `).catch(err => {
      console.error('خطأ في تنفيذ JavaScript:', err);
      logError(err);
    });
  }).catch(err => {
    console.error('خطأ في تحميل الملف:', err);
    logError(err);
    showErrorPage(err);
  });

  // تسجيل الأحداث
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('فشل تحميل الصفحة:', errorCode, errorDescription);
    logError(`فشل تحميل الصفحة: ${errorCode} - ${errorDescription}`);
    
    // إزالة إعادة التحميل الآلي لمنع الحلقة المستمرة
    console.log('تجاهل إعادة التحميل التلقائي لمنع دورة التحديث المستمر');
    
    // إظهار زر إعادة التحميل اليدوي بدلاً من ذلك
    mainWindow.webContents.executeJavaScript(`
      if (document.body) {
        const reloadBtn = document.createElement('button');
        reloadBtn.innerText = 'إعادة تحميل التطبيق';
        reloadBtn.style = 'position: fixed; top: 20px; right: 20px; z-index: 9999; padding: 10px; background: #4299e1; color: white; border: none; border-radius: 4px;';
        reloadBtn.onclick = () => location.reload();
        document.body.appendChild(reloadBtn);
      }
    `).catch(e => console.error('خطأ في إضافة زر إعادة التحميل:', e));
  });

  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    // Verificar si la URL es vacía o inválida
    if (navigationUrl === 'file:///' || navigationUrl === 'file://') {
      event.preventDefault();
      console.log('Navegación a URL vacía bloqueada, manteniendo URL actual');
    }
    
    // الآن نسمح بالتنقل إلى localhost:8080
    console.log('Navigation to:', navigationUrl);
  });

  mainWindow.webContents.on('dom-ready', () => {
    console.log('[Main] تم تحميل DOM');
    
    // Inyectar scripts adicionales para depurar problemas
    mainWindow.webContents.executeJavaScript(`
      // Registrar todos los errores para diagnóstico
      console.log('Registrando manejadores de errores adicionales');
      
      // Depurar problemas de importación
      const originalImport = window.import;
      if (originalImport) {
        window.import = function(...args) {
          console.log('Import dinámico:', args[0]);
          return originalImport.apply(this, args).catch(err => {
            console.error('Error en import dinámico:', err);
            throw err;
          });
        };
      }
    `).catch(err => {
      console.error('Error al inyectar scripts de diagnóstico:', err);
    });
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Main] تم تحميل الصفحة بنجاح');
    
    // Mostrar la ventana una vez que el contenido esté listo
    mainWindow.show();
    
    // فحص React دون إعادة تحميل تلقائي
    setTimeout(() => {
      mainWindow.webContents.executeJavaScript(`
        const rootEl = document.getElementById('root');
        if (rootEl && (!rootEl.children || rootEl.children.length === 0)) {
          console.log('React غير محمل بشكل صحيح، يرجى إعادة التحميل يدويًا');
          // إزالة التحميل التلقائي واستخدام زر بدلاً من ذلك
          if (document.body) {
            const reloadBtn = document.createElement('button');
            reloadBtn.innerText = 'إعادة تحميل React';
            reloadBtn.style = 'position: fixed; top: 20px; right: 20px; z-index: 9999; padding: 10px; background: #4299e1; color: white; border: none; border-radius: 4px;';
            reloadBtn.onclick = () => location.reload();
            document.body.appendChild(reloadBtn);
          }
        } else {
          console.log('React inicializado correctamente');
        }
      `).catch(err => console.error('Error al verificar inicialización de React:', err));
    }, 1500);
  });

  // عند إغلاق النافذة
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// دالة لعرض صفحة الخطأ
function showErrorPage(err) {
  mainWindow.webContents.loadURL(`data:text/html;charset=utf-8,
    <html>
      <head>
        <title>حدث خطأ في التحميل</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; direction: rtl; }
          h1 { color: #e74c3c; }
          pre { background: #f8f9fa; padding: 15px; border-radius: 5px; text-align: left; overflow: auto; }
          .hint { background: #eaf5ea; padding: 15px; border-radius: 5px; margin-top: 20px; }
          .actions { display: flex; gap: 10px; justify-content: center; margin-top: 20px; }
          button { background: #3498db; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; }
          button.secondary { background: #7f8c8d; }
        </style>
      </head>
      <body>
        <h1>تعذر تحميل التطبيق</h1>
        <p>حدث خطأ أثناء محاولة تحميل التطبيق. يرجى التحقق من الإعدادات.</p>
        
        <div class="hint">
          <h3>المشكلة الأكثر احتمالاً:</h3>
          <p>يحاول التطبيق الاتصال بـ <strong>http://localhost:8080</strong></p>
          <p>تأكد من أن خادم الويب يعمل على هذا المنفذ.</p>
        </div>
        
        <h3>تفاصيل الخطأ:</h3>
        <pre>${err.message || 'خطأ غير معروف'}</pre>
        
        <div class="hint">
          <h3>اقتراحات لإصلاح المشكلة:</h3>
          <ol>
            <li>تأكد من تشغيل خادم الويب المحلي باستخدام أمر: npm run dev</li>
            <li>تأكد من إمكانية الوصول إلى http://localhost:8080 من المتصفح</li>
            <li>أعد تشغيل التطبيق بعد تشغيل الخادم</li>
          </ol>
        </div>
        
        <div class="actions">
          <button onclick="window.electronAPI && window.electronAPI.reloadApp()">إعادة تحميل التطبيق</button>
          <button class="secondary" onclick="window.open('http://localhost:8080', '_blank')">فتح في المتصفح</button>
        </div>
        
        <script>
          // إضافة مستمع لمفاتيح الاختصار
          document.addEventListener('keydown', function(e) {
            // Ctrl+R or F5 to reload
            if ((e.ctrlKey && e.key === 'r') || e.key === 'F5') {
              e.preventDefault();
              window.electronAPI && window.electronAPI.reloadApp();
            }
          });
        </script>
      </body>
    </html>
  `);
}

// الاستماع للرسائل من الواجهة
ipcMain.on('set-title', (event, title) => {
  BrowserWindow.fromWebContents(event.sender).setTitle(title);
});

// إضافة وظيفة إعادة تحميل التطبيق
ipcMain.on('reload-app', () => {
  if (mainWindow) {
    mainWindow.reload();
  }
});

// تسجيل الأخطاء غير المعالجة
process.on('uncaughtException', (error) => {
  logError(error);
});

// عند جاهزية إلكترون
app.on('ready', createWindow);

// الخروج عند إغلاق جميع النوافذ
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
}); 