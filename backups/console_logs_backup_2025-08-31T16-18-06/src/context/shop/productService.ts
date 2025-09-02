import { supabase } from '@/lib/supabase';
import { Product } from '../../types';
import { mapSupabaseProductToProduct } from './mappers';

// وظيفة لإضافة منتج جديد
export const addProduct = async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { organizationId: string, isDigital?: boolean }) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .insert({
        ...product,
        is_digital: product.isDigital || false,
        organization_id: product.organizationId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) {
      throw error;
    }
    
    return await mapSupabaseProductToProduct(data);
  } catch (error) {
    throw error;
  }
};

// وظيفة لتحديث منتج
export const updateProduct = async (product: Product) => {
  try {
    // تحويل المنتج المحلي إلى تنسيق قاعدة البيانات
    const dbProduct = {
      name: product.name,
      description: product.description,
      price: product.price,
      compare_at_price: product.compareAtPrice || product.compare_at_price,
      sku: product.sku,
      barcode: product.barcode,
      category_id: product.category_id,
      subcategory: product.subcategory,
      subcategory_id: product.subcategory_id,
      brand: product.brand,
      images: product.images,
      thumbnail_image: product.thumbnailImage || product.thumbnail_image,
      stock_quantity: product.stockQuantity || product.stock_quantity,
      min_stock_level: product.min_stock_level,
      reorder_level: product.reorder_level,
      reorder_quantity: product.reorder_quantity,
      features: product.features,
      specifications: product.specifications,
      is_digital: product.isDigital,
      is_new: product.isNew,
      is_featured: product.isFeatured,
      wholesale_price: product.wholesale_price,
      partial_wholesale_price: product.partial_wholesale_price,
      min_wholesale_quantity: product.min_wholesale_quantity,
      min_partial_wholesale_quantity: product.min_partial_wholesale_quantity,
      allow_retail: product.allow_retail,
      allow_wholesale: product.allow_wholesale,
      allow_partial_wholesale: product.allow_partial_wholesale,
      purchase_price: product.purchase_price,
      slug: product.slug,
      show_price_on_landing: product.show_price_on_landing,
      last_inventory_update: product.last_inventory_update,
      is_active: product.is_active,
      has_fast_shipping: product.has_fast_shipping,
      has_money_back: product.has_money_back,
      has_quality_guarantee: product.has_quality_guarantee,
      fast_shipping_text: product.fast_shipping_text,
      money_back_text: product.money_back_text,
      quality_guarantee_text: product.quality_guarantee_text,
      is_sold_by_unit: product.is_sold_by_unit,
      unit_type: product.unit_type,
      use_variant_prices: product.use_variant_prices,
      unit_purchase_price: product.unit_purchase_price,
      unit_sale_price: product.unit_sale_price,
      shipping_clone_id: product.shipping_clone_id,
      name_for_shipping: product.name_for_shipping,
      use_shipping_clone: product.use_shipping_clone,
      shipping_method_type: product.shipping_method_type,
      has_variants: product.has_variants,
      use_sizes: product.use_sizes,
      // إضافة الحقول المفقودة من قاعدة البيانات
      organization_id: (product as any).organization_id || (product as any).organizationId,
      created_by_user_id: (product as any).created_by_user_id || (product as any).createdByUserId,
      updated_by_user_id: (product as any).updated_by_user_id || (product as any).updatedByUserId,
      purchase_page_config: (product as any).purchase_page_config || null,
      shipping_provider_id: (product as any).shipping_provider_id || null,
      updated_at: new Date().toISOString()
    };

    // تحديث المنتج في قاعدة البيانات
    const { error } = await supabase
      .from('products')
      .update(dbProduct)
      .eq('id', product.id);
      
    if (error) {
      throw error;
    }
    
    // إرجاع المنتج المحدث مع الحفاظ على التنسيق المحلي
    const updatedProduct = {
      ...product, 
      stock_quantity: product.stockQuantity || product.stock_quantity,
      stockQuantity: product.stockQuantity || product.stock_quantity,
      updatedAt: new Date()
    };
    
    return updatedProduct;
  } catch (error) {
    throw error;
  }
};

// وظيفة لحذف منتج
export const deleteProduct = async (productId: string) => {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);
      
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    throw error;
  }
};

// وظيفة لتحديث مخزون المنتجات بعد البيع
export const updateProductsInventory = async (orderItems: any[], currentOrganizationId: string | undefined) => {

  // استخراج معرفات المنتجات الفريدة
  const productIds = [...new Set(orderItems.map(item => item.productId))];

  for (const productId of productIds) {
    // حساب إجمالي الكمية المطلوبة لهذا المنتج
    const quantity = orderItems
      .filter(item => item.productId === productId)
      .reduce((sum, item) => sum + item.quantity, 0);
      
    const productName = orderItems.find(item => item.productId === productId)?.productName || 'Unknown Product';

    try {
      // الحصول على معلومات المخزون الحالية
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('id, name, stock_quantity, last_updated')
        .eq('id', productId)
        .single();
        
      if (productError) {
        continue;
      }
      
      if (!productData) {
        continue;
      }

      // حساب المخزون الجديد
      const newStock = ((productData as any).stock_quantity || 0) - quantity;

      try {
        // إضافة سجل في جدول inventory_log
        const inventoryLogEntry = {
          product_id: productId,
          previous_stock: ((productData as any).stock_quantity || 0),
          new_stock: newStock,
          quantity: -quantity,
          type: 'sale',
          notes: `Order item sale`,
          organization_id: currentOrganizationId,
        };
        
        const { error: logError } = await supabase
          .from('inventory_log')
          .insert(inventoryLogEntry);
          
        if (logError) {
        }
        
        // تحديث المخزون في جدول المنتجات
        const { error: updateError } = await supabase
          .from('products')
          .update({
            stock_quantity: newStock,
            last_updated: new Date().toISOString()
          })
          .eq('id', productId)
          .eq('organization_id', currentOrganizationId);
          
        if (updateError) {
        } else {
          
        }
      } catch (error) {
      }
    } catch (error) {
    }
  }

};
