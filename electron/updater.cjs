const { autoUpdater } = require('electron-updater');
const { dialog, BrowserWindow } = require('electron');
const log = require('electron-log');

// إعداد logging
log.transports.file.level = 'info';
autoUpdater.logger = log;

// تكوين autoUpdater
autoUpdater.autoDownload = false; // عدم التنزيل التلقائي
autoUpdater.autoInstallOnAppQuit = true; // التثبيت التلقائي عند الإغلاق
autoUpdater.allowPrerelease = false; // عدم السماح بالإصدارات التجريبية
autoUpdater.allowDowngrade = false; // عدم السماح بالرجوع لإصدار أقدم

// تكوين إضافي لتحسين الاتصال
autoUpdater.requestHeaders = {
  'Cache-Control': 'no-cache'
};

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
    this.mainWindow = mainWindow;
    this.setupEventListeners();
    
    // التحقق من التحديثات عند بدء التطبيق (بعد 3 ثواني)
    setTimeout(() => {
      this.checkForUpdates(false);
    }, 3000);

    // التحقق الدوري كل 4 ساعات
    this.updateCheckInterval = setInterval(() => {
      this.checkForUpdates(false);
    }, 4 * 60 * 60 * 1000);
  }

  /**
   * إعداد مستمعي الأحداث
   */
  setupEventListeners() {
    // عند العثور على تحديث متاح
    autoUpdater.on('update-available', (info) => {
      log.info('تحديث متاح:', info);
      this.sendToRenderer('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
      });

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
      log.info('لا توجد تحديثات جديدة');
      this.sendToRenderer('update-not-available', { currentVersion: info.version });
    });

    // تقدم التنزيل
    autoUpdater.on('download-progress', (progressObj) => {
      const message = `${Math.round(progressObj.percent)}% تم تنزيل`;
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
      log.info('تم تنزيل التحديث:', info);
      this.sendToRenderer('update-downloaded', {
        version: info.version,
        releaseDate: info.releaseDate
      });

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
      log.error('خطأ في التحديث:', error);
      
      // رسالة خطأ مفصلة حسب نوع المشكلة
      let userMessage = 'حدث خطأ غير متوقع';
      
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
      
      this.sendToRenderer('update-error', {
        message: userMessage,
        details: error.message
      });
    });
  }

  /**
   * التحقق من التحديثات
   * @param {boolean} silent - إظهار رسالة عند عدم وجود تحديثات
   */
  async checkForUpdates(silent = true) {
    if (this.isChecking) {
      log.info('جاري التحقق من التحديثات...');
      return;
    }

    try {
      this.isChecking = true;
      log.info('بدء التحقق من التحديثات...');
      this.sendToRenderer('checking-for-update');
      
      const result = await autoUpdater.checkForUpdates();
      
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
      log.error('خطأ أثناء التحقق من التحديثات:', error);
      if (!silent && this.mainWindow && !this.mainWindow.isDestroyed()) {
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
    }
  }

  /**
   * تنزيل التحديث
   */
  async downloadUpdate() {
    try {
      log.info('بدء تنزيل التحديث...');
      this.sendToRenderer('download-started');
      await autoUpdater.downloadUpdate();
    } catch (error) {
      log.error('خطأ أثناء تنزيل التحديث:', error);
      
      let userMessage = 'فشل تنزيل التحديث';
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
    log.info('تثبيت التحديث وإعادة التشغيل...');
    autoUpdater.quitAndInstall(false, true);
  }

  /**
   * إرسال حدث إلى Renderer Process
   */
  sendToRenderer(channel, data = {}) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
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
