import { useState, useEffect, useRef } from "react";
import { useTenant } from "@/context/TenantContext";
import { useProductPageOrganization } from "@/context/ProductPageContext";
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
  // محاولة الحصول على معلومات المؤسسة من مصادر متعددة
  const tenantFromContext = useTenant();
  const organizationFromProduct = useProductPageOrganization();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  // تحديد معرف المؤسسة من أي مصدر متاح
  const organizationId = tenantFromContext?.tenant?.id || organizationFromProduct?.id || null;

  useEffect(() => {
    // تجنب التحميل المتكرر باستخدام مرجع
    if (hasLoadedRef.current) {
      return;
    }

    // إذا لم نجد معرف المؤسسة من أي مصدر، نحاول استخراجه من الـ subdomain
    const getOrganizationIdFromDomain = async (): Promise<string | null> => {
      if (organizationId) {
        return organizationId;
      }

      // محاولة استخراج معرف المؤسسة من النطاق الفرعي
      const hostname = window.location.hostname;
      let subdomain = null;

      if (hostname.includes('localhost')) {
        const parts = hostname.split('.');
        if (parts.length > 1 && !hostname.startsWith('www.')) {
          subdomain = parts[0];
        }
      } else if (hostname.includes('stockiha.com') || hostname.includes('ktobi.online')) {
        const parts = hostname.split('.');
        if (parts.length > 2 && parts[0] !== 'www') {
          subdomain = parts[0];
        }
      }

      if (subdomain) {
        console.log('🔍 [TemplateLoader] البحث عن المؤسسة باستخدام subdomain:', subdomain);
        try {
          const { data, error } = await supabase
            .from('organizations')
            .select('id')
            .eq('subdomain', subdomain)
            .maybeSingle();

          if (error) {
            console.error('❌ [TemplateLoader] خطأ في البحث عن المؤسسة:', error);
            return null;
          }

          if (data) {
            console.log('✅ [TemplateLoader] تم العثور على المؤسسة:', data.id);
            return data.id;
          }
        } catch (err) {
          console.error('❌ [TemplateLoader] خطأ في الاستعلام:', err);
        }
      }

      return null;
    };

    const loadTemplate = async () => {
      // تعيين علامة التحميل لتجنب التكرار
      hasLoadedRef.current = true;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const finalOrganizationId = await getOrganizationIdFromDomain();
        
        if (!finalOrganizationId) {
          console.log('⚠️ [TemplateLoader] لم يتم العثور على معرف المؤسسة - استخدام القالب الافتراضي');
          const fallbackTemplate = createFallbackTemplate('unknown');
          onLoad(fallbackTemplate);
          setIsLoading(false);
          return;
        }

        console.log('🎯 [TemplateLoader] تحميل القالب للمؤسسة:', finalOrganizationId);

        const cacheKey = `${finalOrganizationId}:${productId || 'default'}`;
        
        // التحقق من وجود القالب في المخزن المؤقت أولاً
        if (templateCache.has(cacheKey)) {
          console.log('🚀 [TemplateLoader] استخدام القالب من الكاش');
          onLoad(templateCache.get(cacheKey) || null);
          setIsLoading(false);
          return;
        }

        // باقي المنطق كما هو...
        // 1. التحقق إذا كان هناك قوالب في قاعدة البيانات
        const { count, error: countError } = await supabase
          .from("thank_you_templates")
          .select("*", { count: 'exact', head: true })
          .eq("organization_id", finalOrganizationId);
          
        if (countError) {
          console.error('❌ [TemplateLoader] خطأ في عد القوالب:', countError);
        } else {
          // إذا لم تكن هناك قوالب على الإطلاق، استخدم القالب الافتراضي مباشرة
          if (count === 0) {
            console.log('📝 [TemplateLoader] لا توجد قوالب - استخدام القالب الافتراضي');
            const fallbackTemplate = createFallbackTemplate(finalOrganizationId);
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
              .eq("organization_id", finalOrganizationId)
              .eq("is_active", true)
              .eq("applies_to", "specific_products");
              
            if (error) {
              console.error('❌ [TemplateLoader] خطأ في جلب القوالب المخصصة:', error);
            } else if (templates && templates.length > 0) {
              // البحث يدويًا عن القالب الذي يحتوي على معرف المنتج في المصفوفة
              specificTemplate = templates.find(template => 
                template.product_ids && 
                Array.isArray(template.product_ids) && 
                template.product_ids.includes(productId)
              );
              
              if (specificTemplate) {
                console.log('✅ [TemplateLoader] تم العثور على قالب مخصص للمنتج');
                templateCache.set(cacheKey, specificTemplate as ThankYouTemplate);
                onLoad(specificTemplate as ThankYouTemplate);
                setIsLoading(false);
                return;
              }
            }
          } catch (specificError) {
            console.error('❌ [TemplateLoader] خطأ في البحث عن القالب المخصص:', specificError);
          }
        }
        
        // 2. البحث عن القالب الافتراضي
        const { data: defaultTemplate, error: defaultError } = await supabase
          .from("thank_you_templates")
          .select("*")
          .eq("organization_id", finalOrganizationId)
          .eq("is_active", true)
          .eq("applies_to", "all_products")
          .limit(1)
          .maybeSingle();
        
        if (defaultError) {
          console.error('❌ [TemplateLoader] خطأ في جلب القالب الافتراضي:', defaultError);
        }
        
        // 3. إذا وجدنا قالب افتراضي
        if (defaultTemplate) {
          console.log('✅ [TemplateLoader] تم العثور على قالب افتراضي');
          templateCache.set(`${finalOrganizationId}:default`, defaultTemplate as ThankYouTemplate);
          onLoad(defaultTemplate as ThankYouTemplate);
        } else {
          // 4. في حالة عدم وجود أي قالب، نستخدم القالب الافتراضي المضمّن
          console.log('📝 [TemplateLoader] استخدام القالب المضمن');
          const fallbackTemplate = createFallbackTemplate(finalOrganizationId);
          templateCache.set(cacheKey, fallbackTemplate);
          onLoad(fallbackTemplate);
        }
        
      } catch (err) {
        console.error('💥 [TemplateLoader] خطأ عام:', err);
        setError("حدث خطأ أثناء تحميل قالب صفحة الشكر");
        // استخدام القالب الافتراضي في حالة حدوث خطأ
        const fallbackTemplate = createFallbackTemplate('unknown');
        onLoad(fallbackTemplate);
      } finally {
        setIsLoading(false);
      }
    };

    loadTemplate();
  }, [organizationId, productId, onLoad]);

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
