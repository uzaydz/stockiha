import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase-unified';
import { useUser } from '@/context/UserContext';
import { toast } from 'sonner';
import { UnifiedRequestManager } from '@/lib/unifiedRequestManager';
import { initializationUtils } from '@/lib/initializationManager';
import { useOptionalSuperUnifiedData } from '@/context/SuperUnifiedDataContext';

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
export const AVAILABLE_APPS: AppDefinition[] = [
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
  },
  {
    id: 'game-downloads',
    name: 'تحميل الألعاب',
    description: 'نظام متكامل لإدارة طلبات تحميل الألعاب وتتبعها',
    icon: 'Gamepad2',
    category: 'خدمات رقمية',
    version: '1.0.0',
    features: [
      'كتالوج شامل للألعاب',
      'نظام طلبات مع رقم تتبع فريد',
      'إدارة حالات الطلبات',
      'واجهة عامة للعملاء',
      'إشعارات تلقائية للعملاء',
      'تقارير وإحصائيات الطلبات',
      'إعدادات مخصصة للمتجر',
      'دعم منصات متعددة (PC, PlayStation, Xbox, Mobile)'
    ],
    permissions: ['manageGameDownloads', 'viewGameOrders', 'manageGameCatalog', 'viewGameReports']
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
  const unifiedData = useOptionalSuperUnifiedData();
  const unifiedRefresh = unifiedData?.refreshData;

  // إضافة تشخيص لمعرفة قيمة organizationId
  useEffect(() => {
  }, [organizationId]);

  // مرجع لتجنب استدعاءات متعددة
  const loadingRef = useRef(false);
  const lastOrgIdRef = useRef<string | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedRef = useRef(false);
  const lastLoadTimeRef = useRef(0);
  const lastUnifiedAppliedRef = useRef<string | null>(null);
  
  // إضافة كاش في sessionStorage لمنع الاستدعاءات المتكررة عند تحديث الصفحة
  const SESSION_CACHE_KEY = 'organization_apps_cache';
  const CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق

  // دالة للحصول من sessionStorage
  const getFromSessionStorage = (orgId: string) => {
    try {
      const cached = sessionStorage.getItem(`${SESSION_CACHE_KEY}_${orgId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.timestamp && parsed.data) {
          const now = Date.now();
          if ((now - parsed.timestamp) < CACHE_DURATION) {
            return parsed.data;
          }
        }
      }
    } catch (error) {
      // تجاهل أخطاء sessionStorage
    }
    return null;
  };

  // دالة للحفظ في sessionStorage
  const saveToSessionStorage = (orgId: string, data: any) => {
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      sessionStorage.setItem(`${SESSION_CACHE_KEY}_${orgId}`, JSON.stringify(cacheData));
    } catch (error) {
      // تجاهل أخطاء sessionStorage
    }
  };

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    if (!unifiedData) {
      return;
    }

    const targetOrgId = unifiedData.organization?.id;
    if (targetOrgId && targetOrgId !== organizationId) {
      return;
    }

    if (unifiedData.isLoading) {
      setIsLoading(true);
      return;
    }

    const unifiedTimestamp = unifiedData.lastFetched ? unifiedData.lastFetched.getTime() : null;
    const unifiedAppsRaw = Array.isArray(unifiedData.organizationApps)
      ? unifiedData.organizationApps
      : [];
    const unifiedSignature = unifiedTimestamp
      ? `ts:${unifiedTimestamp}`
      : `hash:${JSON.stringify(unifiedAppsRaw)}`;
    
    if (
      hasLoadedRef.current &&
      organizationId === lastOrgIdRef.current &&
      lastUnifiedAppliedRef.current === unifiedSignature
    ) {
      return;
    }

    const mappedApps: OrganizationApp[] = unifiedAppsRaw.length > 0
      ? unifiedAppsRaw.map((dbApp: DatabaseOrganizationApp) =>
          transformDatabaseAppToOrganizationApp(dbApp, availableApps)
        )
      : AVAILABLE_APPS.map(app => ({
          id: `default_${app.id}`,
          organization_id: organizationId,
          app_id: app.id,
          is_enabled: false,
          installed_at: new Date().toISOString(),
          configuration: {},
          app
        }));

    setOrganizationApps(mappedApps);
    setIsLoading(false);
    saveToLocalStorage(organizationId, mappedApps);
    saveToSessionStorage(organizationId, mappedApps);
    hasLoadedRef.current = true;
    lastOrgIdRef.current = organizationId;
    lastLoadTimeRef.current = Date.now();
    loadingRef.current = false;
    lastUnifiedAppliedRef.current = unifiedSignature;

    if (!initializationUtils.isAlreadyInitialized(organizationId)) {
      initializationUtils.finishInitialization(organizationId);
    }
  }, [
    organizationId,
    unifiedData?.organization?.id,
    unifiedData?.organizationApps,
    unifiedData?.isLoading,
    unifiedData?.lastFetched,
    availableApps,
  ]);

// جلب التطبيقات - نسخة محسنة مع منع الاستدعاءات المكررة
const fetchOrganizationApps = useCallback(async () => {
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

    // التحقق من initializationManager أولاً
    if (!initializationUtils.shouldInitialize(organizationId)) {
      return; // لا نحتاج للتحميل
    }

    // منع التحميل المتكرر
    const now = Date.now();
    if (loadingRef.current ||
        (hasLoadedRef.current && (now - lastLoadTimeRef.current) < 10000) || // 10 ثواني
        organizationId === lastOrgIdRef.current) {
      return;
    }

    try {
      loadingRef.current = true;
      lastOrgIdRef.current = organizationId;
      hasLoadedRef.current = true;
      lastLoadTimeRef.current = now;

      // التحقق من sessionStorage أولاً
      const sessionCached = getFromSessionStorage(organizationId);
      if (sessionCached && sessionCached.length > 0) {
        setOrganizationApps(sessionCached);
        setIsLoading(false);
        return;
      }

      // تحميل البيانات المحلية أولاً
      const cachedApps = loadFromLocalStorage(organizationId);
      if (cachedApps.length > 0) {
        setOrganizationApps(cachedApps);
        setIsLoading(false);
        // حفظ في sessionStorage أيضاً
        saveToSessionStorage(organizationId, cachedApps);
      } else {
        setIsLoading(true);
      }

      // محاولة جلب البيانات من قاعدة البيانات
      const { data, error } = await (supabase as any)
        .from('organization_apps')
        .select('*')
        .eq('organization_id', organizationId);

      let organizationAppsData: any[] = [];
      
      // إذا نجح الاستعلام واسترجعنا بيانات
      if (!error && data) {
        organizationAppsData = data;
      } else {
        // استخدام البيانات المحلية إذا كانت متوفرة
        if (cachedApps.length > 0) {
          return;
        }
      }

      // إنشاء قائمة شاملة للتطبيقات - مع الحفاظ على البيانات المحلية المفعلة
      const localApps = loadFromLocalStorage(organizationId);
      
      const allApps: OrganizationApp[] = AVAILABLE_APPS.map(app => {
        const existingApp = organizationAppsData.find(item => item.app_id === app.id);
        const localApp = localApps.find(item => item.app_id === app.id);
        
        // أولوية لبيانات قاعدة البيانات دائماً
        const isEnabledFromDB = existingApp ? Boolean(existingApp.is_enabled) : false;
        const isEnabledFromLocal = localApp ? Boolean(localApp.is_enabled) : false;
        
        // التشخيص المفصل للـ repair-services
        if (app.id === 'repair-services') {
        }
        
        // في حالة repair-services، نعطي أولوية لقاعدة البيانات
        const finalIsEnabled = app.id === 'repair-services' 
          ? isEnabledFromDB || isEnabledFromLocal 
          : isEnabledFromLocal || isEnabledFromDB;

        return {
          id: existingApp?.id || `default_${app.id}`,
          organization_id: organizationId,
          app_id: app.id,
          is_enabled: finalIsEnabled,
          installed_at: existingApp?.installed_at || new Date().toISOString(),
          configuration: localApp?.configuration || existingApp?.configuration || {},
          app: app
        };
      });

      // إضافة helper function في dev mode لمسح localStorage
      if (import.meta.env.DEV) {
        (window as any).clearAppsLocalStorage = () => {
          localStorage.removeItem(`${LOCAL_STORAGE_KEY}_${organizationId}`);
          try {
            sessionStorage.removeItem(`${SESSION_CACHE_KEY}_${organizationId}`);
          } catch (error) {
            // تجاهل أخطاء sessionStorage
          }
          window.location.reload();
        };
      }

      setOrganizationApps(allApps);
      saveToLocalStorage(organizationId, allApps);
      // حفظ في sessionStorage
      saveToSessionStorage(organizationId, allApps);

    } catch (error) {
      // في حالة الخطأ، استخدم البيانات المحلية أو قائمة افتراضية
      const localData = loadFromLocalStorage(organizationId);
      if (localData.length > 0) {
        setOrganizationApps(localData);
        // حفظ في sessionStorage
        saveToSessionStorage(organizationId, localData);
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
        // حفظ في sessionStorage
        saveToSessionStorage(organizationId, defaultApps);
      }
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
      // إنهاء عملية التحميل
      initializationUtils.finishInitialization(organizationId);
    }
  }, [organizationId]);

  // useEffect موحد ومحسن مع منع الاستدعاءات المتكررة
  useEffect(() => {
    // تحقق إذا كانت المؤسسة الجديدة مختلفة
    if (!organizationId || organizationId === lastOrgIdRef.current) {
      return;
    }

    // تحقق من وجود بيانات في sessionStorage أولاً
    const sessionKey = `${SESSION_CACHE_KEY}_${organizationId}`;
    const cached = sessionStorage.getItem(sessionKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const now = Date.now();
        if (parsed.timestamp && (now - parsed.timestamp) < CACHE_DURATION) {
          // استخدم البيانات المحفوظة مباشرة بدون استدعاء API
          setOrganizationApps(parsed.data);
          setIsLoading(false);
          lastOrgIdRef.current = organizationId;
          return;
        }
      } catch (error) {
        // تجاهل أخطاء التحليل
      }
    }

    // تنظيف المراجع عند تغيير المنظمة
    loadingRef.current = false;
    hasLoadedRef.current = false;

    // إلغاء أي timeout سابق
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    // تحميل فوري للبيانات مع تأخير صغير
    fetchTimeoutRef.current = setTimeout(() => {
      fetchOrganizationApps();
    }, 100); // زيادة التأخير قليلاً لمنع الاستدعاءات المتكررة

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [organizationId]); // إزالة fetchOrganizationApps من dependencies لمنع إعادة التشغيل

  // دالة لإنشاء الإعدادات الافتراضية لتطبيق الألعاب
  const createGameDownloadsDefaultSettings = async (organizationId: string, organizationName: string, subdomain: string) => {
    try {
      const defaultSettings = {
        organization_id: organizationId,
        business_name: `${organizationName} - متجر الألعاب`,
        welcome_message: 'مرحباً بكم في متجر الألعاب الإلكترونية! نوفر لكم أحدث الألعاب بأفضل الأسعار.',
        terms_conditions: 'شروط وأحكام الخدمة: 1. يجب دفع المبلغ كاملاً قبل التحميل 2. لا يمكن استرداد المبلغ بعد التحميل 3. الألعاب للاستخدام الشخصي فقط',
        contact_info: { phone: '', whatsapp: '', email: '', address: '' },
        social_links: { facebook: '', instagram: '', twitter: '' },
        order_prefix: subdomain ? subdomain.substring(0, 2).toUpperCase() : 'GD',
        auto_assign_orders: false,
        notification_settings: { email_notifications: true, sms_notifications: false },
        working_hours: {
          saturday: { open: '09:00', close: '18:00', closed: false },
          sunday: { open: '09:00', close: '18:00', closed: false },
          monday: { open: '09:00', close: '18:00', closed: false },
          tuesday: { open: '09:00', close: '18:00', closed: false },
          wednesday: { open: '09:00', close: '18:00', closed: false },
          thursday: { open: '09:00', close: '18:00', closed: false },
          friday: { open: '09:00', close: '18:00', closed: true }
        },
        is_active: true
      };

      const { error } = await (supabase as any)
        .from('game_downloads_settings')
        .insert([defaultSettings]);

      if (error) {
        throw error;
      }

    } catch (error) {
      throw error;
    }
  };

  // تفعيل تطبيق - نسخة محسنة مع إنشاء الإعدادات الافتراضية
  const enableApp = useCallback(async (appId: string): Promise<boolean> => {
    
    if (!organizationId) {
      toast.error('معرف المنظمة غير متوفر');
      return false;
    }

    const appDefinition = availableApps.find(app => app.id === appId);
    if (!appDefinition) {
      toast.error('التطبيق المطلوب غير متوفر');
      return false;
    }

    // التحقق من الصلاحيات المطلوبة للتطبيق
    if (appDefinition.permissions && appDefinition.permissions.length > 0) {
      
      // الحصول على بيانات المستخدم الحالي
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('المستخدم غير متوفر');
        return false;
      }

      // الحصول على ملف المستخدم
      const { data: userProfile } = await supabase
        .from('users')
        .select('role, permissions')
        .eq('auth_user_id', user.id)
        .eq('organization_id', organizationId)
        .maybeSingle();

      // التحقق من الصلاحيات
      const hasRequiredPermissions = appDefinition.permissions.some(permission => {
        // فحص الأدوار الإدارية
        if (['admin', 'owner', 'org_admin', 'super_admin'].includes(userProfile?.role || '')) {
          return true;
        }

        // فحص الصلاحيات المحددة
        const hasPermission = userProfile?.permissions?.[permission] === true;
        return hasPermission;
      });

      if (!hasRequiredPermissions) {
        toast.error(`لا يمكن تفعيل ${appDefinition.name} - الصلاحيات غير كافية`);
        return false;
      }

    }

    // التحقق من صلاحيات خطة الاشتراك
    try {
      
      // الحصول على خطة الاشتراك الحالية للمؤسسة
      // @ts-ignore - جداول organization_subscriptions و subscription_plans موجودة في قاعدة البيانات
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('organization_subscriptions')
        .select(`
          id,
          plan_id,
          status,
          subscription_plans!inner(
            id,
            code,
            name,
            permissions
          )
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .maybeSingle();

      if (subscriptionError) {
        toast.error('خطأ في التحقق من خطة الاشتراك');
        return false;
      }

      if (!subscriptionData) {
        toast.error('لا توجد خطة اشتراك نشطة');
        return false;
      }

      const plan = subscriptionData.subscription_plans;

      // التحقق من أن خطة الاشتراك تتضمن الصلاحيات المطلوبة للتطبيق
      if (appDefinition.permissions && appDefinition.permissions.length > 0) {
        const planPermissions = (plan as any).permissions || {};

        const planHasRequiredPermissions = appDefinition.permissions.some(permission => {
          const hasPermission = planPermissions[permission] === true;
          return hasPermission;
        });

        if (!planHasRequiredPermissions) {
          toast.error(`لا يمكن تفعيل ${appDefinition.name} - خطة الاشتراك الحالية لا تتضمن الصلاحيات المطلوبة`);
          return false;
        }

      }
    } catch (subscriptionCheckError) {
      toast.error('خطأ في التحقق من صلاحيات خطة الاشتراك');
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
      const { error } = await (supabase as any)
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

      // إنشاء الإعدادات الافتراضية للتطبيقات التي تحتاجها
      if (appId === 'game-downloads') {
        try {
          // الحصول على معلومات المؤسسة
          const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .select('name, subdomain')
            .eq('id', organizationId)
            .single();

          if (orgError) {
          }

          // التحقق من عدم وجود إعدادات مسبقة
          const { data: existingSettings, error: checkError } = await (supabase as any)
            .from('game_downloads_settings')
            .select('id')
            .eq('organization_id', organizationId)
            .single();

          if (checkError && checkError.code === 'PGRST116') {
            // لا توجد إعدادات، إنشاء إعدادات افتراضية
            await createGameDownloadsDefaultSettings(
              organizationId,
              orgData?.name || 'متجر الألعاب',
              orgData?.subdomain || ''
            );
          }
        } catch (settingsError) {
          // لا نريد إيقاف تفعيل التطبيق بسبب فشل إنشاء الإعدادات
        }
      }

      toast.success(`تم تفعيل تطبيق ${appDefinition.name} بنجاح`);
      
      // حفظ في التخزين المحلي - استخدم البيانات المحدثة
      setOrganizationApps(updatedApps => {
        saveToLocalStorage(organizationId, updatedApps);
        // حفظ في sessionStorage أيضاً للتحديث الفوري
        saveToSessionStorage(organizationId, updatedApps);
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
  }, [organizationId, availableApps]);

  // إلغاء تفعيل تطبيق - نسخة محسنة
  const disableApp = useCallback(async (appId: string): Promise<boolean> => {
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
      const { error } = await (supabase as any)
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
        // حفظ في sessionStorage أيضاً للتحديث الفوري
        saveToSessionStorage(organizationId, updatedApps);
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
  }, [organizationId]);

  // التحقق من تفعيل التطبيق - محسن مع memoization وlogging محدود
  const isAppEnabled = useCallback((appId: string): boolean => {
    const app = organizationApps.find(app => app.app_id === appId);
    return app ? app.is_enabled : false;
  }, [organizationApps]);

  // تحسين getAppConfig مع memoization
  const getAppConfig = useCallback((appId: string): Record<string, any> | null => {
    const app = organizationApps.find(app => app.app_id === appId);
    return app?.configuration || null;
  }, [organizationApps]);

  // تحديث إعدادات التطبيق - نسخة محسنة وآمنة
  const updateAppConfig = useCallback(async (appId: string, config: Record<string, any>): Promise<boolean> => {
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
            await (supabase as any)
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
  }, [organizationId, organizationApps]);

  // إعادة تحميل البيانات - نسخة مبسطة ومحسنة
  const refreshApps = useCallback(async () => {
    // إعادة تعيين المراجع للسماح بإعادة التحميل
    loadingRef.current = false;
    lastOrgIdRef.current = null;
    lastUnifiedAppliedRef.current = null;
    if (organizationId) {
      initializationUtils.resetOnError(organizationId);
    }

    if (typeof unifiedRefresh === 'function') {
      await unifiedRefresh();
      return;
    }

    await fetchOrganizationApps();
  }, [fetchOrganizationApps, unifiedRefresh, organizationId]);

  // إنشاء قيمة السياق مع memoization
  const value = useMemo<AppsContextType>(() => ({
    availableApps,
    organizationApps,
    isLoading,
    enableApp,
    disableApp,
    isAppEnabled,
    getAppConfig,
    updateAppConfig,
    refreshApps
  }), [
    availableApps,
    organizationApps,
    isLoading,
    enableApp,
    disableApp,
    isAppEnabled,
    getAppConfig,
    updateAppConfig,
    refreshApps
  ]);

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

// AVAILABLE_APPS مُصدر بالفعل في السطر 67 
