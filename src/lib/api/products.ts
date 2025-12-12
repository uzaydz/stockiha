import { supabase } from '@/lib/supabase';
import type { Database, TablesInsert, TablesUpdate } from '@/types/database.types';
import { toast } from 'react-hot-toast';
import { ProductFormValues } from '@/types/product';
import { updateProductStockQuantity } from './productVariants';
import { cacheManager } from '@/lib/cache/CentralCacheManager';
import { queryClient } from '@/lib/config/queryClient';
import UnifiedRequestManager from '@/lib/unifiedRequestManager';
import { 
  ProductOperationResult, 
  validateRPCResult,
  CreateProductCompleteArgs,
  UpdateProductCompleteArgs 
} from '@/types/product-functions';

// نظام منع الطلبات المتزامنة المتكررة - محسن
const ongoingRequests = new Map<string, Promise<any>>();
const lastRequestTime = new Map<string, number>();
const REQUEST_DEDUPLICATION_WINDOW = 1000; // 1 ثانية

// Cache محسن للنتائج مع انتهاء صلاحية ذكي
interface CacheEntry {
  data: any;
  timestamp: number;
  searchParams: string;
}

const resultsCache = new Map<string, CacheEntry>();
const CACHE_DURATION = 2 * 60 * 1000; // دقيقتان
const MAX_CACHE_SIZE = 50;

// دالة تنظيف الـ cache
const cleanupCache = () => {
  const now = Date.now();
  const entries = Array.from(resultsCache.entries());
  
  // إزالة المدخلات المنتهية الصلاحية
  entries.forEach(([key, entry]) => {
    if (now - entry.timestamp > CACHE_DURATION) {
      resultsCache.delete(key);
    }
  });
  
  // إزالة أقدم المدخلات إذا تجاوز الحد الأقصى
  if (resultsCache.size > MAX_CACHE_SIZE) {
    const sortedEntries = entries
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, resultsCache.size - MAX_CACHE_SIZE);
    
    sortedEntries.forEach(([key]) => resultsCache.delete(key));
  }
};

export interface TimerConfig {
  enabled: boolean;
  endDate: string; // Or Date?
  message: string;
  textAbove?: string;
  textBelow?: string;
  style?: 'default' | 'minimal' | 'prominent';
  shipping_clone_id?: number | null;
}

export interface QuantityOffer {
  id: string;
  name?: string | null; // <-- Add optional name field
  description?: string | null; // <-- Add optional description field
  minQuantity: number; 
  type: 'free_shipping' | 'percentage_discount' | 'fixed_amount_discount' | 'buy_x_get_y_free';
  discountValue?: number | null; // Represents discount %/amount OR quantity Y for free gift
  // freeShipping is implied by type = 'free_shipping'
  freeProductId?: string | null; // Optional: ID of the free gift product (only for buy_x_get_y_free type)
  freeProductName?: string | null; // <-- Add optional name field
}

export interface UpsellDownsellItem {
  id: string; // Use UUID for new items
  productId: string;
  product?: Partial<Product> | null; // Optional: To display product info
  discountType: 'percentage' | 'fixed' | 'none';
  discountValue: number;
}

export interface PurchasePageConfig {
  timer: TimerConfig;
  quantityOffers: QuantityOffer[];
  upsells: UpsellDownsellItem[];
  downsells: UpsellDownsellItem[];
  shipping_clone_id?: number | null; // معرف نسخة مزود التوصيل
}

export interface ProductColor {
  id: string;
  product_id: string;
  name: string;
  color_code: string;
  image_url?: string | null;
  quantity: number;
  is_default: boolean;
  barcode?: string | null;
  has_sizes?: boolean;
  price?: number | null;
  created_at?: string;
  updated_at?: string;
  sizes?: ProductSize[]; // Added sizes to ProductColor
}

export interface ProductSize {
  id: string;
  product_id: string;
  color_id: string;
  size_name: string;
  quantity: number;
  price?: number | null; // Can override product/color price
  barcode?: string | null;
  is_default: boolean;
  has_money_back?: boolean;
  has_quality_guarantee?: boolean;
  fast_shipping_text?: string;
  money_back_text?: string;
  quality_guarantee_text?: string;
  rating?: number | null;
  created_at?: string;
  updated_at?: string;
}

export type Product = Database['public']['Tables']['products']['Row'] & {
  category?: { id: string; name: string; slug: string } | string;
  subcategory?: { id: string; name: string; slug: string } | string | null;
  has_fast_shipping?: boolean;
  has_money_back?: boolean;
  has_quality_guarantee?: boolean;
  fast_shipping_text?: string;
  money_back_text?: string;
  quality_guarantee_text?: string;
  purchase_page_config?: PurchasePageConfig | null;
  special_offers_config?: any | null; // إضافة العروض الخاصة
  colors?: ProductColor[];
  sizes?: ProductSize[];
  use_sizes?: boolean;
  discount_price?: number | null;
  imageUrl?: string;
  additional_images?: string[];
  delivery_fee?: number;
  short_description?: string;
  shipping_clone_id?: number | null;
  product_advanced_settings?: Database['public']['Tables']['product_advanced_settings']['Row'] | null;
  product_marketing_settings?: Database['public']['Tables']['product_marketing_settings']['Row'] | null;
  reviews?: any[];
  form_settings?: any[] | null;
};

export interface InsertProduct {
  name: string;
  name_for_shipping?: string | null;
  description: string;
  price: number;
  purchase_price: number;
  compare_at_price?: number | null;
  wholesale_price?: number | null;
  partial_wholesale_price?: number | null;
  min_wholesale_quantity?: number | null;
  min_partial_wholesale_quantity?: number | null;
  allow_retail: boolean;
  allow_wholesale: boolean;
  allow_partial_wholesale: boolean;
  sku: string;
  barcode?: string;
  category_id: string;
  subcategory_id?: string;
  brand?: string;
  stock_quantity: number;
  thumbnail_image: string;
  images?: string[];
  is_digital: boolean;
  is_featured: boolean;
  is_new: boolean;
  has_variants: boolean;
  show_price_on_landing: boolean;
  // إعدادات العرض والنشر
  show_in_store?: boolean;
  allow_marketplace?: boolean;
  hide_stock_quantity?: boolean;
  features: string[];
  specifications: Record<string, string>;
  organization_id: string;
  slug: string;
  use_sizes?: boolean;
  unit_type?: string | null;
  unit_purchase_price?: number | null;
  unit_sale_price?: number | null;
  category?: string;
  shipping_clone_id?: number | null;
  created_by_user_id?: string;
  updated_by_user_id?: string;
  form_template_id?: string | null;
  shipping_provider_id?: number | null;
  shipping_method_type?: 'default' | 'standard' | 'custom' | 'clone';
  use_shipping_clone?: boolean;
  advanced_settings?: Record<string, any>;
}

export type UpdateProduct = Omit<Database['public']['Tables']['products']['Update'], 'category' | 'subcategory'> & {
  purchase_price?: number;
  category_id?: string;
  subcategory_id?: string;
  slug?: string;
  category?: string;
  has_variants?: boolean;
  show_price_on_landing?: boolean;
  // إعدادات العرض والنشر
  show_in_store?: boolean;
  allow_marketplace?: boolean;
  hide_stock_quantity?: boolean;
  wholesale_price?: number;
  partial_wholesale_price?: number;
  min_wholesale_quantity?: number;
  min_partial_wholesale_quantity?: number;
  allow_retail?: boolean;
  allow_wholesale?: boolean;
  allow_partial_wholesale?: boolean;
  has_fast_shipping?: boolean;
  has_money_back?: boolean;
  has_quality_guarantee?: boolean;
  fast_shipping_text?: string;
  money_back_text?: string;
  quality_guarantee_text?: string;
  shipping_clone_id?: number | null;
  updated_by_user_id?: string;
  form_template_id?: string | null;
  shipping_provider_id?: number | null;
  use_shipping_clone?: boolean;
  advancedSettings?: Partial<TablesUpdate<'product_advanced_settings'>>;
  marketingSettings?: Partial<TablesUpdate<'product_marketing_settings'>>;
  colors?: ProductColor[];
  additional_images?: string[];
  wholesale_tiers?: WholesaleTier[];
  special_offers_config?: any;
};

export interface WholesaleTier {
  id?: string;
  product_id: string;
      min_quantity: number;
    price_per_unit: number;
  organization_id?: string;
  created_at?: string;
  updated_at?: string;
}

export type Category = Database['public']['Tables']['product_categories']['Row'];
export type Subcategory = Database['public']['Tables']['product_subcategories']['Row'];

import { throttledRequest } from '../request-throttle';
import { attackProtectionManager } from '../attack-protection';

