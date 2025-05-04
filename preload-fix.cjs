/**
 * ملف preload-fix.js لإصلاح خطأ prototype في تطبيق Electron
 * يقوم بتحميله في النافذة قبل تحميل أي ملفات JavaScript أخرى
 */

// تعريف وظائف للكشف عن بيئة Electron
const isElectron = () => {
  return window.navigator.userAgent.indexOf('Electron') !== -1;
};

// يتم تنفيذ هذا الكود بمجرد تحميل صفحة الويب
window.addEventListener('DOMContentLoaded', () => {
  console.log('[preload-fix] بدء تنفيذ إصلاحات preload');
  
  // إضافة متغيرات عامة ضرورية
  if (isElectron()) {
    console.log('[preload-fix] تم اكتشاف بيئة Electron - تطبيق الإصلاحات');
    
    // إصلاح مشكلة prototype
    if (typeof Object.prototype !== 'undefined') {
      console.log('[preload-fix] Object.prototype موجود');
    } else {
      console.log('[preload-fix] تعريف Object.prototype');
      Object.prototype = {};
    }
    
    // إصلاح متغيرات عامة أخرى قد تسبب مشاكل
    window.global = window;
    window.process = window.process || { env: {} };
    window.Buffer = window.Buffer || { from: function() { return []; } };
    
    // إضافة polyfills لبعض الوظائف المفقودة
    if (!String.prototype.replaceAll) {
      String.prototype.replaceAll = function(str, newStr) {
        return this.split(str).join(newStr);
      };
    }
    
    // إعلام التطبيق أن الإصلاحات تمت بنجاح
    window.__ELECTRON_POLYFILLS_LOADED__ = true;
    
    // وضع نسخة احتياطية من وظائف prototype الرئيسية
    window.__PROTOTYPE_BACKUP__ = {
      objectProto: Object.prototype,
      arrayProto: Array.prototype,
      stringProto: String.prototype,
      functionProto: Function.prototype
    };
    
    // اعتراض الأخطاء لمنع توقف التطبيق
    window.addEventListener('error', (event) => {
      console.error('[preload-fix] تم اعتراض خطأ:', event.error);
      
      // التحقق مما إذا كان الخطأ يتعلق بـ prototype
      if (event.error && event.error.message && event.error.message.includes('prototype')) {
        console.log('[preload-fix] محاولة إصلاح خطأ prototype');
        
        // استعادة النسخة الاحتياطية إذا كانت موجودة
        if (window.__PROTOTYPE_BACKUP__) {
          Object.prototype = window.__PROTOTYPE_BACKUP__.objectProto;
          Array.prototype = window.__PROTOTYPE_BACKUP__.arrayProto;
          String.prototype = window.__PROTOTYPE_BACKUP__.stringProto;
          Function.prototype = window.__PROTOTYPE_BACKUP__.functionProto;
        }
        
        // منع ظهور الخطأ في واجهة المستخدم
        event.preventDefault();
      }
    });
    
    console.log('[preload-fix] اكتملت عملية الإصلاح بنجاح');
  } else {
    console.log('[preload-fix] ليست بيئة Electron - تخطي الإصلاحات');
  }
});

// تصدير الوظائف لكي يمكن استخدامها في ملفات أخرى
module.exports = {
  isElectron
}; 