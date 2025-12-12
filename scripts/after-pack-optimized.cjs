/**
 * After-Pack Script - Optimized for Minimal Bundle Size
 * سكريبت ما بعد التجميع - محسّن لتقليل الحجم
 *
 * يقوم بـ:
 * 1. نسخ better-sqlite3 بشكل صحيح
 * 2. تنظيف الملفات غير الضرورية
 * 3. إزالة source maps
 * 4. إزالة ملفات التطوير
 */

const fs = require('fs-extra');
const path = require('path');

// الأنماط المطلوب حذفها
const CLEANUP_PATTERNS = [
  // Source maps
  '**/*.map',
  '**/*.map.js',

  // TypeScript
  '**/*.ts',
  '**/*.tsx',
  '**/*.d.ts',

  // Documentation
  '**/README*',
  '**/CHANGELOG*',
  '**/HISTORY*',
  '**/LICENSE*',
  '**/LICENCE*',
  '**/COPYING*',
  '**/AUTHORS*',
  '**/CONTRIBUTORS*',
  '**/*.md',
  '**/*.markdown',
  '**/docs/**',
  '**/doc/**',

  // Tests
  '**/test/**',
  '**/tests/**',
  '**/__tests__/**',
  '**/spec/**',
  '**/specs/**',
  '**/*.spec.*',
  '**/*.test.*',
  '**/coverage/**',
  '**/.nyc_output/**',

  // Examples
  '**/example/**',
  '**/examples/**',
  '**/demo/**',
  '**/sample/**',
  '**/samples/**',

  // Build artifacts
  '**/Makefile',
  '**/Gruntfile*',
  '**/Gulpfile*',
  '**/binding.gyp',
  '**/*.gyp',
  '**/*.gypi',

  // Source files (C/C++)
  '**/*.c',
  '**/*.h',
  '**/*.cpp',
  '**/*.hpp',
  '**/*.cc',
  '**/*.hh',

  // Config files
  '**/.eslint*',
  '**/.prettier*',
  '**/.editorconfig',
  '**/.travis*',
  '**/.circleci/**',
  '**/.github/**',
  '**/tsconfig*',
  '**/tslint*',
  '**/jsconfig*',
  '**/.babelrc*',
  '**/babel.config*',
  '**/webpack.config*',
  '**/rollup.config*',
  '**/vite.config*',
  '**/.nvmrc',
  '**/.node-version',
  '**/.npmignore',
  '**/.gitignore',
  '**/.gitattributes',

  // IDE
  '**/.vscode/**',
  '**/.idea/**',
  '**/*.swp',
  '**/*.swo',
  '**/*~',

  // Other
  '**/yarn.lock',
  '**/pnpm-lock.yaml',
  '**/package-lock.json',
  '**/*.log',
  '**/npm-debug.log*',
];

// المجلدات المطلوب حذفها بالكامل
const FOLDERS_TO_DELETE = [
  // مكتبات التطوير فقط
  '@types',
  '@typescript-eslint',
  'typescript',
  'eslint',
  'prettier',
  'stylelint',

  // Build tools
  'webpack',
  'rollup',
  'parcel',
  'esbuild',
  'terser',
  'uglify-js',
  'babel-core',
  '@babel/core',

  // Test frameworks
  'jest',
  'mocha',
  'chai',
  'sinon',
  'nyc',
  'istanbul',

  // Dev utilities
  'nodemon',
  'ts-node',
  'concurrently',
  'wait-on',

  // Electron dev tools (في runtime لا نحتاجها)
  'electron-rebuild',
  'electron-builder',
  '@electron',

  // Icons JSON (ضخم جداً - 386MB)
  '@iconify/json',

  // غير مستخدمة في Desktop
  'wrangler',
  '@cloudflare',
  'miniflare',

  // Next.js (غير مستخدم)
  'next',
  '@next',
];

