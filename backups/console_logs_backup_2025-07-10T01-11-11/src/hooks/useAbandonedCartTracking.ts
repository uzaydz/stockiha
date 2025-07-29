import { useRef, useEffect, useCallback, useState } from "react";
import { debounce } from "lodash-es";
import { abandonedCartProcessor, type AbandonedCartData } from "@/lib/abandoned-cart-processor";
import { useProductPage } from "@/context/ProductPageContext";

// استخدام AbandonedCartData من المعالج

export interface UseAbandonedCartTrackingOptions {
  productId?: string;
  productColorId?: string;
  productSizeId?: string;
  quantity?: number;
  subtotal?: number;
  deliveryFee?: number;
  discountAmount?: number;
  organizationId?: string;
  enabled?: boolean;
  saveInterval?: number; // بالثواني، افتراضي 3 ثوان
  minPhoneLength?: number; // الحد الأدنى لطول رقم الهاتف، افتراضي 8
}

export interface AbandonedCartActions {
  saveCart: (formData: Record<string, any>) => Promise<void>;
  debouncedSave: (formData: Record<string, any>) => void;
  clearCart: () => Promise<void>;
  updateCartItem: (updates: Partial<AbandonedCartData>) => void;
  markAsConverted: (orderId: string) => Promise<void>;
}

export const useAbandonedCartTracking = (
  options: UseAbandonedCartTrackingOptions = {}
): [boolean, AbandonedCartActions] => {
  const {
    productId,
    productColorId,
    productSizeId,
    quantity = 1,
    subtotal = 0,
    deliveryFee = 0,
    discountAmount = 0,
    organizationId,
    enabled = true,
    saveInterval = 3,
    minPhoneLength = 8
  } = options;

  const { organization } = useProductPage();
  const effectiveOrgId = organizationId || organization?.id;

  // حالة التتبع
  const [isSaving, setIsSaving] = useState(false);
  const lastSavedDataRef = useRef<string>("");
  const cartIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string>("");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // إنشاء session ID فريد للجلسة
  useEffect(() => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }, []);

  // دالة حفظ الطلب المتروك المحسّنة
  const saveAbandonedCart = useCallback(async (formData: Record<string, any>) => {
    if (!enabled || !effectiveOrgId || !formData.phone || formData.phone.length < minPhoneLength) {
      return;
    }

    // حساب المبلغ الإجمالي
    const totalAmount = subtotal - (discountAmount || 0) + deliveryFee;

    // إعداد بيانات الطلب المتروك للإدراج في قاعدة البيانات
    const cartDataForDB = {
      organization_id: effectiveOrgId,
      product_id: productId || null,
      product_color_id: productColorId || null,
      product_size_id: productSizeId || null,
      quantity,
      customer_name: formData.fullName || formData.customer_name || formData.name || null,
      customer_phone: formData.phone || formData.customer_phone, // مطلوب
      customer_email: formData.email || formData.customer_email || null,
      province: formData.province || null,
      municipality: formData.municipality || null,
      address: formData.address || null,
      delivery_option: formData.deliveryOption || formData.delivery_option || null,
      payment_method: formData.paymentMethod || formData.payment_method || null,
      notes: formData.notes || null,
      custom_fields_data: formData.customFields || formData.custom_fields_data || null,
      calculated_delivery_fee: deliveryFee || null,
      subtotal: subtotal || null,
      discount_amount: discountAmount || null,
      total_amount: totalAmount || null,
      source: 'product_page_v3'
    };

    // التحقق من تغيير البيانات المهمة فقط (تجاهل الحقول الثانوية)
    const importantFields = {
      customer_phone: cartDataForDB.customer_phone,
      customer_name: cartDataForDB.customer_name,
      quantity: cartDataForDB.quantity,
      total_amount: cartDataForDB.total_amount,
      product_id: cartDataForDB.product_id
    };
    
    const dataString = JSON.stringify(importantFields);
    if (dataString === lastSavedDataRef.current) {
      return;
    }

    try {
      setIsSaving(true);

      // استخدام المعالج الجديد لحفظ الطلب المتروك
      const result = await abandonedCartProcessor.saveAbandonedCart(cartDataForDB);
      
      if (result.success && result.cartId) {
        cartIdRef.current = result.cartId;
        lastSavedDataRef.current = dataString;
      } else {
        throw new Error(result.error || 'فشل في حفظ الطلب المتروك');
      }
      
      // تسجيل النشاط للتحليلات

    } catch (error) {
    } finally {
      setIsSaving(false);
    }
  }, [
    enabled,
    effectiveOrgId,
    productId,
    productColorId,
    productSizeId,
    quantity,
    subtotal,
    deliveryFee,
    discountAmount,
    minPhoneLength
  ]);

  // دالة حفظ مع debounce محسّنة
  const debouncedSave = useCallback(
    debounce(saveAbandonedCart, saveInterval * 1000, {
      leading: false,   // لا تحفظ في البداية
      trailing: true,   // احفظ في النهاية
      maxWait: 10000    // حد أقصى 10 ثواني انتظار
    }),
    [saveAbandonedCart, saveInterval]
  );

  // دالة حفظ فورية
  const saveCart = useCallback(async (formData: Record<string, any>) => {
    // إلغاء أي حفظ مؤجل
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    await saveAbandonedCart(formData);
  }, [saveAbandonedCart]);

  // دالة مسح الطلب المتروك
  const clearCart = useCallback(async () => {
    if (cartIdRef.current) {
      try {
        const result = await abandonedCartProcessor.deleteCart(cartIdRef.current);
        
        if (result.success) {
          cartIdRef.current = null;
          lastSavedDataRef.current = "";
        } else {
          throw new Error(result.error || 'فشل في مسح الطلب المتروك');
        }
      } catch (error) {
      }
    }
  }, []);

  // دالة تحديث عنصر في السلة
  const updateCartItem = useCallback((updates: Partial<AbandonedCartData>) => {
    // يمكن استخدام هذه الدالة لتحديث بيانات محددة بدون إعادة حفظ كامل
  }, []);

  // دالة تحويل الطلب المتروك إلى طلب فعلي
  const markAsConverted = useCallback(async (orderId: string) => {
    if (cartIdRef.current) {
      try {
        const result = await abandonedCartProcessor.markAsConverted(cartIdRef.current, orderId);
        
        if (result.success) {
          cartIdRef.current = null;
        } else {
          throw new Error(result.error || 'فشل في تحويل الطلب المتروك');
        }
      } catch (error) {
      }
    }
  }, []);

  // تنظيف الموارد عند إلغاء التحميل
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  // حفظ تلقائي عند تغيير البيانات الأساسية
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // حفظ مؤجل عند تغيير البيانات الأساسية
    saveTimeoutRef.current = setTimeout(() => {
      if (effectiveOrgId && productId) {
        // يمكن إضافة منطق حفظ تلقائي هنا إذا لزم الأمر
      }
    }, saveInterval * 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [productId, productColorId, productSizeId, quantity, subtotal, deliveryFee, discountAmount, effectiveOrgId, saveInterval]);

  const actions: AbandonedCartActions = {
    saveCart,
    debouncedSave,
    clearCart,
    updateCartItem,
    markAsConverted
  };

  return [isSaving, actions];
};
