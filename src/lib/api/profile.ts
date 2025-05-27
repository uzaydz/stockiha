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
      console.error('خطأ في المصادقة:', authError);
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
      console.error('خطأ في جلب بيانات المستخدم:', userError);
      return null;
    }

    return userData as unknown as UserProfileData;
  } catch (error) {
    console.error('خطأ في جلب الملف الشخصي:', error);
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
      console.error('خطأ في تحديث بيانات المستخدم:', updateError);
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
    console.error('خطأ في تحديث الملف الشخصي:', error);
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

    console.log('الطريقة البديلة - محاولة رفع الملف:', { 
      fileName, 
      fileSize: file.size, 
      fileType: file.type,
      userId: user.id 
    });

    // رفع الملف مباشرة إلى root الـ bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('خطأ في الطريقة البديلة:', uploadError);
      return {
        success: false,
        error: `فشل في رفع الصورة: ${uploadError.message}`
      };
    }

    console.log('تم رفع الملف بنجاح (الطريقة البديلة):', uploadData);

    // الحصول على الرابط العام للصورة
    const { data: urlData } = supabase.storage
      .from('user-avatars')
      .getPublicUrl(fileName);

    const avatarUrl = urlData.publicUrl;
    console.log('رابط الصورة (الطريقة البديلة):', avatarUrl);

    // تحديث رابط الصورة في قاعدة البيانات
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('خطأ في تحديث رابط الصورة:', updateError);
    } else {
      console.log('تم تحديث رابط الصورة في قاعدة البيانات بنجاح');
    }

    return {
      success: true,
      url: avatarUrl
    };
  } catch (error) {
    console.error('خطأ في الطريقة البديلة لرفع الصورة:', error);
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
      console.error('خطأ في المصادقة:', authError);
      return {
        success: false,
        error: 'المستخدم غير مصادق عليه'
      };
    }

    console.log('معلومات المستخدم:', { userId: user.id, email: user.email });

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

    console.log('محاولة رفع الملف:', { 
      fileName, 
      filePath, 
      fileSize: file.size, 
      fileType: file.type,
      userId: user.id 
    });

    // التحقق من حالة الجلسة
    const { data: session } = await supabase.auth.getSession();
    console.log('حالة الجلسة:', { 
      hasSession: !!session.session,
      accessToken: session.session?.access_token ? 'موجود' : 'غير موجود'
    });

    // رفع الملف إلى Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true // السماح بالكتابة فوق الملف إذا كان موجوداً
      });

    if (uploadError) {
      console.error('خطأ في رفع الصورة:', uploadError);
      console.error('تفاصيل الخطأ:', {
        message: uploadError.message,
        name: uploadError.name
      });
      
      // إذا فشلت الطريقة الأولى، جرب الطريقة البديلة
      if (uploadError.message?.includes('row-level security') || uploadError.message?.includes('403')) {
        console.log('محاولة الطريقة البديلة...');
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

    console.log('تم رفع الملف بنجاح:', uploadData);

    // الحصول على الرابط العام للصورة
    const { data: urlData } = supabase.storage
      .from('user-avatars')
      .getPublicUrl(filePath);

    const avatarUrl = urlData.publicUrl;
    console.log('رابط الصورة:', avatarUrl);

    // تحديث رابط الصورة في قاعدة البيانات
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('خطأ في تحديث رابط الصورة:', updateError);
      // حتى لو فشل التحديث في قاعدة البيانات، الصورة تم رفعها بنجاح
      console.warn('تم رفع الصورة ولكن فشل في تحديث قاعدة البيانات');
    } else {
      console.log('تم تحديث رابط الصورة في قاعدة البيانات بنجاح');
    }

    return {
      success: true,
      url: avatarUrl
    };
  } catch (error) {
    console.error('خطأ في رفع الصورة الشخصية:', error);
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
      console.error('خطأ في تحديث حالة المستخدم:', updateError);
      return {
        success: false,
        error: 'فشل في تحديث الحالة'
      };
    }

    return {
      success: true
    };
  } catch (error) {
    console.error('خطأ في تحديث حالة المستخدم:', error);
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
      console.error('خطأ في جلب بيانات المستخدم:', userError);
      return null;
    }

    return userData as unknown as UserProfileData;
  } catch (error) {
    console.error('خطأ في جلب الملف الشخصي:', error);
    return null;
  }
} 