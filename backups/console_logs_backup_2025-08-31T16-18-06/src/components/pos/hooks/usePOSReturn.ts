import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
  customPrice?: number; // إضافة حقل السعر المخصص
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
  
  // 🔍 إزالة console.log المتكرر لتجنب spam في console
  // سيتم عرض الرسالة فقط في حالة development وفي المرة الأولى فقط
  const initRef = useRef(false);
  if (!initRef.current && process.env.NODE_ENV === 'development') {
    initRef.current = true;
  }
  
  const [isReturnMode, setIsReturnMode] = useState(false);
  const [returnItems, setReturnItems] = useState<CartItem[]>(() => {
    // 🔧 استرجاع returnItems من localStorage لمنع فقدانها عند re-mount
    try {
      const saved = localStorage.getItem('pos_return_items');
      const parsed = saved ? JSON.parse(saved) : [];
      return parsed;
    } catch (error) {
      return [];
    }
  });
  const [returnReason, setReturnReason] = useState('customer_request');
  const [returnNotes, setReturnNotes] = useState('');

  // 🔍 تتبع تغيرات returnItems لمعرفة سبب عدم التحديث + حفظ في localStorage
  useEffect(() => {
    
    // حفظ في localStorage
    try {
      localStorage.setItem('pos_return_items', JSON.stringify(returnItems));
    } catch (error) {
    }
  }, [returnItems]);

  // تطبيق CSS class عند mount إذا كان الوضع مُفعل
  useEffect(() => {
    if (isReturnMode) {
      document.body.classList.add('return-mode');
    } else {
      document.body.classList.remove('return-mode');
    }
    
    // تنظيف عند unmount
    return () => {
      document.body.classList.remove('return-mode');
    };
  }, [isReturnMode]);

  // إضافة منتج لسلة الإرجاع - باستخدام functional update لتجنب stale closure
  const addItemToReturnCart = useCallback((product: Product) => {
    
    // استخدام functional update للحصول على أحدث قيمة
    setReturnItems(currentItems => {
      
      const existingItem = currentItems.find(item => 
        item.product.id === product.id && 
        !item.colorId && 
        !item.sizeId
      );
      
      if (existingItem) {
        const updatedItems = currentItems.map(item =>
          item.product.id === product.id && !item.colorId && !item.sizeId 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );

        return updatedItems;
      } else {
        const newItems = [...currentItems, { product, quantity: 1 }];

        return newItems;
      }
    });
    
    // لا نحدث المخزون هنا - سيتم التحديث فقط عند إنهاء الإرجاع
    toast.success(`تم إضافة ${product.name} لسلة الإرجاع`);
    
  }, []);

  // إضافة منتج مع متغيرات لسلة الإرجاع
  const addVariantToReturnCart = useCallback((
    product: Product,
    colorId?: string,
    sizeId?: string,
    variantPrice?: number,
    colorName?: string,
    colorCode?: string,
    sizeName?: string,
    variantImage?: string
  ) => {
    const variantName = `${product.name}${colorName ? ` - ${colorName}` : ''}${sizeName ? ` - ${sizeName}` : ''}`;
    
    // استخدام functional update لتجنب stale closure
    setReturnItems(currentItems => {
      // البحث عن نفس المتغير في سلة الإرجاع
      const existingItem = currentItems.find(item => 
        item.product.id === product.id && 
        item.colorId === colorId && 
        item.sizeId === sizeId
      );
      
      if (existingItem) {
        return currentItems.map(item =>
          item.product.id === product.id && item.colorId === colorId && item.sizeId === sizeId
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      } else {
        return [...currentItems, { 
          product, 
          quantity: 1,
          colorId,
          colorName,
          colorCode,
          sizeId,
          sizeName,
          variantPrice: variantPrice || product.price,
          variantImage
        }];
      }
    });
    
    // لا نحدث المخزون هنا - سيتم التحديث فقط عند إنهاء الإرجاع
    toast.success(`تم إضافة ${variantName} لسلة الإرجاع`);
  }, []);

  // تحديث كمية عنصر الإرجاع
  const updateReturnItemQuantity = useCallback((index: number, quantity: number) => {
    if (quantity <= 0) {
      setReturnItems(currentItems => currentItems.filter((_, i) => i !== index));
      return;
    }
    
    setReturnItems(currentItems => {
      const updatedItems = [...currentItems];
      updatedItems[index] = { ...updatedItems[index], quantity };
      return updatedItems;
    });
    
    // لا نحدث المخزون هنا - سيتم التحديث فقط عند إنهاء الإرجاع
  }, []);

  // تحديث سعر عنصر الإرجاع
  const updateReturnItemPrice = useCallback((index: number, price: number) => {
    if (price < 0) return;
    
    setReturnItems(currentItems => {
      const updatedItems = [...currentItems];
      updatedItems[index] = { 
        ...updatedItems[index], 
        variantPrice: price,
        customPrice: price 
      };
      return updatedItems;
    });
  }, []);

  // إزالة عنصر من سلة الإرجاع
  const removeReturnItem = useCallback((index: number) => {
    setReturnItems(currentItems => currentItems.filter((_, i) => i !== index));
    
    // لا نحدث المخزون هنا - سيتم التحديث فقط عند إنهاء الإرجاع
  }, []);

  // مسح سلة الإرجاع
  const clearReturnCart = useCallback(() => {
    setReturnItems([]);
    setReturnNotes('');
    // مسح localStorage أيضاً
    try {
      localStorage.removeItem('pos_return_items');
    } catch (error) {
    }
  }, []);

  // التبديل بين وضع البيع ووضع الإرجاع
  const toggleReturnMode = useCallback(() => {
    setIsReturnMode(currentMode => {
      if (!currentMode) {
        // تفعيل وضع الإرجاع
        document.body.classList.add('return-mode');
        toast.info('تم التبديل إلى وضع الإرجاع');
        return true;
      } else {
        // إلغاء وضع الإرجاع والعودة للبيع
        setReturnItems([]);
        setReturnNotes('');
        try {
          localStorage.removeItem('pos_return_items');
        } catch (error) {
        }
        
        document.body.classList.remove('return-mode');
        toast.info('تم العودة إلى وضع البيع');
        return false;
      }
    });
  }, []);

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
      const { data, error } = await (supabase as any).rpc('create_pos_direct_return', {
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

      if (!data || (Array.isArray(data) && data.length === 0)) {
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
    addVariantToReturnCart,
    updateReturnItemQuantity,
    updateReturnItemPrice, // إضافة الدالة الجديدة للواجهة
    removeReturnItem,
    clearReturnCart,
    toggleReturnMode,
    processReturn
  };
};
