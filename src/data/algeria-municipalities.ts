/**
 * بلديات الولايات الجزائرية
 */

export interface Municipality {
  id: string;
  name: string;
  province_id: number;
}

// قائمة البلديات مرتبة حسب الولاية
// لكل ولاية مجموعة من البلديات
const municipalities: { [key: number]: Municipality[] } = {
  // ولاية أدرار (1)
  1: [
    { id: "0101", name: "أدرار", province_id: 1 },
    { id: "0102", name: "تمنطيط", province_id: 1 },
    { id: "0103", name: "رقان", province_id: 1 },
    { id: "0104", name: "تسابيت", province_id: 1 },
    { id: "0105", name: "أولف", province_id: 1 },
    { id: "0106", name: "زاوية كنتة", province_id: 1 },
  ],
  
  // ولاية الشلف (2)
  2: [
    { id: "0201", name: "الشلف", province_id: 2 },
    { id: "0202", name: "تنس", province_id: 2 },
    { id: "0203", name: "بني حواء", province_id: 2 },
    { id: "0204", name: "أولاد فارس", province_id: 2 },
    { id: "0205", name: "وادي الفضة", province_id: 2 },
    { id: "0206", name: "أبو الحسن", province_id: 2 },
  ],
  
  // ولاية الأغواط (3)
  3: [
    { id: "0301", name: "الأغواط", province_id: 3 },
    { id: "0302", name: "قصر الحيران", province_id: 3 },
    { id: "0303", name: "عين ماضي", province_id: 3 },
    { id: "0304", name: "سيدي مخلوف", province_id: 3 },
    { id: "0305", name: "حاسي الرمل", province_id: 3 },
  ],
  
  // ولاية أم البواقي (4)
  4: [
    { id: "0401", name: "أم البواقي", province_id: 4 },
    { id: "0402", name: "عين البيضاء", province_id: 4 },
    { id: "0403", name: "عين مليلة", province_id: 4 },
    { id: "0404", name: "سوق نعمان", province_id: 4 },
    { id: "0405", name: "مسكيانة", province_id: 4 },
  ],
  
  // ولاية باتنة (5)
  5: [
    { id: "0501", name: "باتنة", province_id: 5 },
    { id: "0502", name: "بريكة", province_id: 5 },
    { id: "0503", name: "عين التوتة", province_id: 5 },
    { id: "0504", name: "أريس", province_id: 5 },
    { id: "0505", name: "مروانة", province_id: 5 },
  ],
  
  // ولاية بجاية (6)
  6: [
    { id: "0601", name: "بجاية", province_id: 6 },
    { id: "0602", name: "أقبو", province_id: 6 },
    { id: "0603", name: "أميزور", province_id: 6 },
    { id: "0604", name: "سوق الإثنين", province_id: 6 },
    { id: "0605", name: "تيشي", province_id: 6 },
  ],
  
  // ولاية بسكرة (7)
  7: [
    { id: "0701", name: "بسكرة", province_id: 7 },
    { id: "0702", name: "طولقة", province_id: 7 },
    { id: "0703", name: "سيدي عقبة", province_id: 7 },
    { id: "0704", name: "أولاد جلال", province_id: 7 },
    { id: "0705", name: "زريبة الوادي", province_id: 7 },
  ],
  
  // هكذا لباقي الولايات
  // ولاية الجزائر (16)
  16: [
    { id: "1601", name: "الجزائر الوسطى", province_id: 16 },
    { id: "1602", name: "باب الوادي", province_id: 16 },
    { id: "1603", name: "بئر مراد رايس", province_id: 16 },
    { id: "1604", name: "بوزريعة", province_id: 16 },
    { id: "1605", name: "حسين داي", province_id: 16 },
    { id: "1606", name: "الحراش", province_id: 16 },
    { id: "1607", name: "براقي", province_id: 16 },
    { id: "1608", name: "الدار البيضاء", province_id: 16 },
    { id: "1609", name: "باب الزوار", province_id: 16 },
    { id: "1610", name: "بن عكنون", province_id: 16 },
    { id: "1611", name: "زرالدة", province_id: 16 },
    { id: "1612", name: "بئر توتة", province_id: 16 },
    { id: "1613", name: "الرويبة", province_id: 16 },
    { id: "1614", name: "الدرارية", province_id: 16 },
  ],
  
  // ولاية وهران (31)
  31: [
    { id: "3101", name: "وهران", province_id: 31 },
    { id: "3102", name: "عين الترك", province_id: 31 },
    { id: "3103", name: "أرزيو", province_id: 31 },
    { id: "3104", name: "بئر الجير", province_id: 31 },
    { id: "3105", name: "السانية", province_id: 31 },
    { id: "3106", name: "وادي تليلات", province_id: 31 },
    { id: "3107", name: "بطيوة", province_id: 31 },
  ],
};

// دالة للحصول على بلديات ولاية معينة
export const getMunicipalitiesByProvinceId = (provinceId: number): Municipality[] => {
  return municipalities[provinceId] || [];
};

// دالة للحصول على جميع البلديات
export const getAllMunicipalities = (): Municipality[] => {
  let allMunicipalities: Municipality[] = [];
  
  // تجميع كل البلديات من جميع الولايات
  Object.values(municipalities).forEach(provinceList => {
    allMunicipalities = [...allMunicipalities, ...provinceList];
  });
  
  return allMunicipalities;
};

export default municipalities;
