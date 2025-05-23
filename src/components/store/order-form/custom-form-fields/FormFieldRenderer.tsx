import React from 'react';
import { UseFormSetValue } from 'react-hook-form';
import { Skeleton } from "@/components/ui/skeleton";
import { Home, Building, CreditCard } from "lucide-react";
import { DeliveryTypeField } from "../DeliveryTypeField"; // Adjusted import path
import { 
  TextField, 
  TextAreaField, 
  SelectField, 
  ProvinceField, 
  MunicipalityField, 
  RadioField, 
  CheckboxField 
} from "../FormFieldComponents"; // Adjusted import path
import type { ExtendedFormField } from "../types"; // Adjusted import path

interface FormFieldRendererProps {
  field: ExtendedFormField;
  extendedFields: ExtendedFormField[]; // For DeliveryTypeField
  setExtendedFields: React.Dispatch<React.SetStateAction<ExtendedFormField[]>>; // For DeliveryTypeField and RadioField
  setValue: UseFormSetValue<any>; // from react-hook-form, for DeliveryTypeField, MunicipalityField, RadioField
  recalculateAndSetDeliveryPrice: (
    currentDeliveryType?: string,
    currentProvinceId?: string,
    currentMunicipalityId?: string
  ) => void; // For DeliveryTypeField, MunicipalityField, RadioField
  handleProvinceChange: (provinceId: string, municipalityFieldId: string | null, deliveryTypeOverride?: string) => Promise<void>; // For ProvinceField
  updateValue: (fieldName: string, value: string) => void; // For most fields
  shippingProviderSettings: any; // For DeliveryTypeField, RadioField and direct rendering logic
  isLoadingShippingSettings: boolean;
  productId: string | null | undefined;
  clonedShippingProviderId: string | number | null;
}

