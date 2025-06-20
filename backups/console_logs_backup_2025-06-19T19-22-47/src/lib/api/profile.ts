import { supabase } from '@/lib/supabase';

export interface UserProfileData {
  id: string;
  email: string;
  name: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
  job_title?: string;
  bio?: string;
  birth_date?: string;
  gender?: 'male' | 'female' | 'other';
  address?: string;
  city?: string;
  country?: string;
  role: string;
  is_org_admin?: boolean;
  is_super_admin?: boolean;
  status?: 'online' | 'offline' | 'away' | 'busy';
  last_activity_at?: string;
  created_at?: string;
  updated_at?: string;
  whatsapp_phone?: string;
  whatsapp_connected?: boolean;
  whatsapp_enabled?: boolean;
  organization_id?: string;
}

/**
 * جلب بيانات الملف الشخصي للمستخدم الحالي
 */
export async function getCurrentUserProfile(): Promise<UserProfileData | null> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return null;
    }

    // جلب بيانات المستخدم من جدول users باستخدام id مباشرة
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        first_name,
        last_name,
        phone,
        avatar_url,
        job_title,
        bio,
        birth_date,
        gender,
        address,
        city,
        country,
        role,
        is_org_admin,
        is_super_admin,
        status,
        last_activity_at,
        created_at,
        updated_at,
        whatsapp_phone,
        whatsapp_connected,
        whatsapp_enabled,
        organization_id
      `)
      .eq('id', user.id)
      .single();

    if (userError) {
      return null;
    }

    return userData as unknown as UserProfileData;
  } catch (error) {
    return null;
  }
}

/**
 * تحديث بيانات الملف الشخصي للمستخدم الحالي
 */
export async function updateUserProfile(profileData: Partial<UserProfileData>): Promise<{
  success: boolean;
  error?: string;
  data?: UserProfileData;
}> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'المستخدم غير مصادق عليه'
      };
    }

    // إزالة الحقول التي لا يجب تحديثها
    const { id, email, created_at, organization_id, ...updateData } = profileData;

    // تحديث تاريخ آخر تعديل
    const dataToUpdate = {
      ...updateData,
      updated_at: new Date().toISOString()
    };

    // تحديث بيانات المستخدم
    const { data: updatedData, error: updateError } = await supabase
      .from('users')
      .update(dataToUpdate)
      .eq('id', user.id)
      .select(`
        id,
        email,
        name,
        first_name,
        last_name,
        phone,
        avatar_url,
        job_title,
        bio,
        birth_date,
        gender,
        address,
        city,
        country,
        role,
        is_org_admin,
        is_super_admin,
        status,
        last_activity_at,
        created_at,
        updated_at,
        whatsapp_phone,
        whatsapp_connected,
        whatsapp_enabled,
        organization_id
      `)
      .single();

    if (updateError) {
      return {
        success: false,
        error: 'فشل في تحديث البيانات'
      };
    }

    return {
      success: true,
      data: updatedData as unknown as UserProfileData
    };
  } catch (error) {
    return {
      success: false,
      error: 'حدث خطأ غير متوقع'
    };
  }
}

/**
 * رفع الصورة الشخصية - طريقة بديلة
 */
export async function uploadAvatarAlternative(file: File): Promise<{
  success: boolean;
  error?: string;
  url?: string;
}> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'المستخدم غير مصادق عليه'
      };
    }

    // التحقق من نوع الملف
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: 'نوع الملف غير مدعوم. يرجى استخدام JPG, PNG, WebP, أو GIF'
      };
    }

    // التحقق من حجم الملف (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return {
        success: false,
        error: 'حجم الصورة يجب أن يكون أقل من 10 ميجابايت'
      };
    }

    // إنشاء اسم فريد للملف بدون مجلد فرعي
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;

    // رفع الملف مباشرة إلى root الـ bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      return {
        success: false,
        error: `فشل في رفع الصورة: ${uploadError.message}`
      };
    }

    // الحصول على الرابط العام للصورة
    const { data: urlData } = supabase.storage
      .from('user-avatars')
      .getPublicUrl(fileName);

    const avatarUrl = urlData.publicUrl;

    // تحديث رابط الصورة في قاعدة البيانات
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
    } else {
    }

    return {
      success: true,
      url: avatarUrl
    };
  } catch (error) {
    return {
      success: false,
      error: 'حدث خطأ غير متوقع أثناء رفع الصورة'
    };
  }
}

/**
 * رفع الصورة الشخصية
 */
export async function uploadAvatar(file: File): Promise<{
  success: boolean;
  error?: string;
  url?: string;
}> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'المستخدم غير مصادق عليه'
      };
    }

    // التحقق من نوع الملف
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: 'نوع الملف غير مدعوم. يرجى استخدام JPG, PNG, WebP, أو GIF'
      };
    }

    // التحقق من حجم الملف (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return {
        success: false,
        error: 'حجم الصورة يجب أن يكون أقل من 10 ميجابايت'
      };
    }

    // إنشاء اسم فريد للملف
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // التحقق من حالة الجلسة
    const { data: session } = await supabase.auth.getSession();

    // رفع الملف إلى Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true // السماح بالكتابة فوق الملف إذا كان موجوداً
      });

    if (uploadError) {
      
      // إذا فشلت الطريقة الأولى، جرب الطريقة البديلة
      if (uploadError.message?.includes('row-level security') || uploadError.message?.includes('403')) {
        return await uploadAvatarAlternative(file);
      }
      
      if (uploadError.message?.includes('file size')) {
        return {
          success: false,
          error: 'حجم الملف كبير جداً'
        };
      }
      
      if (uploadError.message?.includes('400') || uploadError.message?.includes('Bad Request')) {
        return {
          success: false,
          error: 'طلب غير صحيح. تحقق من إعدادات الـ bucket.'
        };
      }
      
      return {
        success: false,
        error: `فشل في رفع الصورة: ${uploadError.message || 'خطأ غير معروف'}`
      };
    }

    // الحصول على الرابط العام للصورة
    const { data: urlData } = supabase.storage
      .from('user-avatars')
      .getPublicUrl(filePath);

    const avatarUrl = urlData.publicUrl;

    // تحديث رابط الصورة في قاعدة البيانات
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      // حتى لو فشل التحديث في قاعدة البيانات، الصورة تم رفعها بنجاح
    } else {
    }

    return {
      success: true,
      url: avatarUrl
    };
  } catch (error) {
    return {
      success: false,
      error: 'حدث خطأ غير متوقع أثناء رفع الصورة'
    };
  }
}

/**
 * تحديث حالة المستخدم (متصل/غير متصل/مشغول/بعيد)
 */
export async function updateUserStatus(status: 'online' | 'offline' | 'away' | 'busy'): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'المستخدم غير مصادق عليه'
      };
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        status,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      return {
        success: false,
        error: 'فشل في تحديث الحالة'
      };
    }

    return {
      success: true
    };
  } catch (error) {
    return {
      success: false,
      error: 'حدث خطأ غير متوقع'
    };
  }
}

/**
 * جلب بيانات المستخدم حسب المعرف (للمديرين)
 */
export async function getUserProfileById(userId: string): Promise<UserProfileData | null> {
  try {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        first_name,
        last_name,
        phone,
        avatar_url,
        job_title,
        bio,
        birth_date,
        gender,
        address,
        city,
        country,
        role,
        is_org_admin,
        is_super_admin,
        status,
        last_activity_at,
        created_at,
        updated_at,
        whatsapp_phone,
        whatsapp_connected,
        whatsapp_enabled,
        organization_id
      `)
      .eq('id', userId)
      .single();

    if (userError) {
      return null;
    }

    return userData as unknown as UserProfileData;
  } catch (error) {
    return null;
  }
}
