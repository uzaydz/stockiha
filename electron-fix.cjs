/**
 * أداة إصلاح متقدمة لمشاكل نوافذ Electron في نظام macOS
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { app, BrowserWindow } = require('electron');

console.log('تشغيل أداة الإصلاح المتقدمة لـ Electron...');

// إصلاح مسارات التطبيق
function fixApplicationPaths() {
  // التأكد من أن المسار الحالي هو المسار الرئيسي للتطبيق
  const currentDir = process.cwd();
  console.log(`المسار الحالي: ${currentDir}`);
  
  // تغيير مسار electron لتحميل الملفات من المكان الصحيح
  if (process.env.PWD && process.env.PWD !== currentDir) {
    console.log(`تعديل مسار العمل من ${process.env.PWD} إلى ${currentDir}`);
    process.env.PWD = currentDir;
  }
  
  // تأكيد وجود مجلد dist
  const distDir = path.join(currentDir, 'dist');
  if (!fs.existsSync(distDir)) {
    console.error(`مجلد dist غير موجود في ${distDir}`);
    return false;
  }
  
  return true;
}

// إصلاح إعدادات الأمان لـ macOS
function fixMacOSPermissions() {
  if (process.platform !== 'darwin') {
    console.log('ليس نظام macOS - لا حاجة لإصلاح الأذونات');
    return;
  }
  
  // إعطاء الأذونات اللازمة للسماح للتطبيق بالظهور فوق التطبيقات الأخرى
  console.log('إصلاح أذونات macOS...');
  
  // تفعيل وضع الاختبار للأمان في macOS
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
  process.env.ELECTRON_ENABLE_LOGGING = 'true';
  
  // محاولة تنشيط أذونات الشاشة
  exec('tccutil reset ScreenCapture', () => {
    console.log('تم إعادة ضبط أذونات التقاط الشاشة');
  });
  
  // التحقق من الأذونات باستخدام AppleScript
  const permissionScript = `
    osascript -e 'tell application "System Events" to get name of processes'
  `;
  
  exec(permissionScript, (error, stdout, stderr) => {
    if (error) {
      console.error('فشل اختبار الأذونات. قد تحتاج إلى إعطاء أذونات للتطبيق في إعدادات الأمان والخصوصية.');
    } else {
      console.log('اجتياز اختبار الأذونات بنجاح');
    }
  });
}

// إصلاح مشاكل Electron عند بدء التشغيل
function fixElectronStartup() {
  // إضافة متغيرات بيئية لتجاوز أخطاء Electron الشائعة
  console.log('إصلاح إعدادات بدء تشغيل Electron...');
  
  process.env.ELECTRON_NO_ATTACH_CONSOLE = 'true';
  process.env.ELECTRON_ENABLE_STACK_DUMPING = 'true';
  process.env.ELECTRON_ENABLE_LOGGING = 'true';
  
  // لإصلاح مشاكل العرض في macOS
  if (process.platform === 'darwin') {
    process.env.ELECTRON_DISABLE_NOTIFICATION_CENTER = 'true';
    process.env.ELECTRON_FORCE_WINDOW_MENU_BAR = 'true';
  }
}

// إصلاح مشاكل النوافذ
function fixWindows() {
  // تأكد من إغلاق أي نوافذ مفتوحة قبل محاولة فتح نوافذ جديدة
  const existingWindows = BrowserWindow.getAllWindows();
  console.log(`عدد النوافذ المفتوحة حاليًا: ${existingWindows.length}`);
  
  // إغلاق النوافذ الموجودة
  existingWindows.forEach(win => {
    console.log(`إغلاق النافذة القديمة: ${win.id}`);
    win.destroy();
  });
  
  // إنشاء نافذة جديدة بإعدادات محسنة
  console.log('إنشاء نافذة جديدة مع إعدادات إصلاح...');
  
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: true,  // عرض النافذة فورًا
    backgroundColor: '#FFFFFF',
    titleBarStyle: 'hidden',  // إخفاء شريط العنوان الافتراضي
    frame: false,  // إزالة الإطار لاستخدام شريط عنوان مخصص
    alwaysOnTop: true,  // جعل النافذة فوق جميع النوافذ الأخرى
    center: true,  // توسيط النافذة على الشاشة
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,  // تعطيل عزل السياق للتشخيص
      webSecurity: false,  // تعطيل أمان الويب للتشخيص
      allowRunningInsecureContent: true,
      devTools: true
    }
  });
  
  // تحميل صفحة بسيطة للاختبار
  win.loadFile(path.join(__dirname, 'dist/index.html'))
  .then(() => {
    console.log('تم تحميل الصفحة بنجاح');
    
    // إضافة محتوى تشخيصي للصفحة
    win.webContents.executeJavaScript(`
      document.body.innerHTML += '<div style="background: red; color: white; padding: 20px; position: fixed; top: 0; left: 0; z-index: 9999;">تم تحميل صفحة الاختبار بنجاح</div>';
    `).catch(err => {
      console.error('خطأ في إضافة محتوى تشخيصي:', err);
    });
    
    // فتح أدوات المطور
    win.webContents.openDevTools();
  })
  .catch(err => {
    console.error('فشل في تحميل الصفحة:', err);
  });
  
  // تسجيل أحداث النافذة
  win.on('ready-to-show', () => {
    console.log('النافذة جاهزة للعرض');
  });
  
  win.on('show', () => {
    console.log('تم عرض النافذة');
  });
  
  win.on('close', () => {
    console.log('النافذة تغلق');
  });
  
  return win;
}

// تنفيذ جميع الإصلاحات
function applyAllFixes() {
  console.log('جاري تطبيق جميع الإصلاحات...');
  
  // إصلاح المسارات
  if (!fixApplicationPaths()) {
    console.error('فشل في إصلاح مسارات التطبيق');
    return;
  }
  
  // إصلاح أذونات macOS
  fixMacOSPermissions();
  
  // إصلاح إعدادات Electron
  fixElectronStartup();
  
  // التحقق مما إذا كان التطبيق جاهزًا
  if (app.isReady()) {
    console.log('تطبيق Electron جاهز - إصلاح النوافذ');
    fixWindows();
  } else {
    console.log('تطبيق Electron غير جاهز - الانتظار...');
    app.whenReady().then(() => {
      console.log('أصبح تطبيق Electron جاهزًا - إصلاح النوافذ');
      fixWindows();
    });
  }
}

// تنفيذ
applyAllFixes(); 