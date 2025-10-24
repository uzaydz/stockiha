import { supabase } from '../supabase-client';
import { UserSettings, OrganizationSettings, SettingsTemplate, UpdateSettingsPayload, SettingsResponse, UserThemeMode, OrganizationThemeMode } from '../../types/settings';
import { withCache, LONG_CACHE_TTL } from '@/lib/cache/storeCache';

// ====================== دوال مساعدة للتحقق من الأنواع ======================

/**
 * التحقق من صحة نوع theme_mode للمستخدم
 */
const isValidUserThemeMode = (value: any): value is UserThemeMode => {
  return typeof value === 'string' && ['light', 'dark', 'system'].includes(value);
};

/**
 * التحقق من صحة نوع theme_mode للمؤسسة
 */
const isValidOrganizationThemeMode = (value: any): value is OrganizationThemeMode => {
  return typeof value === 'string' && ['light', 'dark', 'auto'].includes(value);
};

/**
 * تحويل البيانات القادمة من قاعدة البيانات إلى UserSettings
 */
const transformToUserSettings = (data: any): UserSettings => {
  return {
    id: data.id,
    user_id: data.user_id,
    theme_mode: isValidUserThemeMode(data.theme_mode) ? data.theme_mode : 'system',
    language: data.language || 'ar',
    timezone: data.timezone || 'UTC+3',
    date_format: data.date_format || 'YYYY-MM-DD',
    time_format: data.time_format || 'HH:mm',
    notification_email: data.notification_email ?? true,
    notification_push: data.notification_push ?? true,
    notification_browser: data.notification_browser ?? true,
    notification_preferences: data.notification_preferences || {
      orders: true,
      payments: true,
      system: true,
    },
    created_at: data.created_at,
    updated_at: data.updated_at
  };
};

/**
 * تحويل البيانات القادمة من قاعدة البيانات إلى OrganizationSettings
 */
const transformToOrganizationSettings = (data: any): OrganizationSettings => {
  return {
    id: data.id,
    organization_id: data.organization_id,
    theme_primary_color: data.theme_primary_color || '#3B82F6',
    theme_secondary_color: data.theme_secondary_color || '#10B981',
    theme_mode: isValidOrganizationThemeMode(data.theme_mode) ? data.theme_mode : 'light',
    site_name: data.site_name || 'stockiha',
    custom_css: data.custom_css,
    logo_url: data.logo_url,
    favicon_url: data.favicon_url,
    default_language: data.default_language || 'ar',
    custom_js: data.custom_js,
    custom_header: data.custom_header,
    custom_footer: data.custom_footer,
    enable_registration: data.enable_registration ?? true,
    enable_public_site: data.enable_public_site ?? true,
    display_text_with_logo: data.display_text_with_logo ?? false,
    created_at: data.created_at,
    updated_at: data.updated_at
  };
};

// ====================== إعدادات المستخدم ======================

/**
 * جلب إعدادات المستخدم الحالي
 */
export const getUserSettings = async (userId: string): Promise<UserSettings | null> => {
  try {
    const { data, error, status } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (status === 406 || error.code === 'PGRST116') {
        return getDefaultUserSettings(userId);
      }
      return getDefaultUserSettings(userId);
    }

    return transformToUserSettings(data);
  } catch (error) {
    return getDefaultUserSettings(userId);
  }
};

/**
 * إنشاء إعدادات افتراضية للمستخدم
 */
