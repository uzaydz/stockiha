import React, { createContext, useContext, useCallback, useMemo, ReactNode, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTenant } from './TenantContext';
import { useAuth } from './AuthContext';
import { useAppInitialization } from './AppInitializationContext';
import { POSSettings } from '@/types/posSettings';
import { deduplicateRequest } from '../lib/cache/deduplication';
import { supabase } from '@/lib/supabase';
import { logPOSContextStatus } from '@/utils/productionDebug';
import UnifiedRequestManager from '@/lib/unifiedRequestManager';
import { addAppEventListener } from '@/lib/events/eventManager';
import { localPosSettingsService } from '@/api/localPosSettingsService';
import {
  getProducts as getOfflineProducts,
  updateProductStock as updateOfflineProductStock
} from '@/api/offlineProductService';
import { inventoryDB, type LocalProduct, type LocalCustomer, type LocalPOSOrder } from '@/database/localDb';
import { getLocalCategories } from '@/lib/api/categories';
import { isAppOnline, markNetworkOnline, markNetworkOffline } from '@/utils/networkStatus';
import { markProductAsSynced, updateLocalProduct } from '@/api/localProductService';

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
  thumbnail_image: string;
  thumbnailImage: string;
  stockQuantity: number;
  stock_quantity: number;
  features?: string[];
  specifications?: Record<string, any> | string;
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
  
  // معلومات مساعدة للباركود
  has_valid_barcodes: boolean;
}

interface POSData {
  // البيانات الأساسية
  products: POSProductWithVariants[];
  subscriptions: SubscriptionService[];
  categories: SubscriptionCategory[];
  productCategories: ProductCategory[];
  posSettings: any;
  organizationApps: OrganizationApp[];
  customers: any[];
  
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
  isCustomersLoading: boolean;
  
  // الأخطاء
  errors: {
    products?: string;
    subscriptions?: string;
    categories?: string;
    posSettings?: string;
    apps?: string;
    customers?: string;
  };
  
  // دوال التحديث
  refreshAll: () => Promise<void>;
  refreshProducts: () => Promise<void>;
  refreshSubscriptions: () => Promise<void>;
  refreshPOSSettings: () => Promise<void>;
  refreshApps: () => Promise<void>;
  refreshCustomers: () => Promise<void>;
  
  // دوال مساعدة للمخزون
  getProductStock: (productId: string, colorId?: string, sizeId?: string) => number;
  updateProductStock: (productId: string, colorId: string | null, sizeId: string | null, newQuantity: number) => Promise<boolean>;
  updateProductStockInCache: (productId: string, colorId: string | null, sizeId: string | null, quantityChange: number) => void;
  checkLowStock: (productId: string) => boolean;
  getProductPrice: (productId: string, quantity: number, colorId?: string, sizeId?: string) => number;
}

const POSDataContext = createContext<POSData | undefined>(undefined);

const isOfflineMode = () => !isAppOnline();

export const arrayOrEmpty = <T,>(value: T[] | null | undefined): T[] =>
  Array.isArray(value) ? value : [];

export const mapLocalProductToPOSProduct = (
  product: LocalProduct
): POSProductWithVariants => {
  const rawColors = Array.isArray((product as any).product_colors) ? (product as any).product_colors : [];
  const processedColors: ProductColor[] = rawColors.map((color: any) => {
    const rawSizes = Array.isArray(color?.product_sizes) ? color.product_sizes : [];
    const processedSizes: ProductSize[] = rawSizes.map((size: any) => ({
      id: size?.id ?? `${product.id}-${color?.id ?? 'variant'}-${size?.size_name ?? 'size'}`,
      color_id: color?.id ?? color?.color_id ?? product.id,
      product_id: product.id,
      size_name: size?.size_name ?? size?.name ?? '',
      quantity: Number(size?.quantity ?? 0),
      price: size?.price,
      barcode: size?.barcode ?? undefined,
      is_default: Boolean(size?.is_default),
      purchase_price: size?.purchase_price
    }));

    return {
      id: color?.id ?? color?.color_id ?? `${product.id}-color`,
      product_id: color?.product_id ?? product.id,
      name: color?.name ?? color?.color_name ?? 'لون',
      color_code: color?.color_code ?? '#000000',
      image_url: color?.image_url,
      quantity: Number(color?.quantity ?? 0),
      price: color?.price,
      barcode: color?.barcode ?? undefined,
      is_default: Boolean(color?.is_default),
      has_sizes: Boolean(color?.has_sizes) || processedSizes.length > 0,
      variant_number: color?.variant_number,
      purchase_price: color?.purchase_price,
      sizes: processedSizes
    };
  });

  const variantsStock = processedColors.reduce((sum, color) => {
    const sizesTotal = (color.sizes || []).reduce((sizeSum, size) => sizeSum + Number(size.quantity ?? 0), 0);
    const colorTotal = color.has_sizes ? sizesTotal : Number(color.quantity ?? 0);
    return sum + colorTotal;
  }, 0);

  const stockQuantity = Number(product.stock_quantity ?? 0);
  const resolvedStock = variantsStock > 0 ? variantsStock : stockQuantity;
  const images = arrayOrEmpty((product as any).images) as string[];
  const thumbnail = (product.thumbnail_image || images[0] || '') as string;

  return {
    id: product.id,
    name: product.name,
    description: product.description ?? '',
    price: Number(product.price ?? 0),
    compareAtPrice: (product as any).compare_at_price ?? undefined,
    sku: product.sku ?? '',
    barcode: product.barcode ?? undefined,
    category: (product as any).category ?? 'أخرى',
    category_id: product.category_id,
    subcategory: (product as any).subcategory ?? undefined,
    subcategory_id: product.subcategory_id,
    brand: product.brand ?? undefined,
    images,
    thumbnail_image: thumbnail,
    thumbnailImage: thumbnail,
    stockQuantity: resolvedStock,
    stock_quantity: resolvedStock,
    features: arrayOrEmpty((product as any).features),
    specifications: typeof (product as any).specifications === 'object' && (product as any).specifications !== null
      ? (product as any).specifications
      : {},
    isDigital: Boolean(product.is_digital),
    isNew: (product as any).is_new,
    isFeatured: (product as any).is_featured,
    createdAt: new Date(product.created_at),
    updatedAt: new Date(product.updated_at || product.created_at),
    has_variants: Boolean((product as any).has_variants) || processedColors.length > 0,
    use_sizes: Boolean((product as any).use_sizes),
    compare_at_price: (product as any).compare_at_price,
    purchase_price: product.purchase_price,
    min_stock_level: product.min_stock_level,
    reorder_level: (product as any).reorder_level,
    reorder_quantity: (product as any).reorder_quantity,
    slug: (product as any).slug,
    show_price_on_landing: (product as any).show_price_on_landing !== false,
    last_inventory_update: (product as any).last_inventory_update,
    is_active: product.is_active !== false,
    wholesale_price: product.wholesale_price,
    partial_wholesale_price: product.partial_wholesale_price,
    min_wholesale_quantity: product.min_wholesale_quantity,
    min_partial_wholesale_quantity: product.min_partial_wholesale_quantity,
    allow_retail: product.allow_retail !== false,
    allow_wholesale: product.allow_wholesale !== false,
    allow_partial_wholesale: product.allow_partial_wholesale !== false,
    colors: processedColors,
    actual_stock_quantity: resolvedStock,
    total_variants_stock: variantsStock,
    low_stock_warning: resolvedStock <= (product.min_stock_level ?? 5),
    has_fast_shipping: Boolean((product as any).has_fast_shipping),
    has_money_back: Boolean((product as any).has_money_back),
    has_quality_guarantee: Boolean((product as any).has_quality_guarantee),
    fast_shipping_text: (product as any).fast_shipping_text,
    money_back_text: (product as any).money_back_text,
    quality_guarantee_text: (product as any).quality_guarantee_text,
    is_sold_by_unit: Boolean((product as any).is_sold_by_unit),
    unit_type: (product as any).unit_type,
    use_variant_prices: Boolean((product as any).use_variant_prices),
    unit_purchase_price: (product as any).unit_purchase_price,
    unit_sale_price: (product as any).unit_sale_price,
    shipping_clone_id: (product as any).shipping_clone_id,
    name_for_shipping: (product as any).name_for_shipping,
    use_shipping_clone: Boolean((product as any).use_shipping_clone),
    shipping_method_type: (product as any).shipping_method_type ?? 'normal',
    created_by_user_id: (product as any).created_by_user_id,
    updated_by_user_id: (product as any).updated_by_user_id,
    has_valid_barcodes:
      Boolean(product.barcode?.trim?.()) ||
      processedColors.some((color) =>
        Boolean(color.barcode) || (color.sizes || []).some((size) => Boolean(size.barcode))
      )
  };
};

