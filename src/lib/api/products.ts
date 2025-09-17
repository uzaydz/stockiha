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
            subcategory:subcategory_id(id, name, slug)
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
          description,
          price,
          compare_at_price,
          sku,
          barcode,
          category_id,
          subcategory_id,
          brand,
          images,
          thumbnail_image,
          stock_quantity,
          features,
          specifications,
          is_digital,
          is_new,
          is_featured,
          created_at,
          updated_at,
          purchase_price,
          min_stock_level,
          reorder_level,
          reorder_quantity,
          organization_id,
          slug,
          has_variants,
          show_price_on_landing,
          wholesale_price,
          partial_wholesale_price,
          min_wholesale_quantity,
          min_partial_wholesale_quantity,
          allow_retail,
          allow_wholesale,
          allow_partial_wholesale,
          last_inventory_update,
          is_active,
          use_sizes,
          has_fast_shipping,
          has_money_back,
          has_quality_guarantee,
          fast_shipping_text,
          money_back_text,
          quality_guarantee_text,
          is_sold_by_unit,
          unit_type,
          use_variant_prices,
          unit_purchase_price,
          unit_sale_price,
          purchase_page_config,
          shipping_clone_id,
          name_for_shipping,
          created_by_user_id,
          updated_by_user_id,
          form_template_id,
          shipping_provider_id,
          use_shipping_clone,
          shipping_method_type,
          special_offers_config,
          advanced_description,
          category:category_id(id, name, slug),
          subcategory:subcategory_id(id, name, slug)
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

          // البحث الذكي المحسن مع نظام أولويات
          const allWords = searchWords.join(' ');

          // بحث مبسط وقوي: تركيز أساسي على الاسم
          let searchConditions: string[] = [];
          
          // أولوية عليا جداً: الاسم يحتوي على جميع الكلمات (تكرار أكثر = وزن أكبر)
          searchWords.forEach(word => {
            // 5 مرات للاسم = وزن عالي جداً
            for (let i = 0; i < 5; i++) {
              searchConditions.push(`name.ilike.%${word}%`);
            }
          });
          
          // أولوية متوسطة: SKU (مرة واحدة فقط)
          searchWords.forEach(word => {
            searchConditions.push(`sku.ilike.%${word}%`);
          });
          
          // أولوية منخفضة: الوصف (للكلمات المهمة فقط)
          searchWords.forEach(word => {
            if (word.length >= 4) { // كلمات مهمة فقط
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
      product_marketing_settings (*)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) return null;

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

export const createProduct = async (productData: ProductFormValues): Promise<Product> => {
  const { 
    colors,
    additional_images,
    wholesale_tiers, 
    advancedSettings, 
    marketingSettings,
    special_offers_config,
    ...mainProductData 
  } = productData;

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
      toast.error("المؤسسة غير موجودة أو ليس لديك صلاحية للوصول إليها");
      throw new Error("Organization not found or access denied");
    }

    // إعداد بيانات المنتج الأساسية
    const productCoreData = {
      ...mainProductData,
      organization_id: productData.organization_id,
      price: productData.price ? Number(productData.price) : 0,
      purchase_price: productData.purchase_price ? Number(productData.purchase_price) : null,
      stock_quantity: productData.stock_quantity ? Number(productData.stock_quantity) : 0,
      compare_at_price: productData.compare_at_price ? Number(productData.compare_at_price) : null,
      wholesale_price: productData.wholesale_price ? Number(productData.wholesale_price) : null,
      partial_wholesale_price: productData.partial_wholesale_price ? Number(productData.partial_wholesale_price) : null,
      min_wholesale_quantity: productData.min_wholesale_quantity ? Number(productData.min_wholesale_quantity) : null,
      min_partial_wholesale_quantity: productData.min_partial_wholesale_quantity ? Number(productData.min_partial_wholesale_quantity) : null,
      unit_purchase_price: productData.unit_purchase_price ? Number(productData.unit_purchase_price) : null,
      unit_sale_price: productData.unit_sale_price ? Number(productData.unit_sale_price) : null,
      allow_retail: productData.allow_retail !== undefined ? productData.allow_retail : true,
      allow_wholesale: productData.allow_wholesale || false,
      allow_partial_wholesale: productData.allow_partial_wholesale || false,
      has_variants: productData.has_variants || false,
      show_price_on_landing: productData.show_price_on_landing !== undefined ? productData.show_price_on_landing : true,
      is_featured: productData.is_featured || false,
      is_new: productData.is_new !== undefined ? productData.is_new : true,
      use_sizes: productData.use_sizes || false,
      is_sold_by_unit: productData.is_sold_by_unit !== undefined ? productData.is_sold_by_unit : true,
      use_variant_prices: productData.use_variant_prices || false,
      use_shipping_clone: productData.use_shipping_clone || false,
      is_digital: productData.is_digital || false,
      features: productData.features || [],
      specifications: productData.specifications || {},
      description: productData.description || '',
      thumbnail_image: productData.thumbnail_image || '',
      slug: productData.slug || `${productData.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      // حقول وضع النشر (تم تمريرها مسبقاً من prepareFormSubmissionData)
      // publication_status: (productData as any).publication_status, // معلق مؤقتاً
      publish_at: (productData as any).publish_at,
    };

    // 🚀 الحل الجذري: استخدام Stored Procedure واحدة لجميع العمليات
    const { data: result, error: createError } = await (supabase as any).rpc('create_product_complete', {
      p_product_data: productCoreData,
      p_advanced_settings: advancedSettings && Object.keys(advancedSettings).length > 0 ? advancedSettings : null,
      p_marketing_settings: marketingSettings && Object.keys(marketingSettings).length > 0 ? marketingSettings : null,
      p_colors: colors && colors.length > 0 ? colors as any : null,
      p_images: additional_images && additional_images.length > 0 ? 
        additional_images.map((url, index) => ({ image_url: url, sort_order: index + 1 })) : null,
      p_wholesale_tiers: wholesale_tiers && wholesale_tiers.length > 0 ? wholesale_tiers as any : null,
      p_special_offers_config: special_offers_config || null,
      p_advanced_description: productData.advanced_description || null,
      p_user_id: user.id
    });

    if (createError) {
      
      // ✅ معالجة خاصة لأخطاء UUID
      if (createError.message?.includes('invalid input syntax for type uuid')) {
        toast.error("خطأ في صيغة معرف المؤسسة أو الفئة. يرجى التحقق من البيانات");
        throw new Error("Invalid UUID format in product data");
      }
      
      toast.error(`فشل إنشاء المنتج: ${createError.message}`);
      throw createError;
    }

    if (!result || !(result as any).success) {
      const errorMessage = (result as any)?.message || 'فشل إنشاء المنتج';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }

    const productId = (result as any).product_id;

    // 🎯 جلب المنتج المنشأ مع جميع البيانات المرتبطة في استدعاء واحد
    // ✅ تم إصلاح المشكلة: استخدام maybeSingle() بدلاً من single() للجداول التي قد تعيد صفوف متعددة
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
        wholesale_tiers(id, min_quantity, price)
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
      // wholesale_tiers: createdProduct.wholesale_tiers || [], // مؤقتاً معطل بسبب مشاكل Types
      purchase_page_config: (createdProduct as any).purchase_page_config ? 
        JSON.parse(JSON.stringify((createdProduct as any).purchase_page_config)) : null,
      special_offers_config: special_offers_config || null,
    };

    // 🚀 تحديث محدود للكاش بدلاً من التحديث الشامل
    try {
      // تحديث محدد فقط للمنتجات الجديدة
      cacheManager.invalidate(`products-${productData.organization_id}`);
      
      // تحديث React Query محدود
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
  const { 
    colors,
    additional_images,
    wholesale_tiers,
    advancedSettings,
    marketingSettings,
    ...mainProductUpdates 
  } = updates;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const error = new Error("User not authenticated for update");
    toast.error("يجب تسجيل الدخول لتحديث المنتج.");
    throw error;
  }

  try {
    // إعداد بيانات التحديث الرئيسي
    if (mainProductUpdates.purchase_price !== undefined && mainProductUpdates.purchase_price !== null) {
      mainProductUpdates.purchase_price = Number(mainProductUpdates.purchase_price);
    }
    
    // تحويل الأرقام الأخرى إذا كانت موجودة
    if (mainProductUpdates.price !== undefined && mainProductUpdates.price !== null) {
      mainProductUpdates.price = Number(mainProductUpdates.price);
    }
    if (mainProductUpdates.stock_quantity !== undefined && mainProductUpdates.stock_quantity !== null) {
      mainProductUpdates.stock_quantity = Number(mainProductUpdates.stock_quantity);
    }

    // 🚀 الحل الجذري: استخدام Stored Procedure واحدة لجميع العمليات
    const { data: result, error: updateError } = await supabase.rpc('update_product_complete', {
      p_product_id: id,
      p_product_data: {
        ...mainProductUpdates,
        // publication_status: (updates as any).publication_status, // معلق مؤقتاً
        publish_at: (updates as any).publish_at,
      },
      p_advanced_settings: advancedSettings && Object.keys(advancedSettings).length > 0 ? advancedSettings : null,
      p_marketing_settings: marketingSettings && Object.keys(marketingSettings).length > 0 ? marketingSettings : null,
      p_colors: colors && colors.length > 0 ? JSON.parse(JSON.stringify(colors)) : null,
      p_images: additional_images && additional_images.length > 0 ? 
        additional_images.map((url, index) => ({ image_url: url, sort_order: index + 1 })) : null,
      p_wholesale_tiers: wholesale_tiers && wholesale_tiers.length > 0 ? JSON.parse(JSON.stringify(wholesale_tiers)) : null,
      p_user_id: user.id
    });

    if (updateError) {
      toast.error(`فشل تحديث المنتج: ${updateError.message}`);
      throw updateError;
    }

    if (!result || !(result as any)?.success) {
      const errorMessage = (result as any)?.message || 'فشل تحديث المنتج';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }

    // 🔧 تحديث إضافي لshipping_method_type إذا كان موجوداً
    if (mainProductUpdates.shipping_method_type !== undefined) {
      
      const updateData: any = {
        shipping_method_type: mainProductUpdates.shipping_method_type,
        updated_at: new Date().toISOString(),
        updated_by_user_id: user.id
      };
      
      // إذا كانت طريقة الشحن مخصصة، تأكد من أن shipping_provider_id هو null
      if (mainProductUpdates.shipping_method_type === 'custom') {
        updateData.shipping_provider_id = null;
      }
      
      const { error: shippingUpdateError } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id);
      
      if (shippingUpdateError) {
        toast.error(`تم تحديث المنتج ولكن فشل تحديث إعدادات الشحن: ${shippingUpdateError.message}`);
      } else {
      }
    }

    // 🎯 جلب المنتج المحدث مع جميع البيانات المرتبطة في استدعاء واحد
    // ✅ تم إصلاح المشكلة: استخدام maybeSingle() بدلاً من single() للجداول التي قد تعيد صفوف متعددة
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
        wholesale_tiers(id, min_quantity, price)
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
      // wholesale_tiers: updatedProduct.wholesale_tiers || [], // مؤقتاً معطل بسبب مشاكل Types
      purchase_page_config: updatedProduct.purchase_page_config ? 
        JSON.parse(JSON.stringify(updatedProduct.purchase_page_config)) : null,
      special_offers_config: (updatedProduct as any).special_offers_config ? 
        JSON.parse(JSON.stringify((updatedProduct as any).special_offers_config)) : null,
    };

    // 🚀 تحديث محدود للكاش بدلاً من التحديث الشامل
    try {
      // تحديث محدد فقط للمنتج المعدل
      cacheManager.invalidate(`product-${id}`);
      cacheManager.invalidate(`products-${resultProduct.organization_id}`);
      
      // تحديث React Query محدود
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

  if (forceDisable) {
    const { error } = await supabase
      .from('products')
      .update({ is_active: false, is_featured: false })
      .eq('id', id);

    if (error) throw error;
  } else {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
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

  if (!productId) {
    return [];
  }
  
  try {
    const { data, error } = await supabase
      .from('wholesale_tiers')
      .select('*')
      .eq('product_id', productId)
      .order('min_quantity', { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    throw error;
  }
};

export const createWholesaleTier = async (tier: {
  product_id: string;
  min_quantity: number;
  price_per_unit: number;
  organization_id: string;
}) => {
  const { data, error } = await supabase
    .from('product_wholesale_tiers')
    .insert([
      {
        product_id: tier.product_id,
        min_quantity: tier.min_quantity,
        price_per_unit: tier.price_per_unit,
        organization_id: tier.organization_id,
      },
    ])
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
};

export const updateWholesaleTier = async (
  tierId: string,
  updates: {
    min_quantity?: number;
    price_per_unit?: number;
  }
) => {
  const { data, error } = await supabase
    .from('product_wholesale_tiers')
    .update(updates)
    .eq('id', tierId)
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
};

export const deleteWholesaleTier = async (tierId: string) => {

  if (!tierId) {
    throw new Error('معرف المرحلة السعرية مطلوب للحذف');
  }
  
  try {
    const { error } = await supabase
      .from('wholesale_tiers')
      .delete()
      .eq('id', tierId);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
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
  try {
    const { data, error } = await supabase.rpc('generate_product_barcode');

    if (error) {
      
      return generateEAN13Fallback();
    }

    return data;
  } catch (error) {
    
    return generateEAN13Fallback();
  }
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
  try {
    const { data, error } = await supabase.rpc('generate_variant_barcode', {
      product_id: productId,
      variant_id: variantId
    });

    if (error) {
      
      const { data: product } = await supabase
        .from('products')
        .select('barcode')
        .eq('id', productId)
        .single();
      
      if (product?.barcode) {
        const suffix = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        return `${product.barcode}-${suffix}`;
      } else {
        const newBarcode = await generateAutomaticBarcode();
        const suffix = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        return `${newBarcode}-${suffix}`;
      }
    }

    return data;
  } catch (error) {
    
    const randomSuffix = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    const timestamp = Date.now().toString().substring(8);
    return `${timestamp}-${randomSuffix}`;
  }
};

export const validateBarcode = async (barcode: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('validate_barcode', {
      barcode: barcode
    });

    if (error) {
      
      return validateEAN13Locally(barcode);
    }

    return data;
  } catch (error) {
    
    return validateEAN13Locally(barcode);
  }
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
