import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-unified';
import { useUser } from '@/context/UserContext';
import { toast } from 'sonner';
import { UnifiedRequestManager } from '@/lib/unifiedRequestManager';

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
  }
};

const loadFromLocalStorage = (organizationId: string): OrganizationApp[] => {
  try {
    const stored = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${organizationId}`);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    return [];
  }
};

const AppsContext = createContext<AppsContextType | undefined>(undefined);

interface AppsProviderProps {
  children: React.ReactNode;
}

export function AppsProvider({ children }: AppsProviderProps) {
  const { organizationId } = useUser();
  const [availableApps] = useState<AppDefinition[]>(AVAILABLE_APPS);
  const [organizationApps, setOrganizationApps] = useState<OrganizationApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // تحميل فوري للبيانات المحلية عند بداية المكون
  useEffect(() => {
    if (organizationId) {
      console.log('AppsProvider: Initial load for organization:', organizationId);
      const cachedApps = loadFromLocalStorage(organizationId);
      if (cachedApps.length > 0) {
        console.log('AppsProvider: Found cached apps:', cachedApps.length);
        setOrganizationApps(cachedApps);
        setIsLoading(false); // إيقاف التحميل لأن لدينا بيانات محلية
      }
    }
  }, [organizationId]);



  // جلب التطبيقات - نسخة مبسطة وفعالة
  const fetchOrganizationApps = async () => {
    if (!organizationId) {
      // إنشاء قائمة افتراضية عندما لا يوجد organizationId
      const defaultApps: OrganizationApp[] = AVAILABLE_APPS.map(app => ({
        id: `default_${app.id}`,
        organization_id: '',
        app_id: app.id,
        is_enabled: false,
        installed_at: new Date().toISOString(),
        configuration: {},
        app: app
      }));
      setOrganizationApps(defaultApps);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // محاولة جلب البيانات من قاعدة البيانات
      // @ts-ignore - تجاهل أخطاء TypeScript مؤقتاً
      const { data, error } = await supabase
        .from('organization_apps')
        .select('*')
        .eq('organization_id', organizationId);

      let organizationAppsData: any[] = [];
      
      // إذا نجح الاستعلام واسترجعنا بيانات
      if (!error && data) {
        organizationAppsData = data;
      } else {
        // محاولة استخدام البيانات المحلية
        const localData = loadFromLocalStorage(organizationId);
        if (localData.length > 0) {
          setOrganizationApps(localData);
          setIsLoading(false);
          return;
        }
      }

      // إنشاء قائمة شاملة للتطبيقات - مع الحفاظ على البيانات المحلية المفعلة
      const localApps = loadFromLocalStorage(organizationId);
      const allApps: OrganizationApp[] = AVAILABLE_APPS.map(app => {
        const existingApp = organizationAppsData.find(item => item.app_id === app.id);
        const localApp = localApps.find(item => item.app_id === app.id);
        
        // أولوية للبيانات المحلية إذا كانت التطبيق مفعل محلياً
        const isEnabledFromDB = existingApp ? Boolean(existingApp.is_enabled) : false;
        const isEnabledFromLocal = localApp ? Boolean(localApp.is_enabled) : false;
        
        return {
          id: existingApp?.id || `default_${app.id}`,
          organization_id: organizationId,
          app_id: app.id,
          is_enabled: isEnabledFromLocal || isEnabledFromDB, // أولوية للمحلي
          installed_at: existingApp?.installed_at || new Date().toISOString(),
          configuration: localApp?.configuration || existingApp?.configuration || {},
          app: app
        };
      });

      console.log('AppsContext: Merged apps with local priority:', allApps.filter(app => app.is_enabled).map(app => app.app_id));

      setOrganizationApps(allApps);
      saveToLocalStorage(organizationId, allApps);

    } catch (error) {
      // في حالة الخطأ، استخدم البيانات المحلية أو قائمة افتراضية
      const localData = loadFromLocalStorage(organizationId);
      if (localData.length > 0) {
        setOrganizationApps(localData);
      } else {
        const defaultApps: OrganizationApp[] = AVAILABLE_APPS.map(app => ({
          id: `default_${app.id}`,
          organization_id: organizationId,
          app_id: app.id,
          is_enabled: false,
          installed_at: new Date().toISOString(),
          configuration: {},
          app: app
        }));
        setOrganizationApps(defaultApps);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // تفعيل تطبيق - نسخة مبسطة
  const enableApp = async (appId: string): Promise<boolean> => {
    if (!organizationId) {
      toast.error('معرف المنظمة غير متوفر');
      return false;
    }

    const appDefinition = availableApps.find(app => app.id === appId);
    if (!appDefinition) {
      toast.error('التطبيق غير موجود');
      return false;
    }

    try {
      // تحديث الحالة المحلية فوراً
      setOrganizationApps(prev => 
        prev.map(app => 
          app.app_id === appId ? { ...app, is_enabled: true } : app
        )
      );

      // حفظ في قاعدة البيانات
      // @ts-ignore - تجاهل أخطاء TypeScript مؤقتاً
      const { error } = await supabase
        .from('organization_apps')
        .upsert({
          organization_id: organizationId,
          app_id: appId,
          is_enabled: true,
          installed_at: new Date().toISOString(),
          configuration: {}
        }, { onConflict: 'organization_id,app_id' });

      if (error) {
        throw error;
      }

      toast.success(`تم تفعيل تطبيق ${appDefinition.name} بنجاح`);
      
      // حفظ في التخزين المحلي - استخدم البيانات المحدثة
      setOrganizationApps(updatedApps => {
        saveToLocalStorage(organizationId, updatedApps);
        return updatedApps;
      });
        
      return true;

    } catch (error: any) {
      // إعادة الحالة في حالة الخطأ
      setOrganizationApps(prev => 
        prev.map(app => 
          app.app_id === appId ? { ...app, is_enabled: false } : app
        )
      );
      
      toast.error(`فشل في تفعيل التطبيق: ${error.message || 'خطأ غير محدد'}`);
      return false;
    }
  };

  // إلغاء تفعيل تطبيق - نسخة مبسطة
  const disableApp = async (appId: string): Promise<boolean> => {
    if (!organizationId) {
      toast.error('معرف المنظمة غير متوفر');
      return false;
    }

    try {
      // تحديث الحالة المحلية فوراً
      setOrganizationApps(prev => 
        prev.map(app => 
          app.app_id === appId ? { ...app, is_enabled: false } : app
        )
      );

      // حفظ في قاعدة البيانات
      // @ts-ignore - تجاهل أخطاء TypeScript مؤقتاً
      const { error } = await supabase
        .from('organization_apps')
        .update({ is_enabled: false })
        .eq('organization_id', organizationId)
        .eq('app_id', appId);

      if (error) {
        throw error;
      }

      toast.success('تم إلغاء تفعيل التطبيق بنجاح');
      
      // حفظ في التخزين المحلي - استخدم البيانات المحدثة
      setOrganizationApps(updatedApps => {
        saveToLocalStorage(organizationId, updatedApps);
        return updatedApps;
      });
      
      return true;

    } catch (error: any) {
      // إعادة الحالة في حالة الخطأ
      setOrganizationApps(prev => 
        prev.map(app => 
          app.app_id === appId ? { ...app, is_enabled: true } : app
        )
      );
      
      toast.error(`فشل في إلغاء تفعيل التطبيق: ${error.message || 'خطأ غير محدد'}`);
      return false;
    }
  };

  // التحقق من تفعيل التطبيق
  const isAppEnabled = (appId: string): boolean => {
    const app = organizationApps.find(app => app.app_id === appId);
    const isEnabled = app?.is_enabled || false;
    return isEnabled;
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
             // 🎯 استخدام update مباشر آمن
             // @ts-ignore - جدول organization_apps موجود في قاعدة البيانات وسيتم تحديث Types لاحقاً
             await supabase
               .from('organization_apps')
               .update({ 
                 configuration: config,
                 updated_at: new Date().toISOString()
               })
               .eq('organization_id', organizationId)
               .eq('app_id', appId);
           } catch (dbError) {
             // لا مشكلة، البيانات محفوظة محلياً
           }
         }, 100);
        
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  };

  // إعادة تحميل البيانات - نسخة مبسطة
  const refreshApps = async () => {
    await fetchOrganizationApps();
  };

  // جلب البيانات عند تغيير المنظمة أو عند التشغيل الأولي
  useEffect(() => {
    if (organizationId) {
      console.log('AppsContext: Loading apps for organization:', organizationId);
      // تأخير قليل للسماح بتحميل البيانات المحلية أولاً
      setTimeout(() => {
        fetchOrganizationApps();
      }, 100);
    }
  }, [organizationId]);

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
}

// Hook لاستخدام السياق - تصدير ثابت لـ Fast Refresh
export function useApps(): AppsContextType {
  const context = useContext(AppsContext);
  if (context === undefined) {
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
}

// تصدير واضح لجميع المكونات
export { AppsContext, AVAILABLE_APPS };
export type { AppDefinition, OrganizationApp, AppsContextType };
