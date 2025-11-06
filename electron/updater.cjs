const { autoUpdater } = require('electron-updater');
const { dialog, BrowserWindow } = require('electron');
const log = require('electron-log');

// إعداد logging
log.transports.file.level = 'info';
autoUpdater.logger = log;

console.log('🚀 [UPDATER] تحميل نظام التحديثات...');
console.log('📦 [UPDATER] app.getVersion():', require('electron').app.getVersion());

// تكوين autoUpdater
autoUpdater.autoDownload = false; // عدم التنزيل التلقائي
autoUpdater.autoInstallOnAppQuit = true; // التثبيت التلقائي عند الإغلاق
autoUpdater.allowPrerelease = false; // عدم السماح بالإصدارات التجريبية
autoUpdater.allowDowngrade = false; // عدم السماح بالرجوع لإصدار أقدم

console.log('⚙️ [UPDATER] إعدادات autoUpdater:');
console.log('  - autoDownload:', autoUpdater.autoDownload);
console.log('  - autoInstallOnAppQuit:', autoUpdater.autoInstallOnAppQuit);
console.log('  - allowPrerelease:', autoUpdater.allowPrerelease);
console.log('  - allowDowngrade:', autoUpdater.allowDowngrade);

// تكوين إضافي لتحسين الاتصال
autoUpdater.requestHeaders = {
  'Cache-Control': 'no-cache'
};

console.log('🌐 [UPDATER] requestHeaders:', autoUpdater.requestHeaders);

// طباعة إعدادات النشر
try {
  const app = require('electron').app;
  const packageJson = require('../package.json');
  
  console.log('📊 [UPDATER] معلومات التطبيق:');
  console.log('  - اسم التطبيق:', app.getName());
  console.log('  - إصدار التطبيق:', app.getVersion());
  console.log('  - package.json version:', packageJson.version);
  
  if (packageJson.build && packageJson.build.publish) {
    console.log('📡 [UPDATER] إعدادات النشر من package.json:');
    console.log('  - provider:', packageJson.build.publish.provider);
    console.log('  - owner:', packageJson.build.publish.owner);
    console.log('  - repo:', packageJson.build.publish.repo);
    console.log('  - releaseType:', packageJson.build.publish.releaseType);
  } else {
    console.warn('⚠️ [UPDATER] لا توجد إعدادات publish في package.json!');
  }
  
  // طباعة feed URL الذي سيستخدمه electron-updater
  console.log('🔗 [UPDATER] Feed URL المتوقع:');
  const feedUrl = `https://github.com/${packageJson.build?.publish?.owner}/${packageJson.build?.publish?.repo}/releases`;
  console.log('  ', feedUrl);
} catch (error) {
  console.error('❌ [UPDATER] خطأ في قراءة معلومات التطبيق:', error);
}

class UpdaterManager {
  constructor() {
    this.mainWindow = null;
    this.updateCheckInterval = null;
    this.isChecking = false;
  }

  /**
   * تهيئة نظام التحديث
   * @param {BrowserWindow} mainWindow - النافذة الرئيسية
   */
  initialize(mainWindow) {
    console.log('🎬 [UPDATER] initialize() - بدء تهيئة نظام التحديث');
    this.mainWindow = mainWindow;
    console.log('🪟 [UPDATER] mainWindow تم تعيينها');
    
    this.setupEventListeners();
    console.log('👂 [UPDATER] Event listeners تم إعدادها');
    
    // التحقق من التحديثات عند بدء التطبيق (بعد 3 ثواني)
    console.log('⏰ [UPDATER] جدولة التحقق الأول بعد 3 ثواني...');
    setTimeout(() => {
      console.log('⏰ [UPDATER] انتهى الانتظار - بدء التحقق من التحديثات');
      this.checkForUpdates(false);
    }, 3000);

    // التحقق الدوري كل 4 ساعات
    console.log('🔄 [UPDATER] جدولة التحقق الدوري كل 4 ساعات');
    this.updateCheckInterval = setInterval(() => {
      console.log('🔄 [UPDATER] التحقق الدوري - بدء الفحص');
      this.checkForUpdates(false);
    }, 4 * 60 * 60 * 1000);
    
    console.log('✅ [UPDATER] initialize() - التهيئة اكتملت بنجاح');
  }

