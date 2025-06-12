/**
 * Supabase Client الرئيسي - محدث لحل مشاكل الكاش والمصادقة
 * يستخدم النظام الموحد الجديد لتجنب تعدد الـ instances
 */

// استيراد النظام الموحد الجديد
export { 
  supabase, 
  getSupabaseClient, 
  resetSupabaseClient, 
  supabaseHealthCheck 
} from './supabase-unified';

// إعادة تصدير أنواع البيانات
export type { Database } from '@/types/database.types';