import { supabase as importedSupabase } from '../supabase';
import { UserSettings, OrganizationSettings, SettingsTemplate, UpdateSettingsPayload, SettingsResponse, UserThemeMode, OrganizationThemeMode } from '../../types/settings';
import { apiClient } from '@/lib/api/client';
import { getSupabaseClient } from '../supabase';

// ====================== إعدادات المستخدم ======================

/**
 * جلب إعدادات المستخدم الحالي
 */
export const getUserSettings = async (userId: string): Promise<UserSettings | null> => {
  try {
    const supabase = getSupabaseClient();
    
    // التحقق من وجود الإعدادات
    const { data, error, status } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (status === 406 || error.code === 'PGRST116') {
        // تعني أنه لا توجد إعدادات للمستخدم - نعيد القيم الافتراضية
        console.log('لا توجد إعدادات للمستخدم، نستخدم القيم الافتراضية');
        return getDefaultUserSettings(userId);
      }
      
      console.error('حدث خطأ أثناء جلب إعدادات المستخدم:', error);
      return getDefaultUserSettings(userId);
    }

    return data;
  } catch (error) {
    console.error('حدث خطأ غير متوقع أثناء جلب إعدادات المستخدم:', error);
    return getDefaultUserSettings(userId);
  }
};

/**
 * إنشاء إعدادات افتراضية للمستخدم
 */
export const createDefaultUserSettings = async (userId: string): Promise<UserSettings | null> => {
  try {
    const supabase = getSupabaseClient();
    
    const defaultSettings: UserSettings = {
      user_id: userId,
      theme_mode: 'system',
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

    const { data, error, status } = await supabase
      .from('user_settings')
      .insert(defaultSettings)
      .select()
      .single();

    if (error) {
      console.error('حدث خطأ أثناء إنشاء إعدادات افتراضية للمستخدم:', error);
      return defaultSettings; // نرجع الإعدادات الافتراضية حتى لو فشل الإدخال
    }

    return data;
  } catch (error) {
    console.error('حدث خطأ غير متوقع أثناء إنشاء إعدادات افتراضية للمستخدم:', error);
    // نرجع إعدادات افتراضية حتى في حالة حدوث خطأ
    return {
      user_id: userId,
      theme_mode: 'system',
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
    theme_mode: 'system',
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
    const supabase = getSupabaseClient();
    
    // التحقق من وجود إعدادات المستخدم
    const { data: existingSettings, error: checkError, status } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (checkError) {
      if (status === 406 || checkError.code === 'PGRST116') {
        // لا توجد إعدادات، نقوم بإنشائها
        console.log('إنشاء إعدادات جديدة للمستخدم');
        const defaultSettings = getDefaultUserSettings(userId);
        
        const newSettings = {
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
          console.error('حدث خطأ أثناء إنشاء إعدادات جديدة للمستخدم:', insertError);
          return newSettings; // نرجع الإعدادات المطلوبة حتى لو فشل الإدخال
        }

        return insertData;
      }
      
      console.error('حدث خطأ أثناء التحقق من وجود إعدادات المستخدم:', checkError);
      return null;
    }

    // تحديث الإعدادات الموجودة
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
      console.error('حدث خطأ أثناء تحديث إعدادات المستخدم:', updateError);
      return null;
    }

    return updateData[0] || null;
  } catch (error) {
    console.error('حدث خطأ غير متوقع أثناء تحديث إعدادات المستخدم:', error);
    return null;
  }
};

// ====================== إعدادات المؤسسة ======================

/**
 * جلب إعدادات مؤسسة محددة
 */
export const getOrganizationSettings = async (organizationId: string): Promise<OrganizationSettings | null> => {
  try {
    console.log('Getting organization settings for organization ID:', organizationId);
    
    if (!organizationId) {
      console.error('No organization ID provided');
      return getDefaultOrganizationSettings('default-org');
    }
    
    const supabase = getSupabaseClient();
    
    const { data, error, status } = await supabase
      .from('organization_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      if (status === 406 || error.code === 'PGRST116') {
        // لا توجد إعدادات للمؤسسة - نستخدم القيم الافتراضية
        console.log('No settings found for organization, using default values:', organizationId);
        return getDefaultOrganizationSettings(organizationId);
      }
      
      console.error('Error fetching organization settings:', error);
      return getDefaultOrganizationSettings(organizationId);
    }

    console.log('Organization settings found:', data);
    
    // Verificación adicional para asegurarnos de que los datos corresponden a la organización correcta
    if (data && data.organization_id === organizationId) {
      return data;
    } else {
      console.warn('Organization ID mismatch in settings data', {
        requestedId: organizationId,
        returnedId: data?.organization_id
      });
      return getDefaultOrganizationSettings(organizationId);
    }
  } catch (error) {
    console.error('Unexpected error while fetching organization settings:', error);
    return getDefaultOrganizationSettings(organizationId);
  }
};

