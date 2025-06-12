// هذا الملف يحتوي على تحديث لوظيفة updateProduct
// تاريخ: 2024-11-08

// استبدل محتوى وظيفة updateProduct في ملف /src/lib/api/products.ts بهذا المحتوى:

export const updateProduct = async (id: string, updates: UpdateProduct): Promise<Product> => {
  try {

    // استخدام وظيفة RPC المخصصة لتحديث المنتج وإرجاع البيانات المحدثة مع العلاقات
    const { data, error } = await supabase
      .rpc('update_product_and_return_full', {
        product_id: id,
        product_updates: updates
      });
    
    if (error) {
      throw error;
    }
    
    if (!data) {
      throw new Error(`لم يتم العثور على المنتج بعد التحديث: ${id}`);
    }
    
    // تحويل البيانات إلى نموذج المنتج
    const product = data as unknown as Product;

    return product;
  } catch (error) {
    throw error;
  }
};
