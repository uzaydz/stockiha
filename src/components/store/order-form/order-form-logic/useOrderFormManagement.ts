import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTenant } from "@/context/TenantContext";
import { useNavigate } from "react-router-dom";
import { orderFormSchema, OrderFormValues, Wilaya, Commune } from "../OrderFormTypes";
import { getProvinces } from "@/api/yalidine/service";
import { shippingSettingsService } from "@/api/shippingSettingsService";
import { ShippingProvider } from "@/api/shippingService";
import { getShippingMunicipalities } from "@/api/product-page";

export const useOrderFormManagement = (
  defaultValues: Partial<OrderFormValues>,
  shippingProviderId: string | number | null
) => {
  const { tenant } = useTenant();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formReady, setFormReady] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // إضافة حالات جديدة للولايات والبلديات
  const [wilayasList, setWilayasList] = useState<Wilaya[]>([]);
  const [communesList, setCommunesList] = useState<Commune[]>([]);
  const [isLoadingWilayas, setIsLoadingWilayas] = useState(false);
  const [isLoadingCommunes, setIsLoadingCommunes] = useState(false);
  const [shippingProviderSettings, setShippingProviderSettings] = useState<any>(null);
  const [yalidineCentersList, setYalidineCentersList] = useState<any[]>([]);
  const [isLoadingYalidineCenters, setIsLoadingYalidineCenters] = useState(false);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      ...defaultValues,
      deliveryCompany: shippingProviderId ? String(shippingProviderId) : "yalidine",
    },
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  // تحميل الولايات عند تهيئة النموذج
  useEffect(() => {
    const loadProvinces = async () => {
      setIsLoadingWilayas(true);
      try {
        const provinces = await getProvinces();
        setWilayasList(provinces.map(p => ({
          id: p.id,
          name: p.name,
          zone: 0,
          is_deliverable: true
        })));
      } catch (error) {
      } finally {
        setIsLoadingWilayas(false);
      }
    };

    loadProvinces();
  }, []);

  // تحميل إعدادات مزود الشحن
  useEffect(() => {
    const loadShippingSettings = async () => {
      if (!tenant?.id || !shippingProviderId) return;

      try {
        const providerCode = await shippingSettingsService.getProviderCodeById(Number(shippingProviderId));
        if (providerCode) {
          const settings = await shippingSettingsService.getProviderSettings(tenant.id, providerCode);
          setShippingProviderSettings(settings);
        }
      } catch (error) {
      }
    };

    loadShippingSettings();
  }, [tenant?.id, shippingProviderId]);

  // دالة لتحميل البلديات عند اختيار ولاية
  const handleWilayaChange = async (wilayaId: string) => {
    if (!tenant?.id) return;
    
    setIsLoadingCommunes(true);
    try {
      
      // استخدم دائمًا getShippingMunicipalities من api/product-page لتحميل البلديات
      // هذا سيضمن عرض البلديات دائمًا بغض النظر عن شركة الشحن
      const municipalities = await getShippingMunicipalities(Number(wilayaId), tenant.id);
      
      setCommunesList(municipalities.map(m => ({
        id: m.id,
        name: m.name,
        wilaya_id: m.wilaya_id,
        has_stop_desk: false,
        is_deliverable: true,
        delivery_time_parcel: 24,
        delivery_time_payment: 48
      })));
    } catch (error) {
    } finally {
      setIsLoadingCommunes(false);
    }
  };

  return {
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
    setFormReady,
    wilayasList,
    communesList,
    isLoadingWilayas,
    isLoadingCommunes,
    handleWilayaChange,
    shippingProviderSettings,
    yalidineCentersList,
    isLoadingYalidineCenters,
  };
};