// دالة للحصول على حجم المجلد
async function getFolderSize(folderPath) {
  let size = 0;
  try {
    const files = await fs.readdir(folderPath, { withFileTypes: true });
    for (const file of files) {
      const filePath = path.join(folderPath, file.name);
      if (file.isDirectory()) {
        size += await getFolderSize(filePath);
      } else {
        const stats = await fs.stat(filePath);
        size += stats.size;
      }
    }
  } catch (e) {
    // تجاهل الأخطاء
  }
  return size;
}

// دالة لتنظيف مجلد
async function cleanupFolder(folderPath, patterns) {
  const glob = require('glob');
  let deletedCount = 0;
  let deletedSize = 0;

  for (const pattern of patterns) {
    try {
      const matches = glob.sync(pattern, {
        cwd: folderPath,
        absolute: true,
        dot: true,
        nodir: false,
      });

      for (const match of matches) {
        try {
          const stats = await fs.stat(match);
          const size = stats.isDirectory() ? await getFolderSize(match) : stats.size;

          await fs.remove(match);
          deletedCount++;
          deletedSize += size;
        } catch (e) {
          // تجاهل الأخطاء
        }
      }
    } catch (e) {
      // تجاهل الأخطاء
    }
  }

  return { deletedCount, deletedSize };
}

// دالة لحذف مجلدات معينة
async function deleteFolders(baseDir, folders) {
  let deletedSize = 0;

  for (const folder of folders) {
    const folderPath = path.join(baseDir, folder);
    if (await fs.pathExists(folderPath)) {
      const size = await getFolderSize(folderPath);
      await fs.remove(folderPath);
      deletedSize += size;
      console.log(`  🗑️  Deleted: ${folder} (${(size / 1024 / 1024).toFixed(2)} MB)`);
    }
  }

  return deletedSize;
}

