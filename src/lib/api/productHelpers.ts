import { supabase } from '@/lib/supabase';
import { InsertProductImage } from '@/types/product';

/**
 * وظيفة مساعدة لمزامنة الصور الإضافية بين جدول المنتجات وجدول product_images
 * تضمن هذه الوظيفة أن جميع الصور الإضافية في حقل images في جدول المنتجات موجودة أيضًا في جدول product_images
 */
export const syncProductImages = async (productId: string): Promise<boolean> => {
  try {
    // 1. الحصول على المنتج وصوره الحالية
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, thumbnail_image, images')
      .eq('id', productId)
      .single();
    
    if (productError) {
      console.error('Error fetching product data for image sync:', productError);
      return false;
    }

    // 2. الحصول على صور المنتج من جدول product_images
    const { data: existingImages, error: imagesError } = await supabase
      .from('product_images')
      .select('id, image_url, sort_order')
      .eq('product_id', productId);
    
    if (imagesError) {
      console.error('Error fetching existing product images:', imagesError);
      return false;
    }

    const existingImageUrls = existingImages?.map(img => img.image_url) || [];
    
    // 3. تصفية الصور الإضافية (استبعاد الصورة الرئيسية)
    const additionalImages = Array.isArray(product?.images) 
      ? product.images.filter(img => img !== product.thumbnail_image)
      : [];
    
    
    
    // 4. إضافة الصور الموجودة في مصفوفة images ولكنها غير موجودة في جدول product_images
    let addedCount = 0;
    for (let i = 0; i < additionalImages.length; i++) {
      const imageUrl = additionalImages[i];
      if (!existingImageUrls.includes(imageUrl)) {
        
        
        const { data, error } = await supabase
          .from('product_images')
          .insert({
            product_id: productId,
            image_url: imageUrl,
            sort_order: i
          });
        
        if (error) {
          console.error(`[syncProductImages] Error adding image to product_images:`, error);
        } else {
          addedCount++;
        }
      }
    }
    
    
    
    return true;
  } catch (error) {
    console.error('[syncProductImages] Unexpected error while syncing product images:', error);
    return false;
  }
};

/**
 * وظيفة مساعدة لنقل الصور الإضافية من مصفوفة images إلى جدول product_images
 * يمكن استخدام هذه الوظيفة لترحيل البيانات الموجودة
 */
export const migrateProductImages = async (): Promise<{ success: boolean, migratedProducts: number, totalImages: number }> => {
  try {
    // الحصول على المنتجات التي تحتوي على أكثر من صورة واحدة
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, thumbnail_image, images')
      .filter('images', 'gte', '{,}'); // مصفوفة تحتوي على أكثر من عنصر واحد
    
    if (productsError) {
      console.error('Error fetching products for migration:', productsError);
      return { success: false, migratedProducts: 0, totalImages: 0 };
    }
    
    if (!products || products.length === 0) {
      
      return { success: true, migratedProducts: 0, totalImages: 0 };
    }
    
    
    
    let migratedProducts = 0;
    let totalImages = 0;
    
    // مرور على كل منتج ومزامنة صوره
    for (const product of products) {
      const result = await syncProductImages(product.id);
      if (result) {
        migratedProducts++;
        // حساب عدد الصور الإضافية (غير الصورة الرئيسية)
        const additionalImages = Array.isArray(product.images) 
          ? product.images.filter(img => img !== product.thumbnail_image).length
          : 0;
        totalImages += additionalImages;
      }
    }
    
    return { success: true, migratedProducts, totalImages };
  } catch (error) {
    console.error('Unexpected error during product images migration:', error);
    return { success: false, migratedProducts: 0, totalImages: 0 };
  }
}; 