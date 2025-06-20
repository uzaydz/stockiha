/**
 * ملف Supabase موحد - يحل مشكلة تعدد الـ instances
 * يضمن وجود client واحد فقط في كامل التطبيق
 * النسخة المبسطة والقياسية
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

// متغيرات البيئة
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and anonymous key are required.');
}

// Create a single, exported Supabase client instance
export const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // A single, consistent storage key across the app
    storageKey: 'bazaar-supabase-auth-unified-main', 
  },
  global: {
    headers: {
      'X-Client-Info': 'bazaar-unified-client-simplified',
    }
  }
});

/**
 * دالة للحصول على العميل. الاستيراد المباشر لـ `supabase` هو المفضل.
 */
export const getSupabaseClient = (): SupabaseClient<Database> => {
  return supabase;
};

/**
 * دالة بسيطة للتحقق من جاهزية العميل.
 */
export const isSupabaseReady = (): boolean => {
  return !!supabase;
};

/**
 * لم تعد هذه الدالة ضرورية مع العميل المبسط.
 */
export const cleanupSupabaseClients = (): void => {
  console.warn('[Supabase] cleanupSupabaseClients is deprecated and no longer needed.');
};

// إعادة تصدير أنواع البيانات للتوافق
export type { Database } from '@/types/database.types';
