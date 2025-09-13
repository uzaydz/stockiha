/**
 * إصلاح مشكلة تحميل المنتجات
 * ملف مساعد لحل مشكلة "جاري التحميل" المستمرة
 */

/**
 * فحص ما إذا كان المنتج متوفراً للعرض
 */
export function isProductReadyForDisplay(
  product: any,
  initialData: any,
  isLoading: boolean
): boolean {
  // إذا كان لدينا منتج، فهو جاهز للعرض
  if (product?.id) return true;
  
  // إذا كان لدينا بيانات مبدئية، فهو جاهز للعرض
  if (initialData?.product?.id) return true;
  
  // إذا لم نكن نحمل، فهو جاهز للعرض (حتى لو كان فارغاً)
  if (!isLoading) return true;
  
  return false;
}

/**
 * فحص ما إذا كان يجب إظهار شاشة التحميل
 */
export function shouldShowLoadingScreen(
  product: any,
  initialData: any,
  isLoading: boolean,
  error: any
): boolean {
  // لا نظهر التحميل إذا كان لدينا منتج
  if (product?.id) return false;
  
  // لا نظهر التحميل إذا كان لدينا بيانات مبدئية
  if (initialData?.product?.id) return false;
  
  // لا نظهر التحميل إذا كان هناك خطأ
  if (error) return false;
  
  // نظهر التحميل فقط إذا كنا نحمل فعلياً
  return isLoading;
}

/**
 * فحص ما إذا كان يجب إظهار شريط التحميل الصغير
 */
export function shouldShowTopLoader(
  product: any,
  initialData: any,
  isLoading: boolean
): boolean {
  // لا نظهر الشريط إذا كان لدينا منتج
  if (product?.id) return false;
  
  // لا نظهر الشريط إذا كان لدينا بيانات مبدئية
  if (initialData?.product?.id) return false;
  
  // لا نظهر الشريط إذا لم نكن نحمل
  if (!isLoading) return false;
  
  // نظهر الشريط فقط إذا كنا نحمل فعلياً ولمدة قصيرة
  return isLoading;
}

/**
 * الحصول على رسالة التحميل المناسبة
 */
export function getLoadingMessage(
  product: any,
  initialData: any,
  isLoading: boolean
): string | null {
  // لا نظهر رسالة إذا كان لدينا منتج
  if (product?.id) return null;
  
  // لا نظهر رسالة إذا كان لدينا بيانات مبدئية
  if (initialData?.product?.id) return null;
  
  // نظهر رسالة فقط إذا كنا نحمل فعلياً
  return isLoading ? "جاري التحميل..." : null;
}

/**
 * فحص ما إذا كانت البيانات المشتركة جاهزة
 */
export function isSharedDataReady(
  organization: any,
  organizationSettings: any,
  isLoading: boolean
): boolean {
  // إذا لم نكن نحمل، البيانات جاهزة
  if (!isLoading) return true;
  
  // إذا كان لدينا بيانات صالحة، البيانات جاهزة
  if (organization || organizationSettings) return true;
  
  return false;
}

/**
 * إجبار إيقاف حالة التحميل إذا كانت البيانات متوفرة
 */
export function forceStopLoadingIfDataAvailable(
  isLoading: boolean,
  organization: any,
  organizationSettings: any,
  windowData: any
): boolean {
  // إذا لم نكن نحمل، لا نحتاج لإجبار الإيقاف
  if (!isLoading) return false;
  
  // إذا كان لدينا بيانات صالحة، أجبر إيقاف التحميل
  if (organization || organizationSettings || windowData) {
    return true;
  }
  
  return false;
}
