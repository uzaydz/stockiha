const { app, BrowserWindow, Menu, shell, ipcMain, dialog, nativeImage, Tray, globalShortcut, protocol, net } = require('electron');

const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { SQLiteManager } = require('./sqliteManager.cjs');
const { updaterManager } = require('./updater.cjs');
const printManager = require('./printManager.cjs');

// ═══════════════════════════════════════════════════════════════════════════
// ⚡ PERFORMANCE OPTIMIZATIONS - تحسينات الأداء لـ Electron
// ═══════════════════════════════════════════════════════════════════════════
//
// هذه التحسينات تقلل استهلاك الذاكرة بنسبة 20-40% وتسرّع التشغيل
// مستوحاة من: Slack, VS Code, Notion, Figma
//

// ✅ 1. Windows Segment Heap - يقلل الذاكرة بنسبة 20-30%
// يحسّن إدارة الذاكرة في Windows 10/11
if (process.platform === 'win32') {
  app.commandLine.appendSwitch('enable-features', 'SegmentHeap');
}

// ✅ 2. V8 Memory Optimization - تحسين ذاكرة JavaScript
// تحديد حجم الـ heap لتجنب التضخم (خاصة للحواسيب الضعيفة)
app.commandLine.appendSwitch('js-flags', [
  '--max-old-space-size=512',      // حد أقصى 512MB للـ old space (افتراضي ~1400MB)
  '--optimize-for-size',           // تحسين لتقليل الحجم بدلاً من السرعة القصوى
  '--gc-interval=100',             // Garbage Collection كل 100 allocation
  '--expose-gc',                   // السماح باستدعاء GC يدوياً
].join(' '));

// ✅ 3. GPU Optimization - تحسين الرسوميات
// تعطيل GPU إذا كان الجهاز ضعيفاً (يمكن تفعيله للأجهزة القوية)
// app.commandLine.appendSwitch('disable-gpu'); // فقط للأجهزة الضعيفة جداً
app.commandLine.appendSwitch('disable-gpu-compositing'); // تقليل استخدام GPU
app.commandLine.appendSwitch('disable-software-rasterizer');

// ✅ 4. Renderer Process Optimization - تحسين عملية الـ Renderer
app.commandLine.appendSwitch('disable-renderer-backgrounding'); // منع إبطاء الـ background tabs
app.commandLine.appendSwitch('disable-background-timer-throttling'); // منع إبطاء الـ timers

// ✅ 5. Memory Pressure Handling - التعامل مع ضغط الذاكرة
app.commandLine.appendSwitch('enable-aggressive-domstorage-flushing'); // تنظيف DOM storage

// ✅ 6. Network Optimization - تحسين الشبكة
app.commandLine.appendSwitch('disable-http2'); // HTTP/1.1 أقل استهلاكاً للذاكرة في بعض الحالات

// ✅ 7. Chromium Features - ميزات Chromium للأداء
app.commandLine.appendSwitch('enable-features', [
  'SegmentHeap',                   // Windows Segment Heap
  'ParallelDownloading',           // تحميل متوازي
  'LazyFrameLoading',              // تحميل كسول للـ iframes
  'LazyImageLoading',              // تحميل كسول للصور
].join(','));

// ❌ تعطيل الميزات غير الضرورية
app.commandLine.appendSwitch('disable-features', [
  'TranslateUI',                   // لا نحتاج الترجمة التلقائية
  'SpareRendererForSitePerProcess', // لا نحتاج renderer إضافي
].join(','));

// ✅ 8. Memory Limit for Renderer - حد الذاكرة للـ Renderer
app.commandLine.appendSwitch('memory-pressure-thresholds', '512,768,1024');

console.log('⚡ [Performance] Electron optimizations applied');
// ═══════════════════════════════════════════════════════════════════════════

// ======= مكتبة الطباعة للطابعات الحرارية =======
// انتقلت المسؤولية إلى printManager.cjs
// تم إزالة الكود القديم من هنا


// محاولة تحميل keytar (اختياري)
let keytar = null;
try {
  keytar = require('keytar');
  console.log('✅ [Electron] keytar loaded successfully');
} catch (error) {
  console.warn('⚠️ [Electron] keytar not available, using fallback storage:', error.message);
}

// كشف وضع التطوير بطرق متعددة
const isDev = process.env.NODE_ENV === 'development' ||
  process.argv.includes('--dev') ||
  !fs.existsSync(path.join(__dirname, '../dist/index.html')) ||
  process.env.ELECTRON_IS_DEV === 'true';

const isMac = process.platform === 'darwin';
const isWindows = process.platform === 'win32';

// إخفاء تحذيرات الأمان في وضع التطوير فقط
if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev') || process.env.ELECTRON_IS_DEV === 'true') {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
}

const SECURE_SESSION_SERVICE = 'stockiha-pos-offline-session';
const SECURE_SESSION_ACCOUNT = 'session-encryption-key';

// دالة للحصول على مسار المفتاح (تُستدعى بعد جاهزية app)
function getFallbackKeyPath() {
  return path.join(app.getPath('userData'), '.session-key');
}

// Fallback: حفظ المفتاح في ملف محلي إذا فشل keytar
async function getOrCreateSecureSessionKey() {
  try {
    // محاولة استخدام keytar أولاً
    if (keytar) {
      let existingKey = await keytar.getPassword(SECURE_SESSION_SERVICE, SECURE_SESSION_ACCOUNT);
      if (existingKey) {
        console.log('🔑 [Electron] Retrieved key from keytar');
        return existingKey;
      }

      const randomKey = crypto.randomBytes(32).toString('base64');
      await keytar.setPassword(SECURE_SESSION_SERVICE, SECURE_SESSION_ACCOUNT, randomKey);
      console.log('🔑 [Electron] Created and stored key in keytar');
      return randomKey;
    }

    // Fallback: استخدام ملف محلي
    console.log('🔑 [Electron] Using fallback file storage');
    const fallbackKeyPath = getFallbackKeyPath();

    if (fs.existsSync(fallbackKeyPath)) {
      const existingKey = fs.readFileSync(fallbackKeyPath, 'utf8');
      console.log('🔑 [Electron] Retrieved key from fallback file');
      return existingKey;
    }

    const randomKey = crypto.randomBytes(32).toString('base64');
    fs.writeFileSync(fallbackKeyPath, randomKey, { mode: 0o600 });
    console.log('🔑 [Electron] Created and stored key in fallback file');
    return randomKey;
  } catch (error) {
    console.error('❌ [Electron] فشل الحصول على مفتاح الجلسة الآمن:', error);
    throw error;
  }
}

async function clearSecureSessionKey() {
  try {
    let cleared = false;

    // محاولة حذف من keytar
    if (keytar) {
      await keytar.deletePassword(SECURE_SESSION_SERVICE, SECURE_SESSION_ACCOUNT);
      console.log('🗑️ [Electron] Deleted key from keytar');
      cleared = true;
    }

    // حذف من fallback file
    const fallbackKeyPath = getFallbackKeyPath();
    if (fs.existsSync(fallbackKeyPath)) {
      fs.unlinkSync(fallbackKeyPath);
      console.log('🗑️ [Electron] Deleted key from fallback file');
      cleared = true;
    }

    return cleared;
  } catch (error) {
    console.error('❌ [Electron] فشل حذف مفتاح الجلسة الآمن:', error);
    return false;
  }
}

console.log('[Electron] كشف وضع التطوير:');
console.log('  - NODE_ENV:', process.env.NODE_ENV);
console.log('  - argv includes --dev:', process.argv.includes('--dev'));
console.log('  - dist/index.html exists:', fs.existsSync(path.join(__dirname, '../dist/index.html')));
console.log('  - ELECTRON_IS_DEV:', process.env.ELECTRON_IS_DEV);
console.log('  - isDev result:', isDev);

// إعدادات التطبيق
let mainWindow;
let splashWindow;
let tray;
let isQuitting = false;

// مدير قاعدة البيانات SQLite
let sqliteManager = null;
// مدير منفصل لقاعدة Global لتخزين الحالة الآمنة والترخيص بدون تبديل قاعدة المنظمة
let sqliteManagerGlobal = null;

