/**
 * Hook لإدارة فافيكون المتجر
 */

import { useEffect } from 'react';
import { initFaviconManager, updateFavicon } from '@/utils/faviconManager';

interface UseFaviconManagerProps {
  faviconUrl?: string;
  logoUrl?: string;
  storeName?: string;
  autoUpdate?: boolean;
}

/**
 * Hook لإدارة فافيكون المتجر
 */
export function useFaviconManager({
  faviconUrl,
  logoUrl,
  storeName,
  autoUpdate = true
}: UseFaviconManagerProps = {}) {
  
  // تهيئة مدير الفافيكون مرة واحدة
  useEffect(() => {
    initFaviconManager();
  }, []);

  // تحديث الفافيكون عند تغيير البيانات
  useEffect(() => {
    if (autoUpdate && (faviconUrl || logoUrl || storeName)) {
      updateFavicon({
        faviconUrl,
        logoUrl,
        storeName,
        forceUpdate: true
      });
    }
  }, [faviconUrl, logoUrl, storeName, autoUpdate]);

  return {
    updateFavicon: (options: Parameters<typeof updateFavicon>[0]) => updateFavicon(options)
  };
}

/**
 * Hook مبسط للفافيكون الفوري
 */
export function useInstantFavicon(storeData?: any) {
  useEffect(() => {
    if (storeData) {
      const faviconUrl = storeData.organization_settings?.favicon_url;
      const logoUrl = storeData.organization_settings?.logo_url || 
                     storeData.organization_details?.logo_url;
      const storeName = storeData.organization_details?.name || 
                       storeData.organization_settings?.site_name;

      if (faviconUrl || logoUrl) {
        updateFavicon({
          faviconUrl,
          logoUrl,
          storeName,
          forceUpdate: true
        });
      }
    }
  }, [storeData]);
}
