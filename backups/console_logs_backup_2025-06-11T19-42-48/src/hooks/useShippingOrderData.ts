import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface ShippingOrderData {
  id: number;
  tracking_number: string;
  provider_id: number;
  provider?: {
    id: number;
    code: string;
    name: string;
  };
}

export const useShippingOrderData = (orderId: string) => {
  const [shippingData, setShippingData] = useState<ShippingOrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;

    const fetchShippingData = async () => {
      setLoading(true);
      setError(null);

      try {
        // جلب بيانات الشحن مع معلومات المزود
        const { data, error } = await supabase
          .from('shipping_orders')
          .select(`
            id,
            tracking_number,
            provider_id,
            shipping_providers!provider_id (
              id,
              code,
              name
            )
          `)
          .eq('order_id', orderId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('خطأ في جلب بيانات الشحن:', error);
          setError(error.message);
          return;
        }

        if (data) {
          setShippingData({
            id: data.id,
            tracking_number: data.tracking_number,
            provider_id: data.provider_id,
            provider: data.shipping_providers ? {
              id: data.shipping_providers.id,
              code: data.shipping_providers.code,
              name: data.shipping_providers.name
            } : undefined
          });
        } else {
          setShippingData(null);
        }
      } catch (err) {
        console.error('خطأ في جلب بيانات الشحن:', err);
        setError(err instanceof Error ? err.message : 'خطأ غير معروف');
      } finally {
        setLoading(false);
      }
    };

    fetchShippingData();
  }, [orderId]);

  return { shippingData, loading, error };
}; 