import { supabase } from '@/lib/supabase-client';
import { getSupabaseClient } from '@/lib/supabase-client';
import type { Database, TablesInsert, TablesUpdate } from '@/types/database.types';
import { toast } from 'react-hot-toast';
import { ProductFormValues } from '@/types/product';

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
  reviews?: Review[];
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
  price: number;
  organization_id?: string;
  created_at?: string;
  updated_at?: string;
}

export type Category = Database['public']['Tables']['product_categories']['Row'];
export type Subcategory = Database['public']['Tables']['product_subcategories']['Row'];

export const getProducts = async (organizationId?: string, includeInactive: boolean = false): Promise<Product[]> => {
  
  
  try {
    if (!organizationId) {
      console.error("لم يتم تمرير معرف المؤسسة إلى وظيفة getProducts");
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
      console.error('خطأ في جلب المنتجات:', error);
      return [];
    }
    
    
    return (data as any) || [];
  } catch (error) {
    console.error('خطأ غير متوقع أثناء جلب المنتجات:', error);
    return []; // Return empty array to prevent UI from hanging
  }
};

// دالة جديدة لجلب المنتجات مع الـ pagination
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
  try {
    if (!organizationId) {
      console.error("لم يتم تمرير معرف المؤسسة إلى وظيفة getProductsPaginated");
      return {
        products: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: page,
        hasNextPage: false,
        hasPreviousPage: false,
      };
    }

    const {
      includeInactive = false,
      searchQuery = '',
      categoryFilter = '',
      stockFilter = 'all',
      sortOption = 'newest'
    } = options;

    // حساب الفهرس للبداية
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // بناء الاستعلام الأساسي
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

    // إضافة فلتر البحث
    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%,barcode.ilike.%${searchQuery}%`);
    }

    // إضافة فلتر الفئة
    if (categoryFilter) {
      query = query.eq('category_id', categoryFilter);
    }

    // إضافة فلتر المخزون
    if (stockFilter !== 'all') {
      if (stockFilter === 'in-stock') {
        query = query.gt('stock_quantity', 0);
      } else if (stockFilter === 'out-of-stock') {
        query = query.eq('stock_quantity', 0);
      } else if (stockFilter === 'low-stock') {
        query = query.gt('stock_quantity', 0).lte('stock_quantity', 5);
      }
    }

    // إضافة الترتيب
    if (sortOption === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else if (sortOption === 'oldest') {
      query = query.order('created_at', { ascending: true });
    } else if (sortOption === 'price-high') {
      query = query.order('price', { ascending: false });
    } else if (sortOption === 'price-low') {
      query = query.order('price', { ascending: true });
    } else if (sortOption === 'name-asc') {
      query = query.order('name', { ascending: true });
    } else if (sortOption === 'name-desc') {
      query = query.order('name', { ascending: false });
    }

    // تطبيق الـ pagination
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('خطأ في جلب المنتجات المقسمة:', error);
      throw error;
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return {
      products: (data as Product[]) || [],
      totalCount,
      totalPages,
      currentPage: page,
      hasNextPage,
      hasPreviousPage,
    };
  } catch (error) {
    console.error('خطأ غير متوقع أثناء جلب المنتجات المقسمة:', error);
    return {
      products: [],
      totalCount: 0,
      totalPages: 0,
      currentPage: page,
      hasNextPage: false,
      hasPreviousPage: false,
    };
  }
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
    console.error(`Error fetching product with id ${id}:`, error);
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
      console.error('Error parsing purchase_page_config:', e);
      (processedData as any).purchase_page_config = null;
    }
  } else if (typeof rawData.purchase_page_config === 'object' && rawData.purchase_page_config !== null) {
    // Assume it's already a correctly structured object
    (processedData as any).purchase_page_config = rawData.purchase_page_config;
  } else {
    (processedData as any).purchase_page_config = null;
  }

  
  if (processedData.is_active === false) {
    console.warn(`تحذير: المنتج ${id} معطل ولن يظهر في نقاط البيع أو واجهة المتجر`);
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
    console.error(`Error fetching products in category ${categoryId}:`, error);
    throw error;
  }

  return data as any;
};

export const getFeaturedProducts = async (includeInactive: boolean = false, organizationId?: string): Promise<Product[]> => {
  if (!organizationId) {
    console.warn("لم يتم تمرير معرف المؤسسة إلى وظيفة getFeaturedProducts");
    return [];
  }
  
  console.log('جلب المنتجات المميزة للمؤسسة:', organizationId);
  
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
      console.error('Error fetching featured products:', error);
      return [];
    }
    
    console.log('المنتجات المميزة الخام:', data);
    
    // تأكد من رجوع البيانات قبل المتابعة
    if (!data || data.length === 0) {
      console.log('لم يتم العثور على منتجات مميزة');
      return [];
    }

    // قم بفحص وطباعة قيم thumbnail_image لكل منتج
    data.forEach(product => {
      console.log(`المنتج ${product.id} - ${product.name} - الصورة المصغرة:`, product.thumbnail_image);
      // فحص وجود حقل thumbnail_url
      if ('thumbnail_url' in product && product.thumbnail_url && typeof product.thumbnail_url === 'string') {
        console.log(`المنتج ${product.id} - يحتوي على thumbnail_url:`, product.thumbnail_url);
      }
    });
    
    // تحويل البيانات مع معالجة روابط الصور
    const processedProducts = data.map(product => {
      // معالجة رابط الصورة المصغرة
      let processedThumbnail = '';
      
      // تحقق من thumbnail_url أولاً إذا كان موجوداً
      if ('thumbnail_url' in product && product.thumbnail_url && typeof product.thumbnail_url === 'string') {
        processedThumbnail = product.thumbnail_url.trim();
        console.log(`المنتج ${product.id} - يستخدم thumbnail_url:`, processedThumbnail);
      }
      // ثم تحقق من thumbnail_image كخيار ثاني
      else if (product.thumbnail_image) {
        processedThumbnail = product.thumbnail_image.trim();
        console.log(`المنتج ${product.id} - يستخدم thumbnail_image:`, processedThumbnail);
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
          console.warn(`رابط صورة غير صالح لـ ${product.id} - ${product.name}:`, processedThumbnail);
          // استخدام صورة افتراضية في حالة الرابط غير الصالح
          processedThumbnail = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1470';
        }
        
        console.log(`المنتج ${product.id} - رابط الصورة بعد المعالجة:`, processedThumbnail);
      } else {
        // استخدام صورة افتراضية في حالة عدم وجود صورة
        processedThumbnail = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1470';
        console.log(`المنتج ${product.id} - تم تعيين صورة افتراضية`);
      }
      
      // حفظ رابط الصورة الأصلي في سجل التصحيح للمقارنة
      if (product.thumbnail_image !== processedThumbnail) {
        console.log(`تم تعديل رابط الصورة للمنتج ${product.id}:`, {
          قبل: product.thumbnail_image,
          بعد: processedThumbnail
        });
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
    console.error('خطأ في جلب المنتجات المميزة:', error);
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
      console.error('Error searching products by name:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error during product search:', error);
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

  console.log('Starting createProduct with data:', productData);

  // Correctly destructure advancedSettings (camelCase) from ProductFormValues
  // then we will use this `advancedSettingsFromForm` when we refer to the advanced settings data.
  const { advancedSettings: advancedSettingsFromForm, ...productCoreDataFromForm } = productData;

  // DEBUGGING ADVANCED SETTINGS - Step 1: Log received advanced_settings
  console.log('[createProduct] Received advancedSettingsFromForm (from productData):', JSON.stringify(advancedSettingsFromForm, null, 2));
  console.log('[createProduct] Received productCoreDataFromForm:', productCoreDataFromForm);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
    const error = new Error("User not authenticated");
    console.error('Authentication error:', error);
    toast.error("يجب تسجيل الدخول لإنشاء منتج.");
    throw error;
  }
  console.log('User authenticated:', user.id);

  if (!productData.organization_id) {
    const error = new Error("Organization ID is required");
    console.error('Validation error:', error);
    toast.error("معرف المؤسسة مطلوب");
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

  console.log('Inserting product with core data:', productCoreDataToInsert);
  console.log('Value of form_template_id being sent to DB:', productCoreDataToInsert.form_template_id);

  const { data: createdProduct, error: productCreationError } = await supabase
      .from('products')
    .insert(productCoreDataToInsert)
      .select()
      .single();

  if (productCreationError) {
    console.error('Error creating product. Data sent:', productCoreDataToInsert);
    console.error('Supabase error:', productCreationError);
    toast.error(`فشل إنشاء المنتج: ${productCreationError.message}`);
    throw productCreationError;
  }

  if (!createdProduct) {
    const noProductMsg = "Product creation failed, no data returned.";
    console.error('Creation error:', noProductMsg);
    toast.error("فشل إنشاء المنتج، لم يتم إرجاع بيانات المنتج.");
    throw new Error(noProductMsg);
  }

  console.log('Product created successfully:', createdProduct);

  // DEBUGGING ADVANCED SETTINGS - Step 2: Log before the condition
  console.log('[createProduct] Checking condition: newProduct is', createdProduct ? 'defined' : 'undefined');
  // Use advancedSettingsFromForm (the actual data from the form) for the check and for insertion
  console.log('[createProduct] Checking condition: advancedSettingsFromForm is', JSON.stringify(advancedSettingsFromForm, null, 2));
  const conditionMet = createdProduct && advancedSettingsFromForm && Object.keys(advancedSettingsFromForm).length > 0;
  console.log('[createProduct] Condition (createdProduct && advancedSettingsFromForm && Object.keys(advancedSettingsFromForm).length > 0) is:', conditionMet);

  let createdAdvancedSettings = null;
  if (conditionMet) { 
    console.log('[createProduct] Advanced settings condition met. Product ID:', createdProduct.id);
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
    console.log('[createProduct] Final advancedSettingsDataToInsert for DB:', JSON.stringify(advancedSettingsDataToInsert, null, 2));

    const { data: newAdvancedSettings, error: advancedSettingsError } = await supabase
      .from('product_advanced_settings')
      .insert(advancedSettingsDataToInsert)
      .select('*') 
      .single();

    if (advancedSettingsError) {
      console.error('Error creating product advanced settings:', advancedSettingsError);
      toast.error(`تنبيه: تم إنشاء المنتج ولكن فشل حفظ الإعدادات المتقدمة: ${advancedSettingsError.message}`);
    } else if (newAdvancedSettings) {
      createdAdvancedSettings = newAdvancedSettings;
      console.log('Product advanced settings created successfully for product id:', createdProduct.id);
    }
  } else {
    console.log('[createProduct] No advanced settings provided or advanced_settings object is empty. Product ID:', createdProduct?.id, '. Skipping advanced settings creation.');
    console.log('[createProduct] advancedSettingsFromForm object was:', JSON.stringify(advancedSettingsFromForm, null, 2));
  }

  let createdMarketingSettings = null;
  if (marketingSettings && Object.keys(marketingSettings).length > 0) {
    const { data: mktSettings, error: mktSettingsError } = await supabase
      .from('product_marketing_settings')
      .insert({ ...marketingSettings, product_id: createdProduct.id, organization_id: organization_id })
      .select()
      .single();
    if (mktSettingsError) {
      console.error('Error creating product marketing settings:', mktSettingsError);
      toast.error(`فشل حفظ إعدادات التسويق: ${mktSettingsError.message}`);
    }
    createdMarketingSettings = mktSettings;
  }

  let createdImagesArray: any[] = [];
  if (additional_images && additional_images.length > 0) {
    const imageInserts: TablesInsert<'product_images'>[] = additional_images.map((imageUrl, index) => ({
      product_id: createdProduct.id,
      image_url: imageUrl,
      sort_order: index,
      organization_id: organization_id,
    }));
    const { data: newImagesResult, error: imagesError } = await supabase.from('product_images').insert(imageInserts).select();
    if (imagesError) {
      console.error('Error inserting product images:', imagesError);
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

  console.log(`Updating product ${id} with data:`, updates);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
    const error = new Error("User not authenticated for update");
    toast.error("يجب تسجيل الدخول لتحديث المنتج.");
    throw error;
    }

  const { advancedSettings: advancedSettingsFromForm, ...productCoreUpdates } = updates;
  
  if (productCoreUpdates.purchase_price !== undefined && productCoreUpdates.purchase_price !== null) {
    productCoreUpdates.purchase_price = Number(productCoreUpdates.purchase_price);
    }

  const { data: updatedProductData, error: productUpdateError } = await supabase
      .from('products')
    .update({
      ...productCoreUpdates,
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
    console.error(`Error updating product ${id}:`, productUpdateError);
    toast.error(`فشل تحديث المنتج: ${productUpdateError.message}`);
      throw productUpdateError;
    }
    
  if (!updatedProductData) {
    const errorMessage = `Product with ID ${id} not found or update failed to return data.`;
    console.error(errorMessage);
    toast.error(errorMessage);
    throw new Error(errorMessage);
    }

  console.log('Product core data updated successfully:', updatedProductData);

  let currentAdvancedSettings = null;
    if (advancedSettings && Object.keys(advancedSettings).length > 0) {
    const settingsToUpsert: TablesInsert<'product_advanced_settings'> = {
      product_id: id, 
      ...advancedSettings, 
    };

    for (const key in settingsToUpsert) {
        if (advancedSettings.hasOwnProperty(key) && typeof settingsToUpsert[key as keyof typeof settingsToUpsert] === 'boolean' && settingsToUpsert[key as keyof typeof settingsToUpsert] === undefined) {
            // @ts-ignore
            settingsToUpsert[key] = false;
      }
    }

    console.log(`Upserting advanced settings for product ${id}:`, settingsToUpsert);

    const { data: upsertedSettings, error: advancedSettingsError } = await supabase
          .from('product_advanced_settings')
      .upsert(settingsToUpsert, { onConflict: 'product_id' })
      .select('*') 
          .single();

    if (advancedSettingsError) {
      console.error(`Error upserting advanced settings for product ${id}:`, advancedSettingsError);
      toast.error(`تنبيه: تم تحديث المنتج، ولكن فشل تحديث الإعدادات المتقدمة: ${advancedSettingsError.message}`);
      const { data: existingSettingsOnError, error: fetchExistingOnError } = await supabase.from('product_advanced_settings').select('*').eq('product_id', id).single();
      if (fetchExistingOnError) {
        console.error(`Error fetching existing advanced settings for product ${id} after upsert failure:`, fetchExistingOnError);
      }
      currentAdvancedSettings = existingSettingsOnError || null;
        } else {
      currentAdvancedSettings = upsertedSettings;
      console.log(`Advanced settings for product ${id} upserted successfully.`);
        }
      } else {
    const { data: existingSettings, error: fetchExistingError } = await supabase.from('product_advanced_settings').select('*').eq('product_id', id).single();
    if (fetchExistingError) {
        console.error(`Error fetching existing advanced settings for product ${id} when no updates provided:`, fetchExistingError);
        // في حالة الفشل هنا، currentAdvancedSettings سيبقى null كما تم تهيئته
        } else {
        currentAdvancedSettings = existingSettings;
        }
      }

  let currentMarketingSettings = null;
  if (marketingSettings && Object.keys(marketingSettings).length > 0) {
    const { data: mktSettings, error: mktSettingsError } = await supabase
      .from('product_marketing_settings')
      .upsert({ ...marketingSettings, product_id: id, organization_id: updatedProductData.organization_id }, { onConflict: 'product_id' })
      .select()
      .single();
    if (mktSettingsError) {
      console.error('Error upserting product marketing settings:', mktSettingsError);
      toast.error(`فشل تحديث إعدادات التسويق: ${mktSettingsError.message}`);
    }
    currentMarketingSettings = mktSettings;
  } else {
    const { data: existingMkt } = await supabase.from('product_marketing_settings').select('*').eq('product_id', id).single();
    currentMarketingSettings = existingMkt;
  }

  const resultProduct: Product = {
    ...(updatedProductData as unknown as Omit<Product, 'product_advanced_settings' | 'product_marketing_settings'>), 
    product_advanced_settings: currentAdvancedSettings, 
    product_marketing_settings: currentMarketingSettings,
    additional_images: updatedProductData.product_images?.map(img => img.image_url) || [],
    purchase_page_config: updatedProductData.purchase_page_config ? JSON.parse(JSON.stringify(updatedProductData.purchase_page_config)) : null,
  };
  
  console.log(`Product ${id} updated successfully with advanced settings:`, resultProduct);
  toast.success("تم تحديث المنتج بنجاح!");
  return resultProduct;
};

export const deleteProduct = async (id: string, forceDisable: boolean = false): Promise<void> => {
  try {
    const { data: orderItems, error: orderItemsError } = await supabase
      .from('order_items')
      .select('id')
      .eq('product_id', id)
      .limit(1);

    if (orderItemsError) {
      console.error(`خطأ في التحقق من ارتباطات المنتج ${id}:`, orderItemsError);
      throw orderItemsError;
    }

    if ((orderItems && orderItems.length > 0) && forceDisable) {
      
      await disableProduct(id);
      return;
    }
    
    if (orderItems && orderItems.length > 0) {
      const error = {
        code: 'PRODUCT_IN_USE',
        message: 'لا يمكن حذف هذا المنتج لأنه مستخدم في طلبات. يمكنك تعطيل المنتج بدلاً من حذفه.',
        details: 'المنتج مرتبط بطلبات سابقة ويجب الاحتفاظ به للحفاظ على سجلات الطلبات سليمة.',
        canDisable: true
      };
      console.error(`لا يمكن حذف المنتج ${id}:`, error);
      throw error;
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`خطأ في حذف المنتج ${id}:`, error);
      throw error;
    }
  } catch (error) {
    console.error(`خطأ في عملية حذف المنتج ${id}:`, error);
    throw error;
  }
};

export const getCategories = async (): Promise<Category[]> => {
  const { data, error } = await supabase
    .from('product_categories')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }

  return data;
};

export const getCategoryById = async (id: string): Promise<Category | null> => {
  const { data, error } = await supabase
    .from('product_categories')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching category with id ${id}:`, error);
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
    console.error('Error creating category:', error);
    throw error;
  }

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
    console.error('Error fetching subcategories:', error);
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
    console.error(`Error fetching subcategory with id ${id}:`, error);
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
    console.error('Error creating subcategory:', error);
    throw error;
  }

  return data;
};

