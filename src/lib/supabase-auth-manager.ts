// تبسيط النهج - استخدام العميل الأصلي مع تحسينات
import { supabase as originalSupabase } from '@/lib/supabase';

/**
 * دالة للحصول على عميل Supabase مع ضمان المصادقة الصحيحة
 */
export const getAuthenticatedSupabase = async () => {
  // التحقق من الجلسة الحالية
  const { data: { session }, error } = await originalSupabase.auth.getSession();
  
  if (error) {
    console.error('❌ خطأ في الحصول على الجلسة:', error);
    throw new Error('فشل في المصادقة');
  }

  if (!session || !session.access_token) {
    throw new Error('لا توجد جلسة صحيحة. يرجى تسجيل الدخول مرة أخرى.');
  }

  // تحديث headers مباشرة في العميل
  if (originalSupabase.rest.headers && session.access_token) {
    originalSupabase.rest.headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  return originalSupabase;
};

// إصدار للتوافق مع الكود الموجود
export const supabase = originalSupabase;