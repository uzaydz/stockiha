import React, { createContext, useContext, useCallback, useMemo, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTenant } from './TenantContext';
import { useAuth } from './AuthContext';
import { Product, Service } from '@/types';
import { POSSettings } from '@/types/posSettings';
import { deduplicateRequest } from '../lib/cache/deduplication';
import { supabase } from '@/lib/supabase';
import { logPOSContextStatus } from '@/utils/productionDebug';
import UnifiedRequestManager from '@/lib/unifiedRequestManager';

// =================================================================
// 🎯 POSDataContext V2 - الحل الشامل مع تحليل قاعدة البيانات المعمق
// =================================================================

// تحديث الواجهات لتتماشى مع قاعدة البيانات الفعلية
interface ProductColor {
  id: string;
  product_id: string;
  name: string;
  color_code: string;
  image_url?: string;
  quantity: number;
  price?: number;
  barcode?: string;
  is_default: boolean;
  has_sizes: boolean;
  variant_number?: number;
  purchase_price?: number;
  sizes?: ProductSize[];
}

interface ProductSize {
  id: string;
  color_id: string;
  product_id: string;
  size_name: string;
  quantity: number;
  price?: number;
  barcode?: string;
  is_default: boolean;
  purchase_price?: number;
}

interface SubscriptionService {
  id: string;
  name: string;
  description?: string;
  provider: string;
  organization_id: string;
  category_id?: string;
  logo_url?: string;
  purchase_price: number;
  selling_price: number;
  profit_margin?: number;
  profit_amount?: number;
  service_type: string;
  delivery_method: string;
  total_quantity: number;
  available_quantity: number;
  sold_quantity: number;
  reserved_quantity: number;
  status: string;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  category?: SubscriptionCategory;
  pricing_options?: any[]; // إضافة خيارات الأسعار
}

interface SubscriptionCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color: string;
  is_active: boolean;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

interface OrganizationApp {
  id: string;
  organization_id: string;
  app_id: string;
  is_enabled: boolean;
  installed_at: string;
  configuration?: Record<string, any>;
}

interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  organization_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// واجهة محسنة للمنتج مع المتغيرات
interface POSProductWithVariants {
  // خصائص Product الأساسية
  id: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  sku: string;
  barcode?: string;
  category: any;
  category_id?: string;
  subcategory?: string;
  brand?: string;
  images: string[];
  thumbnailImage: string;
  stockQuantity: number;
  stock_quantity: number;
  features?: string[];
  specifications?: Record<string, string>;
  isDigital: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  createdAt: Date;
  updatedAt: Date;
  has_variants?: boolean;
  use_sizes?: boolean;
  
  // خصائص إضافية من قاعدة البيانات
  compare_at_price?: number;
  purchase_price?: number;
  subcategory_id?: string;
  min_stock_level?: number;
  reorder_level?: number;
  reorder_quantity?: number;
  slug?: string;
  show_price_on_landing: boolean;
  last_inventory_update?: string;
  is_active: boolean;
  
  // خصائص الجملة
  wholesale_price?: number;
  partial_wholesale_price?: number;
  min_wholesale_quantity?: number;
  min_partial_wholesale_quantity?: number;
  allow_retail: boolean;
  allow_wholesale: boolean;
  allow_partial_wholesale: boolean;
  
  // خصائص المتغيرات والألوان
  colors?: ProductColor[];
  
  // حساب المخزون الفعلي
  actual_stock_quantity: number;
  total_variants_stock: number;
  low_stock_warning: boolean;
  
  // معلومات إضافية
  has_fast_shipping: boolean;
  has_money_back: boolean;
  has_quality_guarantee: boolean;
  fast_shipping_text?: string;
  money_back_text?: string;
  quality_guarantee_text?: string;
  
  // معلومات الوحدة
  is_sold_by_unit: boolean;
  unit_type?: string;
  use_variant_prices: boolean;
  unit_purchase_price?: number;
  unit_sale_price?: number;
  
  // إعدادات الشحن
  shipping_clone_id?: number;
  name_for_shipping?: string;
  use_shipping_clone: boolean;
  shipping_method_type: string;
  
  // تتبع المستخدم
  created_by_user_id?: string;
  updated_by_user_id?: string;
}

