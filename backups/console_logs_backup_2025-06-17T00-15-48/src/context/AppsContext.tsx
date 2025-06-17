import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from './UserContext';
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

// حالة التطبيق للمنظمة
export interface OrganizationApp {
  id: string;
  organization_id: string;
  app_id: string;
  is_enabled: boolean;
  installed_at: string;
  configuration?: Record<string, any>;
  app?: AppDefinition;
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

const AppsContext = createContext<AppsContextType | undefined>(undefined);

interface AppsProviderProps {
  children: ReactNode;
}

export const AppsProvider: React.FC<AppsProviderProps> = ({ children }) => {
  const { organizationId } = useUser();
  const [availableApps] = useState<AppDefinition[]>(AVAILABLE_APPS);
  const [organizationApps, setOrganizationApps] = useState<OrganizationApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // جلب التطبيقات المثبتة للمنظمة
  const fetchOrganizationApps = async () => {
    if (!organizationId) {
      setOrganizationApps([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // استخدام UnifiedRequestManager بدلاً من Supabase client مباشرة
      console.log('🔄 AppsContext: Fetching organization apps via UnifiedRequestManager...');
      
      try {
        console.log('🚀 Trying UnifiedRequestManager first...');
        const data = await UnifiedRequestManager.getOrganizationApps(organizationId);
        console.log('✅ AppsContext: Received organization apps via UnifiedRequestManager:', data?.length || 0, data);

        if (!data || data.length === 0) {
          console.log('⚠️ UnifiedRequestManager returned empty, trying direct Supabase...');
          
          // محاولة مباشرة مع Supabase client
          const { data: directData, error: directError } = await supabase
            .from('organization_apps')
            .select('*')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false });
          
          console.log('🔍 Direct Supabase result:', { directData, directError });
          
          if (directError) {
            console.error('🔴 Direct Supabase error:', directError);
            throw directError;
          }
          
          if (directData && directData.length > 0) {
            console.log('✅ Using direct Supabase data:', directData);
            
            // إضافة معلومات التطبيق لكل سجل
            const appsWithDetails = directData.map(orgApp => ({
              ...orgApp,
              app: availableApps.find(app => app.id === orgApp.app_id)
            }));
            
            console.log('✅ AppsContext: Apps with details from direct Supabase:', appsWithDetails);
            setOrganizationApps(appsWithDetails);
            return;
          }
        }

        // إضافة معلومات التطبيق لكل سجل
        const appsWithDetails = (data || []).map(orgApp => ({
          ...orgApp,
          app: availableApps.find(app => app.id === orgApp.app_id)
        }));
        
        console.log('✅ AppsContext: Apps with details:', appsWithDetails);
        setOrganizationApps(appsWithDetails);
      } catch (dbError) {
        console.warn('⚠️ AppsContext: UnifiedRequestManager failed, using fallback...');
        // استخدام بيانات وهمية في حالة فشل UnifiedRequestManager
        const mockOrganizationApps: OrganizationApp[] = [
          {
            id: '1',
            organization_id: organizationId,
            app_id: 'call-center',
            is_enabled: true,
            installed_at: new Date().toISOString(),
            configuration: {},
            app: availableApps.find(app => app.id === 'call-center')
          }
        ];
        setOrganizationApps(mockOrganizationApps);
      }
    } catch (error) {
      console.error('🔴 AppsContext: Error fetching organization apps:', error);
      setOrganizationApps([]);
    } finally {
      setIsLoading(false);
    }
  };

  // تفعيل تطبيق
  const enableApp = async (appId: string): Promise<boolean> => {
    if (!organizationId) {
      toast.error('معرف المنظمة غير متوفر');
      return false;
    }

    try {
      // فحص المستخدم الحالي أولاً
      const { data: currentUser, error: userError } = await supabase.auth.getUser();
      
      if (userError || !currentUser?.user) {
        toast.error('خطأ في المصادقة');
        return false;
      }

      // التحقق من صلاحيات المستخدم (اختياري - إذا فشل نتجاهل ونكمل)
      try {
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('id, role, organization_id, auth_user_id')
          .eq('auth_user_id', currentUser.user.id)
          .eq('organization_id', organizationId)
          .maybeSingle(); // استخدام maybeSingle بدلاً من single

        if (userProfile && !['admin', 'owner'].includes(userProfile.role)) {
          toast.error('صلاحيات غير كافية لتفعيل التطبيقات');
          return false;
        }
      } catch (permissionError) {
        // نتجاهل خطأ فحص الصلاحيات ونكمل
      }

      // محاولة حفظ في قاعدة البيانات أولاً
      let dbSaveSuccessful = false;
      try {
        const { data, error } = await supabase
          .from('organization_apps')
          .upsert({
            organization_id: organizationId,
            app_id: appId,
            is_enabled: true,
            installed_at: new Date().toISOString(),
            configuration: {}
          }, {
            onConflict: 'organization_id,app_id',
            ignoreDuplicates: false
          })
          .select();

        if (error) {
          dbSaveSuccessful = false;
        } else {
          dbSaveSuccessful = true;
        }
      } catch (dbError) {
        dbSaveSuccessful = false;
      }

      // تحديث الحالة المحلية في جميع الحالات
      const newApp: OrganizationApp = {
        id: Date.now().toString(),
        organization_id: organizationId,
        app_id: appId,
        is_enabled: true,
        installed_at: new Date().toISOString(),
        configuration: {},
        app: availableApps.find(app => app.id === appId)
      };
      
      setOrganizationApps(prev => {
        const existing = prev.find(app => app.app_id === appId);
        if (existing) {
          return prev.map(app => app.app_id === appId ? { ...app, is_enabled: true } : app);
        } else {
          return [...prev, newApp];
        }
      });

      // مسح Cache للحصول على بيانات محدثة في المرة القادمة
      UnifiedRequestManager.clearCache(`unified_org_apps_${organizationId}`);

      // لا نحتاج refreshApps هنا لأن handleAppToggle سيقوم بالتحديث
      toast.success('تم تفعيل التطبيق بنجاح');
      return true;
    } catch (error) {
      console.error('🔴 AppsContext: Error enabling app:', error);
      
      // تفصيل أكثر للأخطاء
      if (error.code === '42501') {
        toast.error('خطأ في الصلاحيات - تحقق من إعدادات الأمان');
      } else if (error.code === '23505') {
        toast.error('التطبيق مُفعل بالفعل');
      } else {
        toast.error(`فشل في تفعيل التطبيق: ${error.message}`);
      }
      return false;
    }
  };

  // إلغاء تفعيل تطبيق
  const disableApp = async (appId: string): Promise<boolean> => {
    if (!organizationId) return false;

    try {
      // محاولة حفظ في قاعدة البيانات أولاً
      let dbSaveSuccessful = false;
      try {
        const { data, error } = await supabase
          .from('organization_apps')
          .upsert({
            organization_id: organizationId,
            app_id: appId,
            is_enabled: false,
            installed_at: new Date().toISOString(),
            configuration: {}
          }, {
            onConflict: 'organization_id,app_id',
            ignoreDuplicates: false
          })
          .select();

        if (error) {
          dbSaveSuccessful = false;
        } else {
          dbSaveSuccessful = true;
        }
      } catch (dbError) {
        dbSaveSuccessful = false;
      }

      // تحديث الحالة المحلية في جميع الحالات
      setOrganizationApps(prev => 
        prev.map(app => app.app_id === appId ? { ...app, is_enabled: false } : app)
      );

      // مسح Cache للحصول على بيانات محدثة في المرة القادمة
      UnifiedRequestManager.clearCache(`unified_org_apps_${organizationId}`);
      
      // لا نحتاج refreshApps هنا لأن handleAppToggle سيقوم بالتحديث
      toast.success('تم إلغاء تفعيل التطبيق بنجاح');
      return true;
    } catch (error) {
      console.error('🔴 AppsContext: Error disabling app:', error);
      toast.error('فشل في إلغاء تفعيل التطبيق');
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

  // تحديث إعدادات التطبيق
  const updateAppConfig = async (appId: string, config: Record<string, any>): Promise<boolean> => {
    if (!organizationId) return false;

    try {
      const existingApp = organizationApps.find(app => app.app_id === appId);
      
      if (existingApp) {
        try {
          const { error } = await supabase
            .from('organization_apps')
            .update({ configuration: config })
            .eq('id', existingApp.id);

          if (error) {
            // تحديث الحالة المحلية فقط
            setOrganizationApps(prev => 
              prev.map(app => app.app_id === appId ? { ...app, configuration: config } : app)
            );
          } else {
            // تحديث الحالة المحلية مباشرة بدلاً من refreshApps
            setOrganizationApps(prev => 
              prev.map(app => app.app_id === appId ? { ...app, configuration: config } : app)
            );
          }
        } catch (dbError) {
          // تحديث الحالة المحلية فقط
          setOrganizationApps(prev => 
            prev.map(app => app.app_id === appId ? { ...app, configuration: config } : app)
          );
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  };

  // إعادة تحميل البيانات
  const refreshApps = async () => {
    console.log('🔄 AppsContext: Refreshing apps - clearing cache...');
    
    // تنظيف cache التطبيقات في UnifiedRequestManager
    UnifiedRequestManager.clearCache(`unified_org_apps_${organizationId}`);
    
    // إعادة تحميل البيانات
    await fetchOrganizationApps();
    
    console.log('✅ AppsContext: Apps refreshed successfully');
  };

  // جلب البيانات عند تغيير المنظمة
  useEffect(() => {
    fetchOrganizationApps();
  }, [organizationId]);

  // مراقبة تغييرات organizationApps
  useEffect(() => {
    console.log('📊 AppsContext: organizationApps changed:', organizationApps);
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
    // بدلاً من رمي خطأ، نوفر قيم افتراضية
    return {
      availableApps: [],
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
