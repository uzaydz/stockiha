import React, { memo, useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPinIcon, BuildingOfficeIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { FormField, BaseFormComponentProps } from '@/types/productForm';
import { 
  getAvailableWilayas, 
  getMunicipalitiesByWilayaId,
  type YalidineMunicipality 
} from '@/data/yalidine-municipalities-complete';
import { useProductPurchaseTranslation } from '@/hooks/useProductPurchaseTranslation';

interface LocationFieldsProps extends BaseFormComponentProps {
  provinceField?: FormField;
  municipalityField?: FormField;
  formData: Record<string, any>;
  onFieldChange: (fieldName: string, value: string) => void;
  onFieldTouch: (fieldName: string) => void;
  className?: string;
}

const LocationFields = memo<LocationFieldsProps>(({
  provinceField,
  municipalityField,
  formData,
  disabled = false,
  loading = false,
  errors = {},
  touched = {},
  onFieldChange,
  onFieldTouch,
  className
}) => {
  const { productFormRenderer } = useProductPurchaseTranslation();
  
  // حالة محلية للولايات والبلديات
  const [availableMunicipalities, setAvailableMunicipalities] = useState<YalidineMunicipality[]>([]);
  const [isLoadingMunicipalities, setIsLoadingMunicipalities] = useState(false);

  // تحسين بيانات الولايات مع memoization
  const provinces = useMemo(() => getAvailableWilayas(), []);

  // استخراج قيم الحقول الحالية
  const currentProvinceValue = provinceField ? (formData[provinceField.name] as string || '') : '';
  const currentMunicipalityValue = municipalityField ? (formData[municipalityField.name] as string || '') : '';

  // تحديث البلديات عند تغيير الولاية - محسن مع async loading
  useEffect(() => {
    if (currentProvinceValue && municipalityField) {
      setIsLoadingMunicipalities(true);
      
      // استخدام setTimeout لتجنب blocking UI
      const timeoutId = setTimeout(() => {
        try {
          const municipalities = getMunicipalitiesByWilayaId(Number(currentProvinceValue));
          setAvailableMunicipalities(municipalities);
          
          // إعادة تعيين البلدية إذا كانت غير متوافقة مع الولاية الجديدة
          if (currentMunicipalityValue) {
            const isMunicipalityValid = municipalities.some(
              m => m.id.toString() === currentMunicipalityValue
            );
            if (!isMunicipalityValid) {
              onFieldChange(municipalityField.name, '');
            }
          }
        } catch (error) {
          setAvailableMunicipalities([]);
        } finally {
          setIsLoadingMunicipalities(false);
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    } else {
      setAvailableMunicipalities([]);
      setIsLoadingMunicipalities(false);
    }
  }, [currentProvinceValue, municipalityField?.name]);

  // معالجات الأحداث المحسنة
  const handleProvinceChange = useCallback((value: string) => {
    if (provinceField && !disabled && !loading) {
      onFieldChange(provinceField.name, value);
      onFieldTouch(provinceField.name);
    }
  }, [provinceField, disabled, loading, onFieldChange, onFieldTouch]);

  const handleMunicipalityChange = useCallback((value: string) => {
    if (municipalityField && !disabled && !loading) {
      onFieldChange(municipalityField.name, value);
      onFieldTouch(municipalityField.name);
    }
  }, [municipalityField, disabled, loading, onFieldChange, onFieldTouch]);

  // إذا لم يتم تمرير أي حقل، لا نعرض شيئاً
  if (!provinceField && !municipalityField) {
    return null;
  }

  return (
    <div className={cn("w-full", className)}>
      {/* عرض الحقول في صف واحد باستخدام flex - دائماً في صف واحد حتى على الهاتف */}
      <div className="flex flex-row gap-2 sm:gap-3">
        {/* حقل الولاية */}
        {provinceField && (
          <motion.div 
            className="flex-1 space-y-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Label 
              htmlFor={provinceField.id} 
              className="block text-sm font-medium text-foreground flex items-center"
            >
              <MapPinIcon className="w-4 h-4 ml-2 text-primary" />
              {provinceField.label}
              {provinceField.required && <span className="text-red-500 mr-1">*</span>}
            </Label>
            
            {provinceField.description && (
              <p className="text-xs text-muted-foreground mb-2">{provinceField.description}</p>
            )}
            
            <Select
              value={currentProvinceValue}
              onValueChange={handleProvinceChange}
              disabled={disabled || loading}
            >
              <SelectTrigger 
                className={cn(
                  "w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 bg-background text-foreground shadow-sm hover:border-muted-foreground",
                  "disabled:opacity-50",
                  errors[provinceField.name] && touched[provinceField.name] && "border-destructive focus:border-destructive focus:ring-destructive"
                )}
                aria-invalid={errors[provinceField.name] && touched[provinceField.name]}
                aria-describedby={errors[provinceField.name] ? `${provinceField.id}-error` : undefined}
              >
                <SelectValue placeholder={provinceField.placeholder || productFormRenderer.selectProvince()} />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-border shadow-lg max-h-60">
                {provinces.map((province) => (
                  <SelectItem 
                    key={province.id} 
                    value={province.id.toString()}
                    className="rounded-lg cursor-pointer hover:bg-accent/50"
                  >
                    <div className="flex items-center gap-2">
                      <MapPinIcon className="w-4 h-4 text-muted-foreground" />
                      {province.name_ar || province.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <AnimatePresence>
              {errors[provinceField.name] && touched[provinceField.name] && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  id={`${provinceField.id}-error`}
                  role="alert"
                >
                  <Alert variant="destructive" className="py-2">
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    <AlertDescription className="text-sm">{errors[provinceField.name]}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* حقل البلدية */}
        {municipalityField && (
          <motion.div 
            className="flex-1 space-y-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Label 
              htmlFor={municipalityField.id} 
              className="block text-sm font-medium text-foreground flex items-center"
            >
              <BuildingOfficeIcon className="w-4 h-4 ml-2 text-primary" />
              {municipalityField.label}
              {municipalityField.required && <span className="text-red-500 mr-1">*</span>}
            </Label>
            
            {municipalityField.description && (
              <p className="text-xs text-muted-foreground mb-2">{municipalityField.description}</p>
            )}
            
            {!currentProvinceValue ? (
              <div className="w-full px-3 py-2 border border-border rounded-lg bg-muted/50 text-muted-foreground flex items-center justify-center min-h-[40px]">
                <div className="flex items-center gap-2">
                  <MapPinIcon className="w-4 h-4" />
                  <span className="text-sm">{productFormRenderer.selectProvinceFirst()}</span>
                </div>
              </div>
            ) : (
              <Select
                value={currentMunicipalityValue}
                onValueChange={handleMunicipalityChange}
                disabled={disabled || loading || isLoadingMunicipalities}
              >
                <SelectTrigger 
                  className={cn(
                    "w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 bg-background text-foreground shadow-sm hover:border-muted-foreground",
                    "disabled:opacity-50",
                    errors[municipalityField.name] && touched[municipalityField.name] && "border-destructive focus:border-destructive focus:ring-destructive"
                  )}
                  aria-invalid={errors[municipalityField.name] && touched[municipalityField.name]}
                  aria-describedby={errors[municipalityField.name] ? `${municipalityField.id}-error` : undefined}
                >
                  <SelectValue 
                    placeholder={
                      isLoadingMunicipalities 
                        ? "جاري التحميل..." 
                        : municipalityField.placeholder || productFormRenderer.selectMunicipality()
                    } 
                  />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-border shadow-lg max-h-60">
                  {isLoadingMunicipalities ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                      <span className="ml-2 text-sm text-muted-foreground">جاري التحميل...</span>
                    </div>
                  ) : availableMunicipalities.length === 0 ? (
                    <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                      لا توجد بلديات متاحة
                    </div>
                  ) : (
                    availableMunicipalities.map((municipality) => (
                      <SelectItem 
                        key={municipality.id} 
                        value={municipality.id.toString()}
                        className="rounded-lg cursor-pointer hover:bg-accent/50"
                      >
                        <div className="flex items-center gap-2">
                          <BuildingOfficeIcon className="w-4 h-4 text-muted-foreground" />
                          {municipality.name}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
            
            <AnimatePresence>
              {errors[municipalityField.name] && touched[municipalityField.name] && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  id={`${municipalityField.id}-error`}
                  role="alert"
                >
                  <Alert variant="destructive" className="py-2">
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    <AlertDescription className="text-sm">{errors[municipalityField.name]}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
});

LocationFields.displayName = 'LocationFields';

export default LocationFields;
