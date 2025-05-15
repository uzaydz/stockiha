import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type User = Database['public']['Tables']['users']['Row'];
export type InsertUser = Database['public']['Tables']['users']['Insert'];
export type UpdateUser = Database['public']['Tables']['users']['Update'];

export const getUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from('users')
    .select('*');

  if (error) {
    console.error('Error fetching users:', error);
    throw error;
  }

  return data;
};

export const getUserById = async (id: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    // إذا كان الخطأ هو عدم وجود نتائج، نعيد null بدلاً من رفع استثناء
    if (error.code === 'PGRST116') {
      
      return null;
    }
    console.error(`Error fetching user ${id}:`, error);
    throw error;
  }

  return data;
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    // If no user is found, don't throw an error
    if (error.code === 'PGRST116') {
      
      return null;
    }
    console.error(`Error fetching user by email ${email}:`, error);
    throw error;
  }

  
  return data;
};

export const createUser = async (user: InsertUser): Promise<User> => {
  const { data, error } = await supabase
    .from('users')
    .insert(user)
    .select()
    .single();

  if (error) {
    console.error('Error creating user:', error);
    throw error;
  }

  return data;
};

export const updateUser = async (id: string, updates: UpdateUser): Promise<User> => {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Error updating user ${id}:`, error);
    throw error;
  }

  return data;
};

export const deleteUser = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting user ${id}:`, error);
    throw error;
  }
};

// Helper function to get current auth user's profile from the users table
export const getCurrentUserProfile = async (): Promise<User | null> => {
  // First get the current authenticated user's ID
  const { data: authData } = await supabase.auth.getUser();
  
  if (!authData.user) {
    return null;
  }
  
  try {
    // محاولة الحصول على المستخدم بواسطة المعرف
    let userProfile = await getUserById(authData.user.id);
    
    // إذا وجدنا المستخدم، نعيده
    if (userProfile) {
      return userProfile;
    }
    
    // إذا لم نجد المستخدم عن طريق المعرف، نحاول العثور عليه بواسطة البريد الإلكتروني
    if (authData.user.email) {
      const userByEmail = await getUserByEmail(authData.user.email);
      
      // إذا وجدنا المستخدم بواسطة البريد الإلكتروني
      if (userByEmail) {
        
        return userByEmail;
      }
    }
    
    // إذا لم نجد المستخدم عن طريق المعرف أو البريد الإلكتروني
    
    
    // إنشاء سجل للمستخدم بناءً على بيانات المصادقة فقط إذا لم يتم العثور عليه بطريقة أخرى
    if (authData.user.email) {
      // تحقق مرة أخرى من عدم وجود مستخدم بنفس البريد الإلكتروني
      const existingUser = await getUserByEmail(authData.user.email);
      if (existingUser) {
        
        return existingUser;
      }
      
      // استخراج الدور المحدد من البيانات الوصفية، أو استخدام 'customer' كدور افتراضي
      // هذا يتيح احترام الدور المحدد عند تسجيل المستخدم
      const userRole = authData.user.user_metadata?.role || 'customer';
      
      const newUser: InsertUser = {
        id: authData.user.id,
        email: authData.user.email,
        name: authData.user.user_metadata?.name || authData.user.user_metadata?.full_name || authData.user.email.split('@')[0] || 'User',
        role: userRole, // استخدام الدور من البيانات الوصفية
        is_active: true
      };
      
      try {
        // إنشاء سجل جديد للمستخدم
        const createdUser = await createUser(newUser);
        return createdUser;
      } catch (createError) {
        console.error("Error creating user profile:", createError);
        // محاولة الحصول على المستخدم مرة أخرى بواسطة البريد الإلكتروني
        return getUserByEmail(authData.user.email);
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error in getCurrentUserProfile:", error);
    return null;
  }
};

/**
 * الحصول على صلاحيات المستخدم بناءً على البريد الإلكتروني
 */
export const getUserPermissionsByEmail = async (email: string): Promise<any | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('permissions')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        
        return null;
      }
      console.error(`Error fetching permissions for user with email ${email}:`, error);
      throw error;
    }

    return data?.permissions || null;
  } catch (error) {
    console.error(`Error fetching permissions for email ${email}:`, error);
    return null;
  }
};

/**
 * تحديث صلاحيات المستخدم
 */
export const updateUserPermissions = async (userId: string, permissions: any): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('users')
      .update({ permissions })
      .eq('id', userId);

    if (error) {
      console.error(`Error updating permissions for user ${userId}:`, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Error updating permissions for user ${userId}:`, error);
    return false;
  }
}; 