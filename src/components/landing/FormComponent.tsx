import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense, lazy } from 'react';
import { useParams } from 'react-router-dom';
import { useSupabase } from '@/context/SupabaseContext';
import { useTenant } from '@/context/TenantContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  RadioGroup,
  RadioGroupItem
} from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, FileText, User, Mail, Phone, MapPin, Check, Home, Truck, ShoppingBag, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFormFields } from './hooks/useFormFields';
import { useLandingPage } from './hooks/useLandingPage';
import { FormFieldRenderer } from './FormFieldRenderer';
import { FormSuccessMessage } from './FormSuccessMessage';
import { ProductSummary } from './ProductSummary';

// قائمة الولايات الجزائرية
const PROVINCES = [
  "أدرار", "الشلف", "الأغواط", "أم البواقي", "باتنة", "بجاية", "بسكرة", "بشار", "البليدة", "البويرة",
  "تمنراست", "تبسة", "تلمسان", "تيارت", "تيزي وزو", "الجزائر", "الجلفة", "جيجل", "سطيف", "سعيدة",
  "سكيكدة", "سيدي بلعباس", "عنابة", "قالمة", "قسنطينة", "المدية", "مستغانم", "المسيلة", "معسكر",
  "ورقلة", "وهران", "البيض", "إليزي", "برج بوعريريج", "بومرداس", "الطارف", "تندوف", "تيسمسيلت",
  "الوادي", "خنشلة", "سوق أهراس", "تيبازة", "ميلة", "عين الدفلى", "النعامة", "عين تموشنت",
  "غرداية", "غليزان"
];

// قائمة البلديات لكل ولاية (مبسطة للتوضيح)
const MUNICIPALITIES: { [province: string]: string[] } = {
  "الجزائر": ["باب الوادي", "حسين داي", "بئر مراد رايس", "حيدرة", "باش جراح"],
  "وهران": ["وهران", "عين الترك", "بئر الجير", "السانية", "مرسى الحجاج"],
  "قسنطينة": ["قسنطينة", "الخروب", "حامة بوزيان", "زيغود يوسف", "ديدوش مراد"],
};

interface FormComponentProps {
  settings: Record<string, any>;
  landingPageId?: string;
}