export const FormFieldRenderer: React.FC<FormFieldRendererProps> = ({
  field,
  extendedFields,
  setExtendedFields,
  setValue,
  recalculateAndSetDeliveryPrice,
  handleProvinceChange,
  updateValue,
  shippingProviderSettings,
  isLoadingShippingSettings,
  productId,
  clonedShippingProviderId
}) => {
  if (!field.isVisible) return null;
    
  const isShippingField = field.name === 'fixedDeliveryType' || 
    field.description?.includes('حقل نوع التوصيل الثابت') || 
    field.type === 'deliveryType';
  
  if (isShippingField && (isLoadingShippingSettings || (productId && !shippingProviderSettings && clonedShippingProviderId))) {
    return (
      <div key={field.id} className="mb-4 col-span-1 md:col-span-2">
        <label className="block text-sm font-medium mb-2 text-foreground">
          {field.label || "خيارات التوصيل"}
          {field.required && <span className="text-red-500 mr-1">*</span>}
        </label>
        <div className="bg-muted/40 p-4 rounded-lg animate-pulse">
          <div className="h-6 w-3/4 bg-muted rounded mb-3"></div>
          <div className="h-4 w-1/2 bg-muted rounded"></div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">جاري تحميل خيارات التوصيل...</p>
      </div>
    );
  }
  
  switch (field.type) {
    case 'text':
    case 'number':
    case 'email':
    case 'tel':
      return <TextField field={field} key={field.id} updateValue={updateValue} />;
    
    case 'textarea':
      return <TextAreaField field={field} key={field.id} updateValue={updateValue} />;
    
    case 'select':
      // Assuming 'deliveryType' select is handled by specific logic below if fixedDeliveryType is present
      if (field.name === 'deliveryType' && extendedFields.some(f => f.name === 'fixedDeliveryType')) {
         // Potentially render nothing or a different component if fixedDeliveryType handles it
         return null; 
      }
      return <SelectField field={field} key={field.id} updateValue={updateValue} />;
    
    case 'radio':
      if (field.name === 'fixedDeliveryType' || field.description?.includes('حقل نوع التوصيل الثابت')) {
        if (shippingProviderSettings) {
          if (shippingProviderSettings.is_home_delivery_enabled === true && 
              shippingProviderSettings.is_desk_delivery_enabled === false) {
            return (
              <div key={field.id} className="mb-4 col-span-1 md:col-span-2">
                <label className="block text-sm font-medium mb-2 text-foreground">
                  {field.label || "طريقة التوصيل"}
                  {field.required && <span className="text-red-500 mr-1">*</span>}
                </label>
                <div className="flex items-center p-4 border border-primary rounded-lg bg-primary/10">
                  <Home className="ml-3 h-5 w-5 text-primary" />
                  <div>
                    <span className="font-medium block text-foreground">توصيل للمنزل</span>
                    <span className="text-xs text-muted-foreground block mt-1">سيتم توصيل الطلب إلى عنوانك</span>
                    {shippingProviderSettings?.is_free_delivery_home ? (
                      <span className="text-xs text-green-600 font-medium block mt-1">شحن مجاني!</span>
                    ) : (
                      <span className="text-xs text-blue-600 font-medium block mt-1">
                        سعر الشحن: {shippingProviderSettings?.unified_home_price || 0} دج
                      </span>
                    )}
                  </div>
                </div>
                <input type="hidden" name={field.name} value="home" />
                {field.description && (
                  <p className="mt-2 text-xs text-muted-foreground">{field.description}</p>
                )}
              </div>
            );
          } else if (shippingProviderSettings.is_home_delivery_enabled === false && 
                     shippingProviderSettings.is_desk_delivery_enabled === true) {
            return (
              <div key={field.id} className="mb-4 col-span-1 md:col-span-2">
                <label className="block text-sm font-medium mb-2 text-foreground">
                  {field.label || "طريقة التوصيل"}
                  {field.required && <span className="text-red-500 mr-1">*</span>}
                </label>
                <div className="flex items-center p-4 border border-primary rounded-lg bg-primary/10">
                  <Building className="ml-3 h-5 w-5 text-primary" />
                  <div>
                    <span className="font-medium block text-foreground">استلام من مكتب شركة التوصيل</span>
                    <span className="text-xs text-muted-foreground block mt-1">استلام الطلب من مكتب شركة التوصيل</span>
                    {shippingProviderSettings?.is_free_delivery_desk ? (
                      <span className="text-xs text-green-600 font-medium block mt-1">شحن مجاني!</span>
                    ) : (
                      <span className="text-xs text-blue-600 font-medium block mt-1">
                        سعر الشحن: {shippingProviderSettings?.unified_desk_price || 0} دج
                      </span>
                    )}
                  </div>
                </div>
                <input type="hidden" name={field.name} value="desk" />
                {field.description && (
                  <p className="mt-2 text-xs text-muted-foreground">{field.description}</p>
                )}
              </div>
            );
          }
        }
        
        return (
          <DeliveryTypeField
            key={field.id}
            field={field}
            extendedFields={extendedFields}
            setExtendedFields={setExtendedFields}
            setValue={setValue}
            recalculateAndSetDeliveryPrice={recalculateAndSetDeliveryPrice}
            handleProvinceChange={handleProvinceChange} // Pass this down if DeliveryTypeField needs it
            updateValue={updateValue}
            shippingProviderSettings={shippingProviderSettings}
          />
        );
      }
      
      return (
        <RadioField 
          key={field.id}
          field={field} 
          setExtendedFields={setExtendedFields}
          extendedFields={extendedFields}
          recalculateAndSetDeliveryPrice={recalculateAndSetDeliveryPrice}
          updateValue={updateValue}
          // Pass shippingProviderSettings only if it's a fixedDeliveryType, otherwise undefined
          shippingProviderSettings={field.name === 'fixedDeliveryType' ? shippingProviderSettings : undefined}
        />
      );
    
    case 'checkbox':
      return <CheckboxField field={field} key={field.id} />;
    
    case 'province':
      return (
        <ProvinceField 
          key={field.id}
          field={field} 
          handleProvinceChange={handleProvinceChange}
          updateValue={updateValue}
        />
      );

    case 'municipality':
      return (
        <MunicipalityField 
          key={field.id}
          field={field}
          recalculateAndSetDeliveryPrice={recalculateAndSetDeliveryPrice}
          setValue={setValue}
          setExtendedFields={setExtendedFields}
          extendedFields={extendedFields}
          updateValue={updateValue}
        />
      );

    // This case might be redundant if 'fixedDeliveryType' (radio) handles all delivery type selections
    // Or if a 'select' field with name 'deliveryOption' is used when both delivery types are available
    case 'deliveryType': 
        // This specific rendering for a select field of type 'deliveryType' might be part of the 'select' case
        // or handled by DeliveryTypeField if it's meant to be a more complex component.
        // For simplicity, if it's a simple select, it's handled by the 'select' case above.
        // If it is handled by fixedDeliveryType, then this specific case might not be hit if fixedDeliveryType is always present.
        console.log("Rendering deliveryType as SelectField, ensure this is intended if fixedDeliveryType exists.");
        return <SelectField field={field} key={field.id} updateValue={updateValue} />;

    default:
      return null;
  }
}; 