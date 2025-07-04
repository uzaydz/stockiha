/**
 * مكتبة للوصول للبيانات الثابتة للولايات والبلديات
 * لتجنب الاستدعاءات غير الضرورية لقاعدة البيانات
 */

import { getAvailableWilayas, getMunicipalitiesByWilayaId } from '@/data/yalidine-municipalities-complete';

/**
 * جلب الولايات من البيانات الثابتة بدلاً من قاعدة البيانات
 * @returns مصفوفة الولايات المتاحة
 */
export function getStaticProvinces() {
  return getAvailableWilayas();
}

/**
 * جلب البلديات لولاية معينة من البيانات الثابتة
 * @param provinceId معرف الولاية
 * @returns مصفوفة البلديات
 */
export function getStaticMunicipalities(provinceId: string | number) {
  const id = typeof provinceId === 'string' ? parseInt(provinceId) : provinceId;
  return getMunicipalitiesByWilayaId(id);
}

/**
 * تحقق من صحة معرف الولاية
 * @param provinceId معرف الولاية
 * @returns true إذا كانت الولاية موجودة
 */
export function isValidProvince(provinceId: string | number): boolean {
  const id = typeof provinceId === 'string' ? parseInt(provinceId) : provinceId;
  const provinces = getAvailableWilayas();
  return provinces.some(province => province.id === id);
}

/**
 * جلب اسم الولاية بمعرفها
 * @param provinceId معرف الولاية
 * @returns اسم الولاية أو null
 */
export function getProvinceName(provinceId: string | number): string | null {
  const id = typeof provinceId === 'string' ? parseInt(provinceId) : provinceId;
  const provinces = getAvailableWilayas();
  const province = provinces.find(p => p.id === id);
  return province ? (province.name_ar || province.name) : null;
}

/**
 * جلب اسم البلدية بمعرفها
 * @param municipalityId معرف البلدية
 * @param provinceId معرف الولاية (اختياري لتحسين الأداء)
 * @returns اسم البلدية أو null
 */
export function getMunicipalityName(
  municipalityId: string | number, 
  provinceId?: string | number
): string | null {
  const id = typeof municipalityId === 'string' ? parseInt(municipalityId) : municipalityId;
  
  if (provinceId) {
    const municipalities = getStaticMunicipalities(provinceId);
    const municipality = municipalities.find(m => m.id === id);
    return municipality?.name || null;
  }
  
  // البحث في جميع الولايات
  const provinces = getAvailableWilayas();
  for (const province of provinces) {
    const municipalities = getMunicipalitiesByWilayaId(province.id);
    const municipality = municipalities.find(m => m.id === id);
    if (municipality) {
      return municipality.name;
    }
  }
  
  return null;
}