export const getProducts = async (organizationId?: string, includeInactive: boolean = false): Promise<Product[]> => {
  

  try {
    if (!organizationId) {
      return [];
    }

    // فحص الحماية من الهجمات أولاً
    const clientIP = typeof window !== 'undefined' ? 
      (window as any).clientIP || 'unknown' : 'server';
    const userAgent = typeof navigator !== 'undefined' ? 
      navigator.userAgent : 'unknown';

    const protectionResult = attackProtectionManager.analyzeRequest(
      clientIP,
      '/rest/v1/products',
      userAgent,
      organizationId
    );

    if (!protectionResult.allowed) {
      console.warn('🚫 [getProducts] طلب محظور بواسطة نظام الحماية:', protectionResult.reason);
      return [];
    }

    if (protectionResult.action === 'throttle') {
      console.warn('⚠️ [getProducts] طلب مقيد:', protectionResult.reason);
      // يمكن إضافة تأخير إضافي هنا
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // تطبيق نظام التحكم في معدل الطلبات مع حدود أكثر مرونة
    const result = await throttledRequest(
      async () => {
        // Use a simpler approach with consistent logging
        // Always use the same query pattern for consistent behavior
        let query = supabase
          .from('products')
          .select(`
            *,
            category:category_id(id, name, slug),
            subcategory:subcategory_id(id, name, slug),
            colors:product_colors(
              id,
              name,
              color_code,
              quantity,
              price,
              purchase_price,
              image_url,
              barcode,
              is_default,
              has_sizes,
              sizes:product_sizes(
                id,
                size_name,
                quantity,
                price,
                purchase_price,
                barcode
              )
            )
          `);

        // Add organization filter
        query = query.eq('organization_id', organizationId);

        // Add active filter if needed
        if (!includeInactive) {
          query = query.eq('is_active', true);
        }

        const { data, error } = await query;

        if (error) {
          console.error('❌ [getProducts] خطأ في استعلام قاعدة البيانات:', error);
          throw new Error(`خطأ في جلب المنتجات: ${error.message}`);
        }

        return (data as any) || [];
      },
      `/rest/v1/products`,
      organizationId,
      { maxRequestsPerMinute: 15, maxRequestsPerHour: 300, cooldownPeriod: 100 } // حدود أكثر مرونة للمنتجات
    );

    if (result === null) {
      console.warn('🚫 [getProducts] طلب محظور بواسطة نظام التحكم في المعدل');
      // إرجاع خطأ بدلاً من مصفوفة فارغة لتفعيل آلية إعادة المحاولة
      throw new Error('طلب محظور بواسطة نظام التحكم في المعدل');
    }

    return result;
  } catch (error) {
    return []; // Return empty array to prevent UI from hanging
  }
};

// دالة جديدة لجلب المنتجات مع الـ pagination - محسنة
export const getProductsPaginated = async (
  organizationId: string,
  page: number = 1,
  limit: number = 10,
  options: {
    includeInactive?: boolean;
    searchQuery?: string;
    categoryFilter?: string;
    stockFilter?: string;
    publicationFilter?: string;
    sortOption?: string;
  } = {}
): Promise<{
  products: Product[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}> => {
  const {
    includeInactive = false,
    searchQuery = '',
    categoryFilter = '',
    stockFilter = 'all',
    publicationFilter = 'all',
    sortOption = 'newest'
  } = options;

  // إنشاء مفتاح cache محسن
  const cacheKey = `products-${organizationId}-${page}-${limit}-${JSON.stringify({
    includeInactive,
    searchQuery: searchQuery.trim().toLowerCase(),
    categoryFilter,
    stockFilter,
    publicationFilter,
    sortOption
  })}`;

  // تنظيف الـ cache دورياً
  cleanupCache();

  // فحص الـ cache أولاً
  const cachedResult = resultsCache.get(cacheKey);
  if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_DURATION) {
    return cachedResult.data;
  }

  // تجنب الطلبات المتزامنة المتعددة لنفس البيانات
  if (ongoingRequests.has(cacheKey)) {
    try {
      const result = await ongoingRequests.get(cacheKey);
      return result;
    } catch (error) {
      ongoingRequests.delete(cacheKey);
      throw error;
    }
  }

  const fetchPromise = async () => {
    try {
      if (!organizationId) {
        const emptyResult = {
          products: [],
          totalCount: 0,
          totalPages: 0,
          currentPage: page,
          hasNextPage: false,
          hasPreviousPage: false,
        };
        return emptyResult;
      }

      // حساب الفهرس للبداية
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // بناء الاستعلام الأساسي مع تحسينات - التأكد من جلب slug
      let query = supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          compare_at_price,
          sku,
          barcode,
          thumbnail_image,
          stock_quantity,
          is_active,
          has_variants,
          allow_retail,
          allow_wholesale,
          allow_partial_wholesale,
          wholesale_price,
          partial_wholesale_price,
          category:category_id(name),
          subcategory:subcategory_id(name)
        `, { count: 'exact' })
        .eq('organization_id', organizationId);

      // إضافة فلتر الحالة النشطة (لكن فقط إذا لم يكن لدينا فلتر محدد لحالة النشر)
      
      
      // إذا كان لدينا فلتر محدد لحالة النشر، لا نضيف فلتر is_active هنا
      if (publicationFilter === 'all' && !includeInactive) {
        
        query = query.eq('is_active', true);
      } else if (publicationFilter === 'all' && includeInactive) {
        
      } else {
        
      }

      // البحث الذكي - يتجاهل الرموز الخاصة ويركز على الأحرف والأرقام
      if (searchQuery.trim()) {
        const cleanSearchQuery = searchQuery.trim();
        
        // تنظيف النص المُدخل من الرموز الخاصة (نبقي الأحرف والأرقام والمسافات فقط)
        const normalizedSearchQuery = cleanSearchQuery
          .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, ' ') // استبدال الرموز الخاصة بمسافات
          .replace(/\s+/g, ' ') // تنظيف المسافات المتعددة
          .trim();

        if (normalizedSearchQuery.length >= 2) {
          // تقسيم النص إلى كلمات منفصلة للبحث الذكي
          const searchWords = normalizedSearchQuery
            .split(' ')
            .filter(word => word.length >= 1);

          // البحث المحسن - بدون تكرار لتقليل التكاليف
          let searchConditions: string[] = [];

          // البحث في الاسم (مرة واحدة فقط لكل كلمة)
          searchWords.forEach(word => {
            searchConditions.push(`name.ilike.%${word}%`);
          });

          // البحث في SKU
          searchWords.forEach(word => {
            searchConditions.push(`sku.ilike.%${word}%`);
          });

          // البحث في الوصف (للكلمات المهمة فقط)
          searchWords.forEach(word => {
            if (word.length >= 4) {
              searchConditions.push(`description.ilike.%${word}%`);
            }
          });

          query = query.or(searchConditions.join(','));
          
        } else {
          // للنصوص القصيرة، استخدام البحث التقليدي
          query = query.or(`name.ilike.%${cleanSearchQuery}%,sku.ilike.%${cleanSearchQuery}%,barcode.ilike.%${cleanSearchQuery}%`);
        }
      }

      // إضافة فلتر الفئة
      if (categoryFilter) {
        query = query.eq('category_id', categoryFilter);
      }

      // إضافة فلتر المخزون مع تحسين
      switch (stockFilter) {
        case 'in-stock':
          query = query.gt('stock_quantity', 0);
          break;
        case 'out-of-stock':
          query = query.eq('stock_quantity', 0);
          break;
        case 'low-stock':
          query = query.gt('stock_quantity', 0).lte('stock_quantity', 5);
          break;
        default:
          // 'all' - لا نضيف فلتر
          break;
      }

      // إضافة فلتر حالة النشر
      
      switch (publicationFilter) {
        case 'published':
          
          query = query.eq('is_active', true);
          break;
        case 'draft':
          
          query = query.eq('is_active', false);
          break;
        case 'scheduled':
          
          query = query.eq('is_active', true);
          break;
        case 'archived':
          
          query = query.eq('is_active', false);
          break;
        default:
          
          break;
      }

      // تحسين الترتيب - أولوية للبحث إذا كان موجوداً
      const isSearchActive = searchQuery.trim().length > 0;
      
      if (isSearchActive) {
        // ترتيب محسن خصيصاً للبحث: الأسماء الأقصر والأكثر دقة أولاً
        // هذا يساعد في إظهار "Glass - 11 Pro" قبل الأسماء الطويلة
        query = query
          .order('name', { ascending: true }) // ترتيب أبجدي - "Glass" سيأتي قبل أسماء أخرى
          .order('stock_quantity', { ascending: false }) // أولوية للمتوفر
          .order('is_featured', { ascending: false }) // المنتجات المميزة أولاً
          .order('created_at', { ascending: false }); // الأحدث أخيراً
          
      } else {
        // الترتيب العادي عند عدم وجود بحث
        switch (sortOption) {
          case 'newest':
            query = query.order('created_at', { ascending: false });
            break;
          case 'oldest':
            query = query.order('created_at', { ascending: true });
            break;
          case 'price-high':
            query = query.order('price', { ascending: false });
            break;
          case 'price-low':
            query = query.order('price', { ascending: true });
            break;
          case 'name-asc':
            query = query.order('name', { ascending: true });
            break;
          case 'name-desc':
            query = query.order('name', { ascending: false });
            break;
          case 'stock-high':
            query = query.order('stock_quantity', { ascending: false });
            break;
          case 'stock-low':
            query = query.order('stock_quantity', { ascending: true });
            break;
          default:
            query = query.order('created_at', { ascending: false });
            break;
        }

        // إضافة ترتيب ثانوي للحصول على نتائج ثابتة
        if (!['name-asc', 'name-desc'].includes(sortOption)) {
          query = query.order('id', { ascending: false });
        }
      }

      // تطبيق الـ pagination
      query = query.range(from, to);

      // 🚀 تحسين الأداء: تنفيذ الاستعلام مع تقسيم العمليات
      const { data, error, count } = await query;

      if (error) {
        console.error('❌ Debug - Query error:', error);
        throw error;
      }


      // Debug: فحص البيانات المُرجعة
      if (data && data.length > 0) {
        const sampleProduct = data[0];
      }

      // تأخير قصير لتجنب حجب الواجهة
      await new Promise(resolve => setTimeout(resolve, 2));

      // 🚀 معالجة النتائج بشكل متدرج
      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      // تأخير آخر قصير
      await new Promise(resolve => setTimeout(resolve, 2));

      const result = {
        products: (data as any[] || []).filter(item => !item?.error) as Product[],
        totalCount,
        totalPages,
        currentPage: page,
        hasNextPage,
        hasPreviousPage,
      };

      // حفظ النتيجة في الـ cache مع تأخير
      await new Promise(resolve => setTimeout(resolve, 1));
      resultsCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
        searchParams: cacheKey
      });

      return result;

    } catch (error) {
      return {
        products: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: page,
        hasNextPage: false,
        hasPreviousPage: false,
      };
    } finally {
      // إزالة من الطلبات الجارية
      ongoingRequests.delete(cacheKey);
    }
  };

  // إضافة الطلب للطلبات الجارية
  const promise = fetchPromise();
  ongoingRequests.set(cacheKey, promise);

  return promise;
};

export const getProductById = async (id: string): Promise<Product | null> => {
  // ✅ تم إصلاح المشكلة: استخدام maybeSingle() بدلاً من single() للجداول التي قد تعيد صفوف متعددة
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      special_offers_config,
      purchase_page_config,
      category:category_id(id, name, slug),
      subcategory:subcategory_id(id, name, slug),
      product_images ( product_id, image_url, sort_order ),
      product_advanced_settings (*),
      product_marketing_settings (*),
      colors:product_colors(
        id,
        name,
        color_code,
        quantity,
        price,
        purchase_price,
        image_url,
        barcode,
        is_default,
        has_sizes,
        sizes:product_sizes(
          id,
          size_name,
          quantity,
          price,
          purchase_price,
          barcode
        )
      ),
      product_price_tiers(
        id,
        min_quantity,
        price,
        tier_name,
        tier_label,
        price_type,
        max_quantity,
        discount_percentage,
        is_active,
        sort_order
      )
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) return null;

  // 🔍 DEBUG: فحص البيانات المجلوبة من قاعدة البيانات
  console.log('='.repeat(80));
  console.log('[getProductById] 🔍 DEBUG - Raw data from DB:', {
    id: data.id,
    name: data.name,
    product_price_tiers: (data as any).product_price_tiers,
    wholesale_tiers: (data as any).wholesale_tiers,
  });
  console.log('='.repeat(80));

  // Start with the base data and explicitly type it to avoid 'any' as much as possible
  const rawData = data as any; // Cast to any initially to access potentially joined array fields

  const processedData: Partial<Product> = { ...rawData };

  // Process product_images to additional_images
  if (rawData.product_images && Array.isArray(rawData.product_images)) {
    processedData.additional_images = (rawData.product_images as any[])
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map(img => img.image_url);
  } else {
    processedData.additional_images = [];
  }
  delete (processedData as any).product_images; // Clean up the original joined field

  // Process product_advanced_settings
  if (rawData.product_advanced_settings && Array.isArray(rawData.product_advanced_settings)) {
    processedData.product_advanced_settings = rawData.product_advanced_settings.length > 0 ? rawData.product_advanced_settings[0] : null;
  } else if (rawData.product_advanced_settings) { // It could be a single object already
    processedData.product_advanced_settings = rawData.product_advanced_settings;
  } else {
    processedData.product_advanced_settings = null;
  }

  // Process product_marketing_settings
  if (rawData.product_marketing_settings && Array.isArray(rawData.product_marketing_settings)) {
    processedData.product_marketing_settings = rawData.product_marketing_settings.length > 0 ? rawData.product_marketing_settings[0] : null;
  } else if (rawData.product_marketing_settings) { // It could be a single object already
    processedData.product_marketing_settings = rawData.product_marketing_settings;
  } else {
    processedData.product_marketing_settings = null;
  }

  // Process purchase_page_config: Supabase returns Json, needs parsing to PurchasePageConfig if it's a string
  // If it's already an object (from JSONB), ensure its structure matches PurchasePageConfig.
  // For now, we assume if it's an object, it's correctly structured.
  // If it's a string: processedData.purchase_page_config = JSON.parse(rawData.purchase_page_config as string);
  // If Supabase returns it as a structured object from JSONB, this explicit parsing might not be needed,
  // but the type PurchasePageConfig must match what's in the DB or what Supabase deserializes.
  if (typeof rawData.purchase_page_config === 'string') {
    try {
      (processedData as any).purchase_page_config = JSON.parse(rawData.purchase_page_config);
    } catch (e) {
      (processedData as any).purchase_page_config = null;
    }
  } else if (typeof rawData.purchase_page_config === 'object' && rawData.purchase_page_config !== null) {
    // Assume it's already a correctly structured object
    (processedData as any).purchase_page_config = rawData.purchase_page_config;
  } else {
    (processedData as any).purchase_page_config = null;
  }

  // Process special_offers_config: Similar to purchase_page_config
  if (typeof rawData.special_offers_config === 'string') {
    try {
      (processedData as any).special_offers_config = JSON.parse(rawData.special_offers_config);
    } catch (e) {
      (processedData as any).special_offers_config = null;
    }
  } else if (typeof rawData.special_offers_config === 'object' && rawData.special_offers_config !== null) {
    // Assume it's already a correctly structured object
    (processedData as any).special_offers_config = rawData.special_offers_config;
  } else {
    (processedData as any).special_offers_config = null;
  }

  if (processedData.is_active === false) {
  }

  // The processedData should now more closely match the Product type
  return processedData as Product;
};

export const getProductsByCategory = async (categoryId: string, includeInactive: boolean = false): Promise<Product[]> => {
  let query = supabase
    .from('products')
    .select(`
      *,
      category:category_id(id, name, slug),
      subcategory:subcategory_id(id, name, slug)
    `)
    .eq('category_id', categoryId);
    
  // إذا كان includeInactive = false، أضف شرط is_active = true  
  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data as any;
};

export const getFeaturedProducts = async (includeInactive: boolean = false, organizationId?: string): Promise<Product[]> => {
  if (!organizationId) {
    return [];
  }
  
  try {
    let query = supabase
      .from('products')
      .select(`
        *,
        category:category_id(id, name, slug),
        subcategory:subcategory_id(id, name, slug)
      `)
      .eq('is_featured', true);
    
    // فلترة حسب المؤسسة إذا تم توفير معرف المؤسسة
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }
      
    // إذا كان includeInactive = false، أضف شرط is_active = true
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      return [];
    }
    
    // تأكد من رجوع البيانات قبل المتابعة
    if (!data || data.length === 0) {
      return [];
    }

    // قم بفحص وطباعة قيم thumbnail_image لكل منتج
    data.forEach(product => {
      // فحص وجود حقل thumbnail_url
      if ('thumbnail_url' in product && product.thumbnail_url && typeof product.thumbnail_url === 'string') {
      }
    });
    
    // تحويل البيانات مع معالجة روابط الصور
    const processedProducts = data.map(product => {
      // معالجة رابط الصورة المصغرة
      let processedThumbnail = '';
      
      // تحقق من thumbnail_url أولاً إذا كان موجوداً
      if ('thumbnail_url' in product && product.thumbnail_url && typeof product.thumbnail_url === 'string') {
        processedThumbnail = product.thumbnail_url.trim();
      }
      // ثم تحقق من thumbnail_image كخيار ثاني
      else if (product.thumbnail_image) {
        processedThumbnail = product.thumbnail_image.trim();
      }
      
      // إضافة بروتوكول إذا كان مفقودًا
      if (processedThumbnail && !processedThumbnail.startsWith('http://') && !processedThumbnail.startsWith('https://')) {
        if (processedThumbnail.startsWith('//')) {
          processedThumbnail = `https:${processedThumbnail}`;
        } else if (processedThumbnail.startsWith('/')) {
          // معالجة المسارات النسبية
          const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
          processedThumbnail = `${baseUrl}${processedThumbnail}`;
        } else if (processedThumbnail.startsWith('www.')) {
          processedThumbnail = `https://${processedThumbnail}`;
        } else if (processedThumbnail) {
          // روابط أخرى بدون بروتوكول
          processedThumbnail = `https://${processedThumbnail}`;
        }
      }
      
      // تنظيف المسافات داخل الرابط
      if (processedThumbnail) {
        processedThumbnail = processedThumbnail.replace(/\s+/g, '%20');
        
        // التحقق من صحة بنية الرابط
        try {
          new URL(processedThumbnail);
        } catch (e) {
          // استخدام صورة افتراضية في حالة الرابط غير الصالح
          processedThumbnail = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1470';
        }
      } else {
        // استخدام صورة افتراضية في حالة عدم وجود صورة
        processedThumbnail = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1470';
      }
      
      // حفظ رابط الصورة الأصلي في سجل التصحيح للمقارنة
      if (product.thumbnail_image !== processedThumbnail) {
      }
      
      // معالجة مصفوفة الصور أيضًا إذا كانت موجودة
      let processedImages: string[] = [];
      
      if (product.images && Array.isArray(product.images)) {
        processedImages = product.images.map(imgUrl => {
          if (!imgUrl) return '';
          
          let processedUrl = imgUrl.trim();
          
          // نفس معالجة البروتوكول
          if (!processedUrl.startsWith('http://') && !processedUrl.startsWith('https://')) {
            if (processedUrl.startsWith('//')) {
              processedUrl = `https:${processedUrl}`;
            } else if (processedUrl.startsWith('/')) {
              const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
              processedUrl = `${baseUrl}${processedUrl}`;
            } else {
              processedUrl = `https://${processedUrl}`;
            }
          }
          
          // تنظيف المسافات
          processedUrl = processedUrl.replace(/\s+/g, '%20');
          
          return processedUrl;
        }).filter(url => url); // إزالة الروابط الفارغة
      }
      
      if (processedImages.length === 0 && processedThumbnail) {
        // إضافة الصورة المصغرة إلى مصفوفة الصور إذا كانت فارغة
        processedImages = [processedThumbnail];
      }
      
      return {
        ...product,
        thumbnail_image: processedThumbnail,
        images: processedImages.length > 0 ? processedImages : null
      };
    });

    return processedProducts as any;
  } catch (error) {
    return [];
  }
};

