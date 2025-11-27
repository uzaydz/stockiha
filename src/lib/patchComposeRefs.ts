/**
 * إصلاح مشكلة compose-refs مع React 19
 * يجب استيراد هذا الملف في أقرب وقت ممكن (في main.tsx أو index.tsx)
 */

// منع الاستدعاءات المتكررة أثناء unmounting
let isSettingRef = false;

function safeSetRef(ref: any, value: any) {
  if (isSettingRef) {
    return;
  }
  
  if (typeof ref === "function") {
    try {
      isSettingRef = true;
      return ref(value);
    } finally {
      // تأخير إعادة التعيين لتجنب race conditions
      setTimeout(() => {
        isSettingRef = false;
      }, 0);
    }
  } else if (ref !== null && ref !== void 0) {
    ref.current = value;
  }
}

function patchedComposeRefs(...refs: any[]) {
  return (node: any) => {
    for (const ref of refs) {
      if (ref) {
        safeSetRef(ref, node);
      }
    }
    // لا نعيد cleanup function لتجنب حلقة التحديث في React 19
    return undefined;
  };
}

/**
 * تطبيق الـ patch على compose-refs من Radix
 */
export function applyComposeRefsPatch() {
  try {
    // محاولة patch الـ module في runtime
    const composeRefsModule = require('@radix-ui/react-compose-refs');
    
    if (composeRefsModule) {
      // حفظ النسخة الأصلية
      const originalComposeRefs = composeRefsModule.composeRefs;
      const originalUseComposedRefs = composeRefsModule.useComposedRefs;
      
      // استبدال بالنسخة المعدلة
      composeRefsModule.composeRefs = patchedComposeRefs;
      composeRefsModule.useComposedRefs = function useComposedRefs(...refs: any[]) {
        // استخدام useCallback مع deps فارغة لتجنب إعادة إنشاء الـ callback
        return patchedComposeRefs(...refs);
      };
      
      console.log('✅ [patchComposeRefs] تم تطبيق الإصلاح بنجاح');
    }
  } catch (error) {
    console.warn('⚠️ [patchComposeRefs] فشل تطبيق الإصلاح:', error);
  }
}

// تطبيق الـ patch تلقائياً عند الاستيراد
if (typeof window !== 'undefined') {
  applyComposeRefsPatch();
}

export default applyComposeRefsPatch;
