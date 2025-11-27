// ================================================================
// 🚀 SuperUnifiedDataContext - الحل النهائي لمشكلة الاستدعاءات المكررة  
// يجلب جميع البيانات في استدعاء واحد فقط بدلاً من 40+ استدعاء
// ================================================================

import React, { createContext, useContext, useMemo, useEffect, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { useTenant } from './TenantContext';
import { useAppInitialization } from './AppInitializationContext';
import { supabase } from '@/lib/supabase';
import { deltaWriteService } from '@/services/DeltaWriteService';
import type { LocalProduct, LocalCustomer, LocalPOSOrder, LocalInvoice } from '@/database/localDb';
import { saveRemoteOrders, saveRemoteOrderItems } from '@/api/localPosOrderService';
import { saveRemoteInvoices, saveRemoteInvoiceItems } from '@/api/localInvoiceService';

// ================================================================
// 📋 أنواع البيانات الموحدة
// ================================================================

interface GlobalData {
  organization: any;
  user: any;
  settings: {
    organization_settings: any;
    pos_settings: any;
  };
  products: any[];
  categories: {
    product_categories: any[];
    subscription_categories: any[];
    subscription_services: any[];
  };
  customers_and_users: {
    customers: any[];
    users: any[];
  };
  apps_and_subscription: {
    organization_apps: any[];
    active_subscription: any[];
  };
  stats: {
    pos_order_stats: any;
    sales_summary: any;
    inventory_status: any;
    total_expenses: any;
  };
  orders: {
    recent_orders: any[];
    recent_online_orders: any[];
  };
  invoices: {
    recent_invoices: any[];
  };
  additional_data: {
    provinces_global: any[];
    top_categories: any;
    top_products: any;
    visitor_analytics?: any;
    online_order_analytics?: any;
  };
  fetched_at: string;
  organization_id: string;
}

// أنواع البيانات للـ Context
interface SuperUnifiedDataContextType {
  // البيانات المجمعة
  globalData: GlobalData | null;

  // حالات التحميل والأخطاء
  isLoading: boolean;
  error: string | null;

  // دوال التحديث
  refreshData: () => void;
  invalidateData: () => void;

  // بيانات مباشرة للسهولة
  organization: any;
  currentUser: any;
  organizationSettings: any;
  posSettings: any;
  products: any[];
  productCategories: any[];
  subscriptionServices: any[];
  customers: any[];
  users: any[];
  organizationApps: any[];
  activeSubscription: any;
  recentOrders: any[];
  recentOnlineOrders: any[];
  recentInvoices: any[];
  dashboardStats: any;
  provincesGlobal: any[];

  // معلومات إضافية
  lastFetched: Date | null;
  isFresh: boolean;
}

// ================================================================
// 🎯 إنشاء Context
// ================================================================

export const SuperUnifiedDataContext = createContext<SuperUnifiedDataContextType | undefined>(undefined);

// ================================================================
// 🔧 دالة جلب البيانات الموحدة
// ================================================================

// إضافة كاش محسن للبيانات الموحدة
const globalDataCache = new Map<string, { data: GlobalData; timestamp: number }>();
const CACHE_DURATION = 15 * 60 * 1000; // 15 دقيقة للبيانات الموحدة
const SESSION_CACHE_KEY = 'global_data_cache';

// دالة للحصول من sessionStorage
const getFromSessionStorage = (cacheKey: string) => {
  try {
    const cached = sessionStorage.getItem(`${SESSION_CACHE_KEY}_${cacheKey}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.timestamp && parsed.data) {
        return parsed;
      }
    }
  } catch (error) {
    // تجاهل أخطاء sessionStorage
  }
  return null;
};

// دالة للحفظ في sessionStorage
const saveToSessionStorage = (cacheKey: string, data: GlobalData, timestamp: number) => {
  try {
    const cacheData = {
      data,
      timestamp
    };
    sessionStorage.setItem(`${SESSION_CACHE_KEY}_${cacheKey}`, JSON.stringify(cacheData));
  } catch (error) {
    // تجاهل أخطاء sessionStorage
  }
};

// ✅ دالة محدثة تستخدم AppInitializationContext + بيانات إضافية فقط
const fetchGlobalData = async (
  organizationId: string,
  userId?: string,
  baseData?: any // البيانات الأساسية من AppInitializationContext
): Promise<GlobalData> => {
  try {
    console.log('🔄 [SuperUnified] بدء جلب البيانات...');

    // التحقق من sessionStorage أولاً
    const cacheKey = `global_data_${organizationId}_${userId || 'no_user'}`;
    const sessionCached = getFromSessionStorage(cacheKey);
    const now = Date.now();

    if (sessionCached && (now - sessionCached.timestamp) < CACHE_DURATION) {
      console.log('✅ [SuperUnified] استخدام البيانات من sessionStorage');
      return sessionCached.data;
    }

    // التحقق من كاش الذاكرة
    const cached = globalDataCache.get(cacheKey);
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      console.log('✅ [SuperUnified] استخدام البيانات من memory cache');
      saveToSessionStorage(cacheKey, cached.data, now);
      return cached.data;
    }

    // ✅ استخدام البيانات الأساسية من AppInitializationContext إذا كانت متوفرة
    if (baseData) {
      console.log('✅ [SuperUnified] استخدام البيانات الأساسية من AppInitializationContext');
    }

    // التحقق من الاتصال بـ Supabase
    if (!supabase) {
      throw new Error('Supabase client غير متوفر');
    }

    // ⚡ جلب البيانات الإضافية فقط (products, orders, stats, provinces)
    console.log('🚀 [SuperUnified] جلب البيانات الإضافية من get_global_data_complete...');

    try {
      const { data, error } = await (supabase as any).rpc('get_global_data_complete', {
        p_organization_id: organizationId,
        p_user_id: userId
      });

      if (error) throw error;
      if (!data) throw new Error('لم يتم العثور على بيانات');

      const result = Array.isArray(data) ? data[0] : data;

      // ✅ دمج البيانات من AppInitializationContext مع البيانات الإضافية
      const globalData: GlobalData = {
        // استخدام البيانات الأساسية من baseData إذا كانت متوفرة
        organization: baseData?.organization || result.organization || null,
        user: baseData?.user || result.user || null,
        settings: {
          organization_settings: baseData?.organization_settings || result.settings?.organization_settings || null,
          pos_settings: baseData?.pos_settings || result.settings?.pos_settings || null,
        },
        products: result.products || [],
        categories: {
          product_categories: baseData?.categories || result.categories?.product_categories || [],
          subscription_categories: result.categories?.subscription_categories || [],
          subscription_services: result.categories?.subscription_services || [],
        },
        customers_and_users: {
          customers: result.customers_and_users?.customers || [],
          users: baseData?.employees || result.customers_and_users?.users || [],
        },
        apps_and_subscription: {
          organization_apps: result.apps_and_subscription?.organization_apps || [],
          active_subscription: result.apps_and_subscription?.active_subscription || [],
        },
        stats: {
          pos_order_stats: result.stats?.order_stats || null,
          sales_summary: result.stats?.order_stats || null,
          inventory_status: result.stats?.inventory_summary || null,
          total_expenses: result.total_expenses || null,
        },
        orders: {
          recent_orders: result.orders?.recent_orders || [],
          recent_online_orders: result.orders?.recent_online_orders || [],
        },
        invoices: {
          recent_invoices: result.invoices?.recent_invoices || [],
        },
        additional_data: {
          provinces_global: result.additional_data?.provinces_global || [],
          top_categories: result.additional_data?.top_selling_products || null,
          top_products: result.additional_data?.top_selling_products || null,
          visitor_analytics: result.additional_data?.visitor_analytics || null,
          online_order_analytics: result.additional_data?.online_order_analytics || null,
        },
        fetched_at: new Date().toISOString(),
        organization_id: organizationId,
      };

      // حفظ في كاش الذاكرة
      globalDataCache.set(cacheKey, {
        data: globalData,
        timestamp: now
      });

      // حفظ في sessionStorage
      saveToSessionStorage(cacheKey, globalData, now);

      return globalData;

    } catch (rpcError: any) {
      console.warn('[SuperUnified] ⚠️ فشل الاتصال بالسيرفر، محاولة التحميل من قاعدة البيانات المحلية...', rpcError);

      // ⚡ محاولة التحميل من Delta Sync
      try {
        // ⚡ استخدام Delta Sync للجلب من قاعدة البيانات المحلية
        const [
          localProducts,
          localCustomers,
          localOrders,
          localInvoices
        ] = await Promise.all([
          deltaWriteService.getAll<LocalProduct>('products', organizationId),
          deltaWriteService.getAll<LocalCustomer>('customers', organizationId),
          deltaWriteService.getAll<LocalPOSOrder>('pos_orders', organizationId).then(orders => orders.slice(0, 50)),
          deltaWriteService.getAll<LocalInvoice>('invoices', organizationId).then(invoices => invoices.slice(0, 20))
        ]);

        // بناء كائن GlobalData من البيانات المحلية
        const localGlobalData: GlobalData = {
          organization: baseData?.organization || null,
          user: baseData?.user || null,
          settings: {
            organization_settings: baseData?.organization_settings || null,
            pos_settings: baseData?.pos_settings || null,
          },
          products: localProducts || [],
          categories: {
            product_categories: baseData?.categories || [],
            subscription_categories: [],
            subscription_services: [],
          },
          customers_and_users: {
            customers: localCustomers || [],
            users: baseData?.employees || [],
          },
          apps_and_subscription: {
            organization_apps: [],
            active_subscription: [],
          },
          stats: {
            pos_order_stats: null,
            sales_summary: null,
            inventory_status: null,
            total_expenses: null,
          },
          orders: {
            recent_orders: localOrders || [],
            recent_online_orders: [],
          },
          invoices: {
            recent_invoices: localInvoices || [],
          },
          additional_data: {
            provinces_global: [],
            top_categories: null,
            top_products: null,
          },
          fetched_at: new Date().toISOString(),
          organization_id: organizationId,
        };

        console.log('✅ [SuperUnified] تم تحميل البيانات من SQLite بنجاح', {
          products: localProducts.length,
          customers: localCustomers.length,
          orders: localOrders.length
        });

        return localGlobalData;

      } catch (dbError) {
        console.error('[SuperUnified] ❌ فشل التحميل من قاعدة البيانات المحلية:', dbError);
        throw rpcError; // رمي الخطأ الأصلي إذا فشل الفالباك
      }
    }

  } catch (error) {
    throw error;
  }
};

// ================================================================
// 📱 مكون Provider
// ================================================================

interface SuperUnifiedDataProviderProps {
  children: ReactNode;
}

export const SuperUnifiedDataProvider: React.FC<SuperUnifiedDataProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const { currentOrganization } = useTenant();
  const queryClient = useQueryClient();

  // ✅ استخدام البيانات من AppInitializationContext
  const appInitData = useAppInitialization();

  const organizationId = currentOrganization?.id;

  // مدة انتعاش البيانات (5 دقائق)
  const staleTime = 5 * 60 * 1000;

  // ✅ تمرير البيانات الأساسية من AppInitializationContext
  const baseData = useMemo(() => {
    if (!appInitData.data) return null;
    return {
      user: appInitData.user,
      organization: appInitData.organization,
      organization_settings: appInitData.organizationSettings,
      pos_settings: appInitData.posSettings,
      categories: appInitData.categories,
      employees: appInitData.employees,
    };
  }, [appInitData.data]);

  // جلب البيانات باستخدام React Query مع إعدادات محسنة
  const {
    data: globalData,
    isLoading,
    error,
    refetch: refreshData
  } = useQuery({
    queryKey: ['global-data', organizationId, user?.id, baseData],
    queryFn: () => fetchGlobalData(organizationId!, user?.id, baseData),
    enabled: !!organizationId && !!baseData, // انتظار البيانات الأساسية
    staleTime,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: (failureCount, error) => {
      // عدم إعادة المحاولة في حالة أخطاء الشبكة المستمرة
      if (error?.message?.includes('Failed to fetch') && failureCount >= 2) {
        return false;
      }
      // إعادة المحاولة حتى 3 مرات للأخطاء الأخرى
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // تأخير متزايد
  });

  // دالة لإلغاء صحة البيانات وإعادة التحميل
  const invalidateData = () => {
    queryClient.invalidateQueries({
      queryKey: ['global-data']
    });
  };

  // استخلاص البيانات للوصول المباشر
  const organization = globalData?.organization || null;
  const currentUser = globalData?.user || null;
  const organizationSettings = globalData?.settings?.organization_settings || null;
  const posSettings = globalData?.settings?.pos_settings || null;
  const products = globalData?.products || [];
  const productCategories = globalData?.categories?.product_categories || [];
  const subscriptionServices = globalData?.categories?.subscription_services || [];
  const customers = globalData?.customers_and_users?.customers || [];
  const users = globalData?.customers_and_users?.users || [];
  const organizationApps = globalData?.apps_and_subscription?.organization_apps || [];
  const activeSubscription = globalData?.apps_and_subscription?.active_subscription?.[0] || null;
  const recentOrders = globalData?.orders?.recent_orders || [];
  const recentOnlineOrders = globalData?.orders?.recent_online_orders || [];
  const recentInvoices = globalData?.invoices?.recent_invoices || [];
  // تحويل البيانات الإحصائية إلى الشكل المطلوب من StatsGrid
  const dashboardStats = useMemo(() => {
    if (!globalData?.stats) return null;

    const stats = globalData.stats;

    // استخدام البيانات الفعلية من الطلبات الحديثة
    const recentOrdersRevenue = globalData.orders?.recent_orders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
    const recentOnlineOrdersRevenue = globalData.orders?.recent_online_orders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
    const totalRevenue = recentOrdersRevenue + recentOnlineOrdersRevenue;

    const totalOrders = (globalData.orders?.recent_orders?.length || 0) +
      (globalData.orders?.recent_online_orders?.length || 0);

    // حساب الطلبات حسب الحالة من البيانات الفعلية
    const pendingOrders = globalData.orders?.recent_orders?.filter(order => order.status === 'pending')?.length || 0;
    const processingOrders = globalData.orders?.recent_orders?.filter(order => order.status === 'processing')?.length || 0;
    const completedOrders = globalData.orders?.recent_orders?.filter(order => order.status === 'completed')?.length || 0;

    // إضافة الطلبات الأونلاين
    const onlinePendingOrders = globalData.orders?.recent_online_orders?.filter(order => order.status === 'pending')?.length || 0;
    const onlineProcessingOrders = globalData.orders?.recent_online_orders?.filter(order => order.status === 'processing')?.length || 0;
    const onlineCompletedOrders = globalData.orders?.recent_online_orders?.filter(order => order.status === 'delivered')?.length || 0;

    // إنشاء بنية SalesSummary
    const salesSummary = {
      daily: totalRevenue * 0.1, // تقدير 10% من الإجمالي يومياً
      weekly: totalRevenue * 0.3, // تقدير 30% من الإجمالي أسبوعياً  
      monthly: totalRevenue, // استخدام الإجمالي الفعلي شهرياً
      annual: totalRevenue * 12 // تقدير سنوي
    };

    const revenueSummary = {
      daily: totalRevenue * 0.1,
      weekly: totalRevenue * 0.3,
      monthly: totalRevenue,
      annual: totalRevenue * 12
    };

    // الأرباح (افتراض هامش ربح 20%)
    const profitSummary = {
      daily: salesSummary.daily * 0.2,
      weekly: salesSummary.weekly * 0.2,
      monthly: salesSummary.monthly * 0.2,
      annual: salesSummary.annual * 0.2
    };

    return {
      sales: salesSummary,
      revenue: revenueSummary,
      profits: profitSummary,
      orders: {
        total: totalOrders,
        pending: pendingOrders + onlinePendingOrders,
        processing: processingOrders + onlineProcessingOrders,
        completed: completedOrders + onlineCompletedOrders
      },
      inventory: stats.inventory_status || {}
    };
  }, [globalData?.stats, globalData?.orders]);
  const provincesGlobal = globalData?.additional_data?.provinces_global || [];

  // مزامنة الطلبات إلى SQLite
  useEffect(() => {
    const syncOrdersToLocal = async () => {
      try {
        const allOrders = [...(recentOrders || []), ...(recentOnlineOrders || [])];

        if (allOrders.length === 0) return;

        const orgId = organization?.id;
        if (!orgId) return;

        // حفظ الطلبات
        await saveRemoteOrders(allOrders);

        // حفظ العناصر إذا توفرت
        for (const order of allOrders) {
          // التحقق من وجود العناصر في الحقول المحتملة
          const items = order.items || order.order_items || order.json_items;
          if (Array.isArray(items) && items.length > 0) {
            await saveRemoteOrderItems(order.id, items);
          }
        }

        if (process.env.NODE_ENV === 'development') {
          console.log('[SuperUnifiedDataContext] ✅ تم مزامنة الطلبات إلى SQLite:', {
            count: allOrders.length
          });
        }
      } catch (error) {
        console.error('[SuperUnifiedDataContext] ❌ فشل مزامنة الطلبات:', error);
      }
    };

    void syncOrdersToLocal();
  }, [recentOrders, recentOnlineOrders, organization?.id]);

  // مزامنة الفواتير إلى SQLite
  useEffect(() => {
    const syncInvoicesToLocal = async () => {
      try {
        if (!recentInvoices || recentInvoices.length === 0) return;

        const orgId = organization?.id;
        if (!orgId) return;

        // حفظ الفواتير
        await saveRemoteInvoices(recentInvoices);

        // حفظ عناصر الفواتير إذا توفرت
        for (const invoice of recentInvoices) {
          const items = invoice.items || invoice.invoice_items || invoice.json_items;
          if (Array.isArray(items) && items.length > 0) {
            await saveRemoteInvoiceItems(invoice.id, items);
          }
        }

        if (process.env.NODE_ENV === 'development') {
          console.log('[SuperUnifiedDataContext] ✅ تم مزامنة الفواتير إلى SQLite:', {
            count: recentInvoices.length
          });
        }
      } catch (error) {
        console.error('[SuperUnifiedDataContext] ❌ فشل مزامنة الفواتير:', error);
      }
    };

    void syncInvoicesToLocal();
  }, [recentInvoices, organization?.id]);

  useEffect(() => {
    const syncCustomersToLocal = async () => {
      try {
        if (!customers || customers.length === 0) {
          return;
        }

        const orgId = organization?.id || (typeof localStorage !== 'undefined' && (localStorage.getItem('bazaar_organization_id') || localStorage.getItem('currentOrganizationId'))) || null;

        if (!orgId) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[SuperUnifiedDataContext] تخطي مزامنة العملاء: لا يوجد معرف منظمة');
          }
          return;
        }

        // ✅ FIX: Ensure localStorage has the correct Org ID so dbAdapter's ensureInitialized doesn't revert to 'global'
        if (typeof localStorage !== 'undefined') {
          const currentStored = localStorage.getItem('currentOrganizationId');
          if (currentStored !== orgId) {
            localStorage.setItem('currentOrganizationId', orgId);
          }
        }

        // ⚡ استخدام Delta Sync بدلاً من inventoryDB مباشرة
        const now = new Date().toISOString();

        const mapped = customers.map((c: any) => ({
          id: c.id,
          name: c.name,
          email: c.email || null,
          phone: c.phone || null,
          organization_id: c.organization_id || orgId,
          synced: true,
          sync_status: null,
          pending_operation: null,
          local_updated_at: now,
          created_at: c.created_at || now,
          updated_at: c.updated_at || now,
          name_lower: c.name ? String(c.name).toLowerCase() : null,
          email_lower: c.email ? String(c.email).toLowerCase() : null,
          phone_digits: c.phone ? String(c.phone).toString().replace(/\D/g, '') : null,
          total_debt: c.total_debt ?? 0,
          // حقول الامتثال الضريبي الجزائري
          nif: c.nif || null,
          rc: c.rc || null,
          nis: c.nis || null,
          rib: c.rib || null,
          address: c.address || null
        }));

        // ⚡ حفظ العملاء عبر Delta Sync
        for (const customer of mapped) {
          await deltaWriteService.saveFromServer('customers', customer as any);
        }
        const result = mapped.length;

        // طباعة النتيجة للتحقق من النجاح
        if (process.env.NODE_ENV === 'development') {
          console.log('[SuperUnifiedDataContext] ✅ تم مزامنة العملاء إلى SQLite:', {
            total: mapped.length,
            result: result || 'success'
          });
        }
      } catch (error) {
        // تسجيل الخطأ للتحليل
        if (process.env.NODE_ENV === 'development') {
          console.error('[SuperUnifiedDataContext] ❌ فشل في مزامنة العملاء إلى SQLite:', error);
        }
      }
    };

    void syncCustomersToLocal();
  }, [customers, organization?.id]);

  // معلومات إضافية
  const lastFetched = globalData?.fetched_at ? new Date(globalData.fetched_at) : null;
  const isFresh = lastFetched ? (Date.now() - lastFetched.getTime()) < staleTime : false;

  // 🚨 تحديث البيانات العامة في window للمشاركة مع appInitializer - محسن مع debouncing
  useEffect(() => {
    if (globalData && organization?.id) {
      // debounce لمنع التحديثات المفرطة
      const timeoutId = setTimeout(() => {
        try {
          const currentData = (window as any).__SUPER_UNIFIED_DATA__;
          const newTimestamp = Date.now();

          // فقط إذا كانت البيانات مختلفة أو قديمة
          if (!currentData ||
            currentData.organization?.id !== organization.id ||
            (newTimestamp - currentData.timestamp) > 30000) { // 30 ثانية
            (window as any).__SUPER_UNIFIED_DATA__ = {
              organization,
              organizationSettings,
              posSettings,
              activeSubscription,
              organizationApps,
              timestamp: newTimestamp
            };
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
          }
        }
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [
    organization?.id, // فقط المعرف
    organizationSettings?.id, // فقط المعرف
    posSettings?.id, // فقط المعرف
    activeSubscription?.id, // فقط المعرف
    organizationApps?.length // فقط الطول
  ]);

  // إعداد قيمة Context
  const contextValue = useMemo<SuperUnifiedDataContextType>(() => ({
    // البيانات المجمعة
    globalData,

    // حالات التحميل والأخطاء
    isLoading,
    error: error?.message || null,

    // دوال التحديث
    refreshData,
    invalidateData,

    // بيانات مباشرة للسهولة
    organization,
    currentUser,
    organizationSettings,
    posSettings,
    products,
    productCategories,
    subscriptionServices,
    customers,
    users,
    organizationApps,
    activeSubscription,
    recentOrders,
    recentOnlineOrders,
    recentInvoices,
    dashboardStats,
    provincesGlobal,

    // معلومات إضافية
    lastFetched,
    isFresh
  }), [
    globalData, isLoading, error, refreshData, invalidateData,
    organization, currentUser, organizationSettings, posSettings,
    products, productCategories, subscriptionServices, customers, users,
    organizationApps, activeSubscription, recentOrders, recentOnlineOrders, recentInvoices,
    dashboardStats, provincesGlobal, lastFetched, isFresh
  ]);

  return (
    <SuperUnifiedDataContext.Provider value={contextValue}>
      {children}
    </SuperUnifiedDataContext.Provider>
  );
};

// ================================================================
// 🪝 Hooks للوصول لـ Context
// ================================================================

export const useOptionalSuperUnifiedData = (): SuperUnifiedDataContextType | null => {
  const context = useContext(SuperUnifiedDataContext);
  return context ?? null;
};

export const useSuperUnifiedData = (): SuperUnifiedDataContextType => {
  const context = useContext(SuperUnifiedDataContext);
  if (context === undefined) {
    throw new Error('useSuperUnifiedData must be used within a SuperUnifiedDataProvider');
  }
  return context;
};

// ================================================================
// 🎯 Hooks مخصصة للوصول للبيانات
// ================================================================

// Hook للحصول على معلومات المنظمة
export const useOrganizationData = () => {
  const { organization, organizationSettings } = useSuperUnifiedData();
  return { organization, organizationSettings };
};

// Hook للحصول على المنتجات والفئات
export const useProductsData = () => {
  const { products, productCategories } = useSuperUnifiedData();
  return { products, productCategories };
};

// Hook للحصول على بيانات العملاء والمستخدمين
export const useUsersData = () => {
  const { customers, users, currentUser } = useSuperUnifiedData();
  return { customers, users, currentUser };
};

// Hook للحصول على بيانات العملاء فقط
export const useCustomersData = () => {
  const { customers } = useSuperUnifiedData();
  return { customers };
};

// Hook للحصول على إحصائيات لوحة التحكم
export const useDashboardStats = () => {
  const { dashboardStats, recentOrders, recentOnlineOrders, recentInvoices } = useSuperUnifiedData();
  return { dashboardStats, recentOrders, recentOnlineOrders, recentInvoices };
};

// Hook للحصول على التطبيقات والاشتراكات
export const useAppsData = () => {
  const { organizationApps, activeSubscription } = useSuperUnifiedData();

  return { organizationApps, activeSubscription };
};

// Hook للحصول على إعدادات POS
export const usePOSData = () => {
  const { posSettings, products, customers } = useSuperUnifiedData();
  return { posSettings, products, customers };
};

// ================================================================
// 📊 دوال مساعدة للبيانات
// ================================================================

// دالة للتحقق من تفعيل تطبيق معين
export const useIsAppEnabled = (_appId: string): boolean => {
  // جميع التطبيقات متاحة افتراضياً
  return true;
};

// دالة للحصول على إعدادات تطبيق معين
export const useAppConfiguration = (appId: string): any => {
  const { organizationApps } = useSuperUnifiedData();
  const app = organizationApps?.find((app: any) => app.app_id === appId);
  return app?.configuration || {};
};

// دالة للحصول على حالة الاشتراك
export const useSubscriptionStatus = () => {
  const { organization, activeSubscription } = useSuperUnifiedData();

  return {
    isActive: organization?.subscription_status === 'active',
    subscriptionTier: organization?.subscription_tier || 'free',
    subscriptionDetails: activeSubscription,
    expiresAt: activeSubscription?.end_date
  };
};

// Export أساسي للـ Context
export default SuperUnifiedDataContext;
