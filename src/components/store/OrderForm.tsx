import React, { useMemo, useState, useCallback } from "react";
import { Form } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react"; // Keep Loader2 if still needed for a general loading state, though SubmitButton has its own
import { UseFormReturn } from "react-hook-form";
import { NavigateFunction } from "react-router-dom";

// Import Types
import type { OrderFormProps, CustomFormField, OrderFormValues, ActiveOfferData } from "./order-form/OrderFormTypes"; // Ensure ActiveOfferData is imported if it's distinct from ActiveOfferType in useOrderCalculations
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

// Add type for getAppropriateShippingId
type GetAppropriateShippingIdFn = (selectedProvider: string | null) => string | number | null;

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
  const [calculatedDeliveryFee, setCalculatedDeliveryFee] = useState<number>(deliveryFee);
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
    0, // initialDeliveryFee
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
    shippingLogic.shippingCloneId,
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
    setCalculatedDeliveryFee(price);
  }, []);

  // --- Render ---
  if (!formReady && !formSettings) { // Basic loading state, can be refined
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      {error && (
        <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {visibleCustomFields && visibleCustomFields.length > 0 ? (
            <CustomFormFields
              formFields={visibleCustomFields}
              noForm={true} // Assuming this prop means it won't render its own <form> tag
              productId={productId} // Pass productId
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
                  // Potentially trigger side effects from handleDeliveryTypeChange if not auto-triggered by watch
                }
                if (fieldName === 'province' && value) {
                  // If CustomFormFields handles province changes internally and calls onWilayaChange,
                  // ensure it's wired correctly or call handleWilayaChange from here.
                  // handleWilayaChange(value as string); // Example, if CustomFormFields doesn't call it
                }
                 if (fieldName === 'municipality' && value) {
                  // If CustomFormFields updates delivery fee based on municipality
                  const province = form.getValues('province');
                  if (province) {
                    shippingLogic.updateDeliveryFee(province, value as string);
                  }
                }
              }}
              // Pass other necessary props like:
              // initialDeliveryFee={currentDeliveryFee} // Or let it calculate internally
              // shippingProviderSettings={shippingProviderSettings}
              // formInstance={form} // if CustomFormFields needs direct access to form instance
              // All props that CustomFormFields expects for its internal logic
            />
          ) : (
            <>
              <PersonalInfoFields form={form} />
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
                  // استخدام دالة handleShippingProviderChange الجديدة
                  if (shippingLogic.handleShippingProviderChange) {
                    shippingLogic.handleShippingProviderChange(value);
                  }
                }}
              />
            </>
          )}

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

          <SubmitButton
            isSubmitting={isSubmitting}
            onClick={processFormSubmission}
          />
        </form>
      </Form>
    </div>
  );
};

export default OrderForm; 