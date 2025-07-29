import { useState, useEffect, useCallback } from "react";
import { useTenant } from "@/context/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { getOrganizationSettings, updateOrganizationSettings } from "@/lib/api/settings";
import type { OrganizationSettings } from "@/types/settings";

export const useOrganizationSettings = () => {
  const { currentOrganization } = useTenant();
  const { toast } = useToast();
  
  const [organizationSettings, setOrganizationSettings] = useState<OrganizationSettings | null>(null);
  const [autoDeductInventory, setAutoDeductInventory] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [updatingSettings, setUpdatingSettings] = useState(false);

  // تحميل إعدادات المؤسسة
  useEffect(() => {
    const loadOrganizationSettings = async () => {
      if (!currentOrganization?.id) {
        setLoadingSettings(false);
        return;
      }

      // مسح الكاش أولاً لضمان الحصول على أحدث البيانات
      try {
        if (typeof window !== 'undefined' && (window as any).clearOrganizationUnifiedCache) {
          (window as any).clearOrganizationUnifiedCache(currentOrganization.id);
        }
      } catch (cacheError) {
        // تجاهل أخطاء الكاش
      }

      try {
        const settings = await getOrganizationSettings(currentOrganization.id);
        
        setOrganizationSettings(settings);
        
        // استخراج إعداد خصم المخزون التلقائي من custom_js مع معالجة أفضل
        let autoDeductValue = false;

        if (settings?.custom_js) {
          try {
            let customJs;
            if (typeof settings.custom_js === 'string') {
              customJs = JSON.parse(settings.custom_js);
            } else {
              customJs = settings.custom_js;
            }

            // التحقق من وجود إعداد خصم المخزون التلقائي
            if (customJs && typeof customJs === 'object' && 'auto_deduct_inventory' in customJs) {
              autoDeductValue = customJs.auto_deduct_inventory === true;
            }
          } catch (error) {
            autoDeductValue = false;
          }
            } else {
          autoDeductValue = false;
        }
        
        setAutoDeductInventory(autoDeductValue);
        
      } catch (error) {
        toast({
          variant: "destructive",
          title: "خطأ في تحميل الإعدادات",
          description: "حدث خطأ أثناء تحميل إعدادات المؤسسة",
        });
        setAutoDeductInventory(false);
      } finally {
        setLoadingSettings(false);
      }
    };

    loadOrganizationSettings();
  }, [currentOrganization?.id, toast]);

  // دالة تحديث إعداد خصم المخزون التلقائي
  const handleToggleAutoDeductInventory = useCallback(async (enabled: boolean) => {
    if (!currentOrganization?.id) {
      return;
    }

    setUpdatingSettings(true);
    
    try {
      // استخراج البيانات الموجودة من custom_js مع معالجة أفضل للأخطاء
      let customJs: any = {
        trackingPixels: {
          facebook: { enabled: false, pixelId: '' },
          tiktok: { enabled: false, pixelId: '' },
          snapchat: { enabled: false, pixelId: '' },
          google: { enabled: false, pixelId: '' }
        }
      };

      if (organizationSettings?.custom_js) {
        try {
          if (typeof organizationSettings.custom_js === 'string') {
            customJs = JSON.parse(organizationSettings.custom_js);
          } else {
            customJs = organizationSettings.custom_js;
          }
        } catch (error) {
          // تجاهل أخطاء تحليل JSON واستخدام القيم الافتراضية
        }
      }

      // تحديث إعداد خصم المخزون التلقائي
      const updatedCustomJs = {
        ...customJs,
        auto_deduct_inventory: enabled
      };

      // تحديث الإعدادات في قاعدة البيانات
      const updatedSettings = await updateOrganizationSettings(currentOrganization.id, {
        custom_js: JSON.stringify(updatedCustomJs)
      });

      if (updatedSettings) {
        // مسح التخزين المؤقت للإعدادات
        try {
          // مسح cache من UnifiedRequestManager
          if (typeof window !== 'undefined' && (window as any).clearOrganizationUnifiedCache) {
            (window as any).clearOrganizationUnifiedCache(currentOrganization.id);
          }
        } catch (cacheError) {
          // تجاهل أخطاء الكاش
        }

        // تحديث الحالة المحلية
        setOrganizationSettings(updatedSettings);
        setAutoDeductInventory(enabled);

        toast({
          title: enabled ? "تم تفعيل خصم المخزون التلقائي" : "تم إلغاء خصم المخزون التلقائي",
          description: enabled 
            ? "سيتم خصم المخزون تلقائياً عند إنشاء الطلبيات الجديدة"
            : "لن يتم خصم المخزون تلقائياً، ستحتاج لتأكيد الطلبيات يدوياً",
          className: enabled ? "bg-green-100 border-green-400 text-green-700" : undefined,
        });

        // إعادة تحميل الإعدادات للتأكد من الحفظ
        setTimeout(async () => {
          try {
            const reloadedSettings = await getOrganizationSettings(currentOrganization.id);
            if (reloadedSettings?.custom_js) {
              const parsedJs = JSON.parse(reloadedSettings.custom_js);
              const actualValue = parsedJs?.auto_deduct_inventory === true;
              
              if (actualValue !== enabled) {
                setAutoDeductInventory(actualValue);
              }
            }
          } catch (error) {
            // تجاهل أخطاء إعادة التحميل
          }
        }, 1000);
      } else {
        toast({
          variant: "destructive",
          title: "خطأ في التحديث",
          description: "فشل في حفظ الإعدادات، يرجى المحاولة مرة أخرى",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "خطأ في التحديث",
        description: "حدث خطأ أثناء تحديث إعدادات خصم المخزون التلقائي",
      });
    } finally {
      setUpdatingSettings(false);
    }
  }, [currentOrganization?.id, organizationSettings, toast]);

  return {
    organizationSettings,
    autoDeductInventory,
    loadingSettings,
    updatingSettings,
    handleToggleAutoDeductInventory,
  };
};
