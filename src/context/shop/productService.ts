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
    
    return mapSupabaseProductToProduct(data);
  } catch (error) {
    throw error;
  }
};

// وظيفة لتحديث منتج
export const updateProduct = async (product: Product) => {
  try {
    // Create a database version of the product
    const dbProduct = {
      ...product,
      stock_quantity: product.stockQuantity || product.stock_quantity,
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
    
    // Ensure both properties are in sync
    const updatedProduct = {
      ...product, 
      stock_quantity: product.stockQuantity || product.stock_quantity,
      stockQuantity: product.stockQuantity || product.stock_quantity,
      updatedAt: new Date().toISOString()
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
