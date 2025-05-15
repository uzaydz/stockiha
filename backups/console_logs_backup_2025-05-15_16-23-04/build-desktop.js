import { execSync } from 'child_process';
import { platform } from 'os';

// تحديد نظام التشغيل
const currentPlatform = platform();
console.log(`بناء التطبيق لنظام التشغيل: ${currentPlatform}`);

try {
  // بناء التطبيق للويب أولاً
  console.log('بناء التطبيق للويب...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // بناء تطبيق سطح المكتب بناءً على نظام التشغيل
  if (currentPlatform === 'darwin') {
    // macOS
    console.log('بناء تطبيق macOS...');
    execSync('npm run electron:build:mac', { stdio: 'inherit' });
    console.log('تم بناء تطبيق macOS بنجاح!');
    console.log('يمكنك العثور على التطبيق في المجلد: dist_electron/mac');
  } else if (currentPlatform === 'win32') {
    // Windows
    console.log('بناء تطبيق Windows...');
    execSync('npm run electron:build:win', { stdio: 'inherit' });
    console.log('تم بناء تطبيق Windows بنجاح!');
    console.log('يمكنك العثور على التطبيق في المجلد: dist_electron/win-unpacked');
  } else {
    // Linux أو أنظمة أخرى
    console.log('بناء تطبيق Linux...');
    execSync('npm run electron:build', { stdio: 'inherit' });
    console.log('تم بناء التطبيق بنجاح!');
    console.log('يمكنك العثور على التطبيق في المجلد: dist_electron');
  }
  
  console.log('تم الانتهاء من عملية البناء بنجاح!');
} catch (error) {
  console.error('حدث خطأ أثناء بناء التطبيق:', error);
  process.exit(1);
} 