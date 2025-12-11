import { supabase } from '@/lib/supabase';

// نوع بيانات المنتج
export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  purchase_price?: number; // سعر الشراء
  wholesale_price?: number;
  partial_wholesale_price?: number;
  min_wholesale_quantity?: number;
  min_partial_wholesale_quantity?: number;
  allow_retail?: boolean;
  allow_wholesale?: boolean;
  allow_partial_wholesale?: boolean;
  sku?: string;
  barcode?: string;
  category_id?: string;
  subcategory_id?: string;
  brand?: string;
  thumbnail_image: string;
  stock_quantity: number;
  min_stock_level?: number;
  is_active?: boolean;
  is_digital?: boolean;
  created_at: string;
  updated_at: string;
  organization_id: string;
}

// خيارات البحث والترقيم
export interface ProductSearchOptions {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  isActive?: boolean;
}

// نتيجة البحث مع معلومات الترقيم
export interface ProductSearchResult {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * جلب قائمة المنتجات حسب المؤسسة
 */
export const getProducts = async (organizationId: string): Promise<Product[]> => {
  try {

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    return [];
  }
};

/**
 * جلب قائمة المنتجات مع دعم الترقيم والبحث
 */
export const getProductsPaginated = async (
  organizationId: string,
  options: ProductSearchOptions = {}
): Promise<ProductSearchResult> => {
  const { page = 1, limit = 20, search, categoryId, isActive } = options;
  const offset = (page - 1) * limit;

  try {
    // بناء الاستعلام الأساسي
    let query = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId);

    // إضافة فلتر البحث
    if (search && search.trim()) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,barcode.ilike.%${search}%`);
    }

    // إضافة فلتر الفئة
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    // إضافة فلتر الحالة
    if (isActive !== undefined) {
      query = query.eq('is_active', isActive);
    }

    // تطبيق الترقيم
    const { data, error, count } = await query
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    const total = count || 0;

    return {
      products: data || [],
      total,
      page,
      limit,
      hasMore: offset + (data?.length || 0) < total,
    };
  } catch (error) {
    console.error('[productService] خطأ في جلب المنتجات:', error);
    return {
      products: [],
      total: 0,
      page,
      limit,
      hasMore: false,
    };
  }
};

/**
 * البحث السريع عن المنتجات (للقوائم المنسدلة)
 */
export const searchProducts = async (
  organizationId: string,
  searchTerm: string,
  limit: number = 10
): Promise<Product[]> => {
  if (!searchTerm || searchTerm.trim().length < 2) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, price, purchase_price, sku, barcode, thumbnail_image, stock_quantity')
      .eq('organization_id', organizationId)
      .or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%,barcode.ilike.%${searchTerm}%`)
      .limit(limit);

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('[productService] خطأ في البحث عن المنتجات:', error);
    return [];
  }
};

/**
 * جلب منتج واحد حسب المعرف
 */
export const getProductById = async (organizationId: string, productId: string): Promise<Product | null> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('id', productId)
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    return null;
  }
};

/**
 * إنشاء منتج جديد
 */