export const getWholesaleTiers = async (productId: string) => {
  
  
  if (!productId) {
    console.error('Invalid product ID provided to getWholesaleTiers:', productId);
    return [];
  }
  
  try {
    const { data, error } = await supabase
      .from('wholesale_tiers')
      .select('*')
      .eq('product_id', productId)
      .order('min_quantity', { ascending: true });

    if (error) {
      console.error(`Error fetching wholesale tiers for product ${productId}:`, error);
      throw error;
    }

    
    return data || [];
  } catch (error) {
    console.error(`Exception in getWholesaleTiers for product ${productId}:`, error);
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
    console.error('Error creating wholesale tier:', error);
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
    console.error('Error updating wholesale tier:', error);
    throw error;
  }
  return data;
};

export const deleteWholesaleTier = async (tierId: string) => {
  
  
  if (!tierId) {
    console.error('محاولة حذف مرحلة سعرية بدون توفير معرف');
    throw new Error('معرف المرحلة السعرية مطلوب للحذف');
  }
  
  try {
    const { error } = await supabase
      .from('wholesale_tiers')
      .delete()
      .eq('id', tierId);

    if (error) {
      console.error(`خطأ في حذف مرحلة سعرية للجملة ${tierId}:`, error);
      throw error;
    }

    
    return true;
  } catch (error) {
    console.error(`خطأ عام في حذف مرحلة سعرية للجملة ${tierId}:`, error);
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
    console.error(`Error getting price for product ${productId} with quantity ${quantity}:`, error);
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
        console.error('خطأ في التحقق من تفرد رمز SKU:', checkError);
      }
    }
    
    return generatedSku;
  } catch (error) {
    console.error('خطأ غير متوقع في توليد رمز المنتج (SKU):', error);
    
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
      console.error('خطأ في توليد الباركود:', error);
      
      return generateEAN13Fallback();
    }

    return data;
  } catch (error) {
    console.error('خطأ غير متوقع في توليد الباركود:', error);
    
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
      console.error('خطأ في توليد باركود المتغير:', error);
      
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
    console.error('خطأ غير متوقع في توليد باركود المتغير:', error);
    
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
      console.error('خطأ في التحقق من صحة الباركود:', error);
      
      return validateEAN13Locally(barcode);
    }

    return data;
  } catch (error) {
    console.error('خطأ غير متوقع في التحقق من صحة الباركود:', error);
    
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
      console.error(`خطأ في تعطيل المنتج ${id}:`, error);
      throw error;
    }

    if (!data) {
      throw new Error(`لم يتم العثور على المنتج بعد التعطيل: ${id}`);
    }
    
    
    return data as any;
  } catch (error) {
    console.error(`خطأ عام في تعطيل المنتج ${id}:`, error);
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
      console.error(`خطأ في تفعيل المنتج ${id}:`, error);
      throw error;
    }

    if (!data) {
      throw new Error(`لم يتم العثور على المنتج بعد التفعيل: ${id}`);
    }
    
    
    return data as any;
  } catch (error) {
    console.error(`خطأ عام في تفعيل المنتج ${id}:`, error);
    throw error;
  }
};

export const updateProductPurchaseConfig = async (
  productId: string,
  config: PurchasePageConfig | null
): Promise<Product | null> => {
  if (!productId) {
    console.error('Product ID is required to update purchase page config.');
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
      console.error(`Error updating purchase page config for product ${productId}:`, error);
      throw error;
    }
    
    if (!data) {
      throw new Error(`Product not found after updating purchase page config: ${productId}`);
    }

    
    return data as any;
  } catch (error) {
    console.error(`Unexpected error updating purchase page config for product ${productId}:`, error);
    throw error;
  }
};

export const getProductListForOrganization = async (
  organizationId: string
): Promise<{ id: string; name: string }[]> => {
  if (!organizationId) {
    console.error("Organization ID is required for getProductListForOrganization");
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
      console.error('Error fetching product list for organization:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error fetching product list:', error);
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
    console.error('Error fetching product reviews:', error);
    return [];
  }
  return data as Review[];
}; 