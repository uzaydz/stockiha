import { supabase } from '@/lib/supabase';
import { Product } from '../../types';
import { mapSupabaseProductToProduct } from './mappers';

// وظيفة لإضافة منتج جديد
export const addProduct = async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .insert({
        ...product,
        created_at: new Date(),
        updated_at: new Date()
      })
      .select()
      .single();
      
    if (error) {
      console.error('Error adding product:', error);
      throw error;
    }
    
    return mapSupabaseProductToProduct(data);
  } catch (error) {
    console.error('Error adding product:', error);
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
      updated_at: new Date()
    };

    // تحديث المنتج في قاعدة البيانات
    const { error } = await supabase
      .from('products')
      .update(dbProduct)
      .eq('id', product.id);
      
    if (error) {
      console.error('Error updating product:', error);
      throw error;
    }
    
    // Ensure both properties are in sync
    const updatedProduct = {
      ...product, 
      stock_quantity: product.stockQuantity || product.stock_quantity,
      stockQuantity: product.stockQuantity || product.stock_quantity,
      updatedAt: new Date()
    };
    
    return updatedProduct;
  } catch (error) {
    console.error('Error updating product:', error);
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
      console.error('Error deleting product:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting product:', error);
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
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, name, stock, last_updated')
        .eq('id', productId)
        .single();
        
      if (productError) {
        console.error(`Error getting product info for ${productName}:`, productError);
        continue;
      }
      
      if (!product) {
        console.error(`Product not found: ${productName} (${productId})`);
        continue;
      }
      
      
      
      // حساب المخزون الجديد
      const newStock = (product.stock || 0) - quantity;
      
      
      try {
        // إضافة سجل في جدول inventory_log
        const inventoryLogEntry = {
          product_id: productId,
          previous_stock: product.stock || 0,
          new_stock: newStock,
          change_amount: -quantity,
          change_type: 'sale',
          notes: `Order item sale`,
          slug: `inv-log-${Date.now()}-${Math.floor(Math.random() * 10000)}`
        };
        
        const { error: logError } = await supabase
          .from('inventory_log')
          .insert(inventoryLogEntry);
          
        if (logError) {
          console.error(`Error adding inventory log for ${productName}:`, logError);
        }
        
        // تحديث المخزون في جدول المنتجات
        const { error: updateError } = await supabase
          .from('products')
          .update({
            stock: newStock,
            last_updated: new Date().toISOString()
          })
          .eq('id', productId)
          .eq('organization_id', currentOrganizationId);
          
        if (updateError) {
          console.error(`Error updating inventory for product ${productId}:`, updateError);
        } else {
          
        }
      } catch (error) {
        console.error(`Error in inventory update process for ${productName}:`, error);
      }
    } catch (error) {
      console.error(`Error processing inventory update for ${productName}:`, error);
    }
  }
  
  
}; 