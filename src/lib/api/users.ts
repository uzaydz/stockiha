import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/api/authHelpers';
import { getUser as getAuthUser } from '@/lib/auth-proxy';
import type { Database } from '@/types/database.types';
import type { User, InsertUser } from '@/types/user';
import { getUserProfile } from './userProfile';
import UnifiedRequestManager from '@/lib/unifiedRequestManager';

// المتغيرات البيئية
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

export type User = Database['public']['Tables']['users']['Row'];
export type InsertUser = Database['public']['Tables']['users']['Insert'];
export type UpdateUser = Database['public']['Tables']['users']['Update'];

export const getUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from('users')
    .select('*');

  if (error) {
    throw error;
  }

  return data;
};

export const getUserById = async (id: string): Promise<User | null> => {
  try {
    // استخدام UnifiedRequestManager إذا كان متاحاً لتقليل الطلبات المكررة
    if (UnifiedRequestManager && typeof UnifiedRequestManager.getUserById === 'function') {
      return await UnifiedRequestManager.getUserById(id);
    }
    
    // fallback للطريقة العادية
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle(); // استخدام maybeSingle بدلاً من single

    if (error) {
      return null;
    }

    return data;
  } catch (error) {
    return null;
  }
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle(); // استخدام maybeSingle بدلاً من single

  if (error) {
    return null;
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
    throw error;
  }

  return data;
};

/**
 * إنشاء مستخدم بطريقة آمنة مع التعامل مع المستخدمين المكررين
 */
export const createUserSafely = async (user: InsertUser): Promise<User | null> => {
  try {
    
    // محاولة إنشاء المستخدم مباشرة أولاً (أسرع)
    const { data, error } = await supabase
      .from('users')
      .insert(user)
      .select()
      .maybeSingle();

    if (!error && data) {
      return data;
    }

    // إذا فشل بسبب التكرار أو خطأ 409، حاول الحصول على المستخدم الموجود
    if ((error?.code === '23505' || (error as any)?.status === 409) && user.email) {
      
      // محاولة البحث بالمعرف أولاً
      let existingUser = await getUserById(user.id);
      
      // إذا لم نجده بالمعرف، نبحث بالبريد الإلكتروني
      if (!existingUser) {
        existingUser = await getUserByEmail(user.email);
      }
      
      if (existingUser) {
        // إذا كان auth_user_id فارغ، قم بتحديثه
        if (!existingUser.auth_user_id && user.auth_user_id) {
          try {
            return await updateUser(existingUser.id, {
              auth_user_id: user.auth_user_id,
              updated_at: new Date().toISOString()
            });
          } catch (updateError) {
            return existingUser;
          }
        }
        return existingUser;
      }
    }

    return null;
  } catch (error) {
    return null;
  }
};

export const updateUser = async (id: string, updates: UpdateUser): Promise<User> => {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
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
    throw error;
  }
};

// Cache للتقليل من الطلبات المتكررة
let profileCache: { [key: string]: { data: User; timestamp: number } } = {};
const CACHE_DURATION = 30 * 1000; // 30 ثانية

// وظيفة لتنظيف الـ cache
export const clearProfileCache = () => {
  profileCache = {};
};