export const createDefaultUserSettings = async (userId: string): Promise<UserSettings | null> => {
  try {
    const defaultSettings: UserSettings = {
      user_id: userId,
      theme_mode: 'system' as const,
      language: 'ar',
      timezone: 'UTC+3',
      date_format: 'YYYY-MM-DD',
      time_format: 'HH:mm',
      notification_email: true,
      notification_push: true,
      notification_browser: true,
      notification_preferences: {
        orders: true,
        payments: true,
        system: true,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('user_settings')
      .insert(defaultSettings)
      .select()
      .single();

    if (error) {
      return defaultSettings;
    }

    return transformToUserSettings(data);
  } catch (error) {
    return {
      user_id: userId,
      theme_mode: 'system' as const,
      language: 'ar',
      timezone: 'UTC+3',
      date_format: 'YYYY-MM-DD',
      time_format: 'HH:mm',
      notification_email: true,
      notification_push: true,
      notification_browser: true,
      notification_preferences: {
        orders: true,
        payments: true,
        system: true,
      }
    };
  }
};

/**
 * الحصول على الإعدادات الافتراضية للمستخدم بدون حفظها
 */
export const getDefaultUserSettings = (userId: string): UserSettings => {
  return {
    user_id: userId,
    theme_mode: 'system' as const,
    language: 'ar',
    timezone: 'UTC+3',
    date_format: 'YYYY-MM-DD',
    time_format: 'HH:mm',
    notification_email: true,
    notification_push: true,
    notification_browser: true,
    notification_preferences: {
      orders: true,
      payments: true,
      system: true,
    }
  };
};

/**
 * تحديث إعدادات المستخدم
 */
export const updateUserSettings = async (
  userId: string,
  payload: UpdateSettingsPayload
): Promise<UserSettings | null> => {
  try {
    const { data: existingSettings, error: checkError, status } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (checkError) {
      if (status === 406 || checkError.code === 'PGRST116') {
        const defaultSettings = getDefaultUserSettings(userId);
        
        const newSettings: UserSettings = {
          ...defaultSettings,
          theme_mode: payload.theme_mode || defaultSettings.theme_mode,
          language: payload.language || defaultSettings.language,
          timezone: payload.timezone || defaultSettings.timezone,
          date_format: payload.date_format || defaultSettings.date_format,
          time_format: payload.time_format || defaultSettings.time_format,
          notification_email: payload.notification_email !== undefined ? payload.notification_email : defaultSettings.notification_email,
          notification_push: payload.notification_push !== undefined ? payload.notification_push : defaultSettings.notification_push,
          notification_browser: payload.notification_browser !== undefined ? payload.notification_browser : defaultSettings.notification_browser,
          notification_preferences: payload.notification_preferences || defaultSettings.notification_preferences,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data: insertData, error: insertError } = await supabase
          .from('user_settings')
          .insert(newSettings)
          .select()
          .single();

        if (insertError) {
          return newSettings;
        }

        return transformToUserSettings(insertData);
      }
      return null;
    }

    const updatePayload = {
      theme_mode: payload.theme_mode,
      language: payload.language,
      timezone: payload.timezone,
      date_format: payload.date_format,
      time_format: payload.time_format,
      notification_email: payload.notification_email,
      notification_push: payload.notification_push,
      notification_browser: payload.notification_browser,
      notification_preferences: payload.notification_preferences,
      updated_at: new Date().toISOString()
    };
    
    const { data: updateData, error: updateError } = await supabase
      .from('user_settings')
      .update(updatePayload)
      .eq('user_id', userId)
      .select();

    if (updateError) {
      return null;
    }

    return updateData[0] ? transformToUserSettings(updateData[0]) : null;
  } catch (error) {
    return null;
  }
};

// ====================== إعدادات المؤسسة ======================

/**
 * جلب إعدادات المؤسسة مع دعم التخزين المؤقت
 */
export const getOrganizationSettings = async (organizationId: string): Promise<OrganizationSettings | null> => {
  try {
    const { getOrganizationSettings: unifiedGetOrganizationSettings } = await import('@/lib/api/unified-api');
    const data = await unifiedGetOrganizationSettings(organizationId);
    return data ? transformToOrganizationSettings(data) : null;
  } catch (error) {
    console.error('خطأ في جلب إعدادات المؤسسة:', error);
    return null;
  }
};

/**
 * الحصول على إعدادات الثيم والألوان للمؤسسة
 */
export const getOrganizationTheme = async (organizationId: string) => {
  try {
    if (!organizationId) {
      return null;
    }
    
    const { data, error } = await supabase.rpc('get_organization_theme', {
      p_organization_id: organizationId
    });
    
    if (error) {
      return null;
    }
    
    return data.length > 0 ? data[0] : null;
  } catch (error) {
    return null;
  }
};

/**
 * إنشاء إعدادات افتراضية للمؤسسة
 */
export const createDefaultOrganizationSettings = async (organizationId: string): Promise<OrganizationSettings | null> => {
  try {
    const defaultSettings: OrganizationSettings = {
      organization_id: organizationId,
      theme_primary_color: '#3B82F6',
      theme_secondary_color: '#10B981',
      theme_mode: 'light',
      site_name: 'stockiha',
      custom_css: null,
      logo_url: null,
      favicon_url: null,
      default_language: 'ar',
      custom_js: null,
      custom_header: null,
      custom_footer: null,
      enable_registration: true,
      enable_public_site: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('organization_settings')
      .insert(defaultSettings)
      .select()
      .single();

    if (error) {
      return defaultSettings;
    }

    return transformToOrganizationSettings(data);
  } catch (error) {
    return {
      organization_id: organizationId,
      theme_primary_color: '#3B82F6',
      theme_secondary_color: '#10B981',
      theme_mode: 'light',
      site_name: 'stockiha',
      custom_css: null,
      logo_url: null,
      favicon_url: null,
      default_language: 'ar',
      custom_js: null,
      custom_header: null,
      custom_footer: null,
      enable_registration: true,
      enable_public_site: true
    };
  }
};

/**
 * الحصول على الإعدادات الافتراضية للمؤسسة بدون حفظها
 */
export const getDefaultOrganizationSettings = (organizationId: string): OrganizationSettings => {
  return {
    organization_id: organizationId,
    theme_primary_color: '#3B82F6',
    theme_secondary_color: '#10B981',
    theme_mode: 'light',
    site_name: 'stockiha',
    custom_css: null,
    logo_url: null,
    favicon_url: null,
    default_language: 'ar',
    custom_js: null,
    custom_header: null,
    custom_footer: null,
    enable_registration: true,
    enable_public_site: true
  };
};

/**
 * تحديث إعدادات مؤسسة محددة
 */
export const updateOrganizationSettings = async (
  organizationId: string,
  payload: UpdateSettingsPayload
): Promise<OrganizationSettings | null> => {
  try {
    if (!organizationId) {
      return null;
    }
    
    const rpcPayload = {
      org_id: organizationId,
      p_theme_primary_color: payload.theme_primary_color,
      p_theme_secondary_color: payload.theme_secondary_color,
      p_theme_mode: payload.theme_mode_org ? 
        (payload.theme_mode_org === 'system' ? 'auto' : payload.theme_mode_org) 
        : undefined,
      p_site_name: payload.site_name,
      p_custom_css: payload.custom_css,
      p_logo_url: payload.logo_url,
      p_favicon_url: payload.favicon_url,
      p_default_language: payload.default_language,
      p_custom_js: payload.custom_js,
      p_custom_header: payload.custom_header,
      p_custom_footer: payload.custom_footer,
      p_enable_registration: payload.enable_registration,
      p_enable_public_site: payload.enable_public_site
    };

    const { data, error } = await supabase.rpc('update_organization_settings', rpcPayload);

    if (error) {
      throw error;
    }

    return data ? transformToOrganizationSettings(data) : null;
  } catch (error) {
    return null;
  }
};

// ====================== قوالب الإعدادات ======================
// ملاحظة: جدول settings_templates غير متوفر حالياً في قاعدة البيانات

/**
 * جلب قوالب الإعدادات للمؤسسة
 * ملاحظة: هذه الدالة معطلة مؤقتاً لأن جدول settings_templates غير متوفر
 */
export const getOrganizationTemplates = async (
  organizationId: string,
  templateType?: string
): Promise<SettingsTemplate[]> => {
  // TODO: تفعيل هذه الدالة عند إنشاء جدول settings_templates
  console.warn('جدول settings_templates غير متوفر حالياً');
  return [];
};

/**
 * إنشاء قالب إعدادات جديد
 * ملاحظة: هذه الدالة معطلة مؤقتاً لأن جدول settings_templates غير متوفر
 */
export const createOrganizationTemplate = async (
  organizationId: string,
  templateData: Omit<SettingsTemplate, 'id' | 'organization_id' | 'created_at' | 'updated_at'>
): Promise<SettingsTemplate | null> => {
  // TODO: تفعيل هذه الدالة عند إنشاء جدول settings_templates
  console.warn('جدول settings_templates غير متوفر حالياً');
  return null;
};

/**
 * تحديث قالب إعدادات موجود
 * ملاحظة: هذه الدالة معطلة مؤقتاً لأن جدول settings_templates غير متوفر
 */
export const updateOrganizationTemplate = async (
  templateId: string,
  templateData: Partial<Omit<SettingsTemplate, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>
): Promise<SettingsTemplate | null> => {
  // TODO: تفعيل هذه الدالة عند إنشاء جدول settings_templates
  console.warn('جدول settings_templates غير متوفر حالياً');
  return null;
};

/**
 * حذف قالب إعدادات
 * ملاحظة: هذه الدالة معطلة مؤقتاً لأن جدول settings_templates غير متوفر
 */
export const deleteOrganizationTemplate = async (templateId: string): Promise<boolean> => {
  // TODO: تفعيل هذه الدالة عند إنشاء جدول settings_templates
  console.warn('جدول settings_templates غير متوفر حالياً');
  return false;
};

// ====================== تدقيق الإعدادات ======================

/**
 * تسجيل تغيير في الإعدادات
 */
export const logSettingChange = async (
  userId: string,
  organizationId: string | null,
  settingType: 'user' | 'organization',
  settingKey: string,
  oldValue: string,
  newValue: string
): Promise<void> => {
  try {
    const logData = {
      user_id: userId,
      organization_id: organizationId,
      setting_type: settingType,
      setting_key: settingKey,
      old_value: oldValue,
      new_value: newValue,
      action_type: 'update',
      created_at: new Date().toISOString()
    };

    await supabase
      .from('settings_audit_log')
      .insert(logData);
  } catch (error) {
    // تسجيل صامت للأخطاء
  }
};

/**
 * جلب سجل تدقيق الإعدادات للمؤسسة
 */
export const getSettingsAuditLog = async (
  organizationId: string,
  limit: number = 50
): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('settings_audit_log')
      .select(`
        *,
        users:user_id (
          name,
          email
        )
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return [];
    }

    return data || [];
  } catch (error) {
    return [];
  }
};

// ====================== تحميل الملفات ======================

/**
 * تحميل ملف إلى Supabase Storage
 */
export const uploadStorageFile = async (
  file: File,
  path: string
): Promise<{ url: string } | null> => {
  try {
    const { data, error } = await supabase.storage
      .from('organization-assets')
      .upload(path, file, {
        cacheControl: '31536000',
        upsert: true
      });

    if (error) {
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('organization-assets')
      .getPublicUrl(data.path);

    return { url: publicUrl };
  } catch (error) {
    return null;
  }
};

// ====================== تنظيف البيانات التالفة ======================

/**
 * تنظيف محتوى JavaScript التالف من إعدادات المؤسسة
 */
export const cleanCorruptedSettings = async (organizationId: string): Promise<boolean> => {
  try {
    // جلب الإعدادات الحالية
    const { data: settings, error: fetchError } = await supabase
      .from('organization_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (fetchError || !settings) {
      console.error('خطأ في جلب إعدادات المؤسسة:', fetchError);
      return false;
    }

    let needsUpdate = false;
    const updates: any = {};

    // فحص custom_js
    if (settings.custom_js && typeof settings.custom_js === 'string') {
      try {
        // محاولة التحقق من صحة الكود
        const { getSafeCustomScript } = await import('@/utils/customScriptValidator');
        const validatedCode = getSafeCustomScript(settings.custom_js, { 
          context: 'cleanCorruptedSettings' 
        });
        
        if (validatedCode === null) {
          console.warn('تم اكتشاف كود JavaScript تالف، سيتم مسحه:', settings.custom_js.substring(0, 100));
          updates.custom_js = null;
          needsUpdate = true;
        }
      } catch (error) {
        console.error('خطأ في التحقق من custom_js:', error);
        updates.custom_js = null;
        needsUpdate = true;
      }
    }

    // فحص custom_css
    if (settings.custom_css && typeof settings.custom_css === 'string') {
      try {
        // فحص بسيط لـ CSS
        if (settings.custom_css.includes('fNcqSfPLFxu') || settings.custom_css.includes('Unexpected identifier')) {
          console.warn('تم اكتشاف محتوى CSS تالف، سيتم مسحه');
          updates.custom_css = null;
          needsUpdate = true;
        }
      } catch (error) {
        console.error('خطأ في التحقق من custom_css:', error);
        updates.custom_css = null;
        needsUpdate = true;
      }
    }

    // تحديث الإعدادات إذا لزم الأمر
    if (needsUpdate) {
      const { error: updateError } = await supabase
        .from('organization_settings')
        .update(updates)
        .eq('organization_id', organizationId);

      if (updateError) {
        console.error('خطأ في تحديث الإعدادات:', updateError);
        return false;
      }

      console.log('تم تنظيف الإعدادات التالفة بنجاح');
      return true;
    }

    return true;
  } catch (error) {
    console.error('خطأ في تنظيف الإعدادات التالفة:', error);
    return false;
  }
};
