/**
 * وظائف الوصول إلى متغيرات البيئة للتطبيق
 */

// الحصول على رمز وصول Vercel API
export const getVercelToken = (): string => {
  // قيمة مباشرة للاختبار - قم بتغييرها للإنتاج
  return 'qibJizhHiQTdPVb6te0S7SCq';
};

// الحصول على معرف مشروع Vercel
export const getVercelProjectId = (): string => {
  // قيمة مباشرة للاختبار - قم بتغييرها للإنتاج
  return 'stockiha';
};

// التحقق من توفر متغيرات Vercel API
export const hasVercelConfig = (): boolean => {
  const token = getVercelToken();
  const projectId = getVercelProjectId();
  
  
  
  
  // التحقق من وجود القيم
  return !!token && !!projectId;
}; 