// Helper function to get current auth user's profile from the users table - محسّن للسرعة
export const getCurrentUserProfile = async (): Promise<User | null> => {
  
  try {
    // التحقق من الـ cache أولاً
    const startTime = Date.now();
    
    let authData: any = null;
    
    // أولاً، محاولة استخراج البيانات من localStorage مباشرة (الأسرع)
    try {
      const storedSession = localStorage.getItem('bazaar_auth_state');
      if (storedSession) {
        const authState = JSON.parse(storedSession);
        if (authState.session?.user) {
          authData = { user: authState.session.user };
          
          // التحقق من الـ cache
          const userId = authState.session.user.id;
          const cachedProfile = profileCache[userId];
          if (cachedProfile && (startTime - cachedProfile.timestamp) < CACHE_DURATION) {
            return cachedProfile.data;
          }
        }
      }
    } catch (storageError) {
    }
    
    // إذا لم نجد بيانات في localStorage، استخدم getSession مع timeout قصير جداً
    if (!authData?.user) {
      try {
        const sessionPromise = supabase.auth.getSession();
        const quickTimeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Quick session timeout')), 500) // 500ms فقط
        );
        
        const { data: sessionData } = await Promise.race([sessionPromise, quickTimeoutPromise]);
        
        if (sessionData.session?.user) {
          authData = { user: sessionData.session.user };
          
          // التحقق من الـ cache
          const userId = sessionData.session.user.id;
          const cachedProfile = profileCache[userId];
          if (cachedProfile && (startTime - cachedProfile.timestamp) < CACHE_DURATION) {
            return cachedProfile.data;
          }
        }
              } catch (sessionError) {
        }
    }

    // إذا لم نجد بيانات أصلاً، محاولة أخيرة سريعة من مفاتيح تخزين أخرى
    if (!authData?.user) {
      
      try {
        // فحص مفاتيح تخزين مختلفة
        const altStorageKeys = [
          'bazaar-supabase-auth-unified',
          'supabase.auth.token',
          'sb-' + supabaseUrl?.split('//')[1]?.split('.')[0] + '-auth-token'
        ];
        
        for (const key of altStorageKeys) {
          const storedData = localStorage.getItem(key);
          if (storedData) {
            const sessionObj = JSON.parse(storedData);
            if (sessionObj.user || sessionObj.access_token) {
              authData = { user: sessionObj.user || sessionObj };
              break;
            }
          }
        }
      } catch (altStorageError) {
      }
    }

    // إذا لم نجد أي بيانات مصادقة، استخدم أسلوب مباشر مع timeout سريع
    if (!authData?.user) {
      try {
        const directPromise = getAuthUser();
        const directTimeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Direct auth timeout')), 300) // 300ms فقط
        );
        
        const { data: directData } = await Promise.race([directPromise, directTimeoutPromise]);
        
        if (directData.user) {
          authData = { user: directData.user };
        }
      } catch (directError) {
      }
    }

    // إذا لم نجد أي مستخدم، استخدم النظام المحسن
    if (!authData?.user) {
      const cachedUser = await getCurrentUser();
      if (cachedUser) {
        authData = { user: cachedUser };
      } else {
        return null;
      }
    }

    const authDuration = Date.now() - startTime;

    const dbStartTime = Date.now();
    let userProfile: User | null = null;

    // البحث عن المستخدم في قاعدة البيانات
    try {
      const dbPromise = supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authData.user.id)
        .maybeSingle();
      
      const shortDbTimeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('DB timeout after 1 second')), 1000) // 1 ثانية فقط
      );
      
      const { data: userById, error: idError } = await Promise.race([dbPromise, shortDbTimeoutPromise]);

      if (!idError && userById) {
        userProfile = userById;
        
        // محاولة جلب بيانات وكيل مركز الاتصال إذا كان موجوداً
        try {
          const { data: agentData, error: agentError } = await supabase
            .from('call_center_agents')
            .select('id, assigned_regions, assigned_stores, max_daily_orders, is_available, is_active, performance_metrics, specializations, work_schedule')
            .eq('user_id', userById.id)
            .eq('is_active', true)
            .maybeSingle();

          if (agentData) {
            userProfile = {
              ...userProfile,
              call_center_agent_id: agentData.id,
              assigned_regions: agentData.assigned_regions,
              assigned_stores: agentData.assigned_stores,
              max_daily_orders: agentData.max_daily_orders,
              is_call_center_available: agentData.is_available,
              is_call_center_active: agentData.is_active,
              call_center_performance_metrics: agentData.performance_metrics,
              specializations: agentData.specializations,
              work_schedule: agentData.work_schedule
            };
          } else {
          }
        } catch (agentError) {
        }
      }
    } catch (error) {
      // Silent error - لا نحاول إنشاء مستخدم جديد
    }

    const dbDuration = Date.now() - dbStartTime;

    // إذا وجدنا مستخدماً، نعيده وحفظه في الـ cache
    if (userProfile) {
      
      // حفظ organization_id في localStorage إذا كان متوفراً
      if (userProfile.organization_id) {
        const currentStoredId = localStorage.getItem('bazaar_organization_id');
        if (currentStoredId !== userProfile.organization_id) {
          localStorage.setItem('bazaar_organization_id', userProfile.organization_id);
        }
      }
      
      // حفظ في الـ cache
      profileCache[userProfile.id] = {
        data: userProfile,
        timestamp: Date.now()
      };
      
      return userProfile;
    }

    // إنشاء بيانات أساسية فوراً بدلاً من محاولة إنشاء في قاعدة البيانات (تجنب أخطاء 409/401)
    const userRole = authData.user.user_metadata?.role || 'customer';
    
    // محاولة الحصول على organization_id من مصادر مختلفة
    let organizationId = authData.user.user_metadata?.organization_id || localStorage.getItem('bazaar_organization_id');
    
    // إذا لم نجد organization_id، استخدم القيمة الافتراضية للمستخدم المحدد
    if (!organizationId) {
      // للمستخدم uzaydz33030@gmail.com، استخدم المؤسسة المخصصة له
      if (authData.user.email === 'uzaydz33030@gmail.com') {
        organizationId = 'fed872f9-1ade-4351-b020-5598fda976fe';
        localStorage.setItem('bazaar_organization_id', organizationId);
      }
    }
    
    const quickProfile: User = {
      id: authData.user.id,
      auth_user_id: authData.user.id,
      email: authData.user.email,
      name: authData.user.user_metadata?.name || 
           authData.user.user_metadata?.full_name || 
           authData.user.email.split('@')[0] || 'User',
      role: userRole,
      is_active: true,
      permissions: authData.user.user_metadata?.permissions || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      organization_id: organizationId
    } as User;

    // حفظ في الـ cache
    profileCache[quickProfile.id] = {
      data: quickProfile,
      timestamp: Date.now()
    };

    // لا نحاول إنشاء المستخدم في قاعدة البيانات لتجنب أخطاء RLS
    // بدلاً من ذلك، نعيد البيانات من auth metadata فقط
    
    return quickProfile;
    
  } catch (error) {
    
    // في حالة الخطأ العام، نحاول الحصول على الجلسة من localStorage
    try {
      const session = await supabase.auth.getSession();
      if (session.data.session?.user) {
        const user = session.data.session.user;
        const quickProfile = {
          id: user.id,
          auth_user_id: user.id,
          email: user.email || '',
          name: user.user_metadata?.name || 
               user.user_metadata?.full_name || 
               user.email?.split('@')[0] || 'User',
          role: user.user_metadata?.role || 'customer',
          is_active: true,
          permissions: user.user_metadata?.permissions || {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as User;
        
        // حفظ في الـ cache
        profileCache[quickProfile.id] = {
          data: quickProfile,
          timestamp: Date.now()
        };
        
        return quickProfile;
      }
    } catch (sessionError) {
    }
    
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
      throw error;
    }

    return data?.permissions || null;
  } catch (error) {
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
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
};

/**
 * الحصول على ملف المستخدم الحالي مع بيانات وكيل مركز الاتصال
 * دالة محسنة تجلب البيانات في استعلام واحد
 */
export const getCurrentUserProfileWithAgent = async (): Promise<User | null> => {
  try {
    // الحصول على المستخدم باستخدام النظام المحسن
    const user = await getCurrentUser();
    
    if (!user) {
      return null;
    }

    const userId = user.id;

    // جلب بيانات المستخدم مع بيانات وكيل مركز الاتصال في استعلام واحد
    const { data: userData, error } = await supabase
      .from('users')
      .select(`
        *,
        call_center_agents(
          id,
          assigned_regions,
          assigned_stores,
          max_daily_orders,
          is_available,
          is_active,
          performance_metrics,
          specializations,
          work_schedule
        )
      `)
      .eq('id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      // fallback إلى الطريقة العادية
      return await getCurrentUserProfile();
    }

    if (userData && userData.call_center_agents && userData.call_center_agents.length > 0) {
      // فلترة وكلاء مركز الاتصال النشطين فقط
      const activeAgents = userData.call_center_agents.filter((agent: any) => agent.is_active === true);
      
      if (activeAgents.length > 0) {
        const agentData = activeAgents[0];
        
        // دمج بيانات وكيل مركز الاتصال مع بيانات المستخدم
        const userWithAgent = {
          ...userData,
          call_center_agent_id: agentData.id,
          assigned_regions: agentData.assigned_regions,
          assigned_stores: agentData.assigned_stores,
          max_daily_orders: agentData.max_daily_orders,
          is_call_center_available: agentData.is_available,
          is_call_center_active: agentData.is_active,
          call_center_performance_metrics: agentData.performance_metrics,
          specializations: agentData.specializations,
          work_schedule: agentData.work_schedule
        };

        // حذف البيانات المكررة
        delete (userWithAgent as any).call_center_agents;

        return userWithAgent;
      }
    }

    // إذا لم يكن وكيل مركز اتصال، استخدم الطريقة العادية
    return await getCurrentUserProfile();

  } catch (error) {
    // fallback إلى الطريقة العادية
    return await getCurrentUserProfile();
  }
};