interface POSData {
  // البيانات الأساسية
  products: POSProductWithVariants[];
  subscriptions: SubscriptionService[];
  categories: SubscriptionCategory[];
  productCategories: ProductCategory[];
  posSettings: any;
  organizationApps: OrganizationApp[];
  
  // إحصائيات المخزون
  inventoryStats: {
    totalProducts: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    totalVariants: number;
    totalStock: number;
  };
  
  // حالات التحميل
  isLoading: boolean;
  isProductsLoading: boolean;
  isSubscriptionsLoading: boolean;
  isCategoriesLoading: boolean;
  isPOSSettingsLoading: boolean;
  isAppsLoading: boolean;
  
  // الأخطاء
  errors: {
    products?: string;
    subscriptions?: string;
    categories?: string;
    posSettings?: string;
    apps?: string;
  };
  
  // دوال التحديث
  refreshAll: () => Promise<void>;
  refreshProducts: () => Promise<void>;
  refreshSubscriptions: () => Promise<void>;
  refreshPOSSettings: () => Promise<void>;
  refreshApps: () => Promise<void>;
  
  // دوال مساعدة للمخزون
  getProductStock: (productId: string, colorId?: string, sizeId?: string) => number;
  updateProductStock: (productId: string, colorId: string | null, sizeId: string | null, newQuantity: number) => Promise<boolean>;
  updateProductStockInCache: (productId: string, colorId: string | null, sizeId: string | null, quantityToReduce: number) => void;
  checkLowStock: (productId: string) => boolean;
  getProductPrice: (productId: string, quantity: number, colorId?: string, sizeId?: string) => number;
}

const POSDataContext = createContext<POSData | undefined>(undefined);

// =================================================================
// 🔧 دوال جلب البيانات المحسنة مع تحليل قاعدة البيانات المعمق
// =================================================================

