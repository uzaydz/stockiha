import { useEffect, useMemo, useRef } from 'react';
import { debounce } from 'lodash-es';
import { supabase } from '@/lib/supabase';

type CartVariant = {
  colorId?: string | null;
  colorName?: string | null;
  sizeId?: string | null;
  sizeName?: string | null;
  selectedPrice?: number | null;
};

type CartItem = {
  productId: string;
  organizationId?: string | null;
  name: string;
  image?: string | null;
  unitPrice: number;
  quantity: number;
  variant?: CartVariant;
};

interface Options {
  organizationId?: string | null;
  items: CartItem[];
  submittedFormData: Record<string, any>;
  subtotal: number;
  deliveryFee?: number;
}

/**
 * تتبع الطلبات المتروكة لصفحة إتمام الشراء الخاصة بالسلة (متعددة المنتجات)
 * يرسل عناصر السلة كاملةً (items) إلى Edge Function: save-abandoned-cart
 */
export function useCartAbandonedCartTracking({ organizationId, items, submittedFormData, subtotal, deliveryFee = 0 }: Options) {
  const lastSentRef = useRef<string>('');

  const payload = useMemo(() => {
    const phone = submittedFormData?.phone || submittedFormData?.customer_phone;
    const fullName = submittedFormData?.fullName || submittedFormData?.customer_name || submittedFormData?.name;
    const province = submittedFormData?.province;
    const municipality = submittedFormData?.municipality;
    const address = submittedFormData?.address;
    const deliveryType = submittedFormData?.delivery_type || submittedFormData?.delivery || 'home';

    const mappedItems = (items || []).map((it) => {
      const colorId = it.variant?.colorId || null;
      const sizeId = it.variant?.sizeId || null;
      const variantId = `c:${colorId ?? ''}-s:${sizeId ?? ''}`;
      const price = Number(it.variant?.selectedPrice ?? it.unitPrice) || 0;
      return {
        product_id: it.productId,
        quantity: it.quantity,
        product_color_id: colorId,
        product_size_id: sizeId,
        variant_id: variantId,
        // الحقول التالية للعرض فقط
        name: it.name,
        product_name: it.name,
        price,
        image_url: it.image || undefined,
        color: it.variant?.colorName || undefined,
        size: it.variant?.sizeName || undefined,
      };
    });

    const totalAmount = (subtotal || 0) + (deliveryFee || 0);

    return {
      organization_id: organizationId,
      customer_name: fullName,
      customer_phone: phone,
      customer_email: submittedFormData?.email || undefined,
      province,
      municipality,
      address,
      delivery_option: deliveryType,
      payment_method: 'cash_on_delivery',
      notes: submittedFormData?.notes || undefined,
      subtotal,
      calculated_delivery_fee: deliveryFee,
      total_amount: totalAmount,
      custom_fields_data: submittedFormData || undefined,
      items: mappedItems,
      source: 'cart_checkout',
    } as const;
  }, [organizationId, submittedFormData, items, subtotal, deliveryFee]);

  useEffect(() => {
    const send = debounce(async () => {
      try {
        if (!payload.organization_id) return;
        if (!payload.customer_phone || String(payload.customer_phone).length < 8) return;
        if (!Array.isArray(payload.items) || payload.items.length === 0) return;

        const body = JSON.stringify(payload);
        if (body === lastSentRef.current) return;

        let accessToken = '';
        try {
          const { data: { session } } = await supabase.auth.getSession();
          accessToken = session?.access_token || '';
        } catch {}

        const functionUrl = `${import.meta.env.VITE_SUPABASE_URL || ''}/functions/v1/save-abandoned-cart`;
        const res = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body,
        });
        // لا نكسر الواجهة في حال أخطاء مؤقتة
        if (res.ok) {
          lastSentRef.current = body;
        }
      } catch {}
    }, 1500);

    send();
    return () => send.cancel();
  }, [payload]);
}

