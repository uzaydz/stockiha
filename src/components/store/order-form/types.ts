import { UseFormSetValue } from 'react-hook-form';

// تعريف واجهة الحقل المخصص
export interface CustomFormField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'tel' | 'select' | 'radio' | 'checkbox' | 'province' | 'municipality' | 'textarea' | 'deliveryType';
  required: boolean;
  placeholder?: string;
  order: number;
  options?: { label: string; value: string }[];
  defaultValue?: string;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    message?: string;
  };
  isVisible: boolean;
  description?: string;
  linkedFields?: {
    municipalityField?: string | null;
    provinceField?: string | null;
    [key: string]: string | null | undefined;
  };
  dependency?: {
    fieldId: string;
    value: string;
  };
}

// تعريف واجهة إعدادات مزود الشحن المستنسخ
export interface ShippingProviderSettings {
  id?: number;
  name?: string;
  is_active?: boolean;
  is_home_delivery_enabled: boolean;
  is_desk_delivery_enabled: boolean;
  use_unified_price?: boolean;
  unified_home_price?: number;
  unified_desk_price?: number;
  is_free_delivery_home: boolean;
  is_free_delivery_desk: boolean;
  provider_code?: string;
  original_provider_id?: number;
}

// تعريف واجهة الحقل الممتد مع البيانات الخارجية
export interface ExtendedFormField extends CustomFormField {
  provinces?: { id: number; name: string }[];
  municipalities?: { id: number; name: string }[];
  isLoading?: boolean;
  value?: string;
}

// واجهة خصائص نموذج الطلب
export interface CustomFormProps {
  formId?: string;
  formFields: CustomFormField[];
  productId?: string;
  onSubmit?: (data: any) => void;
  isSubmitting?: boolean;
  children?: React.ReactNode;
  noForm?: boolean;
  onDeliveryPriceChange?: (price: number | null) => void;
  onFieldChange?: (name: string, value: string) => void;
  shippingProviderSettings?: ShippingProviderSettings;
}

// واجهة خصائص مكون نوع التوصيل
export interface DeliveryTypeFieldProps {
  field: ExtendedFormField;
  extendedFields: ExtendedFormField[];
  setExtendedFields: React.Dispatch<React.SetStateAction<ExtendedFormField[]>>;
  setValue: UseFormSetValue<any>;
  recalculateAndSetDeliveryPrice: (
    deliveryType?: string,
    provinceId?: string,
    municipalityId?: string
  ) => void;
  handleProvinceChange: (provinceId: string, municipalityFieldId: string | null, deliveryTypeOverride?: string) => Promise<void>;
  updateValue?: (name: string, value: any) => void;
  shippingProviderSettings?: any;
}

// واجهة خصائص النجاح في إرسال الطلب
export interface OrderSuccessProps {
  orderNumber: string;
  quantity: number;
  price: number;
  deliveryFee: number;
  totalPrice: number;
}

/**
 * دالة حساب سعر التوصيل
 */
export type CalculateDeliveryPriceFunction = (
  organizationId: string,
  fromWilayaId: string,
  toWilayaId: string,
  municipalityId: string | null | undefined,
  deliveryType: any,
  weight?: number,
  shippingProviderCloneId?: number | string | null
) => Promise<number>; 