  /**
   * إعداد مستمعي الأحداث
   */
  setupEventListeners() {
    console.log('👂 [UPDATER] setupEventListeners() - إعداد المستمعين');
    
    // عند العثور على تحديث متاح
    autoUpdater.on('update-available', (info) => {
      console.log('✨ [UPDATER] EVENT: update-available');
      console.log('📋 [UPDATER] معلومات التحديث:', JSON.stringify(info, null, 2));
      log.info('تحديث متاح:', info);
      
      this.sendToRenderer('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
      });
      console.log('📤 [UPDATER] أرسلت update-available إلى renderer');

      // إظهار إشعار للمستخدم
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        dialog.showMessageBox(this.mainWindow, {
          type: 'info',
          title: 'تحديث متاح',
          message: `تحديث جديد متاح (الإصدار ${info.version})`,
          detail: 'هل تريد تنزيل التحديث الآن؟',
          buttons: ['تنزيل', 'لاحقاً'],
          defaultId: 0,
          cancelId: 1
        }).then(result => {
          if (result.response === 0) {
            this.downloadUpdate();
          }
        });
      }
    });

    // عند عدم وجود تحديثات
    autoUpdater.on('update-not-available', (info) => {
      console.log('ℹ️ [UPDATER] EVENT: update-not-available');
      console.log('📋 [UPDATER] الإصدار الحالي:', info.version);
      log.info('لا توجد تحديثات جديدة');
      this.sendToRenderer('update-not-available', { currentVersion: info.version });
      console.log('📤 [UPDATER] أرسلت update-not-available إلى renderer');
    });

    // تقدم التنزيل
    autoUpdater.on('download-progress', (progressObj) => {
      const message = `${Math.round(progressObj.percent)}% تم تنزيل`;
      console.log('📥 [UPDATER] EVENT: download-progress -', message);
      console.log('📊 [UPDATER] التقدم:', {
        percent: Math.round(progressObj.percent),
        transferred: `${(progressObj.transferred / 1024 / 1024).toFixed(2)} MB`,
        total: `${(progressObj.total / 1024 / 1024).toFixed(2)} MB`,
        speed: `${(progressObj.bytesPerSecond / 1024 / 1024).toFixed(2)} MB/s`
      });
      log.info(message);
      this.sendToRenderer('download-progress', {
        percent: progressObj.percent,
        transferred: progressObj.transferred,
        total: progressObj.total,
        bytesPerSecond: progressObj.bytesPerSecond
      });
    });

    // اكتمال التنزيل
    autoUpdater.on('update-downloaded', (info) => {
      console.log('✅ [UPDATER] EVENT: update-downloaded');
      console.log('📋 [UPDATER] التحديث المُنزّل:', JSON.stringify(info, null, 2));
      log.info('تم تنزيل التحديث:', info);
      this.sendToRenderer('update-downloaded', {
        version: info.version,
        releaseDate: info.releaseDate
      });
      console.log('📤 [UPDATER] أرسلت update-downloaded إلى renderer');

      // إظهار رسالة لتثبيت التحديث
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        dialog.showMessageBox(this.mainWindow, {
          type: 'info',
          title: 'التحديث جاهز',
          message: 'تم تنزيل التحديث بنجاح',
          detail: 'سيتم تثبيت التحديث عند إغلاق التطبيق.\nهل تريد إعادة تشغيل التطبيق الآن؟',
          buttons: ['إعادة تشغيل', 'لاحقاً'],
          defaultId: 0,
          cancelId: 1
        }).then(result => {
          if (result.response === 0) {
            setImmediate(() => autoUpdater.quitAndInstall());
          }
        });
      }
    });

    // خطأ في التحديث
    autoUpdater.on('error', (error) => {
      console.error('❌ [UPDATER] EVENT: error');
      console.error('❌ [UPDATER] الخطأ الكامل:', error);
      console.error('❌ [UPDATER] error.message:', error.message);
      console.error('❌ [UPDATER] error.stack:', error.stack);
      log.error('خطأ في التحديث:', error);
      
      // رسالة خطأ مفصلة حسب نوع المشكلة
      let userMessage = 'حدث خطأ غير متوقع';
      console.log('🔍 [UPDATER] تحليل نوع الخطأ...');
      
      if (error.message.includes('net::')) {
        userMessage = 'فشل الاتصال بالإنترنت. تأكد من اتصالك وحاول مرة أخرى';
      } else if (error.message.includes('ENOTFOUND') || error.message.includes('DNS')) {
        userMessage = 'تعذر الوصول إلى خادم التحديثات';
      } else if (error.message.includes('No published versions')) {
        userMessage = 'لا توجد إصدارات منشورة حالياً';
      } else if (error.message.includes('Cannot find')) {
        userMessage = 'ملفات التحديث غير متوفرة';
      } else {
        userMessage = error.message;
      }
      
      console.log('💬 [UPDATER] رسالة المستخدم:', userMessage);
      this.sendToRenderer('update-error', {
        message: userMessage,
        details: error.message
      });
      console.log('📤 [UPDATER] أرسلت update-error إلى renderer');
    });
    
    console.log('✅ [UPDATER] setupEventListeners() - كل المستمعين تم إعدادهم');
  }

  /**
   * التحقق من التحديثات
   * @param {boolean} silent - إظهار رسالة عند عدم وجود تحديثات
   */
  async checkForUpdates(silent = true) {
    console.log('🔍 [UPDATER] checkForUpdates() - بدء الدالة');
    console.log('🔍 [UPDATER] silent:', silent);
    console.log('🔍 [UPDATER] isChecking:', this.isChecking);
    
    if (this.isChecking) {
      console.warn('⚠️ [UPDATER] التحقق جارٍ بالفعل، تخطي...');
      log.info('جاري التحقق من التحديثات...');
      return;
    }

    try {
      this.isChecking = true;
      console.log('🔒 [UPDATER] تم قفل isChecking = true');
      log.info('بدء التحقق من التحديثات...');
      
      this.sendToRenderer('checking-for-update');
      console.log('📤 [UPDATER] أرسلت checking-for-update إلى renderer');
      
      console.log('🌐 [UPDATER] استدعاء autoUpdater.checkForUpdates()...');
      const result = await autoUpdater.checkForUpdates();
      console.log('📋 [UPDATER] نتيجة checkForUpdates:', JSON.stringify(result, null, 2));
      
      if (!silent && !result?.updateInfo) {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          dialog.showMessageBox(this.mainWindow, {
            type: 'info',
            title: 'لا توجد تحديثات',
            message: 'أنت تستخدم أحدث إصدار من التطبيق',
            buttons: ['موافق']
          });
        }
      }
    } catch (error) {
      console.error('❌ [UPDATER] خطأ في checkForUpdates');
      console.error('❌ [UPDATER] error:', error);
      console.error('❌ [UPDATER] error.message:', error.message);
      console.error('❌ [UPDATER] error.stack:', error.stack);
      log.error('خطأ أثناء التحقق من التحديثات:', error);
      
      if (!silent && this.mainWindow && !this.mainWindow.isDestroyed()) {
        console.log('🔔 [UPDATER] عرض رسالة خطأ للمستخدم...');
        dialog.showMessageBox(this.mainWindow, {
          type: 'error',
          title: 'خطأ',
          message: 'فشل التحقق من التحديثات',
          detail: error.message,
          buttons: ['موافق']
        });
      }
    } finally {
      this.isChecking = false;
      console.log('🔓 [UPDATER] تم فتح isChecking = false');
      console.log('✅ [UPDATER] checkForUpdates() - انتهت الدالة');
    }
  }

  /**
   * تنزيل التحديث
   */
  async downloadUpdate() {
    console.log('📥 [UPDATER] downloadUpdate() - بدء التنزيل');
    try {
      log.info('بدء تنزيل التحديث...');
      this.sendToRenderer('download-started');
      console.log('📤 [UPDATER] أرسلت download-started إلى renderer');
      
      console.log('🌐 [UPDATER] استدعاء autoUpdater.downloadUpdate()...');
      await autoUpdater.downloadUpdate();
      console.log('✅ [UPDATER] downloadUpdate() - اكتمل بنجاح');
    } catch (error) {
      console.error('❌ [UPDATER] خطأ في downloadUpdate');
      console.error('❌ [UPDATER] error:', error);
      console.error('❌ [UPDATER] error.message:', error.message);
      log.error('خطأ أثناء تنزيل التحديث:', error);
      
      let userMessage = 'فشل تنزيل التحديث';
      console.log('🔍 [UPDATER] تحليل نوع خطأ التنزيل...');
      if (error.message.includes('net::')) {
        userMessage = 'انقطع الاتصال أثناء التنزيل';
      } else if (error.message.includes('ENOSPC')) {
        userMessage = 'لا توجد مساحة كافية على القرص';
      }
      
      this.sendToRenderer('update-error', {
        message: userMessage,
        details: error.message
      });
      
      // إظهار رسالة للمستخدم
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        dialog.showMessageBox(this.mainWindow, {
          type: 'error',
          title: 'خطأ في التنزيل',
          message: userMessage,
          detail: error.message,
          buttons: ['موافق']
        });
      }
    }
  }

  /**
   * تثبيت التحديث وإعادة تشغيل التطبيق
   */
  quitAndInstall() {
    console.log('🔄 [UPDATER] quitAndInstall() - بدء التثبيت وإعادة التشغيل');
    log.info('تثبيت التحديث وإعادة التشغيل...');
    autoUpdater.quitAndInstall(false, true);
  }

  /**
   * إرسال حدث إلى Renderer Process
   */
  sendToRenderer(channel, data = {}) {
    console.log('📤 [UPDATER] sendToRenderer() - channel:', channel);
    console.log('📦 [UPDATER] data:', JSON.stringify(data, null, 2));
    
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
      console.log('✅ [UPDATER] رسالة أُرسلت بنجاح');
    } else {
      console.warn('⚠️ [UPDATER] لا يمكن الإرسال - mainWindow غير متوفرة');
    }
  }

  /**
   * تنظيف الموارد
   */
  cleanup() {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
    }
  }
}

// تصدير instance واحد
const updaterManager = new UpdaterManager();

module.exports = {
  updaterManager,
  autoUpdater
};
