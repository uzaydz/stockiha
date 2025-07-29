import { useEffect, useRef, useState, useCallback } from 'react';
import { getOrganizationSettings } from '@/lib/api/settings';
import { updateOrganizationTheme } from '@/lib/themeManager';
import { useTheme } from '@/context/ThemeContext';
import { storeInitializationManager } from '@/lib/storeInitializationManager';
import i18n from '@/i18n';

interface StoreInitializationData {
  organizationId: string;
  settings: any;
  language: string;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    mode: string;
  };
}

interface UseStoreInitializationOptions {
  organizationId?: string;
  subdomain?: string;
  enabled?: boolean;
}

export const useStoreInitialization = (options: UseStoreInitializationOptions) => {
  const { organizationId, subdomain, enabled = true } = options;
  const { setTheme } = useTheme();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StoreInitializationData | null>(null);
  
  const initializationRef = useRef(false);

  const debugLog = (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
    }
  };

  const initializeStore = useCallback(async (): Promise<void> => {
    if (!enabled || (!organizationId && !subdomain)) {
      debugLog('تم تجاهل التهيئة - البيانات غير مكتملة', { enabled, organizationId, subdomain });
      setIsLoading(false);
      return;
    }

    const orgId = organizationId!;
    
    // استخدام المدير المركزي لمنع التهيئة المتكررة
    if (!storeInitializationManager.needsInitialization(orgId)) {
      debugLog('تم تجاهل التهيئة - تمت بالفعل أو جارية', { organizationId: orgId });
      
      // إذا كانت التهيئة مكتملة، تحديث الحالة المحلية
      if (storeInitializationManager.isInitialized(orgId)) {
        setIsLoading(false);
        initializationRef.current = true;
      }
      return;
    }

    debugLog('=== بدء تهيئة المتجر الموحدة ===', { organizationId, subdomain });
    
    setIsLoading(true);
    setError(null);
    
    try {
      // استخدام المدير المركزي لإدارة التهيئة
      await storeInitializationManager.startInitialization(orgId, async () => {
        const startTime = performance.now();
        
        // 1. جلب إعدادات المؤسسة
        debugLog('جلب إعدادات المؤسسة...');
        const settings = await getOrganizationSettings(organizationId!);
        
        if (!settings) {
          throw new Error('لم يتم العثور على إعدادات المؤسسة');
        }

        debugLog('تم جلب الإعدادات بنجاح', {
          siteName: settings.site_name,
          language: settings.default_language,
          primaryColor: settings.theme_primary_color,
          secondaryColor: settings.theme_secondary_color,
          themeMode: settings.theme_mode
        });

        // 2. تطبيق اللغة فوراً
        if (settings.default_language && settings.default_language !== i18n.language) {
          debugLog('تطبيق اللغة:', settings.default_language);
          await i18n.changeLanguage(settings.default_language);
          
          // تحديث اتجاه الصفحة
          const direction = settings.default_language === 'ar' ? 'rtl' : 'ltr';
          document.documentElement.setAttribute('dir', direction);
          document.body.setAttribute('dir', direction);
          
          debugLog('تم تحديث اتجاه الصفحة:', direction);
        }

        // 3. تطبيق الألوان والثيم فوراً
        if (settings.theme_primary_color || settings.theme_secondary_color) {
          debugLog('تطبيق الألوان والثيم...');
          
          // تطبيق الألوان عبر ThemeManager
          updateOrganizationTheme(organizationId!, {
            theme_primary_color: settings.theme_primary_color,
            theme_secondary_color: settings.theme_secondary_color,
            theme_mode: settings.theme_mode,
            custom_css: settings.custom_css
          });

          // تطبيق وضع الثيم عبر ThemeContext
          if (settings.theme_mode) {
            const themeMode = settings.theme_mode === 'auto' ? 'system' : settings.theme_mode;
            setTheme(themeMode as any);
            debugLog('تم تطبيق وضع الثيم:', themeMode);
          }
        }

        // 4. حفظ البيانات في الحالة
        const initData: StoreInitializationData = {
          organizationId: organizationId!,
          settings,
          language: settings.default_language || 'ar',
          theme: {
            primaryColor: settings.theme_primary_color || '#0099ff',
            secondaryColor: settings.theme_secondary_color || '#6c757d',
            mode: settings.theme_mode || 'light'
          }
        };

        setData(initData);
        initializationRef.current = true;
        
        const endTime = performance.now();
        debugLog(`✅ تمت تهيئة المتجر بنجاح في ${Math.round(endTime - startTime)}ms`);
      });
      
      setIsLoading(false);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطأ في تهيئة المتجر';
      debugLog('❌ خطأ في تهيئة المتجر:', errorMessage);
      setError(errorMessage);
      setIsLoading(false);
    }
  }, [organizationId, subdomain, enabled, setTheme]);

  // تشغيل التهيئة عند تغيير المعاملات
  useEffect(() => {
    if (enabled && (organizationId || subdomain)) {
      initializeStore();
    }
  }, [initializeStore]);

  // دالة إعادة التهيئة
  const reinitialize = useCallback(() => {
    if (organizationId) {
      storeInitializationManager.resetInitialization(organizationId);
    }
    initializationRef.current = false;
    initializeStore();
  }, [organizationId, initializeStore]);

  return {
    isLoading,
    error,
    data,
    reinitialize,
    isInitialized: initializationRef.current
  };
};
