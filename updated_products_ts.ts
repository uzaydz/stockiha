// هذا الملف يحتوي على الحل النهائي لوظيفة updateProduct
// تاريخ: 2024-11-08

// استبدل محتوى وظيفة updateProduct في ملف /src/lib/api/products.ts بهذا المحتوى:

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
    
    
    return updatedProduct;
  } catch (error) {
    console.error(`خطأ عام في تحديث المنتج ${id}:`, error);
    throw error;
  }
}; 