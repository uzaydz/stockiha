import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { User, Mail, Phone } from 'lucide-react';

interface FormComponentPreviewProps {
  settings: {
    title?: string;
    buttonText?: string;
    backgroundColor?: string;
    advancedSettings?: Record<string, any>;
    [key: string]: any;
  };
}

/**
 * مكون معاينة للنموذج - نسخة محسّنة مع React.memo للأداء
 * تدعم الإعدادات المتقدمة للمظهر
 */
const FormComponentPreview: React.FC<FormComponentPreviewProps> = React.memo(({ settings }) => {
  // استخراج الإعدادات المتقدمة أو استخدام القيم الافتراضية
  const advancedSettings = settings.advancedSettings || {
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

  // بناء أنماط CSS استنادًا إلى الإعدادات المتقدمة
  const getCardStyles = () => {
    const { cardStyle } = advancedSettings;
    
    let shadowClass = 'shadow-none';
    if (cardStyle?.shadow === 'sm') shadowClass = 'shadow-sm';
    else if (cardStyle?.shadow === 'md') shadowClass = 'shadow-md';
    else if (cardStyle?.shadow === 'lg') shadowClass = 'shadow-lg';
    else if (cardStyle?.shadow === 'xl') shadowClass = 'shadow-xl';
    
    return {
      borderRadius: cardStyle?.borderRadius || '0.5rem',
      borderWidth: cardStyle?.borderWidth || '1px',
      borderColor: cardStyle?.borderColor || '#e2e8f0',
      shadow: shadowClass
    };
  };

  // الحصول على أنماط العناوين
  const getLabelStyles = () => {
    const { labelStyle } = advancedSettings;
    
    return {
      fontSize: labelStyle?.fontSize || '0.875rem',
      fontWeight: labelStyle?.fontWeight || 'medium',
      color: labelStyle?.color || '#1e293b'
    };
  };

  // الحصول على أنماط حقول الإدخال
  const getInputStyles = () => {
    const { inputStyle } = advancedSettings;
    
    return {
      borderRadius: inputStyle?.borderRadius || '0.5rem',
      borderWidth: inputStyle?.borderWidth || '1px'
    };
  };

  // الحصول على أنماط الزر
  const getButtonStyles = () => {
    const { buttonStyle } = advancedSettings;
    
    return cn(
      buttonStyle?.fullWidth ? 'w-full' : '',
      buttonStyle?.variant === 'outline' ? 'bg-transparent border-primary hover:bg-primary/10' : '',
      buttonStyle?.variant === 'elegant' ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-md hover:shadow-lg' : '',
      buttonStyle?.variant === 'gradient' ? 'bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-md hover:shadow-lg' : '',
      buttonStyle?.rounded === 'none' ? 'rounded-none' : '',
      buttonStyle?.rounded === 'sm' ? 'rounded-sm' : '',
      buttonStyle?.rounded === 'md' ? 'rounded-md' : '',
      buttonStyle?.rounded === 'lg' ? 'rounded-lg' : '',
      buttonStyle?.rounded === 'full' ? 'rounded-full' : ''
    );
  };

  const cardStyles = getCardStyles();
  const labelStyles = getLabelStyles();
  const inputStyles = getInputStyles();

  return (
    <section className="py-8" style={{ backgroundColor: settings.backgroundColor || '#f9f9f9' }}>
      <div className="container mx-auto px-4">
        <Card 
          className={cn(
            "max-w-md mx-auto border",
            cardStyles.shadow
          )}
          style={{
            borderRadius: cardStyles.borderRadius,
            borderWidth: cardStyles.borderWidth,
            borderColor: cardStyles.borderColor
          }}
        >
          <CardContent className="p-4">
            {settings.title && (
              <h2 className="text-xl font-bold mb-4 text-center">{settings.title}</h2>
            )}
            
            <div 
              className={cn(
                advancedSettings.formLayout === 'double' ? 'sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0' : 'space-y-4',
              )}
              style={{
                gap: `${advancedSettings.fieldSpacing || 20}px`,
                display: "flex",
                flexDirection: "column"
              }}
            >
              <div className="space-y-2">
                <div className="flex items-center space-x-1 space-x-reverse">
                  {advancedSettings.showIcons && (
                    <User 
                      className="h-4 w-4 ml-1" 
                      style={{ color: advancedSettings.fieldIconColor }} 
                    />
                  )}
                  <Label 
                    htmlFor="preview-name" 
                    style={{
                      fontSize: labelStyles.fontSize,
                      fontWeight: labelStyles.fontWeight === 'bold' ? '700' : 
                               labelStyles.fontWeight === 'medium' ? '500' : '400',
                      color: labelStyles.color
                    }}
                  >
                    الاسم
                  </Label>
                </div>
                <Input 
                  id="preview-name" 
                  placeholder="أدخل اسمك" 
                  disabled 
                  style={{
                    borderRadius: inputStyles.borderRadius,
                    borderWidth: inputStyles.borderWidth
                  }}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-1 space-x-reverse">
                  {advancedSettings.showIcons && (
                    <Mail 
                      className="h-4 w-4 ml-1" 
                      style={{ color: advancedSettings.fieldIconColor }} 
                    />
                  )}
                  <Label 
                    htmlFor="preview-email" 
                    style={{
                      fontSize: labelStyles.fontSize,
                      fontWeight: labelStyles.fontWeight === 'bold' ? '700' : 
                               labelStyles.fontWeight === 'medium' ? '500' : '400',
                      color: labelStyles.color
                    }}
                  >
                    البريد الإلكتروني
                  </Label>
                </div>
                <Input 
                  id="preview-email" 
                  placeholder="example@example.com" 
                  disabled 
                  style={{
                    borderRadius: inputStyles.borderRadius,
                    borderWidth: inputStyles.borderWidth
                  }}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-1 space-x-reverse">
                  {advancedSettings.showIcons && (
                    <Phone 
                      className="h-4 w-4 ml-1" 
                      style={{ color: advancedSettings.fieldIconColor }} 
                    />
                  )}
                  <Label 
                    htmlFor="preview-phone" 
                    style={{
                      fontSize: labelStyles.fontSize,
                      fontWeight: labelStyles.fontWeight === 'bold' ? '700' : 
                               labelStyles.fontWeight === 'medium' ? '500' : '400',
                      color: labelStyles.color
                    }}
                  >
                    الهاتف
                  </Label>
                </div>
                <Input 
                  id="preview-phone" 
                  placeholder="05XXXXXXXX" 
                  disabled 
                  style={{
                    borderRadius: inputStyles.borderRadius,
                    borderWidth: inputStyles.borderWidth
                  }}
                />
              </div>
              
              <div className="pt-4">
                <Button className={getButtonStyles()} disabled>
                  {settings.buttonText || 'إرسال الطلب'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
});

FormComponentPreview.displayName = 'FormComponentPreview';

export default FormComponentPreview;
