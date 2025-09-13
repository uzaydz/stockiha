import React, { memo, useMemo, useCallback, useEffect } from 'react';
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
  locationFields
}) => {
  // Ensure default for fixed/regular delivery radio is written to formData once
  useEffect(() => {
    try {
      fields.forEach((field) => {
        if (field.type !== 'radio') return;
        const isDeliveryField = /delivery|توصيل/i.test(field.name) || /delivery|توصيل/i.test(field.label);
        if (!isDeliveryField) return;

        const current = formData[field.name as keyof typeof formData];
        if (current !== undefined && current !== null && current !== '') return;

        // Determine sensible default: prefer explicit defaultValue, then 'desk'/office, else first option
        const officeOpt = field.options?.find((o) => {
          const v = String(o.value ?? '').toLowerCase();
          const lbl = String(o.label ?? '').toLowerCase();
          return v === 'desk' || v === 'office' || lbl.includes('office') || lbl.includes('مكتب');
        });
        const defaultVal = field.defaultValue
          ?? officeOpt?.value
          ?? field.options?.[0]?.value;

        if (defaultVal !== undefined && defaultVal !== null && defaultVal !== '') {
          onFieldChange(field.name, defaultVal as any);
          // do not mark as touched to avoid flashing validation
        }
      });
    } catch {
      // no-op: defensive guard
    }
    // Run when fields list changes or when formData reference changes (not on every keystroke)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields]);
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
    const isDeliveryField = field.type === 'radio' && (
      /delivery|توصيل/i.test(field.name) || /delivery|توصيل/i.test(field.label)
    );
    const fieldValue = (() => {
      const v = formData[field.name];
      if (isDeliveryField) {
        // إظهار المكتب كافتراضي بصرياً إن لم توجد قيمة بعد
        if (v === undefined || v === null || v === '') {
          // ابحث عن خيار المكتب من تعريف الحقل
          const officeOpt = field.options?.find((o) => {
            const val = String(o.value || '').toLowerCase();
            const lbl = String(o.label || '').toLowerCase();
            return val === 'desk' || val === 'office' || lbl.includes('office') || lbl.includes('مكتب');
          });
          return officeOpt?.value ?? 'desk';
        }
      }
      return v;
    })();

    return (
      <FormFieldComponent
        field={field}
        value={fieldValue}
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

  return (
    <div className="grid grid-cols-2 gap-3">
      {orderedFields.map((field) => (
        <div key={field.id} className={getFieldColSpan(field)}>
          {renderField(field)}
        </div>
      ))}
    </div>
  );
});

FormFieldsRenderer.displayName = 'FormFieldsRenderer';

export default FormFieldsRenderer;
