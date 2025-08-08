import React, { memo, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DocumentTextIcon, 
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  ExclamationTriangleIcon,
  HomeIcon,
  TruckIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { FormField as FormFieldType, ProductFormDataValue, BaseFormComponentProps } from '@/types/productForm';
import { useProductPurchaseTranslation } from '@/hooks/useProductPurchaseTranslation';
import { Loader2 } from 'lucide-react';

interface FormFieldProps extends BaseFormComponentProps {
  field: FormFieldType;
  value: ProductFormDataValue;
  onFieldChange: (fieldName: string, value: ProductFormDataValue) => void;
  onFieldTouch: (fieldName: string) => void;
  className?: string;
}

const FormField = memo<FormFieldProps>(({
  field,
  value,
  disabled = false,
  loading = false,
  errors = {},
  touched = {},
  onFieldChange,
  onFieldTouch,
  className
}) => {
  const { productFormRenderer, translateDynamicText } = useProductPurchaseTranslation();

  // الحصول على حالة الخطأ والمس
  const fieldError = errors[field.name];
  const isFieldTouched = touched[field.name];
  const hasError = Boolean(fieldError && isFieldTouched);
  const error = fieldError && isFieldTouched;

  // معالج تغيير القيمة
  const handleValueChange = useCallback((newValue: ProductFormDataValue) => {
    onFieldChange(field.name, newValue);
    onFieldTouch(field.name);
  }, [field.name, onFieldChange, onFieldTouch]);

  // الحصول على أيقونة الحقل
  const getFieldIcon = useMemo(() => {
    const iconClass = "w-4 h-4 text-primary";
    
    // أيقونة خاصة لحقل نوع التوصيل
    if (field.type === 'radio' && (
      field.name.toLowerCase().includes('delivery') || 
      field.name.toLowerCase().includes('توصيل') ||
      field.label.toLowerCase().includes('delivery') ||
      field.label.toLowerCase().includes('توصيل')
    )) {
      return <TruckIcon className={iconClass} />;
    }
    
    switch (field.type) {
      case 'email':
        return <EnvelopeIcon className={iconClass} />;
      case 'tel':
        return <PhoneIcon className={iconClass} />;
      case 'textarea':
        return <DocumentTextIcon className={iconClass} />;
      default:
        if (field.name.toLowerCase().includes('name') || field.name.toLowerCase().includes('اسم')) {
          return <UserIcon className={iconClass} />;
        }
        if (field.name.toLowerCase().includes('address') || field.name.toLowerCase().includes('عنوان')) {
          return <BuildingOfficeIcon className={iconClass} />;
        }
        return <DocumentTextIcon className={iconClass} />;
    }
  }, [field.type, field.name, field.label]);

  // الأنماط الأساسية للحقول
  const baseInputClass = useMemo(() => cn(
    "w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 bg-background text-foreground shadow-sm hover:border-muted-foreground",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    hasError && "border-destructive focus:border-destructive focus:ring-destructive"
  ), [hasError]);

  // رندر حقل النص العادي
  const renderTextInput = useCallback(() => (
    <Input
      id={field.id}
      name={field.name}
      type={field.type}
      value={value as string || ''}
      onChange={(e) => {
        const newValue = field.type === 'number' ? Number(e.target.value) : e.target.value;
        handleValueChange(newValue);
      }}
      placeholder={field.placeholder}
      disabled={disabled || loading || field.disabled}
      className={baseInputClass}
      aria-invalid={hasError}
      aria-describedby={hasError ? `${field.id}-error` : undefined}
    />
  ), [field, value, handleValueChange, disabled, loading, baseInputClass, hasError]);

  // رندر حقل النص الطويل
  const renderTextarea = useCallback(() => (
    <Textarea
      id={field.id}
      name={field.name}
      value={value as string || ''}
      onChange={(e) => handleValueChange(e.target.value)}
      placeholder={field.placeholder}
      disabled={disabled || loading || field.disabled}
      className={cn(baseInputClass, "min-h-24 resize-none")}
      aria-invalid={hasError}
      aria-describedby={hasError ? `${field.id}-error` : undefined}
    />
  ), [field, value, handleValueChange, disabled, loading, baseInputClass, hasError]);

  // رندر حقل الاختيار
  const renderSelect = useCallback(() => (
    <Select
      value={value as string || ''}
      onValueChange={handleValueChange}
      disabled={disabled || loading || field.disabled}
    >
      <SelectTrigger 
        className={baseInputClass}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${field.id}-error` : undefined}
      >
        <SelectValue placeholder={field.placeholder} />
      </SelectTrigger>
      <SelectContent className="rounded-xl border border-border shadow-lg">
        {field.options?.map((option) => (
          <SelectItem 
            key={option.value} 
            value={option.value}
            disabled={option.disabled}
            className="rounded-lg cursor-pointer hover:bg-accent/50"
          >
            {translateDynamicText(option.label)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ), [field, value, handleValueChange, disabled, loading, baseInputClass, hasError, translateDynamicText]);

  // رندر صندوق التحديد
  const renderCheckbox = useCallback(() => (
    <div className="flex items-center space-x-2 space-x-reverse">
      <Checkbox
        id={field.id}
        checked={value as boolean || false}
        onCheckedChange={handleValueChange}
        disabled={disabled || loading || field.disabled}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${field.id}-error` : undefined}
      />
      <Label htmlFor={field.id} className="text-sm cursor-pointer">
        {field.placeholder}
      </Label>
    </div>
  ), [field, value, handleValueChange, disabled, loading, hasError]);

  // رندر أزرار الراديو للتوصيل
  const renderDeliveryRadio = useCallback(() => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3"> {/* تغيير إلى grid-cols-2 للعرض جنباً إلى جنب */}
      {field.options?.map((option) => {
        const isSelected = value === option.value;
        const isHome = option.value === 'home' || option.label.toLowerCase().includes('منزل') || option.label.toLowerCase().includes('home');
        const isOffice = option.value === 'desk' || option.value === 'office' || option.label.toLowerCase().includes('مكتب') || option.label.toLowerCase().includes('office');
        
        return (
          <motion.div 
            key={option.value}
            className={cn(
              "flex items-center p-3 border rounded-lg cursor-pointer transition-all duration-200",
              isSelected 
                ? 'border-primary bg-primary/10 shadow-sm' 
                : 'border-border hover:border-primary/50'
            )}
            onClick={() => !option.disabled && handleValueChange(option.value)}
            whileHover={!option.disabled ? { scale: 1.01 } : {}}
            whileTap={!option.disabled ? { scale: 0.99 } : {}}
          >
            <div className="relative">
              <input
                type="radio"
                name={field.name}
                id={`${field.id}-${option.value}`}
                value={option.value}
                checked={isSelected}
                onChange={() => handleValueChange(option.value)}
                disabled={disabled || loading || field.disabled || option.disabled}
                className="opacity-0 absolute"
              />
              <div className={cn(
                "w-5 h-5 rounded-full border mr-2 flex items-center justify-center transition-colors",
                isSelected ? 'border-primary' : 'border-border'
              )}>
                {isSelected && <CheckIcon className="h-3 w-3 text-primary" />}
              </div>
            </div>
            <label htmlFor={`${field.id}-${option.value}`} className="flex-1 cursor-pointer">
              <div className="flex items-center">
                {isHome && <HomeIcon className="ml-2 h-4 w-4 text-primary" />}
                {isOffice && <BuildingOfficeIcon className="ml-2 h-4 w-4 text-primary" />}
                {!isHome && !isOffice && <TruckIcon className="ml-2 h-4 w-4 text-primary" />}
                <div>
                  <span className="font-medium block text-foreground text-sm">{translateDynamicText(option.label)}</span>
                  {isHome && (
                    <span className="text-xs text-muted-foreground block mt-0.5">{productFormRenderer.homeDelivery()}</span>
                  )}
                  {isOffice && (
                    <span className="text-xs text-muted-foreground block mt-0.5">{productFormRenderer.officeDelivery()}</span>
                  )}
                </div>
              </div>
            </label>
          </motion.div>
        );
      })}
    </div>
  ), [field, value, handleValueChange, disabled, loading, translateDynamicText, productFormRenderer]);

  // رندر أزرار الراديو العادية
  const renderRegularRadio = useCallback(() => (
    <RadioGroup
      value={value as string || ''}
      onValueChange={handleValueChange}
      disabled={disabled || loading || field.disabled}
      className="space-y-2"
    >
      {field.options?.map((option) => (
        <div key={option.value} className="flex items-center space-x-2 space-x-reverse">
          <RadioGroupItem 
            value={option.value} 
            id={`${field.id}-${option.value}`}
            disabled={option.disabled}
          />
          <Label htmlFor={`${field.id}-${option.value}`} className="text-sm cursor-pointer">
            {translateDynamicText(option.label)}
          </Label>
        </div>
      ))}
    </RadioGroup>
  ), [field, value, handleValueChange, disabled, loading, translateDynamicText]);

  // رندر محتوى الحقل بناءً على النوع
  const renderFieldContent = useCallback(() => {
    switch (field.type) {
      case 'textarea':
        return renderTextarea();
      case 'select':
        return field.options ? renderSelect() : null;
      case 'checkbox':
        return renderCheckbox();
      case 'radio':
        if (!field.options) return null;
        
        // تحديد نوع التصميم بناءً على اسم الحقل
        const isDeliveryField = field.name.toLowerCase().includes('delivery') || 
          field.name.toLowerCase().includes('توصيل') ||
          field.label.toLowerCase().includes('delivery') ||
          field.label.toLowerCase().includes('توصيل');
        
        return isDeliveryField ? renderDeliveryRadio() : renderRegularRadio();
      default:
        return renderTextInput();
    }
  }, [field, renderTextarea, renderSelect, renderCheckbox, renderDeliveryRadio, renderRegularRadio, renderTextInput]);

  return (
    <div className="space-y-1.5"> {/* تقليل المسافة من space-y-2 إلى space-y-1.5 */}
      {/* التسمية */}
      {field.label && (
        <div className="flex items-center justify-between">
          <label 
            htmlFor={field.id}
            className={cn(
              "text-sm font-medium text-foreground flex items-center gap-1.5", // تقليل gap من gap-2 إلى gap-1.5
              error && "text-destructive"
            )}
          >
            {translateDynamicText(field.label)}
            {field.required && <span className="text-destructive ml-0.5">*</span>}
          </label>
          
          {/* مؤشر التحميل */}
          {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </div>
      )}

      {/* الحقل */}
      <div className="relative">
        {renderFieldContent()}
        
        {/* مؤشر التحقق */}
        {field.required && value && !error && !loading && (
          <motion.div 
            className="absolute left-2 top-1/2 transform -translate-y-1/2"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <CheckIcon className="h-3 w-3 text-green-500" />
          </motion.div>
        )}
      </div>

      {/* رسالة الخطأ */}
      <AnimatePresence>
        {error && (
          <motion.p 
            className="text-xs text-destructive flex items-center gap-1" // تقليل حجم النص من text-sm إلى text-xs
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <ExclamationTriangleIcon className="h-3 w-3" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
});

FormField.displayName = 'FormField';

export default FormField;
