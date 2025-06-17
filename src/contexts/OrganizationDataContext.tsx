/**
 * Context موحد لجميع بيانات المؤسسة - يحل مشكلة الطلبات المكررة
 * مصمم خصيصاً بناءً على تحليل الطلبات المكررة في المشروع
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTenant } from './TenantContext';
import { supabase } from '@/lib/supabase';

// أنواع البيانات الموحدة
interface OrganizationData {
  settings: any | null;
  subscriptions: any[] | null;
  apps: any[] | null;
  categories: any[] | null;
  products: any[] | null;
  isLoading: boolean;
  error: string | null;
}

interface OrganizationDataContextType extends OrganizationData {
  refetchSettings: () => void;
  refetchSubscriptions: () => void;
  refetchApps: () => void;
  refetchCategories: () => void;
  refetchProducts: () => void;
  refetchAll: () => void;
}

const OrganizationDataContext = createContext<OrganizationDataContextType | undefined>(undefined);

// دوال جلب البيانات المحسنة مع deduplication
const fetchOrganizationSettings = async (organizationId: string) => {
  console.log('🔄 Fetching organization settings for:', organizationId);
  
  const { data, error } = await supabase
    .from('organization_settings')
    .select('*')
    .eq('organization_id', organizationId)
    .single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw error;
  }
  
  console.log('✅ Organization settings fetched:', data);
  return data;
};

const fetchOrganizationSubscriptions = async (organizationId: string) => {
  console.log('🔄 Fetching organization subscriptions for:', organizationId);
  
  const { data, error } = await supabase
    .from('organization_subscriptions')
    .select(`
      *,
      plan:plan_id(id, name, code)
    `)
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  console.log('✅ Organization subscriptions fetched:', data);
  return data || [];
};

const fetchOrganizationApps = async (organizationId: string) => {
  console.log('🔄 Fetching organization apps for:', organizationId);
  
  const { data, error } = await supabase
    .from('organization_apps')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  console.log('✅ Organization apps fetched:', data);
  return data || [];
};

const fetchProductCategories = async (organizationId: string) => {
  console.log('🔄 Fetching product categories for:', organizationId);
  
  const { data, error } = await supabase
    .from('product_categories')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name', { ascending: true });
  
  if (error) throw error;
  
  console.log('✅ Product categories fetched:', data);
  return data || [];
};

const fetchProducts = async (organizationId: string) => {
  console.log('🔄 Fetching products for:', organizationId);
  
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:category_id(id, name, slug),
      subcategory:subcategory_id(id, name, slug)
    `)
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  console.log('✅ Products fetched:', data);
  return data || [];
};

// مقدم البيانات الموحد
export const OrganizationDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentOrganization } = useTenant();
  const queryClient = useQueryClient();
  
  const organizationId = currentOrganization?.id;
  
  // استعلامات محسنة مع staleTime مناسب لكل نوع بيانات
  const {
    data: settings,
    error: settingsError,
    isLoading: settingsLoading,
    refetch: refetchSettings
  } = useQuery({
    queryKey: ['organization-settings', organizationId],
    queryFn: () => fetchOrganizationSettings(organizationId!),
    enabled: !!organizationId,
    staleTime: 10 * 60 * 1000, // 10 دقائق - الإعدادات تتغير قليلاً
    gcTime: 30 * 60 * 1000, // 30 دقيقة
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const {
    data: subscriptions,
    error: subscriptionsError,
    isLoading: subscriptionsLoading,
    refetch: refetchSubscriptions
  } = useQuery({
    queryKey: ['organization-subscriptions', organizationId],
    queryFn: () => fetchOrganizationSubscriptions(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 دقائق - الاشتراكات قد تتغير
    gcTime: 15 * 60 * 1000, // 15 دقيقة
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const {
    data: apps,
    error: appsError,
    isLoading: appsLoading,
    refetch: refetchApps
  } = useQuery({
    queryKey: ['organization-apps', organizationId],
    queryFn: () => fetchOrganizationApps(organizationId!),
    enabled: !!organizationId,
    staleTime: 15 * 60 * 1000, // 15 دقيقة - التطبيقات تتغير قليلاً
    gcTime: 45 * 60 * 1000, // 45 دقيقة
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const {
    data: categories,
    error: categoriesError,
    isLoading: categoriesLoading,
    refetch: refetchCategories
  } = useQuery({
    queryKey: ['product-categories', organizationId],
    queryFn: () => fetchProductCategories(organizationId!),
    enabled: !!organizationId,
    staleTime: 20 * 60 * 1000, // 20 دقيقة - الفئات ثابتة نسبياً
    gcTime: 60 * 60 * 1000, // ساعة واحدة
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const {
    data: products,
    error: productsError,
    isLoading: productsLoading,
    refetch: refetchProducts
  } = useQuery({
    queryKey: ['products', organizationId],
    queryFn: () => fetchProducts(organizationId!),
    enabled: !!organizationId,
    staleTime: 10 * 60 * 1000, // 10 دقائق - المنتجات قد تتغير
    gcTime: 30 * 60 * 1000, // 30 دقيقة
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // جمع حالات التحميل والأخطاء
  const isLoading = settingsLoading || subscriptionsLoading || appsLoading || categoriesLoading || productsLoading;
  const error = settingsError?.message || subscriptionsError?.message || appsError?.message || 
               categoriesError?.message || productsError?.message || null;

  // دالة لإعادة تحميل جميع البيانات
  const refetchAll = () => {
    console.log('🔄 Refetching all organization data...');
    refetchSettings();
    refetchSubscriptions();
    refetchApps();
    refetchCategories();
    refetchProducts();
  };

  const value: OrganizationDataContextType = {
    settings: settings || null,
    subscriptions: subscriptions || null,
    apps: apps || null,
    categories: categories || null,
    products: products || null,
    isLoading,
    error,
    refetchSettings,
    refetchSubscriptions,
    refetchApps,
    refetchCategories,
    refetchProducts,
    refetchAll,
  };

  return (
    <OrganizationDataContext.Provider value={value}>
      {children}
    </OrganizationDataContext.Provider>
  );
};

// Hook للاستخدام
export const useOrganizationData = (): OrganizationDataContextType => {
  const context = useContext(OrganizationDataContext);
  if (!context) {
    throw new Error('useOrganizationData must be used within OrganizationDataProvider');
  }
  return context;
};

// Hooks محددة لكل نوع بيانات
export const useOrganizationSettings = () => {
  const { settings, isLoading, error, refetchSettings } = useOrganizationData();
  return { settings, isLoading, error, refetch: refetchSettings };
};

export const useOrganizationSubscriptions = () => {
  const { subscriptions, isLoading, error, refetchSubscriptions } = useOrganizationData();
  return { subscriptions, isLoading, error, refetch: refetchSubscriptions };
};

export const useOrganizationApps = () => {
  const { apps, isLoading, error, refetchApps } = useOrganizationData();
  return { apps, isLoading, error, refetch: refetchApps };
};

export const useProductCategories = () => {
  const { categories, isLoading, error, refetchCategories } = useOrganizationData();
  return { categories, isLoading, error, refetch: refetchCategories };
};

export const useProducts = () => {
  const { products, isLoading, error, refetchProducts } = useOrganizationData();
  return { products, isLoading, error, refetch: refetchProducts };
};

export default OrganizationDataContext; 