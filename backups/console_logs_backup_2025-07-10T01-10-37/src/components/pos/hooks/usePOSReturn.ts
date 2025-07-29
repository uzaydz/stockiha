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
    
    if (!currentUser) {
      toast.error('يجب تسجيل الدخول لإجراء عملية الإرجاع');
      return Promise.reject('No user logged in');
    }

    if (returnItems.length === 0) {
      toast.error("لا توجد منتجات للإرجاع");
      return Promise.reject('No items to return');
    }

    try {
      // إعداد بيانات العناصر للدالة RPC
      const itemsData = returnItems.map(item => ({
        product_id: item.product.id,
        product_name: item.product.name,
        product_sku: item.product.sku || '',
        unit_price: item.variantPrice || item.product.price,
        quantity: item.quantity,
        color_id: item.colorId || null,
        color_name: item.colorName || null,
        size_id: item.sizeId || null,
        size_name: item.sizeName || null
      }));

      // استدعاء دالة RPC المحسنة
      const { data, error } = await supabase.rpc('create_pos_direct_return', {
        p_organization_id: currentOrganizationId,
        p_created_by: currentUser.id,
        p_customer_name: (orderDetails as any)?.customer_name || 'زائر',
        p_return_reason: returnReason || 'customer_request',
        p_return_notes: returnNotes || null,
        p_refund_method: orderDetails?.paymentMethod || 'cash',
        p_items: itemsData
      });

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('لم يتم إرجاع بيانات من الخادم');
      }

      const result = data[0];
      
      if (!result.success) {
        throw new Error(result.error || 'فشل في معالجة الإرجاع');
      }

      // تحديث cache محلياً للمنتجات المرجعة
      returnItems.forEach(item => {
        updateProductStockInCache(
          item.product.id,
          item.colorId || null,
          item.sizeId || null,
          item.quantity // إضافة للمخزون (قيمة موجبة)
        );
      });

      toast.success(result.message || `تم إنشاء إرجاع مباشر بنجاح`);
      clearReturnCart();
      setIsReturnMode(false);
      
      // تحديث البيانات
      if (refreshPOSData) {
        await refreshPOSData();
      }
      
      return {
        orderId: result.return_id,
        customerOrderNumber: parseInt(result.return_number?.replace(/[^\d]/g, '')) || 0
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