// الدالة الرئيسية
module.exports = async function(context) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🚀 [after-pack-optimized] Starting optimization...');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const appOutDir = context.appOutDir;
  const platform = context.electronPlatformName;
  const productName = context.packager.appInfo.productFilename;

  console.log(`📦 Platform: ${platform}`);
  console.log(`📦 Product: ${productName}`);
  console.log(`📦 Output Dir: ${appOutDir}\n`);

  // تحديد مسار الموارد
  let resourcesPath;
  if (platform === 'darwin') {
    resourcesPath = path.join(appOutDir, `${productName}.app`, 'Contents', 'Resources');
  } else {
    resourcesPath = path.join(appOutDir, 'resources');
  }

  const asarPath = path.join(resourcesPath, 'app.asar');
  const unpackedPath = path.join(resourcesPath, 'app.asar.unpacked');

  // 1. التحقق من better-sqlite3
  console.log('📋 Step 1: Verifying better-sqlite3...');
  const betterSqlitePath = path.join(resourcesPath, 'better-sqlite3');
  const sourceBetterSqlite = path.join(__dirname, '..', 'node_modules', 'better-sqlite3');

  if (await fs.pathExists(sourceBetterSqlite)) {
    const nativeBinaryPath = path.join(sourceBetterSqlite, 'build', 'Release', 'better_sqlite3.node');

    if (await fs.pathExists(nativeBinaryPath)) {
      console.log('  ✅ Native binary found');

      // نسخ إذا لم يكن موجوداً
      if (!(await fs.pathExists(betterSqlitePath))) {
        await fs.ensureDir(betterSqlitePath);
      }

      // نسخ الملفات الضرورية فقط
      const targetBuildDir = path.join(betterSqlitePath, 'build', 'Release');
      await fs.ensureDir(targetBuildDir);
      await fs.copy(nativeBinaryPath, path.join(targetBuildDir, 'better_sqlite3.node'));

      // نسخ lib
      const libDir = path.join(sourceBetterSqlite, 'lib');
      if (await fs.pathExists(libDir)) {
        await fs.copy(libDir, path.join(betterSqlitePath, 'lib'), {
          filter: (src) => !src.endsWith('.map') && !src.endsWith('.ts')
        });
      }

      // نسخ package.json
      const pkgJson = path.join(sourceBetterSqlite, 'package.json');
      if (await fs.pathExists(pkgJson)) {
        await fs.copy(pkgJson, path.join(betterSqlitePath, 'package.json'));
      }

      // نسخ bindings
      const bindingsSource = path.join(__dirname, '..', 'node_modules', 'bindings');
      const bindingsTarget = path.join(betterSqlitePath, 'node_modules', 'bindings');
      if (await fs.pathExists(bindingsSource)) {
        await fs.ensureDir(bindingsTarget);
        await fs.copy(bindingsSource, bindingsTarget, {
          filter: (src) => src.endsWith('.js') || src.endsWith('package.json') || fs.statSync(src).isDirectory()
        });
      }

      // نسخ file-uri-to-path
      const fileUriSource = path.join(__dirname, '..', 'node_modules', 'file-uri-to-path');
      const fileUriTarget = path.join(betterSqlitePath, 'node_modules', 'file-uri-to-path');
      if (await fs.pathExists(fileUriSource)) {
        await fs.ensureDir(fileUriTarget);
        await fs.copy(fileUriSource, fileUriTarget, {
          filter: (src) => src.endsWith('.js') || src.endsWith('package.json') || fs.statSync(src).isDirectory()
        });
      }

      console.log('  ✅ better-sqlite3 setup complete');
    } else {
      console.error('  ❌ Native binary not found! Run: npm run rebuild');
    }
  }

  // 2. تنظيف app.asar.unpacked إذا وجد
  console.log('\n📋 Step 2: Cleaning unpacked resources...');
  if (await fs.pathExists(unpackedPath)) {
    const nodeModulesUnpacked = path.join(unpackedPath, 'node_modules');
    if (await fs.pathExists(nodeModulesUnpacked)) {
      // حذف المجلدات غير الضرورية
      const deletedSize = await deleteFolders(nodeModulesUnpacked, FOLDERS_TO_DELETE);
      console.log(`  ✅ Cleaned unpacked node_modules: ${(deletedSize / 1024 / 1024).toFixed(2)} MB freed`);
    }
  }

  // 3. تنظيف مجلد better-sqlite3
  console.log('\n📋 Step 3: Cleaning better-sqlite3...');
  if (await fs.pathExists(betterSqlitePath)) {
    // حذف الملفات غير الضرورية
    const depsDir = path.join(betterSqlitePath, 'deps');
    const srcDir = path.join(betterSqlitePath, 'src');

    if (await fs.pathExists(depsDir)) {
      const depsSize = await getFolderSize(depsDir);
      await fs.remove(depsDir);
      console.log(`  🗑️  Deleted deps: ${(depsSize / 1024 / 1024).toFixed(2)} MB`);
    }

    if (await fs.pathExists(srcDir)) {
      const srcSize = await getFolderSize(srcDir);
      await fs.remove(srcDir);
      console.log(`  🗑️  Deleted src: ${(srcSize / 1024 / 1024).toFixed(2)} MB`);
    }
  }

  // 4. التحقق النهائي
  console.log('\n📋 Step 4: Final verification...');
  const finalBinaryPath = path.join(betterSqlitePath, 'build', 'Release', 'better_sqlite3.node');
  if (await fs.pathExists(finalBinaryPath)) {
    const stats = await fs.stat(finalBinaryPath);
    console.log(`  ✅ better_sqlite3.node: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  } else {
    console.error('  ❌ CRITICAL: better_sqlite3.node not found in final package!');
  }

  // 5. حساب الحجم النهائي
  console.log('\n📋 Step 5: Calculating final size...');
  if (await fs.pathExists(asarPath)) {
    const asarStats = await fs.stat(asarPath);
    console.log(`  📦 app.asar: ${(asarStats.size / 1024 / 1024).toFixed(2)} MB`);
  }

  if (await fs.pathExists(betterSqlitePath)) {
    const sqliteSize = await getFolderSize(betterSqlitePath);
    console.log(`  📦 better-sqlite3: ${(sqliteSize / 1024 / 1024).toFixed(2)} MB`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('✅ [after-pack-optimized] Optimization complete!');
  console.log('═══════════════════════════════════════════════════════════════\n');
};
