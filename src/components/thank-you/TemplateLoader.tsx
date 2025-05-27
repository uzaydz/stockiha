import { useState, useEffect, useRef } from "react";
import { useTenant } from "@/context/TenantContext";
import { supabase } from "@/lib/supabase";

// نفس نوع القالب الموجود في ThankYouPageEditor
import { ThankYouTemplate } from "@/pages/dashboard/ThankYouPageEditor";

// استخدام المخزن المؤقت لتخزين القوالب التي تم تحميلها
const templateCache = new Map<string, ThankYouTemplate>();

interface TemplateLoaderProps {
  productId?: string;
  onLoad: (template: ThankYouTemplate | null) => void;
}

export default function TemplateLoader({ productId, onLoad }: TemplateLoaderProps) {
  const { tenant } = useTenant();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // تجنب التحميل المتكرر باستخدام مرجع
    if (hasLoadedRef.current) {
      return;
    }

    // لا يتم تحميل أي شيء إذا لم تكن هناك معرف للمؤسسة
    if (!tenant?.id) return;

    const loadTemplate = async () => {
      // تعيين علامة التحميل لتجنب التكرار
      hasLoadedRef.current = true;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const cacheKey = `${tenant.id}:${productId || 'default'}`;
        
        // التحقق من وجود القالب في المخزن المؤقت أولاً
        if (templateCache.has(cacheKey)) {
          
          onLoad(templateCache.get(cacheKey) || null);
          setIsLoading(false);
          return;
        }

        // 1. التحقق إذا كان هناك قوالب في قاعدة البيانات (استعلام مباشر للتحسين)
        const { count, error: countError } = await supabase
          .from("thank_you_templates")
          .select("*", { count: 'exact', head: true })
          .eq("organization_id", tenant.id);
          
        if (countError) {
        } else {

          // إذا لم تكن هناك قوالب على الإطلاق، استخدم القالب الافتراضي مباشرة
          if (count === 0) {
            const fallbackTemplate = createFallbackTemplate(tenant.id);
            templateCache.set(cacheKey, fallbackTemplate);
            onLoad(fallbackTemplate);
            setIsLoading(false);
            return;
          }
        }
        
        let specificTemplate = null;
        
        // إذا كان هناك معرف للمنتج، نحاول تحميل قالب مخصص له
        if (productId) {

          try {
            // تحسين الاستعلام لجلب جميع القوالب المخصصة في استعلام واحد
            const { data: templates, error } = await supabase
              .from("thank_you_templates")
              .select("*")
              .eq("organization_id", tenant.id)
              .eq("is_active", true)
              .eq("applies_to", "specific_products");
              
            if (error) {
            } else if (templates && templates.length > 0) {

              // البحث يدويًا عن القالب الذي يحتوي على معرف المنتج في المصفوفة
              specificTemplate = templates.find(template => 
                template.product_ids && 
                Array.isArray(template.product_ids) && 
                template.product_ids.includes(productId)
              );
              
              if (specificTemplate) {
                
                templateCache.set(cacheKey, specificTemplate);
                onLoad(specificTemplate);
                setIsLoading(false);
                return;
              } else {
                
              }
            } else {
              
            }
          } catch (specificError) {
          }

        }
        
        // 2. البحث عن القالب الافتراضي
        const { data: defaultTemplate, error: defaultError } = await supabase
          .from("thank_you_templates")
          .select("*")
          .eq("organization_id", tenant.id)
          .eq("is_active", true)
          .eq("applies_to", "all_products")
          .limit(1)
          .maybeSingle();
        
        if (defaultError) {
        }
        
        // 3. إذا وجدنا قالب افتراضي
        if (defaultTemplate) {
          
          templateCache.set(`${tenant.id}:default`, defaultTemplate);
          onLoad(defaultTemplate);
        } else {

          // 4. في حالة عدم وجود أي قالب، نستخدم القالب الافتراضي المضمّن
          const fallbackTemplate = createFallbackTemplate(tenant.id);
          templateCache.set(cacheKey, fallbackTemplate);
          onLoad(fallbackTemplate);
        }
        
      } catch (err) {
        setError("حدث خطأ أثناء تحميل قالب صفحة الشكر");
        // استخدام القالب الافتراضي في حالة حدوث خطأ
        const fallbackTemplate = createFallbackTemplate(tenant.id);
        onLoad(fallbackTemplate);
      } finally {
        setIsLoading(false);
      }
    };

    loadTemplate();
  }, [tenant?.id, productId, onLoad]);

  // هذا المكون لا يعرض أي شيء في الواجهة
  return null;
}

// دالة لإنشاء قالب افتراضي
function createFallbackTemplate(organizationId: string): ThankYouTemplate {
  return {
    name: "القالب الافتراضي",
    organization_id: organizationId,
    layout_type: "standard",
    color_scheme: "primary",
    content: {
      header: {
        title: "شكرًا لطلبك!",
        subtitle: "تم استلام طلبك بنجاح وسنعمل على معالجته في أقرب وقت"
      },
      features: {
        showOrderDetails: true,
        showShippingDetails: true,
        showContactSupport: true,
        showRelatedProducts: false,
        showSocialSharing: false,
        showLoyaltyPoints: false,
        showDiscount: false
      },
      call_to_action: {
        primary: {
          text: "العودة للتسوق",
          action: "/"
        },
        secondary: {
          text: "طباعة معلومات الطلب",
          action: "print"
        }
      },
      custom_sections: [],
      footer_text: "إذا كان لديك أي استفسار، يمكنك التواصل معنا عبر الهاتف أو البريد الإلكتروني"
    },
    is_active: true,
    is_default: true,
    applies_to: "all_products"
  };
}
