import { supabase } from '../supabase-client';
import { UserSettings, OrganizationSettings, SettingsTemplate, UpdateSettingsPayload, SettingsResponse, UserThemeMode, OrganizationThemeMode } from '../../types/settings';
import { withCache, LONG_CACHE_TTL } from '@/lib/cache/storeCache';

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

    return data;
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

    return data;
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

        return insertData;
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

    return updateData[0] || null;
  } catch (error) {
    return null;
  }
};

// ====================== إعدادات المؤسسة ======================

/**
 * جلب إعدادات المؤسسة مع دعم التخزين المؤقت
 */
export const getOrganizationSettings = async (organizationId: string): Promise<OrganizationSettings | null> => {
  console.warn('⚠️ استخدام getOrganizationSettings المباشر - يتم التحويل للنظام الموحد');
  const { getOrganizationSettings: unifiedGetOrganizationSettings } = await import('@/lib/api/unified-api');
  return unifiedGetOrganizationSettings(organizationId);
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

    return data;
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

    return data;
  } catch (error) {
    return null;
  }
};

// ====================== قوالب الإعدادات ======================

/**
 * جلب قوالب الإعدادات للمؤسسة
 */
export const getOrganizationTemplates = async (
  organizationId: string,
  templateType?: string
): Promise<SettingsTemplate[]> => {
  try {
    let query = supabase
      .from('settings_templates')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (templateType) {
      query = query.eq('template_type', templateType);
    }

    const { data, error } = await query;

    if (error) {
      return [];
    }

    return data || [];
  } catch (error) {
    return [];
  }
};

/**
 * إنشاء قالب إعدادات جديد
 */
export const createOrganizationTemplate = async (
  organizationId: string,
  templateData: Omit<SettingsTemplate, 'id' | 'organization_id' | 'created_at' | 'updated_at'>
): Promise<SettingsTemplate | null> => {
  try {
    const newTemplate = {
      ...templateData,
      organization_id: organizationId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('settings_templates')
      .insert(newTemplate)
      .select()
      .single();

    if (error) {
      return null;
    }

    return data;
  } catch (error) {
    return null;
  }
};

/**
 * تحديث قالب إعدادات موجود
 */
export const updateOrganizationTemplate = async (
  templateId: string,
  templateData: Partial<Omit<SettingsTemplate, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>
): Promise<SettingsTemplate | null> => {
  try {
    const updateData = {
      ...templateData,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('settings_templates')
      .update(updateData)
      .eq('id', templateId)
      .select()
      .single();

    if (error) {
      return null;
    }

    return data;
  } catch (error) {
    return null;
  }
};

/**
 * حذف قالب إعدادات
 */
export const deleteOrganizationTemplate = async (templateId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('settings_templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
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
        cacheControl: '3600',
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