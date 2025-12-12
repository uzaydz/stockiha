/**
 * Electron Builder Configuration - Optimized for Minimal Bundle Size
 * تكوين محسّن لتقليل حجم التطبيق
 *
 * الهدف: تقليل حجم التطبيق من ~230MB إلى ~80-100MB
 */

const config = {
  appId: "com.stockiha.desktop",
  productName: "Stockiha",

  // ✅ تفعيل ASAR للضغط
  asar: true,
  compression: "maximum", // أقصى ضغط

  // ⚡ فك ضغط الملفات الأصلية فقط
  asarUnpack: [
    "**/better-sqlite3/**/*.node",
    "**/bindings/**/*",
  ],

  directories: {
    output: "dist-electron",
    buildResources: "assets"
  },

  // ⚡ الملفات المضمنة - محسّنة بشكل كبير
  files: [
    // ✅ تضمين dist فقط
    "dist/**/*",

    // ✅ ملفات Electron الأساسية
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

    // ❌ استثناء كل شيء آخر
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

    // ❌ استثناء مجلدات Electron المنسوخة يدوياً
    "!electron/better-sqlite3/**",
    "!electron/electron-log/**",
    "!electron/electron-updater/**",
    "!electron/file-uri-to-path/**",
  ],

  // ⚡ الموارد الإضافية - better-sqlite3 فقط
  extraResources: [
    {
      from: "node_modules/better-sqlite3",
      to: "better-sqlite3",
      filter: [
        "**/*.node",
        "build/Release/**/*",
        "lib/**/*.js",
        "package.json",
        "!**/*.map",
        "!**/*.ts",
        "!**/*.md",
        "!**/test/**",
        "!**/docs/**",
        "!**/deps/**/*.c",
        "!**/deps/**/*.h",
        "!**/deps/**/*.cpp",
        "!**/src/**/*.cpp",
        "!**/src/**/*.hpp",
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

  // ⚡ تصفية node_modules
  beforeBuild: async (context) => {
    console.log("🔧 [electron-builder] Preparing optimized build...");
    return true;
  },

  afterPack: "./scripts/after-pack-optimized.cjs",

  // Mac configuration
  mac: {
    category: "public.app-category.business",
    target: [
      { target: "dmg", arch: ["x64", "arm64"] },
      { target: "zip", arch: ["x64", "arm64"] }
    ],
    icon: "assets/icon.icns",
    hardenedRuntime: true,
    gatekeeperAssess: false,
    // تقليل الحجم
    darkModeSupport: true,
    minimumSystemVersion: "10.15.0",
  },

  // Windows configuration
  win: {
    target: [
      { target: "nsis", arch: ["x64"] }  // إزالة ia32 لتقليل الحجم
    ],
    icon: "assets/icon.ico",
    // ضغط NSIS
    compression: "maximum",
  },

  // NSIS installer options
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    deleteAppDataOnUninstall: false,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    // تحسينات الحجم
    packElevateHelper: true,
    unicode: true,
  },

  // Linux configuration
  linux: {
    target: ["AppImage"],  // AppImage فقط
    category: "Office",
    icon: "assets/icon.png",
  },

  // DMG options - تحسين الحجم
  dmg: {
    contents: [
      { x: 130, y: 220 },
      { x: 410, y: 220, type: "link", path: "/Applications" }
    ],
    window: { width: 540, height: 380 },
    // ضغط أقصى
    format: "ULFO", // Ultra compressed
  },

  // GitHub publish
  publish: {
    provider: "github",
    owner: "uzaydz",
    repo: "stockiha",
    releaseType: "release"
  },

  // ⚡ تحسينات إضافية
  removePackageScripts: true,  // إزالة scripts من package.json
  nodeGypRebuild: false,       // لا إعادة بناء

  // Electron version - استخدام نفس الإصدار
  electronVersion: undefined,  // يستخدم الإصدار المثبت

  // ⚡ تصفية node_modules - الأهم!
  buildDependenciesFromSource: false,

  // قائمة الحزم المطلوبة فقط في runtime
  // باقي الحزم تُستثنى تلقائياً
  extraMetadata: {
    main: "electron/main.cjs"
  }
};

module.exports = config;
