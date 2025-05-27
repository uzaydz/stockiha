/**
 * وظائف معالجة أخطاء الشبكة أثناء المزامنة
 */

import { MutableRefObject } from 'react';

/**
 * معالجة أخطاء الشبكة أثناء المزامنة
 * @param errorCountRef مرجع لعدد الأخطاء المتتالية
 * @param lastErrorTimeRef مرجع لوقت آخر خطأ
 * @param maxConsecutiveErrors الحد الأقصى للأخطاء المتتالية قبل إيقاف المزامنة
 * @param errorResetTime وقت إعادة تعيين عداد الأخطاء (بالمللي ثانية)
 * @param syncAbortedRef مرجع لحالة إلغاء المزامنة
 * @param onAbort وظيفة تنفذ عند إلغاء المزامنة بسبب الأخطاء المتكررة
 * @returns true إذا تم تجاوز الحد الأقصى للأخطاء وتم إلغاء المزامنة
 */
export function handleNetworkError(
  errorCountRef: MutableRefObject<number>,
  lastErrorTimeRef: MutableRefObject<number>,
  maxConsecutiveErrors: number,
  errorResetTime: number,
  syncAbortedRef: MutableRefObject<boolean>,
  onAbort: () => void
): boolean {
  const now = Date.now();
  
  // إعادة تعيين عداد الأخطاء إذا مر وقت كافٍ منذ آخر خطأ
  if (now - lastErrorTimeRef.current > errorResetTime) {
    errorCountRef.current = 0;
  }
  
  // تحديث وقت آخر خطأ
  lastErrorTimeRef.current = now;
  
  // زيادة عداد الأخطاء
  errorCountRef.current += 1;
  
  // التحقق من تجاوز الحد الأقصى للأخطاء
  if (errorCountRef.current >= maxConsecutiveErrors && !syncAbortedRef.current) {
    syncAbortedRef.current = true;
    onAbort();
    return true;
  }
  
  return false;
}
