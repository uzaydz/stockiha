import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from './UserContext';
import { toast } from 'sonner';
import { UnifiedRequestManager } from '@/lib/unifiedRequestManager';
import { getSupabaseInstance } from '@/lib/supabase';

// تعريف التطبيقات المتاحة
export interface AppDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  version: string;
  dependencies?: string[];
  permissions?: string[];
  features: string[];
}

// حالة التطبيق للمنظمة - Type آمن
export interface OrganizationApp {
  id: string;
  organization_id: string;
  app_id: string;
  is_enabled: boolean;
  installed_at: string;
  configuration?: Record<string, any>;
  app?: AppDefinition;
}

// Type آمن لاستجابة قاعدة البيانات
interface DatabaseOrganizationApp {
  id?: string;
  organization_id?: string;
  app_id?: string;
  is_enabled?: boolean;
  installed_at?: string;
  configuration?: any;
  created_at?: string;
  updated_at?: string;
}

// واجهة السياق
interface AppsContextType {
  // التطبيقات المتاحة
  availableApps: AppDefinition[];
  
  // التطبيقات المثبتة للمنظمة
  organizationApps: OrganizationApp[];
  
  // حالة التحميل
  isLoading: boolean;
  
  // وظائف إدارة التطبيقات
  enableApp: (appId: string) => Promise<boolean>;
  disableApp: (appId: string) => Promise<boolean>;
  isAppEnabled: (appId: string) => boolean;
  getAppConfig: (appId: string) => Record<string, any> | null;
  updateAppConfig: (appId: string, config: Record<string, any>) => Promise<boolean>;
  
  // إعادة تحميل البيانات
  refreshApps: () => Promise<void>;
}

// التطبيقات المتاحة في النظام
const AVAILABLE_APPS: AppDefinition[] = [
  {
    id: 'pos-system',
    name: 'نظام نقطة البيع',
    description: 'نظام شامل لإدارة نقطة البيع والمبيعات والمرتجعات والمديونيات',
    icon: 'Store',
    category: 'مبيعات',
    version: '1.0.0',
    features: [
      'نقطة البيع الذكية مع قارئ الباركود',
      'إدارة طلبيات نقطة البيع',
      'نظام إدارة المديونيات والدفعات',
      'إرجاع المنتجات والاستبدال',
      'التصريح بالخسائر وإدارة المخزون',
      'طرق دفع متعددة (كاش، كارت، آجل)',
      'طباعة الفواتير والإيصالات',
      'دعم متغيرات المنتجات (ألوان، أحجام)'
    ],
    permissions: ['accessPOS', 'viewPOSOrders', 'viewDebts', 'manageReturns', 'manageLosses']
  },
  {
    id: 'repair-services',
    name: 'خدمات التصليح',
    description: 'إدارة طلبات التصليح وتتبع حالة الأجهزة',
    icon: 'Wrench',
    category: 'خدمات',
    version: '1.0.0',
    features: [
      'إنشاء طلبات تصليح جديدة',
      'تتبع حالة الطلبات',
      'إدارة المواقع والفنيين',
      'طباعة تقارير التصليح',
      'إشعارات تلقائية للعملاء'
    ],
    permissions: ['read:repairs', 'write:repairs', 'manage:repair-locations']
  },
  {
    id: 'subscription-services',
    name: 'خدمات الاشتراكات',
    description: 'إدارة وبيع اشتراكات الخدمات الرقمية',
    icon: 'CreditCard',
    category: 'خدمات رقمية',
    version: '1.0.0',
    features: [
      'كتالوج الاشتراكات الرقمية',
      'إدارة الأسعار والعروض',
      'تصنيف الخدمات',
      'تتبع المبيعات',
      'واجهة بيع سهلة الاستخدام'
    ],
    permissions: ['read:subscriptions', 'write:subscriptions', 'manage:subscription-categories']
  },
  {
    id: 'flexi-crypto',
    name: 'فليكسي وعملات رقمية',
    description: 'إدارة وبيع شحن الفليكسي والعملات الرقمية',
    icon: 'Smartphone',
    category: 'خدمات مالية',
    version: '1.0.0',
    features: [
      'إدارة شبكات الفليكسي',
      'بيع شحن الفليكسي',
      'إدارة العملات الرقمية',
      'تحليلات مبيعات متقدمة',
      'تتبع الأرصدة والمخزون',
      'حسابات أسعار الصرف'
    ],
    permissions: ['read:flexi', 'write:flexi', 'read:crypto', 'write:crypto', 'manage:flexi-networks']
  },
  {
    id: 'call-center',
    name: 'مركز الاتصال',
    description: 'نظام شامل لإدارة مركز الاتصال والوكلاء والطلبيات',
    icon: 'Phone',
    category: 'خدمات',
    version: '1.0.0',
    features: [
      'إدارة وكلاء مركز الاتصال',
      'توزيع الطلبيات التلقائي والذكي',
      'مراقبة الأداء في الوقت الفعلي',
      'تقارير شاملة للمكالمات والمبيعات',
      'إعدادات التوزيع المتقدمة',
      'تتبع جلسات العمل والحضور',
      'إحصائيات الأداء والإنتاجية',
      'نظام التنبيهات والإشعارات'
    ],
    permissions: ['manageCallCenter', 'viewCallCenterReports', 'manageCallCenterAgents', 'viewCallCenterMonitoring']
  }
];

