import { execSync } from 'child_process';
import { platform } from 'os';

// تحديد نظام التشغيل
const currentPlatform = platform();

try {
  // بناء التطبيق للويب أولاً
  
  execSync('npm run build', { stdio: 'inherit' });
  
  // بناء تطبيق سطح المكتب بناءً على نظام التشغيل
  if (currentPlatform === 'darwin') {
    // macOS
    
    execSync('npm run electron:build:mac', { stdio: 'inherit' });

  } else if (currentPlatform === 'win32') {
    // Windows
    
    execSync('npm run electron:build:win', { stdio: 'inherit' });

  } else {
    // Linux أو أنظمة أخرى
    
    execSync('npm run electron:build', { stdio: 'inherit' });

  }

} catch (error) {
  process.exit(1);
}
