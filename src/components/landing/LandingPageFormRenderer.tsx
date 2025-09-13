import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import ProductFormRenderer from '@/components/product/ProductFormRenderer';
import ProductVariantSelector from '@/components/product/ProductVariantSelector';
import FormErrorBoundary from '@/components/product/form/FormErrorBoundary';
import Shimmer from '@/components/ui/Shimmer';
import { cn } from '@/lib/utils';

import { useFormFields } from './hooks/useFormFields';
import { useTenant } from '@/context/TenantContext';
import { useUnifiedProductPageData } from '@/hooks/useUnifiedProductPageData';
import { useProductPricing } from '@/hooks/product/useProductPricing';
import { useDeliveryCalculation as useDeliveryCalc } from '@/components/product-page/useDeliveryCalculation';
import { processOrder } from '@/api/store';
import { isPhoneBlocked as apiIsPhoneBlocked } from '@/lib/api/blocked-customers';
import { useAbandonedCartTracking } from '@/hooks/useAbandonedCartTracking';

import type { ProductColor as CompleteColor, ProductSize as CompleteSize } from '@/lib/api/productComplete';

type AnyFormField = {
  id: string;
  name: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: Record<string, any>;
  description?: string;
};

interface LandingPageFormRendererProps {
  formData?: {
    fields: AnyFormField[];
    name?: string;
    description?: string;
    submitButtonText?: string;
  };
  onFormSubmit?: (data: Record<string, any>) => void | Promise<void>;
  onFormChange?: (data: Record<string, any>) => void;
  className?: string;
  fields?: AnyFormField[];
  onSubmit?: (data: Record<string, any>) => void | Promise<void>;
  initialData?: Record<string, any>;
  formId?: string;
  productId?: string;
  title?: string;
  subtitle?: string;
  submitButtonText?: string;
}

