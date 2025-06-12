// ملف لإصلاح وظيفة تحديث المنتج
// تاريخ: 2024-11-08

/**
 * خطوات التعديل:
 * 1. نسخ هذا الملف إلى /src/lib/api/products.ts
 * 2. استبدال وظيفة updateProduct الحالية بهذه الوظيفة
 */

// استبدل وظيفة تحديث المنتج الحالية بهذه الوظيفة
export const updateProduct = async (id: string, updates: UpdateProduct): Promise<Product> => {
  try {

    // استخدام وظيفة RPC بدلاً من استعلام التحديث المباشر
    const { data: updatedProduct, error } = await supabase
      .rpc('update_product_with_return', {
        p_product_id: id,
        p_data: updates
      });
    
    if (error) {
      throw error;
    }
    
    if (!updatedProduct || updatedProduct.length === 0) {
      throw new Error(`لم يتم العثور على المنتج بعد التحديث: ${id}`);
    }
    
    // استعلام اضافي للحصول على بيانات الفئات بعد التحديث
    const { data: productWithRelations, error: fetchError } = await supabase
      .from('products')
      .select(`
        *,
        category:category_id(id, name, slug),
        subcategory:subcategory_id(id, name, slug)
      `)
      .eq('id', id)
      .single();
    
    if (fetchError) {
      // إرجاع البيانات من الوظيفة الأولى على الأقل
      const product = updatedProduct[0];
      
      return product;
    }

    return productWithRelations;
  } catch (error) {
    throw error;
  }
};