export const searchProductsByName = async (
  query: string,
  organizationId: string,
  limit: number = 10 // Limit the results for performance
): Promise<Partial<Product>[]> => {
  if (!organizationId || !query) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, price, thumbnail_image, sku') // Select necessary fields
      .eq('organization_id', organizationId)
      .eq('is_active', true) // Only search active products
      .ilike('name', `%${query}%`) // Case-insensitive search
      .limit(limit);

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    // Depending on requirements, you might want to re-throw or return empty
    return []; 
  }
};

/**
 * 🔄 تحويل بيانات النموذج إلى صيغة upsert_product_v2
 * هذه الدالة تحول ProductFormValues إلى المعاملات المطلوبة لـ RPC
 */
const transformFormDataToV2Params = (productData: ProductFormValues, userId: string) => {
  console.log('='.repeat(80));
  console.log('[transformFormDataToV2Params] 🔄 TRANSFORM STARTED');
  console.log('='.repeat(80));

  // 🔍 DEBUG: فحص البيانات الواردة
  console.log('[transformFormDataToV2Params] 📥 Input productData:', {
    name: productData.name,
    organization_id: productData.organization_id,
    category_id: productData.category_id,
    price: productData.price,
    stock_quantity: productData.stock_quantity,
    has_variants: productData.has_variants,
    colors_count: productData.colors?.length || 0,
  });

  // 🔍 DEBUG: أنواع البيع المتقدمة
  console.log('[transformFormDataToV2Params] 📦 Advanced Selling Types from form:', {
    sell_by_weight: productData.sell_by_weight,
    weight_unit: productData.weight_unit,
    price_per_weight_unit: productData.price_per_weight_unit,
    available_weight: productData.available_weight,
    sell_by_box: productData.sell_by_box,
    units_per_box: productData.units_per_box,
    box_price: productData.box_price,
    available_boxes: productData.available_boxes,
    sell_by_meter: productData.sell_by_meter,
    meter_unit: productData.meter_unit,
    price_per_meter: productData.price_per_meter,
    available_length: productData.available_length,
  });

  // 🔍 DEBUG: التتبع المتقدم
  console.log('[transformFormDataToV2Params] 🔍 Tracking Features from form:', {
    track_expiry: productData.track_expiry,
    default_expiry_days: productData.default_expiry_days,
    track_serial_numbers: productData.track_serial_numbers,
    require_serial_on_sale: productData.require_serial_on_sale,
    supports_imei: productData.supports_imei,
    track_batches: productData.track_batches,
    use_fifo: productData.use_fifo,
    has_warranty: productData.has_warranty,
    warranty_duration_months: productData.warranty_duration_months,
    warranty_type: productData.warranty_type,
  });

  // البيانات الأساسية
  const basic_data = {
    organization_id: productData.organization_id,
    name: productData.name,
    description: productData.description || '',
    sku: productData.sku || null,
    barcode: productData.barcode || null,
    category_id: productData.category_id || null,
    subcategory_id: productData.subcategory_id || null,
    brand: productData.brand || null,
    slug: productData.slug || `${productData.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
  };

  // بيانات التسعير
  const pricing_data = {
    price: Number(productData.price) || 0,
    purchase_price: productData.purchase_price ? Number(productData.purchase_price) : null,
    compare_at_price: productData.compare_at_price ? Number(productData.compare_at_price) : null,
    wholesale_price: productData.wholesale_price ? Number(productData.wholesale_price) : null,
    partial_wholesale_price: productData.partial_wholesale_price ? Number(productData.partial_wholesale_price) : null,
    min_wholesale_quantity: productData.min_wholesale_quantity ? Number(productData.min_wholesale_quantity) : null,
    min_partial_wholesale_quantity: productData.min_partial_wholesale_quantity ? Number(productData.min_partial_wholesale_quantity) : null,
    allow_retail: productData.allow_retail !== undefined ? productData.allow_retail : true,
    allow_wholesale: productData.allow_wholesale || false,
    allow_partial_wholesale: productData.allow_partial_wholesale || false,
  };

  // بيانات المخزون
  const inventory_data = {
    stock_quantity: productData.stock_quantity ? Number(productData.stock_quantity) : 0,
    min_stock_level: productData.min_stock_level ? Number(productData.min_stock_level) : 5,
    reorder_level: productData.reorder_level ? Number(productData.reorder_level) : 10,
    reorder_quantity: productData.reorder_quantity ? Number(productData.reorder_quantity) : 20,
  };

  // ⚡ البيع بالوزن
  const weight_selling = productData.sell_by_weight ? {
    enabled: true,
    weight_unit: productData.weight_unit || 'kg',
    price_per_unit: productData.price_per_weight_unit ? Number(productData.price_per_weight_unit) : null,
    purchase_price_per_unit: productData.purchase_price_per_weight_unit ? Number(productData.purchase_price_per_weight_unit) : null,
    min_weight: productData.min_weight ? Number(productData.min_weight) : null,
    max_weight: productData.max_weight ? Number(productData.max_weight) : null,
    average_item_weight: productData.average_item_weight ? Number(productData.average_item_weight) : null,
    // ⚡ مخزون الوزن المتقدم
    available_weight: productData.available_weight ? Number(productData.available_weight) : null,
    total_weight_purchased: productData.total_weight_purchased ? Number(productData.total_weight_purchased) : null,
  } : null;

  // ⚡ البيع بالكرتون
  const box_selling = productData.sell_by_box ? {
    enabled: true,
    units_per_box: productData.units_per_box ? Number(productData.units_per_box) : 1,
    box_price: productData.box_price ? Number(productData.box_price) : null,
    box_purchase_price: productData.box_purchase_price ? Number(productData.box_purchase_price) : null,
    box_barcode: productData.box_barcode || null,
    allow_single_unit_sale: productData.allow_single_unit_sale !== undefined ? productData.allow_single_unit_sale : true,
    // ⚡ مخزون الصناديق المتقدم
    available_boxes: productData.available_boxes ? Number(productData.available_boxes) : null,
    total_boxes_purchased: productData.total_boxes_purchased ? Number(productData.total_boxes_purchased) : null,
  } : null;

  // ⚡ البيع بالمتر
  const meter_selling = productData.sell_by_meter ? {
    enabled: true,
    meter_unit: productData.meter_unit || 'm',
    price_per_meter: productData.price_per_meter ? Number(productData.price_per_meter) : null,
    purchase_price_per_meter: productData.purchase_price_per_meter ? Number(productData.purchase_price_per_meter) : null,
    min_meters: productData.min_meters ? Number(productData.min_meters) : 0.1,
    roll_length: productData.roll_length ? Number(productData.roll_length) : null,
    // ⚡ مخزون الأمتار المتقدم
    available_length: productData.available_length ? Number(productData.available_length) : null,
    total_meters_purchased: productData.total_meters_purchased ? Number(productData.total_meters_purchased) : null,
  } : null;

  // ⚡ تتبع الصلاحية
  const expiry_tracking = productData.track_expiry ? {
    enabled: true,
    default_expiry_days: productData.default_expiry_days ? Number(productData.default_expiry_days) : null,
    alert_days_before: productData.alert_days_before ? Number(productData.alert_days_before) : 30,
  } : null;

  // ⚡ تتبع الأرقام التسلسلية
  const serial_tracking = productData.track_serial_numbers ? {
    enabled: true,
    require_on_sale: productData.require_serial_on_sale || false,
    supports_imei: productData.supports_imei || false,
  } : null;

  // ⚡ الضمان
  const warranty = productData.has_warranty ? {
    enabled: true,
    duration_months: productData.warranty_duration_months ? Number(productData.warranty_duration_months) : null,
    type: productData.warranty_type || 'store',
  } : null;

  // ⚡ تتبع الدفعات
  const batch_tracking = productData.track_batches ? {
    enabled: true,
    use_fifo: productData.use_fifo !== undefined ? productData.use_fifo : true,
  } : null;

  // المتغيرات (الألوان)
  const variants = productData.colors && productData.colors.length > 0
    ? productData.colors.map(color => ({
        name: color.name,
        color_code: color.color_code,
        image_url: color.image_url,
        quantity: Number(color.quantity) || 0,
        is_default: color.is_default || false,
        barcode: color.barcode,
        has_sizes: color.has_sizes || false,
        price: color.price ? Number(color.price) : null,
        purchase_price: color.purchase_price ? Number(color.purchase_price) : null,
        sizes: color.sizes?.map(size => ({
          name: size.size_name,
          quantity: Number(size.quantity) || 0,
          price: size.price ? Number(size.price) : null,
          purchase_price: size.purchase_price ? Number(size.purchase_price) : null,
          barcode: size.barcode,
          is_default: size.is_default || false,
        })),
      }))
    : null;

  // الصور
  const images = productData.additional_images && productData.additional_images.length > 0
    ? productData.additional_images.map(url => ({ url, is_primary: false }))
    : null;

  // مستويات الأسعار - دمج wholesale_tiers و price_tiers
  let price_tiers = null;

  // أولاً: التحقق من price_tiers الجديدة
  if (productData.price_tiers && productData.price_tiers.length > 0) {
    price_tiers = productData.price_tiers.map(tier => ({
      tier_name: tier.tier_name || 'wholesale',
      tier_label: tier.tier_label || null,
      min_quantity: Number(tier.min_quantity),
      max_quantity: tier.max_quantity ? Number(tier.max_quantity) : null,
      price_type: tier.price_type || 'fixed',
      price: tier.price ? Number(tier.price) : null,
      discount_percentage: tier.discount_percentage ? Number(tier.discount_percentage) : null,
      discount_amount: tier.discount_amount ? Number(tier.discount_amount) : null,
      is_active: tier.is_active !== false,
      sort_order: tier.sort_order || 0,
    }));
  }
  // ثانياً: fallback إلى wholesale_tiers القديمة
  else if (productData.wholesale_tiers && productData.wholesale_tiers.length > 0) {
    price_tiers = productData.wholesale_tiers.map(tier => ({
      tier_name: 'wholesale',
      min_quantity: Number(tier.min_quantity),
      price_type: 'fixed' as const,
      price: Number(tier.price_per_unit),
    }));
  }

  // حالة النشر
  const publication = {
    status: (productData as any).publication_status || 'published',
    publish_at: (productData as any).publish_at || null,
  };

  const result = {
    basic_data,
    pricing_data,
    inventory_data,
    weight_selling,
    box_selling,
    meter_selling,
    expiry_tracking,
    serial_tracking,
    warranty,
    batch_tracking,
    variants,
    images,
    price_tiers,
    advanced_settings: productData.advancedSettings || null,
    marketing_settings: productData.marketingSettings || null,
    special_offers: productData.special_offers_config || null,
    advanced_description: productData.advanced_description || null,
    publication,
    user_id: userId,
  };

  // 🔍 DEBUG: النتيجة النهائية
  console.log('[transformFormDataToV2Params] ✅ TRANSFORM COMPLETE - Output:', {
    basic_data: { ...result.basic_data, description: result.basic_data.description?.substring(0, 50) + '...' },
    pricing_data: result.pricing_data,
    inventory_data: result.inventory_data,
    weight_selling: result.weight_selling,
    box_selling: result.box_selling,
    meter_selling: result.meter_selling,
    expiry_tracking: result.expiry_tracking,
    serial_tracking: result.serial_tracking,
    warranty: result.warranty,
    batch_tracking: result.batch_tracking,
    variants_count: result.variants?.length || 0,
    images_count: result.images?.length || 0,
    price_tiers_count: result.price_tiers?.length || 0,
    publication: result.publication,
  });

  // 🔍 DEBUG: فحص مستويات الأسعار قبل الإرسال
  console.log('[transformFormDataToV2Params] 🔍 DEBUG - price_tiers details:', JSON.stringify(result.price_tiers, null, 2));
  console.log('='.repeat(80));

  return result;
};

export const createProduct = async (productData: ProductFormValues): Promise<Product> => {
  console.log('='.repeat(80));
  console.log('[createProduct] 🚀 API CALL STARTED');
  console.log('='.repeat(80));

  console.log('[createProduct] 📥 Received productData:', {
    name: productData.name,
    organization_id: productData.organization_id,
    price: productData.price,
    category_id: productData.category_id,
    has_variants: productData.has_variants,
    colors_count: productData.colors?.length || 0,
    // أنواع البيع المتقدمة
    sell_by_weight: productData.sell_by_weight,
    sell_by_box: productData.sell_by_box,
    sell_by_meter: productData.sell_by_meter,
    // التتبع
    track_expiry: productData.track_expiry,
    track_serial_numbers: productData.track_serial_numbers,
    track_batches: productData.track_batches,
    has_warranty: productData.has_warranty,
  });

  // ✅ التحقق من صحة organization_id قبل أي شيء
  if (!productData.organization_id) {
    const error = new Error("معرف المؤسسة مطلوب");
    toast.error("معرف المؤسسة مطلوب");
    throw error;
  }

  // ✅ التحقق من صحة UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(productData.organization_id)) {
    const error = new Error("معرف المؤسسة يجب أن يكون بصيغة UUID صحيحة");
    toast.error("معرف المؤسسة يجب أن يكون بصيغة UUID صحيحة");
    throw error;
  }

  // ⚡ PowerSync-First: إنشاء المنتج محلياً ثم المزامنة
  try {
    const { unifiedProductService } = await import('@/services/UnifiedProductService');
    const { powerSyncService } = await import('@/lib/powersync/PowerSyncService');

    unifiedProductService.setOrganizationId(productData.organization_id);

    const basicProduct = {
      name: productData.name,
      description: productData.description,
      sku: productData.sku,
      barcode: productData.barcode,
      category_id: productData.category_id,
      subcategory_id: productData.subcategory_id,
      price: productData.price || 0,
      purchase_price: productData.purchase_price,
      wholesale_price: productData.wholesale_price,
      stock_quantity: productData.stock_quantity || 0,
      min_stock_level: productData.min_stock_level,
      thumbnail_image: productData.thumbnail_image,
      has_variants: productData.has_variants || false,
      use_sizes: productData.use_sizes || false,
      is_active: productData.is_active !== false,
      // حقول البيع المتقدمة
      sell_by_weight: productData.sell_by_weight,
      sell_by_meter: productData.sell_by_meter,
      sell_by_box: productData.sell_by_box,
      // حقول البيع بالوزن (أسماء PowerSync Schema)
      weight_unit: productData.weight_unit,
      price_per_weight_unit: productData.price_per_weight_unit,
      purchase_price_per_weight_unit: productData.purchase_price_per_weight_unit,
      min_weight_per_sale: productData.min_weight,
      max_weight_per_sale: productData.max_weight,
      average_item_weight: productData.average_item_weight,
      // حقول البيع بالكرتون
      units_per_box: productData.units_per_box,
      box_price: productData.box_price,
      box_purchase_price: productData.box_purchase_price,
      box_barcode: productData.box_barcode,
      allow_single_unit_sale: productData.allow_single_unit_sale,
      // حقول البيع بالمتر (أسماء PowerSync Schema)
      meter_unit: productData.meter_unit,
      price_per_meter: productData.price_per_meter,
      purchase_price_per_meter: productData.purchase_price_per_meter,
      min_meters_per_sale: productData.min_meters,
      roll_length_meters: productData.roll_length,
      // حقول تتبع الصلاحية
      track_expiry: productData.track_expiry,
      default_expiry_days: productData.default_expiry_days,
      expiry_alert_days: productData.expiry_alert_days,
      // حقول تتبع الأرقام التسلسلية
      track_serial_numbers: productData.track_serial_numbers,
      require_serial_on_sale: productData.require_serial_on_sale,
      // حقول الضمان
      has_warranty: productData.has_warranty,
      warranty_duration_months: productData.warranty_duration_months,
      warranty_type: productData.warranty_type,
      // حقول تتبع الدفعات
      track_batches: productData.track_batches,
      use_fifo: productData.use_fifo
    } as any;

    const colors = productData.colors?.map(c => ({
      name: c.name,
      color_code: c.color_code,
      quantity: c.quantity || 0,
      price: c.price,
      purchase_price: c.purchase_price,
      barcode: c.barcode,
      is_default: c.is_default
    }));

    const sizes = productData.sizes?.map(s => ({
      size_name: s.size_name,
      quantity: s.quantity || 0,
      price: s.price,
      purchase_price: s.purchase_price,
      barcode: s.barcode,
      is_default: s.is_default
    }));

    const createdLocal = (colors && colors.length > 0) || (sizes && sizes.length > 0)
      ? await unifiedProductService.createProductWithVariants(basicProduct, colors, sizes)
      : await unifiedProductService.createProduct(basicProduct);

    try {
      if (typeof navigator === 'undefined' || navigator.onLine) {
        await powerSyncService.forceSync();
      }
    } catch (syncErr) {
      console.warn('[createProduct] PowerSync forceSync failed (will sync later):', syncErr);
    }

    toast.success('تم إنشاء المنتج عبر PowerSync (أوفلاين/أونلاين)');
    return createdLocal as any;
  } catch (psError) {
    console.warn('[createProduct] PowerSync-first path فشل، سيتم استخدام المسار القديم', psError);
  }

  // ⚡ Offline-First: التحقق من الاتصال
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  
  // ⚡ إذا كان غير متصل، استخدم UnifiedProductService مباشرة
  if (!isOnline) {
    console.log('[createProduct] 📴 Offline mode - using UnifiedProductService');
    try {
      const { unifiedProductService } = await import('@/services/UnifiedProductService');
      unifiedProductService.setOrganizationId(productData.organization_id);
      
      // تحويل البيانات إلى صيغة UnifiedProductService
      const basicProduct = {
        name: productData.name,
        description: productData.description,
        sku: productData.sku,
        barcode: productData.barcode,
        category_id: productData.category_id,
        subcategory_id: productData.subcategory_id,
        price: productData.price || 0,
        purchase_price: productData.purchase_price,
        wholesale_price: productData.wholesale_price,
        stock_quantity: productData.stock_quantity || 0,
        min_stock_level: productData.min_stock_level,
        thumbnail_image: productData.thumbnail_image,
        has_variants: productData.has_variants || false,
        use_sizes: productData.use_sizes || false,
        is_active: productData.is_active !== false,
        // حقول البيع المتقدمة
        sell_by_weight: productData.sell_by_weight,
        sell_by_meter: productData.sell_by_meter,
        sell_by_box: productData.sell_by_box,
        // حقول البيع بالوزن (أسماء PowerSync Schema)
        weight_unit: productData.weight_unit,
        price_per_weight_unit: productData.price_per_weight_unit,
        purchase_price_per_weight_unit: productData.purchase_price_per_weight_unit,
        min_weight_per_sale: productData.min_weight,
        max_weight_per_sale: productData.max_weight,
        average_item_weight: productData.average_item_weight,
        // حقول البيع بالكرتون
        units_per_box: productData.units_per_box,
        box_price: productData.box_price,
        box_purchase_price: productData.box_purchase_price,
        box_barcode: productData.box_barcode,
        allow_single_unit_sale: productData.allow_single_unit_sale,
        // حقول البيع بالمتر (أسماء PowerSync Schema)
        meter_unit: productData.meter_unit,
        price_per_meter: productData.price_per_meter,
        purchase_price_per_meter: productData.purchase_price_per_meter,
        min_meters_per_sale: productData.min_meters,
        roll_length_meters: productData.roll_length,
        // حقول تتبع الصلاحية
        track_expiry: productData.track_expiry,
        default_expiry_days: productData.default_expiry_days,
        expiry_alert_days: productData.expiry_alert_days,
        // حقول تتبع الأرقام التسلسلية
        track_serial_numbers: productData.track_serial_numbers,
        require_serial_on_sale: productData.require_serial_on_sale,
        // حقول الضمان
        has_warranty: productData.has_warranty,
        warranty_duration_months: productData.warranty_duration_months,
        warranty_type: productData.warranty_type,
        // حقول تتبع الدفعات
        track_batches: productData.track_batches,
        use_fifo: productData.use_fifo
      };

      const colors = productData.colors?.map(c => ({
        name: c.name,
        color_code: c.color_code,
        quantity: c.quantity || 0,
        price: c.price,
        purchase_price: c.purchase_price,
        barcode: c.barcode,
        is_default: c.is_default
      }));

      const sizes = productData.sizes?.map(s => ({
        size_name: s.size_name,
        quantity: s.quantity || 0,
        price: s.price,
        purchase_price: s.purchase_price,
        barcode: s.barcode,
        is_default: s.is_default
      }));

      const created = await unifiedProductService.createProductWithVariants(basicProduct, colors, sizes);

      toast.success('تم إنشاء المنتج محلياً (سيتم المزامنة عند الاتصال)');
      return created as any;
    } catch (offlineError) {
      console.error('[createProduct] ❌ Offline creation failed:', offlineError);
      toast.error('فشل إنشاء المنتج محلياً');
      throw offlineError;
    }
  }

  // استخدام العميل الموحد بدلاً من إنشاء عميل جديد
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    toast.error("يجب تسجيل الدخول لإنشاء منتج.");
    throw new Error("User not authenticated");
  }

  try {
    // التحقق من صحة المؤسسة
    const { data: orgCheck, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', productData.organization_id)
      .single();

    if (orgError || !orgCheck) {
      // ⚡ Fallback: محاولة الحفظ محلياً حتى لو فشل التحقق من المؤسسة
      console.warn('[createProduct] ⚠️ Organization check failed, trying offline save:', orgError);
      try {
        const { unifiedProductService } = await import('@/services/UnifiedProductService');
        unifiedProductService.setOrganizationId(productData.organization_id);
        const basicProduct = {
          name: productData.name,
          description: productData.description,
          sku: productData.sku,
          barcode: productData.barcode,
          category_id: productData.category_id,
          subcategory_id: productData.subcategory_id,
          price: productData.price || 0,
          purchase_price: productData.purchase_price,
          wholesale_price: productData.wholesale_price,
          stock_quantity: productData.stock_quantity || 0,
          min_stock_level: productData.min_stock_level,
          thumbnail_image: productData.thumbnail_image,
          has_variants: productData.has_variants || false,
          use_sizes: productData.use_sizes || false,
          is_active: productData.is_active !== false,
          // حقول البيع المتقدمة
          sell_by_weight: productData.sell_by_weight,
          sell_by_meter: productData.sell_by_meter,
          sell_by_box: productData.sell_by_box,
          // حقول تتبع الصلاحية
          track_expiry: productData.track_expiry,
          default_expiry_days: productData.default_expiry_days,
          expiry_alert_days: productData.expiry_alert_days,
          // حقول تتبع الأرقام التسلسلية
          track_serial_numbers: productData.track_serial_numbers,
          require_serial_on_sale: productData.require_serial_on_sale,
          supports_imei: productData.supports_imei,
          // حقول الضمان
          has_warranty: productData.has_warranty,
          warranty_duration_months: productData.warranty_duration_months,
          warranty_type: productData.warranty_type,
          // حقول تتبع الدفعات
          track_batches: productData.track_batches,
          use_fifo: productData.use_fifo
        };
        const created = await unifiedProductService.createProduct(basicProduct);
        toast.success('تم إنشاء المنتج محلياً (سيتم المزامنة عند الاتصال)');
        return created as any;
      } catch (fallbackError) {
        console.error('[createProduct] ❌ Fallback failed:', fallbackError);
      }
      
      toast.error("المؤسسة غير موجودة أو ليس لديك صلاحية للوصول إليها");
      throw new Error("Organization not found or access denied");
    }

    // ⚡ تحويل البيانات إلى صيغة V2
    const v2Params = transformFormDataToV2Params(productData, user.id);

    // ✅ تسجيل البيانات المرسلة للتشخيص
    console.log('🚀 إرسال بيانات المنتج V2:', {
      hasVariants: v2Params.variants !== null,
      variantsCount: v2Params.variants?.length || 0,
      weightSelling: v2Params.weight_selling?.enabled || false,
      boxSelling: v2Params.box_selling?.enabled || false,
      meterSelling: v2Params.meter_selling?.enabled || false,
      trackExpiry: v2Params.expiry_tracking?.enabled || false,
      trackSerials: v2Params.serial_tracking?.enabled || false,
      trackBatches: v2Params.batch_tracking?.enabled || false,
    });

    // 🚀 استخدام upsert_product_v2 بدلاً من create_product_complete
    console.log('[createProduct] 📤 Calling supabase.rpc("upsert_product_v2")...');
    console.log('[createProduct] 📤 RPC Parameters:', {
      p_product_id: null,
      p_basic_data: v2Params.basic_data,
      p_pricing_data: v2Params.pricing_data,
      p_weight_selling: v2Params.weight_selling,
      p_box_selling: v2Params.box_selling,
      p_meter_selling: v2Params.meter_selling,
      p_expiry_tracking: v2Params.expiry_tracking,
      p_serial_tracking: v2Params.serial_tracking,
      p_warranty: v2Params.warranty,
      p_batch_tracking: v2Params.batch_tracking,
      p_variants_count: v2Params.variants?.length || 0,
    });

    const { data: result, error: createError } = await supabase.rpc('upsert_product_v2', {
      p_product_id: null, // null = إنشاء جديد
      p_basic_data: v2Params.basic_data,
      p_pricing_data: v2Params.pricing_data,
      p_inventory_data: v2Params.inventory_data,
      p_weight_selling: v2Params.weight_selling,
      p_box_selling: v2Params.box_selling,
      p_meter_selling: v2Params.meter_selling,
      p_expiry_tracking: v2Params.expiry_tracking,
      p_serial_tracking: v2Params.serial_tracking,
      p_warranty: v2Params.warranty,
      p_batch_tracking: v2Params.batch_tracking,
      p_variants: v2Params.variants,
      p_initial_batches: null,
      p_initial_serials: null,
      p_price_tiers: v2Params.price_tiers,
      p_images: v2Params.images,
      p_business_specific: null,
      p_advanced_settings: v2Params.advanced_settings,
      p_marketing_settings: v2Params.marketing_settings,
      p_special_offers: v2Params.special_offers,
      p_advanced_description: v2Params.advanced_description,
      p_publication: v2Params.publication,
      p_user_id: user.id,
    });

    console.log('[createProduct] 📥 RPC Response:', { result, createError });

    if (createError) {
      console.error('[createProduct] ❌ RPC ERROR:', createError);
      console.error('[createProduct] ❌ Error details:', {
        message: createError.message,
        code: (createError as any).code,
        details: (createError as any).details,
        hint: (createError as any).hint,
      });

      // ✅ معالجة خاصة لأخطاء UUID
      if (createError.message?.includes('invalid input syntax for type uuid')) {
        toast.error("خطأ في صيغة معرف المؤسسة أو الفئة. يرجى التحقق من البيانات");
        throw new Error("Invalid UUID format in product data");
      }

      toast.error(`فشل إنشاء المنتج: ${createError.message}`);
      throw createError;
    }

    if (!result || !(result as any).success) {
      const errorMessage = (result as any)?.error || 'فشل إنشاء المنتج';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }

    const productId = (result as any).product_id;
    console.log('✅ تم إنشاء المنتج:', productId);

    // 🎯 جلب المنتج المنشأ مع جميع البيانات المرتبطة
    const { data: createdProduct, error: fetchError } = await supabase
      .from('products')
      .select(`
        *,
        category:category_id(id, name, slug),
        subcategory:subcategory_id(id, name, slug),
        product_images(product_id, image_url, sort_order),
        product_advanced_settings(*),
        product_marketing_settings(*),
        product_colors(
          id, name, color_code, image_url, quantity, is_default, barcode, has_sizes, price, purchase_price, variant_number,
          product_sizes(id, size_name, quantity, price, purchase_price, barcode, is_default)
        ),
        product_price_tiers(id, min_quantity, price, tier_name, tier_label, price_type, max_quantity, discount_percentage, is_active, sort_order)
      `)
      .eq('id', productId)
      .maybeSingle();

    if (fetchError) {
      toast.error(`تم إنشاء المنتج ولكن فشل جلب البيانات: ${fetchError.message}`);
      throw fetchError;
    }

    if (!createdProduct) {
      throw new Error(`Product with ID ${productId} not found after creation`);
    }

    // تحويل النتيجة إلى تنسيق Product
    const finalProductData: Product = {
      ...(createdProduct as unknown as Product),
      product_advanced_settings: createdProduct.product_advanced_settings?.[0] || null,
      product_marketing_settings: createdProduct.product_marketing_settings?.[0] || null,
      additional_images: createdProduct.product_images?.map(img => img.image_url) || [],
      colors: (createdProduct.product_colors as any)?.map((color: any) => ({
        ...color,
        product_id: productId,
        sizes: (color.product_sizes || []).map((size: any) => ({
          ...size,
          product_id: productId,
          color_id: color.id
        }))
      })) || [],
      purchase_page_config: (createdProduct as any).purchase_page_config ?
        JSON.parse(JSON.stringify((createdProduct as any).purchase_page_config)) : null,
      special_offers_config: productData.special_offers_config || null,
    };

    // 🚀 تحديث محدود للكاش
    try {
      cacheManager.invalidate(`products-${productData.organization_id}`);

      if (queryClient) {
        await queryClient.invalidateQueries({
          queryKey: ['products', productData.organization_id],
          exact: true
        });
      }
    } catch (refreshError) {
      // لا نريد أن يفشل الإنشاء بسبب مشاكل الكاش
    }

    toast.success("تم إنشاء المنتج بنجاح!");
    return finalProductData;

  } catch (error) {
    toast.error("فشل في إنشاء المنتج");
    throw error;
  }
};

export const updateProduct = async (id: string, updates: UpdateProduct): Promise<Product> => {
  // ⚡ PowerSync-First: تحديث محلي ثم مزامنة
  try {
    const { unifiedProductService } = await import('@/services/UnifiedProductService');
    const { powerSyncService } = await import('@/lib/powersync/PowerSyncService');

    const orgId = updates.organization_id || localStorage.getItem('currentOrganizationId') || localStorage.getItem('bazaar_organization_id');
    if (!orgId) {
      throw new Error('Organization ID not found');
    }

    unifiedProductService.setOrganizationId(orgId);

    const updateData: any = {};
    // الأسماء المتطابقة مع PowerSync Schema
    const fields = [
      // الحقول الأساسية
      'name','description','sku','barcode','price','purchase_price','wholesale_price',
      'stock_quantity','min_stock_level','is_active','thumbnail_image','category_id','subcategory_id',
      // حقول البيع بالوزن (أسماء PowerSync Schema)
      'sell_by_weight','weight_unit','price_per_weight_unit','purchase_price_per_weight_unit',
      'min_weight_per_sale','max_weight_per_sale','average_item_weight','available_weight','total_weight_purchased',
      // حقول البيع بالكرتون
      'sell_by_box','units_per_box','box_price','box_purchase_price','box_barcode',
      'allow_single_unit_sale','available_boxes','total_boxes_purchased',
      // حقول البيع بالمتر (أسماء PowerSync Schema)
      'sell_by_meter','meter_unit','price_per_meter','purchase_price_per_meter',
      'min_meters_per_sale','roll_length_meters','available_length','total_meters_purchased',
      // حقول تتبع الصلاحية
      'track_expiry','default_expiry_days','expiry_alert_days',
      // حقول تتبع الأرقام التسلسلية
      'track_serial_numbers','require_serial_on_sale',
      // حقول الضمان
      'has_warranty','warranty_duration_months','warranty_type',
      // حقول تتبع الدفعات
      'track_batches','use_fifo'
    ];

    // تحويل أسماء الحقول من Form إلى PowerSync Schema
    const fieldMapping: Record<string, string> = {
      'min_weight': 'min_weight_per_sale',
      'max_weight': 'max_weight_per_sale',
      'min_meters': 'min_meters_per_sale',
      'roll_length': 'roll_length_meters'
    };

    for (const key of fields) {
      const value = (updates as any)[key];
      if (value !== undefined) updateData[key] = value;
    }

    // تطبيق تحويل الأسماء إذا جاءت بالأسماء القديمة
    for (const [oldName, newName] of Object.entries(fieldMapping)) {
      if ((updates as any)[oldName] !== undefined && updateData[newName] === undefined) {
        updateData[newName] = (updates as any)[oldName];
      }
    }

    await unifiedProductService.updateProduct(id, updateData);

    // جلب المنتج والألوان والمقاسات من PowerSync بعد التحديث
    if (!powerSyncService.db) {
      console.warn('[products] PowerSync DB not initialized');
      throw new Error('PowerSync DB not initialized');
    }
    const product = await powerSyncService.queryOne<any>({
      sql: 'SELECT * FROM products WHERE id = ? LIMIT 1',
      params: [id]
    });
    if (!product) {
      throw new Error('Product not found locally after update');
    }

    const colors = await powerSyncService.query<any>({
      sql: 'SELECT * FROM product_colors WHERE product_id = ? ORDER BY created_at',
      params: [id]
    });

    const colorsWithSizes = [] as any[];
    for (const color of colors) {
      const sizes = await powerSyncService.query<any>({
        sql: 'SELECT * FROM product_sizes WHERE color_id = ? ORDER BY created_at',
        params: [color.id]
      });
      colorsWithSizes.push({ ...color, sizes });
    }

    const resultProduct: Product = {
      ...(product as Product),
      colors: colorsWithSizes
    } as Product;

    try {
      if (typeof navigator === 'undefined' || navigator.onLine) {
        await powerSyncService.forceSync();
      }
    } catch (syncErr) {
      console.warn('[updateProduct] PowerSync forceSync failed (will sync later):', syncErr);
    }

    // ✅ تحديث مستويات الأسعار (wholesale_tiers) عبر PowerSync
    // هذا يضمن العمل أوفلاين وأونلاين
    const wholesaleTiers = (updates as any).wholesale_tiers;
    if (wholesaleTiers && Array.isArray(wholesaleTiers)) {
      console.log('[updateProduct] 💰 Updating wholesale tiers via PowerSync:', wholesaleTiers.length, 'tiers');
      try {
        // 1. حذف المستويات القديمة من PowerSync
        const existingTiers = await powerSyncService.query<any>({
          sql: 'SELECT id FROM product_wholesale_tiers WHERE product_id = ?',
          params: [id]
        });

        for (const tier of existingTiers) {
          await powerSyncService.mutate({
            table: 'product_wholesale_tiers',
            operation: 'DELETE',
            where: [{ column: 'id', value: tier.id }]
          });
        }
        console.log('[updateProduct] 🗑️ Deleted', existingTiers.length, 'old tiers');

        // 2. إضافة المستويات الجديدة
        for (const tier of wholesaleTiers) {
          const tierId = crypto.randomUUID();
          await powerSyncService.mutate({
            table: 'product_wholesale_tiers',
            operation: 'INSERT',
            data: {
              id: tierId,
              organization_id: orgId,
              product_id: id,
              min_quantity: Number(tier.min_quantity),
              price_per_unit: Number(tier.price_per_unit || tier.price),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          });
        }
        console.log('[updateProduct] ✅ Inserted', wholesaleTiers.length, 'new tiers via PowerSync');
      } catch (tierError) {
        console.error('[updateProduct] ❌ Exception updating wholesale tiers:', tierError);
      }
    }

    toast.success('تم تحديث المنتج عبر PowerSync (أوفلاين/أونلاين)');
    return resultProduct;
  } catch (psError) {
    console.warn('[updateProduct] PowerSync-first path فشل، سيتم استخدام المسار القديم', psError);
  }

  // ⚡ Offline-First: التحقق من الاتصال
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  
  // ⚡ إذا كان غير متصل، استخدم UnifiedProductService مباشرة
  if (!isOnline) {
    console.log('[updateProduct] 📴 Offline mode - using UnifiedProductService');
    try {
      const { unifiedProductService } = await import('@/services/UnifiedProductService');
      const orgId = updates.organization_id || localStorage.getItem('currentOrganizationId') || localStorage.getItem('bazaar_organization_id');
      if (!orgId) {
        throw new Error('Organization ID not found');
      }
      unifiedProductService.setOrganizationId(orgId);
      
      const updateData: any = {
        name: updates.name,
        description: updates.description,
        sku: updates.sku,
        barcode: updates.barcode,
        price: updates.price,
        purchase_price: updates.purchase_price,
        wholesale_price: updates.wholesale_price,
        stock_quantity: updates.stock_quantity,
        min_stock_level: updates.min_stock_level,
        is_active: updates.is_active
      };
      
      const updated = await unifiedProductService.updateProduct(id, updateData);
      
      if (updated) {
        toast.success('تم تحديث المنتج محلياً (سيتم المزامنة عند الاتصال)');
        return updated as any;
      } else {
        throw new Error('Failed to update product');
      }
    } catch (offlineError) {
      console.error('[updateProduct] ❌ Offline update failed:', offlineError);
      toast.error('فشل تحديث المنتج محلياً');
      throw offlineError;
    }
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const error = new Error("User not authenticated for update");
    toast.error("يجب تسجيل الدخول لتحديث المنتج.");
    throw error;
  }

  try {
    // ⚡ تحويل البيانات إلى صيغة V2 - استخدام نفس الدالة المحولة
    const productData = updates as unknown as ProductFormValues;
    const v2Params = transformFormDataToV2Params(productData, user.id);

    // ✅ تسجيل البيانات المرسلة للتشخيص
    console.log('🔄 تحديث بيانات المنتج V2:', {
      productId: id,
      hasVariants: v2Params.variants !== null,
      variantsCount: v2Params.variants?.length || 0,
      weightSelling: v2Params.weight_selling?.enabled || false,
      boxSelling: v2Params.box_selling?.enabled || false,
      meterSelling: v2Params.meter_selling?.enabled || false,
      trackExpiry: v2Params.expiry_tracking?.enabled || false,
      trackSerials: v2Params.serial_tracking?.enabled || false,
      trackBatches: v2Params.batch_tracking?.enabled || false,
    });

    // 🚀 استخدام upsert_product_v2 للتحديث (مع تمرير product_id)
    const { data: result, error: updateError } = await supabase.rpc('upsert_product_v2', {
      p_product_id: id, // تمرير ID = تحديث
      p_basic_data: v2Params.basic_data,
      p_pricing_data: v2Params.pricing_data,
      p_inventory_data: v2Params.inventory_data,
      p_weight_selling: v2Params.weight_selling,
      p_box_selling: v2Params.box_selling,
      p_meter_selling: v2Params.meter_selling,
      p_expiry_tracking: v2Params.expiry_tracking,
      p_serial_tracking: v2Params.serial_tracking,
      p_warranty: v2Params.warranty,
      p_batch_tracking: v2Params.batch_tracking,
      p_variants: v2Params.variants,
      p_initial_batches: null,
      p_initial_serials: null,
      p_price_tiers: v2Params.price_tiers,
      p_images: v2Params.images,
      p_business_specific: null,
      p_advanced_settings: v2Params.advanced_settings,
      p_marketing_settings: v2Params.marketing_settings,
      p_special_offers: v2Params.special_offers,
      p_advanced_description: v2Params.advanced_description,
      p_publication: v2Params.publication,
      p_user_id: user.id,
    });

    if (updateError) {
      console.error('❌ خطأ في تحديث المنتج:', updateError);
      toast.error(`فشل تحديث المنتج: ${updateError.message}`);
      throw updateError;
    }

    if (!result || !(result as any)?.success) {
      const errorMessage = (result as any)?.error || 'فشل تحديث المنتج';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }

    console.log('✅ تم تحديث المنتج:', id);

    // 🔧 تحديث إضافي لshipping_method_type إذا كان موجوداً
    if ((updates as any).shipping_method_type !== undefined) {
      const updateData: any = {
        shipping_method_type: (updates as any).shipping_method_type,
        updated_at: new Date().toISOString(),
        updated_by_user_id: user.id
      };

      if ((updates as any).shipping_method_type === 'custom') {
        updateData.shipping_provider_id = null;
      }

      const { error: shippingUpdateError } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id);

      if (shippingUpdateError) {
        console.warn('⚠️ فشل تحديث إعدادات الشحن:', shippingUpdateError.message);
      }
    }

    // 🎯 جلب المنتج المحدث مع جميع البيانات المرتبطة
    const { data: updatedProduct, error: fetchError } = await supabase
      .from('products')
      .select(`
        *,
        category:category_id(id, name, slug),
        subcategory:subcategory_id(id, name, slug),
        product_images(product_id, image_url, sort_order),
        product_advanced_settings(*),
        product_marketing_settings(*),
        product_colors(
          id, name, color_code, image_url, quantity, is_default, barcode, has_sizes, price, purchase_price, variant_number,
          product_sizes(id, size_name, quantity, price, purchase_price, barcode, is_default)
        ),
        product_price_tiers(id, min_quantity, price, tier_name, tier_label, price_type, max_quantity, discount_percentage, is_active, sort_order)
      `)
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      toast.error(`تم تحديث المنتج ولكن فشل جلب البيانات: ${fetchError.message}`);
      throw fetchError;
    }

    if (!updatedProduct) {
      throw new Error(`Product with ID ${id} not found after update`);
    }

    // تحويل النتيجة إلى تنسيق Product
    const resultProduct: Product = {
      ...(updatedProduct as unknown as Product),
      product_advanced_settings: updatedProduct.product_advanced_settings?.[0] || null,
      product_marketing_settings: updatedProduct.product_marketing_settings?.[0] || null,
      additional_images: updatedProduct.product_images?.map(img => img.image_url) || [],
      colors: (updatedProduct.product_colors as any)?.map((color: any) => ({
        ...color,
        product_id: id,
        sizes: (color.product_sizes || []).map((size: any) => ({
          ...size,
          product_id: id,
          color_id: color.id
        }))
      })) || [],
      purchase_page_config: updatedProduct.purchase_page_config ?
        JSON.parse(JSON.stringify(updatedProduct.purchase_page_config)) : null,
      special_offers_config: (updatedProduct as any).special_offers_config ?
        JSON.parse(JSON.stringify((updatedProduct as any).special_offers_config)) : null,
    };

    // 🚀 تحديث محدود للكاش
    try {
      cacheManager.invalidate(`product-${id}`);
      cacheManager.invalidate(`products-${resultProduct.organization_id}`);

      if (queryClient) {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ['product', id],
            exact: true
          }),
          queryClient.invalidateQueries({
            queryKey: ['products', resultProduct.organization_id],
            exact: true
          })
        ]);
      }
    } catch (refreshError) {
      // لا نريد أن يفشل التحديث بسبب مشاكل الكاش
    }

    toast.success("تم تحديث المنتج بنجاح!");
    return resultProduct;

  } catch (error: any) {
    toast.error(`فشل تحديث المنتج: ${error.message}`);
    throw error;
  }
};

export const deleteProduct = async (id: string, forceDisable: boolean = false): Promise<void> => {
  const { data: product, error: fetchError } = await supabase
    .from('products')
    .select('organization_id')
    .eq('id', id)
    .single();

  if (fetchError || !product) {
    throw new Error('Product not found for invalidation.');
  }

  const organizationId = product.organization_id;

  // ⚡ توحيد مسار الكتابة: استخدام Local Service بدلاً من Supabase مباشرة
  const { deleteLocalProduct, updateLocalProduct } = await import('@/api/localProductService');
  
  if (forceDisable) {
    // تحديث محلي مع pending_operation = 'UPDATE'
    await updateLocalProduct(id, {
      is_active: false,
      is_featured: false
    } as any);
  } else {
    // حذف محلي مع pending_operation = 'DELETE'
    await deleteLocalProduct(id);
  }

  // Invalidate relevant queries
  if (organizationId) {
    await queryClient.invalidateQueries({ queryKey: ['products', organizationId] });
    await queryClient.invalidateQueries({ queryKey: ['product-categories', organizationId] });
     await queryClient.invalidateQueries({ queryKey: ['dashboard-data', organizationId] });
  } else {
    await queryClient.invalidateQueries({ queryKey: ['products'] });
    await queryClient.invalidateQueries({ queryKey: ['categories'] });
  }

  toast.success('تم حذف المنتج بنجاح');
};

export const getCategories = async (organizationId?: string): Promise<Category[]> => {
  try {
    // محاولة الحصول على معرف المؤسسة إذا لم يتم تمريره
    let orgId = organizationId;
    if (!orgId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userProfile } = await supabase
          .from('users')
          .select('organization_id')
          .eq('id', user.id)
          .single();
        orgId = userProfile?.organization_id;
      }
    }
    
    // استخدام UnifiedRequestManager إذا كان معرف المؤسسة متاحاً
    if (orgId) {
      const categories = await UnifiedRequestManager.getProductCategories(orgId);
      return categories || [];
    }
    
    // fallback للطريقة التقليدية
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .order('name');

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    if (import.meta.env.DEV) {
    }
    throw error;
  }
};

export const getCategoryById = async (id: string): Promise<Category | null> => {
  const { data, error } = await supabase
    .from('product_categories')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const createCategory = async (category: { 
  name: string; 
  description?: string; 
  icon?: string; 
  organization_id: string;
}): Promise<Category> => {
  const { data, error } = await supabase
    .from('product_categories')
    .insert({
      name: category.name,
      description: category.description || null,
      icon: category.icon || null,
      slug: category.name.toLowerCase().replace(/\s+/g, '-'),
      organization_id: category.organization_id
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Invalidate categories queries
  await queryClient.invalidateQueries({ queryKey: ['product-categories', category.organization_id] });
  await queryClient.invalidateQueries({ queryKey: ['categories'] });

  return data;
};

export const getSubcategories = async (categoryId?: string): Promise<Subcategory[]> => {
  let query = supabase
    .from('product_subcategories')
    .select('*')
    .order('name');
    
  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data;
};

export const getSubcategoryById = async (id: string): Promise<Subcategory | null> => {
  const { data, error } = await supabase
    .from('product_subcategories')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const createSubcategory = async (subcategory: { category_id: string; name: string; description?: string }): Promise<Subcategory> => {
  const { data, error } = await supabase
    .from('product_subcategories')
    .insert({
      category_id: subcategory.category_id,
      name: subcategory.name,
      description: subcategory.description || null,
      slug: subcategory.name.toLowerCase().replace(/\s+/g, '-')
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const getWholesaleTiers = async (productId: string) => {
  console.log('[getWholesaleTiers] 🔍 Loading tiers for product:', productId);

  if (!productId) {
    console.log('[getWholesaleTiers] ⚠️ No productId provided');
    return [];
  }

  try {
    // ✅ استخدام product_price_tiers بدلاً من wholesale_tiers
    // هذا هو الجدول الصحيح الذي يستخدمه RPC upsert_product_v2
    const { data, error } = await supabase
      .from('product_price_tiers')
      .select('id, product_id, min_quantity, price, tier_name, tier_label, price_type, max_quantity, discount_percentage, is_active, sort_order')
      .eq('product_id', productId)
      .order('min_quantity', { ascending: true });

    if (error) {
      console.error('[getWholesaleTiers] ❌ Error:', error);
      throw error;
    }

    // تحويل البيانات للتوافق مع الـ interface القديم
    const transformedData = (data || []).map(tier => ({
      id: tier.id,
      product_id: tier.product_id,
      min_quantity: tier.min_quantity,
      price_per_unit: tier.price, // تحويل price إلى price_per_unit للتوافق
      price: tier.price,
      tier_name: tier.tier_name,
      tier_label: tier.tier_label,
      price_type: tier.price_type,
      max_quantity: tier.max_quantity,
      discount_percentage: tier.discount_percentage,
      is_active: tier.is_active,
      sort_order: tier.sort_order,
    }));

    console.log('[getWholesaleTiers] ✅ Loaded tiers:', transformedData.length);
    return transformedData;
  } catch (error) {
    console.error('[getWholesaleTiers] ❌ Exception:', error);
    throw error;
  }
};

export const createWholesaleTier = async (tier: {
  product_id: string;
  min_quantity: number;
  price_per_unit?: number;
  price?: number;
  organization_id: string;
}) => {
  console.log('[createWholesaleTier] 🔍 Creating tier:', tier);

  // ✅ استخدام product_price_tiers بدلاً من product_wholesale_tiers
  const priceValue = tier.price ?? tier.price_per_unit ?? 0;

  const { data, error } = await supabase
    .from('product_price_tiers')
    .insert([
      {
        product_id: tier.product_id,
        min_quantity: tier.min_quantity,
        price: priceValue, // الجدول يستخدم price وليس price_per_unit
        tier_name: 'wholesale',
        price_type: 'fixed',
        is_active: true,
        sort_order: 0,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('[createWholesaleTier] ❌ Error:', error);
    throw error;
  }

  // تحويل البيانات للتوافق مع الـ interface القديم
  const transformedData = {
    ...data,
    price_per_unit: data.price, // توافق مع الـ interface القديم
  };

  console.log('[createWholesaleTier] ✅ Created tier:', transformedData);
  return transformedData;
};

export const updateWholesaleTier = async (
  tierId: string,
  updates: {
    min_quantity?: number;
    price_per_unit?: number;
    price?: number;
  }
) => {
  console.log('[updateWholesaleTier] 🔍 Updating tier:', tierId, updates);

  // ✅ استخدام product_price_tiers بدلاً من product_wholesale_tiers
  // تحويل price_per_unit إلى price للتوافق مع الجدول
  const updateData: Record<string, any> = {};
  if (updates.min_quantity !== undefined) {
    updateData.min_quantity = updates.min_quantity;
  }
  if (updates.price !== undefined) {
    updateData.price = updates.price;
  } else if (updates.price_per_unit !== undefined) {
    updateData.price = updates.price_per_unit; // تحويل للتوافق
  }

  const { data, error } = await supabase
    .from('product_price_tiers')
    .update(updateData)
    .eq('id', tierId)
    .select()
    .single();

  if (error) {
    console.error('[updateWholesaleTier] ❌ Error:', error);
    throw error;
  }

  // تحويل البيانات للتوافق مع الـ interface القديم
  const transformedData = {
    ...data,
    price_per_unit: data.price,
  };

  console.log('[updateWholesaleTier] ✅ Updated tier:', transformedData);
  return transformedData;
};

export const deleteWholesaleTier = async (tierId: string) => {
  console.log('[deleteWholesaleTier] 🔍 Deleting tier:', tierId);

  if (!tierId) {
    throw new Error('معرف المرحلة السعرية مطلوب للحذف');
  }

  try {
    // ✅ استخدام product_price_tiers بدلاً من wholesale_tiers
    const { error } = await supabase
      .from('product_price_tiers')
      .delete()
      .eq('id', tierId);

    if (error) {
      console.error('[deleteWholesaleTier] ❌ Error:', error);
      throw error;
    }

    console.log('[deleteWholesaleTier] ✅ Deleted tier:', tierId);
    return true;
  } catch (error) {
    console.error('[deleteWholesaleTier] ❌ Exception:', error);
    throw error;
  }
};

export const getProductPriceForQuantity = async (productId: string, quantity: number) => {
  const { data, error } = await supabase
    .rpc('get_product_price_for_quantity', {
      p_product_id: productId,
      p_quantity: quantity
    });

  if (error) {
    throw error;
  }

  return data;
};

export const generateAutomaticSku = async (
  categoryShortName: string = 'PR',
  brandShortName: string = '',
  organizationId?: string
): Promise<string> => {
  try {
    const cleanCategoryCode = categoryShortName ? categoryShortName.toUpperCase().substring(0, 2) : 'PR';
    
    let brandCode = '';
    if (brandShortName && brandShortName.trim() !== '') {
      brandCode = '-' + brandShortName.toUpperCase().substring(0, 2);
    }
    
    const yearCode = new Date().getFullYear().toString().substring(2);
    
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    const generatedSku = `${cleanCategoryCode}${brandCode}-${yearCode}-${randomNum}`;
    
    if (navigator.onLine && organizationId) {
      try {
        const { data: existingProducts, error } = await supabase
          .from('products')
          .select('id, name')
          .eq('sku', generatedSku);
        
        if (existingProducts && existingProducts.length > 0) {
          
          return generateAutomaticSku(categoryShortName, brandShortName, organizationId);
        }
      } catch (checkError) {
      }
    }
    
    return generatedSku;
  } catch (error) {
    
    const prefix = categoryShortName ? categoryShortName.substring(0, 2).toUpperCase() : 'PR';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return `${prefix}-${timestamp.substring(timestamp.length - 4)}-${random}`;
  }
};

export const generateAutomaticBarcode = async (): Promise<string> => {
  // ⚡ PowerSync local barcode generation (unique locally)
  try {
    const { powerSyncService } = await import('@/lib/powersync/PowerSyncService');
    const orgId =
      localStorage.getItem('currentOrganizationId') ||
      localStorage.getItem('bazaar_organization_id');

    const generateUnique = async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        const candidate = generateEAN13Fallback();
        if (!orgId) return candidate;
        if (!powerSyncService.db) {
          console.warn('[products] PowerSync DB not initialized');
          return candidate;
        }
        const existing = await powerSyncService.queryOne<{ id: string }>({
          sql: `SELECT id FROM products WHERE barcode = ? AND organization_id = ?
           UNION
           SELECT id FROM product_colors WHERE barcode = ? AND organization_id = ?
           UNION
           SELECT id FROM product_sizes WHERE barcode = ? AND organization_id = ?
           LIMIT 1`,
          params: [candidate, orgId, candidate, orgId, candidate, orgId]
        });
        if (!existing) return candidate;
      }
      return generateEAN13Fallback();
    };

    const barcode = await generateUnique();
    return barcode;
  } catch (err) {
    console.warn('[generateAutomaticBarcode] PowerSync generation failed, fallback to legacy path', err);
  }
  // ⚡ Offline-First: إنشاء باركود محلياً أولاً
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  
  if (isOnline) {
    try {
      const { data, error } = await supabase.rpc('generate_product_barcode');

      if (error) {
        console.warn('[generateAutomaticBarcode] RPC failed, using local generation:', error);
        return generateEAN13Fallback();
      }

      // ⚡ التحقق من التكرار محلياً أيضاً
      try {
        const { powerSyncService } = await import('@/lib/powersync/PowerSyncService');
        const orgId = localStorage.getItem('currentOrganizationId') || localStorage.getItem('bazaar_organization_id');
        if (orgId && powerSyncService.db) {
          const existing = await powerSyncService.queryOne<{ id: string }>({
            sql: 'SELECT id FROM products WHERE barcode = ? AND organization_id = ? LIMIT 1',
            params: [data, orgId]
          });
          if (existing) {
            console.warn('[generateAutomaticBarcode] Barcode exists locally, regenerating...');
            return generateEAN13Fallback();
          }
        }
      } catch (localCheckError) {
        // تجاهل الأخطاء المحلية
      }

      return data;
    } catch (error) {
      console.warn('[generateAutomaticBarcode] Error, using local generation:', error);
      return generateEAN13Fallback();
    }
  }
  
  // ⚡ Offline: إنشاء باركود محلياً
  return generateEAN13Fallback();
};

const generateEAN13Fallback = (): string => {
  const prefix = '200';
  
  const body = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
  
  const digits = (prefix + body).split('').map(Number);
  
  let oddSum = 0;
  let evenSum = 0;
  
  for (let i = 0; i < 12; i++) {
    if (i % 2 === 0) {
      oddSum += digits[i];
    } else {
      evenSum += digits[i];
    }
  }
  
  const checkDigit = (10 - ((oddSum + evenSum * 3) % 10)) % 10;
  
  return prefix + body + checkDigit.toString();
};

export const generateVariantBarcode = async (
  productId: string,
  variantId: string
): Promise<string> => {
  // ⚡ PowerSync local variant barcode (suffix-based, unique locally)
  try {
    const { powerSyncService } = await import('@/lib/powersync/PowerSyncService');
    const orgId =
      localStorage.getItem('currentOrganizationId') ||
      localStorage.getItem('bazaar_organization_id');

    if (!powerSyncService.db) {
      console.warn('[products] PowerSync DB not initialized');
      return null;
    }
    const product = await powerSyncService.queryOne<{ barcode?: string }>({
      sql: 'SELECT barcode FROM products WHERE id = ? LIMIT 1',
      params: [productId]
    });

    const base = product?.barcode || (await generateAutomaticBarcode());

    const generateUnique = async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        const suffix = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        const candidate = `${base}-${suffix}`;
        if (!orgId) return candidate;
        if (!powerSyncService.db) {
          console.warn('[products] PowerSync DB not initialized');
          return candidate;
        }
        const existing = await powerSyncService.queryOne<{ id: string }>({
          sql: `SELECT id FROM product_colors WHERE barcode = ? AND organization_id = ?
           UNION
           SELECT id FROM product_sizes WHERE barcode = ? AND organization_id = ?
           LIMIT 1`,
          params: [candidate, orgId, candidate, orgId]
        });
        if (!existing) return candidate;
      }
      return `${base}-${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`;
    };

    const barcode = await generateUnique();
    return barcode;
  } catch (err) {
    console.warn('[generateVariantBarcode] PowerSync variant generation failed, fallback to legacy path', err);
  }
  // ⚡ Offline-First: البحث عن باركود المنتج محلياً أولاً
  try {
    const { powerSyncService } = await import('@/lib/powersync/PowerSyncService');
    const orgId = localStorage.getItem('currentOrganizationId') || localStorage.getItem('bazaar_organization_id');
    
    if (orgId) {
      // البحث عن باركود المنتج في PowerSync
      if (!powerSyncService.db) {
      console.warn('[products] PowerSync DB not initialized');
      return null;
    }
    const product = await powerSyncService.queryOne<{ barcode?: string }>({
        sql: 'SELECT barcode FROM products WHERE id = ? AND organization_id = ?',
        params: [productId, orgId]
      });
      
      if (product?.barcode && powerSyncService.db) {
        const suffix = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        const variantBarcode = `${product.barcode}-${suffix}`;
        
        // التحقق من التكرار محلياً
        const existing = await powerSyncService.queryOne<{ id: string }>({
          sql: `SELECT id FROM product_colors WHERE barcode = ? AND organization_id = ? 
           UNION 
           SELECT id FROM product_sizes WHERE barcode = ? AND organization_id = ? 
           LIMIT 1`,
          params: [variantBarcode, orgId, variantBarcode, orgId]
        });
        
        if (!existing) {
          return variantBarcode;
        }
      }
    }
  } catch (localError) {
    console.warn('[generateVariantBarcode] Local check failed:', localError);
  }

  // Fallback: محاولة RPC إذا كان متصل
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (isOnline) {
    try {
      const { data, error } = await supabase.rpc('generate_variant_barcode', {
        product_id: productId,
        variant_id: variantId
      });

      if (!error && data) {
        return data;
      }
    } catch (rpcError) {
      console.warn('[generateVariantBarcode] RPC failed:', rpcError);
    }
  }

  // ⚡ Fallback نهائي: إنشاء باركود محلياً
  try {
    const { powerSyncService } = await import('@/lib/powersync/PowerSyncService');
    const orgId = localStorage.getItem('currentOrganizationId') || localStorage.getItem('bazaar_organization_id');
    
    if (orgId) {
      if (!powerSyncService.db) {
      console.warn('[products] PowerSync DB not initialized');
      return null;
    }
    const product = await powerSyncService.queryOne<{ barcode?: string }>({
        sql: 'SELECT barcode FROM products WHERE id = ? AND organization_id = ?',
        params: [productId, orgId]
      });
      
      if (product?.barcode) {
        const suffix = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        return `${product.barcode}-${suffix}`;
      }
    }
  } catch {}

  // Fallback نهائي: إنشاء باركود جديد
  const newBarcode = await generateAutomaticBarcode();
  const suffix = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `${newBarcode}-${suffix}`;
};

export const validateBarcode = async (barcode: string): Promise<boolean> => {
  // ⚡ PowerSync-local validation first (format + uniqueness)
  const localValidation = validateEAN13Locally(barcode);
  if (!localValidation) return false;

  try {
    const { powerSyncService } = await import('@/lib/powersync/PowerSyncService');
    const orgId =
      localStorage.getItem('currentOrganizationId') ||
      localStorage.getItem('bazaar_organization_id');

    if (orgId) {
      const existing = await powerSyncService.queryOne<{ id: string }>({
        sql: `SELECT id FROM products WHERE barcode = ? AND organization_id = ?
         UNION
         SELECT id FROM product_colors WHERE barcode = ? AND organization_id = ?
         UNION
         SELECT id FROM product_sizes WHERE barcode = ? AND organization_id = ?
         LIMIT 1`,
        params: [barcode, orgId, barcode, orgId, barcode, orgId]
      });
      if (existing) return false;
    }
  } catch (err) {
    console.warn('[validateBarcode] PowerSync-local validation failed, fallback to legacy path', err);
  }

  // ⚡ إذا كان متصل، التحقق من السيرفر أيضاً
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (isOnline) {
    try {
      const { data, error } = await supabase.rpc('validate_barcode', {
        barcode: barcode
      });

      if (error) {
        console.warn('[validateBarcode] RPC failed, using local validation:', error);
        return localValidation; // نعتمد على التحقق المحلي
      }

      return data; // النتيجة من السيرفر
    } catch (error) {
      console.warn('[validateBarcode] RPC error, using local validation:', error);
      return localValidation; // نعتمد على التحقق المحلي
    }
  }

  // ⚡ Offline: نعتمد على التحقق المحلي فقط
  return localValidation;
};

const validateEAN13Locally = (barcode: string): boolean => {
  if (!/^\d{13}$/.test(barcode)) {
    return false;
  }
  
  const digits = barcode.split('').map(Number);
  
  const checkDigit = digits.pop();
  
  let oddSum = 0;
  let evenSum = 0;
  
  for (let i = 0; i < digits.length; i++) {
    if (i % 2 === 0) {
      oddSum += digits[i];
    } else {
      evenSum += digits[i];
    }
  }
  
  const calculatedCheckDigit = (10 - ((oddSum + evenSum * 3) % 10)) % 10;
  
  return checkDigit === calculatedCheckDigit;
};

export const disableProduct = async (id: string): Promise<Product> => {

  try {
    const { data, error } = await supabase
      .from('products')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`
        *,
        category:category_id(id, name, slug),
        subcategory:subcategory_id(id, name, slug)
      `)
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error(`لم يتم العثور على المنتج بعد التعطيل: ${id}`);
    }

    return data as any;
  } catch (error) {
    throw error;
  }
};

export const enableProduct = async (id: string): Promise<Product> => {

  try {
    const { data, error } = await supabase
      .from('products')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`
        *,
        category:category_id(id, name, slug),
        subcategory:subcategory_id(id, name, slug)
      `)
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error(`لم يتم العثور على المنتج بعد التفعيل: ${id}`);
    }

    return data as any;
  } catch (error) {
    throw error;
  }
};

export const updateProductPurchaseConfig = async (
  productId: string,
  config: PurchasePageConfig | null
): Promise<Product | null> => {
  if (!productId) {
    throw new Error('Product ID is required.');
  }

  try {
    
    const jsonConfig = config ? JSON.parse(JSON.stringify(config)) : null;
    
    const updateData: any = { 
      purchase_page_config: jsonConfig,
      updated_at: new Date().toISOString()
    };
    
    if (config && 'shipping_clone_id' in config) {
      updateData.shipping_clone_id = config.shipping_clone_id;
      
    }
    
    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', productId)
      .select(`
        *,
        purchase_page_config,
        category:category_id(id, name, slug),
        subcategory:subcategory_id(id, name, slug)
      `)
      .single();

    if (error) {
      throw error;
    }
    
    if (!data) {
      throw new Error(`Product not found after updating purchase page config: ${productId}`);
    }

    return data as any;
  } catch (error) {
    throw error;
  }
};

/**
 * Update product special offers configuration
 * This is separate from purchase_page_config.quantityOffers
 */
export const updateProductSpecialOffers = async (
  productId: string,
  config: any | null // Will be typed properly with SpecialOffersConfig
): Promise<Product | null> => {
  if (!productId) {
    throw new Error('Product ID is required.');
  }

  try {
    const jsonConfig = config ? JSON.parse(JSON.stringify(config)) : null;
    
    const updateData = { 
      special_offers_config: jsonConfig,
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', productId)
      .select(`
        *,
        special_offers_config,
        category:category_id(id, name, slug),
        subcategory:subcategory_id(id, name, slug)
      `)
      .single();

    if (error) {
      throw error;
    }
    
    if (!data) {
      throw new Error(`Product not found after updating special offers config: ${productId}`);
    }

    return data as any;
  } catch (error) {
    throw error;
  }
};

export const getProductListForOrganization = async (
  organizationId: string
): Promise<{ id: string; name: string }[]> => {
  if (!organizationId) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, name')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    return [];
  }
};

export interface Review {
  id: string;
  product_id: string;
  user_id?: string | null;
  user_name?: string | null;
  rating: number;
  comment?: string | null;
  is_approved: boolean;
  is_verified_purchase?: boolean;
  created_at: string;
}

export const getProductReviews = async (productId: string): Promise<Review[]> => {
  const { data, error } = await supabase
    .from('product_reviews')
    .select('*')
    .eq('product_id', productId)
    .eq('is_approved', true)
    .order('created_at', { ascending: false });

  if (error) {
    return [];
  }
  return data as Review[];
};

export const updateReview = async (
  reviewId: string,
  is_approved: boolean,
  comment?: string
): Promise<boolean> => {
  const { data, error } = await supabase
    .from('product_reviews')
    .update({ 
      is_approved,
      comment: comment || undefined
    })
    .eq('id', reviewId);

  if (error) {
    toast.error(`Error updating review: ${error.message}`);
    return false;
  }
  return true;
};

// دالة نشر المنتج (تحويل من مسودة إلى منشور)
export const publishProduct = async (productId: string): Promise<boolean> => {
  try {
    // المحاولة الأساسية: تحديث is_active و publication_status معاً إن وُجد العمود
    const { error } = await supabase
      .from('products')
      .update({
        is_active: true,
        // في بعض قواعد البيانات قد لا يكون العمود موجوداً بعد؛ إن لم يكن سيُعاد خطأ ونعيد المحاولة بدون هذا الحقل
        // @ts-ignore - الحقل اختياري بحسب المخطط
        publication_status: 'published',
        published_at: new Date().toISOString(),
      } as any)
      .eq('id', productId);

    if (!error) return true;

    // معالجة توافقية: في حال فشل التحديث بسبب عدم وجود العمود، أعد المحاولة بتحديث is_active فقط
    const needsRetry =
      typeof error?.message === 'string' &&
      /column\s+\"?publication_status\"?\s+does not exist|invalid input|column .* does not exist/i.test(error.message);

    if (needsRetry) {
      const { error: fallbackError } = await supabase
        .from('products')
        .update({
          is_active: true,
          published_at: new Date().toISOString(),
        })
        .eq('id', productId);

      if (!fallbackError) return true;
      console.error('Fallback publish failed:', fallbackError);
      return false;
    }

    console.error('Error publishing product:', error);
    return false;
  } catch (error) {
    console.error('Error publishing product:', error);
    return false;
  }
};

// إرجاع المنتج إلى حالة المسودة
export const revertProductToDraft = async (productId: string): Promise<boolean> => {
  try {
    // محاولة تعيين is_active = false وتحديث حالة النشر إن وُجد العمود
    const { error } = await supabase
      .from('products')
      .update({
        is_active: false,
        // @ts-ignore: publication_status قد لا يكون موجوداً في كل المخططات
        publication_status: 'draft',
        published_at: null,
      } as any)
      .eq('id', productId);

    if (!error) return true;

    const needsFallback =
      typeof error?.message === 'string' &&
      /column\s+\"?publication_status\"?\s+does not exist|invalid input|column .* does not exist/i.test(error.message);

    if (needsFallback) {
      const { error: fbError } = await supabase
        .from('products')
        .update({ is_active: false, published_at: null })
        .eq('id', productId);
      if (!fbError) return true;
      console.error('Fallback revert to draft failed:', fbError);
      return false;
    }

    console.error('Error reverting product to draft:', error);
    return false;
  } catch (error) {
    console.error('Error reverting product to draft:', error);
    return false;
  }
};

// 🚀 دالة محسنة لتحميل المنتجات بشكل متدرج
export const getProductsPaginatedOptimized = async (
  organizationId: string,
  page: number = 1,
  pageSize: number = 12,
  options: {
    includeInactive?: boolean;
    searchQuery?: string;
    categoryFilter?: string;
    stockFilter?: string;
    publicationFilter?: string;
    sortOption?: string;
  } = {}
): Promise<{
  products: Product[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}> => {
  // استخدام الدالة الأصلية مع تحسينات الأداء
  return await getProductsPaginated(organizationId, page, pageSize, options);
};