const LandingPageFormRenderer = memo<LandingPageFormRendererProps>(({
  formData: externalFormData,
  onFormSubmit,
  onFormChange,
  className,
  fields: directFields,
  onSubmit,
  initialData = {},
  formId,
  productId,
  title,
  subtitle,
  submitButtonText
}) => {
  const navigate = useNavigate();
  const { currentOrganization } = useTenant();

  // 1) Load form fields (if not provided directly)
  const { formFields: dbFormFields } = useFormFields(formId);
  const effectiveFields = useMemo(() => {
    return externalFormData?.fields || directFields || dbFormFields || [];
  }, [externalFormData?.fields, directFields, dbFormFields]);

  // اكتشاف حقل التوصيل وخيار المكتب/المنزل من تعريف الحقول
  const deliveryFieldMeta = useMemo(() => {
    const isDeliveryField = (f: any) => f?.type === 'radio' && (
      (f.name && /delivery|توصيل/i.test(String(f.name))) ||
      (f.label && /delivery|توصيل/i.test(String(f.label)))
    );
    const field = (effectiveFields as any[]).find(isDeliveryField);
    const opts = (field?.options || []) as any[];
    const officeOpt = opts.find((o) => {
      const v = String(o?.value || '').toLowerCase();
      const l = String(o?.label || '').toLowerCase();
      return v === 'desk' || v === 'office' || l.includes('office') || l.includes('مكتب');
    });
    const homeOpt = opts.find((o) => {
      const v = String(o?.value || '').toLowerCase();
      const l = String(o?.label || '').toLowerCase();
      return v === 'home' || l.includes('home') || l.includes('منزل');
    });
    return {
      fieldName: field?.name as string | undefined,
      officeValue: officeOpt?.value ?? 'desk',
      homeValue: homeOpt?.value ?? 'home'
    };
  }, [effectiveFields]);

  // 2) Load product complete data (for pricing, variants, shipping)
  const organizationId = currentOrganization?.id || null;
  const { product } = useUnifiedProductPageData({
    productId,
    organizationId: organizationId || undefined,
    enabled: Boolean(productId && organizationId),
    dataScope: 'full'
  });

  // 3) Local state for form values and variants
  const [formValues, setFormValues] = useState<Record<string, any>>(() => {
    const d = initialData || {};
    const preferred = d.delivery_type || d.shipping_type || d.fixedDeliveryType || d.delivery || (d as any)['توصيل'] || d.delivery_method;
    return {
      ...d,
      delivery_type: preferred || 'desk',
      // محاولة ضبط الحقول الشائعة إذا لم تكن محددة
      delivery: d.delivery ?? 'desk',
      delivery_method: d.delivery_method ?? 'desk',
      shipping_type: d.shipping_type ?? 'desk',
      fixedDeliveryType: d.fixedDeliveryType ?? 'desk',
      ['توصيل']: (d as any)['توصيل'] ?? 'desk'
    };
  });

  // في حال توفر تعريف دقيق لخيار المكتب، نُحدث القيمة الافتراضية لكي تتطابق مع قيمة الخيار بالضبط
  useEffect(() => {
    if (!deliveryFieldMeta.fieldName) return;
    const fname = deliveryFieldMeta.fieldName;
    const officeVal = deliveryFieldMeta.officeValue;
    // إذا لم تكن هناك قيمة للحقل، اضبطها لقيمة المكتب
    if (!formValues[fname]) {
      setFormValues((prev) => ({
        ...prev,
        [fname]: officeVal,
        delivery_type: 'desk',
        delivery: officeVal,
        delivery_method: officeVal,
        shipping_type: officeVal,
        fixedDeliveryType: officeVal,
        ['توصيل']: officeVal
      }));
    }
  }, [deliveryFieldMeta.fieldName, deliveryFieldMeta.officeValue]);
  const [selectedColor, setSelectedColor] = useState<CompleteColor | undefined>(undefined);
  const [selectedSize, setSelectedSize] = useState<CompleteSize | undefined>(undefined);

  // Helpers: availability checks
  const isSizeAvailable = useCallback((size?: CompleteSize) => {
    if (!size) return false;
    const q = (size as any)?.quantity;
    return typeof q === 'number' ? q > 0 : true; // treat undefined as available
  }, []);

  const isColorAvailable = useCallback((color?: CompleteColor) => {
    if (!color) return false;
    const hasSizes = (color as any)?.has_sizes && Array.isArray((color as any)?.sizes) && (color as any)?.sizes.length > 0;
    if (hasSizes) {
      return ((color as any).sizes as any[]).some((s) => isSizeAvailable(s));
    }
    const q = (color as any)?.quantity;
    return typeof q === 'number' ? q > 0 : true; // treat undefined as available
  }, [isSizeAvailable]);

  const pickFirstAvailableSize = useCallback((color?: CompleteColor): CompleteSize | undefined => {
    if (!color) return undefined;
    const sizes = (color as any)?.sizes as any[] | undefined;
    if (!Array.isArray(sizes) || sizes.length === 0) return undefined;
    const available = sizes.find((s) => isSizeAvailable(s));
    return (available as any) || (sizes[0] as any);
  }, [isSizeAvailable]);

  const pickBestColor = useCallback((colors: CompleteColor[]): CompleteColor | undefined => {
    if (!Array.isArray(colors) || colors.length === 0) return undefined;
    // Prefer default AND available
    const defaultAvailable = (colors as any[]).find((c) => (c as any).is_default && isColorAvailable(c));
    if (defaultAvailable) return defaultAvailable as any;
    // Otherwise first available
    const firstAvailable = colors.find((c) => isColorAvailable(c));
    if (firstAvailable) return firstAvailable as any;
    // Fallback: first color (even if not available)
    return colors[0] as any;
  }, [isColorAvailable]);

  // Auto-select available color/size on load
  useEffect(() => {
    if (!product?.variants?.has_variants || !Array.isArray(product?.variants?.colors)) return;
    if (selectedColor) return;
    const colors = product.variants.colors as any[];
    if (colors.length === 0) return;
    const bestColor = pickBestColor(colors as any);
    if (bestColor) {
      setSelectedColor(bestColor as any);
      setFormValues((prev) => ({ ...prev, product_color: (bestColor as any).id }));
      const bestSize = pickFirstAvailableSize(bestColor as any);
      if (bestSize) {
        setSelectedSize(bestSize as any);
        setFormValues((prev) => ({ ...prev, product_size: (bestSize as any).id }));
      }
    }
  }, [product, selectedColor, pickBestColor, pickFirstAvailableSize]);

  // If selectedColor becomes unavailable (edge case), re-pick
  useEffect(() => {
    if (!product?.variants?.has_variants || !Array.isArray(product?.variants?.colors)) return;
    if (!selectedColor) return;
    if (!isColorAvailable(selectedColor)) {
      const colors = product.variants.colors as any[];
      const bestColor = pickBestColor(colors as any);
      if (bestColor) {
        setSelectedColor(bestColor as any);
        setFormValues((prev) => ({ ...prev, product_color: (bestColor as any).id }));
        const bestSize = pickFirstAvailableSize(bestColor as any);
        if (bestSize) {
          setSelectedSize(bestSize as any);
          setFormValues((prev) => ({ ...prev, product_size: (bestSize as any).id }));
        } else {
          setSelectedSize(undefined);
          setFormValues((prev) => ({ ...prev, product_size: undefined }));
        }
      }
    } else {
      // Ensure size is available when color is available and has sizes
      const bestSize = pickFirstAvailableSize(selectedColor as any);
      if (bestSize && (!selectedSize || (selectedSize as any).id !== (bestSize as any).id) && isSizeAvailable(bestSize as any)) {
        setSelectedSize(bestSize as any);
        setFormValues((prev) => ({ ...prev, product_size: (bestSize as any).id }));
      }
    }
  }, [product, selectedColor, selectedSize, isColorAvailable, isSizeAvailable, pickBestColor, pickFirstAvailableSize]);

  // 4) Quantity from form or fallback to 1
  const quantity = useMemo(() => {
    const q = Number(formValues.quantity || formValues.qty || 1);
    return Number.isFinite(q) && q > 0 ? q : 1;
  }, [formValues.quantity, formValues.qty]);

  // 5) Pricing using shared hook
  const [pricingState] = useProductPricing({
    product: product || null,
    selectedColor: selectedColor as any,
    selectedSize: selectedSize as any,
    quantity
  });

  // 6) Delivery calculation using shared hook from product page
  const { summaryData } = useDeliveryCalc({
    organizationId: organizationId || '',
    product,
    formData: formValues,
    quantity
  });

  // 6.1) Abandoned cart tracking for Landing View (خفيف + بدون ضغط على القاعدة)
  const [isSavingCart, abandonedCartActions] = useAbandonedCartTracking({
    productId,
    productColorId: selectedColor?.id,
    productSizeId: selectedSize?.id,
    quantity,
    subtotal: (pricingState as any)?.priceInfo?.price ? (pricingState as any).priceInfo.price * quantity : 0,
    deliveryFee: (summaryData as any)?.deliveryFee || 0,
    discountAmount: (pricingState as any)?.priceInfo?.discount || 0,
    organizationId: organizationId || undefined,
    enabled: Boolean(productId && organizationId),
    saveInterval: 5, // تقليل التردد
    source: 'landing_page_view'
  });

  // 7) Submit handler: create order, then navigate to Thank You
  const handleSubmit = useCallback(async (data: Record<string, any>) => {
    try {
      if (!product || !organizationId) return;

      const fullName = data.customer_name || data.name || data.full_name || data.fullName;
      const phone = data.customer_phone || data.phone || data.telephone || data.mobile;
      if (!fullName || !phone) {
        toast.error('يرجى ملء جميع البيانات المطلوبة');
        return;
      }

      // تصدي مسبق للأرقام المحظورة قبل إنشاء الطلب
      try {
        if (organizationId && phone) {
          const res = await apiIsPhoneBlocked(organizationId, phone);
          if (res.isBlocked) {
            try { window.dispatchEvent(new CustomEvent('blocked-customer', { detail: { reason: res.reason, phone } })); } catch {}
            toast.error(res.reason ? `لا يمكن إتمام الطلب: ${res.reason}` : 'لا يمكن إتمام الطلب: هذا الرقم محظور');
            return;
          }
        }
      } catch {}

      const result = await processOrder(organizationId, {
        fullName,
        phone,
        province: data.province,
        municipality: data.municipality,
        address: data.address || '',
        city: data.city || '',
        deliveryCompany: (summaryData as any)?.shippingProvider?.code || 'yalidine',
        deliveryOption: (summaryData as any)?.deliveryType || 'home',
        paymentMethod: 'cash_on_delivery',
        notes: data.notes || '',
        productId: (product as any).id,
        productColorId: (selectedColor as any)?.id || null,
        productSizeId: (selectedSize as any)?.id || null,
        sizeName: (selectedSize as any)?.size_name || null,
        quantity,
        unitPrice: pricingState.priceInfo.price,
        totalPrice: pricingState.priceInfo.price * quantity,
        deliveryFee: (summaryData as any)?.deliveryFee || 0,
        formData: data,
        metadata: { from_landing_page: true }
      });

      if ((result as any)?.error) {
        toast.error((result as any).error || 'حدث خطأ أثناء إنشاء الطلبية');
        return;
      }

      const orderNumber = (result as any)?.order_number || (result as any)?.orderNumber || Math.floor(Math.random() * 10000);
      toast.success('تم إنشاء الطلبية بنجاح!');
      navigate(`/thank-you?orderNumber=${orderNumber}`, {
        state: {
          orderNumber,
          fromLandingPage: true,
          productId: (product as any).id,
          organizationId
        }
      });
    } catch (e: any) {
      // فحص حالة الحظر بعد الخطأ أيضاً (fallback)
      try {
        const msg = (e && e.message) ? String(e.message) : '';
        const phoneForCheck = data.customer_phone || data.phone || data.telephone || data.mobile;
        if (msg.includes('blocked_customer') && organizationId && phoneForCheck) {
          const res = await apiIsPhoneBlocked(organizationId, phoneForCheck);
          try { window.dispatchEvent(new CustomEvent('blocked-customer', { detail: { reason: res.reason, phone: phoneForCheck } })); } catch {}
          toast.error(res.reason ? `لا يمكن إتمام الطلب: ${res.reason}` : 'لا يمكن إتمام الطلب: هذا الرقم محظور');
          return;
        }
      } catch {}
      toast.error('حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى');
    }
  }, [navigate, organizationId, pricingState.priceInfo.price, product, quantity, selectedColor, selectedSize, summaryData]);

  // 8) Map data for ProductFormRenderer
  const rendererFormData = useMemo(() => ({
    fields: effectiveFields as any,
    name: externalFormData?.name || title || undefined,
    description: externalFormData?.description || subtitle || undefined,
    submitButtonText: externalFormData?.submitButtonText || submitButtonText || undefined
  }), [effectiveFields, externalFormData?.name, externalFormData?.description, externalFormData?.submitButtonText, title, subtitle, submitButtonText]);

  const liteProductForRenderer = useMemo(() => ({
    has_variants: !!product?.variants?.has_variants,
    colors: product?.variants?.colors || [],
    stock_quantity: product?.inventory?.stock_quantity || 0
  }), [product]);

  return (
    <FormErrorBoundary className={className}>
      <div className={cn('w-full')}>
        {product?.variants?.has_variants && Array.isArray(product?.variants?.colors) && (
          <div className="mb-6">
            <ProductVariantSelector
              product={product as any}
              selectedColor={selectedColor as any}
              selectedSize={selectedSize as any}
              onColorSelect={(c) => { setSelectedColor(c as any); setFormValues(prev => ({ ...prev, product_color: (c as any).id })); }}
              onSizeSelect={(s) => { setSelectedSize(s as any); setFormValues(prev => ({ ...prev, product_size: (s as any).id })); }}
            />
          </div>
        )}

        <Shimmer isLoading={!effectiveFields || effectiveFields.length === 0} rounded="2xl" className="min-h-[200px]">
          <ProductFormRenderer
            formData={rendererFormData}
            onFormSubmit={onFormSubmit || onSubmit || handleSubmit}
            onFormChange={(d) => {
              setFormValues(d);
              onFormChange?.(d);
              // حفظ متروك (Debounced) فقط عند توفر رقم هاتف معقول
              const phone = d.customer_phone || d.phone || d.telephone || d.mobile;
              if (phone && String(phone).length >= 8) {
                abandonedCartActions.debouncedSave?.(d);
              }
            }}
            initialData={{
              ...formValues,
              // ضمان تمرير قيمة المكتب لمختلف الأسماء لكي تظهر مختارة في الواجهة
              [deliveryFieldMeta.fieldName || 'delivery']: formValues[deliveryFieldMeta.fieldName || 'delivery'] ?? deliveryFieldMeta.officeValue,
              delivery_type: formValues.delivery_type ?? 'desk',
              delivery: formValues.delivery ?? deliveryFieldMeta.officeValue,
              delivery_method: formValues.delivery_method ?? deliveryFieldMeta.officeValue,
              shipping_type: formValues.shipping_type ?? deliveryFieldMeta.officeValue,
              fixedDeliveryType: formValues.fixedDeliveryType ?? deliveryFieldMeta.officeValue,
              ['توصيل']: (formValues as any)['توصيل'] ?? deliveryFieldMeta.officeValue
            }}
            className={className}
            product={liteProductForRenderer as any}
            selectedColor={selectedColor as any}
            selectedSize={selectedSize as any}
            subtotal={pricingState.priceInfo.price * quantity}
            total={(pricingState.priceInfo.price * quantity) + ((summaryData as any)?.deliveryFee || 0)}
            quantity={quantity}
            isCalculatingDelivery={Boolean((summaryData as any)?.isCalculating)}
            isLoadingDeliveryFee={Boolean((summaryData as any)?.isCalculating)}
            deliveryFee={(summaryData as any)?.deliveryFee || 0}
            selectedProvince={(summaryData as any)?.selectedProvince || undefined}
            selectedMunicipality={(summaryData as any)?.selectedMunicipality || undefined}
          />
        </Shimmer>
      </div>
    </FormErrorBoundary>
  );
});

LandingPageFormRenderer.displayName = 'LandingPageFormRenderer';

export default LandingPageFormRenderer;
