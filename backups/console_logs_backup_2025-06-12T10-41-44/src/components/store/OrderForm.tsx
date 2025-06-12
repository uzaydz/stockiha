import React, { useMemo, useState, useCallback, useEffect } from "react";
import { Form } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react"; // Keep Loader2 if still needed for a general loading state, though SubmitButton has its own
import { UseFormReturn } from "react-hook-form";
import { NavigateFunction } from "react-router-dom";

// Import Types
import type { OrderFormProps, OrderFormValues, ActiveOfferData } from "./order-form/OrderFormTypes"; // Ensure ActiveOfferData is imported if it's distinct from ActiveOfferType in useOrderCalculations
import type { Wilaya, Commune } from "./order-form/OrderFormTypes"; // Add these imports

// Import Hooks
import { useOrderFormManagement } from "./order-form/order-form-logic/useOrderFormManagement";
import { useShippingLogic } from "./order-form/order-form-logic/useShippingLogic";
import { useOrderCalculations } from "./order-form/order-form-logic/useOrderCalculations";
import { useAbandonedCartLogic } from "./order-form/order-form-logic/useAbandonedCartLogic";
import { useOrderSubmissionLogic } from "./order-form/order-form-logic/useOrderSubmissionLogic";

// Import UI Sub-components (assuming they are created and exported from an index or directly)
import { PersonalInfoFields } from "./order-form/ui-parts/PersonalInfoFields"; // Assuming creation
import { DeliveryInfoFields } from "./order-form/ui-parts/DeliveryInfoFields"; // استخدام الإصدار المطور الذي يعرض البلديات
import { OrderSummary } from "./order-form/ui-parts/OrderSummary";         // Assuming creation
import { SubmitButton } from "./order-form/ui-parts/SubmitButton";
import { CustomFormFields } from "./order-form/custom-form-fields/index"; // Corrected import path

// Add type for useOrderFormManagement return value
interface OrderFormManagementReturn {
  tenant: { id: string };
  navigate: NavigateFunction;
  form: UseFormReturn<OrderFormValues, any, OrderFormValues>;
  formRef: React.RefObject<HTMLFormElement>;
  isSubmitting: boolean;
  setIsSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
  orderNumber: string | null;
  setOrderNumber: React.Dispatch<React.SetStateAction<string | null>>;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  formReady: boolean;
  wilayasList: Wilaya[];
  communesList: Commune[];
  isLoadingWilayas: boolean;
  isLoadingCommunes: boolean;
  handleWilayaChange: (wilayaId: string) => Promise<void>;
  shippingProviderSettings: any;
  yalidineCentersList: any[];
  isLoadingYalidineCenters: boolean;
}

