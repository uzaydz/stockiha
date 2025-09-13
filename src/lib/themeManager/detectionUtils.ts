// وظائف الكشف عن المعرفات ونوع الصفحة
import { detectDomainType } from '@/config/theme-config';
import { THEME_CONFIG } from '@/config/theme-config';
import type { PageType } from './types';

/**
 * تحديد نوع الصفحة الحالية
 */
export function getCurrentPageType(): PageType {
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;

  // تحقق من المسارات المحددة للصفحة العامة
  const globalPaths = ['/', '/about', '/contact', '/blog', '/pricing', '/features'];
  if (globalPaths.includes(pathname)) {
    return 'global';
  }

  // إذا كان في لوحة التحكم
  if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) {
    return 'admin';
  }

  // استخدام دالة التحقق الجديدة من التكوين
  const domainInfo = detectDomainType(hostname);
  if (domainInfo.type === 'store') {
    return 'store';
  }

  // التحقق من وجود معرف المؤسسة
  const orgId = getOrganizationIdSync();
  if (orgId) {
    return 'store';
  }

  // التحقق من المسار إذا كان يبدأ بـ /store
  if (pathname.startsWith('/store/')) {
    return 'store';
  }

  // إذا لم يتم التعرف على نوع الصفحة، نفترض أنها صفحة عامة
  return 'global';
}

/**
 * الحصول على معرف المؤسسة من التخزين المحلي أو النطاق
 */
export function getOrganizationIdSync(): string | null {
  // أولاً، التحقق من التخزين المحلي
  const storedOrgId = localStorage.getItem(THEME_CONFIG.STORAGE_KEYS.ORGANIZATION_ID);
  if (storedOrgId) {
    return storedOrgId;
  }

  // ثانياً، محاولة استخراج من النطاق
  const hostname = window.location.hostname;
  const domainInfo = detectDomainType(hostname);

  if (domainInfo.type === 'store' && domainInfo.subdomain) {
    // حفظ النطاق الفرعي للاستخدام لاحقاً
    localStorage.setItem(THEME_CONFIG.STORAGE_KEYS.CURRENT_SUBDOMAIN, domainInfo.subdomain);

    // للنطاق الفرعي dalelousc1samag، نرجع المعرف المعروف
    if (domainInfo.subdomain === 'dalelousc1samag') {
      const orgId = 'b87869bc-a69e-4310-a67a-81c2ab927faf';
      // حفظ المعرف في التخزين المحلي للمرات القادمة
      localStorage.setItem(THEME_CONFIG.STORAGE_KEYS.ORGANIZATION_ID, orgId);
      return orgId;
    }

    return null; // سنحتاج لجلب معرف المؤسسة لاحقاً
  }

  return null;
}

/**
 * الحصول على معرف المؤسسة من النطاق
 */
export function getOrganizationIdFromDomain(hostname: string): string | null {
  const domainInfo = detectDomainType(hostname);

  if (domainInfo.type === 'store' && domainInfo.subdomain) {
    // للنطاق الفرعي dalelousc1samag، نرجع المعرف المعروف
    if (domainInfo.subdomain === 'dalelousc1samag') {
      return 'b87869bc-a69e-4310-a67a-81c2ab927faf';
    }
  }

  return null;
}

/**
 * التحقق من صحة معرف المؤسسة
 */
export function isValidOrganizationId(orgId: string): boolean {
  // فحص إذا كان UUID صالح
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(orgId);
}