// إنشاء نافذة Splash Screen
function createSplashWindow() {
  const splashPath = path.join(__dirname, 'splash.html');

  splashWindow = new BrowserWindow({
    width: 500,
    height: 600,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    movable: false,
    center: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  splashWindow.loadFile(splashPath);
  splashWindow.setIgnoreMouseEvents(false);

  // إخفاء شريط القوائم في splash
  splashWindow.setMenuBarVisibility(false);

  return splashWindow;
}

// إنشاء النافذة الرئيسية
function createMainWindow() {
  const iconPath = path.join(__dirname, '../assets/icon.png');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    maxWidth: 2560,
    maxHeight: 1600,
    icon: iconPath,
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    titleBarOverlay: {
      color: '#0f172a',
      symbolColor: '#ffffff',
      height: 48
    },
    // إعدادات شريط العنوان لـ Windows
    title: 'سطوكيها - منصة إدارة المتاجر',
    // إعدادات التحكم في النافذة
    resizable: true,
    movable: true,
    minimizable: true,
    maximizable: true,
    closable: true,
    alwaysOnTop: false,
    skipTaskbar: false,
    fullscreenable: true,
    // إعدادات إضافية للتحكم
    frame: false,
    transparent: false,
    hasShadow: true,
    thickFrame: true,
    // إعدادات خاصة بـ Windows
    autoHideMenuBar: true,
    // إعدادات خاصة بـ macOS
    vibrancy: isMac ? 'under-window' : undefined,
    visualEffectState: isMac ? 'active' : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // تعطيل sandbox لتحميل الموارد المحلية
      enableRemoteModule: false,
      // ✅ استخدام preload script الآمن والمحسن - تحسينات أمنية رئيسية
      preload: path.join(__dirname, 'preload.secure.cjs'),
      webSecurity: true, // تفعيل دوماً لتفادي تحذيرات الأمان
      allowRunningInsecureContent: false,
      experimentalFeatures: false
    },
    show: false, // إخفاء النافذة حتى تحميل المحتوى
    backgroundColor: '#1a1a1a'
  });

  // تحميل التطبيق
  console.log('[Electron] بدء تحميل التطبيق...');
  console.log('[Electron] isDev:', isDev);
  console.log('[Electron] __dirname:', __dirname);

  if (isDev) {
    // في التطوير: حمّل الجذر ودع الموجه يقرر (يتجنب مسارات مطلقة تسبب 404)
    const devUrl = 'http://localhost:8080/';
    console.log('[Electron] تحميل التطبيق المكتبي من:', devUrl);

    // التحقق من اتصال الشبكة قبل محاولة التحميل
    const checkAndLoad = async () => {
      try {
        // محاولة التحميل
        await mainWindow.loadURL(devUrl);
      } catch (err) {
        console.error('[Electron] فشل تحميل dev server:', err.message);

        // عرض صفحة خطأ محلية
        const offlineHtml = `
          <!DOCTYPE html>
          <html dir="rtl" lang="ar">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>خطأ في الاتصال - سطوكيها</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: 'Tajawal', 'Segoe UI', Tahoma, sans-serif;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                color: #fff;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
              }
              .container {
                text-align: center;
                max-width: 500px;
              }
              .icon {
                font-size: 80px;
                margin-bottom: 20px;
                opacity: 0.8;
              }
              h1 {
                font-size: 28px;
                margin-bottom: 16px;
                color: #f0f0f0;
              }
              p {
                font-size: 16px;
                color: #a0a0a0;
                margin-bottom: 24px;
                line-height: 1.6;
              }
              .hint {
                background: rgba(255,255,255,0.1);
                padding: 16px;
                border-radius: 12px;
                font-size: 14px;
                color: #c0c0c0;
                margin-bottom: 24px;
              }
              .hint code {
                background: rgba(0,0,0,0.3);
                padding: 2px 8px;
                border-radius: 4px;
                font-family: monospace;
              }
              button {
                background: #6366f1;
                color: white;
                border: none;
                padding: 14px 32px;
                font-size: 16px;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
                font-family: inherit;
              }
              button:hover {
                background: #4f46e5;
                transform: translateY(-2px);
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">🔌</div>
              <h1>تعذر الاتصال بخادم التطوير</h1>
              <p>لا يمكن الاتصال بـ localhost:8080</p>
              <div class="hint">
                <strong>في وضع التطوير:</strong><br>
                تأكد من تشغيل <code>npm run dev</code> أولاً<br><br>
                <strong>للاختبار أوفلاين:</strong><br>
                قم ببناء التطبيق بـ <code>npm run build</code>
              </div>
              <button onclick="location.reload()">إعادة المحاولة</button>
            </div>
          </body>
          </html>
        `;
        mainWindow.loadURL('data:text/html;charset=UTF-8,' + encodeURIComponent(offlineHtml));
      }
    };

    checkAndLoad();

    // فتح DevTools دائماً في التطوير
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // تحميل التطبيق من dist باستخدام file:// URL
    const distPath = path.resolve(__dirname, '../dist');
    const indexPath = path.join(distPath, 'index.html');
    const indexUrl = `file://${indexPath}`;

    console.log('[Electron] مسار dist:', distPath);
    console.log('[Electron] مسار index:', indexPath);
    console.log('[Electron] URL:', indexUrl);

    // تحميل index.html - RoleBasedRedirect سيوجه المستخدم غير المسجل إلى /login تلقائياً
    mainWindow.loadURL(indexUrl);

    // إضافة fallback لأي مسار غير موجود - تحميل index.html (SPA fallback)
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.log('[Electron] فشل التحميل:', errorCode, errorDescription, validatedURL);
      // أي محاولة تحميل غير file:// أو ملف محلي غير index → أعد تحميل index
      try {
        if (!validatedURL) {
          mainWindow.loadURL(indexUrl);
          return;
        }
        const urlObj = new URL(validatedURL);
        const isFile = urlObj.protocol === 'file:';
        const isIndex = decodeURI(urlObj.pathname || '').endsWith('/index.html');
        if (!isFile || !isIndex) {
          mainWindow.loadURL(indexUrl);
        }
      } catch {
        mainWindow.loadURL(indexUrl);
      }
    });
  }

  // إظهار النافذة عند تحميل المحتوى
  mainWindow.once('ready-to-show', () => {
    console.log('[Electron] النافذة جاهزة للعرض');

    // الانتظار لمدة ثانيتين على الأقل لعرض splash screen (حتى لو تم التحميل بسرعة)
    // ثم إغلاق splash window وإظهار النافذة الرئيسية بشكل سلس
    const minSplashTime = 2000; // ثانيتان
    const startTime = Date.now();
    const elapsedTime = startTime - (global.appStartTime || startTime);
    const remainingTime = Math.max(0, minSplashTime - elapsedTime);

    setTimeout(() => {
      // إغلاق splash window بشكل سلس
      if (splashWindow && !splashWindow.isDestroyed()) {
        // تأثير fade out للـ splash
        let opacity = 1.0;
        const fadeInterval = setInterval(() => {
          opacity -= 0.1;
          if (opacity <= 0) {
            clearInterval(fadeInterval);
            splashWindow.close();
            splashWindow = null;

            // إظهار النافذة الرئيسية بتأثير fade in
            mainWindow.setOpacity(0);
            mainWindow.show();
            let mainOpacity = 0;
            const fadeInInterval = setInterval(() => {
              mainOpacity += 0.1;
              mainWindow.setOpacity(mainOpacity);
              if (mainOpacity >= 1) {
                clearInterval(fadeInInterval);
                mainWindow.setOpacity(1);
              }
            }, 30);
          } else {
            splashWindow.setOpacity(opacity);
          }
        }, 30);
      } else {
        mainWindow.show();
      }

      // التأكد من ظهور شريط العنوان على Windows
      mainWindow.setMenuBarVisibility(false);
      mainWindow.setAutoHideMenuBar(true);

      // فتح DevTools دائماً للتشخيص
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }, remainingTime);
  });

  // ===== حماية أمنية: منع الوصول إلى صفحات السوبر أدمين =====
  // قائمة المسارات المحظورة في Electron (Super Admin only routes)
  const BLOCKED_PATHS = [
    '/super-admin',
    '/super-admin/login',
    '/super-admin/dashboard',
    '/super-admin/organizations',
    '/super-admin/subscriptions',
    '/super-admin/payment-methods',
    '/super-admin/activation-codes',
    '/super-admin/yalidine-sync'
  ];

  // ===== دالة موحدة للتحقق من المسارات المحظورة =====
  const isBlockedPath = (pathname) => {
    return BLOCKED_PATHS.some(blockedPath =>
      pathname === blockedPath || pathname.startsWith(blockedPath + '/')
    );
  };

  // ===== دالة موحدة لمعالجة المسارات المحظورة =====
  const handleBlockedPath = (pathname) => {
    console.warn('[Electron Security] محاولة الوصول إلى صفحة محظورة:', pathname);

    // إعادة التوجيه إلى الصفحة الرئيسية
    if (isDev) {
      mainWindow.loadURL('http://localhost:8080/');
    } else {
      mainWindow.loadURL(`file://${path.join(__dirname, '../dist/index.html')}`);
    }

    // إظهار رسالة تحذير للمستخدم
    dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: 'وصول محظور',
      message: 'غير مسموح بالوصول إلى لوحة السوبر أدمين',
      detail: 'لوحة السوبر أدمين متاحة فقط عبر المتصفح الويب. يرجى استخدام متصفح الويب للوصول إلى هذه الصفحة.',
      buttons: ['حسناً']
    });
  };

  // ===== معالج موحد لجميع عمليات التنقل =====
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsedUrl = new URL(navigationUrl);
      const pathname = parsedUrl.pathname || parsedUrl.hash.replace('#', '');

      // 1. التحقق من المسارات المحظورة (Super Admin)
      if (isBlockedPath(pathname)) {
        event.preventDefault();
        handleBlockedPath(pathname);
        return;
      }

      // 2. معالجة التنقل حسب البيئة
      if (isDev) {
        const isLocalDev = parsedUrl.protocol === 'http:' && parsedUrl.host === 'localhost:8080';
        if (!isLocalDev) {
          event.preventDefault();
          shell.openExternal(navigationUrl);
        }
        return;
      }

      // 3. في الإنتاج: لا نسمح إلا بالتنقل داخل index.html (HashRouter يدير الباقي)
      if (parsedUrl.protocol !== 'file:') {
        event.preventDefault();
        shell.openExternal(navigationUrl);
        return;
      }

      // 4. منع تحميل file:///login أو أي ملف محلي غير index.html
      const distPath = path.resolve(__dirname, '../dist');
      const indexPath = path.join(distPath, 'index.html');
      const indexUrl = `file://${indexPath}`;
      const isIndex = decodeURI(pathname).endsWith('/index.html');
      if (!isIndex) {
        event.preventDefault();
        mainWindow.loadURL(indexUrl);
      }
    } catch (e) {
      console.warn('[Electron] will-navigate parsing failed:', e);
      event.preventDefault();
    }
  });

  // معالج إضافي للتحقق بعد التنقل (did-navigate)
  mainWindow.webContents.on('did-navigate', (event, navigationUrl) => {
    try {
      const url = new URL(navigationUrl);
      const pathname = url.pathname || url.hash.replace('#', '');

      if (isBlockedPath(pathname)) {
        console.warn('[Electron Security] تم اكتشاف محاولة تحميل صفحة محظورة:', pathname);
        handleBlockedPath(pathname);
      }
    } catch (error) {
      console.error('[Electron Security] خطأ في التحقق من التنقل:', error);
    }
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Electron] انتهى التحميل بنجاح');

    // التحقق الإضافي: حقن JavaScript للتحقق من المسار الحالي
    mainWindow.webContents.executeJavaScript(`
      (function() {
        const currentPath = window.location.pathname || window.location.hash.replace('#', '');
        const blockedPaths = ${JSON.stringify(BLOCKED_PATHS)};
        const isBlocked = blockedPaths.some(path =>
          currentPath === path || currentPath.startsWith(path + '/')
        );

        if (isBlocked) {
          console.warn('[Electron Security] صفحة محظورة تم اكتشافها، إعادة التوجيه...');
          window.location.href = '/';
        }
      })();
    `).catch(err => {
      console.error('[Electron Security] خطأ في حقن JavaScript للتحقق:', err);
    });
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[Electron] فشل في التحميل:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('dom-ready', () => {
    console.log('[Electron] DOM جاهز');
  });

  // إدارة إغلاق النافذة
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();

      // إظهار إشعار على macOS
      if (isMac) {
        app.dock.hide();
      }
    }
  });

  // منع التنقل الخارجي
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  return mainWindow;
}

