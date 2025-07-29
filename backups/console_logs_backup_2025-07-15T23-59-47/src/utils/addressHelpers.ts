import provinces from '@/data/algeria-provinces';
import municipalities from '@/data/algeria-municipalities';

/**
 * تحويل معرف الولاية إلى اسم الولاية
 * @param provinceId معرف الولاية (كرقم أو نص)
 * @returns اسم الولاية أو المعرف الأصلي إذا لم يوجد
 */
export function getProvinceName(provinceId: string | number): string {
  if (!provinceId) return '';
  
  const id = typeof provinceId === 'string' ? parseInt(provinceId) : provinceId;
  const province = provinces.find(p => p.id === id);
  
  return province ? province.name : provinceId.toString();
}

/**
 * تحويل معرف البلدية إلى اسم البلدية
 * @param municipalityId معرف البلدية (مثل "505" أو "0505")
 * @param provinceId معرف الولاية (اختياري لتحسين البحث)
 * @returns اسم البلدية أو المعرف الأصلي إذا لم يوجد
 */
export function getMunicipalityName(municipalityId: string | number, provinceId?: string | number): string {
  if (!municipalityId) return '';
  
  const id = municipalityId.toString();
  
  // إذا كان معرف البلدية رقم 3 أرقام، حوله إلى 4 أرقام
  let formattedId = id;
  if (id.length === 3) {
    formattedId = '0' + id;
  }
  
  // إذا كان معرف البلدية لا يحتوي على معرف الولاية، أضفه
  if (formattedId.length === 4 && !formattedId.startsWith('0')) {
    if (provinceId) {
      const provinceStr = provinceId.toString().padStart(2, '0');
      formattedId = provinceStr + formattedId.slice(-2);
    }
  }
  
  // البحث في جميع البلديات
  for (const provinceId in municipalities) {
    const provinceMunicipalities = municipalities[parseInt(provinceId)];
    if (provinceMunicipalities) {
      const municipality = provinceMunicipalities.find(m => 
        m.id === formattedId || 
        m.id === id ||
        m.id.endsWith(id.slice(-2))
      );
      if (municipality) {
        return municipality.name;
      }
    }
  }
  
  return municipalityId.toString();
}

/**
 * تحويل معرف الولاية والبلدية إلى أسماء مع معالجة الحالات الخاصة
 * @param provinceId معرف الولاية
 * @param municipalityId معرف البلدية
 * @returns كائن يحتوي على أسماء الولاية والبلدية
 */
export function getAddressNames(provinceId: string | number, municipalityId: string | number) {
  return {
    provinceName: getProvinceName(provinceId),
    municipalityName: getMunicipalityName(municipalityId, provinceId)
  };
}
