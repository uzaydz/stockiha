import { useState, useCallback } from 'react';
import { useTenant } from '@/context/TenantContext';
import { getSupabaseClient } from '@/lib/supabase';
import { StoreInitializationData } from '@/api/optimizedStoreDataService';
import { updateOrganizationTheme } from '@/lib/themeManager/index';

interface UseBasicStoreDataOptions {
  onDataLoaded?: (data: Partial<StoreInitializationData>) => void;
  onError?: (error: string) => void;
}

interface UseBasicStoreDataReturn {
  loadBasicStoreData: (subdomain: string) => Promise<void>;
}

export const useBasicStoreData = ({
  onDataLoaded,
  onError
}: UseBasicStoreDataOptions = {}): UseBasicStoreDataReturn => {
  const { currentOrganization } = useTenant();

  const loadBasicStoreData = useCallback(async (subdomain: string) => {
    try {
      const supabase = getSupabaseClient();

      // Fetch basic data only (organization and settings)
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select(`
          id, name, description, logo_url, subdomain, domain, settings,
          organization_settings!inner (
            id, site_name, theme_primary_color, theme_secondary_color,
            theme_mode, custom_css, enable_public_site, maintenance_mode,
            custom_js_header, custom_js_footer, seo_store_title,
            seo_meta_description, favicon_url, default_language
          )
        `)
        .eq('subdomain', subdomain)
        .single();

      if (orgError || !orgData) {
        const errorMessage = orgError?.message || 'المتجر غير موجود';
        onError?.(errorMessage);
        throw new Error(errorMessage);
      }

      const basicStoreData: Partial<StoreInitializationData> = {
        organization_details: {
          id: orgData.id,
          name: orgData.name,
          description: orgData.description,
          logo_url: orgData.logo_url,
          subdomain: orgData.subdomain,
          domain: orgData.domain,
          contact_email: (orgData.settings as any)?.contact_email || null,
          created_at: null,
          updated_at: null,
          currency: null,
          language: (orgData.settings as any)?.language || null,
          default_country: (orgData.settings as any)?.default_country || null,
          is_active: true,
          industry: (orgData.settings as any)?.industry || null,
          business_type: (orgData.settings as any)?.business_type || null,
          timezone: (orgData.settings as any)?.timezone || null
        },
        organization_settings: Array.isArray(orgData.organization_settings)
          ? orgData.organization_settings[0]
          : orgData.organization_settings,
        categories: [],
        featured_products: [],
        store_layout_components: [],
        shipping_info: {
          has_shipping_providers: false,
          default_shipping_zone_id: null,
          default_shipping_zone_details: null
        }
      };

      // Apply theme
      if (basicStoreData.organization_settings && currentOrganization?.id) {
        updateOrganizationTheme(currentOrganization.id, {
          theme_primary_color: basicStoreData.organization_settings.theme_primary_color,
          theme_secondary_color: basicStoreData.organization_settings.theme_secondary_color,
          theme_mode: basicStoreData.organization_settings.theme_mode as any,
          custom_css: basicStoreData.organization_settings.custom_css
        });
      }

      onDataLoaded?.(basicStoreData);

    } catch (error: any) {
      const errorMessage = error.message || 'خطأ غير معروف';
      onError?.(errorMessage);
      throw error;
    }
  }, [currentOrganization?.id, onDataLoaded, onError]);

  return {
    loadBasicStoreData
  };
};
