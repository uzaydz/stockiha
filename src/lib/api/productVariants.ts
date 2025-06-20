import { supabase } from '@/lib/supabase';
import type { ProductColor, InsertProductColor, InsertProductImage, InsertProductSize, ProductSize } from '@/types/product';
import { toast } from 'sonner';

// الحصول على ألوان المنتج
export const getProductColors = async (productId: string): Promise<ProductColor[]> => {
  try {
    
    const { data, error } = await supabase
      .from('product_colors')
      .select('*')
      .eq('product_id', productId)
      .order('is_default', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    toast.error('فشل في جلب ألوان المنتج');
    return [];
  }
};

// الحصول على صور المنتج
export const getProductImages = async (productId: string): Promise<InsertProductImage[]> => {
  try {
    const { data, error } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', productId)
      .order('sort_order', { ascending: true });
    
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    return [];
  }
};

// إنشاء لون منتج جديد
export const createProductColor = async (color: InsertProductColor): Promise<ProductColor> => {
  try {
    const { data, error } = await supabase
      .from('product_colors')
      .insert(color)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    // تحديث stock_quantity للمنتج تلقائياً
    await updateProductStockQuantity(color.product_id);
    
    return data;
  } catch (error) {
    throw error;
  }
};

// تحديث لون منتج
export const updateProductColor = async (colorId: string, updates: Partial<InsertProductColor>): Promise<ProductColor> => {
  try {
    const { data, error } = await supabase
      .from('product_colors')
      .update(updates)
      .eq('id', colorId)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    // تحديث stock_quantity للمنتج تلقائياً إذا تم تحديث الكمية
    if (updates.quantity !== undefined && data.product_id) {
      await updateProductStockQuantity(data.product_id);
    }
    
    return data;
  } catch (error) {
    throw error;
  }
};

// حذف لون منتج
export const deleteProductColor = async (colorId: string): Promise<void> => {
  try {
    // جلب معرف المنتج قبل الحذف
    const { data: colorData } = await supabase
      .from('product_colors')
      .select('product_id')
      .eq('id', colorId)
      .single();
    
    const { error } = await supabase
      .from('product_colors')
      .delete()
      .eq('id', colorId);
    
    if (error) {
      throw error;
    }
    
    // تحديث stock_quantity للمنتج تلقائياً بعد الحذف
    if (colorData?.product_id) {
      await updateProductStockQuantity(colorData.product_id);
    }
  } catch (error) {
    throw error;
  }
};

// إنشاء صورة منتج جديدة
export const createProductImage = async (image: InsertProductImage): Promise<InsertProductImage> => {
  try {
    const { data, error } = await supabase
      .from('product_images')
      .insert(image)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    throw error;
  }
};

// حذف صورة منتج
export const deleteProductImage = async (imageId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('product_images')
      .delete()
      .eq('id', imageId);
    
    if (error) {
      throw error;
    }
  } catch (error) {
    throw error;
  }
};