const FormComponent: React.FC<FormComponentProps> = React.memo(({ settings, landingPageId }) => {
  const formRef = useRef<HTMLFormElement>(null);
  const { slug } = useParams<{ slug: string }>();
  const { supabase } = useSupabase();
  const { currentOrganization } = useTenant();
  
  // استخدام Hooks مخصصة للتحسين
  const { 
    formFields, 
    isFieldsLoading, 
    fetchFormFields
  } = useFormFields(settings.formId);
  
  const {
    landingPageDetails,
    fetchLandingPageDetails
  } = useLandingPage(landingPageId, slug);
  
  // الحالات
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProvinces, setSelectedProvinces] = useState<{[key: string]: string}>({});
  const [availableMunicipalities, setAvailableMunicipalities] = useState<{[key: string]: string[]}>({});
  const [productDetails, setProductDetails] = useState<any>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  
  // جلب البيانات عند تحميل المكون
  useEffect(() => {
    fetchFormFields();
    fetchLandingPageDetails();
  }, [fetchFormFields, fetchLandingPageDetails]);
  
  // جلب بيانات المنتج عند تغيير المنتج المحدد
  useEffect(() => {
    const fetchProductDetails = async () => {
      if (!settings.productId) {
        setProductDetails(null);
        return;
      }
      
      setIsLoadingProduct(true);
      
      try {
        const { data, error } = await supabase
          .from('products')
          .select(`
            id, name, description, price, compare_at_price, thumbnail_image,
            has_fast_shipping, has_money_back, has_quality_guarantee,
            fast_shipping_text, money_back_text, quality_guarantee_text
          `)
          .eq('id', settings.productId)
          .single();
          
        if (error) throw error;
        
        if (data) {
          setProductDetails(data);
        }
      } catch (error) {
      } finally {
        setIsLoadingProduct(false);
      }
    };
    
    fetchProductDetails();
  }, [settings.productId, supabase]);
  
  // معالجة الإرسال - مُحسّن
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!settings.productId || !settings.formId) {
      setError('النموذج غير مكتمل الإعداد');
      return;
    }
    
    // التحقق من صحة النموذج
    const requiredFields = formFields.filter(field => field.required);
    for (const field of requiredFields) {
      if (!formData[field.name] || formData[field.name].trim() === '') {
        setError(`حقل "${field.label}" مطلوب`);
        return;
      }
    }
    
    // التحقق من وجود معرف صفحة الهبوط
    const landing_page_id = landingPageId || (landingPageDetails ? landingPageDetails.id : null);
    
    if (!landing_page_id) {
      setError('لم يتم العثور على معرف صفحة الهبوط');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // الحصول على معرف المؤسسة
      const organization_id = landingPageDetails?.organization_id || currentOrganization?.id || null;
      
      if (!organization_id) {
        throw new Error('لم يتم العثور على معرف المؤسسة');
      }
      
      // التأكد من وجود قيمة للمدينة
      let updatedFormData = { ...formData };
      if (!updatedFormData.city) {
        updatedFormData.city = updatedFormData.municipality || updatedFormData.province || 'غير محدد';
      }
      
      // إضافة معلومات المنتج للبيانات المرسلة
      if (productDetails) {
        updatedFormData.product_name = productDetails.name;
        updatedFormData.product_price = productDetails.price;
      }
      
      // بيانات JSON
      const jsonData = {
        ...updatedFormData,
        organization_id,
        submitted_at: new Date().toISOString(),
        status: 'new'
      };
      
      // بيانات الطلب
      const submissionData = {
        landing_page_id,
        form_id: settings.formId,
        product_id: settings.productId,
        is_processed: false,
        data: jsonData
      };
      
      // محاولة الإدراج - استخدام التعويض للتقليل من الكود المكرر
      const { error: insertError } = await supabase
        .from('landing_page_submissions')
        .insert([submissionData]);
      
      if (insertError) {
        // إذا فشل الإدراج المباشر، نحاول استخدام الوظيفة المخصصة
        const { error: rpcError } = await supabase.rpc(
          'add_landing_page_submission',
          {
            p_landing_page_id: landing_page_id,
            p_form_id: settings.formId,
            p_product_id: settings.productId,
            p_data: jsonData
          }
        );
        
        if (rpcError) throw rpcError;
      }
      
      // تم الإرسال بنجاح
      setIsSubmitted(true);
      setFormData({});
      
      // إعادة تعيين النموذج
      if (formRef.current) {
        formRef.current.reset();
      }
      
    } catch (error: any) {
      
      // عرض رسالة خطأ مناسبة
      if (error.code === '42501') {
        setError('خطأ في صلاحيات الوصول. يرجى التواصل مع مدير النظام. (رمز الخطأ: RLS)');
      } else if (error.code === '23505') {
        setError('تم إرسال هذا النموذج مسبقاً.');
      } else {
        setError('حدث خطأ أثناء إرسال النموذج. يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // معالجة تغيير المدخلات
  const handleInputChange = useCallback((fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  }, []);
  
  // معالجة تغيير الولاية
  const handleProvinceChange = useCallback((province: string, fieldName: string) => {
    // تحديث الولاية المحددة
    setSelectedProvinces(prev => ({
      ...prev,
      [fieldName]: province
    }));
    
    // تحديث البلديات المتاحة
    setAvailableMunicipalities(prev => ({
      ...prev,
      [fieldName]: MUNICIPALITIES[province] || []
    }));
    
    // تحديث قيم الحقول
    setFormData(prev => ({
      ...prev,
      [fieldName]: province
    }));
    
    // إعادة تعيين أي حقل بلدية مرتبط
    const currentField = formFields.find(f => f.name === fieldName);
    if (currentField?.linkedFields && currentField.linkedFields.municipalityField) {
      const municipalityFieldName = formFields.find(f => 
        f.id === currentField.linkedFields?.municipalityField
      )?.name;
      
      if (municipalityFieldName) {
        setFormData(prev => ({
          ...prev,
          [municipalityFieldName]: ''
        }));
      }
    }
  }, [formFields]);
  
  // استخراج وتطبيق الإعدادات المتقدمة
  const advancedSettings = useMemo(() => {
    return settings.advancedSettings || {
      showIcons: false,
      fieldIconColor: '#6366f1',
      cardStyle: {
        shadow: 'md',
        borderRadius: '0.5rem',
        borderWidth: '1px',
        borderColor: '#e2e8f0'
      },
      labelStyle: {
        fontSize: '0.875rem',
        fontWeight: 'medium',
        color: '#1e293b'
      },
      inputStyle: {
        height: 'default',
        borderRadius: '0.5rem',
        borderWidth: '1px'
      },
      fieldSpacing: 20,
      formLayout: 'single',
      buttonStyle: {
        variant: 'default',
        rounded: 'md',
        fullWidth: true
      }
    };
  }, [settings.advancedSettings]);
  
  // التطبيق على أنماط العناوين من الإعدادات المتقدمة
  const labelStyles = useMemo(() => ({
    fontSize: advancedSettings.labelStyle?.fontSize || '0.875rem',
    fontWeight: advancedSettings.labelStyle?.fontWeight === 'bold' ? '700' : 
              advancedSettings.labelStyle?.fontWeight === 'medium' ? '500' : '400',
    color: advancedSettings.labelStyle?.color || '#1e293b'
  }), [advancedSettings.labelStyle]);
  
  // أنماط الإدخال
  const inputStyles = useMemo(() => ({
    borderRadius: advancedSettings.inputStyle?.borderRadius || '0.5rem',
    borderWidth: advancedSettings.inputStyle?.borderWidth || '1px'
  }), [advancedSettings.inputStyle]);
  
  // الحصول على أنماط الأيقونات المناسبة لكل نوع حقل
  const getFieldIcon = useCallback((fieldType: string) => {
    switch (fieldType) {
      case 'text':
        return <FileText className="h-4 w-4" />;
      case 'name':
      case 'firstName':
      case 'lastName':
        return <User className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'tel':
      case 'phone':
        return <Phone className="h-4 w-4" />;
      case 'province':
        return <MapPin className="h-4 w-4" />;
      case 'municipality':
        return <Home className="h-4 w-4" />;
      case 'textarea':
        return <FileText className="h-4 w-4" />;
      case 'radio':
      case 'select':
      case 'checkbox':
        return <Check className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  }, []);
  
  // تنميط الحقل بناءً على نوعه - نقل إلى مكون منفصل
  const renderField = useCallback((field: any) => {
    return (
      <FormFieldRenderer
        key={field.id || field.name}
        field={field}
        formData={formData}
        handleInputChange={handleInputChange}
        handleProvinceChange={handleProvinceChange}
        selectedProvinces={selectedProvinces}
        availableMunicipalities={availableMunicipalities}
        formFields={formFields}
        advancedSettings={advancedSettings}
        getFieldIcon={getFieldIcon}
        labelStyles={labelStyles}
        inputStyles={inputStyles}
        PROVINCES={PROVINCES}
      />
    );
  }, [
    formData, 
    handleInputChange, 
    handleProvinceChange, 
    selectedProvinces, 
    availableMunicipalities, 
    formFields, 
    advancedSettings, 
    getFieldIcon,
    labelStyles,
    inputStyles
  ]);
  
  // استخدام مذكرة لتنميط كل الحقول مرة واحدة فقط عند تغيرها
  const renderedFields = useMemo(() => {
    return formFields.map(field => renderField(field));
  }, [formFields, renderField]);
  
  // عرض التأكيد بعد الإرسال
  if (isSubmitted) {
    return (
      <FormSuccessMessage 
        backgroundColor={settings.backgroundColor}
        advancedSettings={advancedSettings}
      />
    );
  }
  
  return (
    <section 
      className="py-8" 
      style={{ backgroundColor: settings.backgroundColor || '#f9f9f9' }}
      id={`form-section-${settings.formId || 'main'}`} 
      data-section-id="form-section"
      data-form-id={settings.formId}
    >
      <div className="container mx-auto px-4">
        <Card 
          className={cn(
            "max-w-md mx-auto border",
            advancedSettings.cardStyle?.shadow,
          )}
          style={{
            borderRadius: advancedSettings.cardStyle?.borderRadius || '0.5rem',
            borderWidth: advancedSettings.cardStyle?.borderWidth || '1px',
            borderColor: advancedSettings.cardStyle?.borderColor || '#e2e8f0'
          }}
        >
          <CardContent className="p-4">
            {settings.title && (
              <h2 className="text-xl font-bold mb-4 text-center">{settings.title}</h2>
            )}
            
            {/* إضافة ملخص المنتج إذا كان محدداً */}
            {settings.productId && (
              <Suspense fallback={<div className="py-4 text-center">جاري تحميل معلومات المنتج...</div>}>
                <ProductSummary 
                  productDetails={productDetails} 
                  isLoading={isLoadingProduct}
                />
              </Suspense>
            )}
            
            <form 
              ref={formRef} 
              onSubmit={handleSubmit} 
              className="space-y-6"
              style={{
                gap: `${advancedSettings.fieldSpacing || 20}px`,
                display: "flex",
                flexDirection: "column"
              }}
            >
              {isFieldsLoading ? (
                <div className="py-8 text-center">
                  <p>جاري تحميل النموذج...</p>
                </div>
              ) : (
                <>
                  {/* استخدام تخطيط العمودين إذا كان محددًا */}
                  <div className={cn(
                    "space-y-6",
                    advancedSettings.formLayout === 'double' ? 'sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0' : ''
                  )}>
                    {renderedFields}
                  </div>
                  
                  {error && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      <AlertTitle>خطأ</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="pt-4">
                    <Button 
                      type="submit" 
                      className={cn(
                        advancedSettings.buttonStyle?.fullWidth ? 'w-full' : '',
                        advancedSettings.buttonStyle?.variant === 'outline' ? 'bg-transparent border-primary hover:bg-primary/10' : '',
                        advancedSettings.buttonStyle?.variant === 'elegant' ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-md hover:shadow-lg' : '',
                        advancedSettings.buttonStyle?.variant === 'gradient' ? 'bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-md hover:shadow-lg' : '',
                        advancedSettings.buttonStyle?.rounded === 'none' ? 'rounded-none' : '',
                        advancedSettings.buttonStyle?.rounded === 'sm' ? 'rounded-sm' : '',
                        advancedSettings.buttonStyle?.rounded === 'md' ? 'rounded-md' : '',
                        advancedSettings.buttonStyle?.rounded === 'lg' ? 'rounded-lg' : '',
                        advancedSettings.buttonStyle?.rounded === 'full' ? 'rounded-full' : '',
                      )}
                      disabled={isLoading}
                    >
                      {isLoading ? 'جاري الإرسال...' : (settings.buttonText || 'إرسال الطلب')}
                    </Button>
                  </div>
                </>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
});

export default FormComponent;
