import { supabase } from '@/lib/supabase';

export interface VariantPurchaseItem {
  product_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  color_id?: string;
  size_id?: string;
  variant_type: 'simple' | 'color_only' | 'size_only' | 'color_size';
  variant_display_name?: string;
}

export interface PurchaseWithVariants {
  purchase: any;
  items: VariantPurchaseItem[];
  item_variants: Record<number, any[]>;
}

/**
 * حفظ مشتريات مع دعم المتغيرات
 */
export async function saveSupplierPurchaseWithVariants(data: PurchaseWithVariants) {
  try {
    const { purchase, items, item_variants } = data;
    
    // 1. حفظ الشراء الأساسي
    const { data: savedPurchase, error: purchaseError } = await supabase
      .from('supplier_purchases')
      .insert([purchase])
      .select()
      .single();

    if (purchaseError) throw purchaseError;

    // 2. معالجة العناصر والمتغيرات
    const purchaseItems = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const variants = item_variants[i] || [];
      
      if (variants.length > 0) {
        // منتج له متغيرات - إنشاء عنصر منفصل لكل متغير
        for (const variant of variants) {
          purchaseItems.push({
            purchase_id: savedPurchase.id,
            product_id: item.product_id,
            description: variant.display_name,
            quantity: variant.quantity,
            unit_price: variant.unit_price,
            tax_rate: item.tax_rate,
            color_id: variant.color_id,
            size_id: variant.size_id,
            variant_type: variant.variant_type,
            variant_display_name: variant.display_name,
            organization_id: purchase.organization_id
          });
        }
      } else {
        // منتج بسيط بدون متغيرات
        purchaseItems.push({
          purchase_id: savedPurchase.id,
          product_id: item.product_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          variant_type: 'simple',
          organization_id: purchase.organization_id
        });
      }
    }

    // 3. حفظ عناصر الشراء
    const { data: savedItems, error: itemsError } = await supabase
      .from('supplier_purchase_items')
      .insert(purchaseItems)
      .select();

    if (itemsError) throw itemsError;

    return {
      purchase: savedPurchase,
      items: savedItems
    };

  } catch (error) {
    console.error('Error saving purchase with variants:', error);
    throw error;
  }
}

/**
 * تحديث مشتريات مع دعم المتغيرات
 */
export async function updateSupplierPurchaseWithVariants(
  purchaseId: string, 
  data: PurchaseWithVariants
) {
  try {
    const { purchase, items, item_variants } = data;
    
    // 1. تحديث الشراء الأساسي
    const { data: updatedPurchase, error: purchaseError } = await supabase
      .from('supplier_purchases')
      .update(purchase)
      .eq('id', purchaseId)
      .select()
      .single();

    if (purchaseError) throw purchaseError;

    // 2. حذف العناصر القديمة
    const { error: deleteError } = await supabase
      .from('supplier_purchase_items')
      .delete()
      .eq('purchase_id', purchaseId);

    if (deleteError) throw deleteError;

    // 3. إعادة إنشاء العناصر الجديدة
    const purchaseItems = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const variants = item_variants[i] || [];
      
      if (variants.length > 0) {
        for (const variant of variants) {
          purchaseItems.push({
            purchase_id: purchaseId,
            product_id: item.product_id,
            description: variant.display_name,
            quantity: variant.quantity,
            unit_price: variant.unit_price,
            tax_rate: item.tax_rate,
            color_id: variant.color_id,
            size_id: variant.size_id,
            variant_type: variant.variant_type,
            variant_display_name: variant.display_name,
            organization_id: purchase.organization_id
          });
        }
      } else {
        purchaseItems.push({
          purchase_id: purchaseId,
          product_id: item.product_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          variant_type: 'simple',
          organization_id: purchase.organization_id
        });
      }
    }

    const { data: savedItems, error: itemsError } = await supabase
      .from('supplier_purchase_items')
      .insert(purchaseItems)
      .select();

    if (itemsError) throw itemsError;

    return {
      purchase: updatedPurchase,
      items: savedItems
    };

  } catch (error) {
    console.error('Error updating purchase with variants:', error);
    throw error;
  }
}

/**
 * جلب تفاصيل المشتريات مع المتغيرات
 */
export async function getSupplierPurchaseWithVariants(purchaseId: string) {
  try {
    // جلب الشراء الأساسي
    const { data: purchase, error: purchaseError } = await supabase
      .from('supplier_purchases')
      .select('*')
      .eq('id', purchaseId)
      .single();

    if (purchaseError) throw purchaseError;

    // جلب العناصر مع تفاصيل المتغيرات
    const { data: items, error: itemsError } = await supabase
      .from('supplier_purchase_items')
      .select(`
        *,
        product:products(*),
        color:product_colors(id, name, color_code),
        size:product_sizes(id, size_name)
      `)
      .eq('purchase_id', purchaseId);

    if (itemsError) throw itemsError;

    return {
      purchase,
      items: items || []
    };

  } catch (error) {
    console.error('Error fetching purchase with variants:', error);
    throw error;
  }
}

/**
 * جلب ملخص المتغيرات للمنتج
 */
export async function getProductVariantsSummary(productId: string) {
  try {
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError) throw productError;

    if (!product.has_variants) {
      return {
        product,
        variants: [],
        total_stock: product.stock_quantity || 0
      };
    }

    // جلب الألوان والمقاسات
    const { data: colors, error: colorsError } = await supabase
      .from('product_colors')
      .select('*')
      .eq('product_id', productId);

    const { data: sizes, error: sizesError } = await supabase
      .from('product_sizes')
      .select('*')
      .eq('product_id', productId);

    if (colorsError || sizesError) {
      throw colorsError || sizesError;
    }

    // تكوين المتغيرات
    const variants = [];
    const totalStock = (colors || []).reduce((sum, color) => sum + color.quantity, 0) +
                      (sizes || []).reduce((sum, size) => sum + size.quantity, 0);

    return {
      product,
      colors: colors || [],
      sizes: sizes || [],
      variants,
      total_stock: totalStock
    };

  } catch (error) {
    console.error('Error fetching product variants summary:', error);
    throw error;
  }
} 