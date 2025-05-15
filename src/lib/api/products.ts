import { supabase } from '@/lib/supabase-client';
import { getSupabaseClient } from '@/lib/supabase-client';
import type { Database } from '@/types/database.types';

export interface TimerConfig {
  enabled: boolean;
  endDate: string; // Or Date?
  message: string;
  textAbove?: string;
  textBelow?: string;
  style?: 'default' | 'minimal' | 'prominent';
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
};

export interface InsertProduct {
  name: string;
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
  category?: string;
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
      .select('*');
    
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

export const getProductById = async (id: string): Promise<Product | null> => {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      purchase_page_config,
      category:category_id(id, name, slug),
      subcategory:subcategory_id(id, name, slug),
      product_images ( product_id, image_url, sort_order )
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching product with id ${id}:`, error);
    throw error;
  }

  // معالجة الصور الإضافية
  if (data && Array.isArray((data as any).product_images)) {
    (data as any).additional_images = ((data as any).product_images as any[])
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map(img => img.image_url);
    // delete (data as any).product_images; // اختياري: حذف البيانات الأولية للصور المدمجة
  } else if (data) {
    (data as any).additional_images = []; // ضمان وجود مصفوفة فارغة إذا لم توجد صور
  }

  // إضافة تحذير إذا كان المنتج معطلاً
  if (data && data.is_active === false) {
    console.warn(`تحذير: المنتج ${id} معطل ولن يظهر في نقاط البيع أو واجهة المتجر`);
  }

  return data as any;
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
    throw error;
  }

  return data as any;
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

export const createProduct = async (productData: InsertProduct) => {
  
  
  try {
    // Verificar que organization_id sea un UUID válido
    const isValidUUID = (uuid: string) => {
      if (!uuid) return false;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(uuid);
    };

    // Ensure we have a valid organization_id
    if (!productData.organization_id || !isValidUUID(productData.organization_id)) {
      console.error('Invalid organization_id:', productData.organization_id);
      throw new Error('Invalid organization_id. A valid UUID is required.');
    }
    
    // الحصول على نسخة من عميل Supabase مع جلسة المصادقة الحالية
    const clientSupabase = getSupabaseClient();
    
    // التحقق من تفرد رمز المنتج (SKU) قبل محاولة الإنشاء
    if (productData.sku && navigator.onLine) {
      try {
        // تعديل الاستعلام لمنع خطأ 406
        const { data: existingProducts, error } = await clientSupabase
          .from('products')
          .select('id, name')
          .eq('sku', productData.sku);
          
        // التحقق من وجود منتجات بنفس الرمز
        if (existingProducts && existingProducts.length > 0) {
          console.error('رمز المنتج (SKU) موجود بالفعل:', productData.sku);
          throw new Error(`رمز المنتج (SKU) "${productData.sku}" مستخدم بالفعل في منتج آخر. الرجاء استخدام رمز مختلف أو الضغط على زر توليد رمز تلقائي.`);
        }
      } catch (error) {
        // إذا كان الخطأ ليس متعلقًا بعدم وجود نتائج
        if (error && typeof error === 'object' && !('code' in error && error.code === 'PGRST116')) {
          console.error('خطأ في التحقق من تفرد رمز المنتج (SKU):', error);
          // لا تقم بإلقاء الخطأ، فقط استمر في المحاولة
        }
      }
    }
    
    // Convertir cadenas vacías en campos UUID a null
    if (productData.subcategory_id === '') {
      
      productData.subcategory_id = null;
    }
    
    if (productData.category_id === '') {
      console.error('category_id es obligatorio pero está vacío');
      throw new Error('category_id es obligatorio');
    }
    
    // التأكد من وجود قيم صالحة للصور
    if (!productData.thumbnail_image) {
      console.warn('لم يتم تحديد صورة رئيسية للمنتج');
    }
    
    if (!productData.images || productData.images.length === 0) {
      console.warn('لم يتم توفير مصفوفة الصور للمنتج');
      // إضافة الصورة الرئيسية إلى المصفوفة إذا كانت موجودة وكانت المصفوفة فارغة
      if (productData.thumbnail_image) {
        productData.images = [productData.thumbnail_image];
      } else {
        productData.images = [];
      }
    }
    
    // إضافة حقل "category" المطلوب في قاعدة البيانات
    // استخدام معرف الفئة كقيمة لحقل category إذا كان موجودًا
    if (productData.category_id && !productData.category) {
      productData.category = productData.category_id;
    }
    
    // التأكد من أن حقل category ليس فارغًا
    if (!productData.category) {
      console.error('حقل category مطلوب ولكنه غير موجود');
      throw new Error('حقل category مطلوب في قاعدة البيانات');
    }
    
    
    
    // Crear copia del objeto para evitar modificar el original directamente
    const productToInsert = {
      ...productData,
      // Añadir timestamp para updated_at y created_at
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Ensure we have the correct auth session 
    const { data: { session } } = await clientSupabase.auth.getSession();
    if (!session) {
      console.error('No active session found. User must be authenticated to create products.');
      throw new Error('Authentication required. Please sign in again.');
    }
    
    
    
    
    
    // Para depuración, vamos a imprimir todo el objeto que se enviará
    
    
    // Uso del cliente importado directamente como alternativa
    const { data, error } = await clientSupabase
      .from('products')
      .insert({
        name: productToInsert.name,
        description: productToInsert.description,
        price: productToInsert.price,
        purchase_price: productToInsert.purchase_price,
        compare_at_price: productToInsert.compare_at_price,
        sku: productToInsert.sku,
        barcode: productToInsert.barcode,
        category_id: productToInsert.category_id,
        category: productToInsert.category,
        subcategory_id: productToInsert.subcategory_id || null, // Garantizar que sea null y no cadena vacía
        brand: productToInsert.brand,
        stock_quantity: productToInsert.stock_quantity,
        thumbnail_image: productToInsert.thumbnail_image,
        images: productToInsert.images,
        is_digital: productToInsert.is_digital,
        is_new: productToInsert.is_new,
        is_featured: productToInsert.is_featured,
        has_variants: productToInsert.has_variants,
        show_price_on_landing: productToInsert.show_price_on_landing,
        organization_id: productToInsert.organization_id,
        slug: productToInsert.slug,
        features: productToInsert.features,
        specifications: productToInsert.specifications,
        created_at: productToInsert.created_at,
        updated_at: productToInsert.updated_at
      })
      .select()
      .single();
      
    if (error) {
      console.error('خطأ في إنشاء المنتج:', error);
      console.error('Error code:', error.code);
      console.error('Error details:', error.details);
      
      // إذا كان الخطأ بسبب تكرار قيمة رمز المنتج (SKU)
      if (error.code === '23505' && error.message?.includes('products_sku_key')) {
        throw new Error(`رمز المنتج (SKU) "${productData.sku}" مستخدم بالفعل في منتج آخر. الرجاء استخدام رمز مختلف أو الضغط على زر توليد رمز تلقائي.`);
      }
      
      // Si el error es de sintaxis UUID inválida, mostrar mensaje específico
      if (error.code === '22P02' && error.message?.includes('invalid input syntax for type uuid')) {
        console.error('Error de formato UUID inválido. Verificando campos UUID:');
        console.error('- organization_id:', productToInsert.organization_id);
        console.error('- category_id:', productToInsert.category_id);
        console.error('- subcategory_id:', productToInsert.subcategory_id);
        
        // Verificar qué campo tiene el problema
        if (!isValidUUID(productToInsert.organization_id)) {
          throw new Error('El campo organization_id no tiene un formato UUID válido');
        }
        
        if (!isValidUUID(productToInsert.category_id)) {
          throw new Error('El campo category_id no tiene un formato UUID válido');
        }
        
        if (productToInsert.subcategory_id !== null && !isValidUUID(productToInsert.subcategory_id)) {
          throw new Error('El campo subcategory_id no tiene un formato UUID válido');
        }
        
        throw new Error('Algún campo UUID tiene un formato inválido');
      }
      
      throw error;
    }
    
    if (!data) {
      throw new Error('لم يتم إرجاع بيانات بعد إنشاء المنتج');
    }
    
    
    return data as any;
  } catch (error) {
    console.error('خطأ في دالة createProduct:', error);
    throw error;
  }
};

export const updateProduct = async (id: string, updates: UpdateProduct): Promise<Product> => {
  try {
    
    
    // استخدام وظيفة RPC بسيطة لتحديث المنتج
    const { data: updateSuccess, error: updateError } = await supabase
      .rpc('simple_update_product', {
        p_id: id,
        p_data: updates
      });
    
    if (updateError) {
      console.error(`خطأ في تحديث المنتج ${id}:`, updateError);
      throw updateError;
    }
    
    // إذا تم التحديث بنجاح، قم بجلب المنتج المحدث في استعلام منفصل
    const { data: updatedProduct, error: fetchError } = await supabase
      .from('products')
      .select(`
        *,
        category:category_id(id, name, slug),
        subcategory:subcategory_id(id, name, slug)
      `)
      .eq('id', id)
      .single();
    
    if (fetchError) {
      console.error(`خطأ في جلب المنتج المحدث ${id}:`, fetchError);
      throw fetchError;
    }
    
    if (!updatedProduct) {
      throw new Error(`لم يتم العثور على المنتج بعد التحديث: ${id}`);
    }
    
    
    return updatedProduct as any;
  } catch (error) {
    console.error(`خطأ عام في تحديث المنتج ${id}:`, error);
    throw error;
  }
};

export const deleteProduct = async (id: string, forceDisable: boolean = false): Promise<void> => {
  try {
    // تحقق من وجود ارتباط مع طلبات
    const { data: orderItems, error: orderItemsError } = await supabase
      .from('order_items')
      .select('id')
      .eq('product_id', id)
      .limit(1);

    if (orderItemsError) {
      console.error(`خطأ في التحقق من ارتباطات المنتج ${id}:`, orderItemsError);
      throw orderItemsError;
    }

    // إذا كان المنتج مرتبطًا بطلبات والخيار forceDisable مفعل، قم بتعطيله بدلاً من حذفه
    if ((orderItems && orderItems.length > 0) && forceDisable) {
      
      await disableProduct(id);
      return;
    }
    
    // إذا كان المنتج مرتبطًا بطلبات ولم يتم طلب التعطيل، أرسل رسالة خطأ مخصصة
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

    // إذا لم يكن مرتبطًا بطلبات، قم بحذفه
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

// وظائف جديدة لإدارة الفئات والفئات الفرعية
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

/**
 * Get wholesale tiers for a product
 */
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

/**
 * Create a wholesale tier
 */
export const createWholesaleTier = async (tier: {
  product_id: string;
  min_quantity: number;
  price: number;
  organization_id: string;
}) => {
  
  
  // التحقق من وجود البيانات الإلزامية
  if (!tier.product_id || !tier.organization_id) {
    console.error('لا يمكن إنشاء مرحلة سعرية: معرف المنتج أو المؤسسة غير متوفر', {
      product_id: tier.product_id,
      organization_id: tier.organization_id
    });
    throw new Error('معلومات غير كافية لإنشاء مرحلة سعرية للجملة');
  }
  
  try {
    // إضافة أوقات الإنشاء والتحديث
    const tierData = {
      ...tier,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // استخدام كائن supabase مباشرة بدلاً من fetch الخارجي
    const { error: insertError } = await supabase
      .from('wholesale_tiers')
      .insert(tierData);
    
    if (insertError) {
      console.error('خطأ في إنشاء مرحلة سعرية للجملة:', insertError);
      throw insertError;
    }
    
    
    
    // ثم استرجاع أحدث سجل تم إنشاؤه لهذا المنتج
    const { data, error: selectError } = await supabase
      .from('wholesale_tiers')
      .select('*')
      .eq('product_id', tier.product_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (selectError) {
      console.error('خطأ في استرجاع مرحلة سعرية جديدة:', selectError);
      throw selectError;
    }
    
    if (!data) {
      console.error('تم إنشاء مرحلة سعرية ولكن لم يتم إرجاع بيانات');
      throw new Error('فشل استرجاع مرحلة سعرية للجملة بعد إنشائها');
    }

    
    return data;
  } catch (error) {
    console.error('استثناء عند إنشاء مرحلة سعرية للجملة:', error);
    throw error;
  }
};

/**
 * Update a wholesale tier
 */
export const updateWholesaleTier = async (
  tierId: string,
  updates: {
    min_quantity?: number;
    price?: number;
  }
) => {
  
  
  try {
    // إضافة وقت التحديث
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    // استخدام كائن supabase مباشرة بدلاً من fetch الخارجي
    const { error: updateError } = await supabase
      .from('wholesale_tiers')
      .update(updateData)
      .eq('id', tierId);
    
    if (updateError) {
      console.error(`خطأ في تحديث مرحلة سعرية للجملة ${tierId}:`, updateError);
      throw updateError;
    }
    
    
    
    // استعلام منفصل للحصول على البيانات المحدثة
    const { data, error: selectError } = await supabase
      .from('wholesale_tiers')
      .select()
      .eq('id', tierId)
      .single();

    if (selectError) {
      console.error(`خطأ في استرجاع مرحلة سعرية محدثة ${tierId}:`, selectError);
      throw selectError;
    }
    
    if (!data) {
      throw new Error(`لم يتم العثور على مرحلة سعرية بعد التحديث: ${tierId}`);
    }

    
    return data;
  } catch (error) {
    console.error(`خطأ عام في تحديث مرحلة سعرية للجملة ${tierId}:`, error);
    throw error;
  }
};

/**
 * Delete a wholesale tier
 */
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

/**
 * Get price for a product based on quantity
 */
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

// وظيفة لتوليد رمز المنتج (SKU) تلقائياً
export const generateAutomaticSku = async (
  categoryShortName: string = 'PR',
  brandShortName: string = '',
  organizationId?: string
): Promise<string> => {
  try {
    // تنظيف وتوحيد رمز الفئة
    const cleanCategoryCode = categoryShortName ? categoryShortName.toUpperCase().substring(0, 2) : 'PR';
    
    // تنظيف وتوحيد رمز الماركة
    let brandCode = '';
    if (brandShortName && brandShortName.trim() !== '') {
      brandCode = '-' + brandShortName.toUpperCase().substring(0, 2);
    }
    
    // استخدام جزء من السنة الحالية
    const yearCode = new Date().getFullYear().toString().substring(2);
    
    // إنشاء رقم عشوائي للتأكد من تفرد الرمز
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    // تكوين رمز SKU كامل
    const generatedSku = `${cleanCategoryCode}${brandCode}-${yearCode}-${randomNum}`;
    
    // إذا كان متصلاً بالإنترنت، تحقق من تفرد الرمز في قاعدة البيانات
    if (navigator.onLine && organizationId) {
      try {
        // التحقق من وجود رمز مماثل - تم تعديل الاستعلام لمنع خطأ 406
        const { data: existingProducts, error } = await supabase
          .from('products')
          .select('id, name')
          .eq('sku', generatedSku);
        
        // التحقق إذا كان هناك منتجات بنفس الرمز
        if (existingProducts && existingProducts.length > 0) {
          
          return generateAutomaticSku(categoryShortName, brandShortName, organizationId);
        }
      } catch (checkError) {
        console.error('خطأ في التحقق من تفرد رمز SKU:', checkError);
        // استمر في العملية مع الرمز الحالي حتى في حالة وجود خطأ
      }
    }
    
    return generatedSku;
  } catch (error) {
    console.error('خطأ غير متوقع في توليد رمز المنتج (SKU):', error);
    
    // حل احتياطي في حالة حدوث أي مشكلة
    const prefix = categoryShortName ? categoryShortName.substring(0, 2).toUpperCase() : 'PR';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return `${prefix}-${timestamp.substring(timestamp.length - 4)}-${random}`;
  }
};

// وظيفة لتوليد باركود EAN-13 تلقائياً
export const generateAutomaticBarcode = async (): Promise<string> => {
  try {
    // استخدام وظيفة قاعدة البيانات لتوليد الباركود
    const { data, error } = await supabase.rpc('generate_product_barcode');

    if (error) {
      console.error('خطأ في توليد الباركود:', error);
      
      // آلية احتياطية لإنشاء باركود EAN-13 صحيح
      // تقوم بإنشاء باركود بناء على الوقت الحالي والأرقام العشوائية
      return generateEAN13Fallback();
    }

    return data;
  } catch (error) {
    console.error('خطأ غير متوقع في توليد الباركود:', error);
    
    // حل احتياطي في حالة حدوث أي مشكلة
    return generateEAN13Fallback();
  }
};

// دالة مساعدة لتوليد باركود EAN-13 كحل احتياطي
const generateEAN13Fallback = (): string => {
  // بادئة الباركود (يمكن تغييرها)
  const prefix = '200';
  
  // توليد 9 أرقام عشوائية
  const body = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
  
  // تكوين مصفوفة أرقام من الـ 12 رقم الأولى
  const digits = (prefix + body).split('').map(Number);
  
  // حساب رقم التحقق باستخدام خوارزمية EAN-13
  let oddSum = 0;
  let evenSum = 0;
  
  for (let i = 0; i < 12; i++) {
    if (i % 2 === 0) {
      oddSum += digits[i];
    } else {
      evenSum += digits[i];
    }
  }
  
  // حساب رقم التحقق
  const checkDigit = (10 - ((oddSum + evenSum * 3) % 10)) % 10;
  
  // إرجاع الباركود كاملاً
  return prefix + body + checkDigit.toString();
};

// وظيفة لتوليد باركود لمتغير المنتج (لون)
export const generateVariantBarcode = async (
  productId: string,
  variantId: string
): Promise<string> => {
  try {
    // استخدام وظيفة قاعدة البيانات لتوليد باركود المتغير
    const { data, error } = await supabase.rpc('generate_variant_barcode', {
      product_id: productId,
      variant_id: variantId
    });

    if (error) {
      console.error('خطأ في توليد باركود المتغير:', error);
      
      // الحصول على باركود المنتج الأساسي
      const { data: product } = await supabase
        .from('products')
        .select('barcode')
        .eq('id', productId)
        .single();
      
      // إذا كان للمنتج باركود، أضف لاحقة عشوائية
      if (product?.barcode) {
        const suffix = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        return `${product.barcode}-${suffix}`;
      } else {
        // إذا لم يكن للمنتج باركود، قم بتوليد باركود جديد
        const newBarcode = await generateAutomaticBarcode();
        const suffix = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        return `${newBarcode}-${suffix}`;
      }
    }

    return data;
  } catch (error) {
    console.error('خطأ غير متوقع في توليد باركود المتغير:', error);
    
    // حل احتياطي
    const randomSuffix = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    const timestamp = Date.now().toString().substring(8);
    return `${timestamp}-${randomSuffix}`;
  }
};

// وظيفة للتحقق من صحة الباركود
export const validateBarcode = async (barcode: string): Promise<boolean> => {
  try {
    // استخدام وظيفة قاعدة البيانات للتحقق من صحة الباركود
    const { data, error } = await supabase.rpc('validate_barcode', {
      barcode: barcode
    });

    if (error) {
      console.error('خطأ في التحقق من صحة الباركود:', error);
      
      // تنفيذ التحقق محلياً إذا فشلت وظيفة قاعدة البيانات
      return validateEAN13Locally(barcode);
    }

    return data;
  } catch (error) {
    console.error('خطأ غير متوقع في التحقق من صحة الباركود:', error);
    
    // حل احتياطي
    return validateEAN13Locally(barcode);
  }
};

// دالة مساعدة للتحقق من صحة EAN-13 محليًا
const validateEAN13Locally = (barcode: string): boolean => {
  // التحقق من أن الباركود مكون من 13 رقمًا فقط
  if (!/^\d{13}$/.test(barcode)) {
    return false;
  }
  
  // تحويل النص إلى مصفوفة أرقام
  const digits = barcode.split('').map(Number);
  
  // الحصول على رقم التحقق
  const checkDigit = digits.pop();
  
  // حساب رقم التحقق المتوقع
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
  
  // التحقق من تطابق رقم التحقق
  return checkDigit === calculatedCheckDigit;
};

/**
 * تعطيل منتج بدلاً من حذفه
 * يستخدم لإخفاء المنتج من نقاط البيع والواجهة الأمامية مع الحفاظ على العلاقات في قاعدة البيانات
 */
export const disableProduct = async (id: string): Promise<Product> => {
  
  
  try {
    // تحديث المنتج ليكون معطلاً
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

/**
 * إعادة تفعيل منتج معطل
 */
export const enableProduct = async (id: string): Promise<Product> => {
  
  
  try {
    // تحديث المنتج ليكون مفعلاً
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

/**
 * Updates the purchase page customization config for a specific product.
 */
export const updateProductPurchaseConfig = async (
  productId: string,
  config: PurchasePageConfig | null // Allow null to reset/clear config
): Promise<Product | null> => {
  if (!productId) {
    console.error('Product ID is required to update purchase page config.');
    throw new Error('Product ID is required.');
  }

  try {
    
    // تحويل الكائن إلى JSON قبل إرساله لقاعدة البيانات
    const jsonConfig = config ? JSON.parse(JSON.stringify(config)) : null;
    
    // تحديث شامل يتضمن shipping_clone_id مباشرة إلى جانب purchase_page_config
    const updateData: any = { 
      purchase_page_config: jsonConfig,
      updated_at: new Date().toISOString()
    };
    
    // إضافة shipping_clone_id إلى التحديث إذا كان موجوداً في التكوين
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

/**
 * Fetches a lightweight list of active products (id and name) for an organization.
 * Useful for populating dropdowns or selection lists.
 */
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
      .select('id, name') // Only select id and name
      .eq('organization_id', organizationId)
      .eq('is_active', true) // Only active products
      .order('name', { ascending: true }); // Order alphabetically

    if (error) {
      console.error('Error fetching product list for organization:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error fetching product list:', error);
    return []; // Return empty array on error
  }
}; 