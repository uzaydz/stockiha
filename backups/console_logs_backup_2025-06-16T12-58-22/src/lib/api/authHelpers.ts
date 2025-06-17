import { getCachedUser, getCachedSession, getCachedAuth } from '@/lib/authCache';
import type { User, Session } from '@supabase/supabase-js';

/**
 * الحصول على المستخدم الحالي مع cache ذكي
 * بديل محسن لـ supabase.auth.getUser()
 */
export const getCurrentUser = async (): Promise<User | null> => {
  console.log('🔍 getCurrentUser: استخدام cache المصادقة');
  return await getCachedUser();
};

/**
 * الحصول على الجلسة الحالية مع cache ذكي
 * بديل محسن لـ supabase.auth.getSession()
 */
export const getCurrentSession = async (): Promise<Session | null> => {
  console.log('🔍 getCurrentSession: استخدام cache المصادقة');
  return await getCachedSession();
};

/**
 * الحصول على بيانات المصادقة الكاملة مع cache ذكي
 */
export const getCurrentAuth = async (): Promise<{ user: User | null; session: Session | null }> => {
  console.log('🔍 getCurrentAuth: استخدام cache المصادقة');
  return await getCachedAuth();
};

/**
 * التحقق من وجود مستخدم مصادق
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const user = await getCurrentUser();
  return !!user;
};

/**
 * الحصول على معرف المستخدم الحالي
 */
export const getCurrentUserId = async (): Promise<string | null> => {
  const user = await getCurrentUser();
  return user?.id || null;
};

/**
 * الحصول على بريد المستخدم الحالي
 */
export const getCurrentUserEmail = async (): Promise<string | null> => {
  const user = await getCurrentUser();
  return user?.email || null;
};

/**
 * التحقق من صلاحية الجلسة
 */
export const isSessionValid = async (): Promise<boolean> => {
  const session = await getCurrentSession();
  if (!session) return false;
  
  // التحقق من انتهاء صلاحية الجلسة
  const now = Math.floor(Date.now() / 1000);
  return session.expires_at ? session.expires_at > now : true;
}; 