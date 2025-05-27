import { supabase } from './supabase';
import { getSupabaseClient } from './supabase';

export interface CustomPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  meta_description?: string;
  created_at: string;
  updated_at: string;
}

export interface FooterSettings {
  savedPages?: CustomPage[];
  [key: string]: any;
}

// جلب جميع الصفحات المخصصة من أي مؤسسة
export const getCustomPages = async (organizationId?: string): Promise<CustomPage[]> => {
  try {
    const supabase = getSupabaseClient();
    
    // Build query - if organizationId provided, filter by it
    let query = supabase
      .from('store_settings')
      .select('settings, organization_id')
      .eq('component_type', 'footer')
      .eq('is_active', true);
    
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data: storeSettings, error } = await query;

    if (error) {
      return [];
    }

    // Extract all savedPages from all footer settings
    const allPages: CustomPage[] = [];
    
    if (storeSettings) {
      storeSettings.forEach((setting) => {
        const footerSettings = setting.settings as FooterSettings;
        if (footerSettings?.savedPages) {
          allPages.push(...footerSettings.savedPages);
        }
      });
    }

    return allPages;
  } catch (error) {
    return [];
  }
};

// جلب صفحة مخصصة بواسطة الـ slug من أي مؤسسة
export const getCustomPageBySlug = async (slug: string): Promise<CustomPage | null> => {
  try {
    const supabase = getSupabaseClient();
    
    // Get all footer settings from all organizations
    const { data: storeSettings, error } = await supabase
      .from('store_settings')
      .select('settings, organization_id')
      .eq('component_type', 'footer')
      .eq('is_active', true);

    if (error) {
      return null;
    }

    // Search for page with matching slug in all organizations
    if (storeSettings) {
      for (const setting of storeSettings) {
        const footerSettings = setting.settings as FooterSettings;
        if (footerSettings?.savedPages) {
          const foundPage = footerSettings.savedPages.find(page => page.slug === slug);
          if (foundPage) {
            return foundPage;
          }
        }
      }
    }

    return null;
  } catch (error) {
    return null;
  }
};

// إنشاء slug من العنوان
export const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

// التحقق من صحة الصفحة المخصصة
export const validateCustomPage = (page: Partial<CustomPage>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!page.title || page.title.trim().length === 0) {
    errors.push('العنوان مطلوب');
  }

  if (!page.content || page.content.trim().length === 0) {
    errors.push('المحتوى مطلوب');
  }

  if (!page.slug || page.slug.trim().length === 0) {
    errors.push('الـ slug مطلوب');
  } else if (!/^[a-z0-9-]+$/.test(page.slug)) {
    errors.push('الـ slug يجب أن يحتوي على أحرف إنجليزية صغيرة وأرقام وشرطات فقط');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// تحديث إعدادات الفوتر مع الصفحات الجديدة لمؤسسة محددة
export const updateFooterSettings = async (organizationId: string, updatedSettings: FooterSettings): Promise<boolean> => {
  try {
    const supabase = getSupabaseClient();
    
    // Check if footer component exists for this organization
    const { data: existingFooter, error: checkError } = await supabase
      .from('store_settings')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('component_type', 'footer')
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingFooter) {
      // Update existing footer
      const { error: updateError } = await supabase
        .from('store_settings')
        .update({ 
          settings: updatedSettings,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingFooter.id);

      if (updateError) throw updateError;
    } else {
      // Create new footer
      const { error: insertError } = await supabase
        .from('store_settings')
        .insert({
          organization_id: organizationId,
          component_type: 'footer',
          settings: updatedSettings,
          is_active: true,
          order_index: 999
        });

      if (insertError) throw insertError;
    }

    return true;
  } catch (error) {
    return false;
  }
};

// حفظ صفحة جديدة لمؤسسة محددة
export const saveCustomPage = async (organizationId: string, page: Omit<CustomPage, 'id' | 'created_at' | 'updated_at'>): Promise<CustomPage | null> => {
  try {
    const newPage: CustomPage = {
      ...page,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Get current footer settings for this organization
    const supabase = getSupabaseClient();
    const { data: storeSettings, error: fetchError } = await supabase
      .from('store_settings')
      .select('settings')
      .eq('organization_id', organizationId)
      .eq('component_type', 'footer')
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    const currentFooterSettings = (storeSettings?.settings as FooterSettings) || {};
    const currentPages = currentFooterSettings.savedPages || [];
    const updatedPages = [...currentPages, newPage];

    const updatedFooterSettings: FooterSettings = {
      ...currentFooterSettings,
      savedPages: updatedPages
    };

    const success = await updateFooterSettings(organizationId, updatedFooterSettings);
    return success ? newPage : null;
  } catch (error) {
    return null;
  }
};

// حذف صفحة لمؤسسة محددة
export const deleteCustomPage = async (organizationId: string, pageId: string): Promise<boolean> => {
  try {
    // Get current footer settings for this organization
    const supabase = getSupabaseClient();
    const { data: storeSettings, error: fetchError } = await supabase
      .from('store_settings')
      .select('settings')
      .eq('organization_id', organizationId)
      .eq('component_type', 'footer')
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    const currentFooterSettings = (storeSettings?.settings as FooterSettings) || {};
    const currentPages = currentFooterSettings.savedPages || [];
    const updatedPages = currentPages.filter(page => page.id !== pageId);

    const updatedFooterSettings: FooterSettings = {
      ...currentFooterSettings,
      savedPages: updatedPages
    };

    return await updateFooterSettings(organizationId, updatedFooterSettings);
  } catch (error) {
    return false;
  }
};

// تحديث صفحة موجودة لمؤسسة محددة
export const updateCustomPage = async (organizationId: string, pageId: string, updates: Partial<CustomPage>): Promise<boolean> => {
  try {
    // Get current footer settings for this organization
    const supabase = getSupabaseClient();
    const { data: storeSettings, error: fetchError } = await supabase
      .from('store_settings')
      .select('settings')
      .eq('organization_id', organizationId)
      .eq('component_type', 'footer')
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    const currentFooterSettings = (storeSettings?.settings as FooterSettings) || {};
    const currentPages = currentFooterSettings.savedPages || [];
    const pageIndex = currentPages.findIndex(page => page.id === pageId);
    
    if (pageIndex === -1) {
      return false;
    }

    const updatedPages = [...currentPages];
    updatedPages[pageIndex] = { 
      ...updatedPages[pageIndex], 
      ...updates,
      updated_at: new Date().toISOString()
    };

    const updatedFooterSettings: FooterSettings = {
      ...currentFooterSettings,
      savedPages: updatedPages
    };

    return await updateFooterSettings(organizationId, updatedFooterSettings);
  } catch (error) {
    return false;
  }
};
