/**
 * After-Pack Script for electron-builder
 * ضمان نسخ better-sqlite3 native module إلى التطبيق المُحزّم
 */

const fs = require('fs-extra');
const path = require('path');

module.exports = async function(context) {
  console.log('\n[after-pack] Starting better-sqlite3 verification...');

  const appOutDir = context.appOutDir;
  const platform = context.electronPlatformName;
  const productName = context.packager.appInfo.productFilename;

  console.log(`[after-pack] Platform: ${platform}`);
  console.log(`[after-pack] Product: ${productName}`);
  console.log(`[after-pack] App Output Dir: ${appOutDir}`);

  // تحديد المسار الصحيح بناءً على النظام
  let appResourcesPath;
  if (platform === 'darwin') {
    appResourcesPath = path.join(appOutDir, `${productName}.app`, 'Contents', 'Resources');
  } else if (platform === 'win32') {
    appResourcesPath = path.join(appOutDir, 'resources');
  } else {
    appResourcesPath = path.join(appOutDir, 'resources');
  }

  // المسار المصدر
  const sourcePath = path.join(__dirname, '..', 'node_modules', 'better-sqlite3');

  // المسار الهدف (في extraResources: Resources/better-sqlite3)
  const targetPath = path.join(appResourcesPath, 'better-sqlite3');

  console.log(`[after-pack] Source: ${sourcePath}`);
  console.log(`[after-pack] Target: ${targetPath}`);

  // التحقق من وجود المصدر
  if (!fs.existsSync(sourcePath)) {
    console.error('[after-pack] ❌ Source better-sqlite3 not found!');
    throw new Error('better-sqlite3 source directory not found');
  }

  // التحقق من وجود الملف الثنائي
  const nativeBinaryPath = path.join(sourcePath, 'build', 'Release', 'better_sqlite3.node');
  if (!fs.existsSync(nativeBinaryPath)) {
    console.error('[after-pack] ❌ Native binary not found! Run electron-rebuild first.');
    throw new Error('better_sqlite3.node not found. Please run: npm run rebuild');
  }

  console.log('[after-pack] ✅ Native binary exists:', nativeBinaryPath);

  // التحقق من وجود الهدف (يجب أن يكون electron-builder قد أنشأه بالفعل)
  if (fs.existsSync(targetPath)) {
    console.log('[after-pack] ✅ Target already exists (created by extraResources)');

    // التحقق من وجود الملف الثنائي في الهدف
    const targetBinaryPath = path.join(targetPath, 'build', 'Release', 'better_sqlite3.node');
    if (fs.existsSync(targetBinaryPath)) {
      console.log('[after-pack] ✅ Native binary exists in target');

      // التحقق من حجم الملف
      const sourceStats = fs.statSync(nativeBinaryPath);
      const targetStats = fs.statSync(targetBinaryPath);

      console.log(`[after-pack] Source binary size: ${sourceStats.size} bytes`);
      console.log(`[after-pack] Target binary size: ${targetStats.size} bytes`);

      if (sourceStats.size !== targetStats.size) {
        console.warn('[after-pack] ⚠️  Binary size mismatch! Re-copying...');
        await fs.copy(sourcePath, targetPath, {
          overwrite: true,
          filter: (src) => {
            const relativePath = path.relative(sourcePath, src);
            return !relativePath.startsWith('node_modules');
          }
        });
        console.log('[after-pack] ✅ Re-copied better-sqlite3');
      }
    } else {
      console.warn('[after-pack] ⚠️  Native binary missing in target! Copying...');
      await fs.copy(sourcePath, targetPath, {
        overwrite: true,
        filter: (src) => {
          const relativePath = path.relative(sourcePath, src);
          return !relativePath.startsWith('node_modules');
        }
      });
      console.log('[after-pack] ✅ Copied better-sqlite3');
    }
  } else {
    console.warn('[after-pack] ⚠️  Target directory does not exist! This should not happen with extraResources.');
    console.log('[after-pack] Creating and copying manually...');

    await fs.ensureDir(path.dirname(targetPath));
    await fs.copy(sourcePath, targetPath, {
      overwrite: true,
      filter: (src) => {
        // تجنب نسخ sub-node_modules داخل better-sqlite3
        const relativePath = path.relative(sourcePath, src);
        return !relativePath.startsWith('node_modules');
      }
    });
    console.log('[after-pack] ✅ Manually copied better-sqlite3');
  }

  // التحقق النهائي
  const finalBinaryPath = path.join(targetPath, 'build', 'Release', 'better_sqlite3.node');
  if (!fs.existsSync(finalBinaryPath)) {
    console.error('[after-pack] ❌ Final verification failed! Binary not found in target.');
    throw new Error('Failed to ensure better-sqlite3 binary in packaged app');
  }

  const finalStats = fs.statSync(finalBinaryPath);
  console.log(`[after-pack] ✅ Final verification successful!`);
  console.log(`[after-pack] Binary path: ${finalBinaryPath}`);
  console.log(`[after-pack] Binary size: ${finalStats.size} bytes`);

  // نسخ bindings dependency داخل better-sqlite3/node_modules
  const bindingsSource = path.join(__dirname, '..', 'node_modules', 'bindings');
  const bindingsTarget = path.join(targetPath, 'node_modules', 'bindings');

  if (fs.existsSync(bindingsSource)) {
    console.log('[after-pack] Copying bindings module inside better-sqlite3...');
    await fs.ensureDir(path.dirname(bindingsTarget));
    await fs.copy(bindingsSource, bindingsTarget, { overwrite: true });
    console.log('[after-pack] ✅ bindings copied to better-sqlite3/node_modules');
  } else {
    console.warn('[after-pack] ⚠️  bindings module not found');
  }

  // نسخ prebuild-install dependency داخل better-sqlite3/node_modules
  const prebuildSource = path.join(__dirname, '..', 'node_modules', 'prebuild-install');
  const prebuildTarget = path.join(targetPath, 'node_modules', 'prebuild-install');

  if (fs.existsSync(prebuildSource)) {
    console.log('[after-pack] Copying prebuild-install module inside better-sqlite3...');
    await fs.ensureDir(path.dirname(prebuildTarget));
    await fs.copy(prebuildSource, prebuildTarget, { overwrite: true });
    console.log('[after-pack] ✅ prebuild-install copied to better-sqlite3/node_modules');
  } else {
    console.warn('[after-pack] ⚠️  prebuild-install module not found');
  }

  // نسخ file-uri-to-path dependency (required by bindings)
  const fileUriSource = path.join(__dirname, '..', 'node_modules', 'file-uri-to-path');
  const fileUriTarget = path.join(targetPath, 'node_modules', 'file-uri-to-path');

  if (fs.existsSync(fileUriSource)) {
    console.log('[after-pack] Copying file-uri-to-path module...');
    await fs.copy(fileUriSource, fileUriTarget, { overwrite: true });
    console.log('[after-pack] ✅ file-uri-to-path copied');
  } else {
    console.warn('[after-pack] ⚠️  file-uri-to-path module not found');
  }

  console.log('[after-pack] better-sqlite3 setup complete!\n');
};
