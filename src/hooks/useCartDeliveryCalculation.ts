import { useEffect, useMemo, useState } from 'react';
import { calculateDeliveryFeesOptimized, type DeliveryCalculationResult } from '@/lib/delivery-calculator';
import type { CartItem } from '@/lib/cart/cartStorage';

interface UseCartDeliveryCalcProps {
  organizationId: string | null;
  submittedFormData: Record<string, any>;
  items: CartItem[];
}

export function useCartDeliveryCalculation({ organizationId, submittedFormData, items }: UseCartDeliveryCalcProps) {
  const [result, setResult] = useState<DeliveryCalculationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const quantity = useMemo(() => items.reduce((n, i) => n + i.quantity, 0), [items]);
  const subtotal = useMemo(() => items.reduce((s, i) => s + (Number(i.variant?.selectedPrice ?? i.unitPrice) * i.quantity), 0), [items]);

  useEffect(() => {
    let stop = false;
    const run = async () => {
      if (!organizationId || !submittedFormData.province || !submittedFormData.municipality) {
        setResult(null);
        return;
      }
      setLoading(true);
      try {
        const deliveryType: 'desk' | 'home' = (
          submittedFormData.delivery_type === 'desk' || submittedFormData.shipping_type === 'desk' || submittedFormData.fixedDeliveryType === 'desk'
        ) ? 'desk' : 'home';

        const weight = Math.max(1, quantity); // تقدير بسيط: 1kg/عنصر

        const r = await calculateDeliveryFeesOptimized({
          organizationId,
          selectedProvinceId: submittedFormData.province,
          selectedMunicipalityId: submittedFormData.municipality,
          deliveryType,
          weight,
          productPrice: subtotal,
          quantity
        });
        if (!stop) setResult(r);
      } catch {
        if (!stop) setResult(null);
      } finally {
        if (!stop) setLoading(false);
      }
    };
    const t = setTimeout(run, 400);
    return () => { stop = true; clearTimeout(t); };
  }, [organizationId, submittedFormData.province, submittedFormData.municipality, submittedFormData.delivery_type, submittedFormData.shipping_type, submittedFormData.fixedDeliveryType, quantity, subtotal]);

  const summary = useMemo(() => {
    if (!result) return null;
    return {
      selectedProvince: result.selectedProvince,
      selectedMunicipality: result.selectedMunicipality,
      deliveryType: result.deliveryType,
      deliveryFee: result.deliveryFee,
      shippingProvider: result.shippingProvider || { name: 'yalidine', code: 'yalidine' },
      calculationMethod: result.calculationMethod,
      isCalculating: loading
    };
  }, [result, loading]);

  return { result, loading, quantity, subtotal, summary };
}

