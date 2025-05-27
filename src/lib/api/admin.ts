import { supabase } from '@/lib/supabase';
import { createUser } from './users';
import type { Database } from '@/types/database.types';

export type UserPermissions = {
  manageProducts: boolean;
  manageServices: boolean;
  manageOrders: boolean;
  manageUsers: boolean;
  manageEmployees: boolean;
  viewReports: boolean;
  accessPOS: boolean;
  processPayments: boolean;
};

// وظيفة لتسجيل مستخدم مسؤول جديد
export const registerAdmin = async (
  email: string,
  password: string,
  name: string,
  phone?: string
): Promise<{
  success: boolean;
  error: Error | null;
  userId?: string;
}> => {
  try {
    // 1. تسجيل المستخدم في نظام المصادقة Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role: 'admin' }
      }
    });

    if (authError) {
      return { success: false, error: authError };
    }

    // 2. إنشاء سجل المستخدم في جدول المستخدمين مع دور المسؤول والصلاحيات
    if (authData.user) {
      const adminPermissions: UserPermissions = {
        manageProducts: true,
        manageServices: true,
        manageOrders: true,
        manageUsers: true,
        manageEmployees: true,
        viewReports: true,
        accessPOS: true,
        processPayments: true
      };

      // استخدام RPC (تجاوز RLS) لإنشاء المستخدم
      const { data, error } = await supabase.rpc('create_user', {
        user_id: authData.user.id,
        user_email: email,
        user_name: name,
        user_phone: phone || null,
        user_role: 'admin',
        user_permissions: adminPermissions,
        user_is_active: true
      });

      if (error) {
        // محاولة بديلة: استخدام الوصول المباشر مع تعطيل RLS
        try {
          const { data, error: directError } = await supabase
            .from('users')
            .insert({
              id: authData.user.id,
              email,
              name,
              phone: phone || null,
              role: 'admin',
              permissions: adminPermissions,
              is_active: true
            });

          if (directError) {
            return { success: false, error: directError };
          }
        } catch (insertError) {
          return { success: false, error: error };
        }
      }

      return {
        success: true,
        error: null,
        userId: authData.user.id
      };
    }

    return {
      success: false,
      error: new Error('Failed to create admin user')
    };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};

/**
 * يتحقق مما إذا كان المستخدم مسؤولاً في مؤسسة معينة باستخدام البريد الإلكتروني
 */
export const isUserAdminByEmail = async (email: string, organizationId: string): Promise<boolean> => {
  try {

    const { data, error } = await supabase
      .from('users')
      .select('is_org_admin')
      .eq('email', email)
      .eq('organization_id', organizationId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // لم يتم العثور على المستخدم
        
        return false;
      }
      return false;
    }
    
    return Boolean(data.is_org_admin);
  } catch (error) {
    return false;
  }
};

/**
 * يتحقق مما إذا كان المستخدم مسؤولاً
 */
export const isUserAdmin = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role, is_org_admin')
      .eq('id', userId)
      .single();
    
    if (error) {
      return false;
    }
    
    // اعتبار المستخدم مسؤولاً إذا كان دوره "admin" أو كان مسؤول المؤسسة
    return data.role === 'admin' || Boolean(data.is_org_admin);
  } catch (error) {
    return false;
  }
};

/**
 * يحصل على معرف المستخدم بناءً على البريد الإلكتروني
 */
export const getUserIdByEmail = async (email: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
    
    if (error) {
      if (error.code !== 'PGRST116') {
      }
      return null;
    }
    
    return data.id;
  } catch (error) {
    return null;
  }
};
