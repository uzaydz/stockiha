const { app, BrowserWindow, Menu, shell, ipcMain, dialog, nativeImage, Tray, globalShortcut, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
8778
const { SQLiteManager } = require('./sqliteManager.cjs');
const { updaterManager } = require('./updater.cjs');

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
const FALLBACK_KEY_PATH = path.join(app.getPath('userData'), '.session-key');

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
    if (fs.existsSync(FALLBACK_KEY_PATH)) {
      const existingKey = fs.readFileSync(FALLBACK_KEY_PATH, 'utf8');
      console.log('🔑 [Electron] Retrieved key from fallback file');
      return existingKey;
    }

    const randomKey = crypto.randomBytes(32).toString('base64');
    fs.writeFileSync(FALLBACK_KEY_PATH, randomKey, { mode: 0o600 });
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
    if (fs.existsSync(FALLBACK_KEY_PATH)) {
      fs.unlinkSync(FALLBACK_KEY_PATH);
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
let tray;
let isQuitting = false;

// مدير قاعدة البيانات SQLite
let sqliteManager = null;

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
    mainWindow.loadURL(devUrl);

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
    mainWindow.show();
    
    // التأكد من ظهور شريط العنوان على Windows
    mainWindow.setMenuBarVisibility(false);
    mainWindow.setAutoHideMenuBar(true);

    // لا نفتح DevTools تلقائياً في الإنتاج
    if (isDev) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
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
  // إنشاء النافذة الرئيسية
  createMainWindow();
  
  // إنشاء القائمة
  createMenu();
  
  // إنشاء التراى (للإشعارات)
  createTray();
  
  // تسجيل الاختصارات العامة
  registerGlobalShortcuts();
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
  createApp();
  
  // تهيئة نظام التحديث التلقائي (فقط في الإنتاج)
  if (!isDev) {
    updaterManager.initialize(mainWindow);
    console.log('[Electron] نظام التحديث التلقائي تم تفعيله');
  } else {
    console.log('[Electron] نظام التحديث معطل في وضع التطوير');
  }
  
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
ipcMain.handle('storage:get', async (event, key) => {
  try {
    return await mainWindow.webContents.executeJavaScript(`localStorage.getItem('${key}')`);
  } catch (error) {
    console.error('خطأ في قراءة localStorage:', error);
    return null;
  }
});

ipcMain.handle('storage:set', async (event, key, value) => {
  try {
    await mainWindow.webContents.executeJavaScript(`localStorage.setItem('${key}', '${value}')`);
    return true;
  } catch (error) {
    console.error('خطأ في كتابة localStorage:', error);
    return false;
  }
});

ipcMain.handle('storage:remove', async (event, key) => {
  try {
    await mainWindow.webContents.executeJavaScript(`localStorage.removeItem('${key}')`);
    return true;
  } catch (error) {
    console.error('خطأ في حذف localStorage:', error);
    return false;
  }
});

ipcMain.handle('storage:clear', async () => {
  try {
    await mainWindow.webContents.executeJavaScript(`localStorage.clear()`);
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
