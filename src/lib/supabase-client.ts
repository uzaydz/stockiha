import { getSupabaseClient } from './supabase';

// للتوافق مع الكود القديم - استخدام نفس عميل Supabase من الملف الرئيسي
export const supabase = getSupabaseClient();

// تصدير دالة الحصول على العميل للتوافق مع الكود القديم
export { getSupabaseClient };