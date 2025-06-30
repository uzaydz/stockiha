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
 * التحقق مما إذا كانت التطبيق يعمل في بيئة Electron
 */
export const isElectron = (): boolean => {
  // التحقق من وجود واجهة Electron API (الطريقة الأكثر موثوقية)
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    return true;
  }
  
  // التحقق من وجود خصائص العملية الرئيسية للإلكترون
  if (
    typeof window !== 'undefined' && 
    typeof (window as any).process === 'object' && 
    (window as any).process?.type === 'renderer'
  ) {
    return true;
  }

  // محاولة استدعاء وحدة الإلكترون (في بيئة الإلكترون فقط)
  if (
    typeof window !== 'undefined' &&
    typeof (window as any).require === 'function'
  ) {
    try {
      const electron = (window as any).require('electron');
      if (electron) return true;
    } catch (e) {
      // نحن لسنا في بيئة إلكترون
    }
  }
  
  // وضع علامة على الصفحة لتوضيح أننا في متصفح
  if (typeof window !== 'undefined' && !(window as any).__IS_BROWSER_ENV_DETECTED) {
    
    (window as any).__IS_BROWSER_ENV_DETECTED = true;
  }
  
  // بشكل افتراضي، نفترض أننا في بيئة المتصفح
  return false;
};

/**
 * Proporciona una alternativa segura a path.join para entornos web
 */
export const safePath = (...paths: string[]): string => {
  if (isElectron()) {
    try {
      // En entorno Electron, usar el módulo path
      const path = window.require('path');
      return path.join(...paths);
    } catch (error) {
    }
  }
  
  // Fallback para entornos web: simple join con separador /
  return paths.join('/').replace(/\/+/g, '/');
};

/**
 * الحصول على مسار بيانات المستخدم في تطبيق Electron
 */
export const getUserDataPath = (): string => {
  if (isElectron()) {
    try {
      // محاولة الوصول إلى واجهة Electron
      const electronAPI = (window as any).electronAPI;
      if (electronAPI && electronAPI.getUserDataPath) {
        return electronAPI.getUserDataPath();
      }
      
      // في حالة عدم توفر واجهة electronAPI، نحاول الوصول مباشرة إلى app
      const electron = window.require('electron');
      const app = electron.remote ? electron.remote.app : electron.app;
      if (app && app.getPath) {
        return app.getPath('userData');
      }
    } catch (error) {
    }
  }
  
  // في حالة الفشل أو في بيئة المتصفح، نرجع مسار افتراضي
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
