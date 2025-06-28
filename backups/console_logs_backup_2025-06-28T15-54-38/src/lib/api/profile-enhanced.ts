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
 * جلب بيانات الملف الشخصي للمستخدم الحالي باستخدام الدالة المحسنة
 */
export async function getCurrentUserProfileEnhanced(): Promise<UserProfileData | null> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return null;
    }

    // استخدام الدالة المحسنة لجلب البيانات
    const { data: profileData, error: profileError } = await supabase
      .rpc('get_user_profile');

    if (profileError) {
      
      // في حالة فشل الدالة، جرب الطريقة التقليدية
      const { data: fallbackData, error: fallbackError } = await supabase
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

      if (fallbackError) {
        return null;
      }

      return fallbackData;
    }

    // إذا كانت البيانات مصفوفة، خذ العنصر الأول
    const profile = Array.isArray(profileData) ? profileData[0] : profileData;
    
    return profile || null;
  } catch (error) {
    return null;
  }
}

/**
 * تحديث بيانات الملف الشخصي باستخدام الدالة المحسنة
 */
export async function updateUserProfileEnhanced(profileData: Partial<UserProfileData>): Promise<{
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

    // استخدام الدالة المحسنة لتحديث البيانات
    const { data: result, error: updateError } = await supabase
      .rpc('update_user_profile', {
        profile_data: updateData
      });

    if (updateError) {
      return {
        success: false,
        error: 'فشل في تحديث البيانات'
      };
    }

    // جلب البيانات المحدثة
    const updatedProfile = await getCurrentUserProfileEnhanced();

    return {
      success: true,
      data: updatedProfile || undefined
    };
  } catch (error) {
    return {
      success: false,
      error: 'حدث خطأ غير متوقع'
    };
  }
}

/**
 * رفع الصورة الشخصية (نفس الدالة السابقة)
 */
export async function uploadAvatarEnhanced(file: File): Promise<{
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

    // إنشاء اسم فريد للملف
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // رفع الملف إلى Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      return {
        success: false,
        error: 'فشل في رفع الصورة'
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
      return {
        success: false,
        error: 'فشل في حفظ رابط الصورة'
      };
    }

    return {
      success: true,
      url: avatarUrl
    };
  } catch (error) {
    return {
      success: false,
      error: 'حدث خطأ غير متوقع'
    };
  }
}

/**
 * تحديث حالة المستخدم (نفس الدالة السابقة)
 */
export async function updateUserStatusEnhanced(status: 'online' | 'offline' | 'away' | 'busy'): Promise<{
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
