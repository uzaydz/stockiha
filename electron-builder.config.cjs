/**
 * Electron Builder Configuration - Ultra Optimized for Minimal Bundle Size
 * تكوين محسّن بشكل فائق لتقليل حجم التطبيق
 *
 * الهدف: تقليل حجم التطبيق من ~5GB إلى ~100-150MB
 * 
 * التحسينات:
 * 1. استثناء كل الملفات غير الضرورية
 * 2. ضغط أقصى مع ASAR
 * 3. تضمين فقط ملفات Electron الأساسية
 * 4. فك ضغط better-sqlite3 فقط
 */

const config = {
  appId: "com.stockiha.desktop",
  productName: "Stockiha",

  // ✅ تفعيل ASAR للضغط مع أقصى ضغط
  asar: true,
  compression: "maximum",

  // ⚡ فك ضغط الملفات الأصلية المطلوبة فقط
  asarUnpack: [
    "**/better-sqlite3/**/*.node",
    "**/bindings/**/*",
  ],

  directories: {
    output: "dist-electron",
    buildResources: "assets"
  },

  // ⚡ الملفات المضمنة - محسّنة بشكل كبير جداً
  files: [
    // ✅ تضمين dist فقط
    "dist/**/*",

    // ✅ ملفات Electron الأساسية فقط
    "electron/main.cjs",
    "electron/preload.cjs",
    "electron/preload.secure.cjs",
    "electron/sqliteManager.cjs",
    "electron/updater.cjs",
    "electron/printManager.cjs",
    "electron/secureStorage.cjs",
    "electron/security-config.cjs",
    "electron/splash.html",

    // ✅ package.json مطلوب
    "package.json",

    // ❌ استثناء شامل - كل شيء غير ضروري
    "!**/*.map",
    "!**/*.map.js",
    "!**/node_modules/**/*",
    "!**/*.ts",
    "!**/*.tsx",
    "!**/*.md",
    "!**/*.markdown",
    "!**/README*",
    "!**/CHANGELOG*",
    "!**/LICENSE*",
    "!**/.git/**",
    "!**/.github/**",
    "!**/test/**",
    "!**/tests/**",
    "!**/__tests__/**",
    "!**/spec/**",
    "!**/specs/**",
    "!**/*.spec.*",
    "!**/*.test.*",
    "!**/example/**",
    "!**/examples/**",
    "!**/demo/**",
    "!**/demos/**",
    "!**/docs/**",
    "!**/doc/**",
    "!**/.vscode/**",
    "!**/.idea/**",
    "!**/coverage/**",
    "!**/.nyc_output/**",
    "!**/src/**",
    "!**/scripts/**",
    "!**/supabase/**",
    "!**/*.config.*",
    "!**/vite.config.*",
    "!**/tsconfig.*",
    "!**/eslint*",
    "!**/prettier*",
    "!**/.env*",
    "!**/Makefile",
    "!**/*.log",
    "!**/*.lock",
    "!**/yarn.lock",
    "!**/pnpm-lock.yaml",
    "!**/package-lock.json",
    "!**/bun.lockb",
    "!**/*.sql",
    "!**/*.yaml",
    "!**/*.yml",
    // Exclusions for source maps and other non-production files are kept, but we must NOT exclude images from dist

    // ❌ استثناء مجلدات غير ضرورية
    "!**/backups/**",
    "!**/migrations/**",
    "!**/database/**",
    "!**/sql/**",
    "!**/api/**",
    "!**/functions/**",
    "!**/.claude/**",
    "!**/.cursor/**",
    "!**/.agent/**",
    "!**/.pnpm-store/**",
    "!**/.wrangler/**",
    "!**/.vercel/**",

    // ❌ استثناء مجلدات Electron المنسوخة يدوياً
    "!electron/better-sqlite3/**",
    "!electron/electron-log/**",
    "!electron/electron-updater/**",
    "!electron/file-uri-to-path/**",
    "!electron/bindings/**",
  ],

  // ⚡ الموارد الإضافية - better-sqlite3 فقط (مُحسّن)
  extraResources: [
    {
      from: "node_modules/better-sqlite3",
      to: "better-sqlite3",
      filter: [
        "**/*.node",
        "build/Release/**/*.node",
        "lib/**/*.js",
        "package.json",
        // استثناء كل شيء آخر
        "!**/*.map",
        "!**/*.ts",
        "!**/*.md",
        "!**/*.txt",
        "!**/test/**",
        "!**/tests/**",
        "!**/docs/**",
        "!**/doc/**",
        "!**/deps/**/*.c",
        "!**/deps/**/*.h",
        "!**/deps/**/*.cpp",
        "!**/deps/**/*.cc",
        "!**/src/**/*.cpp",
        "!**/src/**/*.hpp",
        "!**/src/**/*.c",
        "!**/src/**/*.h",
        "!**/binding.gyp",
        "!**/.github/**",
        "!**/benchmark/**",
      ]
    },
    {
      from: "node_modules/bindings",
      to: "better-sqlite3/node_modules/bindings",
      filter: ["**/*.js", "package.json"]
    },
    {
      from: "node_modules/file-uri-to-path",
      to: "better-sqlite3/node_modules/file-uri-to-path",
      filter: ["**/*.js", "package.json"]
    }
  ],

  // ⚡ Hook قبل البناء
  beforeBuild: async (context) => {
    console.log("🔧 [electron-builder] Preparing ultra-optimized build...");
    console.log("📦 Platform:", context.platform.name);
    console.log("📦 Arch:", context.arch);
    return true;
  },

  // ⚡ Hook بعد الحزم - تنظيف إضافي
  afterPack: async (context) => {
    const fs = require('fs');
    const path = require('path');

    console.log("🧹 [electron-builder] Cleaning up packed app...");

    // حذف الملفات غير الضرورية من app.asar.unpacked
    const unpackedPath = path.join(context.appOutDir, 'resources', 'app.asar.unpacked');
    if (fs.existsSync(unpackedPath)) {
      console.log("📁 Unpacked path exists:", unpackedPath);
    }

    return true;
  },

  // Mac configuration - محسّن
  mac: {
    category: "public.app-category.business",
    target: [
      { target: "dmg", arch: ["arm64"] },  // فقط arm64 للتطوير السريع
      // لإضافة x64: { target: "dmg", arch: ["x64", "arm64"] }
    ],
    icon: "assets/icon.icns",
    hardenedRuntime: true,
    gatekeeperAssess: false,
    darkModeSupport: true,
    minimumSystemVersion: "10.15.0",
    // تحسين إضافي
    type: "distribution",
  },

  // Windows configuration - محسّن
  win: {
    target: [
      { target: "nsis", arch: ["x64"] }
    ],
    icon: "assets/icon.ico",
    compression: "maximum",
    // تحسين NSIS
    artifactName: "Stockiha-Setup-${version}.${ext}",
  },

  // NSIS installer options - محسّن
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    deleteAppDataOnUninstall: false,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    packElevateHelper: true,
    unicode: true,
    // تحسينات الحجم
    differentialPackage: true,
  },

  // Linux configuration
  linux: {
    target: ["AppImage"],
    category: "Office",
    icon: "assets/icon.png",
    artifactName: "Stockiha-${version}.${ext}",
  },

  // DMG options - ضغط أقصى
  dmg: {
    contents: [
      { x: 130, y: 220 },
      { x: 410, y: 220, type: "link", path: "/Applications" }
    ],
    window: { width: 540, height: 380 },
    format: "ULFO", // Ultra compressed
    artifactName: "Stockiha-${version}.${ext}",
  },

  // GitHub publish
  publish: {
    provider: "github",
    owner: "uzaydz",
    repo: "stockiha",
    releaseType: "release"
  },

  // Cache directory name - تغيير الاسم لمسح cache القديم
  updaterCacheDirName: "stockiha-updater-v2",

  // ⚡ تحسينات إضافية مهمة
  removePackageScripts: true,
  nodeGypRebuild: false,
  buildDependenciesFromSource: false,

  // استخدام الإصدار المثبت
  electronVersion: undefined,

  // Metadata
  extraMetadata: {
    main: "electron/main.cjs"
  },

  // ⚡ تحسين أداء البناء
  npmRebuild: false,

  // ⚡ حماية إضافية
  electronCompile: false,
};

module.exports = config;
