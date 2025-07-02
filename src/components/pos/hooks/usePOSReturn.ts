import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Product, Order, User as AppUser } from '@/types';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

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
    
    if (!currentUser) {
      toast.error('يجب تسجيل الدخول لإجراء عملية الإرجاع');
      return Promise.reject('No user logged in');
    }

    if (returnItems.length === 0) {
      toast.error("لا توجد منتجات للإرجاع");
      return Promise.reject('No items to return');
    }

    // حساب المبلغ الأصلي
    const originalAmount = returnItems.reduce((sum, item) => {
      const itemPrice = item.variantPrice || item.product.price;
      return sum + (itemPrice * item.quantity);
    }, 0);
    
    // استخدام المبلغ المعدل من PaymentDialog إذا كان متوفراً، وإلا استخدم المبلغ الأصلي
    const returnAmount = orderDetails?.total || originalAmount;
    
    // إنشاء معرف UUID صحيح وأرقام الإرجاع
    const returnId = uuidv4();
    const returnNumber = `RET-DIRECT-${Date.now()}`;
    
    try {
      // إنشاء بيانات طلب الإرجاع
      const returnData = {
        id: returnId,
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

      // تحديث المخزون للمنتجات المرجعة بشكل متوازي
      const stockUpdatePromises = returnItems.map(async (item) => {
        // تحديث المخزون الأساسي للمنتج
        const { data: currentProduct } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', item.product.id)
          .single();

        if (currentProduct) {
          const newStockQuantity = (currentProduct.stock_quantity || 0) + item.quantity;
          
          // تحديث المخزون
          const { error: updateError } = await supabase
            .from('products')
            .update({ 
              stock_quantity: newStockQuantity 
            })
            .eq('id', item.product.id);
            
          if (updateError) {
            throw updateError;
          }

          // تسجيل عملية الإرجاع في inventory_log مع UUID صحيح
          const { error: logError } = await supabase
            .from('inventory_log')
            .insert({
              product_id: item.product.id,
              quantity: item.quantity,
              previous_stock: currentProduct.stock_quantity,
              new_stock: newStockQuantity,
              type: 'return',
              reference_type: 'pos_return',
              reference_id: returnId, // استخدام UUID صحيح
              notes: `إرجاع مباشر من نقطة البيع - ${item.product.name}${item.colorName ? ` (${item.colorName})` : ''}${item.sizeName ? ` (${item.sizeName})` : ''}`,
              created_by: currentUser.id,
              organization_id: currentOrganizationId
            });
          
          if (logError) {
            console.error(`❌ [RETURN] خطأ في تسجيل inventory_log:`, logError);
          }

          // تحديث مخزون المتغيرات إذا كانت موجودة
          if (item.colorId && item.sizeId) {
            const { data: currentSize } = await supabase
              .from('product_sizes')
              .select('quantity')
              .eq('color_id', item.colorId)
              .eq('id', item.sizeId)
              .single();

            if (currentSize) {
              const newSizeQuantity = (currentSize.quantity || 0) + item.quantity;
              
              await supabase
                .from('product_sizes')
                .update({ 
                  quantity: newSizeQuantity 
                })
                .eq('color_id', item.colorId)
                .eq('id', item.sizeId);
            }
          } else if (item.colorId) {
            const { data: currentColor } = await supabase
              .from('product_colors')
              .select('quantity')
              .eq('product_id', item.product.id)
              .eq('id', item.colorId)
              .single();

            if (currentColor) {
              const newColorQuantity = (currentColor.quantity || 0) + item.quantity;
              
              await supabase
                .from('product_colors')
                .update({ 
                  quantity: newColorQuantity 
                })
                .eq('product_id', item.product.id)
                .eq('id', item.colorId);
            }
          }

          // تحديث cache محلياً - إضافة للمخزون في وضع الإرجاع
          updateProductStockInCache(
            item.product.id,
            item.colorId || null,
            item.sizeId || null,
            item.quantity // إضافة للمخزون (قيمة موجبة)
          );
        }
      });

      // تنفيذ جميع التحديثات بشكل متوازي
      await Promise.all(stockUpdatePromises);

      toast.success(`تم إنشاء إرجاع مباشر رقم ${returnNumber} بنجاح`);
      clearReturnCart();
      setIsReturnMode(false);
      
      // تحديث البيانات
      if (refreshPOSData) {
        await refreshPOSData();
      }
      
      return {
        orderId: returnId,
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
