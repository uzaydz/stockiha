import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import LandingPageFormRenderer from '@/components/landing/LandingPageFormRenderer';

interface FormComponentPreviewProps {
  settings: {
    title?: string;
    buttonText?: string;
    backgroundColor?: string;
    formId?: string;
    fields?: any[];
    productId?: string;
    advancedSettings?: Record<string, any>;
    [key: string]: any;
  };
}

/**
 * مكون معاينة للنموذج - نسخة طبق الأصل من LandingPageFormRenderer مع وضع read-only
 */
const FormComponentPreview: React.FC<FormComponentPreviewProps> = React.memo(({ settings }) => {
  // إعداد بيانات النموذج
  const formData = {
    fields: settings.fields || [],
    name: settings.title,
    submitButtonText: settings.buttonText || 'إرسال الطلب'
  };

  // ملاحظة: سيتم جلب بيانات المنتج تلقائياً داخل LandingPageFormRenderer بناءً على productId

  // إذا لم تكن هناك حقول، عرض رسالة
  if (!settings.fields || settings.fields.length === 0) {
    return (
      <section className="py-8" style={{ backgroundColor: settings.backgroundColor || '#f9f9f9' }}>
        <div className="container mx-auto px-4">
          <Card className="max-w-md mx-auto border border-dashed border-muted-foreground/30">
            <CardContent className="p-8 text-center">
              <div className="text-muted-foreground mb-4">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-semibold mb-2">لا توجد حقول للنموذج</h3>
                <p className="text-sm">يرجى اختيار نموذج يحتوي على حقول</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  // مكون wrapper للمعاينة مع تعطيل التفاعلات
  const PreviewWrapper = ({ children }: { children: React.ReactNode }) => (
    <div 
      className="pointer-events-none select-none"
      style={{ 
        backgroundColor: settings.backgroundColor || '#f9f9f9',
        padding: '2rem 0'
      }}
    >
      {children}
    </div>
  );

  return (
    <PreviewWrapper>
      <LandingPageFormRenderer
        formData={formData}
        productId={settings.productId}
        onFormSubmit={() => {}} // دالة فارغة للمعاينة
        className="preview-mode"
      />
    </PreviewWrapper>
  );
});

FormComponentPreview.displayName = 'FormComponentPreview';

export default FormComponentPreview;