// إنشاء التطبيق
function createApp() {
  // عرض splash screen والبدء فوراً بتحميل التطبيق في نفس الوقت
  createSplashWindow();

  // البدء فوراً بتحميل النافذة الرئيسية بشكل متوازي (بدون انتظار)
  // التحميل يحدث في الخلفية بينما splash يعرض في المقدمة
  createMainWindow();
  createMenu();
  createTray();
  registerGlobalShortcuts();

  // تهيئة مدير الطباعة الموحد
  printManager.initialize();
}

// إنشاء القائمة
function createMenu() {
  const template = [
    {
      label: 'ملف',
      submenu: [
        {
          label: 'جديد',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new');
          }
        },
        {
          label: 'فتح',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openFile'],
              filters: [
                { name: 'ملفات سطوكيها', extensions: ['json'] },
                { name: 'جميع الملفات', extensions: ['*'] }
              ]
            });

            if (!result.canceled) {
              mainWindow.webContents.send('menu-open-file', result.filePaths[0]);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'إعدادات',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            mainWindow.webContents.send('menu-settings');
          }
        },
        { type: 'separator' },
        {
          label: isMac ? 'إخفاء سطوكيها' : 'تصغير',
          accelerator: isMac ? 'Cmd+H' : 'Ctrl+M',
          click: () => {
            if (isMac) {
              app.hide();
            } else {
              mainWindow.minimize();
            }
          }
        },
        {
          label: isMac ? 'إخفاء الآخرين' : 'إخفاء',
          accelerator: isMac ? 'Cmd+Alt+H' : 'Ctrl+H',
          click: () => {
            if (isMac) {
              Menu.sendActionToFirstResponder('hideOtherApplications:');
            } else {
              mainWindow.hide();
            }
          }
        },
        {
          label: 'إغلاق',
          accelerator: 'CmdOrCtrl+W',
          click: () => {
            mainWindow.close();
          }
        }
      ]
    },
    {
      label: 'تحرير',
      submenu: [
        { label: 'تراجع', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'إعادة', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'قص', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'نسخ', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'لصق', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: 'تحديد الكل', accelerator: 'CmdOrCtrl+A', role: 'selectall' }
      ]
    },
    {
      label: 'عرض',
      submenu: [
        {
          label: 'إعادة تحميل',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow.reload();
          }
        },
        {
          label: 'إعادة تحميل قسري',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            mainWindow.webContents.reloadIgnoringCache();
          }
        },
        {
          label: 'تطوير',
          accelerator: 'F12',
          click: () => {
            mainWindow.webContents.toggleDevTools();
          }
        },
        { type: 'separator' },
        {
          label: 'تكبير',
          accelerator: 'CmdOrCtrl+Plus',
          click: () => {
            const currentZoom = mainWindow.webContents.getZoomLevel();
            mainWindow.webContents.setZoomLevel(currentZoom + 0.5);
          }
        },
        {
          label: 'تصغير',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            const currentZoom = mainWindow.webContents.getZoomLevel();
            mainWindow.webContents.setZoomLevel(currentZoom - 0.5);
          }
        },
        {
          label: 'حجم طبيعي',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            mainWindow.webContents.setZoomLevel(0);
          }
        },
        { type: 'separator' },
        {
          label: 'ملء الشاشة',
          accelerator: isMac ? 'Ctrl+Cmd+F' : 'F11',
          click: () => {
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
          }
        }
      ]
    },
    {
      label: 'نافذة',
      submenu: [
        {
          label: 'تصغير',
          accelerator: 'CmdOrCtrl+M',
          click: () => {
            mainWindow.minimize();
          }
        },
        {
          label: 'تكبير',
          accelerator: isMac ? 'Ctrl+Cmd+F' : 'F11',
          click: () => {
            if (mainWindow.isMaximized()) {
              mainWindow.unmaximize();
            } else {
              mainWindow.maximize();
            }
          }
        },
        {
          label: 'إغلاق',
          accelerator: 'CmdOrCtrl+W',
          click: () => {
            mainWindow.close();
          }
        }
      ]
    },
    {
      label: 'مساعدة',
      submenu: [
        {
          label: 'حول سطوكيها',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'حول سطوكيها',
              message: 'سطوكيها - منصة إدارة المتاجر الذكية',
              detail: 'الإصدار 2.0.0\nمنصة شاملة لإدارة المتاجر تجمع بين نقطة البيع والمتجر الإلكتروني وإدارة المخزون.',
              buttons: ['موافق']
            });
          }
        },
        {
          label: 'دليل المستخدم',
          click: () => {
            shell.openExternal('https://stockiha.com/docs');
          }
        },
        {
          label: 'الدعم الفني',
          click: () => {
            shell.openExternal('https://stockiha.com/support');
          }
        },
        { type: 'separator' },
        {
          label: 'أدوات المطور',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => {
            mainWindow.webContents.toggleDevTools();
          }
        }
      ]
    }
  ];

  // إضافة قائمة التطبيق على macOS
  if (isMac) {
    template.unshift({
      label: app.getName(),
      submenu: [
        {
          label: 'حول ' + app.getName(),
          role: 'about'
        },
        { type: 'separator' },
        {
          label: 'خدمات',
          role: 'services',
          submenu: []
        },
        { type: 'separator' },
        {
          label: 'إخفاء ' + app.getName(),
          accelerator: 'Command+H',
          role: 'hide'
        },
        {
          label: 'إخفاء الآخرين',
          accelerator: 'Command+Shift+H',
          role: 'hideothers'
        },
        {
          label: 'إظهار الكل',
          role: 'unhide'
        },
        { type: 'separator' },
        {
          label: 'إنهاء ' + app.getName(),
          accelerator: 'Command+Q',
          role: 'quit'
        }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// إنشاء التراى
function createTray() {
  const iconPath = path.join(__dirname, '../assets/tray-icon.png');
  const icon = nativeImage.createFromPath(iconPath);

  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'إظهار سطوكيها',
      click: () => {
        mainWindow.show();
        if (isMac) {
          app.dock.show();
        }
      }
    },
    {
      label: 'إخفاء',
      click: () => {
        mainWindow.hide();
        if (isMac) {
          app.dock.hide();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'خروج',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip('سطوكيها - منصة إدارة المتاجر');

  // إظهار النافذة عند النقر على التراى
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
      if (isMac) {
        app.dock.hide();
      }
    } else {
      mainWindow.show();
      if (isMac) {
        app.dock.show();
      }
    }
  });
}

// تسجيل الاختصارات العامة
function registerGlobalShortcuts() {
  // اختصار لإظهار/إخفاء التطبيق
  globalShortcut.register('CmdOrCtrl+Shift+S', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
      if (isMac) {
        app.dock.hide();
      }
    } else {
      mainWindow.show();
      if (isMac) {
        app.dock.show();
      }
    }
  });

  // اختصارات إضافية للتحكم في النافذة
  globalShortcut.register('CmdOrCtrl+Shift+C', () => {
    mainWindow.center();
  });

  globalShortcut.register('CmdOrCtrl+Shift+F', () => {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  });

  globalShortcut.register('CmdOrCtrl+Shift+T', () => {
    mainWindow.setAlwaysOnTop(!mainWindow.isAlwaysOnTop());
  });

  globalShortcut.register('CmdOrCtrl+Shift+R', () => {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    if (isMac) {
      app.dock.show();
    }
  });
}

// إدارة الأحداث
app.whenReady().then(() => {
  // تسجيل وقت بدء التطبيق
  global.appStartTime = Date.now();

  createApp();

  // تهيئة نظام التحديث التلقائي (فقط في الإنتاج)
  if (!isDev) {
    updaterManager.initialize(mainWindow);
    console.log('[Electron] نظام التحديث التلقائي تم تفعيله');
  } else {
    console.log('[Electron] نظام التحديث معطل في وضع التطوير');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ⚡ MEMORY MONITORING - مراقبة الذاكرة وتنظيفها التلقائي
  // ═══════════════════════════════════════════════════════════════════════════
  const MEMORY_CHECK_INTERVAL = 60000; // فحص كل دقيقة
  const MEMORY_WARNING_THRESHOLD = 400 * 1024 * 1024; // 400MB تحذير
  const MEMORY_CRITICAL_THRESHOLD = 600 * 1024 * 1024; // 600MB حرج

  let memoryCheckInterval = null;
  let lastGCTime = 0;
  const GC_COOLDOWN = 30000; // 30 ثانية بين كل GC

  const checkMemoryUsage = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    try {
      const processMemory = process.memoryUsage();
      const heapUsed = processMemory.heapUsed;

      // طباعة حالة الذاكرة (في التطوير فقط)
      if (isDev) {
        console.log(`[Memory] Heap: ${Math.round(heapUsed / 1024 / 1024)}MB / RSS: ${Math.round(processMemory.rss / 1024 / 1024)}MB`);
      }

      // تحذير عند استخدام ذاكرة عالية
      if (heapUsed > MEMORY_WARNING_THRESHOLD) {
        console.warn(`⚠️ [Memory] High memory usage: ${Math.round(heapUsed / 1024 / 1024)}MB`);

        // محاولة تنظيف الذاكرة
        const now = Date.now();
        if (now - lastGCTime > GC_COOLDOWN) {
          lastGCTime = now;

          // تنظيف cache الـ webContents
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.session.clearCache().catch(() => { });
          }

          // محاولة استدعاء GC (إذا كان متاحاً)
          if (global.gc) {
            try {
              global.gc();
              console.log('✅ [Memory] Garbage collection triggered');
            } catch (e) {
              // GC غير متاح
            }
          }
        }
      }

      // حالة حرجة - إرسال تحذير للـ renderer
      if (heapUsed > MEMORY_CRITICAL_THRESHOLD) {
        console.error(`🚨 [Memory] CRITICAL: ${Math.round(heapUsed / 1024 / 1024)}MB`);

        // إرسال رسالة للـ renderer لتنظيف الـ cache
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('memory-pressure', {
            level: 'critical',
            heapUsedMB: Math.round(heapUsed / 1024 / 1024),
          });
        }
      }
    } catch (error) {
      console.error('[Memory] Error checking memory:', error.message);
    }
  };

  // بدء مراقبة الذاكرة
  memoryCheckInterval = setInterval(checkMemoryUsage, MEMORY_CHECK_INTERVAL);

  // تنظيف عند إغلاق التطبيق
  app.on('will-quit', () => {
    if (memoryCheckInterval) {
      clearInterval(memoryCheckInterval);
      memoryCheckInterval = null;
    }
  });

  console.log('⚡ [Memory] Memory monitoring started');
  // ═══════════════════════════════════════════════════════════════════════════

  // إظهار النافذة عند النقر على أيقونة التطبيق على macOS
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    } else {
      mainWindow.show();
      if (isMac) {
        app.dock.show();
      }
    }
  });
});

