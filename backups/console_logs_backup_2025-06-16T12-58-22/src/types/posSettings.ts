// أنواع إعدادات نقطة البيع
export interface POSSettings {
  id?: string;
  organization_id: string;
  
  // معلومات المتجر الأساسية
  store_name: string;
  store_phone?: string;
  store_email?: string;
  store_address?: string;
  store_website?: string;
  store_logo_url?: string;
  
  // إعدادات نص الوصل
  receipt_header_text: string;
  receipt_footer_text: string;
  welcome_message: string;
  
  // إعدادات العناصر المرئية
  show_qr_code: boolean;
  show_tracking_code: boolean;
  show_customer_info: boolean;
  show_store_logo: boolean;
  show_store_info: boolean;
  show_date_time: boolean;
  show_employee_name: boolean;
  
  // إعدادات الطباعة
  paper_width: number; // 48, 58, 80 mm
  font_size: number; // px
  line_spacing: number;
  print_density: 'light' | 'normal' | 'dark';
  auto_cut: boolean;
  
  // إعدادات المظهر والألوان
  primary_color: string;
  secondary_color: string;
  text_color: string;
  background_color: string;
  receipt_template: 'classic' | 'modern' | 'minimal' | 'custom';
  
  // إعدادات تخطيط الوصل
  header_style: 'centered' | 'left' | 'right';
  footer_style: 'centered' | 'left' | 'right';
  item_display_style: 'table' | 'list';
  price_position: 'right' | 'left';
  
  // إعدادات متقدمة
  custom_css?: string;
  tax_label: string;
  currency_symbol: string;
  currency_position: 'before' | 'after';
  
  // إعدادات الأمان والصلاحيات
  allow_price_edit: boolean;
  require_manager_approval: boolean;
  
  // معلومات إضافية
  business_license?: string;
  tax_number?: string;
  
  // طوابع زمنية
  created_at?: string;
  updated_at?: string;
}

// إعدادات افتراضية
export const defaultPOSSettings: Omit<POSSettings, 'organization_id'> = {
  store_name: 'المتجر',
  receipt_header_text: 'شكراً لتعاملكم معنا',
  receipt_footer_text: 'نتطلع لخدمتكم مرة أخرى',
  welcome_message: 'أهلاً وسهلاً بكم',
  show_qr_code: true,
  show_tracking_code: true,
  show_customer_info: true,
  show_store_logo: true,
  show_store_info: true,
  show_date_time: true,
  show_employee_name: false,
  paper_width: 58,
  font_size: 10,
  line_spacing: 1.2,
  print_density: 'normal',
  auto_cut: true,
  primary_color: '#0099ff',
  secondary_color: '#6c757d',
  text_color: '#000000',
  background_color: '#ffffff',
  receipt_template: 'classic',
  header_style: 'centered',
  footer_style: 'centered',
  item_display_style: 'table',
  price_position: 'right',
  tax_label: 'الضريبة',
  currency_symbol: 'دج',
  currency_position: 'after',
  allow_price_edit: false,
  require_manager_approval: false,
};

// خيارات قوالب الوصل
export const receiptTemplateOptions = [
  { value: 'classic', label: 'كلاسيكي', description: 'تصميم تقليدي واضح' },
  { value: 'modern', label: 'عصري', description: 'تصميم حديث أنيق' },
  { value: 'minimal', label: 'بسيط', description: 'تصميم بسيط ونظيف' },
  { value: 'custom', label: 'مخصص', description: 'استخدام CSS مخصص' },
] as const;

// خيارات عرض الورق
export const paperWidthOptions = [
  { value: 48, label: '48 مم', description: 'طابعات صغيرة' },
  { value: 58, label: '58 مم', description: 'الأكثر شيوعاً' },
  { value: 80, label: '80 مم', description: 'طابعات كبيرة' },
] as const;

// خيارات كثافة الطباعة
export const printDensityOptions = [
  { value: 'light', label: 'خفيفة', description: 'توفير الحبر' },
  { value: 'normal', label: 'عادية', description: 'الإعداد المعتاد' },
  { value: 'dark', label: 'داكنة', description: 'وضوح أكبر' },
] as const;

// خيارات تخطيط النص
export const textAlignmentOptions = [
  { value: 'left', label: 'يسار' },
  { value: 'centered', label: 'وسط' },
  { value: 'right', label: 'يمين' },
] as const;

// خيارات عرض العناصر
export const itemDisplayOptions = [
  { value: 'table', label: 'جدول', description: 'عرض في شكل جدول' },
  { value: 'list', label: 'قائمة', description: 'عرض في شكل قائمة' },
] as const;

// خيارات موضع السعر
export const pricePositionOptions = [
  { value: 'right', label: 'يمين' },
  { value: 'left', label: 'يسار' },
] as const;

// خيارات موضع رمز العملة
export const currencyPositionOptions = [
  { value: 'before', label: 'قبل الرقم' },
  { value: 'after', label: 'بعد الرقم' },
] as const;