export const mapLocalSubscriptionToService = (
  subscription: any
): SubscriptionService => {
  const amount = Number((subscription as any).amount ?? 0);
  const derivedName = (subscription as any).name ?? (subscription as any).plan_name ?? 'خدمة اشتراك';
  return {
    id: subscription.id,
    name: derivedName,
    description: (subscription as any).description ?? '',
    provider: (subscription as any).provider ?? 'offline',
    organization_id: subscription.organization_id,
    category_id: (subscription as any).category_id,
    category: (subscription as any).category,
    logo_url: (subscription as any).logo_url,
    purchase_price: Number((subscription as any).purchase_price ?? amount),
    selling_price: Number((subscription as any).selling_price ?? amount),
    profit_margin: (subscription as any).profit_margin,
    profit_amount: (subscription as any).profit_amount,
    service_type: (subscription as any).service_type ?? 'subscription',
    delivery_method: (subscription as any).delivery_method ?? 'instant',
    total_quantity: Number((subscription as any).total_quantity ?? 0),
    available_quantity: Number((subscription as any).available_quantity ?? 0),
    sold_quantity: Number((subscription as any).sold_quantity ?? 0),
    reserved_quantity: Number((subscription as any).reserved_quantity ?? 0),
    status: subscription.status ?? 'active',
    is_active: (subscription.status ?? '').toLowerCase() !== 'cancelled',
    is_featured: Boolean((subscription as any).is_featured),
    created_at: subscription.created_at ?? new Date().toISOString(),
    updated_at: subscription.updated_at ?? subscription.created_at ?? new Date().toISOString(),
    pricing_options: arrayOrEmpty((subscription as any).pricing_options)
  };
};

export const mapLocalCategoryToSubscriptionCategory = (
  category: Awaited<ReturnType<typeof getLocalCategories>>[number]
): SubscriptionCategory => ({
  id: category.id,
  name: category.name,
  description: category.description,
  icon: category.icon ?? undefined,
  color: (category as any)?.color ?? '#3B82F6',
  organization_id: category.organization_id,
  is_active: category.is_active !== false,
  created_at: category.created_at ?? new Date().toISOString(),
  updated_at: category.updated_at ?? category.created_at ?? new Date().toISOString()
});

// =================================================================
// 🔧 دوال جلب البيانات المحسنة مع تحليل قاعدة البيانات المعمق
// =================================================================

