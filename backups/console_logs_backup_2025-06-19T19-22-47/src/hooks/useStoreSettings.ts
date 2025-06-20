import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { getSupabaseClient } from '@/lib/supabase';
import { OrganizationSettings } from '@/types/settings';

export const useStoreSettings = () => {
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentOrganization } = useTenant();
  const { currentSubdomain } = useAuth();
  
  // متغيرات لمنع التحديثات المتكررة
  const fetchInProgressRef = useRef(false);
  const lastFetchTimeRef = useRef<number>(0);
  const settingsRevisionRef = useRef<number>(0);

  const fetchSettings = useCallback(async (forceRefresh = false) => {
    // منع التحديثات المتكررة - حد أدنى 2 ثانية بين الطلبات
    const now = Date.now();
    if (!forceRefresh && fetchInProgressRef.current) {
      return;
    }
    
    if (!forceRefresh && (now - lastFetchTimeRef.current) < 2000) {
      return;
    }

    if (!currentOrganization?.id && !currentSubdomain) {
      setLoading(false);
      return;
    }

    // منع التحديثات المتزامنة
    if (fetchInProgressRef.current) return;
    fetchInProgressRef.current = true;

    try {
      setLoading(true);
      setError(null);
      lastFetchTimeRef.current = now;
      
      const supabase = getSupabaseClient();
      
      // استخدام الطريقة العادية لجلب الإعدادات
      let query = supabase
        .from('organization_settings')
        .select('*');

      if (currentOrganization?.id) {
        query = query.eq('organization_id', currentOrganization.id);
      } else if (currentSubdomain) {
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('id')
          .eq('subdomain', currentSubdomain)
          .single();

        if (orgError || !orgData) {
          throw new Error('Unable to find organization');
        }

        query = query.eq('organization_id', orgData.id);
      }

      const { data, error: settingsError } = await query.single();

      if (settingsError) {
        if (settingsError.code === 'PGRST116') {
          // إنشاء إعدادات افتراضية
          await fetchSettingsLegacy();
        } else {
          throw settingsError;
        }
      } else {
        const newData = data as OrganizationSettings;
        
        // فحص إذا كانت البيانات الجديدة مختلفة قبل التحديث
        const hasChanged = !settings || 
          settings.default_language !== newData.default_language ||
          settings.site_name !== newData.site_name ||
          settings.theme_primary_color !== newData.theme_primary_color ||
          settings.updated_at !== newData.updated_at;

        if (hasChanged) {
          
          setSettings(newData);
          settingsRevisionRef.current += 1;
        }
      }
    } catch (err) {
      // محاولة استخدام الطريقة القديمة كـ fallback
      try {
        await fetchSettingsLegacy();
      } catch (fallbackErr) {
        setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
      }
    } finally {
      setLoading(false);
      fetchInProgressRef.current = false;
    }
  }, [currentOrganization?.id, currentSubdomain, settings]);

  // الطريقة القديمة كـ fallback
  const fetchSettingsLegacy = async () => {
    const supabase = getSupabaseClient();
    
    let query = supabase
      .from('organization_settings')
      .select('*');

    if (currentOrganization?.id) {
      query = query.eq('organization_id', currentOrganization.id);
    } else if (currentSubdomain) {
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('subdomain', currentSubdomain)
        .single();

      if (orgError || !orgData) {
        throw new Error('Unable to find organization');
      }

      query = query.eq('organization_id', orgData.id);
    }

    const { data, error: settingsError } = await query.single();

    if (settingsError) {
      if (settingsError.code === 'PGRST116') {
        const orgId = currentOrganization?.id || await getOrganizationIdFromSubdomain();
        if (orgId) {
          const defaultSettings = {
            organization_id: orgId,
            theme_primary_color: '#3B82F6',
            theme_secondary_color: '#10B981',
            theme_mode: 'light' as const,
            site_name: 'متجري',
            default_language: 'ar',
            enable_registration: true,
            enable_public_site: true,
            display_text_with_logo: false
          };

          const { data: newSettings, error: createError } = await supabase
            .from('organization_settings')
            .insert(defaultSettings)
            .select()
            .single();

          if (createError) {
            throw createError;
          }

          setSettings(newSettings as OrganizationSettings);
          settingsRevisionRef.current += 1;
        }
      } else {
        throw settingsError;
      }
    } else {
      const newData = data as OrganizationSettings;
      const hasChanged = !settings || 
        settings.default_language !== newData.default_language ||
        settings.site_name !== newData.site_name ||
        settings.theme_primary_color !== newData.theme_primary_color ||
        settings.updated_at !== newData.updated_at;

      if (hasChanged) {
        
        setSettings(newData);
        settingsRevisionRef.current += 1;
      }
    }
  };

  const getOrganizationIdFromSubdomain = async () => {
    if (!currentSubdomain) return null;

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('organizations')
        .select('id')
        .eq('subdomain', currentSubdomain)
        .single();

      if (error) throw error;
      return data.id;
    } catch (err) {
      return null;
    }
  };

  // التحميل الأولي للإعدادات
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // دالة إعادة جلب يدوية
  const refetch = useCallback(() => {
    fetchSettings(true);
  }, [fetchSettings]);

  const updateSettings = async (updates: Partial<OrganizationSettings>) => {
    if (!settings?.organization_id) return;

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('organization_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('organization_id', settings.organization_id)
        .select()
        .single();

      if (error) throw error;
      
      setSettings(data as OrganizationSettings);
      settingsRevisionRef.current += 1;
      
      // إرسال حدث للإشعار بالتحديث
      window.dispatchEvent(new CustomEvent('store_settings_updated', {
        detail: { settings: data, source: 'updateSettings' }
      }));
      
      return data as OrganizationSettings;
    } catch (err) {
      throw err;
    }
  };

  return {
    settings,
    loading,
    error,
    updateSettings,
    refetch,
    revision: settingsRevisionRef.current // رقم المراجعة للتتبع
  };
};

export default useStoreSettings;
