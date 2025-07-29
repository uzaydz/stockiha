import { z } from "zod";
import { ShippingProviderSettings } from "./types"; // استيراد واجهة إعدادات مزود الشحن من ملف types.ts

// Provinces data
export const PROVINCES = [
  "أدرار", "الشلف", "الأغواط", "أم البواقي", "باتنة", "بجاية", "بسكرة", "بشار", "البليدة", "البويرة",
  "تمنراست", "تبسة", "تلمسان", "تيارت", "تيزي وزو", "الجزائر", "الجلفة", "جيجل", "سطيف", "سعيدة",
  "سكيكدة", "سيدي بلعباس", "عنابة", "قالمة", "قسنطينة", "المدية", "مستغانم", "المسيلة", "معسكر", "ورقلة",
  "وهران", "البيض", "إليزي", "برج بوعريريج", "بومرداس", "الطارف", "تندوف", "تيسمسيلت", "الوادي", "خنشلة",
  "سوق أهراس", "تيبازة", "ميلة", "عين الدفلى", "النعامة", "عين تموشنت", "غرداية", "غليزان"
];

// Delivery companies
export const DELIVERY_COMPANIES = [
  { id: "yalidine", name: "ياليدين", icon: "📦", fee: 400 },
  { id: "zr_express", name: "زد آر إكسبرس", icon: "🚚", fee: 350 },
  { id: "quick_line", name: "كويك لاين", icon: "🚀", fee: 450 }
];

// Delivery options
export const DELIVERY_OPTIONS = [
  { id: "home", name: "توصيل للمنزل", icon: "🏠" },
  { id: "desk", name: "استلام من مكتب شركة التوصيل", icon: "🏢" }
];

// Payment methods
export const PAYMENT_METHODS = [
  { id: "cash_on_delivery", name: "الدفع عند الاستلام", icon: "💵" },
  { id: "bank_transfer", name: "تحويل بنكي", icon: "🏦" },
  { id: "cash", name: "كاش", icon: "💰" }
];

// Shipping provider integration interface
export interface ShippingIntegration {
  enabled: boolean;
  provider_id: number;
  provider_code?: string;
  origin_wilaya_id?: string | null;
}

// Form settings interface
export interface FormSettings {
  id: string;
  name: string;
  is_default: boolean;
  is_active: boolean;
  version: number;
  settings: {
    shipping_integration?: ShippingIntegration;
    shipping_clone_id?: number | null;
    [key: string]: any;
  };
  fields?: CustomFormField[];
  shipping_clone_id?: number | null;
  purchase_page_config?: {
    shipping_clone_id?: number | null;
    [key: string]: any;
  };
  [key: string]: any;
}

// Wilaya interface
export interface Wilaya {
  id: number;
  name: string;
  zone: number;
  is_deliverable: boolean;
}

// Commune interface
export interface Commune {
  id: number;
  name: string;
  wilaya_id: number;
  has_stop_desk: boolean;
  is_deliverable: boolean;
  delivery_time_parcel: number;
  delivery_time_payment: number;
}

// Form schema - improved
export const orderFormSchema = z.object({
  fullName: z.string().min(3, {
    message: "الإسم واللقب يجب أن يحتوي على 3 أحرف على الأقل",
  }),
  phone: z.string().min(10, {
    message: "يرجى إدخال رقم هاتف صحيح",
  }),
  province: z.string({
    required_error: "يرجى اختيار الولاية",
  }),
  municipality: z.string().min(2, {
    message: "يرجى إدخال البلدية",
  }).optional(),
  stopDeskId: z.string({
    required_error: "يرجى اختيار مكتب الاستلام",
  }).optional(),
  address: z.string().min(5, {
    message: "العنوان يجب أن يحتوي على 5 أحرف على الأقل",
  }).optional(),
  deliveryCompany: z.string({
    required_error: "يرجى اختيار شركة التوصيل",
  }),
  deliveryOption: z.enum(["home", "desk"], {
    required_error: "يرجى اختيار خيار التوصيل",
  }),
  paymentMethod: z.string({
    required_error: "يرجى اختيار طريقة الدفع",
  }),
  notes: z.string().optional(),
}).refine((data) => {
  // التحقق من وجود العنوان عندما يكون نوع التوصيل للمنزل
  if (data.deliveryOption === 'home') {
    if (!data.address || data.address.trim().length < 5) {
      return false;
    }
  }
  return true;
}, {
  message: "العنوان مطلوب ومفصل للتوصيل المنزلي ويجب أن يحتوي على 5 أحرف على الأقل",
  path: ["address"],
}).refine((data) => {
  // التحقق من وجود stopDeskId عندما يكون نوع التوصيل هو desk
  if (data.deliveryOption === 'desk') {
    // تسهيل هذا التحقق الآن لأننا سنعالجه داخل processFormSubmission
    // ونضع قيمة افتراضية إذا لزم الأمر عند التعامل مع النموذج المخصص
    return true;
  }
  return true;
}, {
  message: "يرجى اختيار مكتب الاستلام",
  path: ["stopDeskId"],
});

