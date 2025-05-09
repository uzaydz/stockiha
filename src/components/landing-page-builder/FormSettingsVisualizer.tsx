import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';

interface FormFieldVisualProps {
  style: {
    borderRadius?: string;
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
    padding?: string;
  };
  showIcon: boolean;
  iconColor?: string;
  placeholder: string;
  label: string;
}

const FormFieldVisual: React.FC<FormFieldVisualProps> = ({
  style,
  showIcon,
  iconColor = '#6366f1',
  placeholder,
  label
}) => {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium block">{label}</label>
      <div 
        className="flex items-center border rounded-md overflow-hidden"
        style={{ 
          borderRadius: style.borderRadius || '0.375rem',
          borderColor: style.borderColor || '#e2e8f0'
        }}
      >
        {showIcon && (
          <div 
            className="flex items-center justify-center h-9 w-9 flex-shrink-0"
            style={{ color: iconColor }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
          </div>
        )}
        <div 
          className="w-full h-9 px-3 py-2 text-sm"
          style={{
            backgroundColor: style.backgroundColor || 'white',
            color: style.textColor || '#475569',
          }}
        >
          {placeholder}
        </div>
      </div>
    </div>
  );
};

interface ButtonVisualProps {
  text: string;
  style: {
    borderRadius?: string;
    backgroundColor?: string;
    textColor?: string;
    padding?: string;
  };
}

const ButtonVisual: React.FC<ButtonVisualProps> = ({
  text,
  style
}) => {
  return (
    <button
      type="button"
      className="text-center px-4 py-2 w-full font-medium text-sm"
      style={{
        borderRadius: style.borderRadius || '0.375rem',
        backgroundColor: style.backgroundColor || '#6366f1',
        color: style.textColor || 'white',
      }}
    >
      {text}
    </button>
  );
};

interface FormSettingsVisualizerProps {
  settings: {
    formTitle?: string;
    buttonText?: string;
    backgroundColor?: string;
    inputStyle?: {
      borderRadius?: string;
      backgroundColor?: string;
      borderColor?: string;
      textColor?: string;
    };
    buttonStyle?: {
      borderRadius?: string;
      backgroundColor?: string;
      textColor?: string;
    };
    showIcons?: boolean;
    fieldIconColor?: string;
  };
}

const FormSettingsVisualizer: React.FC<FormSettingsVisualizerProps> = ({
  settings
}) => {
  const { t } = useTranslation();
  
  const inputStyle = settings.inputStyle || {
    borderRadius: '0.375rem',
    backgroundColor: 'white',
    borderColor: '#e2e8f0',
    textColor: '#475569',
  };
  
  const buttonStyle = settings.buttonStyle || {
    borderRadius: '0.375rem',
    backgroundColor: '#6366f1',
    textColor: 'white',
  };
  
  return (
    <Card className="p-4 shadow-sm relative overflow-hidden">
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ backgroundColor: settings.backgroundColor || '#f3f4f6' }}
      />
      
      <div className="relative space-y-4">
        {settings.formTitle && (
          <h3 className="text-base font-semibold text-center">{settings.formTitle}</h3>
        )}
        
        <div className="space-y-3">
          <FormFieldVisual
            style={inputStyle}
            showIcon={settings.showIcons || false}
            iconColor={settings.fieldIconColor}
            placeholder={t('الاسم الكامل')}
            label={t('الاسم')}
          />
          
          <FormFieldVisual
            style={inputStyle}
            showIcon={settings.showIcons || false}
            iconColor={settings.fieldIconColor}
            placeholder={t('أدخل رقم الهاتف')}
            label={t('رقم الهاتف')}
          />
          
          <FormFieldVisual
            style={inputStyle}
            showIcon={settings.showIcons || false}
            iconColor={settings.fieldIconColor}
            placeholder={t('ولاية/مدينة')}
            label={t('الولاية')}
          />
        </div>
        
        <div className="pt-2">
          <ButtonVisual
            text={settings.buttonText || t('إرسال الطلب')}
            style={buttonStyle}
          />
        </div>
      </div>
    </Card>
  );
};

export default FormSettingsVisualizer; 