/**
 * ============================================
 * ANALYTICS DIAGNOSTICS
 * تشخيص مشاكل التحميل في Analytics
 * ============================================
 */

const PREFIX = '🔍 [Analytics Diagnostics]';

export const diagnostics = {
  moduleStart: (moduleName: string) => {
    console.log(`${PREFIX} ▶️ بدء تحميل: ${moduleName}`);
    console.time(`${PREFIX} ⏱️ ${moduleName}`);
  },

  moduleLoaded: (moduleName: string) => {
    console.timeEnd(`${PREFIX} ⏱️ ${moduleName}`);
    console.log(`${PREFIX} ✅ تم تحميل: ${moduleName}`);
  },

  moduleError: (moduleName: string, error: any) => {
    console.timeEnd(`${PREFIX} ⏱️ ${moduleName}`);
    console.error(`${PREFIX} ❌ خطأ في: ${moduleName}`, error);
    console.error(`${PREFIX} 📍 Stack:`, error?.stack || 'No stack trace');
  },

  importCheck: (importName: string, module: any) => {
    if (module === undefined) {
      console.error(`${PREFIX} ⚠️ Import غير موجود: ${importName}`);
      return false;
    }
    console.log(`${PREFIX} ✓ Import موجود: ${importName}`, typeof module);
    return true;
  },

  exportCheck: (exports: Record<string, any>) => {
    console.group(`${PREFIX} 📦 فحص الـ Exports`);
    Object.entries(exports).forEach(([name, value]) => {
      if (value === undefined) {
        console.error(`  ❌ ${name}: undefined`);
      } else {
        console.log(`  ✓ ${name}: ${typeof value}`);
      }
    });
    console.groupEnd();
  },

  checkDefaultExport: (modulePath: string, module: any) => {
    if (!module) {
      console.error(`${PREFIX} ❌ Module is null/undefined: ${modulePath}`);
      return;
    }
    if (module.default === undefined) {
      console.error(`${PREFIX} ❌ No default export in: ${modulePath}`);
      console.log(`${PREFIX} 📋 Available exports:`, Object.keys(module));
    } else {
      console.log(`${PREFIX} ✓ Default export exists in: ${modulePath}`);
    }
  }
};

// تشخيص عند تحميل الملف
console.log(`${PREFIX} 🚀 Diagnostics module loaded`);

export default diagnostics;
