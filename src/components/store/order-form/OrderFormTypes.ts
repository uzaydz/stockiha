import { z } from "zod";

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
  { id: "office", name: "استلام من مكتب شركة التوصيل", icon: "🏢" }
];

// Payment methods
export const PAYMENT_METHODS = [
  { id: "cash_on_delivery", name: "الدفع عند الاستلام", icon: "💵" },
  { id: "bank_transfer", name: "تحويل بنكي", icon: "🏦" }
];

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
  }),
  address: z.string().min(5, {
    message: "العنوان يجب أن يحتوي على 5 أحرف على الأقل",
  }),
  deliveryCompany: z.string({
    required_error: "يرجى اختيار شركة التوصيل",
  }),
  deliveryOption: z.enum(["home", "office"], {
    required_error: "يرجى اختيار خيار التوصيل",
  }),
  paymentMethod: z.string({
    required_error: "يرجى اختيار طريقة الدفع",
  }),
  notes: z.string().optional(),
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

export type OrderFormValues = z.infer<typeof orderFormSchema>;

export interface OrderFormProps {
  productId: string;
  productColorId?: string | null;
  productSizeId?: string | null;
  sizeName?: string | null;
  price: number;
  deliveryFee?: number;
  quantity?: number;
  customFields?: CustomFormField[];
  redirectAfterSuccess?: boolean;
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
  onDeliveryCompanyChange: (value: string) => void;
}

export interface CustomFormFieldsProps {
  customFields: CustomFormField[];
}

export interface OrderSummaryProps {
  quantity: number;
  price: number;
  deliveryFee: number;
  total: number;
  isSubmitting: boolean;
} 