// هذا الملف يحتوي على تحديث لوظيفة updateProduct
// تاريخ: 2024-11-08

// استبدل محتوى وظيفة updateProduct في ملف /src/lib/api/products.ts بهذا المحتوى:

export const updateProduct = async (id: string, updates: UpdateProduct): Promise<Product> => {
  try {
    console.log('تحديث المنتج بالبيانات:', updates);
    
    // استخدام وظيفة RPC المخصصة لتحديث المنتج وإرجاع البيانات المحدثة مع العلاقات
    const { data, error } = await supabase
      .rpc('update_product_and_return_full', {
        product_id: id,
        product_updates: updates
      });
    
    if (error) {
      console.error(`خطأ في تحديث المنتج ${id}:`, error);
      throw error;
    }
    
    if (!data) {
      throw new Error(`لم يتم العثور على المنتج بعد التحديث: ${id}`);
    }
    
    // تحويل البيانات إلى نموذج المنتج
    const product = data as unknown as Product;
    
    console.log(`تم تحديث المنتج ${id} بنجاح:`, product.name);
    return product;
  } catch (error) {
    console.error(`خطأ عام في تحديث المنتج ${id}:`, error);
    throw error;
  }
}; 