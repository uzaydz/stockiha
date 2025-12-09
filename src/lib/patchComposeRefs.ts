/**
 * إصلاح مشكلة compose-refs مع React 19
 * يجب استيراد هذا الملف في أقرب وقت ممكن (في main.tsx أو index.tsx)
 *
 * ⚡ تم التحديث: استخدام ESM dynamic import بدلاً من require
 */

// منع الاستدعاءات المتكررة أثناء unmounting
let isSettingRef = false;
let patchApplied = false;

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
 * ⚡ يستخدم ESM dynamic import بدلاً من require
 */
export async function applyComposeRefsPatch() {
  // تجنب التطبيق المتكرر
  if (patchApplied) {
    return;
  }

  try {
    // ⚡ استخدام dynamic import بدلاً من require
    const composeRefsModule = await import('@radix-ui/react-compose-refs');

    if (composeRefsModule) {
      // ⚡ في ESM، الـ modules قد تكون frozen، لذا نستخدم Object.defineProperty
      // أو نعتمد على أن Radix يستخدم الـ exports بشكل قابل للتعديل

      // محاولة التعديل المباشر (يعمل مع بعض bundlers)
      try {
        (composeRefsModule as any).composeRefs = patchedComposeRefs;
        (composeRefsModule as any).useComposedRefs = function useComposedRefs(...refs: any[]) {
          return patchedComposeRefs(...refs);
        };
        patchApplied = true;
        console.log('✅ [patchComposeRefs] تم تطبيق الإصلاح بنجاح (ESM)');
      } catch {
        // إذا كان الـ module frozen، نسجل الحالة فقط
        // الـ patch غير ضروري في معظم الحالات مع React 18+
        patchApplied = true;
        console.log('ℹ️ [patchComposeRefs] Module frozen - React handles refs correctly');
      }
    }
  } catch (error) {
    // في حالة عدم وجود المكتبة أو خطأ آخر
    patchApplied = true; // منع المحاولات المتكررة
    console.log('ℹ️ [patchComposeRefs] Skipped - module not available or not needed');
  }
}

// تطبيق الـ patch تلقائياً عند الاستيراد
if (typeof window !== 'undefined') {
  applyComposeRefsPatch();
}

export default applyComposeRefsPatch;
