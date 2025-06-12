import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

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
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .maybeSingle(); // استخدام maybeSingle بدلاً من single

  if (error) {
    console.error('خطأ في جلب المستخدم بالمعرف:', error);
    return null;
  }

  return data;
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle(); // استخدام maybeSingle بدلاً من single

  if (error) {
    console.error('خطأ في جلب المستخدم بالبريد الإلكتروني:', error);
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
    console.log('🔧 [createUserSafely] محاولة إنشاء المستخدم مباشرة...');
    
    // محاولة إنشاء المستخدم مباشرة أولاً (أسرع)
    const { data, error } = await supabase
      .from('users')
      .insert(user)
      .select()
      .maybeSingle();

    if (!error && data) {
      console.log('✅ [createUserSafely] تم إنشاء المستخدم بنجاح');
      return data;
    }

    // إذا فشل بسبب التكرار أو خطأ 409، حاول الحصول على المستخدم الموجود
    if ((error?.code === '23505' || (error as any)?.status === 409) && user.email) {
      console.log('🔄 [createUserSafely] مستخدم موجود (409/23505), البحث عنه...');
      
      // محاولة البحث بالمعرف أولاً
      let existingUser = await getUserById(user.id);
      
      // إذا لم نجده بالمعرف، نبحث بالبريد الإلكتروني
      if (!existingUser) {
        existingUser = await getUserByEmail(user.email);
      }
      
      if (existingUser) {
        // إذا كان auth_user_id فارغ، قم بتحديثه
        if (!existingUser.auth_user_id && user.auth_user_id) {
          console.log('🔄 [createUserSafely] تحديث auth_user_id للمستخدم الموجود...');
          try {
            return await updateUser(existingUser.id, {
              auth_user_id: user.auth_user_id,
              updated_at: new Date().toISOString()
            });
          } catch (updateError) {
            console.log('❌ [createUserSafely] فشل في تحديث المستخدم، إرجاع النسخة الموجودة');
            return existingUser;
          }
        }
        console.log('✅ [createUserSafely] إرجاع المستخدم الموجود');
        return existingUser;
      }
    }

    console.error('❌ [createUserSafely] خطأ في إنشاء المستخدم:', error);
    return null;
  } catch (error) {
    console.error('❌ [createUserSafely] خطأ عام:', error);
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

// Helper function to get current auth user's profile from the users table - محسّن للسرعة
export const getCurrentUserProfile = async (): Promise<User | null> => {
  console.log('🔍 [getCurrentUserProfile] بدء تنفيذ الدالة المحسّنة والمسرّعة');
  
  try {
    // الحصول على الجلسة بأسرع طريقة ممكنة
    console.log('⚡ [getCurrentUserProfile] فحص الجلسة بطريقة مسرّعة...');
    const startTime = Date.now();
    
    let authData: any = null;
    
    // أولاً، محاولة استخراج البيانات من localStorage مباشرة (الأسرع)
    try {
      const storedSession = localStorage.getItem('bazaar_auth_state');
      if (storedSession) {
        const authState = JSON.parse(storedSession);
        if (authState.session?.user) {
          console.log('⚡ [getCurrentUserProfile] تم العثور على بيانات من localStorage مباشرة');
          authData = { user: authState.session.user };
        }
      }
    } catch (storageError) {
      console.log('❌ [getCurrentUserProfile] خطأ في استخراج البيانات من localStorage:', storageError);
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
          console.log('✅ [getCurrentUserProfile] تم العثور على جلسة من Supabase');
          authData = { user: sessionData.session.user };
        }
      } catch (sessionError) {
        console.log('❌ [getCurrentUserProfile] timeout أو خطأ في فحص الجلسة:', sessionError);
      }
    }

    // إذا لم نجد بيانات أصلاً، محاولة أخيرة سريعة من مفاتيح تخزين أخرى
    if (!authData?.user) {
      console.log('🔍 [getCurrentUserProfile] محاولة أخيرة من مفاتيح تخزين أخرى...');
      
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
              console.log(`⚡ [getCurrentUserProfile] تم العثور على بيانات في ${key}`);
              authData = { user: sessionObj.user || sessionObj };
              break;
            }
          }
        }
      } catch (altStorageError) {
        console.log('❌ [getCurrentUserProfile] فشل فحص التخزين البديل:', altStorageError);
      }
    }

    const totalAuthDuration = Date.now() - startTime;
    
          console.log('✅ [getCurrentUserProfile] انتهى الحصول على بيانات المصادقة:', {
        hasUser: !!authData.user,
        userId: authData.user?.id,
        email: authData.user?.email,
        duration: `${totalAuthDuration}ms`
      });
    
    if (!authData.user?.email) {
      console.log('❌ [getCurrentUserProfile] لا يوجد مستخدم مصادق أو بريد إلكتروني، إرجاع null');
      return null;
    }

    // بحث فائق السرعة مع timeout قصير جداً
    console.log('⚡ [getCurrentUserProfile] بحث سريع في قاعدة البيانات...');
    const dbStartTime = Date.now();
    
    let userProfile: User | null = null;
    
    // فقط محاولة واحدة بحث بالمعرف مع timeout قصير جداً
    console.log('⚡ [getCurrentUserProfile] البحث بالمعرف مع timeout قصير...');
    try {
      const dbPromise = supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();
      
      const shortDbTimeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('DB timeout after 1 second')), 1000) // 1 ثانية فقط
      );
      
      const { data: userById, error: idError } = await Promise.race([dbPromise, shortDbTimeoutPromise]);
      
      if (!idError && userById) {
        console.log('✅ [getCurrentUserProfile] تم العثور على المستخدم بسرعة');
        userProfile = userById;
      } else {
        console.log('❌ [getCurrentUserProfile] لم يتم العثور على المستخدم في الوقت المحدد');
      }
    } catch (error) {
      console.log('❌ [getCurrentUserProfile] timeout أو خطأ في البحث السريع:', error);
    }

    const dbDuration = Date.now() - dbStartTime;
    console.log('✅ [getCurrentUserProfile] انتهى البحث في قاعدة البيانات:', {
      foundUser: !!userProfile,
      duration: `${dbDuration}ms`,
      searchMethod: userProfile ? 'by-id' : 'none'
    });

    // إذا وجدنا مستخدماً، نعيده
    if (userProfile) {
      console.log('✅ [getCurrentUserProfile] تم العثور على المستخدم:', {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        organization_id: userProfile.organization_id
      });
      
      // حفظ organization_id في localStorage إذا كان متوفراً
      if (userProfile.organization_id) {
        const currentStoredId = localStorage.getItem('bazaar_organization_id');
        if (currentStoredId !== userProfile.organization_id) {
          localStorage.setItem('bazaar_organization_id', userProfile.organization_id);
          console.log('💾 [getCurrentUserProfile] تم حفظ organization_id في localStorage:', userProfile.organization_id);
        }
      }
      
      return userProfile;
    }

    // إنشاء بيانات أساسية فوراً بدلاً من محاولة إنشاء في قاعدة البيانات
    console.log('⚡ [getCurrentUserProfile] إنشاء بروفايل أساسي فوري...');
    const userRole = authData.user.user_metadata?.role || 'customer';
    
    // محاولة الحصول على organization_id من مصادر مختلفة
    let organizationId = authData.user.user_metadata?.organization_id || localStorage.getItem('bazaar_organization_id');
    
    // إذا لم نجد organization_id، استخدم القيمة الافتراضية للمستخدم المحدد
    if (!organizationId) {
      // للمستخدم uzaydz33030@gmail.com، استخدم المؤسسة المخصصة له
      if (authData.user.email === 'uzaydz33030@gmail.com') {
        organizationId = 'fed872f9-1ade-4351-b020-5598fda976fe';
        localStorage.setItem('bazaar_organization_id', organizationId);
        console.log('🏢 [getCurrentUserProfile] تعيين organization_id للمستخدم المعروف:', organizationId);
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
    
    console.log('✅ [getCurrentUserProfile] إرجاع البروفايل الأساسي فوراً');
    
    // محاولة إنشاء المستخدم في الخلفية (بدون انتظار)
    setTimeout(async () => {
      try {
        const newUser: InsertUser = {
          id: authData.user.id,
          auth_user_id: authData.user.id,
          email: authData.user.email,
          name: quickProfile.name,
          role: userRole,
          is_active: true,
          organization_id: organizationId
        };
        
        await createUserSafely(newUser);
        console.log('🔧 [getCurrentUserProfile] تم إنشاء المستخدم في قاعدة البيانات في الخلفية');
      } catch (bgCreateError) {
        console.log('❌ [getCurrentUserProfile] فشل إنشاء المستخدم في الخلفية:', bgCreateError);
      }
    }, 1000); // إنشاء في الخلفية بعد ثانية واحدة
    
    return quickProfile;
    
  } catch (error) {
    console.error('❌ [getCurrentUserProfile] خطأ عام:', error);
    
    // في حالة الخطأ العام، نحاول الحصول على الجلسة من localStorage
    try {
      const session = await supabase.auth.getSession();
      if (session.data.session?.user) {
        const user = session.data.session.user;
        console.log('🔄 [getCurrentUserProfile] استخدام بيانات الجلسة المحلية...');
        return {
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
      }
    } catch (sessionError) {
      console.error('❌ [getCurrentUserProfile] خطأ في الحصول على الجلسة المحلية:', sessionError);
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
