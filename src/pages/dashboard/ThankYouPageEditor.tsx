import { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useTenant } from "@/context/TenantContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

// استيراد المكونات الفرعية
import ThankYouPagePreview from "@/components/thank-you-editor/ThankYouPagePreview";
import ThankYouPageSettings from "@/components/thank-you-editor/ThankYouPageSettings";
import ThankYouPageDesignEditor from "@/components/thank-you-editor/ThankYouPageDesignEditor";
import ProductAssignment from "@/components/thank-you-editor/ProductAssignment";

// نوع البيانات للقالب
export interface ThankYouTemplate {
  id?: string;
  name: string;
  organization_id: string;
  layout_type: "standard" | "minimalist" | "elegant" | "colorful";
  color_scheme: "primary" | "success" | "info" | "custom";
  custom_colors?: {
    background: string;
    accent: string;
    text: string;
    border: string;
  };
  content: {
    header: {
      title: string;
      subtitle: string;
    };
    features: {
      showOrderDetails: boolean;
      showShippingDetails: boolean;
      showContactSupport: boolean;
      showRelatedProducts: boolean;
      showSocialSharing: boolean;
      showLoyaltyPoints: boolean;
      showDiscount: boolean;
    };
    call_to_action: {
      primary: {
        text: string;
        action: string;
      };
      secondary?: {
        text: string;
        action: string;
      };
    };
    custom_sections: Array<{
      id: string;
      title: string;
      content: string;
      type: "text" | "html" | "button";
    }>;
    footer_text: string;
  };
  is_active: boolean;
  is_default: boolean;
  applies_to: "all_products" | "specific_products";
  product_ids?: string[];
  created_at?: string;
  updated_at?: string;
}

