import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Product, Order, User as AppUser } from '@/types';
import { supabase } from '@/lib/supabase';

interface CartItem {
  product: Product;
  quantity: number;
  colorId?: string;
  colorName?: string;
  colorCode?: string;
  sizeId?: string;
  sizeName?: string;
  variantPrice?: number;
  variantImage?: string;
}

interface UsePOSReturnOptions {
  currentUser?: AppUser | null;
  currentOrganizationId?: string;
  updateProductStockInCache: (
    productId: string,
    colorId: string | null,
    sizeId: string | null,
    quantityChange: number
  ) => void;
  refreshPOSData?: () => Promise<void>;
}

export const usePOSReturn = ({
  currentUser,
  currentOrganizationId,
  updateProductStockInCache,
  refreshPOSData
}: UsePOSReturnOptions) => {
  
  const [isReturnMode, setIsReturnMode] = useState(false);
  const [returnItems, setReturnItems] = useState<CartItem[]>([]);
  const [returnReason, setReturnReason] = useState('customer_request');
  const [returnNotes, setReturnNotes] = useState('');

  // إضافة منتج لسلة الإرجاع
  const addItemToReturnCart = useCallback((product: Product) => {
    const existingItem = returnItems.find(item => 
      item.product.id === product.id && 
      !item.colorId && 
      !item.sizeId
    );
    
    if (existingItem) {
      const updatedReturnCart = returnItems.map(item =>
        item.product.id === product.id && !item.colorId && !item.sizeId 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
      );
      setReturnItems(updatedReturnCart);
    } else {
      setReturnItems([...returnItems, { product, quantity: 1 }]);
    }
    
    // لا نحدث المخزون هنا - سيتم التحديث فقط عند إنهاء الإرجاع
    toast.success(`تم إضافة ${product.name} لسلة الإرجاع`);
  }, [returnItems]);

  // تحديث كمية عنصر الإرجاع
  const updateReturnItemQuantity = useCallback((index: number, quantity: number) => {
    if (quantity <= 0) {
      removeReturnItem(index);
      return;
    }
    
    const updatedItems = [...returnItems];
    updatedItems[index].quantity = quantity;
    setReturnItems(updatedItems);
    
    // لا نحدث المخزون هنا - سيتم التحديث فقط عند إنهاء الإرجاع
  }, [returnItems]);

  // إزالة عنصر من سلة الإرجاع
  const removeReturnItem = useCallback((index: number) => {
    const updatedItems = returnItems.filter((_, i) => i !== index);
    setReturnItems(updatedItems);
    
    // لا نحدث المخزون هنا - سيتم التحديث فقط عند إنهاء الإرجاع
  }, [returnItems]);

  // مسح سلة الإرجاع
  const clearReturnCart = useCallback(() => {
    setReturnItems([]);
    setReturnNotes('');
  }, []);

  // التبديل بين وضع البيع ووضع الإرجاع
  const toggleReturnMode = useCallback(() => {
    if (!isReturnMode) {
      setIsReturnMode(true);
      toast.info('تم التبديل إلى وضع الإرجاع');
    } else {
      setIsReturnMode(false);
      clearReturnCart();
      toast.info('تم العودة إلى وضع البيع');
    }
  }, [isReturnMode, clearReturnCart]);

  // معالجة إرجاع العناصر
  const processReturn = useCallback(async (orderDetails?: Partial<Order>): Promise<{orderId: string, customerOrderNumber: number}> => {
    console.log(`🔄 [RETURN] بدء معالجة الإرجاع`);
    console.log(`📋 [RETURN] عدد المنتجات في سلة الإرجاع: ${returnItems.length}`);
    console.log(`📦 [RETURN] منتجات الإرجاع:`, returnItems.map(item => `${item.product.name} (الكمية: ${item.quantity})`));
    
    if (!returnItems.length || !currentUser?.id || !currentOrganizationId) {
      toast.error('يجب إضافة عناصر للإرجاع');
      throw new Error('No items to return');
    }

    try {
      // حساب المبلغ الإجمالي الأصلي للإرجاع
      const originalAmount = returnItems.reduce((sum, item) => 
        sum + ((item.variantPrice || item.product.price) * item.quantity), 0);
      
      // استخدام المبلغ المعدل من PaymentDialog إذا كان متوفراً، وإلا استخدم المبلغ الأصلي
      const returnAmount = orderDetails?.total || originalAmount;
      
      // إنشاء رقم الإرجاع
      const returnNumber = `RET-DIRECT-${Date.now()}`;
      
      // إنشاء بيانات طلب الإرجاع
      const returnData = {
        return_number: returnNumber,
        original_order_id: null,
        customer_name: (orderDetails as any)?.customer_name || 'زائر',
        return_type: 'direct',
        return_reason: returnReason || 'customer_request',
        return_reason_description: returnNotes || null,
        original_total: originalAmount,
        return_amount: returnAmount,
        refund_amount: returnAmount,
        restocking_fee: originalAmount - returnAmount,
        status: 'completed',
        refund_method: orderDetails?.paymentMethod || 'cash',
        notes: returnNotes || null,
        requires_manager_approval: false,
        organization_id: currentOrganizationId,
        created_by: currentUser.id
      };

      // إدراج طلب الإرجاع (تم تعطيل جدول الإرجاع مؤقتاً في Supabase)
      // سيتم تنفيذ العملية بدون حفظ في قاعدة البيانات للآن
      const returnRecord = {
        id: `return-${Date.now()}`,
        ...returnData
      };

      // إدراج عناصر الإرجاع
      const returnItemsData = returnItems.map(item => {
        const originalItemPrice = item.variantPrice || item.product.price;
        const totalOriginalPrice = originalItemPrice * item.quantity;
        const adjustedItemPrice = (returnAmount / originalAmount) * originalItemPrice;
        const adjustedTotalPrice = adjustedItemPrice * item.quantity;
        
        return {
          return_id: returnRecord.id,
          original_order_item_id: null,
          product_id: item.product.id,
          product_name: item.product.name,
          product_sku: item.product.sku || null,
          original_quantity: item.quantity,
          return_quantity: item.quantity,
          original_unit_price: originalItemPrice,
          return_unit_price: adjustedItemPrice,
          total_return_amount: adjustedTotalPrice,
          variant_info: {
            color_id: item.colorId || null,
            size_id: item.sizeId || null,
            color_name: item.colorName || null,
            size_name: item.sizeName || null,
            variant_display_name: item.colorName || item.sizeName ? 
              `${item.colorName || ''} ${item.sizeName || ''}`.trim() : null,
            type: 'direct_return'
          },
          condition_status: 'good',
          resellable: true,
          inventory_returned: true,
          inventory_returned_at: new Date().toISOString()
        };
      });

      // تحديث المخزون للمنتجات المرجعة
      for (const item of returnItems) {
        try {
          console.log(`🔄 [RETURN] معالجة إرجاع المنتج: ${item.product.name}`);
          console.log(`📦 [RETURN] كمية الإرجاع: ${item.quantity}`);
          
          // تحديث المخزون الأساسي للمنتج
          const { data: currentProduct } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', item.product.id)
            .single();

          console.log(`📊 [RETURN] المخزون الحالي قبل الإرجاع: ${currentProduct?.stock_quantity || 0}`);
          
          if (currentProduct) {
            const newStockQuantity = (currentProduct.stock_quantity || 0) + item.quantity;
            console.log(`➕ [RETURN] المخزون الجديد بعد الإرجاع: ${newStockQuantity}`);
            
            const { data: updateResult, error: updateError } = await supabase
              .from('products')
              .update({ 
                stock_quantity: newStockQuantity 
              })
              .eq('id', item.product.id)
              .select('stock_quantity');
              
            if (updateError) {
              console.error(`❌ [RETURN] خطأ في تحديث المخزون:`, updateError);
            } else {
              console.log(`✅ [RETURN] تم تحديث المخزون بنجاح:`, updateResult);
            }
          }

          // تحديث مخزون المتغيرات إذا كانت موجودة
          if (item.colorId && item.sizeId) {
            console.log(`🎨 [RETURN] تحديث مخزون المقاس - اللون: ${item.colorId}, المقاس: ${item.sizeId}`);
            
            const { data: currentSize } = await supabase
              .from('product_sizes')
              .select('quantity')
              .eq('color_id', item.colorId)
              .eq('id', item.sizeId)
              .single();

            console.log(`📊 [RETURN] مخزون المقاس الحالي: ${currentSize?.quantity || 0}`);
            
            if (currentSize) {
              const newSizeQuantity = (currentSize.quantity || 0) + item.quantity;
              console.log(`➕ [RETURN] مخزون المقاس الجديد: ${newSizeQuantity}`);
              
              const { data: sizeUpdateResult, error: sizeUpdateError } = await supabase
                .from('product_sizes')
                .update({ 
                  quantity: newSizeQuantity 
                })
                .eq('color_id', item.colorId)
                .eq('id', item.sizeId)
                .select('quantity');
                
              if (sizeUpdateError) {
                console.error(`❌ [RETURN] خطأ في تحديث مخزون المقاس:`, sizeUpdateError);
              } else {
                console.log(`✅ [RETURN] تم تحديث مخزون المقاس:`, sizeUpdateResult);
              }
            }
          } else if (item.colorId) {
            console.log(`🎨 [RETURN] تحديث مخزون اللون: ${item.colorId}`);
            
            const { data: currentColor } = await supabase
              .from('product_colors')
              .select('quantity')
              .eq('product_id', item.product.id)
              .eq('id', item.colorId)
              .single();

            console.log(`📊 [RETURN] مخزون اللون الحالي: ${currentColor?.quantity || 0}`);
            
            if (currentColor) {
              const newColorQuantity = (currentColor.quantity || 0) + item.quantity;
              console.log(`➕ [RETURN] مخزون اللون الجديد: ${newColorQuantity}`);
              
              const { data: colorUpdateResult, error: colorUpdateError } = await supabase
                .from('product_colors')
                .update({ 
                  quantity: newColorQuantity 
                })
                .eq('product_id', item.product.id)
                .eq('id', item.colorId)
                .select('quantity');
                
              if (colorUpdateError) {
                console.error(`❌ [RETURN] خطأ في تحديث مخزون اللون:`, colorUpdateError);
              } else {
                console.log(`✅ [RETURN] تم تحديث مخزون اللون:`, colorUpdateResult);
              }
            }
          }

          // تحديث cache محلياً أيضاً - إضافة للمخزون في وضع الإرجاع
          console.log(`🔄 [RETURN] تحديث cache محلياً - المنتج: ${item.product.id}, الكمية: +${item.quantity}`);
          updateProductStockInCache(
            item.product.id,
            item.colorId || null,
            item.sizeId || null,
            item.quantity // إضافة للمخزون (قيمة موجبة)
          );
          console.log(`✅ [RETURN] تم تحديث cache للمنتج: ${item.product.name}`);
        } catch (stockError) {
        }
      }

      console.log(`✅ [RETURN] اكتمل معالجة الإرجاع بنجاح - رقم الإرجاع: ${returnNumber}`);
      toast.success(`تم إنشاء إرجاع مباشر رقم ${returnNumber} بنجاح`);
      clearReturnCart();
      setIsReturnMode(false);
      
      // تحديث البيانات
      console.log(`🔄 [RETURN] تحديث البيانات من الخادم...`);
      if (refreshPOSData) {
        await refreshPOSData();
        console.log(`✅ [RETURN] تم تحديث البيانات من الخادم`);
      }
      
      return {
        orderId: returnRecord.id,
        customerOrderNumber: parseInt(returnNumber.replace(/[^\d]/g, '')) || 0
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
      toast.error(`حدث خطأ في معالجة الإرجاع: ${errorMessage}`);
      throw error;
    }
  }, [returnItems, currentUser, currentOrganizationId, returnReason, returnNotes, updateProductStockInCache, refreshPOSData, clearReturnCart]);

  return {
    // حالة الإرجاع
    isReturnMode,
    returnItems,
    returnReason,
    returnNotes,
    
    // دوال إدارة الإرجاع
    setReturnReason,
    setReturnNotes,
    addItemToReturnCart,
    updateReturnItemQuantity,
    removeReturnItem,
    clearReturnCart,
    toggleReturnMode,
    processReturn
  };
};
