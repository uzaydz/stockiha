import { useRef, useEffect, useCallback } from "react";
import { debounce } from "lodash-es";
import { supabase } from "@/lib/supabase-client";
import type { OrderFormValues, AbandonedCartPayload, ActiveOfferData } from "../OrderFormTypes";
import type { UseFormReturn } from "react-hook-form";

export const useAbandonedCartLogic = (
  form: UseFormReturn<OrderFormValues, any, OrderFormValues>,
  tenantId: string | undefined,
  productId: string | null | undefined,
  productColorId: string | null | undefined,
  productSizeId: string | null | undefined,
  currentDeliveryFee: number,
  subtotal: number,
  discountAmount: number,
  hasFreeShipping: boolean,
  activeOffer: ActiveOfferData | null | undefined
) => {
  const lastSavedCartRef = useRef<string>("");
  const previousFormValuesRef = useRef<Partial<OrderFormValues>>({});
  const changeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveTimeRef = useRef<number>(0);

  const debouncedSaveAbandonedCart = useCallback(
    debounce(async (formData: OrderFormValues, currentCustomFieldsData?: Record<string, string>) => {
      if (!tenantId || !formData.phone || formData.phone.length < 8) {
        return;
      }

      const payload: AbandonedCartPayload = {
        organization_id: tenantId,
        customer_phone: formData.phone,
        customer_name: formData.fullName || undefined,
        customer_email: formData.email || undefined,
        province: formData.province || undefined,
        municipality: formData.municipality || undefined,
        address: formData.address || undefined,
        delivery_option: formData.deliveryOption || undefined,
        payment_method: formData.paymentMethod || undefined,
        notes: formData.notes || undefined,
        quantity: formData.quantity || 1,
        product_id: productId || null,
        product_color_id: productColorId || null,
        product_size_id: productSizeId || null,
        custom_fields_data: currentCustomFieldsData,
        calculated_delivery_fee: currentDeliveryFee,
        subtotal: subtotal,
        discount_amount: discountAmount,
        total_amount: subtotal - discountAmount + (hasFreeShipping ? 0 : currentDeliveryFee),
      };

      Object.keys(payload).forEach((key) => {
        if ((payload as any)[key] === undefined) {
          delete (payload as any)[key];
        }
      });

      const payloadAsString = JSON.stringify(payload);
      if (payloadAsString === lastSavedCartRef.current) {
        return;
      }
      lastSavedCartRef.current = payloadAsString;

      try {
        const functionUrl = `${import.meta.env.VITE_SUPABASE_URL || ""}/functions/v1/save-abandoned-cart`;
        let accessToken = "";
        try {
          const { data: { session } } = await supabase.auth.getSession();
          accessToken = session?.access_token || "";
        } catch (e) {
          console.error("Error getting access token:", e);
        }

        const response = await fetch(functionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: payloadAsString,
        });

        if (!response.ok) {
          let errorData = { message: `HTTP error! status: ${response.status}` };
          try {
            const jsonError = await response.json();
            errorData = { ...jsonError, message: jsonError.error || jsonError.message || `HTTP error! status: ${response.status}` };
          } catch (e) {
            errorData.message = response.statusText || errorData.message;
          }
          console.error("Error saving abandoned cart:", errorData);
        } else {
          // const data = await response.json(); // Optional: process success response
        }
      } catch (invokeError) {
        console.error("Exception invoking Supabase function with fetch:", invokeError);
      }
    }, 3000),
    [tenantId, productId, productColorId, productSizeId, currentDeliveryFee, subtotal, discountAmount, hasFreeShipping]
  );

  const handlePhoneBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const phone = event.target.value;
    if (phone && phone.length >= 8 && tenantId) {
      const currentValues = form.getValues();
      lastSaveTimeRef.current = Date.now();
      setTimeout(() => {
        debouncedSaveAbandonedCart(currentValues, currentValues.customFields);
      }, 300);
    }
  };

  const handleTextFieldBlur = (fieldName: string, event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (fieldName === "fullName") {
      const currentValues = form.getValues();
      if (currentValues.fullName && currentValues.fullName.length > 0 && tenantId) {
        if (currentValues.phone && currentValues.phone.length >= 8) {
          lastSaveTimeRef.current = Date.now();
          setTimeout(() => {
            debouncedSaveAbandonedCart(currentValues, currentValues.customFields);
          }, 300);
        }
      }
    }
  };

  const watchedValues = form.watch();

  useEffect(() => {
    const phone = watchedValues.phone;
    if (phone && phone.length >= 8 && tenantId) {
      if (changeTimerRef.current) {
        clearTimeout(changeTimerRef.current);
      }

      const now = Date.now();
      const minTimeBetweenSaves = 3000;
      let significantChanges = false;

      const importantFields: (keyof OrderFormValues)[] = ["fullName", "phone", "province", "municipality", "address"];
      for (const field of importantFields) {
        if (field === "fullName" && typeof watchedValues[field] === 'string' && typeof previousFormValuesRef.current[field] === 'string' && previousFormValuesRef.current[field]) {
          const prevLength = (previousFormValuesRef.current[field] as string).length;
          const currLength = (watchedValues[field] as string).length;
          if (Math.abs(prevLength - currLength) < 3) {
            continue;
          }
        }
        if (watchedValues[field] !== previousFormValuesRef.current[field]) {
          significantChanges = true;
          break;
        }
      }

      previousFormValuesRef.current = { ...watchedValues };

      if (significantChanges && now - lastSaveTimeRef.current > minTimeBetweenSaves) {
        changeTimerRef.current = setTimeout(() => {
          debouncedSaveAbandonedCart(watchedValues, watchedValues.customFields);
          lastSaveTimeRef.current = Date.now();
        }, 500);
      }
    }
  }, [watchedValues, tenantId, debouncedSaveAbandonedCart]);

  return {
    handlePhoneBlur,
    handleTextFieldBlur,
  };
}; 