// إدارة إغلاق التطبيق
app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

// تنظيف الاختصارات عند إغلاق التطبيق
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  // تنظيف نظام التحديث
  if (!isDev) {
    updaterManager.cleanup();
  }
});

// معالج موحد لجميع web-contents (منع نوافذ متعددة والتنقل الخارجي)
app.on('web-contents-created', (event, contents) => {
  // منع نوافذ جديدة
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });

  // منع التنقل الخارجي
  contents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsedUrl = new URL(navigationUrl);
      if (isDev) {
        const isLocalDev = parsedUrl.protocol === 'http:' && parsedUrl.host === 'localhost:8080';
        if (!isLocalDev) {
          event.preventDefault();
        }
        return;
      }
      // في الإنتاج: لا نسمح إلا بـ file: (وسيتم التعامل مع non-index في createMainWindow)
      if (parsedUrl.protocol !== 'file:') {
        event.preventDefault();
      }
    } catch {
      event.preventDefault();
    }
  });
});

// إدارة IPC
ipcMain.handle('app-version', () => {
  return app.getVersion();
});

ipcMain.handle('app-name', () => {
  return app.getName();
});

ipcMain.handle('show-message-box', async (event, options) => {
  const result = await dialog.showMessageBox(mainWindow, options);
  return result;
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

// إدارة الإشعارات
ipcMain.handle('show-notification', (event, options) => {
  if (isMac) {
    // على macOS، استخدم إشعارات النظام
    new Notification(options.title, {
      body: options.body,
      icon: path.join(__dirname, '../assets/icon.png')
    });
  } else {
    // على Windows، استخدم إشعارات النظام
    new Notification(options.title, {
      body: options.body,
      icon: path.join(__dirname, '../assets/icon.png')
    });
  }
});

// إدارة الملفات
ipcMain.handle('read-file', async (event, filePath) => {
  const fs = require('fs').promises;
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('write-file', async (event, filePath, data) => {
  const fs = require('fs').promises;
  try {
    await fs.writeFile(filePath, data, 'utf8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// إدارة النظام
ipcMain.handle('get-system-info', () => {
  return {
    platform: process.platform,
    arch: process.arch,
    version: process.version,
    electronVersion: process.versions.electron,
    appVersion: app.getVersion()
  };
});

// ======= IPC Handlers لقاعدة بيانات SQLite =======

// تهيئة قاعدة البيانات
ipcMain.handle('db:initialize', async (event, organizationId) => {
  try {
    if (!sqliteManager) {
      sqliteManager = new SQLiteManager(app);
    }
    const result = sqliteManager.initialize(organizationId);
    console.log('[IPC] Database initialized:', result);
    return result;
  } catch (error) {
    console.error('[IPC] Database initialization failed:', error);
    return { success: false, error: error.message };
  }
});

// استعلام عام
ipcMain.handle('db:query', async (event, sql, params) => {
  try {
    if (!sqliteManager || !sqliteManager.isInitialized) {
      return { success: false, error: 'Database not initialized', data: [] };
    }
    return sqliteManager.query(sql, params);
  } catch (error) {
    console.error('[IPC] Query failed:', error);
    return { success: false, error: error.message, data: [] };
  }
});

// استعلام لعنصر واحد
ipcMain.handle('db:query-one', async (event, sql, params) => {
  try {
    if (!sqliteManager || !sqliteManager.isInitialized) {
      return { success: false, error: 'Database not initialized', data: null };
    }
    return sqliteManager.queryOne(sql, params);
  } catch (error) {
    console.error('[IPC] QueryOne failed:', error);
    return { success: false, error: error.message, data: null };
  }
});

// تنفيذ عمليات UPDATE/INSERT/DELETE
ipcMain.handle('db:execute', async (event, sql, params) => {
  try {
    if (!sqliteManager || !sqliteManager.isInitialized) {
      return { success: false, error: 'Database not initialized', changes: 0 };
    }
    return sqliteManager.execute(sql, params);
  } catch (error) {
    console.error('[IPC] Execute failed:', error);
    return { success: false, error: error.message, changes: 0 };
  }
});

// إضافة أو تحديث بيانات عامة
ipcMain.handle('db:upsert', async (event, table, data) => {
  try {
    if (!sqliteManager || !sqliteManager.isInitialized) {
      return { success: false, error: 'Database not initialized' };
    }
    return sqliteManager.upsert(table, data);
  } catch (error) {
    console.error('[IPC] Upsert failed:', error);
    return { success: false, error: error.message };
  }
});

// حذف سجل
ipcMain.handle('db:delete', async (event, table, id) => {
  try {
    if (!sqliteManager || !sqliteManager.isInitialized) {
      return { success: false, error: 'Database not initialized' };
    }
    return sqliteManager.delete(table, id);
  } catch (error) {
    console.error('[IPC] Delete failed:', error);
    return { success: false, error: error.message };
  }
});



// ======= IPC Handlers للساعة الآمنة والترخيص =======
function ensureGlobalDB() {
  if (!sqliteManagerGlobal) {
    sqliteManagerGlobal = new SQLiteManager(app);
  }
  const res = sqliteManagerGlobal.initialize('global');
  if (!res || res.success !== true) {
    throw new Error(res?.error || 'Failed to initialize global DB');
  }
  return sqliteManagerGlobal;
}

// تثبيت المرساة من وقت السيرفر
ipcMain.handle('license:set-anchor', async (event, organizationId, serverNowMs) => {
  try {
    const mgr = ensureGlobalDB();
    const nowIso = new Date().toISOString();
    const id = organizationId || 'global';
    // قراءة سجل سابق
    const existing = mgr.queryOne(`SELECT * FROM app_license_state WHERE id = ?`, [id]);
    if (!existing.success) {
      return { success: false, error: existing.error || 'query failed' };
    }
    const row = existing.data;
    const secure_anchor_ms = Math.max(Number(row?.secure_anchor_ms || 0), Number(serverNowMs || 0));
    const payload = {
      id,
      organization_id: organizationId || null,
      secure_anchor_ms,
      last_device_time_ms: Date.now(),
      last_server_time_ms: Number(serverNowMs || 0),
      last_observed_device_time_ms: row?.last_observed_device_time_ms || 0,
      last_secure_ms: row?.last_secure_ms || 0,
      tamper_count: row?.tamper_count || 0,
      created_at: row?.created_at || nowIso,
      updated_at: nowIso
    };
    const up = mgr.upsert('app_license_state', payload);
    try {
      console.log('[SECURE CLOCK] set-anchor', {
        id,
        serverNowMs: Number(serverNowMs || 0),
        prevAnchor: Number(row?.secure_anchor_ms || 0),
        nextAnchor: Number(payload.secure_anchor_ms || 0),
        lastDevice: Number(payload.last_device_time_ms || 0),
        lastServer: Number(payload.last_server_time_ms || 0)
      });
    } catch { }
    if (!up.success) return { success: false, error: up.error || 'upsert failed' };
    return { success: true };
  } catch (error) {
    console.error('[IPC] license:set-anchor failed:', error);
    return { success: false, error: error.message };
  }
});

// حساب الوقت الآمن المحلي (غير متناقص) مع كشف التلاعب
ipcMain.handle('license:get-secure-now', async (event, organizationId) => {
  try {
    const mgr = ensureGlobalDB();
    const id = organizationId || 'global';
    const nowIso = new Date().toISOString();
    const deviceNow = Date.now();
    const existing = mgr.queryOne(`SELECT * FROM app_license_state WHERE id = ?`, [id]);
    if (!existing.success) {
      return { success: false, error: existing.error || 'query failed' };
    }
    let row = existing.data;
    if (!row) {
      // إنشاء سجل جديد بمرساة صفرية
      const initPayload = {
        id,
        organization_id: organizationId || null,
        secure_anchor_ms: 0,
        last_device_time_ms: deviceNow,
        last_server_time_ms: 0,
        last_observed_device_time_ms: deviceNow,
        last_secure_ms: 0,
        tamper_count: 0,
        created_at: nowIso,
        updated_at: nowIso
      };
      const up = mgr.upsert('app_license_state', initPayload);
      if (!up.success) return { success: false, error: up.error || 'init upsert failed' };
      row = initPayload;
    }

    // تطبيع الوحدات: تأكد أن كل القيم بالـ milliseconds حتى لو كانت مخزنة قديماً بالثواني/الميكروثواني
    const normalizeTs = (v) => {
      let n = Number(v || 0);
      if (!Number.isFinite(n) || n <= 0) return 0;
      if (n > 1e16) return Math.floor(n / 1e6);   // nanoseconds -> ms
      if (n > 1e13) return Math.floor(n / 1e3);   // microseconds -> ms
      if (n < 1e12) return Math.floor(n * 1000);  // seconds -> ms (also handles very small values)
      return Math.floor(n);                        // already ms
    };

    const anchorRaw = row.secure_anchor_ms;
    const anchorDeviceRaw = row.last_device_time_ms;
    const lastObservedRaw = row.last_observed_device_time_ms;
    const lastSecureRaw = row.last_secure_ms;
    const tamperCount = Number(row.tamper_count || 0);

    const anchor = normalizeTs(anchorRaw);
    const anchorDeviceNorm = normalizeTs(anchorDeviceRaw);
    const lastObserved = normalizeTs(lastObservedRaw);
    const lastSecure = normalizeTs(lastSecureRaw);

    const tamperDetected = deviceNow < lastObserved;
    // تجنب delta سالبة في حال كانت قيمة baseline أكبر من now (نتيجة وحدات خاطئة قديمة)
    const baseDevice = Math.min(anchorDeviceNorm || deviceNow, deviceNow);
    const delta = Math.max(0, deviceNow - baseDevice);
    let secureNowMs;
    if (anchor > 0) {
      const candidate = anchor + delta;
      secureNowMs = Math.max(lastSecure, candidate);
    } else {
      // لا توجد مرساة بعد: استخدم وقت الجهاز المطلق كخط أساس غير متناقص
      const candidateAbs = Math.max(deviceNow, lastObserved);
      secureNowMs = Math.max(lastSecure, candidateAbs);
    }

    const newRow = {
      id,
      organization_id: row.organization_id || organizationId || null,
      secure_anchor_ms: anchor,
      last_device_time_ms: baseDevice,
      last_server_time_ms: Number(row.last_server_time_ms || 0),
      last_observed_device_time_ms: Math.max(lastObserved, deviceNow),
      last_secure_ms: secureNowMs,
      tamper_count: tamperDetected ? (tamperCount + 1) : tamperCount,
      created_at: row.created_at || nowIso,
      updated_at: nowIso
    };
    const up = mgr.upsert('app_license_state', newRow);
    try {
      console.log('[SECURE CLOCK] get-secure-now', {
        id,
        deviceNow,
        anchorRaw,
        anchor,
        anchorDeviceRaw,
        anchorDeviceNorm,
        lastObservedRaw,
        lastObserved,
        lastSecureRaw,
        lastSecure,
        delta,
        usedFallback: anchor === 0,
        secureNowMs,
        tamperDetected,
        tamperCountBefore: tamperCount,
        tamperCountAfter: newRow.tamper_count
      });
    } catch { }
    if (!up.success) return { success: false, error: up.error || 'update upsert failed' };

    return { success: true, secureNowMs, tamperDetected, tamperCount: newRow.tamper_count };
  } catch (error) {
    console.error('[IPC] license:get-secure-now failed:', error);
    return { success: false, error: error.message };
  }
});

// إضافة أو تحديث منتج
ipcMain.handle('db:upsert-product', async (event, product) => {
  try {
    if (!sqliteManager || !sqliteManager.isInitialized) {
      return { success: false, error: 'Database not initialized' };
    }
    return sqliteManager.addProduct(product);
  } catch (error) {
    console.error('[IPC] Upsert product failed:', error);
    return { success: false, error: error.message };
  }
});

// البحث عن منتجات
ipcMain.handle('db:search-products', async (event, query, options) => {
  try {
    if (!sqliteManager || !sqliteManager.isInitialized) {
      return { success: false, error: 'Database not initialized', data: [] };
    }
    return sqliteManager.search('products', query, options);
  } catch (error) {
    console.error('[IPC] Search products failed:', error);
    return { success: false, error: error.message, data: [] };
  }
});

// إضافة طلب POS
ipcMain.handle('db:add-pos-order', async (event, order, items) => {
  try {
    if (!sqliteManager || !sqliteManager.isInitialized) {
      return { success: false, error: 'Database not initialized' };
    }
    return sqliteManager.addPOSOrder(order, items);
  } catch (error) {
    console.error('[IPC] Add POS order failed:', error);
    return { success: false, error: error.message };
  }
});

// الحصول على إحصائيات
ipcMain.handle('db:get-statistics', async (event, organizationId, dateFrom, dateTo) => {
  try {
    if (!sqliteManager || !sqliteManager.isInitialized) {
      return { success: false, error: 'Database not initialized' };
    }
    return sqliteManager.getStatistics(organizationId, dateFrom, dateTo);
  } catch (error) {
    console.error('[IPC] Get statistics failed:', error);
    return { success: false, error: error.message };
  }
});

// تنظيف البيانات القديمة
ipcMain.handle('db:cleanup-old-data', async (event, daysToKeep) => {
  try {
    if (!sqliteManager || !sqliteManager.isInitialized) {
      return { success: false, error: 'Database not initialized' };
    }
    return sqliteManager.cleanupOldData(daysToKeep || 30);
  } catch (error) {
    console.error('[IPC] Cleanup failed:', error);
    return { success: false, error: error.message };
  }
});

// ضغط قاعدة البيانات
ipcMain.handle('db:vacuum', async () => {
  try {
    if (!sqliteManager || !sqliteManager.isInitialized) {
      return { success: false, error: 'Database not initialized' };
    }
    return sqliteManager.vacuum();
  } catch (error) {
    console.error('[IPC] Vacuum failed:', error);
    return { success: false, error: error.message };
  }
});

// حجم قاعدة البيانات
ipcMain.handle('db:get-size', async () => {
  try {
    if (!sqliteManager || !sqliteManager.isInitialized) {
      return { success: false, error: 'Database not initialized', size: 0 };
    }
    const size = sqliteManager.getDatabaseSize();
    return { success: true, size };
  } catch (error) {
    console.error('[IPC] Get size failed:', error);
    return { success: false, error: error.message, size: 0 };
  }
});

// نسخ احتياطي
ipcMain.handle('db:backup', async (event, destinationPath) => {
  try {
    if (!sqliteManager || !sqliteManager.isInitialized) {
      return { success: false, error: 'Database not initialized' };
    }
    return sqliteManager.backup(destinationPath);
  } catch (error) {
    console.error('[IPC] Backup failed:', error);
    return { success: false, error: error.message };
  }
});

// استعادة من نسخة احتياطية
ipcMain.handle('db:restore', async (event, backupPath) => {
  try {
    if (!sqliteManager) {
      sqliteManager = new SQLiteManager(app);
    }
    return sqliteManager.restore(backupPath);
  } catch (error) {
    console.error('[IPC] Restore failed:', error);
    return { success: false, error: error.message };
  }
});

// إغلاق قاعدة البيانات
ipcMain.handle('db:close', async () => {
  try {
    if (sqliteManager) {
      sqliteManager.close();
      sqliteManager = null;
    }
    return { success: true };
  } catch (error) {
    console.error('[IPC] Close failed:', error);
    return { success: false, error: error.message };
  }
});

// ============================================================================
// Image Download Handler
// ============================================================================
ipcMain.handle('download-image', async (event, url, entityType, entityId) => {
  try {
    if (!url || !entityType || !entityId) {
      return { success: false, error: 'Missing parameters' };
    }

    const imagesDir = path.join(app.getPath('userData'), 'images', entityType);
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    // Generate filename from URL hash to avoid duplicates and weird chars
    const ext = path.extname(url).split('?')[0] || '.jpg';
    const hash = crypto.createHash('md5').update(url).digest('hex');
    const filename = `${entityId}_${hash}${ext}`;
    const localPath = path.join(imagesDir, filename);

    // Check if exists
    if (fs.existsSync(localPath)) {
      const stats = fs.statSync(localPath);
      return {
        success: true,
        localPath,
        size: stats.size,
        mimeType: 'image/' + ext.replace('.', '')
      };
    }

    return new Promise((resolve) => {
      const protocol = url.startsWith('https') ? https : http;
      protocol.get(url, (response) => {
        if (response.statusCode !== 200) {
          resolve({ success: false, error: `Failed to download: ${response.statusCode}` });
          return;
        }

        const fileStream = fs.createWriteStream(localPath);
        response.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          const stats = fs.statSync(localPath);
          resolve({
            success: true,
            localPath,
            size: stats.size,
            mimeType: response.headers['content-type']
          });
        });

        fileStream.on('error', (err) => {
          fs.unlink(localPath, () => { });
          resolve({ success: false, error: err.message });
        });
      }).on('error', (err) => {
        resolve({ success: false, error: err.message });
      });
    });
  } catch (error) {
    console.error('Image download error:', error);
    return { success: false, error: error.message };
  }
});

// ============================================================================
// App Lifecycle
// ============================================================================

// تسجيل تضارب
ipcMain.handle('db:log-conflict', async (event, conflictEntry) => {
  try {
    if (!sqliteManager || !sqliteManager.isInitialized) {
      return { success: false, error: 'Database not initialized' };
    }
    return sqliteManager.logConflict(conflictEntry);
  } catch (error) {
    console.error('[IPC] Log conflict failed:', error);
    return { success: false, error: error.message };
  }
});

// جلب سجل التضاربات لكيان معين
ipcMain.handle('db:get-conflict-history', async (event, entityType, entityId) => {
  try {
    if (!sqliteManager || !sqliteManager.isInitialized) {
      return { success: false, error: 'Database not initialized', data: [] };
    }
    return sqliteManager.getConflictHistory(entityType, entityId);
  } catch (error) {
    console.error('[IPC] Get conflict history failed:', error);
    return { success: false, error: error.message, data: [] };
  }
});

// جلب التضاربات مع فلترة
ipcMain.handle('db:get-conflicts', async (event, organizationId, options) => {
  try {
    if (!sqliteManager || !sqliteManager.isInitialized) {
      return { success: false, error: 'Database not initialized', data: [] };
    }
    return sqliteManager.getConflicts(organizationId, options);
  } catch (error) {
    console.error('[IPC] Get conflicts failed:', error);
    return { success: false, error: error.message, data: [] };
  }
});

// إحصائيات التضاربات
ipcMain.handle('db:get-conflict-statistics', async (event, organizationId, dateFrom, dateTo) => {
  try {
    if (!sqliteManager || !sqliteManager.isInitialized) {
      return { success: false, error: 'Database not initialized', data: null };
    }
    return sqliteManager.getConflictStatistics(organizationId, dateFrom, dateTo);
  } catch (error) {
    console.error('[IPC] Get conflict statistics failed:', error);
    return { success: false, error: error.message, data: null };
  }
});

// حذف التضاربات القديمة
ipcMain.handle('db:cleanup-old-conflicts', async (event, daysToKeep) => {
  try {
    if (!sqliteManager || !sqliteManager.isInitialized) {
      return { success: false, error: 'Database not initialized', deleted: 0 };
    }
    return sqliteManager.cleanupOldConflicts(daysToKeep);
  } catch (error) {
    console.error('[IPC] Cleanup old conflicts failed:', error);
    return { success: false, error: error.message, deleted: 0 };
  }
});

// الحصول على قائمة الجداول
ipcMain.handle('db:get-tables', async () => {
  try {
    if (!sqliteManager || !sqliteManager.isInitialized) {
      return { success: false, error: 'Database not initialized', data: [] };
    }

    const result = sqliteManager.query(`
      SELECT name FROM sqlite_master
      WHERE type='table'
      AND name NOT LIKE 'sqlite_%'
      AND name NOT LIKE '%_fts%'
      ORDER BY name
    `);

    return result;
  } catch (error) {
    console.error('[IPC] Get tables failed:', error);
    return { success: false, error: error.message, data: [] };
  }
});

// الحصول على معلومات الأعمدة لجدول
ipcMain.handle('db:get-table-info', async (event, tableName) => {
  try {
    if (!sqliteManager || !sqliteManager.isInitialized) {
      return { success: false, error: 'Database not initialized', data: [] };
    }

    const result = sqliteManager.query(`PRAGMA table_info(${tableName})`);
    return result;
  } catch (error) {
    console.error('[IPC] Get table info failed:', error);
    return { success: false, error: error.message, data: [] };
  }
});

// الحصول على عدد السجلات في جدول
ipcMain.handle('db:get-table-count', async (event, tableName) => {
  try {
    if (!sqliteManager || !sqliteManager.isInitialized) {
      return { success: false, error: 'Database not initialized', data: 0 };
    }

    const result = sqliteManager.queryOne(`SELECT COUNT(*) as count FROM ${tableName}`);
    return result;
  } catch (error) {
    console.error('[IPC] Get table count failed:', error);
    return { success: false, error: error.message, data: 0 };
  }
});

// الحصول على بيانات جدول مع pagination
ipcMain.handle('db:get-table-data', async (event, tableName, options = {}) => {
  try {
    if (!sqliteManager || !sqliteManager.isInitialized) {
      return { success: false, error: 'Database not initialized', data: [] };
    }

    const { limit = 50, offset = 0, orderBy = 'id', orderDir = 'DESC' } = options;

    const result = sqliteManager.query(
      `SELECT * FROM ${tableName} ORDER BY ${orderBy} ${orderDir} LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    return result;
  } catch (error) {
    console.error('[IPC] Get table data failed:', error);
    return { success: false, error: error.message, data: [] };
  }
});

ipcMain.handle('secure-session:get-key', async () => {
  try {
    const key = await getOrCreateSecureSessionKey();
    return { success: true, key };
  } catch (error) {
    return { success: false, error: error?.message || 'failed_to_get_secure_key' };
  }
});

ipcMain.handle('secure-session:clear-key', async () => {
  try {
    const removed = await clearSecureSessionKey();
    return { success: removed };
  } catch (error) {
    return { success: false, error: error?.message || 'failed_to_clear_secure_key' };
  }
});

// إدارة النافذة
ipcMain.handle('window-minimize', () => {
  mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.handle('window-close', () => {
  mainWindow.close();
});

ipcMain.handle('window-hide', () => {
  mainWindow.hide();
  if (isMac) {
    app.dock.hide();
  }
});

ipcMain.handle('window-show', () => {
  mainWindow.show();
  if (isMac) {
    app.dock.show();
  }
});

// وظائف إضافية للتحكم في النافذة
ipcMain.handle('window-center', () => {
  mainWindow.center();
});

ipcMain.handle('window-set-position', (event, x, y) => {
  mainWindow.setPosition(x, y);
});

ipcMain.handle('window-set-size', (event, width, height) => {
  mainWindow.setSize(width, height);
});

ipcMain.handle('window-get-position', () => {
  return mainWindow.getPosition();
});

ipcMain.handle('window-get-size', () => {
  return mainWindow.getSize();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow.isMaximized();
});

ipcMain.handle('window-is-minimized', () => {
  return mainWindow.isMinimized();
});

ipcMain.handle('window-is-full-screen', () => {
  return mainWindow.isFullScreen();
});

ipcMain.handle('window-toggle-devtools', () => {
  if (mainWindow) {
    mainWindow.webContents.toggleDevTools();
  }
});

ipcMain.handle('window-set-full-screen', (event, fullscreen) => {
  mainWindow.setFullScreen(fullscreen);
});

ipcMain.handle('window-set-always-on-top', (event, alwaysOnTop) => {
  mainWindow.setAlwaysOnTop(alwaysOnTop);
});

ipcMain.handle('window-focus', () => {
  mainWindow.focus();
});

ipcMain.handle('window-blur', () => {
  mainWindow.blur();
});

ipcMain.handle('window-restore', () => {
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  if (isMac) {
    app.dock.show();
  }
});

// إدارة الطلبات
ipcMain.handle('make-request', async (event, options) => {
  const https = require('https');
  const http = require('http');
  const url = require('url');

  return new Promise((resolve) => {
    const parsedUrl = url.parse(options.url);
    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          success: true,
          data: data,
          statusCode: res.statusCode,
          headers: res.headers
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        success: false,
        error: error.message
      });
    });

    if (options.data) {
      req.write(options.data);
    }

    req.end();
  });
});

// إدارة Storage عبر IPC (بديل آمن لـ localStorage في preload)
// ملاحظة: نستخدم try-catch وننتظر حتى تكون النافذة جاهزة
ipcMain.handle('storage:get', async (event, key) => {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) {
      console.warn('[Storage] Window not available');
      return null;
    }
    // انتظر حتى تنتهي الصفحة من التحميل
    if (mainWindow.webContents.isLoading()) {
      await new Promise(resolve => mainWindow.webContents.once('did-finish-load', resolve));
    }
    const safeKey = String(key).replace(/'/g, "\\'");
    return await mainWindow.webContents.executeJavaScript(
      `(function() { try { return localStorage.getItem('${safeKey}'); } catch(e) { return null; } })()`,
      true
    );
  } catch (error) {
    console.error('خطأ في قراءة localStorage:', error);
    return null;
  }
});

ipcMain.handle('storage:set', async (event, key, value) => {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) {
      console.warn('[Storage] Window not available');
      return false;
    }
    if (mainWindow.webContents.isLoading()) {
      await new Promise(resolve => mainWindow.webContents.once('did-finish-load', resolve));
    }
    const safeKey = String(key).replace(/'/g, "\\'");
    const safeValue = String(value).replace(/'/g, "\\'").replace(/\n/g, '\\n');
    await mainWindow.webContents.executeJavaScript(
      `(function() { try { localStorage.setItem('${safeKey}', '${safeValue}'); return true; } catch(e) { return false; } })()`,
      true
    );
    return true;
  } catch (error) {
    console.error('خطأ في كتابة localStorage:', error);
    return false;
  }
});

ipcMain.handle('storage:remove', async (event, key) => {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) {
      console.warn('[Storage] Window not available');
      return false;
    }
    if (mainWindow.webContents.isLoading()) {
      await new Promise(resolve => mainWindow.webContents.once('did-finish-load', resolve));
    }
    const safeKey = String(key).replace(/'/g, "\\'");
    await mainWindow.webContents.executeJavaScript(
      `(function() { try { localStorage.removeItem('${safeKey}'); return true; } catch(e) { return false; } })()`,
      true
    );
    return true;
  } catch (error) {
    console.error('خطأ في حذف localStorage:', error);
    return false;
  }
});

ipcMain.handle('storage:clear', async () => {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) {
      console.warn('[Storage] Window not available');
      return false;
    }
    if (mainWindow.webContents.isLoading()) {
      await new Promise(resolve => mainWindow.webContents.once('did-finish-load', resolve));
    }
    await mainWindow.webContents.executeJavaScript(
      `(function() { try { localStorage.clear(); return true; } catch(e) { return false; } })()`,
      true
    );
    return true;
  } catch (error) {
    console.error('خطأ في مسح localStorage:', error);
    return false;
  }
});

// ======= IPC Handlers للتحديثات التلقائية =======

// التحقق من التحديثات يدوياً
ipcMain.handle('updater:check-for-updates', async () => {
  if (isDev) {
    return { success: false, message: 'التحديثات معطلة في وضع التطوير' };
  }
  try {
    await updaterManager.checkForUpdates(false);
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// تنزيل التحديث
ipcMain.handle('updater:download-update', async () => {
  if (isDev) {
    return { success: false, message: 'التحديثات معطلة في وضع التطوير' };
  }
  try {
    await updaterManager.downloadUpdate();
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// تثبيت التحديث وإعادة التشغيل
ipcMain.handle('updater:quit-and-install', () => {
  if (isDev) {
    return { success: false, message: 'التحديثات معطلة في وضع التطوير' };
  }
  updaterManager.quitAndInstall();
  return { success: true };
});

// الحصول على إصدار التطبيق الحالي
ipcMain.handle('updater:get-version', () => {
  return app.getVersion();
});

// ======= IPC Handlers للطباعة باستخدام PrintManager =======

// الحصول على قائمة الطابعات المتاحة
ipcMain.handle('print:get-printers', async () => {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) {
      console.warn('[main.cjs] print:get-printers - mainWindow not available');
      return { success: false, error: 'Window not available', printers: [] };
    }
    const printers = await printManager.getPrinters(mainWindow);
    console.log('[main.cjs] print:get-printers - found', printers?.length || 0, 'printers');
    return { success: true, printers: printers || [] };
  } catch (error) {
    console.error('[main.cjs] print:get-printers error:', error);
    return { success: false, error: error.message, printers: [] };
  }
});

// طباعة إيصال POS
ipcMain.handle('print:receipt', async (event, options) => {
  return await printManager.printReceipt(options);
});

// طباعة HTML مخصص (للفواتير والتقارير)
ipcMain.handle('print:html', async (event, options) => {
  return await printManager.printHtml(options);
});

// طباعة باركود
ipcMain.handle('print:barcode', async (event, options) => {
  return await printManager.printBarcode(options);
});

// فتح درج النقود
ipcMain.handle('print:open-cash-drawer', async (event, printerName) => {
  return await printManager.openCashDrawer(printerName);
});

// طباعة صفحة اختبار
ipcMain.handle('print:test', async (event, printerName) => {
  // يمكن استخدام printManager لعمل الاختبار أيضاً
  // سنقوم ببناء كائن اختبار وإرساله كإيصال عادي أو نستخدم المنطق الموجود في PrintManager إذا أردنا توسيعه
  // للتبسيط، سنرسل إيصال اختبار بسيط
  const testData = [
    { type: 'text', value: '================================', style: { textAlign: 'center' } },
    { type: 'text', value: 'صفحة اختبار الطباعة', style: { textAlign: 'center', fontWeight: 'bold', fontSize: '18px' } },
    { type: 'text', value: 'Print Test Page', style: { textAlign: 'center', fontSize: '14px' } },
    { type: 'text', value: '================================', style: { textAlign: 'center' } },
    { type: 'text', value: '', style: { marginBottom: '3mm' } },
    { type: 'text', value: `الطابعة: ${printerName || 'الافتراضية'}`, style: { textAlign: 'right' } },
    { type: 'text', value: `التاريخ: ${new Date().toLocaleString('ar-DZ')}`, style: { textAlign: 'right' } },
    { type: 'text', value: `الإصدار: ${app.getVersion()}`, style: { textAlign: 'right' } },
    { type: 'text', value: '', style: { marginBottom: '3mm' } },
    { type: 'text', value: '================================', style: { textAlign: 'center' } },
    { type: 'text', value: 'سطوكيها - Stockiha', style: { textAlign: 'center', fontSize: '12px' } },
    { type: 'text', value: 'www.stockiha.com', style: { textAlign: 'center', fontSize: '10px' } },
    { type: 'text', value: '', style: { marginBottom: '5mm' } },
  ];

  return await printManager.printReceipt({
    data: testData,
    printerName,
    silent: false,
    pageSize: '80mm'
  });
});


// ======= IPC Handlers للشبكة والاتصال =======

// فحص حالة الاتصال بالإنترنت (مستوى النظام)
ipcMain.handle('net:is-online', () => {
  try {
    return { success: true, isOnline: net.isOnline() };
  } catch (error) {
    console.error('[Network] Failed to check online status:', error);
    return { success: false, error: error.message, isOnline: navigator?.onLine ?? true };
  }
});

// فحص الاتصال عن طريق طلب HTTP سريع
ipcMain.handle('net:ping', async (event, url, timeout = 5000) => {
  const startTime = Date.now();

  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url || 'https://www.google.com/generate_204');
      const isHttps = parsedUrl.protocol === 'https:';
      const client = isHttps ? https : http;

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'HEAD',
        timeout: timeout,
        headers: {
          'User-Agent': 'Stockiha-Connectivity-Check/1.0',
          'Cache-Control': 'no-cache'
        }
      };

      const req = client.request(options, (res) => {
        const latency = Date.now() - startTime;
        req.destroy();
        resolve({
          success: true,
          reachable: res.statusCode >= 200 && res.statusCode < 400,
          statusCode: res.statusCode,
          latency: latency
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          success: true,
          reachable: false,
          error: 'timeout',
          latency: timeout
        });
      });

      req.on('error', (error) => {
        const latency = Date.now() - startTime;
        resolve({
          success: true,
          reachable: false,
          error: error.code || error.message,
          latency: latency
        });
      });

      req.end();
    } catch (error) {
      resolve({
        success: false,
        reachable: false,
        error: error.message,
        latency: Date.now() - startTime
      });
    }
  });
});

// فحص متعدد للاتصال (يفحص عدة endpoints)
ipcMain.handle('net:multi-ping', async (event, urls, timeout = 3000) => {
  const defaultUrls = [
    'https://www.google.com/generate_204',
    'https://connectivitycheck.gstatic.com/generate_204',
    'https://www.cloudflare.com/cdn-cgi/trace'
  ];

  const endpointsToCheck = urls && urls.length > 0 ? urls : defaultUrls;
  const startTime = Date.now();

  // نستخدم Promise.any للحصول على أول نجاح
  try {
    const pingPromises = endpointsToCheck.map(async (url) => {
      return new Promise((resolve, reject) => {
        try {
          const parsedUrl = new URL(url);
          const isHttps = parsedUrl.protocol === 'https:';
          const client = isHttps ? https : http;

          const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (isHttps ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'HEAD',
            timeout: timeout,
            headers: {
              'User-Agent': 'Stockiha-Connectivity-Check/1.0',
              'Cache-Control': 'no-cache'
            }
          };

          const req = client.request(options, (res) => {
            const latency = Date.now() - startTime;
            req.destroy();
            if (res.statusCode >= 200 && res.statusCode < 400) {
              resolve({ url, latency, statusCode: res.statusCode });
            } else {
              reject(new Error(`HTTP ${res.statusCode}`));
            }
          });

          req.on('timeout', () => {
            req.destroy();
            reject(new Error('timeout'));
          });

          req.on('error', (error) => {
            reject(error);
          });

          req.end();
        } catch (error) {
          reject(error);
        }
      });
    });

    // أول استجابة ناجحة تعني أننا متصلون
    const result = await Promise.any(pingPromises);
    return {
      success: true,
      isOnline: true,
      firstResponder: result.url,
      latency: result.latency
    };
  } catch (error) {
    // كل الـ endpoints فشلت
    return {
      success: true,
      isOnline: false,
      error: 'All endpoints failed',
      latency: Date.now() - startTime
    };
  }
});

// فحص Captive Portal
ipcMain.handle('net:check-captive-portal', async (event) => {
  const APPLE_CAPTIVE_URL = 'http://captive.apple.com/hotspot-detect.html';
  const EXPECTED_RESPONSE = 'Success';

  return new Promise((resolve) => {
    try {
      const req = http.get(APPLE_CAPTIVE_URL, { timeout: 5000 }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          const isCaptivePortal = !data.includes(EXPECTED_RESPONSE);
          resolve({
            success: true,
            isCaptivePortal: isCaptivePortal,
            redirectUrl: isCaptivePortal ? APPLE_CAPTIVE_URL : null
          });
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ success: true, isCaptivePortal: false, error: 'timeout' });
      });

      req.on('error', (error) => {
        resolve({ success: true, isCaptivePortal: false, error: error.message });
      });
    } catch (error) {
      resolve({ success: false, isCaptivePortal: false, error: error.message });
    }
  });
});

// الحصول على معلومات الشبكة الكاملة
ipcMain.handle('net:get-status', async () => {
  try {
    const isSystemOnline = net.isOnline();

    // فحص سريع للإنترنت الفعلي
    const pingResult = await new Promise((resolve) => {
      const req = https.get('https://www.google.com/generate_204', { timeout: 3000 }, (res) => {
        req.destroy();
        resolve({ reachable: res.statusCode === 204 || res.statusCode === 200 });
      });
      req.on('timeout', () => { req.destroy(); resolve({ reachable: false }); });
      req.on('error', () => resolve({ reachable: false }));
    });

    return {
      success: true,
      status: {
        systemOnline: isSystemOnline,
        internetReachable: pingResult.reachable,
        isOnline: isSystemOnline && pingResult.reachable,
        timestamp: Date.now()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      status: {
        systemOnline: true,
        internetReachable: false,
        isOnline: false,
        timestamp: Date.now()
      }
    };
  }
});

// إدارة الأخطاء
process.on('uncaughtException', (error) => {
  console.error('خطأ غير متوقع:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('رفض غير معالج:', reason);
});

// تصدير المتغيرات للاستخدام في الملفات الأخرى
module.exports = {
  mainWindow,
  createMainWindow,
  createApp
};
