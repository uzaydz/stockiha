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
 */
export const getWholesaleTiers = async (organizationId: string, productId: string) => {
  try {
    const { data, error } = await supabase
      .from('wholesale_tiers')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('product_id', productId)
      .order('min_quantity', { ascending: true });
    
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    return [];
  }
};

/**
 * إضافة مرحلة سعر جملة جديدة
 */
export const addWholesaleTier = async (organizationId: string, tier: {
  product_id: string;
  min_quantity: number;
  price: number;
}) => {
  try {
    const { data, error } = await supabase
      .from('wholesale_tiers')
      .insert({
        ...tier,
        organization_id: organizationId
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
 * تحديث مرحلة سعر جملة
 */
export const updateWholesaleTier = async (organizationId: string, tierId: string, updates: {
  min_quantity?: number;
  price?: number;
}) => {
  try {
    const { data, error } = await supabase
      .from('wholesale_tiers')
      .update(updates)
      .eq('organization_id', organizationId)
      .eq('id', tierId)
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
 * حذف مرحلة سعر جملة
 */
export const deleteWholesaleTier = async (organizationId: string, tierId: string) => {
  try {
    const { error } = await supabase
      .from('wholesale_tiers')
      .delete()
      .eq('organization_id', organizationId)
      .eq('id', tierId);
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
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
