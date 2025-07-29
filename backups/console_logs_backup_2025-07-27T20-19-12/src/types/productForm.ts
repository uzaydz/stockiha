export type FormFieldType = 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'number';

export interface FormFieldOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface FormFieldValidation {
  pattern?: string;
  message?: string;
  min?: number;
  max?: number;
  required?: boolean;
}

export interface FormFieldConditional {
  field: string;
  value: string | boolean | number;
  operator?: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
}

export interface FormField {
  id: string;
  name: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  description?: string;
  options?: FormFieldOption[];
  validation?: FormFieldValidation;
  conditional?: FormFieldConditional;
  className?: string;
  disabled?: boolean;
}

export type ProductFormDataValue = string | boolean | number | undefined;

export interface ProductFormData {
  [key: string]: ProductFormDataValue;
}

export interface FormErrors {
  [key: string]: string;
}

// أنواع المنتجات والألوان والمقاسات
export interface ProductColor {
  id: string;
  name: string;
  color_code?: string;
  image_url?: string;
  quantity?: number;
  sizes?: ProductSize[];
}

export interface ProductSize {
  id: string;
  size_name: string;
  price?: number;
  quantity?: number;
}

export interface ProductVariant {
  has_variants?: boolean;
  colors?: ProductColor[];
  stock_quantity?: number;
}

// واجهات المكونات
export interface BaseFormComponentProps {
  disabled?: boolean;
  loading?: boolean;
  errors?: FormErrors;
  touched?: Record<string, boolean>;
  onFieldChange?: (fieldName: string, value: ProductFormDataValue) => void;
  onFieldTouch?: (fieldName: string) => void;
}

export interface ValidationResult {
  isValid: boolean;
  errors: FormErrors;
}

// حالات التحميل
export interface LoadingStates {
  isLoading?: boolean;
  isLoadingDeliveryFee?: boolean;
  isCalculatingDelivery?: boolean;
  isLoadingPrices?: boolean;
  isSubmitting?: boolean;
}

// إعدادات debouncing
export interface DebounceConfig {
  delay: number;
  immediate?: boolean;
}