// تحميل ذكي للمنتجات: جميع المنتجات النشطة مع تحسين الباركود
const fetchPOSProductsWithVariants = async (orgId: string): Promise<POSProductWithVariants[]> => {
  return deduplicateRequest(`pos-products-enhanced-${orgId}`, async () => {
    // محاولة البيانات المحلية أولاً في جميع الحالات
    let localProducts: LocalProduct[] = [];
    try {
      localProducts = await getOfflineProducts(orgId);
      console.info('[POSDataContext] تم تحميل المنتجات المحلية من IndexedDB', {
        orgId,
        count: localProducts.length
      });
    } catch (error) {
      console.warn('فشل تحميل المنتجات المحلية:', error);
    }

    // إذا كنا Offline أو لدينا بيانات محلية، استخدمها
    if (isOfflineMode()) {
      markNetworkOffline();
      console.warn('[POSDataContext] وضع عدم الاتصال مفعل - سيتم استخدام البيانات المحلية للمنتجات', {
        orgId,
        hasLocalProducts: localProducts.length > 0
      });
      if (localProducts.length > 0) {
        return localProducts.map(mapLocalProductToPOSProduct);
      }
      // إذا لم تكن هناك بيانات محلية، أرجع مصفوفة فارغة
      return [];
    }
    
    // تنفيذ مباشر بدون مراقبة أداء
    try {
      // استخدام RPC المحسنة لتقليل Egress بنسبة 40-50%
      const { data: allProducts, error: allProductsError } = await (supabase.rpc as any)('get_pos_products_optimized', {
        p_organization_id: orgId,
        p_limit: 50 // زيادة الحد لأن البيانات مضغوطة الآن
      });

      if (allProductsError) {
        logPOSContextStatus('FETCH_ERROR', { error: allProductsError });
        throw allProductsError;
      }

      if (!allProducts || !Array.isArray(allProducts) || allProducts.length === 0) {
        logPOSContextStatus('NO_PRODUCTS', { orgId });
        return [];
      }

      try {
        await inventoryDB.transaction('rw', inventoryDB.products, async () => {
          for (const product of allProducts) {
            const localProduct: LocalProduct = {
              ...(product as any),
              organization_id: (product as any).organization_id || orgId,
              synced: true,
              syncStatus: 'synced' as const,
              lastSyncAttempt: new Date().toISOString(),
              localUpdatedAt: (product as any).updated_at || (product as any).created_at || new Date().toISOString(),
              pendingOperation: undefined,
              conflictResolution: undefined
            };

            await inventoryDB.products.put(localProduct);
          }
        });
      } catch (cacheError) {
        logPOSContextStatus('OFFLINE_PRODUCTS_CACHE_SAVE_ERROR', { error: cacheError });
      }

      // تأخير قصير لتجنب حجب الواجهة
      await new Promise(resolve => setTimeout(resolve, 10));

      // الخطوة 3: معالجة البيانات بشكل متدرج مع نظام تقسيم المهام
      const processedProducts: POSProductWithVariants[] = [];

      // معالجة المنتجات مباشرة
      for (const product of allProducts) {
          // معالجة المنتج الواحد
          const stockQuantity = product.stock_quantity || 0;
          let actualStockQuantity = stockQuantity;

          // معالجة الألوان والمقاسات من variants JSON
          const variantsArray = Array.isArray(product.variants) ? product.variants : [];
          const processedColors = variantsArray.map((color: any) => {
            const processedSizes = (color.sizes || []).map((size: any) => ({
              id: size.id,
              size_name: size.size_name,
              quantity: size.quantity || 0,
              price: size.price,
              barcode: size.barcode?.trim() || undefined,
              is_default: size.is_default,
              purchase_price: size.purchase_price
            }));

            // تحديث إحصائيات المخزون والباركود
            const colorStock = color.quantity || 0;
            const totalVariantsStock = colorStock + processedSizes.reduce((sum: number, size: any) => sum + (size.quantity || 0), 0);
            let hasValidBarcodes = false;

            if (color.barcode?.trim()) hasValidBarcodes = true;
            if (processedSizes.some((size: any) => size.barcode)) hasValidBarcodes = true;

            return {
              id: color.id,
              product_id: product.id,
              name: color.name,
              color_code: color.color_code,
              image_url: color.image_url,
              quantity: colorStock,
              price: color.price,
              barcode: color.barcode?.trim() || undefined,
              is_default: color.is_default,
              has_sizes: color.has_sizes,
              variant_number: color.variant_number,
              purchase_price: color.purchase_price,
              sizes: processedSizes
            };
          });

          // حساب المخزون النهائي مع اعتبار المتغيرات
          if (product.has_variants && processedColors.length > 0) {
            const totalVariantsStock = processedColors.reduce((total, color) => {
              return total + (color.quantity || 0) + 
                     (color.sizes?.reduce((sizeTotal, size) => sizeTotal + (size.quantity || 0), 0) || 0);
            }, 0);
            actualStockQuantity = totalVariantsStock;
          }

          const processedProduct = {
            // خصائص Product الأساسية
            id: product.id,
            name: product.name,
            description: product.description || '',
            price: product.price,
            compareAtPrice: product.compare_at_price,
            sku: product.sku,
            barcode: product.barcode?.trim() || undefined,
            category: product.category_name || 'أخرى',
            category_id: product.category_id,
            subcategory: product.subcategory,
            subcategory_id: product.subcategory_id,
            brand: product.brand,
            images: Array.isArray(product.images) ? product.images : [],
            thumbnailImage: product.thumbnail_image || '',
            stockQuantity: actualStockQuantity,
            stock_quantity: actualStockQuantity,
            features: Array.isArray(product.features) ? product.features : [],
            specifications: typeof product.specifications === 'object' && product.specifications !== null ? product.specifications : {},
            isDigital: product.is_digital || false,
            isNew: product.is_new,
            isFeatured: product.is_featured,
            createdAt: new Date(product.created_at),
            updatedAt: new Date(product.updated_at || product.created_at),
            has_variants: product.has_variants,
            use_sizes: product.use_sizes,
            
            // خصائص إضافية من قاعدة البيانات
            compare_at_price: product.compare_at_price,
            purchase_price: product.purchase_price,
            min_stock_level: product.min_stock_level,
            reorder_level: product.reorder_level,
            reorder_quantity: product.reorder_quantity,
            slug: product.slug,
            show_price_on_landing: product.show_price_on_landing !== false,
            last_inventory_update: product.last_inventory_update,
            is_active: product.is_active,
            
            // خصائص الجملة
            wholesale_price: product.wholesale_price,
            partial_wholesale_price: product.partial_wholesale_price,
            min_wholesale_quantity: product.min_wholesale_quantity,
            min_partial_wholesale_quantity: product.min_partial_wholesale_quantity,
            allow_retail: product.allow_retail !== false,
            allow_wholesale: product.allow_wholesale !== false,
            allow_partial_wholesale: product.allow_partial_wholesale !== false,
            
            // خصائص المتغيرات والألوان المحسنة
            colors: processedColors,
            
            // حساب المخزون الفعلي مع تحسينات
            actual_stock_quantity: actualStockQuantity,
            total_variants_stock: processedColors.reduce((total, color) => {
              return total + (color.quantity || 0) + 
                     (color.sizes?.reduce((sizeTotal, size) => sizeTotal + (size.quantity || 0), 0) || 0);
            }, 0),
            low_stock_warning: actualStockQuantity <= (product.min_stock_level || 5),
            
            // معلومات إضافية
            has_fast_shipping: product.has_fast_shipping || false,
            has_money_back: product.has_money_back || false,
            has_quality_guarantee: product.has_quality_guarantee || false,
            fast_shipping_text: product.fast_shipping_text,
            money_back_text: product.money_back_text,
            quality_guarantee_text: product.quality_guarantee_text,
            
            // معلومات الوحدة
            is_sold_by_unit: product.is_sold_by_unit || false,
            unit_type: product.unit_type,
            use_variant_prices: product.use_variant_prices || false,
            unit_purchase_price: product.unit_purchase_price,
            unit_sale_price: product.unit_sale_price,
            
            // إعدادات الشحن
            shipping_clone_id: product.shipping_clone_id,
            name_for_shipping: product.name_for_shipping,
            use_shipping_clone: product.use_shipping_clone || false,
            shipping_method_type: product.shipping_method_type || 'normal',
            
            // تتبع المستخدم
            created_by_user_id: product.created_by_user_id,
            updated_by_user_id: product.updated_by_user_id,
            
            // معلومات مساعدة للباركود
            has_valid_barcodes: (processedColors.some(c => c.barcode || c.sizes?.some(s => s.barcode))) || !!product.barcode?.trim(),
            thumbnail_image: product.images?.[0] || null // إضافة الحقل المطلوب
          };
          
          processedProducts.push(processedProduct as any);
        }

      logPOSContextStatus('PRODUCTS_PROCESSED', { 
        count: processedProducts.length,
        withVariants: processedProducts.filter(p => p.colors?.length > 0).length
      });

      markNetworkOnline();
      return processedProducts;
    } catch (error) {
      // عند فشل الاتصال بالخادم، استخدم البيانات المحلية كـ fallback
      logPOSContextStatus('FETCH_ERROR_FALLBACK_TO_LOCAL', { error });
      console.error('[POSDataContext] فشل جلب المنتجات من Supabase - استخدام البيانات المحلية إذا كانت متاحة', error);
      markNetworkOffline({ force: true });
      
      // محاولة جلب البيانات المحلية مرة أخرى
      try {
        const fallbackProducts = await getOfflineProducts(orgId);
        console.info('[POSDataContext] تم استرجاع المنتجات المحلية من fallback', {
          orgId,
          count: fallbackProducts.length
        });
        if (fallbackProducts.length > 0) {
          return fallbackProducts.map(mapLocalProductToPOSProduct);
        }
      } catch (fallbackError) {
        console.warn('فشل جلب البيانات المحلية كـ fallback:', fallbackError);
      }
      
      // إذا لم تكن هناك بيانات محلية، أعد رمي الخطأ
      throw error;
    }
  });
};

