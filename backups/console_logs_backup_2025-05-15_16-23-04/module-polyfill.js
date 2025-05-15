/**
 * module-polyfill.js - يوفر تعريف لـ module في المتصفح
 * يُستخدم لحل مشكلة "module is not defined" في البيئات التي تعمل في المتصفح
 */

// تعريف module في النطاق العالمي إذا لم يكن موجودًا
if (typeof window !== 'undefined' && typeof module === 'undefined') {
  console.log('[ModulePolyfill] تعريف module في المتصفح');
  window.module = {
    exports: {},
    id: '/',
    filename: 'browser-module',
    loaded: true,
    parent: null,
    children: [],
    paths: []
  };
}

// تعريف exports في النطاق العالمي إذا لم يكن موجودًا
if (typeof window !== 'undefined' && typeof exports === 'undefined') {
  console.log('[ModulePolyfill] تعريف exports في المتصفح');
  window.exports = window.module.exports;
}

// تعريف require في النطاق العالمي إذا لم يكن موجودًا
if (typeof window !== 'undefined' && typeof require === 'undefined') {
  console.log('[ModulePolyfill] تعريف require في المتصفح');
  window.require = function(moduleName) {
    console.warn(`[ModulePolyfill] محاولة طلب وحدة ${moduleName} في المتصفح (وظيفة وهمية)`);
    
    // محاولة التعرف على الوحدات الشائعة
    if (moduleName === 'buffer' || moduleName === 'Buffer') {
      return { Buffer: window.Buffer };
    }
    if (moduleName === 'process') {
      return window.process;
    }
    if (moduleName === 'stream') {
      return window.stream;
    }
    if (moduleName === 'url') {
      return window.url;
    }
    if (moduleName === 'http') {
      return window.http;
    }
    if (moduleName === 'crypto') {
      return window.crypto;
    }
    
    // إرجاع كائن وهمي افتراضي
    return {};
  };
  
  // إضافة وظيفة require.main للتوافق
  window.require.main = window.module;
}

// تصدير للاستخدام في ES Modules
export const modulePolyfill = {
  module: typeof window !== 'undefined' ? window.module : undefined,
  exports: typeof window !== 'undefined' ? window.exports : undefined,
  require: typeof window !== 'undefined' ? window.require : undefined
};

export default modulePolyfill; 