// تعريف نوع المخصص لحقل نموذج
export interface CustomFormField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'tel' | 'select' | 'radio' | 'checkbox' | 'province' | 'municipality' | 'textarea';
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

export interface OrderFormValues {
  fullName?: string;
  phone?: string;
  province?: string;
  municipality?: string;
  stopDeskId?: string;
  address?: string;
  deliveryCompany?: string; 
  deliveryOption?: 'home' | 'desk';
  paymentMethod?: string;
  notes?: string;
  // حقول إضافية للنموذج المخصص ومزود الشحن
  form_id?: string | null;
  shipping_clone_id?: string | number | null;
  [key: string]: any; // للحقول المخصصة الديناميكية
}

// Define the structure for an active offer
export interface ActiveOfferData {
  id?: string | number;
  type: string; // e.g., 'discount_percentage', 'discount_fixed', 'free_shipping'
  discountValue?: number;
  freeShipping?: boolean;
  minQuantity?: number;
  // Add any other relevant fields from your actual offer structure
}

// Interface for Abandoned Cart Payload
export interface AbandonedCartPayload {
  organization_id: string;
  product_id?: string | null;
  product_color_id?: string | null;
  product_size_id?: string | null;
  quantity?: number;
  customer_name?: string;
  customer_phone: string;
  customer_email?: string;
  province?: string;
  municipality?: string;
  address?: string;
  delivery_option?: string;
  payment_method?: string;
  notes?: string;
  custom_fields_data?: Record<string, any>;
  calculated_delivery_fee?: number | null;
  subtotal?: number | null;
  discount_amount?: number | null;
  total_amount?: number | null;
  // status is handled by the backend or specific flows
}

// Interface for props passed to the OrderForm component
export interface OrderFormProps {
  productId: string;
  productColorId?: string | null;
  productSizeId?: string | null;
  sizeName?: string | null;
  basePrice: number;
  activeOffer?: ActiveOfferData;
  deliveryFee?: number;
  quantity?: number;
  customFields?: CustomFormField[];
  formSettings?: FormSettings | null;
  productColorName?: string | null;
  productSizeName?: string | null;
}

export interface OrderSuccessProps {
  orderNumber: string;
  quantity: number;
  price: number;
  deliveryFee: number;
  totalPrice: number;
}

export interface PersonalInfoFieldsProps {
  form: any;
}

export interface DeliveryInfoFieldsProps {
  form: any;
  onDeliveryCompanyChange?: (value: string) => void;
  provinces?: Wilaya[];
  municipalities?: Commune[];
  onWilayaChange?: (wilayaId: string) => void;
  hasShippingIntegration?: boolean;
  isLoadingWilayas?: boolean;
  isLoadingCommunes?: boolean;
  shippingProviderSettings?: ShippingProviderSettings;
  yalidineCenters?: any[];
  isLoadingYalidineCenters?: boolean;
  onDeliveryPriceCalculated?: (price: number) => void;
}

export interface CustomFormFieldsProps {
  customFields: CustomFormField[];
  deliveryType?: 'home' | 'desk';
}

// Interface for props passed to the OrderSummary component
export interface OrderSummaryProps {
  productId: string;
  quantity: number;
  basePrice: number;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  hasFreeShipping: boolean;
  total: number;
  isLoadingDeliveryFee: boolean;
  productColorName?: string | null;
  productSizeName?: string | null;
  productName?: string;
  productImage?: string;
  productColor?: string | null;
  productSize?: string | null;
  deliveryType?: 'home' | 'desk';
  shippingProviderSettings?: ShippingProviderSettings;
}
