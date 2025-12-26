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

  // ⚡ إعدادات الوصل الأساسية (مُزامنة في pos_settings)
  paper_width: number; // 58, 80 mm (الأكثر شيوعاً)
  font_size: number; // px
  line_spacing: number;
  print_density: 'light' | 'normal' | 'dark';
  auto_cut: boolean;

  // ⚠️ إعدادات الطابعة المتقدمة - اختيارية هنا
  // ⚡ هذه الإعدادات تأتي من local_printer_settings عبر usePrinterSettings
  // وليس من pos_settings - لذلك هي اختيارية في هذا النوع
  printer_name?: string;                          // اسم الطابعة المحددة
  printer_type?: 'thermal' | 'normal';            // نوع الطابعة
  silent_print?: boolean;                         // طباعة صامتة بدون نافذة
  print_copies?: number;                          // عدد النسخ
  open_cash_drawer?: boolean;                     // فتح درج النقود بعد الطباعة
  print_on_order?: boolean;                       // طباعة تلقائية عند إتمام الطلب
  beep_after_print?: boolean;                     // صوت بعد الطباعة

  // مارجن الطباعة (بالمليمتر) - اختيارية
  margin_top?: number;
  margin_bottom?: number;
  margin_left?: number;
  margin_right?: number;

  // إعدادات المظهر والألوان
  primary_color: string;
  secondary_color: string;
  text_color: string;
  background_color: string;
  receipt_template: 'classic' | 'modern' | 'minimal' | 'apple' | 'custom';

  // إعدادات تخطيط الوصل
  header_style: 'centered' | 'left' | 'right';
  footer_style: 'centered' | 'left' | 'right';
  item_display_style: 'table' | 'list' | 'compact';
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

  // معلومات تجارية للجزائر
  activity?: string;  // نشاط المؤسسة
  rc?: string;        // رقم السجل التجاري
  nif?: string;       // رقم التعريف الجبائي
  nis?: string;       // رقم التعريف الإحصائي
  rib?: string;       // الهوية البنكية

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
  // ⚠️ إعدادات الطابعة المتقدمة - للتوافق فقط
  // ⚡ القيم الفعلية تأتي من local_printer_settings عبر usePrinterSettings
  printer_type: 'thermal',
  silent_print: true,
  print_copies: 1,
  open_cash_drawer: false,
  print_on_order: true,
  beep_after_print: false,
  margin_top: 0,
  margin_bottom: 0,
  margin_left: 0,
  margin_right: 0,
  // المظهر والألوان
  primary_color: '#0099ff',
  secondary_color: '#6c757d',
  text_color: '#000000',
  background_color: '#ffffff',
  receipt_template: 'apple',
  header_style: 'centered',
  footer_style: 'centered',
  item_display_style: 'compact',
  price_position: 'right',
  tax_label: 'الضريبة',
  currency_symbol: 'دج',
  currency_position: 'after',
  allow_price_edit: false,
  require_manager_approval: false,
};

// خيارات قوالب الوصل
export const receiptTemplateOptions = [
  { value: 'apple', label: 'Apple', description: 'تصميم أنيق مثل Apple Store' },
  { value: 'minimal', label: 'بسيط', description: 'تصميم مينيماليست نظيف' },
  { value: 'modern', label: 'عصري', description: 'تصميم حديث أنيق' },
  { value: 'classic', label: 'كلاسيكي', description: 'تصميم تقليدي واضح' },
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
  { value: 'compact', label: 'مدمج', description: 'تصميم مدمج وأنيق' },
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

// خيارات نوع الطابعة
export const printerTypeOptions = [
  { value: 'thermal', label: 'طابعة حرارية', description: 'ESC/POS للوصولات' },
  { value: 'normal', label: 'طابعة عادية', description: 'طابعة ورق A4/A5' },
] as const;

// خيارات عدد النسخ
export const printCopiesOptions = [
  { value: 1, label: 'نسخة واحدة' },
  { value: 2, label: 'نسختان' },
  { value: 3, label: '3 نسخ' },
] as const;
