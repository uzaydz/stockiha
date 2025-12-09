/**
 * ⚡ وظائف موحدة للحصول على معرف المؤسسة
 * مصدر واحد للحقيقة لتجنب التناقضات
 */

/**
 * الحصول على معرف المؤسسة الحالية من التخزين المحلي
 * يبحث في جميع المواقع الممكنة بترتيب الأولوية
 */
export function getCurrentOrganizationId(): string {
  if (typeof window === 'undefined') return '';

  // ترتيب الأولوية:
  // 1. bazaar_organization_id - المصدر الرئيسي
  // 2. currentOrganizationId - للتوافق مع الكود القديم
  return (
    localStorage.getItem('bazaar_organization_id') ||
    localStorage.getItem('currentOrganizationId') ||
    ''
  );
}

/**
 * تعيين معرف المؤسسة الحالية
 * يحفظ في كلا الموقعين للتوافق
 */
export function setCurrentOrganizationId(orgId: string): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem('bazaar_organization_id', orgId);
  localStorage.setItem('currentOrganizationId', orgId);
}

/**
 * مسح معرف المؤسسة الحالية
 */
export function clearCurrentOrganizationId(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem('bazaar_organization_id');
  localStorage.removeItem('currentOrganizationId');
}

/**
 * التحقق من وجود معرف مؤسسة محفوظ
 */
export function hasOrganizationId(): boolean {
  return !!getCurrentOrganizationId();
}