// تحميل ذكي للمنتجات: الأكثر مبيعاً + الأكثر مخزوناً
const fetchPOSProductsWithVariants = async (orgId: string): Promise<POSProductWithVariants[]> => {
  return deduplicateRequest(`pos-products-enhanced-${orgId}`, async () => {
    
    // جلب المنتجات الأحدث (الأكثر احتمالاً للاستخدام)
    const { data: recentProducts, error: recentError } = await supabase
      .from('products')
      .select(`
        *,
        product_colors (
          id, product_id, name, color_code, image_url, quantity, price, barcode, 
          is_default, has_sizes, variant_number, purchase_price,
          product_sizes (
            id, color_id, product_id, size_name, quantity, price, barcode, 
            is_default, purchase_price
          )
        ),
        product_categories!category_id (
          id, name, description
        )
      `)
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(50);

    // جلب المنتجات الأكثر مخزوناً (المنتجات المتوفرة)
    const { data: highStockProducts, error: highStockError } = await supabase
      .from('products')
      .select(`
        *,
        product_colors (
          id, product_id, name, color_code, image_url, quantity, price, barcode, 
          is_default, has_sizes, variant_number, purchase_price,
          product_sizes (
            id, color_id, product_id, size_name, quantity, price, barcode, 
            is_default, purchase_price
          )
        ),
        product_categories!category_id (
          id, name, description
        )
      `)
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .gt('stock_quantity', 0)
      .order('stock_quantity', { ascending: false })
      .limit(50);

    if (recentError && highStockError) {
      // إذا فشلت الطريقة الذكية، نستخدم الطريقة العادية
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_colors (
            id, product_id, name, color_code, image_url, quantity, price, barcode, 
            is_default, has_sizes, variant_number, purchase_price,
            product_sizes (
              id, color_id, product_id, size_name, quantity, price, barcode, 
              is_default, purchase_price
            )
          ),
          product_categories!category_id (
            id, name, description
          )
        `)
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('name')
        .limit(100);

             if (error) {
         throw error;
       }
       
       // تحويل البيانات للطريقة العادية
       return (data || []).map(product => {
         const colors = (product.product_colors || []).map((color: any) => ({
           ...color,
           sizes: color.product_sizes || []
         }));
         
         // حساب المخزون الفعلي
         let actual_stock_quantity = product.stock_quantity;
         let total_variants_stock = 0;
         
         if (product.has_variants && colors.length > 0) {
           total_variants_stock = colors.reduce((colorTotal: number, color: any) => {
             if (color.has_sizes && color.sizes.length > 0) {
               return colorTotal + color.sizes.reduce((sizeTotal: number, size: any) => sizeTotal + size.quantity, 0);
             } else {
               return colorTotal + color.quantity;
             }
           }, 0);
           
           actual_stock_quantity = total_variants_stock > 0 ? total_variants_stock : product.stock_quantity;
         }
         
         const low_stock_warning = actual_stock_quantity <= (product.min_stock_level || 5);

         return {
           id: product.id,
           name: product.name,
           description: product.description || '',
           price: product.price,
           compareAtPrice: product.compare_at_price || undefined,
           sku: product.sku,
           barcode: product.barcode || undefined,
           category: (product.product_categories?.name || 'أخرى') as any,
           category_id: product.category_id || undefined,
           subcategory: product.subcategory || undefined,
           brand: product.brand || undefined,
           images: product.images || [],
           thumbnailImage: product.thumbnail_image || '',
           stockQuantity: actual_stock_quantity,
           stock_quantity: actual_stock_quantity,
           features: product.features || undefined,
           specifications: (product.specifications as Record<string, string>) || {},
           isDigital: product.is_digital,
           isNew: product.is_new || undefined,
           isFeatured: product.is_featured || undefined,
           createdAt: new Date(product.created_at),
           updatedAt: new Date(product.updated_at),
           has_variants: product.has_variants || false,
           use_sizes: product.use_sizes || false,
           compare_at_price: product.compare_at_price,
           purchase_price: product.purchase_price,
           subcategory_id: product.subcategory_id,
           min_stock_level: product.min_stock_level,
           reorder_level: product.reorder_level,
           reorder_quantity: product.reorder_quantity,
           slug: product.slug,
           show_price_on_landing: product.show_price_on_landing,
           last_inventory_update: product.last_inventory_update,
           is_active: product.is_active,
           wholesale_price: product.wholesale_price,
           partial_wholesale_price: product.partial_wholesale_price,
           min_wholesale_quantity: product.min_wholesale_quantity,
           min_partial_wholesale_quantity: product.min_partial_wholesale_quantity,
           allow_retail: product.allow_retail ?? true,
           allow_wholesale: product.allow_wholesale ?? false,
           allow_partial_wholesale: product.allow_partial_wholesale ?? false,
           colors,
           actual_stock_quantity,
           total_variants_stock,
           low_stock_warning,
           has_fast_shipping: product.has_fast_shipping || false,
           has_money_back: product.has_money_back || false,
           has_quality_guarantee: product.has_quality_guarantee || false,
           fast_shipping_text: product.fast_shipping_text,
           money_back_text: product.money_back_text,
           quality_guarantee_text: product.quality_guarantee_text,
           is_sold_by_unit: product.is_sold_by_unit ?? true,
           unit_type: product.unit_type,
           use_variant_prices: product.use_variant_prices || false,
           unit_purchase_price: product.unit_purchase_price,
           unit_sale_price: product.unit_sale_price,
           shipping_clone_id: product.shipping_clone_id,
           name_for_shipping: product.name_for_shipping,
           use_shipping_clone: product.use_shipping_clone || false,
           shipping_method_type: product.shipping_method_type || 'default',
           created_by_user_id: product.created_by_user_id,
           updated_by_user_id: product.updated_by_user_id,
         } as POSProductWithVariants;
       });
     }

    // دمج النتائج وإزالة المكررات
    const allProducts = [
      ...(recentProducts || []),
      ...(highStockProducts || [])
    ];
    
    // إزالة المكررات بناءً على ID
    const uniqueProducts = allProducts.filter((product, index, self) => 
      index === self.findIndex(p => p.id === product.id)
    );

    // تحويل البيانات مع حساب المخزون الفعلي
    return uniqueProducts.map(product => {
      const colors = (product.product_colors || []).map((color: any) => ({
        ...color,
        sizes: color.product_sizes || []
      }));
      
      // حساب المخزون الفعلي
      let actual_stock_quantity = product.stock_quantity;
      let total_variants_stock = 0;
      
      if (product.has_variants && colors.length > 0) {
        // للمنتجات التي لها متغيرات، احسب من الألوان والأحجام
        total_variants_stock = colors.reduce((colorTotal: number, color: any) => {
          if (color.has_sizes && color.sizes.length > 0) {
            // إذا كان اللون له أحجام، احسب من الأحجام
            return colorTotal + color.sizes.reduce((sizeTotal: number, size: any) => sizeTotal + size.quantity, 0);
          } else {
            // إذا لم يكن له أحجام، احسب من كمية اللون
            return colorTotal + color.quantity;
          }
        }, 0);
        
        // استخدم مخزون المتغيرات إذا كان متاحاً
        actual_stock_quantity = total_variants_stock > 0 ? total_variants_stock : product.stock_quantity;
      }
      
      // تحديد تحذير المخزون المنخفض
      const low_stock_warning = actual_stock_quantity <= (product.min_stock_level || 5);

      return {
        // خصائص Product الأساسية
        id: product.id,
        name: product.name,
        description: product.description || '',
        price: product.price,
        compareAtPrice: product.compare_at_price || undefined,
        sku: product.sku,
        barcode: product.barcode || undefined,
        category: (product.product_categories?.name || 'أخرى') as any,
        category_id: product.category_id || undefined,
        subcategory: product.subcategory || undefined,
        brand: product.brand || undefined,
        images: product.images || [],
        thumbnailImage: product.thumbnail_image || '',
        stockQuantity: actual_stock_quantity,
        stock_quantity: actual_stock_quantity,
        features: product.features || undefined,
        specifications: (product.specifications as Record<string, string>) || {},
        isDigital: product.is_digital,
        isNew: product.is_new || undefined,
        isFeatured: product.is_featured || undefined,
        createdAt: new Date(product.created_at),
        updatedAt: new Date(product.updated_at),
        has_variants: product.has_variants || false,
        use_sizes: product.use_sizes || false,
        
        // خصائص إضافية من قاعدة البيانات
        compare_at_price: product.compare_at_price,
        purchase_price: product.purchase_price,
        subcategory_id: product.subcategory_id,
        min_stock_level: product.min_stock_level,
        reorder_level: product.reorder_level,
        reorder_quantity: product.reorder_quantity,
        slug: product.slug,
        show_price_on_landing: product.show_price_on_landing,
        last_inventory_update: product.last_inventory_update,
        is_active: product.is_active,
        
        // خصائص الجملة
        wholesale_price: product.wholesale_price,
        partial_wholesale_price: product.partial_wholesale_price,
        min_wholesale_quantity: product.min_wholesale_quantity,
        min_partial_wholesale_quantity: product.min_partial_wholesale_quantity,
        allow_retail: product.allow_retail ?? true,
        allow_wholesale: product.allow_wholesale ?? false,
        allow_partial_wholesale: product.allow_partial_wholesale ?? false,
        
        // الألوان والأحجام
        colors,
        
        // إحصائيات المخزون
        actual_stock_quantity,
        total_variants_stock,
        low_stock_warning,
        
        // معلومات إضافية
        has_fast_shipping: product.has_fast_shipping || false,
        has_money_back: product.has_money_back || false,
        has_quality_guarantee: product.has_quality_guarantee || false,
        fast_shipping_text: product.fast_shipping_text,
        money_back_text: product.money_back_text,
        quality_guarantee_text: product.quality_guarantee_text,
        
        // معلومات الوحدة
        is_sold_by_unit: product.is_sold_by_unit ?? true,
        unit_type: product.unit_type,
        use_variant_prices: product.use_variant_prices || false,
        unit_purchase_price: product.unit_purchase_price,
        unit_sale_price: product.unit_sale_price,
        
        // إعدادات الشحن
        shipping_clone_id: product.shipping_clone_id,
        name_for_shipping: product.name_for_shipping,
        use_shipping_clone: product.use_shipping_clone || false,
        shipping_method_type: product.shipping_method_type || 'default',
        
        // تتبع المستخدم
        created_by_user_id: product.created_by_user_id,
        updated_by_user_id: product.updated_by_user_id,
      } as POSProductWithVariants;
    });
  });
};

const fetchPOSSubscriptionsEnhanced = async (orgId: string): Promise<SubscriptionService[]> => {
  return deduplicateRequest(`pos-subscriptions-enhanced-${orgId}`, async () => {
    
    // جلب الخدمات مع الأسعار
    const { data: servicesData, error: servicesError } = await supabase
      .from('subscription_services')
      .select(`
        *,
        category:subscription_categories(*)
      `)
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false });

    if (servicesError) {
      throw servicesError;
    }

    if (!servicesData || servicesData.length === 0) {
      return [];
    }

    // جلب أسعار كل خدمة
    const servicesWithPricing = await Promise.all(
      servicesData.map(async (service) => {
        const { data: pricingData } = await supabase
          .from('subscription_service_pricing' as any)
          .select('*')
          .eq('subscription_service_id', service.id)
          .eq('is_active', true)
          .order('display_order');

        return {
          ...service,
          pricing_options: pricingData || []
        };
      })
    );

    return servicesWithPricing as any;
  });
};

const fetchPOSCategoriesEnhanced = async (orgId: string): Promise<SubscriptionCategory[]> => {
  return deduplicateRequest(`pos-categories-enhanced-${orgId}`, async () => {
    
    // استخدام جدول product_categories كبديل
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('name');

    if (error) {
      throw error;
    }

    return (data || []).map(cat => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      icon: '',
      color: '#3B82F6',
      is_active: cat.is_active,
      organization_id: cat.organization_id,
      created_at: cat.created_at,
      updated_at: cat.updated_at
    }));
  });
};

const fetchProductCategories = async (orgId: string): Promise<ProductCategory[]> => {
  return deduplicateRequest(`pos-product-categories-${orgId}`, async () => {
    try {
      // استخدام UnifiedRequestManager للحد من الطلبات المكررة
      const data = await UnifiedRequestManager.getProductCategories(orgId);
      
      // تحويل البيانات إلى ProductCategory format
      return (data || []).map(cat => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        organization_id: cat.organization_id,
        is_active: cat.is_active,
        created_at: cat.created_at,
        updated_at: cat.updated_at
      }));
    } catch (error) {
      if (import.meta.env.DEV) {
      }
      throw error;
    }
  });
};

const fetchPOSSettingsEnhanced = async (orgId: string): Promise<any> => {
  return deduplicateRequest(`pos-settings-enhanced-${orgId}`, async () => {
    
    try {
      // محاولة RPC function المحسنة أولاً
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_pos_settings', { p_organization_id: orgId });

      if (!rpcError && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
        return rpcData[0] as any;
      }

      // fallback للاستعلام المباشر المحسن
      const { data: directData, error: directError } = await supabase
        .from('pos_settings')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle();

      if (directError) {
        
              // إنشاء إعدادات افتراضية إذا لم توجد
      try {
        const { data: newSettings, error: createError } = await supabase
          .rpc('initialize_pos_settings', { p_organization_id: orgId });
        
        if (!createError && newSettings && typeof newSettings === 'object') {
          return newSettings as POSSettings;
        }
      } catch (createRpcError) {
      }
        
        throw directError;
      }
      
      if (directData) {
        return directData;
      }

      // إنشاء إعدادات افتراضية
      try {
        const { data: newSettings, error: createError } = await supabase
          .rpc('initialize_pos_settings', { p_organization_id: orgId });
        
        if (!createError && newSettings && typeof newSettings === 'object') {
          return newSettings as POSSettings;
        }
      } catch (createRpcError) {
      }
      
      return null;
    } catch (error) {
      return null;
    }
  });
};

const fetchOrganizationAppsEnhanced = async (orgId: string): Promise<OrganizationApp[]> => {
  return deduplicateRequest(`pos-org-apps-enhanced-${orgId}`, async () => {
    
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('id', orgId)
        .single();

      if (error || !data) {
        return [];
      }

      // إرجاع بيانات وهمية للتطبيقات الأساسية
      const defaultApps: OrganizationApp[] = [
        {
          id: '1',
          organization_id: orgId,
          app_id: 'pos-system',
          is_enabled: true,
          installed_at: new Date().toISOString(),
          configuration: {}
        },
        {
          id: '2',
          organization_id: orgId,
          app_id: 'subscription-services',
          is_enabled: true,
          installed_at: new Date().toISOString(),
          configuration: {}
        }
      ];

      return defaultApps;
    } catch (error) {
      return [];
    }
  });
};

// =================================================================
// 🎯 POSDataProvider Component المحسن
// =================================================================

interface POSDataProviderProps {
  children: React.ReactNode;
}

export const POSDataProvider: React.FC<POSDataProviderProps> = ({ children }) => {
  const { currentOrganization } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.id;

  logPOSContextStatus('PROVIDER_INIT', { orgId, hasOrg: !!currentOrganization, hasUser: !!user });

  // React Query للمنتجات المحسنة مع المتغيرات والمخزون
  const {
    data: products = [],
    isLoading: isProductsLoading,
    error: productsError
  } = useQuery({
    queryKey: ['pos-products-enhanced', orgId],
    queryFn: () => fetchPOSProductsWithVariants(orgId!),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // إرجاع إلى 5 دقائق (تقليل الاستدعاءات)
    gcTime: 15 * 60 * 1000, // إرجاع إلى 15 دقيقة
    retry: 2, // تقليل المحاولات
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),
    refetchOnWindowFocus: false, // إيقاف التحديث عند التركيز
    refetchOnMount: true, // التحديث فقط عند تركيب المكون
    refetchInterval: false, // إيقاف التحديث التلقائي
  });

  // React Query لخدمات الاشتراك المحسنة
  const {
    data: subscriptions = [],
    isLoading: isSubscriptionsLoading,
    error: subscriptionsError
  } = useQuery({
    queryKey: ['pos-subscriptions-enhanced', orgId],
    queryFn: () => fetchPOSSubscriptionsEnhanced(orgId!),
    enabled: !!orgId,
    staleTime: 10 * 60 * 1000, // 10 دقائق
    gcTime: 30 * 60 * 1000, // 30 دقيقة
    retry: 2,
    retryDelay: 1500,
  });

  // React Query لفئات الاشتراك المحسنة
  const {
    data: categories = [],
    isLoading: isCategoriesLoading,
    error: categoriesError
  } = useQuery({
    queryKey: ['pos-subscription-categories-enhanced', orgId],
    queryFn: () => fetchPOSCategoriesEnhanced(orgId!),
    enabled: !!orgId,
    staleTime: 60 * 60 * 1000, // ساعة (بيانات ثابتة)
    gcTime: 4 * 60 * 60 * 1000, // 4 ساعات
    retry: 2,
    retryDelay: 1000,
  });

  // React Query لفئات المنتجات
  const {
    data: productCategories = [],
    isLoading: isProductCategoriesLoading,
    error: productCategoriesError
  } = useQuery({
    queryKey: ['pos-product-categories', orgId],
    queryFn: () => fetchProductCategories(orgId!),
    enabled: !!orgId,
    staleTime: 30 * 60 * 1000, // 30 دقيقة
    gcTime: 2 * 60 * 60 * 1000, // ساعتان
    retry: 2,
    retryDelay: 1000,
  });

  // React Query لإعدادات POS المحسنة
  const {
    data: posSettings,
    isLoading: isPOSSettingsLoading,
    error: posSettingsError
  } = useQuery({
    queryKey: ['pos-settings-enhanced', orgId],
    queryFn: () => fetchPOSSettingsEnhanced(orgId!),
    enabled: !!orgId,
    staleTime: 30 * 60 * 1000, // 30 دقيقة
    gcTime: 2 * 60 * 60 * 1000, // ساعتان
    retry: 3,
    retryDelay: 2000,
  });

  // React Query لتطبيقات المؤسسة المحسنة
  const {
    data: organizationApps = [],
    isLoading: isAppsLoading,
    error: appsError
  } = useQuery({
    queryKey: ['pos-organization-apps-enhanced', orgId],
    queryFn: () => fetchOrganizationAppsEnhanced(orgId!),
    enabled: !!orgId,
    staleTime: 20 * 60 * 1000, // 20 دقيقة
    gcTime: 2 * 60 * 60 * 1000, // ساعتان
    retry: 2,
    retryDelay: 1000,
  });

  // حساب إحصائيات المخزون
  const inventoryStats = useMemo(() => {
    const totalProducts = products.length;
    const lowStockProducts = products.filter(p => p.low_stock_warning).length;
    const outOfStockProducts = products.filter(p => p.actual_stock_quantity <= 0).length;
    const totalVariants = products.reduce((total, p) => {
      return total + (p.colors?.length || 0) + 
             (p.colors?.reduce((colorTotal, c) => colorTotal + (c.sizes?.length || 0), 0) || 0);
    }, 0);
    const totalStock = products.reduce((total, p) => total + p.actual_stock_quantity, 0);

    return {
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      totalVariants,
      totalStock
    };
  }, [products]);

  // دوال التحديث المحسنة
  const refreshAll = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['pos'] });
  }, [queryClient]);

  const refreshProducts = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['pos-products-enhanced'] });
  }, [queryClient]);

  const refreshSubscriptions = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['pos-subscriptions-enhanced'] });
  }, [queryClient]);

  const refreshPOSSettings = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['pos-settings-enhanced'] });
  }, [queryClient]);

  const refreshApps = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['pos-organization-apps-enhanced'] });
  }, [queryClient]);

  // دالة خاصة لتحديث المخزون في cache مباشرة (optimistic update)
  const updateProductStockInCache = useCallback((
    productId: string,
    colorId: string | null,
    sizeId: string | null,
    quantityToReduce: number
  ) => {
    
    // استخدام invalidateQueries + setQueryData للتأكد من re-render
    queryClient.setQueryData(['pos-products-enhanced', orgId], (oldData: POSProductWithVariants[] | undefined) => {
      if (!oldData) {
        return oldData;
      }
      
      const updatedData = oldData.map(product => {
        if (product.id !== productId) return product;
        
        const updatedProduct = { ...product };
        
        if (sizeId && colorId) {
          // تحديث مقاس محدد
          updatedProduct.colors = product.colors?.map(color => {
            if (color.id === colorId) {
              return {
                ...color,
                sizes: color.sizes?.map(size => {
                  if (size.id === sizeId) {
                    const newQuantity = Math.max(0, size.quantity - quantityToReduce);
                    return { ...size, quantity: newQuantity };
                  }
                  return size;
                }) || []
              };
            }
            return color;
          }) || [];
        } else if (colorId) {
          // تحديث لون محدد
          updatedProduct.colors = product.colors?.map(color => {
            if (color.id === colorId) {
              const newQuantity = Math.max(0, color.quantity - quantityToReduce);
              return { ...color, quantity: newQuantity };
            }
            return color;
          }) || [];
        } else {
          // تحديث المنتج الأساسي
          const newQuantity = Math.max(0, product.stock_quantity - quantityToReduce);
          updatedProduct.stock_quantity = newQuantity;
          updatedProduct.stockQuantity = newQuantity;
          updatedProduct.actual_stock_quantity = newQuantity;
        }
        
        return updatedProduct;
      });
      
      return updatedData;
    });
    
    // إجبار React Query على إعادة التقييم والـ re-render فوراً
    queryClient.invalidateQueries({ 
      queryKey: ['pos-products-enhanced', orgId],
      exact: true,
      refetchType: 'none' // لا نريد refetch من الخادم، فقط re-render
    });

    // إجبار re-render إضافي للتأكد من تحديث الواجهة مع تأخير قصير
    setTimeout(() => {
      queryClient.invalidateQueries({ 
        queryKey: ['pos-products-enhanced', orgId],
        exact: true,
        refetchType: 'none'
      });
    }, 100);
    
  }, [queryClient, orgId]);

  // دوال مساعدة للمخزون
  const getProductStock = useCallback((productId: string, colorId?: string, sizeId?: string): number => {
    const product = products.find(p => p.id === productId);
    if (!product) {
      return 0;
    }

    // طباعة تفاصيل المنتج لفهم البيانات

    if (!product.has_variants) {
      const stock = product.actual_stock_quantity || product.stock_quantity || product.stockQuantity || 0;
      return stock;
    }

    if (colorId) {
      const color = product.colors?.find(c => c.id === colorId);
      if (!color) {
        return 0;
      }

      if (sizeId && color.has_sizes) {
        const size = color.sizes?.find(s => s.id === sizeId);
        if (!size) {
          return 0;
        }

        const stockQuantity = size.quantity || 0;
        return stockQuantity;
      }
      
      return color.quantity || 0;
    }

    const stock = product.actual_stock_quantity || product.stock_quantity || product.stockQuantity || 0;
    return stock;
  }, [products]);

  const updateProductStock = useCallback(async (
    productId: string, 
    colorId: string | null, 
    sizeId: string | null, 
    newQuantity: number
  ): Promise<boolean> => {
    try {

      if (sizeId && colorId) {
        // تحديث مخزون الحجم
        const { error } = await supabase
          .from('product_sizes')
          .update({ quantity: newQuantity })
          .eq('id', sizeId);
        
        if (error) throw error;
      } else if (colorId) {
        // تحديث مخزون اللون
        const { error } = await supabase
          .from('product_colors')
          .update({ quantity: newQuantity })
          .eq('id', colorId);
        
        if (error) throw error;
      } else {
        // تحديث مخزون المنتج الأساسي
        const { error } = await supabase
          .from('products')
          .update({ 
            stock_quantity: newQuantity,
            last_inventory_update: new Date().toISOString()
          })
          .eq('id', productId);
        
        if (error) throw error;
      }

      // تحديث فوري في cache بدون انتظار
      queryClient.invalidateQueries({ 
        queryKey: ['pos-products-enhanced', orgId],
        refetchType: 'active' // إعادة جلب البيانات فوراً
      });
      
      return true;
    } catch (error) {
      return false;
    }
  }, [queryClient, orgId]);

  const checkLowStock = useCallback((productId: string): boolean => {
    const product = products.find(p => p.id === productId);
    return product?.low_stock_warning || false;
  }, [products]);

  const getProductPrice = useCallback((
    productId: string, 
    quantity: number, 
    colorId?: string, 
    sizeId?: string
  ): number => {
    const product = products.find(p => p.id === productId);
    if (!product) return 0;

    // فحص أسعار الجملة
    if (product.allow_wholesale && 
        product.wholesale_price && 
        product.min_wholesale_quantity && 
        quantity >= product.min_wholesale_quantity) {
      return product.wholesale_price;
    }

    if (product.allow_partial_wholesale && 
        product.partial_wholesale_price && 
        product.min_partial_wholesale_quantity && 
        quantity >= product.min_partial_wholesale_quantity) {
      return product.partial_wholesale_price;
    }

    // فحص أسعار المتغيرات
    if (product.use_variant_prices && colorId) {
      const color = product.colors?.find(c => c.id === colorId);
      if (color) {
        if (sizeId && color.has_sizes) {
          const size = color.sizes?.find(s => s.id === sizeId);
          if (size?.price) return size.price;
        }
        if (color.price) return color.price;
      }
    }

    // السعر الأساسي
    return product.price;
  }, [products]);

  // حساب حالة التحميل الإجمالية
  const isLoading = isProductsLoading || isSubscriptionsLoading || isCategoriesLoading || 
                   isPOSSettingsLoading || isProductCategoriesLoading;

  // جمع الأخطاء
  const errors = useMemo(() => ({
    products: productsError?.message,
    subscriptions: subscriptionsError?.message,
    categories: categoriesError?.message,
    posSettings: posSettingsError?.message,
    apps: appsError?.message,
  }), [productsError, subscriptionsError, categoriesError, posSettingsError, appsError]);

  // قيمة Context المحسنة
  const contextValue = useMemo<POSData>(() => ({
    // البيانات
    products,
    subscriptions,
    categories,
    productCategories,
    posSettings,
    organizationApps,
    
    // إحصائيات المخزون
    inventoryStats,
    
    // حالات التحميل
    isLoading,
    isProductsLoading,
    isSubscriptionsLoading,
    isCategoriesLoading,
    isPOSSettingsLoading,
    isAppsLoading,
    
    // الأخطاء
    errors,
    
    // الوظائف
    refreshAll,
    refreshProducts,
    refreshSubscriptions,
    refreshPOSSettings,
    refreshApps,
    
    // دوال المخزون
    getProductStock,
    updateProductStock,
    updateProductStockInCache,
    checkLowStock,
    getProductPrice,
  }), [
    products, subscriptions, categories, productCategories, posSettings, organizationApps,
    inventoryStats, isLoading, isProductsLoading, isSubscriptionsLoading, 
    isCategoriesLoading, isPOSSettingsLoading, isAppsLoading, errors,
    refreshAll, refreshProducts, refreshSubscriptions, refreshPOSSettings, refreshApps,
    getProductStock, updateProductStock, updateProductStockInCache, checkLowStock, getProductPrice
  ]);

  logPOSContextStatus('CONTEXT_VALUE_READY', {
    productsCount: products.length,
    subscriptionsCount: subscriptions.length,
    categoriesCount: categories.length,
    hasSettings: !!posSettings,
    isLoading,
    errors
  });

  return (
    <POSDataContext.Provider value={contextValue}>
      {children}
    </POSDataContext.Provider>
  );
};

// =================================================================
// 🎯 Custom Hook لاستخدام POSData المحسن
// =================================================================

export const usePOSData = (): POSData => {
  const context = useContext(POSDataContext);
  if (!context) {
    throw new Error('usePOSData must be used within a POSDataProvider');
  }
  return context;
};

export default POSDataProvider;
