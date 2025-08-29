import React, { memo, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FormField as FormFieldType } from '@/types/productForm';
import LocationFields from './LocationFields';
import FormFieldComponent from './FormField';

interface FormFieldsRendererProps {
  fields: FormFieldType[];
  formData: Record<string, any>;
  onFieldChange: (fieldName: string, value: any) => void;
  onFieldTouch: (fieldName: string) => void;
  disabled?: boolean;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  locationFields: {
    provinceField?: FormFieldType;
    municipalityField?: FormFieldType;
  };
}

const FormFieldsRenderer = memo<FormFieldsRendererProps>(({
  fields,
  formData,
  onFieldChange,
  onFieldTouch,
  disabled,
  errors,
  touched,
  product,
  selectedColor,
  selectedSize,
  locationFields
}) => {
  // ترتيب الحقول
  const orderedFields = useMemo(() => {
    const nameFields = fields.filter(field => 
      /name|اسم/i.test(field.name) || /name|اسم/i.test(field.label)
    );
    const phoneFields = fields.filter(field => 
      /phone|هاتف|رقم/i.test(field.name) || /phone|هاتف|رقم/i.test(field.label)
    );
    const deliveryFields = fields.filter(field => 
      field.type === 'radio' && (/delivery|توصيل/i.test(field.name) || /delivery|توصيل/i.test(field.label))
    );
    
    const locationFieldIds = [locationFields.provinceField?.id, locationFields.municipalityField?.id].filter(Boolean);
    const otherFields = fields.filter(field => 
      ![...nameFields, ...phoneFields, ...deliveryFields].includes(field) &&
      !locationFieldIds.includes(field.id)
    );
    
    return [
      ...nameFields,
      ...phoneFields,
      ...(locationFields.provinceField ? [locationFields.provinceField] : []),
      ...otherFields,
      ...deliveryFields
    ];
  }, [fields, locationFields.provinceField, locationFields.municipalityField]);

  // حساب عرض العمود للحقل
  const getFieldColSpan = useCallback((field: FormFieldType) => {
    const isNameField = /name|اسم/i.test(field.name) || /name|اسم/i.test(field.label);
    const isPhoneField = /phone|هاتف|رقم/i.test(field.name) || /phone|هاتف|رقم/i.test(field.label);
    const isLocationField = locationFields.provinceField && field.id === locationFields.provinceField.id;
    const isDeliveryField = field.type === 'radio' && (/delivery|توصيل/i.test(field.name) || /delivery|توصيل/i.test(field.label));
    const isFullWidthField = field.type === 'textarea';
    
    if (isLocationField || isDeliveryField || isFullWidthField) {
      return 'col-span-2';
    } else if (isNameField || isPhoneField) {
      return 'col-span-1';
    } else {
      return 'col-span-2';
    }
  }, [locationFields.provinceField]);

  // عرض الحقل
  const renderField = useCallback((field: FormFieldType) => {
    // حقول الموقع معاً
    if (locationFields.provinceField && field.id === locationFields.provinceField.id) {
      return (
        <LocationFields
          provinceField={locationFields.provinceField}
          municipalityField={locationFields.municipalityField}
          formData={formData}
          onFieldChange={onFieldChange}
          onFieldTouch={onFieldTouch}
          disabled={disabled}
          errors={errors}
          touched={touched}
        />
      );
    }

    // تجنب عرض حقل البلدية منفرداً
    if (locationFields.municipalityField && field.id === locationFields.municipalityField.id) {
      return null;
    }
    
    // الحقول العادية
    return (
      <FormFieldComponent
        field={field}
        value={formData[field.name]}
        onFieldChange={onFieldChange}
        onFieldTouch={onFieldTouch}
        disabled={disabled}
        errors={errors}
        touched={touched}
      />
    );
  }, [
    locationFields.provinceField,
    locationFields.municipalityField,
    formData,
    onFieldChange,
    onFieldTouch,
    disabled,
    errors,
    touched
  ]);

  // متغيرات الحركة
  const fieldVariants = {
    hidden: { opacity: 0, y: 5 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.15,
        ease: "easeOut" as const
      }
    }
  };

  return (
    <motion.div 
      className="grid grid-cols-2 gap-3"
      initial="hidden"
      animate="visible"
    >
      <AnimatePresence mode="popLayout">
        {orderedFields.map((field) => (
          <motion.div 
            key={field.id} 
            className={getFieldColSpan(field)}
            variants={fieldVariants}
            layout
          >
            {renderField(field)}
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
});

FormFieldsRenderer.displayName = 'FormFieldsRenderer';

export default FormFieldsRenderer;