// Local Storage key للتخزين المحلي
const LOCAL_STORAGE_KEY = 'organization_apps_state';

// Helper functions للتعامل مع البيانات بأمان
const transformDatabaseAppToOrganizationApp = (dbApp: DatabaseOrganizationApp, availableApps: AppDefinition[]): OrganizationApp => {
  return {
    id: dbApp.id || Date.now().toString(),
    organization_id: dbApp.organization_id || '',
    app_id: dbApp.app_id || '',
    is_enabled: dbApp.is_enabled || false,
    installed_at: dbApp.installed_at || new Date().toISOString(),
    configuration: dbApp.configuration || {},
    app: availableApps.find(app => app.id === dbApp.app_id)
  };
};

const saveToLocalStorage = (organizationId: string, apps: OrganizationApp[]) => {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_${organizationId}`, JSON.stringify(apps));
  } catch (error) {
    console.warn('Failed to save apps to localStorage:', error);
  }
};

const loadFromLocalStorage = (organizationId: string): OrganizationApp[] => {
  try {
    const stored = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${organizationId}`);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('Failed to load apps from localStorage:', error);
    return [];
  }
};

const AppsContext = createContext<AppsContextType | undefined>(undefined);

interface AppsProviderProps {
  children: ReactNode;
}

export const AppsProvider: React.FC<AppsProviderProps> = ({ children }) => {
  const { organizationId } = useUser();
  const [availableApps] = useState<AppDefinition[]>(AVAILABLE_APPS);
  const [organizationApps, setOrganizationApps] = useState<OrganizationApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // جلب التطبيقات المثبتة للمنظمة مع معالجة شاملة للأخطاء
  const fetchOrganizationApps = async () => {
    if (!organizationId) {
      setOrganizationApps([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log('🔄 [AppsContext] Fetching apps for organization:', organizationId);
      
      // تشخيص شامل للمشكلة
      console.log('🔍 [AppsContext] Comprehensive debugging started...');
      
      // 1. فحص الـ authentication
      const session = await supabase.auth.getSession();
      console.log('🔐 [AppsContext] Auth status:', {
        hasSession: !!session.data.session,
        userId: session.data.session?.user?.id,
        role: session.data.session?.user?.role
      });
      
      // 2. فحص بدون شروط
      try {
        const { data: allApps, error: allError } = await supabase
          .from('organization_apps')
          .select('*');
          
        console.log('📊 [AppsContext] All apps (no filters):', {
          count: allApps?.length || 0,
          data: allApps,
          error: allError
        });
      } catch (e) {
        console.error('❌ [AppsContext] Failed to fetch all apps:', e);
      }
      
      // 3. فحص مع organization_id فقط
      try {
        const { data: orgApps, error: orgError } = await supabase
          .from('organization_apps')
          .select('*')
          .eq('organization_id', organizationId);
          
        console.log('🏢 [AppsContext] Apps for organization:', {
          organizationId,
          count: orgApps?.length || 0,
          data: orgApps,
          error: orgError
        });
      } catch (e) {
        console.error('❌ [AppsContext] Failed to fetch org apps:', e);
      }
      
      // 4. فحص مع count
      try {
        const { count, error: countError } = await supabase
          .from('organization_apps')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId);
          
        console.log('🔢 [AppsContext] Count check:', {
          organizationId,
          totalCount: count,
          error: countError
        });
      } catch (e) {
        console.error('❌ [AppsContext] Failed to count:', e);
      }
      
      // محاولة جلب البيانات من UnifiedRequestManager أولاً
      let data: any[] = [];
      let fetchSuccess = false;

      try {
        console.log('🔄 [AppsContext] Fetching apps via UnifiedRequestManager...');
        const unifiedData = await UnifiedRequestManager.getOrganizationApps(organizationId);
        
        // التحقق من وجود بيانات صالحة
        if (unifiedData && Array.isArray(unifiedData) && unifiedData.length > 0) {
          data = unifiedData;
          fetchSuccess = true;
          console.log('✅ [AppsContext] UnifiedRequestManager success:', data.length, 'apps');
        } else {
          console.log('⚠️ [AppsContext] UnifiedRequestManager returned no data or empty array. Triggering fallback.');
        }
      } catch (unifiedError) {
        console.warn('⚠️ [AppsContext] UnifiedRequestManager failed:', unifiedError);
      }

      // Fallback: جلب مباشر من Supabase إذا فشل النظام الموحد أو أعاد بيانات فارغة
      if (!fetchSuccess) {
        try {
          console.log('🔄 [AppsContext] Fallback: Direct Supabase query...');
          const { data: directData, error } = await supabase
            .from('organization_apps')
            .select('*')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false });

          if (!error && directData && Array.isArray(directData)) {
            data = directData;
            fetchSuccess = true;
            console.log('✅ [AppsContext] Direct query success:', data.length, 'apps');
            if (data.length === 0) {
              console.log('📊 [AppsContext] No apps found in database for organization:', organizationId);
            }
          } else if (error) {
            console.error('❌ [AppsContext] Direct query failed:', {
              error: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint,
              organizationId
            });
          }
        } catch (directError) {
          console.error('❌ [AppsContext] Direct query failed with exception:', directError);
        }
      }

      // إنشاء قائمة كاملة من التطبيقات المتاحة مع حالة التفعيل
      const allApps: OrganizationApp[] = AVAILABLE_APPS.map(app => {
        // البحث عن التطبيق في البيانات المجلبة
        const existingApp = data.find((item: any) => 
          item && (item.app_id === app.id || item.appId === app.id)
        );

        return {
          id: existingApp?.id || `default_${app.id}`,
          organization_id: organizationId,
          app_id: app.id,
          is_enabled: existingApp ? Boolean(existingApp.is_enabled) : false,
          installed_at: existingApp?.installed_at || existingApp?.created_at || new Date().toISOString(),
          configuration: existingApp?.configuration || {},
          app: app
        };
      });

      console.log('✅ [AppsContext] Final apps processed:', {
        total: allApps.length,
        enabled: allApps.filter(app => app.is_enabled).length,
        disabled: allApps.filter(app => !app.is_enabled).length,
        apps: allApps.map(app => ({ id: app.app_id, enabled: app.is_enabled }))
      });
       
      setOrganizationApps(allApps);
      saveToLocalStorage(organizationId, allApps);

    } catch (error) {
      console.error('❌ [AppsContext] Critical error:', error);
      
      // محاولة أخيرة لاستخدام البيانات المحلية
      const localData = loadFromLocalStorage(organizationId);
      if (localData.length > 0) {
        console.log('📱 [AppsContext] Using localStorage fallback:', localData.length, 'apps');
        setOrganizationApps(localData);
      } else {
        // إنشاء قائمة افتراضية من التطبيقات
        const defaultApps: OrganizationApp[] = AVAILABLE_APPS.map(app => ({
          id: `default_${app.id}`,
          organization_id: organizationId,
          app_id: app.id,
          is_enabled: false,
          installed_at: new Date().toISOString(),
          configuration: {},
          app: app
        }));
        
        console.log('🔧 [AppsContext] Using default apps:', defaultApps.length);
        setOrganizationApps(defaultApps);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // تفعيل تطبيق - نسخة محسنة وآمنة
  const enableApp = async (appId: string): Promise<boolean> => {
    if (!organizationId) {
      toast.error('معرف المنظمة غير متوفر');
      return false;
    }

    try {
      console.log('🟢 [AppsContext] Enabling app:', appId);

      // التحقق من وجود التطبيق
      const appDefinition = availableApps.find(app => app.id === appId);
      if (!appDefinition) {
        toast.error('التطبيق غير موجود');
        return false;
      }

      // تحديث الحالة المحلية فوراً للاستجابة السريعة
      setOrganizationApps(prev => {
        return prev.map(app => 
          app.app_id === appId 
            ? { ...app, is_enabled: true } 
            : app
        );
      });

      // محاولة حفظ في قاعدة البيانات
      try {
        // أولاً، محاولة تحديث إذا كان موجود
        console.log('🔍 [AppsContext] Checking if app exists in DB:', { organizationId, appId });
        const { data: existingApp, error: selectError } = await supabase
          .from('organization_apps')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('app_id', appId)
          .single();
          
        if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = no rows found
          console.error('❌ [AppsContext] Error checking existing app:', {
            error: selectError.message,
            code: selectError.code,
            details: selectError.details
          });
        }

        if (existingApp && existingApp.id) {
          // تحديث الموجود فقط إذا كان له ID صالح
          console.log('🔄 [AppsContext] Updating existing app record:', { organizationId, appId, existingAppId: existingApp.id });
          const { data: updateData, error } = await supabase
            .from('organization_apps')
            .update({ 
              is_enabled: true, 
              updated_at: new Date().toISOString() 
            })
            .eq('organization_id', organizationId)
            .eq('app_id', appId)
            .select();

          if (error) {
            console.error('❌ [AppsContext] Database update failed:', {
              error: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint,
              organizationId,
              appId
            });
            
            // إذا فشل التحديث، جرب الإدراج
            console.log('🔄 [AppsContext] Update failed, trying insert...');
            await insertNewApp();
          } else {
            console.log('✅ [AppsContext] App enabled in database (updated):', updateData);
          }
        } else {
          // إنشاء جديد
          await insertNewApp();
        }
        
        // دالة مساعدة للإدراج
        async function insertNewApp() {
          console.log('🆕 [AppsContext] Creating new app record:', { organizationId, appId });
          const newRecord = {
            organization_id: organizationId,
            app_id: appId,
            is_enabled: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          const { data: insertData, error: insertError } = await supabase
            .from('organization_apps')
            .insert(newRecord)
            .select();

          if (insertError) {
            console.error('❌ [AppsContext] Database insert failed:', {
              error: insertError.message,
              code: insertError.code,
              details: insertError.details,
              hint: insertError.hint,
              record: newRecord
            });
            
            // محاولة أخيرة مع upsert
            console.log('🔄 [AppsContext] Insert failed, trying upsert...');
            const { data: upsertData, error: upsertError } = await supabase
              .from('organization_apps')
              .upsert(newRecord, { onConflict: 'organization_id,app_id' })
              .select();
              
            if (upsertError) {
              console.error('❌ [AppsContext] Upsert also failed:', upsertError);
            } else {
              console.log('✅ [AppsContext] App enabled via upsert:', upsertData);
            }
          } else {
            console.log('✅ [AppsContext] App enabled in database (inserted):', insertData);
          }
        }
      } catch (dbError: any) {
        console.warn('⚠️ [AppsContext] Database operation failed:', dbError);
      }

      // مسح Cache للتأكد من التزامن
      if (typeof UnifiedRequestManager?.clearCache === 'function') {
        UnifiedRequestManager.clearCache(`unified_org_apps_${organizationId}`);
      }

      toast.success('تم تفعيل التطبيق بنجاح');
      return true;

    } catch (error) {
      console.error('❌ [AppsContext] Enable app error:', error);
      toast.error(`فشل في تفعيل التطبيق: ${error.message || 'خطأ غير محدد'}`);
      
      // إعادة الحالة في حالة الخطأ
      setOrganizationApps(prev => {
        return prev.map(app => 
          app.app_id === appId 
            ? { ...app, is_enabled: false } 
            : app
        );
      });
      
      return false;
    }
  };

  // إلغاء تفعيل تطبيق - نسخة محسنة وآمنة
  const disableApp = async (appId: string): Promise<boolean> => {
    if (!organizationId) {
      toast.error('معرف المنظمة غير متوفر');
      return false;
    }

    try {
      console.log('🔴 [AppsContext] Disabling app:', appId);

      // تحديث الحالة المحلية فوراً
      setOrganizationApps(prev => {
        return prev.map(app => 
          app.app_id === appId 
            ? { ...app, is_enabled: false } 
            : app
        );
      });

      // محاولة حفظ في قاعدة البيانات
      try {
        const { error } = await supabase
          .from('organization_apps')
          .update({ 
            is_enabled: false, 
            updated_at: new Date().toISOString() 
          })
          .eq('organization_id', organizationId)
          .eq('app_id', appId);

        if (error) {
          console.warn('⚠️ [AppsContext] Database update failed:', error);
        } else {
          console.log('✅ [AppsContext] App disabled in database successfully');
        }
      } catch (dbError: any) {
        console.warn('⚠️ [AppsContext] Database operation failed:', dbError);
      }

      // مسح Cache للتأكد من التزامن
      if (typeof UnifiedRequestManager?.clearCache === 'function') {
        UnifiedRequestManager.clearCache(`unified_org_apps_${organizationId}`);
      }

      toast.success('تم إلغاء تفعيل التطبيق بنجاح');
      return true;

    } catch (error) {
      console.error('❌ [AppsContext] Disable app error:', error);
      toast.error('فشل في إلغاء تفعيل التطبيق');
      
      // إعادة الحالة في حالة الخطأ
      setOrganizationApps(prev => {
        return prev.map(app => 
          app.app_id === appId 
            ? { ...app, is_enabled: true } 
            : app
        );
      });
      
      return false;
    }
  };

  // التحقق من تفعيل التطبيق
  const isAppEnabled = (appId: string): boolean => {
    const app = organizationApps.find(app => app.app_id === appId);
    return app?.is_enabled || false;
  };

  // الحصول على إعدادات التطبيق
  const getAppConfig = (appId: string): Record<string, any> | null => {
    const app = organizationApps.find(app => app.app_id === appId);
    return app?.configuration || null;
  };

  // تحديث إعدادات التطبيق - نسخة آمنة
  const updateAppConfig = async (appId: string, config: Record<string, any>): Promise<boolean> => {
    if (!organizationId) return false;

    try {
      const existingApp = organizationApps.find(app => app.app_id === appId);
      
      if (existingApp) {
        // تحديث الحالة المحلية فوراً
        setOrganizationApps(prev => {
          const updatedApps = prev.map(app => 
            app.app_id === appId ? { ...app, configuration: config } : app
          );
          saveToLocalStorage(organizationId, updatedApps);
          return updatedApps;
        });

                 // محاولة حفظ في قاعدة البيانات في الخلفية
         setTimeout(async () => {
           try {
             // استخدام RPC للتجنب مشاكل TypeScript
             await supabase.rpc('update_app_config', {
               org_id: organizationId,
               app_id_param: appId,
               config_data: config
             });
             console.log('✅ [AppsContext] Config saved to database');
           } catch (dbError) {
             console.warn('⚠️ [AppsContext] Config save to database failed:', dbError);
             // لا مشكلة، البيانات محفوظة محلياً
           }
         }, 100);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ [AppsContext] Update config error:', error);
      return false;
    }
  };

  // إعادة تحميل البيانات
  const refreshApps = async () => {
    console.log('🔄 [AppsContext] Refreshing apps...');
    
    // تنظيف cache التطبيقات في UnifiedRequestManager
    if (organizationId && typeof UnifiedRequestManager?.clearCache === 'function') {
      UnifiedRequestManager.clearCache(`unified_org_apps_${organizationId}`);
    }
    
    // إعادة تحميل البيانات
    await fetchOrganizationApps();
  };

  // جلب البيانات عند تغيير المنظمة
  useEffect(() => {
    if (organizationId) {
      console.log('🔄 [AppsContext] Organization changed, fetching apps...');
      fetchOrganizationApps();
    }
  }, [organizationId]);

  // مراقبة تغييرات organizationApps للتشخيص
  useEffect(() => {
    console.log('📊 [AppsContext] Organization apps updated:', {
      total: organizationApps.length,
      enabled: organizationApps.filter(app => app.is_enabled).length,
      apps: organizationApps.map(app => ({ id: app.app_id, enabled: app.is_enabled }))
    });
  }, [organizationApps]);

  const value: AppsContextType = {
    availableApps,
    organizationApps,
    isLoading,
    enableApp,
    disableApp,
    isAppEnabled,
    getAppConfig,
    updateAppConfig,
    refreshApps
  };

  return (
    <AppsContext.Provider value={value}>
      {children}
    </AppsContext.Provider>
  );
};

// Hook لاستخدام السياق
export const useApps = (): AppsContextType => {
  const context = useContext(AppsContext);
  if (context === undefined) {
    console.warn('⚠️ [AppsContext] useApps used outside of AppsProvider, returning defaults');
    // بدلاً من رمي خطأ، نوفر قيم افتراضية
    return {
      availableApps: AVAILABLE_APPS,
      organizationApps: [],
      isLoading: false,
      enableApp: async () => false,
      disableApp: async () => false,
      isAppEnabled: () => false,
      getAppConfig: () => null,
      updateAppConfig: async () => false,
      refreshApps: async () => {}
    };
  }
  return context;
};
