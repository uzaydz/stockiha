import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTenant } from "@/context/TenantContext";
import { CreditCard } from "lucide-react";

// استيراد ملف التنسيقات
import "../form.css";

// استيراد الأنواع من ملف types.ts
import type { CustomFormProps, ExtendedFormField } from "../types";

// Import Hooks and Renderer
import { useShippingProviderLogic } from './ShippingProviderHooks';
import { useDeliveryPrice } from './DeliveryPriceLogic';
import { useDeliveryTypeUpdater } from './DeliveryTypeUpdater';
import { useFormInitialization } from './FormInitialization';
import { useFormEventHandlers } from './FormEventHandler';
import { FormFieldRenderer } from './FormFieldRenderer';

export const CustomFormFields: React.FC<CustomFormProps> = ({
  formId,
  formFields,
  productId,
  onSubmit,
  isSubmitting = false,
  children,
  noForm = false,
  onDeliveryPriceChange,
  onFieldChange,
}): JSX.Element => {
  const { currentOrganization } = useTenant();
  const { watch, setValue, getValues, reset } = useForm(); 

  const [extendedFields, setExtendedFields] = useState<ExtendedFormField[]>([]);
  
  // Shipping Provider Logic
  const { 
    clonedShippingProviderId, 
    shippingProviderSettings, 
    isLoadingShippingSettings,
    fetchShippingProviderSettings,
  } = useShippingProviderLogic(formId, formFields, productId, currentOrganization, setValue);

  // Delivery Price Logic
  const { 
    // deliveryPrice, // Not directly used in JSX, but available if needed
    recalculateAndSetDeliveryPrice,
  } = useDeliveryPrice(
    currentOrganization, 
    shippingProviderSettings, 
    clonedShippingProviderId,
    fetchShippingProviderSettings, 
    onDeliveryPriceChange,
    onFieldChange,
    setValue,
    extendedFields
  );

  // Delivery Type Updater Logic
  const { deliveryTypeUpdateRef } = useDeliveryTypeUpdater( // Destructure the ref
    shippingProviderSettings,
    setValue,
    onFieldChange,
    extendedFields
  );
  
  // Form Initialization Logic
  useFormInitialization({
    formFields,
    currentOrganization,
    productId,
    setExtendedFields,
  });

  // Form Event Handlers
  const { 
    updateFieldValue, 
    handleProvinceChange, 
    handleMunicipalityChange 
  } = useFormEventHandlers({
    extendedFields,
    setExtendedFields,
    currentOrganization,
    setValue,
    recalculateAndSetDeliveryPrice,
    onFieldChange,
    deliveryTypeUpdateRef 
  });

  // تنظيم الحقول حسب الترتيب
  const sortedFields = [...extendedFields].sort((a, b) => a.order - b.order);

  // تصفية الحقول المكررة (مثل حقول العنوان)
  const uniqueFields = sortedFields.filter((field, index, self) => {
    if (field.name === 'address') {
      return self.findIndex(f => f.name === 'address') === index;
    }
    return true;
  });

  // عرض النموذج
  const content = (
    <div className="space-y-6">
      <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
        <h2 className="text-xl font-semibold mb-6 text-foreground border-b border-border pb-3">معلومات الطلب</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          {uniqueFields.map(field => (
            <FormFieldRenderer
              key={field.id}
              field={field}
              extendedFields={extendedFields}
              setExtendedFields={setExtendedFields}
              setValue={setValue}
              recalculateAndSetDeliveryPrice={recalculateAndSetDeliveryPrice}
              handleProvinceChange={handleProvinceChange}
              updateValue={updateFieldValue} // Changed from updateFieldValue to updateValue
              shippingProviderSettings={shippingProviderSettings}
              isLoadingShippingSettings={isLoadingShippingSettings}
              productId={productId}
              clonedShippingProviderId={clonedShippingProviderId}
            />
          ))}
        </div>
      </div>
      
      {children}
      
      {onSubmit && !noForm && (
        <div className="mt-8">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 px-6 bg-primary hover:bg-primary-darker text-primary-foreground font-semibold rounded-lg transition duration-200 disabled:opacity-70 shadow-md hover:shadow-lg flex items-center justify-center text-lg"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                جاري إرسال الطلب...
              </>
            ) : (
              <>
                <CreditCard className="ml-2 h-5 w-5" /> 
                إرسال الطلب
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
  
  if (noForm) {
    return content;
  }
  
  // Note: The form submission logic (onSubmit) will likely need access 
  // to form data, typically through react-hook-form's handleSubmit.
  // This example assumes onSubmit is passed and handles data retrieval.
  // If using react-hook-form for submission, it would be <form onSubmit={handleSubmit(onSubmit)}>
  // and the `onSubmit` prop would be `(data: any) => void`.
  // For now, keeping it as is to match the old structure.
  return (
    <form onSubmit={onSubmit ? (e) => {
      e.preventDefault(); // Prevent default regardless
      // const formData = getValues(); // Example: Get all form values
      // onSubmit(formData); // Pass them to your onSubmit handler
      // This part needs to be adapted based on how `onSubmit` expects data.
      // The original `CustomFormFieldsold.tsx` did not show how `onSubmit` gets data.
      // A common pattern with react-hook-form is to use its `handleSubmit` wrapper.
      // For now, we just call the passed onSubmit, which might not have access to form data directly.
      // This should be reviewed and potentially refactored to use `handleSubmit(onSubmit)` from `useForm`.
      onSubmit(getValues()); // A possible way to pass data, but handleSubmit is preferred
    } : (e) => e.preventDefault()} className="custom-form">
      {content}
    </form>
  );
};
