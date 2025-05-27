import { supabase } from '../supabase-client';
import { UserSettings, OrganizationSettings, SettingsTemplate, UpdateSettingsPayload, SettingsResponse, UserThemeMode, OrganizationThemeMode } from '../../types/settings';
import { apiClient } from '@/lib/api/client';
import { getSupabaseClient } from '../supabase-client';
import { withCache, LONG_CACHE_TTL } from '@/lib/cache/storeCache';

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
      return defaultSettings; // نرجع الإعدادات الافتراضية حتى لو فشل الإدخال
    }

    return data;
  } catch (error) {
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
          return newSettings; // نرجع الإعدادات المطلوبة حتى لو فشل الإدخال
        }

        return insertData;
      }
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
      return null;
    }

    return updateData[0] || null;
  } catch (error) {
    return null;
  }
};

// ====================== إعدادات المؤسسة ======================

/**
 * جلب إعدادات مؤسسة محددة
 */
export const getOrganizationSettings = async (organizationId: string): Promise<OrganizationSettings | null> => {
  try {
    if (!organizationId) {
      return getDefaultOrganizationSettings('default-org');
    }
    
    // استخدام التخزين المؤقت لتقليل الاستعلامات المتكررة
    return withCache<OrganizationSettings | null>(
      `organization_settings:${organizationId}`,
      async () => {

        const supabase = getSupabaseClient();
        
        // استخدام الدالة get_organization_theme أولاً للحصول على إعدادات الثيم بما في ذلك القيم الافتراضية
        const themeSettings = await getOrganizationTheme(organizationId);
        
        const { data, error, status } = await supabase
          .from('organization_settings')
          .select('*')
          .eq('organization_id', organizationId)
          .single();

        if (error) {
          if (status === 406 || error.code === 'PGRST116') {
            // لا توجد إعدادات للمؤسسة - نستخدم القيم من themeSettings أو القيم الافتراضية
            
            const defaultSettings = getDefaultOrganizationSettings(organizationId);
            
            // دمج القيم من themeSettings مع الإعدادات الافتراضية
            if (themeSettings) {
              return { 
                ...defaultSettings, 
                theme_primary_color: themeSettings.theme_primary_color,
                theme_secondary_color: themeSettings.theme_secondary_color,
                theme_mode: themeSettings.theme_mode as 'light' | 'dark' | 'auto',
                site_name: themeSettings.site_name || defaultSettings.site_name,
                logo_url: themeSettings.logo_url || defaultSettings.logo_url,
                favicon_url: themeSettings.favicon_url || defaultSettings.favicon_url
              };
            }
            
            return defaultSettings;
          }
          return getDefaultOrganizationSettings(organizationId);
        }
        
        // دمج الإعدادات المخزنة مع إعدادات الثيم
        if (themeSettings) {
          return {
            ...data,
            theme_primary_color: themeSettings.theme_primary_color || data.theme_primary_color,
            theme_secondary_color: themeSettings.theme_secondary_color || data.theme_secondary_color,
            theme_mode: (themeSettings.theme_mode as 'light' | 'dark' | 'auto') || data.theme_mode,
            site_name: themeSettings.site_name || data.site_name,
            logo_url: themeSettings.logo_url || data.logo_url,
            favicon_url: themeSettings.favicon_url || data.favicon_url
          };
        }
        
        return data;
      },
      LONG_CACHE_TTL, // تخزين مؤقت طويل المدى (24 ساعة)
      true // استخدام ذاكرة التطبيق للوصول السريع
    );
  } catch (error) {
    return getDefaultOrganizationSettings(organizationId);
  }
};

/**
 * الحصول على إعدادات الثيم والألوان للمؤسسة باستخدام دالة get_organization_theme
 */
export const getOrganizationTheme = async (organizationId: string) => {
  try {
    if (!organizationId) {
      return null;
    }
    
    const supabase = getSupabaseClient();
    
    // استدعاء دالة get_organization_theme المخصصة التي تطبق القيم الافتراضية
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
      return defaultSettings; // نرجع الإعدادات الافتراضية حتى لو فشل الإدخال
    }

    return data;
  } catch (error) {
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
  const startTime = Date.now();
  console.log('🚀 [updateOrganizationSettings] بدء عملية حفظ الإعدادات:', {
    organizationId,
    payload,
    timestamp: new Date().toISOString()
  });

  try {
    if (!organizationId) {
      console.error('❌ [updateOrganizationSettings] معرف المؤسسة مفقود');
      return null;
    }
    
    console.log('⏱️ [updateOrganizationSettings] الحصول على عميل Supabase...');
    const supabase = getSupabaseClient();
    
    // تحضير البيانات للإرسال
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
      p_enable_public_site: payload.enable_public_site,
      p_display_text_with_logo: payload.display_text_with_logo
    };
    
    console.log('📤 [updateOrganizationSettings] إرسال البيانات إلى قاعدة البيانات:', rpcPayload);
    
    // استخدام RPC لتحديث الإعدادات بدلاً من التحديث المباشر
    const rpcStartTime = Date.now();
    const { data, error } = await supabase.rpc('update_organization_settings', rpcPayload);
    const rpcEndTime = Date.now();
    
    console.log(`⏱️ [updateOrganizationSettings] وقت استجابة قاعدة البيانات: ${rpcEndTime - rpcStartTime}ms`);

    if (error) {
      console.error('❌ [updateOrganizationSettings] خطأ من قاعدة البيانات:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return null;
    }

    console.log('✅ [updateOrganizationSettings] تم الحفظ بنجاح في قاعدة البيانات:', {
      data,
      responseTime: `${rpcEndTime - rpcStartTime}ms`
    });

    const totalTime = Date.now() - startTime;
    console.log(`🎉 [updateOrganizationSettings] اكتملت العملية بنجاح في ${totalTime}ms`);

    return data;
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('💥 [updateOrganizationSettings] خطأ غير متوقع:', {
      error,
      message: error instanceof Error ? error.message : 'خطأ غير معروف',
      stack: error instanceof Error ? error.stack : undefined,
      totalTime: `${totalTime}ms`
    });
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
      return [];
    }
    
    return data || [];
  } catch (error) {
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
      return false;
    }
    
    return true;
  } catch (error) {
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
    } else {
      
    }
  } catch (error: any) {
    // Just log the error without throwing
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
      return [];
    }
    
    return data || [];
  } catch (error) {
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
      return null;
    }
    
    // إنشاء رابط عام للملف
    const { data: publicUrl } = supabase.storage
      .from('bazaar-public')
      .getPublicUrl(data.path);
    
    return { url: publicUrl.publicUrl };
  } catch (error) {
    return null;
  }
};
