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
    console.warn('Invalid price value:', price);
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
    console.error('Error formatting price:', error);
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

// تنسيق التاريخ بطريقة مناسبة للواجهة العربية ولكن بالأرقام العادية
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(dateObj);
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
    console.log('[ENV] تم تحديد بيئة المتصفح، تجاهل فحوصات إلكترون اللاحقة');
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
      console.error('Error al usar path.join en Electron:', error);
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
      console.error('خطأ في الحصول على مسار بيانات المستخدم:', error);
    }
  }
  
  // في حالة الفشل أو في بيئة المتصفح، نرجع مسار افتراضي
  return './user-data';
};