export default function ThankYouPageEditor() {
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("settings");
  const [templates, setTemplates] = useState<ThankYouTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<ThankYouTemplate | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // استدعاء البيانات عند تحميل الصفحة
  useEffect(() => {
    if (tenant?.id) {
      loadTemplates();
    }
  }, [tenant?.id]);

  // دالة لتحميل قوالب صفحات الشكر
  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      // استدعاء قوالب صفحة الشكر من قاعدة البيانات
      const { data: templatesData, error } = await supabase
        .from("thank_you_templates")
        .select("*")
        .eq("organization_id", tenant?.id)
        .eq("is_active", true);
      
      if (error) {
        throw error;
      }
      
      console.log(`تم تحميل ${templatesData?.length || 0} قالب من قاعدة البيانات`);
      
      // إذا لم تكن هناك قوالب، قم بإنشاء قالب افتراضي
      if (!templatesData || templatesData.length === 0) {
        console.log("لا توجد قوالب، جاري إنشاء قالب افتراضي");
        
        const defaultTemplate: ThankYouTemplate = {
          name: "القالب الافتراضي",
          organization_id: tenant?.id || "",
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
          applies_to: "all_products",
          product_ids: []
        };
        
        setTemplates([defaultTemplate]);
        setActiveTemplate(defaultTemplate);
      } else {
        // حدد القالب الافتراضي أو الأول في القائمة
        const defaultTemplate = templatesData.find(t => t.is_default) || templatesData[0];
        
        setTemplates(templatesData);
        setActiveTemplate(defaultTemplate);
      }
    } catch (error) {
      console.error("Error loading thank you templates:", error);
      toast.error("حدث خطأ أثناء تحميل قوالب صفحات الشكر");
    } finally {
      setIsLoading(false);
    }
  };

  // دالة لحفظ التغييرات
  const saveChanges = async () => {
    if (!activeTemplate) return;
    
    setIsSaving(true);
    try {
      // تحضير البيانات للحفظ، مع التأكد من تنسيق product_ids بشكل صحيح
      const templateToSave = {
        ...activeTemplate,
        organization_id: tenant?.id,
        updated_at: new Date().toISOString()
      };
      
      // تأكد من أن معرفات المنتجات هي مصفوفة صالحة
      if (templateToSave.product_ids && !Array.isArray(templateToSave.product_ids)) {
        console.log("تحويل product_ids إلى مصفوفة", templateToSave.product_ids);
        templateToSave.product_ids = [templateToSave.product_ids];
      }
      
      // إذا كان القالب ينطبق على جميع المنتجات، فلا داعي لتخزين معرفات منتجات محددة
      if (templateToSave.applies_to === "all_products") {
        templateToSave.product_ids = [];
      }
      
      console.log("حفظ القالب بمعلومات المنتجات:", {
        applies_to: templateToSave.applies_to,
        productCount: templateToSave.product_ids?.length || 0
      });
      
      // قم بحفظ القالب في قاعدة البيانات
      const { data, error } = await supabase
        .from('thank_you_templates')
        .upsert(templateToSave)
        .select();

      if (error) {
        throw error;
      }
      
      toast.success("تم حفظ التغييرات بنجاح");
      setHasChanges(false);

      // تحديث المعرف إذا كان إنشاء جديد
      if (data && data.length > 0 && !activeTemplate.id) {
        setActiveTemplate({
          ...activeTemplate,
          id: data[0].id
        });
      }
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("حدث خطأ أثناء حفظ التغييرات");
    } finally {
      setIsSaving(false);
    }
  };

  // دالة لتحديث القالب النشط
  const updateActiveTemplate = (updatedTemplate: ThankYouTemplate) => {
    setActiveTemplate(updatedTemplate);
    setHasChanges(true);
  };

  // إظهار حالة التحميل
  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Helmet>
        <title>إعدادات صفحة الشكر | {tenant?.name}</title>
      </Helmet>

      <div className="container">
        <div className="space-y-2 mb-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">إعدادات صفحة الشكر</h1>
            <p className="text-sm text-muted-foreground">تخصيص تجربة العملاء بعد إتمام الشراء</p>
          </div>
          
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">قم بتخصيص شكل ومحتوى صفحة الشكر التي تظهر للعملاء بعد إتمام الطلب</p>
            
            <div className="space-x-2 flex items-center">
              {hasChanges && (
                <span className="text-sm text-amber-600 ml-2">* لديك تغييرات غير محفوظة</span>
              )}
              <button 
                className={`px-4 py-2 rounded-md ${
                  hasChanges 
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                    : 'bg-muted text-muted-foreground'
                }`}
                onClick={saveChanges}
                disabled={!hasChanges || isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin inline" />
                    جاري الحفظ...
                  </>
                ) : (
                  'حفظ التغييرات'
                )}
              </button>
            </div>
          </div>
          
          <Separator className="my-6" />
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardContent className="p-6">
              <Tabs 
                defaultValue="settings" 
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="mb-6 w-full justify-start">
                  <TabsTrigger value="settings">الإعدادات العامة</TabsTrigger>
                  <TabsTrigger value="design">التصميم والمظهر</TabsTrigger>
                  <TabsTrigger value="products">تعيين المنتجات</TabsTrigger>
                  <TabsTrigger value="preview">معاينة</TabsTrigger>
                </TabsList>
                
                <TabsContent value="settings" className="mt-0">
                  {activeTemplate && (
                    <ThankYouPageSettings 
                      template={activeTemplate} 
                      onChange={updateActiveTemplate} 
                    />
                  )}
                </TabsContent>
                
                <TabsContent value="design" className="mt-0">
                  {activeTemplate && (
                    <ThankYouPageDesignEditor 
                      template={activeTemplate} 
                      onChange={updateActiveTemplate} 
                    />
                  )}
                </TabsContent>
                
                <TabsContent value="products" className="mt-0">
                  {activeTemplate && (
                    <ProductAssignment 
                      template={activeTemplate} 
                      onChange={updateActiveTemplate} 
                    />
                  )}
                </TabsContent>
                
                <TabsContent value="preview" className="mt-0">
                  {activeTemplate && (
                    <ThankYouPagePreview template={activeTemplate} />
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
} 