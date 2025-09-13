import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StoreNavbar from '@/components/navbar/StoreNavbar';
import ProductFormRenderer from '@/components/product/ProductFormRenderer';
import { useTenant } from '@/context/TenantContext';
import { useSharedStoreDataContext } from '@/context/SharedStoreDataContext';
import type { FormField as FormFieldType } from '@/types/productForm';
import { getCart, clearCart } from '@/lib/cart/cartStorage';
import { useCartDeliveryCalculation } from '@/hooks/useCartDeliveryCalculation';
import { createCartOrder } from '@/api/cart';
import { Button } from '@/components/ui/button';
import { useCartAbandonedCartTracking } from '@/hooks/useCartAbandonedCartTracking';
import { useTranslation } from 'react-i18next';

export default function CartCheckoutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentOrganization } = useTenant();
  const { organizationSettings } = useSharedStoreDataContext();
  const items = useMemo(() => getCart(), []);

  const [submitted, setSubmitted] = useState<Record<string, any>>({});

  const organizationId = (currentOrganization as any)?.id || null;
  const { summary, quantity, subtotal } = useCartDeliveryCalculation({
    organizationId,
    submittedFormData: submitted,
    items
  });

  // حفظ الطلبات المتروكة للسلة (يشمل كل عناصر السلة مع الألوان والمقاسات)
  useCartAbandonedCartTracking({
    organizationId,
    items,
    submittedFormData: submitted,
    subtotal,
    deliveryFee: summary?.deliveryFee || 0,
  });

  const fields: FormFieldType[] = [
    {
      id: 'fullName',
      name: 'fullName',
      label: t('checkout.fields.fullName'),
      placeholder: t('checkout.fields.fullNamePlaceholder'),
      type: 'text',
      required: true
    },
    {
      id: 'phone',
      name: 'phone',
      label: t('checkout.fields.phone'),
      placeholder: t('checkout.fields.phonePlaceholder'),
      type: 'tel',
      required: true
    },
    {
      id: 'province',
      name: 'province',
      label: t('checkout.fields.province'),
      placeholder: t('checkout.fields.provincePlaceholder'),
      type: 'select',
      required: true
    },
    {
      id: 'municipality',
      name: 'municipality',
      label: t('checkout.fields.municipality'),
      placeholder: t('checkout.fields.municipalityPlaceholder'),
      type: 'select',
      required: true
    },
    {
      id: 'address',
      name: 'address',
      label: t('checkout.fields.address'),
      placeholder: t('checkout.fields.addressPlaceholder'),
      type: 'textarea',
      required: false
    },
    {
      id: 'delivery_type',
      name: 'delivery_type',
      label: t('checkout.fields.deliveryType'),
      type: 'radio',
      required: true,
      options: [
        { value: 'home', label: t('checkout.fields.homeDelivery') },
        { value: 'desk', label: t('checkout.fields.deskDelivery') }
      ]
    },
  ];

  const handleSubmit = async () => {
    if (!organizationId || !summary) return;
    const payload = {
      organizationId,
      customer: {
        fullName: submitted.fullName,
        phone: submitted.phone,
        province: submitted.province,
        municipality: submitted.municipality,
        address: submitted.address || ''
      },
      shipping: {
        deliveryCompany: summary.shippingProvider?.code || 'yalidine',
        deliveryOption: (submitted.delivery_type === 'desk' ? 'desk' : 'home') as 'home' | 'desk',
        deliveryFee: summary.deliveryFee,
        stopDeskId: submitted.stop_desk_id || null
      },
      payment: { method: 'cod' },
      items,
      formData: submitted,
      metadata: { source: 'cart_checkout' }
    } as const;
    try {
      const res = await createCartOrder(payload as any);
      clearCart();
      const orderNumber = (res?.order_number || '').toString();
      navigate(`/thank-you?orderNumber=${encodeURIComponent(orderNumber)}`);
    } catch (e) {
      // يمكن إضافة toast للأخطاء لاحقاً
    }
  };

  const isLoading = false;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <StoreNavbar />
      <div className="pt-[var(--navbar-height,64px)]" />
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">{t('checkout.completeOrder')}</h1>
          <Button variant="ghost" onClick={() => navigate('/cart')}>{t('checkout.backToCart')}</Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ProductFormRenderer
              fields={fields}
              initialData={{ delivery_type: 'home' }}
              disableStockChecks
              onFormChange={setSubmitted}
              onFormSubmit={handleSubmit}
              isLoading={isLoading}
              isCalculatingDelivery={summary?.isCalculating || false}
              subtotal={subtotal}
              deliveryFee={summary?.deliveryFee || 0}
              total={subtotal + (summary?.deliveryFee || 0)}
              quantity={quantity}
              selectedProvince={summary?.selectedProvince || undefined}
              selectedMunicipality={summary?.selectedMunicipality || undefined}
            />
          </div>
          <div>
            <div className="rounded-xl border border-border bg-card/70 p-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span>{t('checkout.subtotal')}</span>
                <span>{subtotal} دج</span>
              </div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span>{t('checkout.deliveryFees')}</span>
                <span>{summary?.deliveryFee || 0} دج</span>
              </div>
              <div className="border-t my-2" />
              <div className="flex items-center justify-between font-semibold">
                <span>{t('checkout.total')}</span>
                <span>{subtotal + (summary?.deliveryFee || 0)} دج</span>
              </div>
              <Button className="w-full mt-4" onClick={handleSubmit} disabled={!summary}>
                {t('checkout.confirmOrder')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