// توليد باركود للمتغير
export const generateVariantBarcode = async (productId: string, variantId: string): Promise<string> => {
  try {
    const { data, error } = await supabase
      .rpc('generate_variant_barcode', {
        product_id: productId,
        variant_id: variantId
      });
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    
    // آلية احتياطية في حالة فشل استدعاء rpc
    const timestamp = Date.now().toString().substr(-6);
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${timestamp}${randomSuffix}`;
  }
};

// تعريف وظيفة لإنشاء مقاس جديد للون
export async function createProductSize(data: InsertProductSize): Promise<string> {
  try {
    // تأكد من أن لدينا معرف اللون
    if (!data.color_id) {
      throw new Error('معرف اللون مطلوب لإنشاء مقاس جديد');
    }

    if (!data.product_id) {
      throw new Error('معرف المنتج مطلوب لإنشاء مقاس جديد');
    }

    try {
      // 1. تحديث الأب قبل إضافة المقاس
      await supabase
        .from('product_colors')
        .update({ has_sizes: true })
        .eq('id', data.color_id);

      // 2. تحديث المنتج
      await supabase
        .from('products')
        .update({ use_sizes: true })
        .eq('id', data.product_id);

      // مهلة قصيرة للتأكد من اكتمال التحديثات السابقة
      await new Promise(resolve => setTimeout(resolve, 100));

      // 3. إضافة المقاس مباشرة بطريقة بسيطة
      const sizeData = {
        color_id: data.color_id,
        product_id: data.product_id,
        size_name: data.size_name || '',
        quantity: data.quantity || 0,
        price: data.price || null,
        barcode: data.barcode || null,
        is_default: data.is_default || false
      };
      
      const { data: newSize, error } = await supabase
        .from('product_sizes')
        .insert(sizeData)
        .select('id')
        .single();
      
      if (error) {
        throw error;
      }
      
      // بعد إنشاء المقاس بنجاح، تحديث الكميات
      await updateColorQuantity(data.color_id);
      await updateProductQuantity(data.product_id);
      
      return newSize.id;
      
    } catch (innerError) {
      throw innerError;
    }
  } catch (error) {
    throw error;
  }
}

// دالة مساعدة لتحديث كمية اللون بناءً على مجموع كميات المقاسات
async function updateColorQuantity(colorId: string): Promise<void> {
  try {
    // الحصول على مجموع كميات المقاسات لهذا اللون
    const { data: sizes, error: sizesError } = await supabase
      .from('product_sizes')
      .select('quantity')
      .eq('color_id', colorId);
    
    if (sizesError) throw sizesError;
    
    const totalQuantity = sizes?.reduce((sum, size) => sum + (size.quantity || 0), 0) || 0;
    
    // تحديث كمية اللون
    const { error: updateError } = await supabase
      .from('product_colors')
      .update({ quantity: totalQuantity })
      .eq('id', colorId);
    
    if (updateError) throw updateError;
  } catch (error) {
  }
}

// دالة مساعدة لتحديث كمية المنتج بناءً على مجموع كميات الألوان
async function updateProductQuantity(productId: string): Promise<void> {
  try {
    // الحصول على مجموع كميات الألوان لهذا المنتج
    const { data: colors, error: colorsError } = await supabase
      .from('product_colors')
      .select('quantity')
      .eq('product_id', productId);
    
    if (colorsError) throw colorsError;
    
    const totalQuantity = colors?.reduce((sum, color) => sum + (color.quantity || 0), 0) || 0;
    
    // تحديث كمية المنتج
    const { error: updateError } = await supabase
      .from('products')
      .update({ stock_quantity: totalQuantity })
      .eq('id', productId);
    
    if (updateError) throw updateError;
  } catch (error) {
  }
}

// تعريف وظيفة لتحديث مقاس موجود
export async function updateProductSize(sizeId: string, data: Partial<InsertProductSize>): Promise<boolean> {
  try {
    // التحقق من معرف المقاس
    if (!sizeId) {
      return false;
    }

    // الحصول على معلومات المقاس الحالية
    const { data: sizeInfo, error: sizeError } = await supabase
      .from('product_sizes')
      .select('color_id, product_id')
      .eq('id', sizeId)
      .single();

    if (sizeError) {
      throw sizeError;
    }

    const colorId = sizeInfo.color_id;
    const productId = sizeInfo.product_id;

    // إذا كان هذا هو المقاس الافتراضي، إلغاء تعيين أي مقاس افتراضي آخر لنفس اللون
    if (data.is_default) {
      const { error: defaultError } = await supabase
        .from('product_sizes')
        .update({ is_default: false })
        .eq('color_id', colorId)
        .neq('id', sizeId);
        
      if (defaultError) {
      }
    }

    // تحديث بيانات المقاس
    const updateData: any = {};
    if (data.size_name !== undefined) updateData.size_name = data.size_name;
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.barcode !== undefined) updateData.barcode = data.barcode;
    if (data.is_default !== undefined) updateData.is_default = data.is_default;

    const { error: updateError } = await supabase
      .from('product_sizes')
      .update(updateData)
      .eq('id', sizeId);

    if (updateError) {
      throw updateError;
    }

    // تحديث كمية اللون بناءً على مجموع كميات المقاسات
    await updateColorQuantity(colorId);
    
    // تحديث كمية المنتج بناءً على مجموع كميات الألوان
    await updateProductQuantity(productId);

    return true;
  } catch (error) {
    throw error;
  }
}

// تعريف وظيفة لحذف مقاس
export async function deleteProductSize(sizeId: string): Promise<boolean> {
  try {
    // إرسال طلب حذف المقاس
    const { data: success, error } = await supabase.rpc('delete_product_size', {
      size_id: sizeId
    });

    if (error) {
      toast.error('فشل في حذف المقاس: ' + error.message);
      throw error;
    }

    return success;
  } catch (error) {
    throw error;
  }
}

// تعريف وظيفة للحصول على مقاسات لون معين
export async function getProductSizes(colorId: string): Promise<ProductSize[]> {
  try {
    // التحقق من أن معرّف اللون صالح كـ UUID قبل الاستدعاء
    if (!colorId || colorId.startsWith('temp-') || !colorId.includes('-')) {
      return [];
    }

    // إرسال طلب للحصول على المقاسات
    const { data, error } = await supabase.rpc('get_product_sizes', {
      color_id: colorId
    });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    throw error;
  }
}

// تعريف وظيفة لإنشاء مقاسات متعددة دفعة واحدة
export async function createProductSizesBatch(sizes: InsertProductSize[]): Promise<void> {
  try {
    for (const size of sizes) {
      await createProductSize(size);
    }
  } catch (error) {
    throw error;
  }
}

// دالة مساعدة لتحديث stock_quantity للمنتج بناءً على مجموع كميات الألوان
export const updateProductStockQuantity = async (productId: string): Promise<void> => {
  try {
    // أولاً، تحقق من أن المنتج له متغيرات
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('has_variants')
      .eq('id', productId)
      .single();
    
    if (productError || !product) {
      console.log('❌ updateProductStockQuantity: المنتج غير موجود');
      return;
    }
    
    // إذا كان المنتج ليس له متغيرات، لا تحديث stock_quantity تلقائياً
    if (!product.has_variants) {
      console.log('⏭️ updateProductStockQuantity: تم تخطي التحديث لأن المنتج ليس له متغيرات');
      return;
    }
    
    console.log('🔄 updateProductStockQuantity: بدء تحديث stock_quantity للمنتج مع متغيرات');
    
    // جلب جميع ألوان المنتج وحساب المجموع
    const { data: colors, error: colorsError } = await supabase
      .from('product_colors')
      .select('quantity')
      .eq('product_id', productId);
    
    if (colorsError) {
      console.log('❌ updateProductStockQuantity: خطأ في جلب الألوان:', colorsError);
      return;
    }
    
    // حساب مجموع الكميات
    const totalQuantity = colors?.reduce((sum, color) => sum + (color.quantity || 0), 0) || 0;
    console.log('📊 updateProductStockQuantity: المجموع المحسوب:', totalQuantity);
    
    // تحديث stock_quantity للمنتج
    const { error: updateError } = await supabase
      .from('products')
      .update({ stock_quantity: totalQuantity })
      .eq('id', productId);
    
    if (updateError) {
      console.log('❌ updateProductStockQuantity: خطأ في التحديث:', updateError);
    } else {
      console.log('✅ updateProductStockQuantity: تم تحديث stock_quantity إلى:', totalQuantity);
    }
  } catch (error) {
    console.log('❌ updateProductStockQuantity: خطأ عام:', error);
  }
};
