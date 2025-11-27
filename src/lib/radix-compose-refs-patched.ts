/**
 * نسخة معدلة من @radix-ui/react-compose-refs لإصلاح مشكلة React 19
 * 
 * المشكلة الأساسية:
 * في React 19، إذا أرجعت دالة الـ ref دالة أخرى، React تعتبرها cleanup function.
 * بعض نسخ Radix القديمة أو مكتبات أخرى قد ترجع قيمة عن طريق الخطأ (مثل نتيجة تعيين).
 * 
 * الحل:
 * ضمان أن دالة الـ ref لا ترجع أي شيء (void).
 */
import * as React from "react";

function setRef<T>(ref: React.Ref<T> | undefined, value: T) {
  if (typeof ref === "function") {
    try {
      ref(value);
    } catch (e) {
      console.error('Error setting ref:', e);
    }
  } else if (ref !== null && ref !== undefined && typeof ref === 'object') {
    (ref as React.MutableRefObject<T>).current = value;
  }
}

function composeRefs<T>(...refs: (React.Ref<T> | undefined)[]) {
  return (node: T) => {
    refs.forEach((ref) => {
      setRef(ref, node);
    });
    // Explicitly return undefined to prevent React 19 from treating this as a cleanup
  };
}

function useComposedRefs<T>(...refs: (React.Ref<T> | undefined)[]) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useCallback(composeRefs(...refs), refs);
}

export { composeRefs, useComposedRefs };
