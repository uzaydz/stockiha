/**
 * أدوات للتعامل مع النطاقات الفرعية والنطاقات المخصصة
 * منفصل لتحسين الأداء وسهولة الصيانة
 */

import type { CustomDomainResult } from '@/types/tenant';

/**
 * التحقق ما إذا كان اسم المضيف هو النطاق الرئيسي
 */
export function isMainDomain(hostname: string): boolean {
  return hostname === 'www.ktobi.online' || hostname === 'ktobi.online';
}

// ⚡ كاش بسيط للنطاقات الفرعية لتجنب إعادة الحساب
const subdomainCache = new Map<string, string | null>();

/**
 * استخراج النطاق الفرعي من اسم المضيف - محسن مع كاش
 */
export async function extractSubdomain(hostname: string): Promise<string | null> {
  // فحص الكاش أولاً
  if (subdomainCache.has(hostname)) {
    return subdomainCache.get(hostname)!;
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔍 استخراج النطاق الفرعي من: ${hostname}`);
  }
  
  let result: string | null = null;
  
  // التعامل مع السابدومين في بيئة localhost المحلية
  if (hostname.includes('localhost')) {
    result = extractLocalSubdomain(hostname);
  }
  // التعامل مع عناوين IP المحلية
  else if (hostname.match(/^127\.\d+\.\d+\.\d+$/) || hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🏠 عنوان IP محلي - استخدام main');
    }
    result = 'main';
  }
  // اختبار ما إذا كان النطاق الرئيسي
  else if (isMainDomain(hostname)) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🏠 النطاق الرئيسي - استخدام main');
    }
    result = 'main';
  }
  else {
    // تقسيم اسم المضيف إلى أجزاء للنطاقات العادية
    const hostParts = hostname.split('.');
    
    // إذا كان لدينا أكثر من جزئين، الجزء الأول هو النطاق الفرعي
    if (hostParts.length > 2) {
      const subdomain = hostParts[0];
      
      // لا نعتبر 'www' كنطاق فرعي حقيقي
      if (subdomain === 'www') {
        if (process.env.NODE_ENV === 'development') {
          console.log('🌐 www subdomain - استخدام main');
        }
        result = 'main';
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ تم العثور على النطاق الفرعي: ${subdomain}`);
        }
        result = subdomain;
      }
    } else {
      // إذا لم نتمكن من استخراج نطاق فرعي، نعيد null
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ لم يتم العثور على نطاق فرعي');
      }
      result = null;
    }
  }
  
  // ⚡ حفظ في الكاش
  subdomainCache.set(hostname, result);
  
  return result;
}

/**
 * استخراج النطاق الفرعي من localhost
 */
function extractLocalSubdomain(hostname: string): string | null {
  // إزالة رقم المنفذ إذا كان موجوداً
  const hostnameWithoutPort = hostname.split(':')[0];
  const parts = hostnameWithoutPort.split('.');

  // مثال: mystore.localhost أو lmrpoxcvvd.localhost
  if (parts.length >= 2 && parts[0] !== 'localhost' && parts[0] !== 'www' && parts[0] !== '') {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🏠 النطاق الفرعي المحلي: ${parts[0]}`);
    }
    return parts[0];
  }
  
  // إذا كان فقط localhost بدون سابدومين
  if (hostnameWithoutPort === 'localhost') {
    if (process.env.NODE_ENV === 'development') {
      console.log('🏠 localhost بدون نطاق فرعي - استخدام main');
    }
    return 'main';
  }
  
  return null;
}

/**
 * فحص النطاق المخصص والحصول على معلومات المؤسسة
 * ملاحظة: تتطلب دالة fetchOrganizationUnified من مكان آخر
 */
export async function checkCustomDomain(
  hostname: string,
  fetchOrganizationUnified: (params: any) => Promise<any>
): Promise<CustomDomainResult | null> {
  if (!hostname || hostname.includes('localhost')) {
    return null;
  }
  
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 فحص النطاق المخصص: ${hostname}`);
    }
    
    const orgData = await fetchOrganizationUnified({ hostname });
    
    if (orgData && orgData.id && orgData.subdomain) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ تم العثور على مؤسسة للنطاق المخصص: ${orgData.subdomain}`);
      }
      
      return {
        id: orgData.id,
        subdomain: orgData.subdomain
      };
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ خطأ في فحص النطاق المخصص:', error);
    }
  }
  
  return null;
}

/**
 * التحقق من صحة النطاق الفرعي
 */
export function isValidSubdomain(subdomain: string): boolean {
  if (!subdomain || typeof subdomain !== 'string') {
    return false;
  }
  
  // النطاق الفرعي يجب أن يكون أطول من حرف واحد
  if (subdomain.length < 2) {
    return false;
  }
  
  // فحص الأحرف المسموحة (أحرف، أرقام، وخط)
  const validPattern = /^[a-zA-Z0-9-]+$/;
  if (!validPattern.test(subdomain)) {
    return false;
  }
  
  // لا يجب أن يبدأ أو ينتهي بخط
  if (subdomain.startsWith('-') || subdomain.endsWith('-')) {
    return false;
  }
  
  return true;
}

/**
 * تطبيع النطاق الفرعي (تحويل لأحرف صغيرة وتنظيف)
 */
export function normalizeSubdomain(subdomain: string): string {
  return subdomain.toLowerCase().trim();
}

/**
 * إنشاء URL كامل من النطاق الفرعي
 */
export function buildSubdomainUrl(subdomain: string, baseUrl: string = 'ktobi.online'): string {
  const normalizedSubdomain = normalizeSubdomain(subdomain);
  
  if (normalizedSubdomain === 'main' || normalizedSubdomain === 'www') {
    return `https://${baseUrl}`;
  }
  
  return `https://${normalizedSubdomain}.${baseUrl}`;
}
