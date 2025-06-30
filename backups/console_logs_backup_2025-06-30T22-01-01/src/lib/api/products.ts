import { supabase } from '@/lib/supabase';
import type { Database, TablesInsert, TablesUpdate } from '@/types/database.types';
import { toast } from 'react-hot-toast';
import { ProductFormValues } from '@/types/product';
import { updateProductStockQuantity } from './productVariants';
import { cacheManager } from '@/lib/cache/CentralCacheManager';
import { queryClient } from '@/lib/config/queryClient';
import UnifiedRequestManager from '@/lib/unifiedRequestManager';

// نظام منع الطلبات المتزامنة المتكررة
const ongoingRequests = new Map<string, Promise<any>>();

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

export const getProducts = async (organizationId?: string, includeInactive: boolean = false): Promise<Product[]> => {

  try {
    if (!organizationId) {
      return [];
    }

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
      return [];
    }

    return (data as any) || [];
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
    sortOption = 'newest'
  } = options;

  // إنشاء مفتاح cache محسن
  const cacheKey = `products-${organizationId}-${page}-${limit}-${JSON.stringify({
    includeInactive,
    searchQuery: searchQuery.trim().toLowerCase(),
    categoryFilter,
    stockFilter,
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

      // بناء الاستعلام الأساسي مع تحسينات
      let query = supabase
        .from('products')
        .select(`
          *,
          category:category_id(id, name, slug),
          subcategory:subcategory_id(id, name, slug)
        `, { count: 'exact' })
        .eq('organization_id', organizationId);

      // إضافة فلتر الحالة النشطة
      if (!includeInactive) {
        query = query.eq('is_active', true);
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

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      const result = {
        products: (data as Product[]) || [],
        totalCount,
        totalPages,
        currentPage: page,
        hasNextPage,
        hasPreviousPage,
      };

      // حفظ النتيجة في الـ cache
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
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      purchase_page_config,
      category:category_id(id, name, slug),
      subcategory:subcategory_id(id, name, slug),
      product_images ( product_id, image_url, sort_order ),
      product_advanced_settings (*),
      product_marketing_settings (*)
    `)
    .eq('id', id)
    .single();

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
    marketingSettings, // Destructure marketingSettings
    ...mainProductData 
  } = productData;

  // Correctly destructure advancedSettings (camelCase) from ProductFormValues
  // then we will use this `advancedSettingsFromForm` when we refer to the advanced settings data.
  const { advancedSettings: advancedSettingsFromForm, ...productCoreDataFromForm } = productData;

  // استخدام العميل الموحد بدلاً من إنشاء عميل جديد
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    toast.error("يجب تسجيل الدخول لإنشاء منتج.");
    throw new Error("User not authenticated");
  }

  if (!productData.organization_id) {
    const error = new Error("Organization ID is required");
    toast.error("معرف المؤسسة مطلوب");
    throw error;
  }

  // التحقق من صحة المؤسسة والصلاحيات
  try {
    const { data: orgCheck, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', productData.organization_id)
      .single();
    
    if (orgError || !orgCheck) {
      toast.error("المؤسسة غير موجودة أو ليس لديك صلاحية للوصول إليها");
      throw new Error("Organization not found or access denied");
    }
    
  } catch (error) {
    toast.error("فشل في التحقق من صحة المؤسسة");
    throw error;
  }

  const { 
    id,
    organization_id,
    name,
    name_for_shipping,
    description,
      price,
      purchase_price,
      compare_at_price,
    wholesale_price,
    partial_wholesale_price,
    min_wholesale_quantity,
    min_partial_wholesale_quantity,
    allow_retail = true,
    allow_wholesale = false,
    allow_partial_wholesale = false,
    sku,
    barcode,
    category_id,
    subcategory_id,
    brand,
      stock_quantity,
    thumbnail_image,
    has_variants = false,
    show_price_on_landing = true,
    is_featured = false,
    is_new = true,
    use_sizes = false,
    is_sold_by_unit = true,
    unit_type,
    use_variant_prices = false,
    unit_purchase_price,
    unit_sale_price,
    form_template_id,
    shipping_provider_id,
    shipping_method_type,
    use_shipping_clone = false,
    shipping_clone_id,
    slug,
    is_digital = false,
    features,
    specifications,
  } = productData;
  
  const productCoreDataToInsert: TablesInsert<'products'> = {
    organization_id,
    name,
    name_for_shipping: name_for_shipping || null,
    description: description || '',
    price: parseFloat(String(price)),
    purchase_price: parseFloat(String(purchase_price)),
    compare_at_price: compare_at_price ? parseFloat(String(compare_at_price)) : null,
    wholesale_price: wholesale_price ? parseFloat(String(wholesale_price)) : null,
    partial_wholesale_price: partial_wholesale_price ? parseFloat(String(partial_wholesale_price)) : null,
    min_wholesale_quantity: min_wholesale_quantity ? parseInt(String(min_wholesale_quantity), 10) : null,
    min_partial_wholesale_quantity: min_partial_wholesale_quantity ? parseInt(String(min_partial_wholesale_quantity), 10) : null,
    allow_retail,
    allow_wholesale,
    allow_partial_wholesale,
    sku,
    barcode: barcode || null,
    category_id,
    subcategory_id: subcategory_id || null,
    brand: brand || null,
    stock_quantity: parseInt(String(stock_quantity), 10),
    thumbnail_image,
    has_variants,
    show_price_on_landing,
    is_featured,
    is_new,
    use_sizes,
    is_sold_by_unit,
    unit_type: unit_type || null,
    use_variant_prices,
    unit_purchase_price: unit_purchase_price ? parseFloat(String(unit_purchase_price)) : null,
    unit_sale_price: unit_sale_price ? parseFloat(String(unit_sale_price)) : null,
    form_template_id: form_template_id || null,
    shipping_provider_id: shipping_provider_id || null,
    shipping_method_type: productData.shipping_method_type || 'default',
    use_shipping_clone,
    shipping_clone_id: shipping_clone_id || null,
    slug: slug || `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
    is_digital,
    features: features || [],
    specifications: specifications || {},
    created_by_user_id: user.id,
    updated_by_user_id: user.id,
    is_active: true,
  };

  // إدراج المنتج باستخدام function مؤقتة لتجاوز مشكلة RLS
  const { data: createdProduct, error: productCreationError } = await supabase
    .rpc('create_product_with_user_context', {
      product_data: productCoreDataToInsert,
      user_id_param: user.id
    });

  if (productCreationError) {
    toast.error(`فشل إنشاء المنتج: ${productCreationError.message}`);
    throw productCreationError;
  }

  if (!createdProduct) {
    const noProductMsg = "Product creation failed, no data returned.";
    toast.error("فشل إنشاء المنتج، لم يتم إرجاع بيانات المنتج.");
    throw new Error(noProductMsg);
  }

  // DEBUGGING ADVANCED SETTINGS - Step 2: Log before the condition
  // Use advancedSettingsFromForm (the actual data from the form) for the check and for insertion
  const conditionMet = createdProduct && advancedSettingsFromForm && Object.keys(advancedSettingsFromForm).length > 0;

  let createdAdvancedSettings = null;
  if (conditionMet) { 
    const advancedSettingsDataToInsert: TablesInsert<'product_advanced_settings'> = {
      ...(advancedSettingsFromForm as Partial<TablesInsert<'product_advanced_settings'>>), // Spread the received advanced settings
      product_id: createdProduct.id,
    };

    // Remove undefined boolean fields explicitly or ensure schema defaults handle them
    for (const key in advancedSettingsDataToInsert) {
      if (typeof advancedSettingsDataToInsert[key as keyof typeof advancedSettingsDataToInsert] === 'boolean' && advancedSettingsDataToInsert[key as keyof typeof advancedSettingsDataToInsert] === undefined) {
        // Option 1: Set to false (if that's the desired default for undefined booleans)
        // @ts-ignore
        // advancedSettingsDataToInsert[key] = false; 
        // Option 2: Delete the key if DB schema handles default or undefined is not allowed for booleans
        // delete advancedSettingsDataToInsert[key as keyof typeof advancedSettingsDataToInsert];
        // For now, we assume the DB or schema handles undefined booleans appropriately or they are set if true.
        // If Supabase expects explicit false, uncomment the line above.
      }
    }
    
    // DEBUGGING ADVANCED SETTINGS - Step 3: Log object to be inserted

    const { data: newAdvancedSettings, error: advancedSettingsError } = await supabase
      .from('product_advanced_settings')
      .insert(advancedSettingsDataToInsert)
      .select('*') 
      .single();

    if (advancedSettingsError) {
      toast.error(`تنبيه: تم إنشاء المنتج ولكن فشل حفظ الإعدادات المتقدمة: ${advancedSettingsError.message}`);
    } else if (newAdvancedSettings) {
      createdAdvancedSettings = newAdvancedSettings;
    }
  } else {
  }

  let createdMarketingSettings = null;
  if (marketingSettings && Object.keys(marketingSettings).length > 0) {
    const { data: mktSettings, error: mktSettingsError } = await supabase
      .from('product_marketing_settings')
      .insert({ ...marketingSettings, product_id: createdProduct.id, organization_id: organization_id })
      .select()
      .single();
    if (mktSettingsError) {
      toast.error(`فشل حفظ إعدادات التسويق: ${mktSettingsError.message}`);
    }
    createdMarketingSettings = mktSettings;
  }

  // معالجة الألوان إذا تم إرسالها
  if (colors && colors.length > 0) {
    // إدراج الألوان الجديدة مع التحقق من البيانات المطلوبة
    const validColors = colors.filter(color => color.name && color.color_code);
    
    if (validColors.length > 0) {
      const colorsToInsert = validColors.map(color => ({
        product_id: createdProduct.id,
        name: color.name,
        color_code: color.color_code,
        image_url: color.image_url || null,
        quantity: Number(color.quantity) || 0,
        is_default: Boolean(color.is_default),
        barcode: color.barcode || null,
        has_sizes: Boolean(color.has_sizes),
        price: color.price ? Number(color.price) : null,
      }));
      
      const { error: insertColorsError } = await supabase
        .from('product_colors')
        .insert(colorsToInsert);
      
      if (insertColorsError) {
        toast.error(`تحذير: تم إنشاء المنتج ولكن فشل حفظ الألوان: ${insertColorsError.message}`);
      } else {
        // تحديث stock_quantity للمنتج تلقائياً بعد إضافة الألوان
        await updateProductStockQuantity(createdProduct.id);
      }
    }
  }
  
  // معالجة أسعار الجملة إذا تم إرسالها
  if (wholesale_tiers && wholesale_tiers.length > 0) {
    // إدراج أسعار الجملة الجديدة مع التحقق من البيانات المطلوبة
    const validTiers = wholesale_tiers.filter(tier => tier.min_quantity && tier.price_per_unit);
    
    if (validTiers.length > 0) {
      const wholesaleTiersToInsert = validTiers.map(tier => ({
        product_id: createdProduct.id,
        min_quantity: Number(tier.min_quantity),
        price: Number(tier.price_per_unit),
        organization_id: organization_id,
      }));
      
      const { error: insertWholesaleError } = await supabase
        .from('wholesale_tiers')
        .insert(wholesaleTiersToInsert);
      
      if (insertWholesaleError) {
        toast.error(`تحذير: تم إنشاء المنتج ولكن فشل حفظ أسعار الجملة: ${insertWholesaleError.message}`);
      }
    }
  }

  let createdImagesArray: any[] = [];
  if (additional_images && additional_images.length > 0) {
    const imageInserts: TablesInsert<'product_images'>[] = additional_images.map((imageUrl, index) => ({
      product_id: createdProduct.id,
      image_url: imageUrl,
      sort_order: index + 1,
    }));
    const { data: newImagesResult, error: imagesError } = await supabase.from('product_images').insert(imageInserts).select();
    if (imagesError) {
      toast.error(`تنبيه: تم إنشاء المنتج ولكن فشل حفظ بعض الصور: ${imagesError.message}`);
    } else {
      createdImagesArray = newImagesResult || [];
    }
  }
  
  toast.success("تم إنشاء المنتج بنجاح!");
  
  const finalProductData: Product = {
    ...(createdProduct as unknown as Product),
    product_advanced_settings: createdAdvancedSettings, 
    product_marketing_settings: createdMarketingSettings,
    additional_images: createdImagesArray.map(img => img.image_url), 
    purchase_page_config: createdProduct.purchase_page_config ? JSON.parse(JSON.stringify(createdProduct.purchase_page_config)) : null,
  };

  // تحديث محسن: فقط الكاش الضروري
  cacheManager.invalidate('products*');
  
  // تحديث React Query بشكل محدود
  const organizationId = createdProduct.organization_id;
  if (organizationId) {
    await queryClient.invalidateQueries({ queryKey: ['products', organizationId] });
  }

  toast.success("تم إنشاء المنتج بنجاح!");

  // 🎯 استخدام النظام الموحد للتحديث التلقائي
  if ((window as any).unifiedUpdate) {
    // ... existing code ...
  }

  return finalProductData;
};

export const updateProduct = async (id: string, updates: UpdateProduct): Promise<Product> => {

  const { 
    colors,
    additional_images,
    wholesale_tiers,
    advancedSettings,
    marketingSettings, // Destructure marketingSettings
    ...mainProductUpdates 
  } = updates;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
    const error = new Error("User not authenticated for update");
    toast.error("يجب تسجيل الدخول لتحديث المنتج.");
    throw error;
    }

  // استخدام mainProductUpdates بدلاً من productCoreUpdates لأنه تم تنظيفه بالفعل من الحقول غير المرغوب فيها
  if (mainProductUpdates.purchase_price !== undefined && mainProductUpdates.purchase_price !== null) {
    mainProductUpdates.purchase_price = Number(mainProductUpdates.purchase_price);
    }

  const { data: updatedProductData, error: productUpdateError } = await supabase
      .from('products')
    .update({
      ...mainProductUpdates,
      updated_by_user_id: user.id, 
      updated_at: new Date().toISOString(), 
    } as TablesUpdate<'products'>)
      .eq('id', id)
      .select(`
      *,
      category:category_id(id, name, slug),
      subcategory:subcategory_id(id, name, slug),
      product_images ( product_id, image_url, sort_order )
      `)
      .single();

    if (productUpdateError) {
    toast.error(`فشل تحديث المنتج: ${productUpdateError.message}`);
      throw productUpdateError;
    }
    
  if (!updatedProductData) {
    const errorMessage = `Product with ID ${id} not found or update failed to return data.`;
    toast.error(errorMessage);
    throw new Error(errorMessage);
    }

  let currentAdvancedSettings = null;
  if (advancedSettings && Object.keys(advancedSettings).length > 0) {
    try {
      const settingsToUpsert: TablesInsert<'product_advanced_settings'> = {
        product_id: id, 
        ...advancedSettings, 
      };

      // تنظيف القيم المنطقية غير المحددة
      for (const key in settingsToUpsert) {
        if (advancedSettings.hasOwnProperty(key) && typeof settingsToUpsert[key as keyof typeof settingsToUpsert] === 'boolean' && settingsToUpsert[key as keyof typeof settingsToUpsert] === undefined) {
          // @ts-ignore
          settingsToUpsert[key] = false;
        }
      }

      // محاولة تحديث الإعدادات الموجودة أولاً
      const { data: existingAdvancedSettings } = await supabase
        .from('product_advanced_settings')
        .select('*')
        .eq('product_id', id)
        .single();

      let upsertedSettings;
      let advancedSettingsError;

      if (existingAdvancedSettings) {
        // تحديث السجل الموجود
        const { data, error } = await supabase
          .from('product_advanced_settings')
          .update(settingsToUpsert)
          .eq('product_id', id)
          .select('*')
          .single();
        upsertedSettings = data;
        advancedSettingsError = error;
      } else {
        // إنشاء سجل جديد
        const { data, error } = await supabase
          .from('product_advanced_settings')
          .insert(settingsToUpsert)
          .select('*')
          .single();
        upsertedSettings = data;
        advancedSettingsError = error;
      }

      if (advancedSettingsError) {
        toast.error(`تنبيه: تم تحديث المنتج، ولكن فشل تحديث الإعدادات المتقدمة: ${advancedSettingsError.message}`);
        currentAdvancedSettings = existingAdvancedSettings || null;
      } else {
        currentAdvancedSettings = upsertedSettings;
      }
    } catch (error) {
      // محاولة جلب الإعدادات الموجودة في حالة الخطأ
      const { data: fallbackSettings } = await supabase
        .from('product_advanced_settings')
        .select('*')
        .eq('product_id', id)
        .single();
      currentAdvancedSettings = fallbackSettings || null;
    }
  } else {
    // جلب الإعدادات الموجودة إذا لم يتم إرسال إعدادات جديدة
    try {
      const { data: existingSettings } = await supabase
        .from('product_advanced_settings')
        .select('*')
        .eq('product_id', id)
        .single();
      currentAdvancedSettings = existingSettings;
    } catch (error) {
      currentAdvancedSettings = null;
    }
  }

  let currentMarketingSettings = null;
  if (marketingSettings && Object.keys(marketingSettings).length > 0) {
    try {
      // محاولة جلب الإعدادات الموجودة أولاً
      const { data: existingMarketingSettings } = await supabase
        .from('product_marketing_settings')
        .select('*')
        .eq('product_id', id)
        .single();

      const settingsToSave = {
        ...marketingSettings,
        product_id: id,
        organization_id: updatedProductData.organization_id
      };

      let mktSettings;
      let mktSettingsError;

      if (existingMarketingSettings) {
        // تحديث السجل الموجود
        const { data, error } = await supabase
          .from('product_marketing_settings')
          .update(settingsToSave)
          .eq('product_id', id)
          .select('*')
          .single();
        mktSettings = data;
        mktSettingsError = error;
      } else {
        // إنشاء سجل جديد
        const { data, error } = await supabase
          .from('product_marketing_settings')
          .insert(settingsToSave)
          .select('*')
          .single();
        mktSettings = data;
        mktSettingsError = error;
      }

      if (mktSettingsError) {
        toast.error(`فشل تحديث إعدادات التسويق: ${mktSettingsError.message}`);
        currentMarketingSettings = existingMarketingSettings || null;
      } else {
        currentMarketingSettings = mktSettings;
      }
    } catch (error) {
      // محاولة جلب الإعدادات الموجودة في حالة الخطأ
      const { data: fallbackSettings } = await supabase
        .from('product_marketing_settings')
        .select('*')
        .eq('product_id', id)
        .single();
      currentMarketingSettings = fallbackSettings || null;
    }
  } else {
    // جلب الإعدادات الموجودة إذا لم يتم إرسال إعدادات جديدة
    try {
      const { data: existingMkt } = await supabase
        .from('product_marketing_settings')
        .select('*')
        .eq('product_id', id)
        .single();
      currentMarketingSettings = existingMkt;
    } catch (error) {
      currentMarketingSettings = null;
    }
  }

  // معالجة الألوان إذا تم إرسالها
  if (colors && colors.length > 0) {
    // حذف الألوان الموجودة أولاً (سيحذف المقاسات تلقائياً بسبب CASCADE)
    const { error: deleteColorsError } = await supabase
      .from('product_colors')
      .delete()
      .eq('product_id', id);
    
    if (deleteColorsError) {
    }
    
    // إدراج الألوان الجديدة مع التحقق من البيانات المطلوبة
    const validColors = colors.filter(color => color.name && color.color_code);
    
    if (validColors.length > 0) {
      const colorsToInsert = validColors.map(color => ({
        product_id: id,
        name: color.name,
        color_code: color.color_code,
        image_url: color.image_url || null,
        quantity: Number(color.quantity) || 0,
        is_default: Boolean(color.is_default),
        barcode: color.barcode || null,
        has_sizes: Boolean(color.has_sizes),
        price: color.price ? Number(color.price) : null,
      }));
      
      const { data: insertedColors, error: insertColorsError } = await supabase
        .from('product_colors')
        .insert(colorsToInsert)
        .select('id, name');
      
      if (insertColorsError) {
        toast.error(`تحذير: فشل حفظ ألوان المنتج: ${insertColorsError.message}`);
      } else if (insertedColors) {
        
        // حفظ المقاسات لكل لون
        for (let i = 0; i < validColors.length; i++) {
          const color = validColors[i];
          const insertedColor = insertedColors[i];
          
          if (color.sizes && color.sizes.length > 0 && insertedColor) {
            
            const sizesToInsert = color.sizes.map(size => ({
              color_id: insertedColor.id,
              product_id: id,
              size_name: size.size_name,
              quantity: Number(size.quantity) || 0,
              price: size.price ? Number(size.price) : null,
              barcode: size.barcode || null,
              is_default: Boolean(size.is_default),
            }));
            
            const { error: insertSizesError } = await supabase
              .from('product_sizes')
              .insert(sizesToInsert);
            
            if (insertSizesError) {
              toast.error(`تحذير: فشل حفظ مقاسات اللون ${color.name}`);
            } else {
            }
          }
        }
        
        // تحديث stock_quantity للمنتج تلقائياً بعد تحديث الألوان والمقاسات
        await updateProductStockQuantity(id);
      }
    }
  }
  
  // معالجة أسعار الجملة إذا تم إرسالها
  if (wholesale_tiers && wholesale_tiers.length > 0) {
    // حذف أسعار الجملة الموجودة أولاً
    const { error: deleteWholesaleError } = await supabase
      .from('wholesale_tiers')
      .delete()
      .eq('product_id', id);
    
    if (deleteWholesaleError) {
    }
    
    // إدراج أسعار الجملة الجديدة مع التحقق من البيانات المطلوبة
    const validTiers = wholesale_tiers.filter(tier => tier.min_quantity && tier.price_per_unit);
    
    if (validTiers.length > 0) {
      const wholesaleTiersToInsert = validTiers.map(tier => ({
        product_id: id,
        min_quantity: Number(tier.min_quantity),
        price: Number(tier.price_per_unit),
        organization_id: updatedProductData.organization_id,
      }));
      
      const { error: insertWholesaleError } = await supabase
        .from('wholesale_tiers')
        .insert(wholesaleTiersToInsert);
      
      if (insertWholesaleError) {
        toast.error(`تحذير: فشل حفظ أسعار الجملة: ${insertWholesaleError.message}`);
      }
    }
  }
  
  // معالجة الصور الإضافية إذا تم إرسالها
  if (additional_images && additional_images.length > 0) {
    // حذف الصور الموجودة أولاً
    const { error: deleteImagesError } = await supabase
      .from('product_images')
      .delete()
      .eq('product_id', id);
    
    if (deleteImagesError) {
    }
    
    // إدراج الصور الجديدة (بدون organization_id لأنه غير موجود في الجدول)
    const imagesToInsert = additional_images.map((imageUrl, index) => ({
      product_id: id,
      image_url: imageUrl,
      sort_order: index + 1,
    }));
    
    const { error: insertImagesError } = await supabase
      .from('product_images')
      .insert(imagesToInsert);
    
    if (insertImagesError) {
      toast.error(`تحذير: فشل حفظ الصور الإضافية: ${insertImagesError.message}`);
    }
  }

  // معالجة إعدادات التسويق تتم بالفعل في أعلى الدالة
  // لا نحتاج إلى معالجة إضافية هنا

  const resultProduct: Product = {
    ...(updatedProductData as unknown as Omit<Product, 'product_advanced_settings' | 'product_marketing_settings'>), 
    product_advanced_settings: currentAdvancedSettings, 
    product_marketing_settings: currentMarketingSettings,
    additional_images: updatedProductData.product_images?.map(img => img.image_url) || [],
    purchase_page_config: updatedProductData.purchase_page_config ? JSON.parse(JSON.stringify(updatedProductData.purchase_page_config)) : null,
  };

  // 🎯 استخدام النظام الموحد للتحديث التلقائي - مثل deleteProduct
  try {
    const { refreshAfterProductOperation } = await import('@/lib/data-refresh-helpers');
    refreshAfterProductOperation('update', { organizationId: resultProduct.organization_id });

  } catch (error) {
  }

  toast.success("تم تحديث المنتج بنجاح!");

  // 🎯 الحل: إلغاء صلاحية كاش المنتجات
  cacheManager.invalidate('products*');

  // تحديث مخزون المنتج الرئيسي
  await updateProductStockQuantity(id);

  const finalProduct = {
    ...updatedProductData,
    product_advanced_settings: currentAdvancedSettings,
    product_marketing_settings: currentMarketingSettings,
  };
  
  // =================================================================
  // 🚀  CACHE INVALIDATION - تحديث الواجهة فوراً
  // =================================================================
  try {
    const organizationId = updatedProductData.organization_id;

    if (organizationId) {
      // إلغاء صلاحية جميع استعلامات المنتجات لهذه المؤسسة
      await queryClient.invalidateQueries({ queryKey: ['products', organizationId] });
      
      // إلغاء صلاحية استعلام منتج معين إذا كان مستخدماً
      await queryClient.invalidateQueries({ queryKey: ['product', id] });
      
      // إلغاء صلاحية الفئات لأن عدد المنتجات قد يتغير
      await queryClient.invalidateQueries({ queryKey: ['product-categories', organizationId] });
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      
      // إلغاء صلاحية لوحة التحكم الرئيسية التي قد تعرض بيانات مجمعة
      await queryClient.invalidateQueries({ queryKey: ['dashboard-data', organizationId] });
    } else {
      // إذا لم يكن هناك ID للمؤسسة، يتم إلغاء صلاحية جميع المنتجات كإجراء احترازي
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
    }
  } catch (error) {
  }
  
  toast.success('تم تحديث المنتج بنجاح');
  return finalProduct as unknown as Product;
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
