import React from 'react';
import ProductFormRenderer, { FormField } from '@/components/product/ProductFormRenderer';

const TestForm: React.FC = () => {
  const sampleFields: FormField[] = [
    {
      id: 'name',
      name: 'name',
      label: 'الاسم الكامل',
      type: 'text',
      required: true,
      placeholder: 'أدخل اسمك الكامل',
      description: 'الاسم كما يظهر في الهوية'
    },
    {
      id: 'email',
      name: 'email',
      label: 'البريد الإلكتروني',
      type: 'email',
      required: true,
      placeholder: 'example@email.com'
    },
    {
      id: 'phone',
      name: 'phone',
      label: 'رقم الهاتف',
      type: 'tel',
      required: true,
      placeholder: '+213 555 123 456'
    },
    {
      id: 'wilaya',
      name: 'wilaya',
      label: 'الولاية',
      type: 'select',
      required: true,
      placeholder: 'اختر الولاية'
    },
    {
      id: 'municipality',
      name: 'municipality',
      label: 'البلدية',
      type: 'select',
      required: true,
      placeholder: 'اختر البلدية'
    },
    {
      id: 'address',
      name: 'address',
      label: 'العنوان التفصيلي',
      type: 'textarea',
      required: true,
      placeholder: 'أدخل عنوانك بالتفصيل...',
      description: 'اكتب العنوان بوضوح ليتمكن المندوب من الوصول إليك'
    },
    {
      id: 'quantity',
      name: 'quantity',
      label: 'الكمية',
      type: 'number',
      required: true,
      placeholder: '1'
    },
    {
      id: 'payment_method',
      name: 'payment_method',
      label: 'طريقة الدفع',
      type: 'radio',
      required: true,
      options: [
        { label: 'الدفع عند التسليم', value: 'cod' },
        { label: 'الدفع المسبق', value: 'prepaid' }
      ]
    },
    {
      id: 'newsletter',
      name: 'newsletter',
      label: 'اشتراك في النشرة البريدية',
      type: 'checkbox',
      placeholder: 'أريد تلقي العروض والأخبار'
    }
  ];

  const handleFormSubmit = (data: any) => {
    alert('تم إرسال النموذج بنجاح!');
  };

  const handleFormChange = (data: any) => {
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="container mx-auto max-w-4xl py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-2">
            النموذج المحسن
          </h1>
          <p className="text-lg text-muted-foreground">
            تصميم جديد وعصري مع تحسينات في الأداء والمظهر
          </p>
        </div>
        
        <ProductFormRenderer
          formData={{
            fields: sampleFields,
            name: 'نموذج طلب المنتج',
            description: 'يرجى ملء جميع الحقول المطلوبة لإتمام طلبك',
            submitButtonText: 'إرسال الطلب'
          }}
          onFormSubmit={handleFormSubmit}
          onFormChange={handleFormChange}
          showValidation={true}
          className="max-w-3xl mx-auto"
        />
      </div>
    </div>
  );
};

export default TestForm;
