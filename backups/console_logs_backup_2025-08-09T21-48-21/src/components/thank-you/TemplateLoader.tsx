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
  initialTemplate?: ThankYouTemplate | null;
}

export default function TemplateLoader({ productId, onLoad, initialTemplate }: TemplateLoaderProps) {
  // محاولة الحصول على معلومات المؤسسة من مصادر متعددة
  const tenantFromContext = useTenant();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  // تحديد معرف المؤسسة من أي مصدر متاح
  const organizationId = tenantFromContext?.tenant?.id || null;

  useEffect(() => {
    // إذا تم تمرير قالب جاهز من خارج المكون، لا نقوم بأي استدعاءات
    if (initialTemplate && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      onLoad(initialTemplate);
      setIsLoading(false);
      return;
    }
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
        try {
          const { data, error } = await supabase
            .from('organizations')
            .select('id')
            .eq('subdomain', subdomain)
            .maybeSingle();

          if (error) {
            return null;
          }

          if (data) {
            return data.id;
          }
        } catch (err) {
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
          const fallbackTemplate = createFallbackTemplate('unknown');
          onLoad(fallbackTemplate);
          setIsLoading(false);
          return;
        }

        const cacheKey = `${finalOrganizationId}:${productId || 'default'}`;
        
        // التحقق من وجود القالب في المخزن المؤقت أولاً
        if (templateCache.has(cacheKey)) {
          onLoad(templateCache.get(cacheKey) || null);
          setIsLoading(false);
          return;
        }

        // طلب واحد مدمج: يفضّل القالب الخاص بالمنتج ثم العام، ويعيد صفاً واحداً فقط
        // ملاحظة: نستخدم or مع cs (contains) لنفس نتيجة contains('product_ids', [productId])
        const orFilter = productId
          ? `and(applies_to.eq.specific_products,product_ids.cs.{${productId}}),and(applies_to.eq.all_products)`
          : `and(applies_to.eq.all_products)`;

        const { data: templates, error: tplErr } = await supabase
          .from('thank_you_templates')
          .select('*')
          .eq('organization_id', finalOrganizationId)
          .eq('is_active', true)
          .or(orFilter)
          .order('applies_to', { ascending: false }) // specific_products قبل all_products
          .limit(1);

        const chosenTemplate = Array.isArray(templates) && templates.length > 0
          ? (templates[0] as unknown as ThankYouTemplate)
          : null;

        if (chosenTemplate) {
          templateCache.set(cacheKey, chosenTemplate);
          onLoad(chosenTemplate);
        } else {
          const fallbackTemplate = createFallbackTemplate(finalOrganizationId);
          templateCache.set(cacheKey, fallbackTemplate);
          onLoad(fallbackTemplate);
        }
        
      } catch (err) {
        setError("حدث خطأ أثناء تحميل قالب صفحة الشكر");
        // استخدام القالب الافتراضي في حالة حدوث خطأ
        const fallbackTemplate = createFallbackTemplate('unknown');
        onLoad(fallbackTemplate);
      } finally {
        setIsLoading(false);
      }
    };

    loadTemplate();
  }, [organizationId, productId, onLoad, initialTemplate]);

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
