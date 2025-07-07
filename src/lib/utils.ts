import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import * as LucideIcons from "lucide-react"
import { LucideIcon } from "lucide-react"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type Currency = 'DZD' | 'USD' | 'EUR';

/**
 * تنسيق الأسعار بشكل موحد في التطبيق
 * مع دعم العملات المختلفة (الافتراضي: الدينار الجزائري)
 */
export function formatPrice(price: number | string | null | undefined, currency: Currency = 'DZD'): string {
  // التعامل مع القيم الفارغة أو غير المحددة
  if (price === null || price === undefined) {
    return '0.00 دج';
  }
  
  // تحويل النص إلى رقم إذا كان المدخل نصياً
  let numericPrice: number;
  
  if (typeof price === 'string') {
    // إزالة أي أحرف غير رقمية باستثناء النقطة العشرية والسالب
    const cleanString = price.replace(/[^\d.-]/g, '');
    numericPrice = parseFloat(cleanString);
  } else {
    numericPrice = price;
  }
  
  // التحقق من أن القيمة رقم صالح
  if (isNaN(numericPrice)) {
    numericPrice = 0;
  }
  
  const locale = 'en-US';
  const symbol = currency === 'DZD' ? 'دج' : currency;
  
  try {
    const formattedPrice = new Intl.NumberFormat(locale, {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericPrice);

    // في الجزائر، يتم وضع رمز العملة بعد الرقم مع مسافة
    return `${formattedPrice} ${symbol}`;
  } catch (error) {
    return `${numericPrice.toFixed(2)} ${symbol}`;
  }
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Returns a Lucide icon component by its name
 */
export function getLucideIcon(iconName: string): LucideIcon | null {
  // Filter out non-icon properties from the Lucide import
  return (iconName && typeof iconName === 'string' && 
    Object.prototype.hasOwnProperty.call(LucideIcons, iconName) && 
    typeof LucideIcons[iconName as keyof typeof LucideIcons] === 'function') 
    ? LucideIcons[iconName as keyof typeof LucideIcons] as unknown as LucideIcon 
    : LucideIcons.FolderRoot;
}

export const iconToComponent = (icon: string | null | undefined, size = 16): React.ReactNode => {
  return null; // سيتم تنفيذ هذه الدالة في مكان آخر لتعامل مع المكونات الحقيقية
};

/**
 * تنسيق التاريخ والوقت بطريقة مناسبة للواجهة
 * يعرض التاريخ والوقت بتنسيق كامل
 */
export function formatDateTime(dateString: string | Date, options?: { locale?: 'ar-DZ' | 'en-US' }): string {
  if (!dateString) return '';
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const locale = options?.locale || 'en-US';
  
  if (locale === 'ar-DZ') {
    return new Intl.DateTimeFormat('ar-DZ', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    }).format(date);
  }
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(date);
}

/**
 * تنسيق التاريخ بطريقة مناسبة للواجهة
 * يدعم الواجهة العربية والإنجليزية
 */
export function formatDate(dateString: string | Date, options?: { locale?: 'ar-DZ' | 'en-US' }): string {
  if (!dateString) return '';
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const locale = options?.locale || 'en-US';
  
  if (locale === 'ar-DZ') {
    return new Intl.DateTimeFormat('ar-DZ', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(date);
  }
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date);
}

// تنسيق العملة بالدينار الجزائري بالأرقام العادية
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'DZD',
    currencyDisplay: 'symbol'
  }).format(amount).replace('DZD', 'دج');
}

/**
 * التحقق مما إذا كانت التطبيق يعمل في بيئة Electron - معطل لضمان عمل الموقع كموقع ويب فقط
 */
export const isElectron = (): boolean => {
  return false; // دائماً false لضمان عدم تشغيل أي كود خاص بـ Electron
};

/**
 * بديل آمن لـ path.join للبيئات الويب
 */
export const safePath = (...paths: string[]): string => {
  // دمج بسيط مع فاصل / للبيئات الويب
  return paths.join('/').replace(/\/+/g, '/');
};

/**
 * الحصول على مسار بيانات المستخدم للبيئات الويب
 */
export const getUserDataPath = (): string => {
  // في بيئة المتصفح، نرجع مسار افتراضي
  return './user-data';
};

/**
 * اختصار النص إذا تجاوز طولاً معيناً
 */
export function truncateText(text: string, maxLength: number = 50): string {
  if (!text) return '';
  
  if (text.length <= maxLength) return text;
  
  return text.substring(0, maxLength) + '...';
}

/**
 * تحويل كائن إلى معلمات URL
 */
export function objectToQueryParams(obj: Record<string, any>): string {
  const params = new URLSearchParams();
  
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });
  
  return params.toString();
}

/**
 * توليد لون عشوائي للاختبار
 */
export function getRandomColor(): string {
  const letters = '0123456789ABCDEF';
  let color = '#';
  
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  
  return color;
}

/**
 * تنسيق رقم الهاتف الجزائري
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  
  // إزالة أي أحرف غير رقمية
  const cleaned = phone.replace(/\D/g, '');
  
  // إذا كان الرقم يبدأ بـ 0، حذفه
  const normalized = cleaned.startsWith('0') ? cleaned.substring(1) : cleaned;
  
  // تنسيق الرقم
  if (normalized.length === 9) {
    return `0${normalized.substring(0, 2)} ${normalized.substring(2, 5)} ${normalized.substring(5, 7)} ${normalized.substring(7, 9)}`;
  }
  
  // إرجاع الرقم كما هو إذا لم يكن بالتنسيق المتوقع
  return phone;
}
