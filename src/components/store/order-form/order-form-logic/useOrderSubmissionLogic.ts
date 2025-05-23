import { useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase-client";
import { submitOrderForm } from "../index"; // Assuming index.ts exports this
import { getProductNameById } from "@/api/store";
import type { OrderFormValues, CustomFormField, ActiveOfferData } from "../OrderFormTypes"; // Adjusted
import type { UseFormReturn } from "react-hook-form";
import type { NavigateFunction } from "react-router-dom";

export const useOrderSubmissionLogic = (
  form: UseFormReturn<OrderFormValues, any, OrderFormValues>,
  tenantId: string | undefined,
  productId: string | null | undefined,
  productColorId: string | null | undefined,
  productSizeId: string | null | undefined,
  sizeName: string | null | undefined,
  basePrice: number,
  quantity: number,
  currentDeliveryFee: number,
  activeOffer: ActiveOfferData | null | undefined,
  discountAmount: number, // from useOrderCalculations
  hasFreeShipping: boolean, // from useOrderCalculations
  visibleCustomFields: CustomFormField[],
  yalidineCentersList: any[],
  shippingCloneId: string | number | null,
  formSettings: any, // Consider a more specific type
  getAppropriateShippingId: (selectedProvider: string | null) => string | number | null, // from useShippingLogic
  isSubmitting: boolean, // from useOrderFormManagement
  setIsSubmitting: (isSubmitting: boolean) => void, // from useOrderFormManagement
  orderNumber: string | null, // from useOrderFormManagement
  setOrderNumber: (orderNumber: string | null) => void, // from useOrderFormManagement
  setError: (error: string | null) => void, // from useOrderFormManagement
  navigate: NavigateFunction, // from useOrderFormManagement
  shippingProviderSettings: any | null, // Added shippingProviderSettings
  getMunicipalityName: (municipality: string) => string | undefined // Added getMunicipalityName
) => {

  const getFieldLabel = useCallback((fieldName: string, fields: CustomFormField[] = visibleCustomFields) => {
    const field = fields.find(f => f.name === fieldName);
    if (field) return field.label;
    const defaultLabels: Record<string, string> = {
      fullName: "الاسم الكامل",
      phone: "رقم الهاتف",
      province: "الولاية",
      municipality: "البلدية",
      address: "العنوان",
      deliveryOption: "نوع التوصيل",
      deliveryCompany: "شركة التوصيل",
      paymentMethod: "طريقة الدفع",
      stopDeskId: "مكتب الاستلام",
    };
    return defaultLabels[fieldName] || fieldName;
  }, [visibleCustomFields]);

  const debugAddStopDeskIdIfMissing = useCallback(async () => {
    if (visibleCustomFields && visibleCustomFields.length > 0) {
      const deliveryOption = form.getValues("deliveryOption");
      if (deliveryOption === "desk") {
        const stopDeskId = form.getValues("stopDeskId");
        if (!stopDeskId) {
          const provinceId = form.getValues("province");
          const municipalityId = form.getValues("municipality");
          if (provinceId && municipalityId) {
            try {
              const { data: centers, error } = await supabase
                .from("yalidine_centers_global")
                .select("center_id, name")
                .eq("commune_id", Number(municipalityId))
                .eq("wilaya_id", Number(provinceId));
              if (!error && centers && centers.length > 0) {
                form.setValue("stopDeskId", centers[0].center_id.toString(), { shouldValidate: true, shouldDirty: true });
                return true;
              }
            } catch (e) { /* ignore */ }
          }
          if (yalidineCentersList && yalidineCentersList.length > 0) {
            form.setValue("stopDeskId", yalidineCentersList[0].center_id.toString(), { shouldValidate: true, shouldDirty: true });
            return true;
          }
          form.setValue("stopDeskId", "1", { shouldValidate: true, shouldDirty: true }); // Default fallback
          return false;
        }
      }
    }
    return true;
  }, [form, visibleCustomFields, yalidineCentersList]);

  const processFormSubmission = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    // نتحقق إذا كانت شركة الشحن المختارة هي ZRExpress
    const isZRExpress = shippingProviderSettings?.provider_code === 'zrexpress';
    // بغض النظر عن شركة الشحن، نريد استخدام البلديات دائمًا
    const alwaysUseMunicipality = true; // تم إضافة متغير جديد للتحكم في استخدام البلديات دائمًا

    const formValues = form.getValues();
    const requiredFields = ["fullName", "phone", "province"];
    if (formValues.deliveryOption === "home") {
      requiredFields.push("municipality", "address");
    } else if (formValues.deliveryOption === "desk") {
      // إذا كان الاستلام من المكتب، نطلب البلدية دائمًا بغض النظر عن شركة الشحن
      if (isZRExpress || alwaysUseMunicipality) {
        requiredFields.push("municipality");
      } else {
        // لم نعد نحتاج إلى هذا المنطق لأننا نستخدم البلديات دائمًا
        // أبقى عليه محمي بشرط false لتوثيق المنطق القديم
        if (false) {
          await debugAddStopDeskIdIfMissing(); // Ensure stopDeskId is set if needed
          requiredFields.push("stopDeskId");
        } else {
          requiredFields.push("municipality");
        }
      }
    }

    const missingFields = requiredFields.filter(field => !formValues[field as keyof OrderFormValues]);
    if (missingFields.length > 0) {
      setError(`يرجى ملء الحقول التالية: ${missingFields.map(field => getFieldLabel(field)).join(", ")}`);
      setIsSubmitting(false);
      return;
    }

    const selectedDeliveryCompany = formValues.deliveryCompany;
    let shippingProviderIdToUse = getAppropriateShippingId(selectedDeliveryCompany || null);
    if (shippingCloneId && !shippingProviderIdToUse && selectedDeliveryCompany !== "default_provider" && selectedDeliveryCompany !== "null") {
      shippingProviderIdToUse = shippingCloneId;
    }

    const submissionValues: Record<string, any> = {
      ...formValues,
      fullName: formValues.fullName || "زائر",
      phone: formValues.phone || "0000000000",
      province: formValues.province || "غير محدد",
      deliveryOption: formValues.deliveryOption || "home",
      form_id: formSettings?.id,
      shipping_clone_id: shippingProviderIdToUse,
    };

    if (formValues.deliveryOption === "home") {
      submissionValues.municipality = formValues.municipality || "غير محدد";
      submissionValues.address = formValues.address || "غير محدد";
    } else if (formValues.deliveryOption === "desk") {
      // بغض النظر عن شركة الشحن، دائمًا نستخدم البلدية
      submissionValues.municipality = formValues.municipality || "غير محدد";
      
      if (isZRExpress) {
        submissionValues.address = "استلام من مكتب ZR Express في " + (getMunicipalityName(formValues.municipality) || "المدينة");
      } else {
        // بالنسبة لياليدين، نستخدم البلدية أيضًا
        submissionValues.address = "استلام من مكتب في " + (getMunicipalityName(formValues.municipality) || "المدينة");
        
        // لم نعد نحتاج إلى هذا المنطق لأننا نستخدم البلديات دائمًا
        // أبقى عليه محمي بشرط false لتوثيق المنطق القديم
        if (false) {
          if (!formValues.stopDeskId) {
            setError("يرجى اختيار مكتب الاستلام");
            setIsSubmitting(false);
            return;
          }
          
          submissionValues.stop_desk_id = formValues.stopDeskId;
          const selectedCenter = yalidineCentersList.find(center => center.center_id.toString() === formValues.stopDeskId);
          if (selectedCenter) {
            submissionValues.municipality = selectedCenter.commune_id?.toString() || "غير محدد";
          }
          submissionValues.address = "استلام من مكتب ياليدين";
        }
      }
    }

    const finalDeliveryFee = hasFreeShipping ? 0 : currentDeliveryFee;
    let metadataPayload: Record<string, any> = {};
    if (activeOffer) {
      metadataPayload.applied_quantity_offer = {
        id: activeOffer.id,
        type: activeOffer.type,
        minQuantity: activeOffer.minQuantity,
        discountValue: activeOffer.discountValue || 0,
        appliedDiscountAmount: discountAmount,
        appliedFreeShipping: hasFreeShipping,
      };
    }
    
    // تعديل منطق إضافة تفاصيل التوصيل للشحن
    if (formValues.deliveryOption === "desk") {
      // بغض النظر عن شركة الشحن، دائمًا نستخدم البلدية
      metadataPayload.shipping_details = {
        delivery_type: "desk",
        provider: isZRExpress ? "zrexpress" : "yalidine",
        municipality_id: formValues.municipality,
        municipality_name: getMunicipalityName(formValues.municipality) || "غير محدد",
        wilaya_id: formValues.province,
      };
      
      // لم نعد نحتاج إلى هذا المنطق لأننا نستخدم البلديات دائمًا
      // أبقى عليه محمي بشرط false لتوثيق المنطق القديم
      if (false && !isZRExpress && formValues.stopDeskId) {
        const selectedCenter = yalidineCentersList.find(center => center.center_id.toString() === formValues.stopDeskId);
        if (selectedCenter) {
          metadataPayload.shipping_details = {
            delivery_type: "desk",
            provider: "yalidine",
            stop_desk_id: selectedCenter.center_id,
            stop_desk_name: selectedCenter.name,
            stop_desk_commune_id: selectedCenter.commune_id,
            stop_desk_wilaya_id: selectedCenter.wilaya_id,
          };
        }
      }
    }

    try {
      await submitOrderForm({
        values: submissionValues,
        organizationId: tenantId,
        productId,
        productColorId,
        productSizeId,
        sizeName: sizeName || null,
        quantity,
        price: basePrice,
        deliveryFee: finalDeliveryFee,
        metadata: metadataPayload,
        formData: submissionValues, // Pass full form data for backend processing
        onSuccess: (orderNum) => setOrderNumber(orderNum),
        onError: (msg) => setError(msg),
        onSubmitStart: () => { /* Optional: can be handled by isSubmitting */ },
        onSubmitEnd: () => setIsSubmitting(false),
      });
    } catch (e: any) {
      console.error("خطأ في إرسال النموذج:", e);
      setError(e.message || "حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.");
      setIsSubmitting(false);
    }
  }, [
    form, tenantId, productId, productColorId, productSizeId, sizeName, basePrice, quantity,
    currentDeliveryFee, activeOffer, discountAmount, hasFreeShipping, visibleCustomFields,
    yalidineCentersList, shippingCloneId, formSettings, getAppropriateShippingId,
    isSubmitting, setIsSubmitting, setError, debugAddStopDeskIdIfMissing, getFieldLabel, setOrderNumber,
    shippingProviderSettings, getMunicipalityName
  ]);

  const onSubmit = useCallback(async (values: OrderFormValues) => {
    // values from react-hook-form, but processFormSubmission uses form.getValues()
    // which should be in sync or debugAddStopDeskIdIfMissing might operate on stale data if not careful.
    // For simplicity, directly call processFormSubmission as it internally gets the latest values.
    await processFormSubmission();
  }, [processFormSubmission]);

  useEffect(() => {
    if (orderNumber && tenantId) { // Added tenantId check for safety, though navigate doesn't directly use it
      const getProductInfoAndRedirect = async () => {
        let productName = "";
        if (productId) {
          try {
            productName = await getProductNameById(productId);
          } catch (error) {
            console.error("خطأ أثناء جلب معلومات المنتج:", error);
          }
        }
        const totalPrice = basePrice * quantity - discountAmount + (hasFreeShipping ? 0 : currentDeliveryFee);
        navigate(
          `/thank-you?orderNumber=${orderNumber}&quantity=${quantity}&price=${basePrice}` +
          `&deliveryFee=${currentDeliveryFee}&totalPrice=${totalPrice}&productId=${productId || ""}` +
          `&productName=${encodeURIComponent(productName)}`
        );
      };
      getProductInfoAndRedirect();
    }
  }, [orderNumber, navigate, quantity, basePrice, currentDeliveryFee, productId, tenantId, discountAmount, hasFreeShipping]);

  return {
    processFormSubmission, // Export to be used by a direct button click
    onSubmit, // Export to be used by form's onSubmit
    getFieldLabel, // May not be needed by UI if errors are directly set with labels
    debugAddStopDeskIdIfMissing, // May not be needed directly by UI
  };
}; 