const fetchPOSSubscriptionsEnhanced = async (orgId: string): Promise<SubscriptionService[]> => {
  return deduplicateRequest(`pos-subscriptions-enhanced-${orgId}`, async () => {
    // محاولة البيانات المحلية أولاً في جميع الحالات
    let localSubscriptions: any[] = [];
    try {
      localSubscriptions = await inventoryDB.organizationSubscriptions
        .where('organization_id')
        .equals(orgId)
        .toArray();
      console.info('[POSDataContext] تم تحميل الاشتراكات المحلية من IndexedDB', {
        orgId,
        count: localSubscriptions.length
      });
    } catch (error) {
      console.warn('فشل تحميل الاشتراكات المحلية:', error);
    }

    // إذا كنا Offline أو لدينا بيانات محلية، استخدمها
    if (isOfflineMode()) {
      markNetworkOffline();
      console.warn('[POSDataContext] وضع عدم الاتصال مفعل - سيتم استخدام البيانات المحلية للاشتراكات', {
        orgId,
        hasLocalSubscriptions: localSubscriptions.length > 0
      });
      if (localSubscriptions.length > 0) {
        return localSubscriptions.map(mapLocalSubscriptionToService) as SubscriptionService[];
      }
      return [];
    }
    
    try {
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

      markNetworkOnline();
      return servicesWithPricing as any;
    } catch (error) {
      // عند فشل الاتصال بالخادم، استخدم البيانات المحلية كـ fallback
      logPOSContextStatus('FETCH_SUBSCRIPTIONS_ERROR_FALLBACK_TO_LOCAL', { error });
      console.error('[POSDataContext] فشل جلب الاشتراكات من Supabase - استخدام البيانات المحلية إذا كانت متاحة', error);
      markNetworkOffline({ force: true });
      
      // محاولة جلب البيانات المحلية مرة أخرى
      try {
        const fallbackSubscriptions = await inventoryDB.organizationSubscriptions
          .where('organization_id')
          .equals(orgId)
          .toArray();
        console.info('[POSDataContext] تم استرجاع الاشتراكات المحلية من fallback', {
          orgId,
          count: fallbackSubscriptions.length
        });
        if (fallbackSubscriptions.length > 0) {
          return fallbackSubscriptions.map(mapLocalSubscriptionToService) as SubscriptionService[];
        }
      } catch (fallbackError) {
        console.warn('فشل جلب الاشتراكات المحلية كـ fallback:', fallbackError);
      }
      
      // إذا لم تكن هناك بيانات محلية، أعد رمي الخطأ
      throw error;
    }
  });
};

