import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

interface FormFieldRendererProps {
  field: any;
  formData: Record<string, any>;
  handleInputChange: (fieldName: string, value: any) => void;
  handleProvinceChange: (province: string, fieldName: string) => void;
  selectedProvinces: Record<string, string>;
  availableMunicipalities: Record<string, string[]>;
  formFields: any[];
  advancedSettings: Record<string, any>;
  getFieldIcon: (fieldType: string) => JSX.Element;
  labelStyles: Record<string, string>;
  inputStyles: Record<string, string>;
  PROVINCES: string[];
}

/**
 * Componente optimizado para renderizar campos de formulario
 * Cada tipo de campo se maneja por separado para mejorar el rendimiento
 */
export const FormFieldRenderer: React.FC<FormFieldRendererProps> = React.memo(({
  field,
  formData,
  handleInputChange,
  handleProvinceChange,
  selectedProvinces,
  availableMunicipalities,
  formFields,
  advancedSettings,
  getFieldIcon,
  labelStyles,
  inputStyles,
  PROVINCES
}) => {
  const fieldName = field.name;
  const isRequired = field.required;
  
  // Función para renderizar el título/etiqueta del campo
  const renderFieldLabel = () => (
    <div className="flex items-center space-x-1 space-x-reverse">
      {advancedSettings.showIcons && (
        <div className="ml-1" style={{ color: advancedSettings.fieldIconColor }}>
          {getFieldIcon(field.type)}
        </div>
      )}
      <Label 
        htmlFor={`field-${field.id || fieldName}`} 
        className="text-sm font-medium"
        style={labelStyles}
      >
        {field.label}
        {isRequired && <span className="text-destructive mr-1">*</span>}
      </Label>
    </div>
  );
  
  // Función para renderizar la descripción del campo
  const renderFieldDescription = () => (
    field.description && (
      <p className="text-xs text-muted-foreground">{field.description}</p>
    )
  );
  
  // Renderizar diferentes tipos de campos
  switch (field.type) {
    case 'text':
    case 'email':
    case 'tel':
    case 'number':
      return (
        <div key={field.id || fieldName} className="space-y-2">
          {renderFieldLabel()}
          <Input
            id={`field-${field.id || fieldName}`}
            type={field.type}
            placeholder={field.placeholder || ''}
            required={isRequired}
            value={formData[fieldName] || ''}
            onChange={(e) => handleInputChange(fieldName, e.target.value)}
            className="w-full text-right"
            autoComplete={field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : 'off'}
            style={inputStyles}
          />
          {renderFieldDescription()}
        </div>
      );
      
    case 'textarea':
      return (
        <div key={field.id || fieldName} className="space-y-2">
          {renderFieldLabel()}
          <Textarea
            id={`field-${field.id || fieldName}`}
            placeholder={field.placeholder || ''}
            required={isRequired}
            value={formData[fieldName] || ''}
            onChange={(e) => handleInputChange(fieldName, e.target.value)}
            className="min-h-[120px] text-right"
            style={inputStyles}
          />
          {renderFieldDescription()}
        </div>
      );
    
    case 'province':
      return (
        <div key={field.id || fieldName} className="space-y-2">
          {renderFieldLabel()}
          <Select
            value={formData[fieldName] || ''}
            onValueChange={(value) => handleProvinceChange(value, fieldName)}
          >
            <SelectTrigger 
              id={`field-${field.id || fieldName}`} 
              className="w-full text-right"
              style={inputStyles}
            >
              <SelectValue placeholder={field.placeholder || 'اختر الولاية...'} />
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              {PROVINCES.map((province, index) => (
                <SelectItem key={index} value={province}>{province}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {renderFieldDescription()}
        </div>
      );
      
    case 'municipality':
      // La municipalidad depende de la provincia seleccionada
      const provinceFieldName = formFields.find(f => f.id === field.linkedFields?.provinceField)?.name;
      const selectedProvince = provinceFieldName ? selectedProvinces[provinceFieldName] : null;
      const municipalities = provinceFieldName ? (availableMunicipalities[provinceFieldName] || []) : [];
      
      return (
        <div key={field.id || fieldName} className="space-y-2">
          {renderFieldLabel()}
          <Select
            value={formData[fieldName] || ''}
            onValueChange={(value) => handleInputChange(fieldName, value)}
            disabled={!selectedProvince}
          >
            <SelectTrigger 
              id={`field-${field.id || fieldName}`} 
              className="w-full text-right"
              style={inputStyles}
            >
              <SelectValue placeholder={field.placeholder || 'اختر البلدية...'} />
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              {municipalities.length > 0 ? (
                municipalities.map((municipality, index) => (
                  <SelectItem key={index} value={municipality}>{municipality}</SelectItem>
                ))
              ) : (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  {selectedProvince ? 'لا توجد بلديات متاحة' : 'يرجى اختيار الولاية أولاً'}
                </div>
              )}
            </SelectContent>
          </Select>
          {renderFieldDescription()}
        </div>
      );
      
    case 'select':
      return (
        <div key={field.id || fieldName} className="space-y-2">
          {renderFieldLabel()}
          <Select
            value={formData[fieldName] || ''}
            onValueChange={(value) => handleInputChange(fieldName, value)}
          >
            <SelectTrigger 
              id={`field-${field.id || fieldName}`} 
              className="w-full text-right"
              style={inputStyles}
            >
              <SelectValue placeholder={field.placeholder || 'اختر...'} />
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              {field.options?.map((option: any, optIndex: number) => (
                <SelectItem 
                  key={optIndex} 
                  value={typeof option === 'object' ? option.value : option}
                >
                  {typeof option === 'object' ? option.label : option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {renderFieldDescription()}
        </div>
      );
      
    case 'radio':
      return (
        <div key={field.id || fieldName} className="space-y-3">
          <div className="flex items-center space-x-1 space-x-reverse">
            {advancedSettings.showIcons && (
              <div className="ml-1" style={{ color: advancedSettings.fieldIconColor }}>
                {getFieldIcon(field.type)}
              </div>
            )}
            <div 
              className="text-sm font-medium"
              style={labelStyles}
            >
              {field.label}
              {isRequired && <span className="text-destructive mr-1">*</span>}
            </div>
          </div>
          <RadioGroup
            value={formData[fieldName] || ''}
            onValueChange={(value) => handleInputChange(fieldName, value)}
            className="flex flex-col space-y-1"
          >
            {field.options?.map((option: any, optIndex: number) => {
              const optionValue = typeof option === 'object' ? option.value : option;
              const optionLabel = typeof option === 'object' ? option.label : option;
              
              return (
                <div key={optIndex} className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value={optionValue} id={`${fieldName}-${optIndex}`} />
                  <Label 
                    htmlFor={`${fieldName}-${optIndex}`} 
                    className="cursor-pointer"
                    style={labelStyles}
                  >
                    {optionLabel}
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
          {renderFieldDescription()}
        </div>
      );
      
    case 'checkbox':
      return (
        <div key={field.id || fieldName} className="space-y-3">
          <div className="flex items-center space-x-1 space-x-reverse">
            {advancedSettings.showIcons && (
              <div className="ml-1" style={{ color: advancedSettings.fieldIconColor }}>
                {getFieldIcon(field.type)}
              </div>
            )}
            <div 
              className="text-sm font-medium"
              style={labelStyles}
            >
              {field.label}
              {isRequired && <span className="text-destructive mr-1">*</span>}
            </div>
          </div>
          {field.options?.map((option: any, optIndex: number) => {
            const optionValue = typeof option === 'object' ? option.value : option;
            const optionLabel = typeof option === 'object' ? option.label : option;
            const checkboxName = `${fieldName}_${optIndex}`;
            
            return (
              <div key={optIndex} className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id={checkboxName}
                  checked={formData[checkboxName] === true}
                  onCheckedChange={(checked) => {
                    handleInputChange(checkboxName, checked === true);
                    // Actualizar el valor principal del campo como lista de opciones
                    const newValues = { ...formData };
                    newValues[checkboxName] = checked === true;
                    
                    // Agrupar todas las opciones seleccionadas
                    const selectedOptions = field.options
                      .filter((_: any, idx: number) => 
                        newValues[`${fieldName}_${idx}`] === true
                      )
                      .map((opt: any, idx: number) => 
                        typeof opt === 'object' ? opt.value : opt
                      );
                      
                    // Actualizar el valor principal
                    newValues[fieldName] = selectedOptions.join(',');
                    handleInputChange(fieldName, newValues[fieldName]);
                  }}
                />
                <Label 
                  htmlFor={checkboxName} 
                  className="cursor-pointer"
                  style={labelStyles}
                >
                  {optionLabel}
                </Label>
              </div>
            );
          })}
          {renderFieldDescription()}
        </div>
      );
      
    default:
      return null;
  }
});