const OrderForm: React.FC<OrderFormProps> = ({
  productId,
  productColorId,
  productSizeId,
  sizeName,
  basePrice,
  activeOffer,
  deliveryFee = 0,
  quantity = 1,
  customFields = [],
  formSettings = null,
  productColorName = null,
  productSizeName = null,
}) => {
  // --- Initial Setup & Derived Values ---
  const [selectedDeliveryType, setSelectedDeliveryType] = useState<'home' | 'desk'>('home');

  const visibleCustomFields = useMemo(() => {
    return customFields.filter(field => field.isVisible === true);
  }, [customFields]);

  const hasShippingIntegration = !!(
    formSettings?.settings?.shipping_integration?.enabled &&
    formSettings?.settings?.shipping_integration?.provider_id
  );
  const initialShippingProviderId = hasShippingIntegration
    ? formSettings?.settings?.shipping_integration?.provider_id
    : null;

  const defaultFormValues: Partial<OrderFormValues> = {
    fullName: "",
    phone: "",
    province: "",
    municipality: "",
    address: "",
    deliveryCompany: initialShippingProviderId ? String(initialShippingProviderId) : "yalidine",
    deliveryOption: "home",
    paymentMethod: "cash_on_delivery",
    notes: "",
    quantity: quantity,
  };

  // --- Hooks ---
  const {
    tenant,
    navigate,
    form,
    formRef,
    isSubmitting,
    setIsSubmitting,
    orderNumber,
    setOrderNumber,
    error,
    setError,
    formReady,
    wilayasList,
    communesList,
    isLoadingWilayas,
    isLoadingCommunes,
    handleWilayaChange,
    shippingProviderSettings,
    yalidineCentersList,
    isLoadingYalidineCenters,
  }: OrderFormManagementReturn = useOrderFormManagement(defaultFormValues, initialShippingProviderId);

  const shippingLogic = useShippingLogic(
    form,
    tenant?.id,
    formSettings,
    deliveryFee, // استخدام deliveryFee المرسل كـ prop
    quantity,
    productId
  );

  const {
    subtotal,
    discountAmount,
    hasFreeShipping,
  } = useOrderCalculations(basePrice, quantity, activeOffer);

  useAbandonedCartLogic(
    form,
    tenant?.id,
    productId,
    productColorId,
    productSizeId,
    shippingLogic.currentDeliveryFee,
    subtotal,
    discountAmount,
    hasFreeShipping,
    activeOffer as ActiveOfferData | null | undefined // Cast if ActiveOfferType in hook is different
  );

  const {
    processFormSubmission,
    onSubmit,
  } = useOrderSubmissionLogic(
    form,
    tenant?.id,
    productId,
    productColorId,
    productSizeId,
    sizeName,
    basePrice,
    quantity,
    shippingLogic.currentDeliveryFee,
    activeOffer,
    discountAmount,
    hasFreeShipping,
    visibleCustomFields,
    yalidineCentersList,

    formSettings,
    shippingLogic.getAppropriateShippingId,
    isSubmitting,
    setIsSubmitting,
    orderNumber,
    setOrderNumber,
    setError,
    navigate,
    shippingProviderSettings,
    useCallback((municipalityId: string) => {
      if (!municipalityId || !communesList || communesList.length === 0) return undefined;
      const municipality = communesList.find(m => m.id.toString() === municipalityId);
      return municipality?.name;
    }, [communesList])
  );

  // --- Calculate Order Values based on Active Offer ---
  const subtotalCalculated = useMemo(() => basePrice * quantity, [basePrice, quantity]);

  const discountAmountCalculated = useMemo(() => {
    if (!activeOffer) return 0;
    if (activeOffer.type === 'discount_percentage' && activeOffer.discountValue) {
      return subtotalCalculated * (activeOffer.discountValue / 100);
    } else if (activeOffer.type === 'discount_fixed' && activeOffer.discountValue) {
      return activeOffer.discountValue;
    } 
    return 0;
  }, [activeOffer, subtotalCalculated]);

  // Determine if the active offer provides free shipping
  const hasFreeShippingCalculated = useMemo(() => {
    return activeOffer && (activeOffer.type === 'free_shipping' || activeOffer.freeShipping === true);
  }, [activeOffer]);

  // Handle delivery fee updates
  const handleDeliveryPriceCalculated = useCallback((price: number) => {
    // This function can be used if needed in the future
  }, []);

  // --- Render ---
  if (!formReady && !formSettings) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl animate-pulse" />
          <Loader2 className="relative h-12 w-12 animate-spin text-primary" />
        </div>
        <p className="mt-4 text-sm text-muted-foreground animate-pulse">جاري تحضير النموذج...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      {/* رأس النموذج مع التأثيرات البصرية */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-t-3xl animate-gradient" />
        <div className="relative px-6 py-8 md:px-8 md:py-10">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-2 animate-in fade-in-0 slide-in-from-top-4 duration-700">
            إتمام الطلب
          </h2>
          <p className="text-center text-muted-foreground animate-in fade-in-0 slide-in-from-top-4 duration-700 delay-100">
            املأ البيانات التالية لإتمام طلبك
          </p>
        </div>
      </div>

      {/* حاوية النموذج الرئيسية */}
      <div className="bg-card rounded-xl md:rounded-3xl shadow-xl border border-border/50 overflow-hidden transition-all duration-300 hover:shadow-2xl">
        {/* رسائل الخطأ */}
        {error && (
          <div className="p-6 border-b border-border/50">
            <Alert variant="destructive" className="rounded-xl">
              <AlertDescription className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </AlertDescription>
            </Alert>
          </div>
        )}

        <Form {...form}>
          <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)} className="order-form p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8">
            {/* قسم المعلومات الشخصية ومعلومات التوصيل */}
            <div className="space-y-4 md:space-y-6">
              {visibleCustomFields && visibleCustomFields.length > 0 ? (
                <div className="order-form-section bg-background/50 rounded-xl md:rounded-2xl p-4 sm:p-6 space-y-4 md:space-y-6">
                  <CustomFormFields
                    formFields={visibleCustomFields}
                    noForm={true}
                    productId={productId}
                    onDeliveryPriceChange={(price) => {
                      if (price !== null && price !== undefined) {
                        shippingLogic.setCurrentDeliveryFee(price);
                      }
                    }}
                    onFieldChange={(fieldName, value) => {
                      form.setValue(fieldName as any, value, { 
                        shouldValidate: true, 
                        shouldDirty: true, 
                        shouldTouch: true 
                      });
                      if (fieldName === 'deliveryOption') {
                        setSelectedDeliveryType(value as 'home' | 'desk');
                        const province = form.getValues('province');
                        const municipality = form.getValues('municipality');
                        if (province) {
                          shippingLogic.updateDeliveryFee(province, municipality);
                        }
                      }
                      if (fieldName === 'province' && value) {
                        shippingLogic.handleWilayaChange(value as string);
                      }
                      if (fieldName === 'municipality' && value) {
                        const province = form.getValues('province');
                        if (province) {
                          shippingLogic.updateDeliveryFee(province, value as string);
                        }
                      }
                    }}
                    shippingProviderSettings={shippingLogic.shippingProviderSettings}
                  />
                </div>
              ) : (
                <>
                  {/* قسم المعلومات الشخصية */}
                  <div className="order-form-section bg-background/50 rounded-xl md:rounded-2xl p-4 sm:p-6 space-y-4 md:space-y-6">
                    <div className="flex items-center gap-3 mb-3 md:mb-4">
                      <div className="p-2 bg-primary/10 rounded-xl">
                        <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold">المعلومات الشخصية</h3>
                    </div>
                    <PersonalInfoFields form={form} />
                  </div>

                  {/* قسم معلومات التوصيل */}
                  <div className="order-form-section bg-background/50 rounded-xl md:rounded-2xl p-4 sm:p-6 space-y-4 md:space-y-6">
                    <div className="flex items-center gap-3 mb-3 md:mb-4">
                      <div className="p-2 bg-primary/10 rounded-xl">
                        <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold">معلومات التوصيل</h3>
                    </div>
                    <DeliveryInfoFields
                      form={form}
                      provinces={wilayasList}
                      municipalities={communesList}
                      yalidineCenters={yalidineCentersList}
                      isLoadingYalidineCenters={isLoadingYalidineCenters}
                      onWilayaChange={handleWilayaChange}
                      hasShippingIntegration={shippingLogic.hasShippingIntegration}
                      isLoadingWilayas={isLoadingWilayas}
                      isLoadingCommunes={isLoadingCommunes}
                      shippingProviderSettings={shippingProviderSettings}
                      onDeliveryPriceCalculated={handleDeliveryPriceCalculated}
                      onDeliveryCompanyChange={(value) => {
                        form.setValue("deliveryCompany", value, { shouldValidate: true });
                        if (shippingLogic.handleShippingProviderChange) {
                          shippingLogic.handleShippingProviderChange(value);
                        }
                      }}
                    />
                  </div>
                </>
              )}
            </div>

            {/* قسم ملخص الطلب */}
            <div className="mt-6 md:mt-8 bg-gradient-to-t from-card via-card to-transparent -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8 pt-6 md:pt-8 pb-4 md:pb-6 border-t border-border/50">
              <OrderSummary
                productId={productId}
                isLoadingDeliveryFee={shippingLogic.isLoadingDeliveryFee}
                basePrice={basePrice}
                quantity={quantity}
                subtotal={subtotalCalculated}
                discount={discountAmountCalculated}
                deliveryFee={shippingLogic.currentDeliveryFee}
                hasFreeShipping={hasFreeShippingCalculated}
                total={subtotalCalculated - discountAmountCalculated + (hasFreeShippingCalculated ? 0 : shippingLogic.currentDeliveryFee)}
                productColorName={productColorName}
                productSizeName={productSizeName}
                deliveryType={selectedDeliveryType}
                shippingProviderSettings={shippingProviderSettings}
              />

              {/* زر الإرسال */}
              <SubmitButton
                isSubmitting={isSubmitting}
                onClick={processFormSubmission}
              />
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default OrderForm;

// إضافة الأنماط المخصصة للتأثيرات
const styles = `
  @keyframes gradient {
    0%, 100% {
      opacity: 0.05;
    }
    50% {
      opacity: 0.1;
    }
  }
  
  .animate-gradient {
    animation: gradient 3s ease-in-out infinite;
  }
  
  /* تحسينات focus states */
  .order-form input:focus,
  .order-form select:focus,
  .order-form textarea:focus {
    transition: all 0.2s ease;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
  
  /* تحسينات للأقسام */
  .order-form-section {
    transition: all 0.3s ease;
  }
  
  .order-form-section:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0,0,0,0.08);
  }
`;

// إضافة الأنماط إلى الصفحة
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}