const fetchPOSCategoriesEnhanced = async (orgId: string): Promise<SubscriptionCategory[]> => {
  return deduplicateRequest(`pos-categories-enhanced-${orgId}`, async () => {
    // محاولة البيانات المحلية أولاً في جميع الحالات
    let localCategories: Awaited<ReturnType<typeof getLocalCategories>> = [];
    try {
      localCategories = await getLocalCategories();
      console.info('[POSDataContext] تم تحميل الفئات المحلية من IndexedDB', {
        count: localCategories.length
      });
    } catch (error) {
      console.warn('فشل تحميل الفئات المحلية:', error);
    }

    // إذا كنا Offline أو لدينا بيانات محلية، استخدمها
    if (isOfflineMode()) {
      markNetworkOffline();
      console.warn('[POSDataContext] وضع عدم الاتصال مفعل - سيتم استخدام البيانات المحلية للفئات', {
        orgId,
        hasLocalCategories: localCategories.length > 0
      });
      if (localCategories.length > 0) {
        return localCategories
          .filter(category =>
            category.organization_id === orgId &&
            (!category.type || category.type === 'product' || category.type === 'service')
          )
          .map(mapLocalCategoryToSubscriptionCategory);
      }
      return [];
    }
    
    try {
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

      const remoteCategories = (data || []).map(cat => ({
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
      markNetworkOnline();
      return remoteCategories;
    } catch (error) {
      // عند فشل الاتصال بالخادم، استخدم البيانات المحلية كـ fallback
      logPOSContextStatus('FETCH_CATEGORIES_ERROR_FALLBACK_TO_LOCAL', { error });
      console.error('[POSDataContext] فشل جلب الفئات من Supabase - استخدام البيانات المحلية إذا كانت متاحة', error);
      markNetworkOffline({ force: true });
      
      // محاولة جلب البيانات المحلية مرة أخرى
      try {
        const fallbackCategories = await getLocalCategories();
        console.info('[POSDataContext] تم استرجاع الفئات المحلية من fallback', {
          count: fallbackCategories.length
        });
        if (fallbackCategories.length > 0) {
          return fallbackCategories
            .filter(category =>
              category.organization_id === orgId &&
              (!category.type || category.type === 'product' || category.type === 'service')
            )
            .map(mapLocalCategoryToSubscriptionCategory);
        }
      } catch (fallbackError) {
        console.warn('فشل جلب الفئات المحلية كـ fallback:', fallbackError);
      }
      
      // إذا لم تكن هناك بيانات محلية، أعد رمي الخطأ
      throw error;
    }
  });
};

const fetchProductCategories = async (orgId: string): Promise<ProductCategory[]> => {
  return deduplicateRequest(`pos-product-categories-${orgId}`, async () => {
    // محاولة البيانات المحلية أولاً في جميع الحالات
    let localCategories: Awaited<ReturnType<typeof getLocalCategories>> = [];
    try {
      localCategories = await getLocalCategories();
      console.info('[POSDataContext] تم تحميل فئات المنتجات المحلية من IndexedDB', {
        count: localCategories.length
      });
    } catch (error) {
      console.warn('فشل تحميل فئات المنتجات المحلية:', error);
    }

    // إذا كنا Offline أو لدينا بيانات محلية، استخدمها
    if (isOfflineMode()) {
      markNetworkOffline();
      console.warn('[POSDataContext] وضع عدم الاتصال مفعل - سيتم استخدام البيانات المحلية لفئات المنتجات', {
        orgId,
        hasLocalCategories: localCategories.length > 0
      });
      if (localCategories.length > 0) {
        return localCategories
          .filter(category =>
            category.organization_id === orgId &&
            (!category.type || category.type === 'product')
          )
          .map(category => ({
            id: category.id,
            name: category.name,
            description: category.description,
            organization_id: category.organization_id,
            is_active: category.is_active !== false,
            created_at: category.created_at ?? new Date().toISOString(),
            updated_at: category.updated_at ?? category.created_at ?? new Date().toISOString()
          }));
      }
      return [];
    }

    try {
      // استخدام UnifiedRequestManager للحد من الطلبات المكررة
      const data = await UnifiedRequestManager.getProductCategories(orgId);
      
      // تحويل البيانات إلى ProductCategory format
      const remoteCategories = (data || []).map(cat => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        organization_id: cat.organization_id,
        is_active: cat.is_active,
        created_at: cat.created_at,
        updated_at: cat.updated_at
      }));
      markNetworkOnline();
      return remoteCategories;
    } catch (error) {
      // عند فشل الاتصال بالخادم، استخدم البيانات المحلية كـ fallback
      logPOSContextStatus('FETCH_PRODUCT_CATEGORIES_ERROR_FALLBACK_TO_LOCAL', { error });
      console.error('[POSDataContext] فشل جلب فئات المنتجات من Supabase - استخدام البيانات المحلية إذا كانت متاحة', error);
      markNetworkOffline({ force: true });
      
      // محاولة جلب البيانات المحلية مرة أخرى
      try {
        const fallbackCategories = await getLocalCategories();
        console.info('[POSDataContext] تم استرجاع فئات المنتجات المحلية من fallback', {
          count: fallbackCategories.length
        });
        if (fallbackCategories.length > 0) {
          return fallbackCategories
            .filter(category =>
              category.organization_id === orgId &&
              (!category.type || category.type === 'product')
            )
            .map(category => ({
              id: category.id,
              name: category.name,
              description: category.description,
              organization_id: category.organization_id,
              is_active: category.is_active !== false,
              created_at: category.created_at ?? new Date().toISOString(),
              updated_at: category.updated_at ?? category.created_at ?? new Date().toISOString()
            }));
        }
      } catch (fallbackError) {
        console.warn('فشل جلب فئات المنتجات المحلية كـ fallback:', fallbackError);
      }
      
      // إذا لم تكن هناك بيانات محلية، أعد رمي الخطأ
      throw error;
    }
  });
};

const fetchPOSSettingsEnhanced = async (orgId: string): Promise<any> => {
  return deduplicateRequest(`pos-settings-enhanced-${orgId}`, async () => {
    // محاولة البيانات المحلية أولاً في جميع الحالات
    let offlineSettings: any = null;
    try {
      offlineSettings = await localPosSettingsService.get(orgId);
      console.info('[POSDataContext] تم تحميل إعدادات POS المحلية من IndexedDB', {
        orgId,
        hasSettings: Boolean(offlineSettings)
      });
    } catch (error) {
      console.warn('فشل تحميل إعدادات POS المحلية:', error);
    }

    const isOnline = isAppOnline();

    if (!isOnline) {
      markNetworkOffline();
      console.warn('[POSDataContext] وضع عدم الاتصال مفعل - سيتم استخدام إعدادات POS المحلية', {
        orgId,
        hasLocalSettings: Boolean(offlineSettings)
      });
      if (offlineSettings) {
        return offlineSettings;
      }
      return null;
    }

    try {
      // محاولة RPC function المحسنة أولاً
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_pos_settings', { p_organization_id: orgId });

      if (!rpcError && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
        const remote = rpcData[0] as any;
        await localPosSettingsService.save({ ...remote, updated_at: remote?.updated_at || new Date().toISOString() });
        markNetworkOnline();
        return remote;
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
        await localPosSettingsService.save({ ...directData, updated_at: directData.updated_at || new Date().toISOString() });
        markNetworkOnline();
        return directData;
      }

      // إنشاء إعدادات افتراضية
      try {
        const { data: newSettings, error: createError } = await supabase
          .rpc('initialize_pos_settings', { p_organization_id: orgId });
        
        if (!createError && newSettings && typeof newSettings === 'object') {
          await localPosSettingsService.save({ ...(newSettings as any), updated_at: new Date().toISOString() });
          markNetworkOnline();
          return newSettings as POSSettings;
        }
      } catch (createRpcError) {
      }
      
      return null;
    } catch (error) {
      // عند فشل الاتصال بالخادم، استخدم البيانات المحلية كـ fallback
      logPOSContextStatus('FETCH_POS_SETTINGS_ERROR_FALLBACK_TO_LOCAL', { error });
      console.error('[POSDataContext] فشل جلب إعدادات POS من Supabase - استخدام البيانات المحلية إذا كانت متاحة', error);
      markNetworkOffline({ force: true });
      
      // محاولة جلب البيانات المحلية مرة أخرى
      try {
        const fallbackSettings = await localPosSettingsService.get(orgId);
        console.info('[POSDataContext] تم استرجاع إعدادات POS المحلية من fallback', {
          orgId,
          hasSettings: Boolean(fallbackSettings)
        });
        if (fallbackSettings) {
          return fallbackSettings;
        }
      } catch (fallbackError) {
        console.warn('فشل جلب إعدادات POS المحلية كـ fallback:', fallbackError);
      }
      
      // إذا لم تكن هناك بيانات محلية، أعد رمي الخطأ
      throw error;
    }
  });
};

const fetchOrganizationAppsEnhanced = async (orgId: string): Promise<OrganizationApp[]> => {
  return deduplicateRequest(`pos-org-apps-enhanced-${orgId}`, async () => {
    if (isOfflineMode()) {
      return [
        {
          id: 'offline-pos',
          organization_id: orgId,
          app_id: 'pos-system',
          is_enabled: true,
          installed_at: new Date().toISOString(),
          configuration: {}
        },
        {
          id: 'offline-subscription',
          organization_id: orgId,
          app_id: 'subscription-services',
          is_enabled: true,
          installed_at: new Date().toISOString(),
          configuration: {}
        }
      ];
    }
    
    try {
      // ✅ تم تعطيل الاستدعاء المباشر - البيانات متوفرة من AppInitializationContext
      console.log('⚠️ [POSDataContext] fetchOrganizationApps - استخدام بيانات وهمية (البيانات من AppInitializationContext)');
      
      // البيانات متوفرة من AppInitializationContext، لا حاجة لاستدعاء منفصل
      // const { data, error } = await supabase
      //   .from('organizations')
      //   .select('id, name')
      //   .eq('id', orgId)
      //   .single();

      // if (error || !data) {
      //   return [];
      // }

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

// دالة موحدة لجلب البيانات مع cache ذكي
const fetchPOSCompleteData = async (orgId: string): Promise<{
  products: POSProductWithVariants[];
  subscriptions: SubscriptionService[];
  categories: SubscriptionCategory[];
  productCategories: ProductCategory[];
  posSettings: any;
  organizationApps: OrganizationApp[];
  users: any[];
  customers: any[];
  orderStats: any;
  errors: Record<string, string>;
}> => {
  // منع الاستدعاءات المتكررة للمنظمة نفسها
  const cacheKey = `pos-complete-data-${orgId}`;
  const existingRequest = (window as any)[`fetching_${cacheKey}`];
  
  if (existingRequest) {
    return await existingRequest;
  }

  // إنشاء Promise جديد ومشاركته
  const fetchPromise = (async () => {
    try {

      // تنفيذ جميع الطلبات بالتوازي مع error handling محسن
      const [
        productsResult,
        subscriptionsResult,
        categoriesResult,
        productCategoriesResult,
        posSettingsResult,
        organizationAppsResult,
        usersResult,
        customersResult,
        orderStatsResult
      ] = await Promise.allSettled([
        deduplicateRequest(`products-${orgId}`, () => fetchPOSProductsWithVariants(orgId)),
        deduplicateRequest(`subscriptions-${orgId}`, () => fetchPOSSubscriptionsEnhanced(orgId)),
        deduplicateRequest(`categories-${orgId}`, () => fetchPOSCategoriesEnhanced(orgId)),
        deduplicateRequest(`product-categories-${orgId}`, () => fetchProductCategories(orgId)),
        deduplicateRequest(`pos-settings-${orgId}`, () => fetchPOSSettingsEnhanced(orgId)),
        deduplicateRequest(`organization-apps-${orgId}`, () => fetchOrganizationAppsEnhanced(orgId)),
        deduplicateRequest(`users-${orgId}`, () => fetchPOSUsers(orgId)),
        deduplicateRequest(`customers-${orgId}`, () => fetchPOSCustomers(orgId)),
        deduplicateRequest(`order-stats-${orgId}`, () => fetchPOSOrderStats(orgId))
      ]);

      // معالجة النتائج مع تسجيل الأخطاء
      const errors: Record<string, string> = {};
      
      const products = productsResult.status === 'fulfilled' ? productsResult.value : [];
      if (productsResult.status === 'rejected') {
        errors.products = 'فشل في جلب المنتجات';
      }

      const subscriptions = subscriptionsResult.status === 'fulfilled' ? subscriptionsResult.value : [];
      if (subscriptionsResult.status === 'rejected') {
        errors.subscriptions = 'فشل في جلب الاشتراكات';
      }

      const categories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : [];
      if (categoriesResult.status === 'rejected') {
        errors.categories = 'فشل في جلب فئات الاشتراكات';
      }

      const productCategories = productCategoriesResult.status === 'fulfilled' ? productCategoriesResult.value : [];
      if (productCategoriesResult.status === 'rejected') {
        errors.productCategories = 'فشل في جلب فئات المنتجات';
      }

      const posSettings = posSettingsResult.status === 'fulfilled' ? posSettingsResult.value : null;
      if (posSettingsResult.status === 'rejected') {
        errors.posSettings = 'فشل في جلب إعدادات نقطة البيع';
      }

      const organizationApps = organizationAppsResult.status === 'fulfilled' ? organizationAppsResult.value : [];
      if (organizationAppsResult.status === 'rejected') {
        errors.organizationApps = 'فشل في جلب تطبيقات المؤسسة';
      }

      const users = usersResult.status === 'fulfilled' ? usersResult.value : [];
      if (usersResult.status === 'rejected') {
        errors.users = 'فشل في جلب المستخدمين';
      }

      const customers = customersResult.status === 'fulfilled' ? customersResult.value : [];
      if (customersResult.status === 'rejected') {
        errors.customers = 'فشل في جلب العملاء';
      }

      const orderStats = orderStatsResult.status === 'fulfilled' ? orderStatsResult.value : {};
      if (orderStatsResult.status === 'rejected') {
        errors.orderStats = 'فشل في جلب إحصائيات الطلبات';
      }

      const result = {
        products,
        subscriptions,
        categories,
        productCategories,
        posSettings,
        organizationApps,
        users,
        customers,
        orderStats,
        errors
      };

      return result;
    } catch (error) {
      throw error;
    } finally {
      // تنظيف العلامة
      delete (window as any)[`fetching_${cacheKey}`];
    }
  })();

  // حفظ Promise العالمي
  (window as any)[`fetching_${cacheKey}`] = fetchPromise;

  return await fetchPromise;
};

// ✅ دوال مساعدة للجلب الفردي - تم تعطيل الاستدعاء المباشر
const fetchPOSUsers = async (orgId: string): Promise<any[]> => {
  if (isOfflineMode()) {
    return [];
  }

  try {
    // ✅ تم تعطيل الاستدعاء المباشر - البيانات متوفرة من AppInitializationContext
    console.log('⚠️ [POSDataContext] fetchPOSUsers - البيانات متوفرة من AppInitializationContext');
    
    // البيانات متوفرة من AppInitializationContext.employees
    // const { data, error } = await supabase
    //   .from('users')
    //   .select('id, name, email, role')
    //   .eq('organization_id', orgId)
    //   .eq('is_active', true)
    //   .order('name', { ascending: true })
    //   .limit(50);

    // if (error) throw error;
    // return data || [];
    
    return []; // سيتم استخدام البيانات من AppInitializationContext
  } catch (error) {
    return [];
  }
};

const fetchPOSCustomers = async (orgId: string): Promise<any[]> => {
  if (isOfflineMode()) {
    let localCustomers: LocalCustomer[] = [];
    try {
      // ✅ استخدام SQL query مباشرة في Electron
      if (window.electronAPI?.db) {
        console.log('[POSDataContext] جلب العملاء من SQLite (offline)');
        const result = await window.electronAPI.db.query(
          'SELECT * FROM customers WHERE organization_id = ? ORDER BY name ASC',
          [orgId]
        );
        
        if (result.success && result.data) {
          localCustomers = result.data.map((c: any) => ({
            ...c,
            synced: c.synced === 1
          }));
        }
      } else {
        // Fallback للمتصفح
        localCustomers = await inventoryDB.customers
          .where('organization_id')
          .equals(orgId)
          .toArray();
      }
    } catch (error) {
      console.warn('[POSDataContext] فشل جلب العملاء من SQLite:', error);
      localCustomers = [];
    }

    console.log(`[POSDataContext] تم جلب ${localCustomers.length} عميل من القاعدة المحلية`);
    return localCustomers.map(customer => ({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      created_at: customer.created_at ?? new Date().toISOString(),
      updated_at: customer.updated_at ?? customer.created_at ?? new Date().toISOString(),
      organization_id: customer.organization_id
    }));
  }

  try {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, phone, email, created_at, updated_at, organization_id')
      .eq('organization_id', orgId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    return [];
  }
};

const fetchPOSOrderStats = async (orgId: string): Promise<any> => {
  if (isOfflineMode()) {
    let localOrders: LocalPOSOrder[] = [];
    try {
      localOrders = await inventoryDB.posOrders
        .where('organization_id')
        .equals(orgId)
        .toArray();
    } catch (error) {
      localOrders = [];
    }

    if (localOrders.length === 0) {
      return {
        total_orders: 0,
        total_revenue: 0,
        completed_orders: 0,
        pending_orders: 0,
        pending_payment_orders: 0,
        cancelled_orders: 0,
        cash_orders: 0,
        card_orders: 0,
        avg_order_value: 0,
        today_orders: 0,
        today_revenue: 0,
        fully_returned_orders: 0,
        partially_returned_orders: 0,
        total_returned_amount: 0,
        effective_revenue: 0,
        return_rate: 0
      };
    }

    const totalOrders = localOrders.length;
    const totalRevenue = localOrders.reduce((sum, order) => sum + Number(order.total ?? 0), 0);
    const completedOrders = localOrders.filter(order => (order.status ?? '').toLowerCase() === 'completed' || (order.payment_status ?? '').toLowerCase() === 'paid').length;
    const pendingOrders = localOrders.filter(order => (order.status ?? '').toLowerCase() === 'pending').length;
    const pendingPaymentOrders = localOrders.filter(order => (order.payment_status ?? '').toLowerCase() === 'pending').length;
    const cancelledOrders = localOrders.filter(order => (order.status ?? '').toLowerCase() === 'cancelled').length;
    const cashOrders = localOrders.filter(order => (order.payment_method ?? '').toLowerCase() === 'cash').length;
    const cardOrders = localOrders.filter(order => (order.payment_method ?? '').toLowerCase() === 'card').length;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setHours(23, 59, 59, 999);

    const todayOrdersList = localOrders.filter(order => {
      const createdAt = new Date(order.created_at);
      return createdAt >= startOfToday && createdAt <= endOfToday;
    });

    const todayOrders = todayOrdersList.length;
    const todayRevenue = todayOrdersList.reduce((sum, order) => sum + Number(order.total ?? 0), 0);

    return {
      total_orders: totalOrders,
      total_revenue: totalRevenue,
      completed_orders: completedOrders,
      pending_orders: pendingOrders,
      pending_payment_orders: pendingPaymentOrders,
      cancelled_orders: cancelledOrders,
      cash_orders: cashOrders,
      card_orders: cardOrders,
      avg_order_value: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      today_orders: todayOrders,
      today_revenue: todayRevenue,
      fully_returned_orders: 0,
      partially_returned_orders: 0,
      total_returned_amount: 0,
      effective_revenue: totalRevenue,
      return_rate: 0
    };
  }

  try {
    const { data, error } = await supabase
      .rpc('get_pos_order_stats', { p_organization_id: orgId });

    if (error) throw error;
    return data || {};
  } catch (error) {
    return {};
  }
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
    staleTime: 30 * 60 * 1000, // 30 دقيقة - زيادة كبيرة
    gcTime: 60 * 60 * 1000, // 60 دقيقة
    retry: 1,
    retryDelay: 3000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
  });

  // React Query لخدمات الاشتراك - محسنة
  const {
    data: subscriptions = [],
    isLoading: isSubscriptionsLoading,
    error: subscriptionsError
  } = useQuery({
    queryKey: ['pos-subscriptions-enhanced', orgId],
    queryFn: () => fetchPOSSubscriptionsEnhanced(orgId!),
    enabled: !!orgId,
    staleTime: 20 * 60 * 1000, // 20 دقيقة
    gcTime: 40 * 60 * 1000, // 40 دقيقة
    retry: 1,
    retryDelay: 2000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
  });

  // React Query لفئات الخدمات - محسنة
  const {
    data: categories = [],
    isLoading: isCategoriesLoading,
    error: categoriesError
  } = useQuery({
    queryKey: ['pos-categories-enhanced', orgId],
    queryFn: () => fetchPOSCategoriesEnhanced(orgId!),
    enabled: !!orgId,
    staleTime: 45 * 60 * 1000, // 45 دقيقة - الفئات لا تتغير كثيراً
    gcTime: 90 * 60 * 1000, // 90 دقيقة
    retry: 1,
    retryDelay: 2000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
  });

  // React Query لفئات المنتجات - إضافة جديدة لحل مشكلة عدم ظهور الفئات
  const {
    data: productCategories = [],
    isLoading: isProductCategoriesLoading,
    error: productCategoriesError
  } = useQuery({
    queryKey: ['pos-product-categories', orgId],
    queryFn: () => fetchProductCategories(orgId!),
    enabled: !!orgId,
    staleTime: 30 * 60 * 1000, // 30 دقيقة
    gcTime: 60 * 60 * 1000, // 60 دقيقة
    retry: 1,
    retryDelay: 2000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
  });

  // إعدادات POS - محسنة
  const {
    data: posSettings,
    isLoading: isPOSSettingsLoading,
    error: posSettingsError
  } = useQuery({
    queryKey: ['pos-settings-enhanced', orgId],
    queryFn: () => fetchPOSSettingsEnhanced(orgId!),
    enabled: !!orgId,
    staleTime: 60 * 60 * 1000, // 60 دقيقة - الإعدادات لا تتغير كثيراً
    gcTime: 120 * 60 * 1000, // 120 دقيقة
    retry: 1,
    retryDelay: 2000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
  });

  // تطبيقات المؤسسة - محسنة
  const {
    data: organizationApps = [],
    isLoading: isAppsLoading,
    error: appsError
  } = useQuery({
    queryKey: ['pos-organization-apps', orgId],
    queryFn: () => fetchOrganizationAppsEnhanced(orgId!),
    enabled: !!orgId,
    staleTime: 30 * 60 * 1000, // 30 دقيقة
    gcTime: 60 * 60 * 1000, // 60 دقيقة
    retry: 1,
    retryDelay: 2000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
  });

  // العملاء - تحميل عند الطلب
  const {
    data: customers = [],
    isLoading: isCustomersLoading,
    error: customersError
  } = useQuery({
    queryKey: ['pos-customers-light', orgId],
    queryFn: () => fetchPOSCustomers(orgId!),
    enabled: !!orgId, // ✅ تفعيل التحميل عند توفر orgId
    staleTime: 15 * 60 * 1000, // 15 دقيقة
    gcTime: 30 * 60 * 1000, // 30 دقيقة
    retry: 1,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
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
    const keys: ReadonlyArray<readonly unknown[]> = [
      ['pos-products-enhanced'],
      ['pos-subscriptions-enhanced'],
      ['pos-categories-enhanced'],
      ['pos-product-categories'],
      ['pos-settings-enhanced'],
      ['pos-organization-apps'],
      ['pos-customers-light'],
      ['unified-pos-data'],
      ['unified-pos-orders']
    ];

    await Promise.all(
      keys.map((key) =>
        queryClient.invalidateQueries({ queryKey: key })
      )
    );

    await queryClient.refetchQueries({ queryKey: ['pos-products-enhanced'] });
  }, [queryClient]);

  const refreshProducts = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['pos-products-enhanced'] });
  }, [queryClient]);

  const refreshSubscriptions = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['pos-subscriptions-enhanced'] });
    await queryClient.refetchQueries({ queryKey: ['pos-subscriptions-enhanced'] });
  }, [queryClient]);

  const refreshPOSSettings = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['pos-settings-enhanced'] });
  }, [queryClient]);

  const refreshApps = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['pos-organization-apps'] });
  }, [queryClient]);

  const refreshCustomers = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['pos-customers-light'] });
    await queryClient.refetchQueries({ queryKey: ['pos-customers-light'] });
  }, [queryClient]);

  // مستمع لتحديث العملاء عند إضافة عميل جديد
  // استخدام useRef للاحتفاظ بالقيم الحالية لمنع Memory Leak
  const orgIdRef = useRef(orgId);
  const queryClientRef = useRef(queryClient);

  // تحديث الـ refs عند تغيير القيم
  useEffect(() => {
    orgIdRef.current = orgId;
    queryClientRef.current = queryClient;
  }, [orgId, queryClient]);

  useEffect(() => {
    // استخدام AbortController لإلغاء العمليات المعلقة
    const abortController = new AbortController();
    let pendingOperations: Promise<any>[] = [];

    const handleCustomersUpdate = async () => {
      // تحقق من الإلغاء
      if (abortController.signal.aborted) {
        return;
      }

      try {
        const currentOrgId = orgIdRef.current;
        const currentQueryClient = queryClientRef.current;

        // إجبار إعادة تحميل البيانات مباشرة
        const invalidatePromise = currentQueryClient.invalidateQueries({
          queryKey: ['pos-customers-light', currentOrgId],
          exact: true
        });

        // تتبع العملية
        pendingOperations.push(invalidatePromise);
        await invalidatePromise;

        // تحقق مرة أخرى قبل refetch
        if (abortController.signal.aborted) {
          return;
        }

        // إعادة تحميل البيانات
        const refetchPromise = currentQueryClient.refetchQueries({
          queryKey: ['pos-customers-light', currentOrgId],
          exact: true
        });

        pendingOperations.push(refetchPromise);
        await refetchPromise;

      } catch (error) {
        // تجاهل الأخطاء إذا تم الإلغاء
        if (!abortController.signal.aborted) {
          console.error('[POSDataContext] Error updating customers:', error);
        }
      }
    };

    const unsubscribe = addAppEventListener<{ organizationId?: string }>(
      'customers-updated',
      async (detail) => {
        const currentOrgId = orgIdRef.current;
        if (detail?.organizationId && detail.organizationId !== currentOrgId) {
          return;
        }
        await handleCustomersUpdate();
      }
    );

    return () => {
      // إلغاء جميع العمليات المعلقة
      abortController.abort();

      // إلغاء الاشتراك
      unsubscribe();

      // تنظيف قائمة العمليات
      pendingOperations = [];
    };
  }, []); // dependency array فارغ لأننا نستخدم refs

  // مراقبة حالة الاتصال
  useEffect(() => {
    const handleOnline = () => {
      console.log('🟢 عاد الاتصال - إعادة جلب البيانات');
      queryClient.invalidateQueries({ queryKey: ['pos-products-enhanced'] });
      queryClient.refetchQueries({ queryKey: ['pos-products-enhanced'] });
    };

    const handleOffline = () => {
      console.log('🔴 فقدان الاتصال - استخدام البيانات المحلية');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queryClient]);

  // دالة خاصة لتحديث المخزون في cache مباشرة (optimistic update)
  const updateProductStockInCache = useCallback((
    productId: string,
    colorId: string | null,
    sizeId: string | null,
    quantityChange: number // تغيير الاسم لتوضيح أنه تغيير وليس دائماً تقليل
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
                    // quantityChange موجبة = إضافة للمخزون، سالبة = إنقاص من المخزون
                    const newQuantity = Math.max(0, size.quantity + quantityChange);
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
              // quantityChange موجبة = إضافة للمخزون، سالبة = إنقاص من المخزون
              const newQuantity = Math.max(0, color.quantity + quantityChange);
              return { ...color, quantity: newQuantity };
            }
            return color;
          }) || [];
        } else {
          // تحديث المنتج الأساسي
          // quantityChange موجبة = إضافة للمخزون، سالبة = إنقاص من المخزون
          const newQuantity = Math.max(0, product.stock_quantity + quantityChange);
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
    if (!orgId) {
      return false;
    }

    const currentQuantity = getProductStock(productId, colorId ?? undefined, sizeId ?? undefined);
    if (currentQuantity === newQuantity) {
      return true;
    }

    const quantityDelta = newQuantity - currentQuantity;
    const now = new Date().toISOString();
    const productRecord = products.find((item) => item.id === productId);

    const buildUpdatedVariants = () => {
      if (!productRecord?.colors) {
        return {
          colors: productRecord?.colors ?? [],
          totalStock: newQuantity
        };
      }

      const updatedColors = productRecord.colors.map((color) => {
        if (!colorId || color.id !== colorId) {
          return color;
        }

        if (sizeId && color.has_sizes) {
          const updatedSizes = (color.sizes || []).map((size) =>
            size.id === sizeId
              ? {
                  ...size,
                  quantity: newQuantity
                }
              : size
          );

          const recalculatedColorQuantity = updatedSizes.reduce(
            (sum, size) => sum + (size.quantity ?? 0),
            0
          );

          return {
            ...color,
            sizes: updatedSizes,
            quantity: recalculatedColorQuantity
          };
        }

        return {
          ...color,
          quantity: newQuantity
        };
      });

      const totalStock = updatedColors.reduce((sum, color) => {
        const colorStock = color.has_sizes && Array.isArray(color.sizes)
          ? color.sizes.reduce((sizeSum, size) => sizeSum + (size.quantity ?? 0), 0)
          : color.quantity ?? 0;
        return sum + (colorStock || 0);
      }, 0);

      return {
        colors: updatedColors as any,
        totalStock
      };
    };

    const applyLocalVariantUpdate = async (synced: boolean) => {
      if (!productRecord) return;
      const variantSnapshot = buildUpdatedVariants();
      await updateLocalProduct(productId, {
        stock_quantity: variantSnapshot.totalStock,
        updated_at: now,
        localUpdatedAt: now,
        synced: synced ? true : false
      } as any);
    };

    try {
      if (!colorId && !sizeId) {
        if (!isAppOnline()) {
          if (quantityDelta < 0) {
            await updateOfflineProductStock(orgId, productId, Math.abs(quantityDelta), true);
          } else {
            await updateOfflineProductStock(orgId, productId, Math.abs(quantityDelta), false);
          }
          await updateProductStockInCache(productId, null, null, quantityDelta);
          return true;
        }

        const { error } = await supabase
          .from('products')
          .update({
            stock_quantity: newQuantity,
            last_inventory_update: now
          })
          .eq('id', productId);

        if (error) throw error;

        await markProductAsSynced(productId, {
          stock_quantity: newQuantity,
          updated_at: now
        } as any);

        await updateProductStockInCache(productId, null, null, quantityDelta);
        return true;
      }

      if (!isAppOnline()) {
        await applyLocalVariantUpdate(false);
        await updateProductStockInCache(productId, colorId, sizeId, quantityDelta);
        return true;
      }

      if (sizeId && colorId) {
        const { error } = await supabase
          .from('product_sizes')
          .update({ quantity: newQuantity })
          .eq('id', sizeId);

        if (error) throw error;
      } else if (colorId) {
        const { error } = await supabase
          .from('product_colors')
          .update({ quantity: newQuantity })
          .eq('id', colorId);

        if (error) throw error;
      }

      await applyLocalVariantUpdate(true);
      await markProductAsSynced(productId, {
        updated_at: now
      });
      await updateProductStockInCache(productId, colorId, sizeId, quantityDelta);

      return true;
    } catch (error) {
      console.error('[POSDataContext] فشل تحديث المخزون:', error);
      return false;
    }
  }, [getProductStock, orgId, products, updateProductStockInCache]);

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
                   isPOSSettingsLoading || isAppsLoading || isProductCategoriesLoading;

  // تجميع الأخطاء
  const errors = useMemo(() => ({
    products: productsError?.message,
    subscriptions: subscriptionsError?.message,
    categories: categoriesError?.message,
    productCategories: productCategoriesError?.message,
    posSettings: posSettingsError?.message,
    apps: appsError?.message,
    customers: customersError?.message,
  }), [productsError, subscriptionsError, categoriesError, productCategoriesError, posSettingsError, appsError, customersError]);

  // قيمة Context المحسنة
  const contextValue = useMemo<POSData>(() => ({
    // البيانات
    products,
    subscriptions,
    categories,
    productCategories, // إصلاح: استخدام فئات المنتجات الفعلية من الـ query
    posSettings,
    organizationApps,
    customers,
    
    // إحصائيات المخزون
    inventoryStats,
    
    // حالات التحميل
    isLoading,
    isProductsLoading,
    isSubscriptionsLoading,
    isCategoriesLoading,
    isPOSSettingsLoading,
    isAppsLoading,
    isCustomersLoading,
    
    // الأخطاء
    errors,
    
    // الوظائف
    refreshAll,
    refreshProducts,
    refreshSubscriptions,
    refreshPOSSettings,
    refreshApps,
    refreshCustomers,
    
    // دوال المخزون
    getProductStock,
    updateProductStock,
    updateProductStockInCache,
    checkLowStock,
    getProductPrice,
  }), [
    products, subscriptions, categories, productCategories, posSettings, organizationApps,
    inventoryStats, isLoading, isProductsLoading, isSubscriptionsLoading, 
    isCategoriesLoading, isProductCategoriesLoading, isPOSSettingsLoading, isAppsLoading, errors,
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