export const createProduct = async (organizationId: string, product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product | null> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .insert({
        ...product,
        organization_id: organizationId,
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    return null;
  }
};

/**
 * تحديث منتج موجود
 */
export const updateProduct = async (organizationId: string, productId: string, updates: Partial<Omit<Product, 'id' | 'created_at' | 'updated_at' | 'organization_id'>>): Promise<Product | null> => {
  try {
    // Split update and select operations
    const { error: updateError } = await supabase
      .from('products')
      .update(updates)
      .eq('organization_id', organizationId)
      .eq('id', productId);
    
    if (updateError) {
      throw updateError;
    }
    
    // Now fetch the updated product
    const { data, error: selectError } = await supabase
      .from('products')
      .select()
      .eq('organization_id', organizationId)
      .eq('id', productId)
      .single();
      
    if (selectError) {
      throw selectError;
    }
    
    return data;
  } catch (error) {
    return null;
  }
};

/**
 * حذف منتج
 */
export const deleteProduct = async (organizationId: string, productId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('organization_id', organizationId)
      .eq('id', productId);
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * جلب مراحل أسعار الجملة للمنتج
 * ✅ تم التحديث لاستخدام product_price_tiers بدلاً من wholesale_tiers
 */
export const getWholesaleTiers = async (organizationId: string, productId: string) => {
  console.log('[productService:getWholesaleTiers] 🔍 Loading tiers:', { organizationId, productId });
  try {
    const { data, error } = await supabase
      .from('product_price_tiers')
      .select('id, product_id, min_quantity, price, tier_name, tier_label, price_type, max_quantity, discount_percentage, is_active, sort_order')
      .eq('product_id', productId)
      .order('min_quantity', { ascending: true });

    if (error) {
      console.error('[productService:getWholesaleTiers] ❌ Error:', error);
      throw error;
    }

    // تحويل البيانات للتوافق مع الـ interface القديم
    const transformedData = (data || []).map(tier => ({
      ...tier,
      price_per_unit: tier.price, // للتوافق مع الكود القديم
    }));

    console.log('[productService:getWholesaleTiers] ✅ Loaded:', transformedData.length, 'tiers');
    return transformedData;
  } catch (error) {
    console.error('[productService:getWholesaleTiers] ❌ Exception:', error);
    return [];
  }
};

/**
 * إضافة مرحلة سعر جملة جديدة
 * ✅ تم التحديث لاستخدام product_price_tiers بدلاً من wholesale_tiers
 */
export const addWholesaleTier = async (organizationId: string, tier: {
  product_id: string;
  min_quantity: number;
  price: number;
}) => {
  console.log('[productService:addWholesaleTier] 🔍 Adding tier:', tier);
  try {
    const { data, error } = await supabase
      .from('product_price_tiers')
      .insert({
        product_id: tier.product_id,
        min_quantity: tier.min_quantity,
        price: tier.price,
        tier_name: 'wholesale',
        price_type: 'fixed',
        is_active: true,
        sort_order: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('[productService:addWholesaleTier] ❌ Error:', error);
      throw error;
    }

    const transformedData = {
      ...data,
      price_per_unit: data.price,
    };

    console.log('[productService:addWholesaleTier] ✅ Added:', transformedData);
    return transformedData;
  } catch (error) {
    console.error('[productService:addWholesaleTier] ❌ Exception:', error);
    return null;
  }
};

/**
 * تحديث مرحلة سعر جملة
 * ✅ تم التحديث لاستخدام product_price_tiers بدلاً من wholesale_tiers
 */
export const updateWholesaleTier = async (organizationId: string, tierId: string, updates: {
  min_quantity?: number;
  price?: number;
}) => {
  console.log('[productService:updateWholesaleTier] 🔍 Updating tier:', tierId, updates);
  try {
    const { data, error } = await supabase
      .from('product_price_tiers')
      .update(updates)
      .eq('id', tierId)
      .select()
      .single();

    if (error) {
      console.error('[productService:updateWholesaleTier] ❌ Error:', error);
      throw error;
    }

    const transformedData = {
      ...data,
      price_per_unit: data.price,
    };

    console.log('[productService:updateWholesaleTier] ✅ Updated:', transformedData);
    return transformedData;
  } catch (error) {
    console.error('[productService:updateWholesaleTier] ❌ Exception:', error);
    return null;
  }
};

/**
 * حذف مرحلة سعر جملة
 * ✅ تم التحديث لاستخدام product_price_tiers بدلاً من wholesale_tiers
 */
export const deleteWholesaleTier = async (organizationId: string, tierId: string) => {
  console.log('[productService:deleteWholesaleTier] 🔍 Deleting tier:', tierId);
  try {
    const { error } = await supabase
      .from('product_price_tiers')
      .delete()
      .eq('id', tierId);

    if (error) {
      console.error('[productService:deleteWholesaleTier] ❌ Error:', error);
      throw error;
    }

    console.log('[productService:deleteWholesaleTier] ✅ Deleted tier:', tierId);
    return true;
  } catch (error) {
    console.error('[productService:deleteWholesaleTier] ❌ Exception:', error);
    return false;
  }
};

/**
 * حساب السعر المناسب حسب الكمية
 */
export const getProductPriceForQuantity = async (productId: string, quantity: number): Promise<number | null> => {
  try {
    const { data, error } = await supabase
      .rpc('get_product_price_for_quantity', {
        p_product_id: productId,
        p_quantity: quantity
      });

    if (error) {
      // في حالة حدوث خطأ في الوظيفة البعيدة، نقوم بتنفيذ حساب محلي
      // للحصول على السعر المناسب
      const { data: product } = await supabase
        .from('products')
        .select('price, wholesale_price, min_wholesale_quantity, partial_wholesale_price, min_partial_wholesale_quantity, allow_wholesale, allow_partial_wholesale')
        .eq('id', productId)
        .single();

      if (product) {
        // تطبيق منطق الأسعار بالجملة محليًا
        if (product.allow_wholesale && 
            product.wholesale_price !== null && 
            product.min_wholesale_quantity !== null && 
            quantity >= product.min_wholesale_quantity) {
          return product.wholesale_price;
        } else if (product.allow_partial_wholesale && 
                  product.partial_wholesale_price !== null && 
                  product.min_partial_wholesale_quantity !== null && 
                  quantity >= product.min_partial_wholesale_quantity) {
          return product.partial_wholesale_price;
        } else {
          return product.price;
        }
      }
      return null;
    }

    return data;
  } catch (error) {
    return null;
  }
};