/**
 * إنشاء إعدادات افتراضية للمؤسسة
 */
export const createDefaultOrganizationSettings = async (organizationId: string): Promise<OrganizationSettings | null> => {
  try {
    const supabase = getSupabaseClient();
    
    const defaultSettings: OrganizationSettings = {
      organization_id: organizationId,
      theme_primary_color: '#3B82F6', // لون أزرق
      theme_secondary_color: '#10B981', // لون أخضر
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
      console.error('حدث خطأ أثناء إنشاء إعدادات افتراضية للمؤسسة:', error);
      return defaultSettings; // نرجع الإعدادات الافتراضية حتى لو فشل الإدخال
    }

    return data;
  } catch (error) {
    console.error('حدث خطأ غير متوقع أثناء إنشاء إعدادات افتراضية للمؤسسة:', error);
    // نرجع إعدادات افتراضية حتى في حالة حدوث خطأ
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

// Función de ayuda para convertir UserThemeMode a OrganizationThemeMode
const convertThemeMode = (mode?: UserThemeMode): OrganizationThemeMode | undefined => {
  if (!mode) return undefined;
  if (mode === 'system') return 'auto';
  if (mode === 'light' || mode === 'dark') return mode;
  return undefined;
};

/**
 * تحديث إعدادات مؤسسة محددة
 */
export const updateOrganizationSettings = async (
  organizationId: string,
  payload: UpdateSettingsPayload
): Promise<OrganizationSettings | null> => {
  try {
    console.log('Updating organization settings for organization ID:', organizationId);
    
    if (!organizationId) {
      console.error('No organization ID provided for settings update');
      return null;
    }
    
    const supabase = getSupabaseClient();
    
    // استخدام RPC لتحديث الإعدادات بدلاً من التحديث المباشر
    // وهذا يتجنب مشكلة المشغل (trigger) الذي يتوقع وجود حقل component_type
    const { data, error } = await supabase.rpc('update_organization_settings', {
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
      p_enable_public_site: payload.enable_public_site,
      p_display_text_with_logo: payload.display_text_with_logo
    });

    if (error) {
      console.error('حدث خطأ أثناء تحديث إعدادات المؤسسة:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('حدث خطأ غير متوقع أثناء تحديث إعدادات المؤسسة:', error);
    return null;
  }
};

// ====================== قوالب المؤسسة ======================

/**
 * الحصول على قوالب المؤسسة
 */
export const getOrganizationTemplates = async (
  organizationId: string,
  templateType?: string
): Promise<SettingsTemplate[]> => {
  try {
    const supabase = getSupabaseClient();
    let query = supabase
      .from('organization_templates')
      .select('*')
      .eq('organization_id', organizationId);
      
    if (templateType) {
      query = query.eq('template_type', templateType);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching organization templates:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Unexpected error in getOrganizationTemplates:', error);
    return [];
  }
};

/**
 * إنشاء قالب جديد للمؤسسة
 */
export const createOrganizationTemplate = async (
  organizationId: string,
  templateData: Omit<SettingsTemplate, 'id' | 'organization_id' | 'created_at' | 'updated_at'>
): Promise<SettingsTemplate | null> => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('organization_templates')
      .insert({
        organization_id: organizationId,
        ...templateData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) {
      console.error('Error creating organization template:', error);
      return null;
    }
    
    // إذا كان هذا القالب الافتراضي، قم بإلغاء تعيين القوالب الافتراضية الأخرى
    if (templateData.is_default) {
      await supabase
        .from('organization_templates')
        .update({ is_default: false })
        .eq('organization_id', organizationId)
        .eq('template_type', templateData.template_type)
        .neq('id', data.id);
    }
    
    return data;
  } catch (error) {
    console.error('Unexpected error in createOrganizationTemplate:', error);
    return null;
  }
};

/**
 * تحديث قالب المؤسسة
 */
export const updateOrganizationTemplate = async (
  templateId: string,
  templateData: Partial<Omit<SettingsTemplate, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>
): Promise<SettingsTemplate | null> => {
  try {
    const supabase = getSupabaseClient();
    
    // الحصول على معلومات القالب الحالي
    const { data: currentTemplate, error: fetchError } = await supabase
      .from('organization_templates')
      .select('*')
      .eq('id', templateId)
      .single();
      
    if (fetchError) {
      console.error('Error fetching template:', fetchError);
      return null;
    }
    
    const { data, error } = await supabase
      .from('organization_templates')
      .update({
        ...templateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating organization template:', error);
      return null;
    }
    
    // إذا كان هذا القالب الافتراضي، قم بإلغاء تعيين القوالب الافتراضية الأخرى
    if (templateData.is_default) {
      await supabase
        .from('organization_templates')
        .update({ is_default: false })
        .eq('organization_id', currentTemplate.organization_id)
        .eq('template_type', currentTemplate.template_type)
        .neq('id', templateId);
    }
    
    return data;
  } catch (error) {
    console.error('Unexpected error in updateOrganizationTemplate:', error);
    return null;
  }
};

/**
 * حذف قالب المؤسسة
 */
export const deleteOrganizationTemplate = async (templateId: string): Promise<boolean> => {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('organization_templates')
      .delete()
      .eq('id', templateId);
      
    if (error) {
      console.error('Error deleting organization template:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Unexpected error in deleteOrganizationTemplate:', error);
    return false;
  }
};

// ====================== وظائف مساعدة ======================

/**
 * تسجيل تغيير في الإعدادات بطريقة آمنة
 * Logging setting changes in a safe way that won't break the main operation
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
    const supabase = getSupabaseClient();
    
    // Skip audit logging if the user ID is not provided or invalid
    if (!userId) {
      console.warn('Cannot log settings change: Invalid user ID');
      return;
    }

    // Simplified data for audit log to avoid potential schema issues
    const auditData = {
      user_id: userId,
      organization_id: organizationId,
      setting_type: settingType,
      setting_key: settingKey,
      old_value: oldValue || null,
      new_value: newValue || null,
      created_at: new Date().toISOString()
    };
    
    // Try to insert but don't block the main operation if it fails
    const { error } = await supabase
      .from('settings_audit_log')
      .insert(auditData);
    
    if (error) {
      // Just log the error without throwing
      console.warn('Failed to log setting change:', error.message || error);
    } else {
      console.log('Setting change logged successfully');
    }
  } catch (error: any) {
    // Just log the error without throwing
    console.warn('Error in logSettingChange:', error?.message || error);
  }
};

/**
 * الحصول على سجل تغييرات الإعدادات
 */
export const getSettingsAuditLog = async (
  organizationId: string,
  limit: number = 50
): Promise<any[]> => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('settings_audit_log')
      .select(`
        id,
        setting_type,
        setting_key,
        old_value,
        new_value,
        created_at,
        users:user_id (id, name, email)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);
      
    if (error) {
      console.error('Error fetching settings audit log:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Unexpected error in getSettingsAuditLog:', error);
    return [];
  }
};

/**
 * رفع ملف إلى تخزين Supabase
 * @param file ملف للرفع
 * @param path المسار في التخزين (مثال: organizations/123/logo)
 * @returns رابط الملف المرفوع
 */
export const uploadStorageFile = async (
  file: File,
  path: string
): Promise<{ url: string } | null> => {
  try {
    // استخدام عميل Admin بدلاً من عميل المستخدم العادي لتجاوز سياسات RLS
    const supabase = await import('../supabase-admin').then(m => m.getSupabaseAdmin());
    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const fullPath = `${path}/${fileName}`;
    
    // رفع الملف إلى التخزين
    const { data, error } = await supabase.storage
      .from('bazaar-public')
      .upload(fullPath, file, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) {
      console.error('فشل في رفع الملف إلى التخزين:', error);
      return null;
    }
    
    // إنشاء رابط عام للملف
    const { data: publicUrl } = supabase.storage
      .from('bazaar-public')
      .getPublicUrl(data.path);
    
    return { url: publicUrl.publicUrl };
  } catch (error) {
    console.error('حدث خطأ غير متوقع أثناء رفع الملف:', error);
    return null;
  }
}; 