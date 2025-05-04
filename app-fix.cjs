/**
 * مساعدة لإصلاح مشكلة عدم ظهور نافذة Electron
 * هذا الملف يسمح بإعادة تشغيل التطبيق بأمان من وحدة التحكم
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('بدء تشغيل مساعد إصلاح Electron...');

// هذه الوظيفة تقوم بإنهاء جميع عمليات Electron الحالية
function killElectronProcesses() {
  return new Promise((resolve) => {
    console.log('محاولة إنهاء عمليات Electron الموجودة...');
    
    if (process.platform === 'win32') {
      exec('taskkill /F /IM electron.exe', (error) => {
        if (error) {
          console.log('لا توجد عمليات Electron نشطة أو حدث خطأ أثناء محاولة إغلاقها.');
        } else {
          console.log('تم إنهاء عمليات Electron بنجاح.');
        }
        resolve();
      });
    } else {
      // macOS أو Linux
      exec('pkill -f electron || true', (error) => {
        if (error) {
          console.log('لا توجد عمليات Electron نشطة أو حدث خطأ أثناء محاولة إغلاقها.');
        } else {
          console.log('تم إنهاء عمليات Electron بنجاح.');
        }
        resolve();
      });
    }
  });
}

// هذه الوظيفة تتحقق من وجود ملفات هامة
function checkRequiredFiles() {
  const requiredFiles = [
    'electron.cjs',
    'preload.cjs',
    'main.cjs',
    'electron-init.cjs',
    'dist/index.html'
  ];
  
  const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(__dirname, file)));
  
  if (missingFiles.length > 0) {
    console.error('الملفات المطلوبة غير موجودة:', missingFiles);
    return false;
  }
  
  return true;
}

// تشغيل التطبيق بعد الانتظار
function startApp() {
  if (!checkRequiredFiles()) {
    console.error('لا يمكن بدء التطبيق بسبب ملفات مفقودة!');
    return;
  }
  
  console.log('تشغيل تطبيق Electron...');
  
  // استخدام Electron API مباشرة إذا كان ممكنًا
  const electron = require('electron');
  
  const childProcess = exec(`"${electron}" ."`, {
    env: { ...process.env, ELECTRON_FORCE_WINDOW_DISPLAY: "1" }
  });
  
  childProcess.stdout.on('data', (data) => {
    console.log(`[Electron] ${data}`);
  });
  
  childProcess.stderr.on('data', (data) => {
    console.error(`[Electron Error] ${data}`);
  });
  
  childProcess.on('close', (code) => {
    console.log(`Electron تم الإغلاق برمز: ${code}`);
  });
}

// تسلسل التنفيذ الرئيسي
async function main() {
  try {
    // إغلاق أي عمليات إلكترون سابقة
    await killElectronProcesses();
    
    // انتظار لحظة قبل بدء التطبيق
    setTimeout(() => {
      startApp();
    }, 1000);
    
  } catch (error) {
    console.error('حدث خطأ أثناء تنفيذ مساعد الإصلاح:', error);
  }
}

// تشغيل
main(); 