/**
 * بيانات الولايات الجزائرية - مطابقة لهيكل yalidine_provinces_global
 */

export interface YalidineProvince {
  id: number;
  name: string;
  zone: number;
  is_deliverable: boolean;
  name_ar: string | null;
}

export const yalidineProvinces: YalidineProvince[] = [
  {
    id: 1,
    name: "Adrar",
    zone: 4,
    is_deliverable: true,
    name_ar: "أدرار"
  },
  {
    id: 2,
    name: "Chlef",
    zone: 2,
    is_deliverable: true,
    name_ar: "الشلف"
  },
  {
    id: 3,
    name: "Laghouat",
    zone: 3,
    is_deliverable: true,
    name_ar: "الأغواط"
  },
  {
    id: 4,
    name: "Oum El Bouaghi",
    zone: 2,
    is_deliverable: true,
    name_ar: "أم البواقي"
  },
  {
    id: 5,
    name: "Batna",
    zone: 2,
    is_deliverable: true,
    name_ar: "باتنة"
  },
  {
    id: 6,
    name: "Béjaïa",
    zone: 2,
    is_deliverable: true,
    name_ar: "بجاية"
  },
  {
    id: 7,
    name: "Biskra",
    zone: 3,
    is_deliverable: true,
    name_ar: "بسكرة"
  },
  {
    id: 8,
    name: "Béchar",
    zone: 4,
    is_deliverable: true,
    name_ar: "بشار"
  },
  {
    id: 9,
    name: "Blida",
    zone: 1,
    is_deliverable: true,
    name_ar: "البليدة"
  },
  {
    id: 10,
    name: "Bouira",
    zone: 2,
    is_deliverable: true,
    name_ar: "البويرة"
  },
  {
    id: 11,
    name: "Tamanrasset",
    zone: 4,
    is_deliverable: true,
    name_ar: "تمنراست"
  },
  {
    id: 12,
    name: "Tébessa",
    zone: 3,
    is_deliverable: true,
    name_ar: "تبسة"
  },
  {
    id: 13,
    name: "Tlemcen",
    zone: 2,
    is_deliverable: true,
    name_ar: "تلمسان"
  },
  {
    id: 14,
    name: "Tiaret",
    zone: 2,
    is_deliverable: true,
    name_ar: "تيارت"
  },
  {
    id: 15,
    name: "Tizi Ouzou",
    zone: 2,
    is_deliverable: true,
    name_ar: "تيزي وزو"
  },
  {
    id: 16,
    name: "Alger",
    zone: 1,
    is_deliverable: true,
    name_ar: "الجزائر"
  },
  {
    id: 17,
    name: "Djelfa",
    zone: 3,
    is_deliverable: true,
    name_ar: "الجلفة"
  },
  {
    id: 18,
    name: "Jijel",
    zone: 2,
    is_deliverable: true,
    name_ar: "جيجل"
  },
  {
    id: 19,
    name: "Sétif",
    zone: 2,
    is_deliverable: true,
    name_ar: "سطيف"
  },
  {
    id: 20,
    name: "Saïda",
    zone: 2,
    is_deliverable: true,
    name_ar: "سعيدة"
  },
  {
    id: 21,
    name: "Skikda",
    zone: 2,
    is_deliverable: true,
    name_ar: "سكيكدة"
  },
  {
    id: 22,
    name: "Sidi Bel Abbès",
    zone: 2,
    is_deliverable: true,
    name_ar: "سيدي بلعباس"
  },
  {
    id: 23,
    name: "Annaba",
    zone: 2,
    is_deliverable: true,
    name_ar: "عنابة"
  },
  {
    id: 24,
    name: "Guelma",
    zone: 2,
    is_deliverable: true,
    name_ar: "قالمة"
  },
  {
    id: 25,
    name: "Constantine",
    zone: 2,
    is_deliverable: true,
    name_ar: "قسنطينة"
  },
  {
    id: 26,
    name: "Médéa",
    zone: 2,
    is_deliverable: true,
    name_ar: "المدية"
  },
  {
    id: 27,
    name: "Mostaganem",
    zone: 2,
    is_deliverable: true,
    name_ar: "مستغانم"
  },
  {
    id: 28,
    name: "M'Sila",
    zone: 2,
    is_deliverable: true,
    name_ar: "المسيلة"
  },
  {
    id: 29,
    name: "Mascara",
    zone: 2,
    is_deliverable: true,
    name_ar: "معسكر"
  },
  {
    id: 30,
    name: "Ouargla",
    zone: 3,
    is_deliverable: true,
    name_ar: "ورقلة"
  },
  {
    id: 31,
    name: "Oran",
    zone: 2,
    is_deliverable: true,
    name_ar: "وهران"
  },
  {
    id: 32,
    name: "El Bayadh",
    zone: 4,
    is_deliverable: true,
    name_ar: "البيض"
  },
  {
    id: 33,
    name: "Illizi",
    zone: 4,
    is_deliverable: true,
    name_ar: "إليزي"
  },
  {
    id: 34,
    name: "Bordj Bou Arreridj",
    zone: 2,
    is_deliverable: true,
    name_ar: "برج بوعريريج"
  },
  {
    id: 35,
    name: "Boumerdès",
    zone: 1,
    is_deliverable: true,
    name_ar: "بومرداس"
  },
  {
    id: 36,
    name: "El Tarf",
    zone: 2,
    is_deliverable: true,
    name_ar: "الطارف"
  },
  {
    id: 37,
    name: "Tindouf",
    zone: 4,
    is_deliverable: true,
    name_ar: "تندوف"
  },
  {
    id: 38,
    name: "Tissemsilt",
    zone: 2,
    is_deliverable: true,
    name_ar: "تيسمسيلت"
  },
  {
    id: 39,
    name: "El Oued",
    zone: 3,
    is_deliverable: true,
    name_ar: "الوادي"
  },
  {
    id: 40,
    name: "Khenchela",
    zone: 2,
    is_deliverable: true,
    name_ar: "خنشلة"
  },
  {
    id: 41,
    name: "Souk Ahras",
    zone: 2,
    is_deliverable: true,
    name_ar: "سوق أهراس"
  },
  {
    id: 42,
    name: "Tipaza",
    zone: 2,
    is_deliverable: true,
    name_ar: "تيبازة"
  },
  {
    id: 43,
    name: "Mila",
    zone: 2,
    is_deliverable: true,
    name_ar: "ميلة"
  },
  {
    id: 44,
    name: "Aïn Defla",
    zone: 2,
    is_deliverable: true,
    name_ar: "عين الدفلى"
  },
  {
    id: 45,
    name: "Naâma",
    zone: 4,
    is_deliverable: true,
    name_ar: "النعامة"
  },
  {
    id: 46,
    name: "Aïn Témouchent",
    zone: 2,
    is_deliverable: true,
    name_ar: "عين تموشنت"
  },
  {
    id: 47,
    name: "Ghardaïa",
    zone: 3,
    is_deliverable: true,
    name_ar: "غرداية"
  },
  {
    id: 48,
    name: "Relizane",
    zone: 2,
    is_deliverable: true,
    name_ar: "غليزان"
  },
  {
    id: 49,
    name: "Timimoun",
    zone: 4,
    is_deliverable: true,
    name_ar: "تيميمون"
  },
  {
    id: 50,
    name: "Bordj Badji Mokhtar",
    zone: 4,
    is_deliverable: false,
    name_ar: "برج باجي مختار"
  },
  {
    id: 51,
    name: "Ouled Djellal",
    zone: 4,
    is_deliverable: true,
    name_ar: "أولاد جلال"
  },
  {
    id: 52,
    name: "Béni Abbès",
    zone: 4,
    is_deliverable: true,
    name_ar: "بني عباس"
  },
  {
    id: 53,
    name: "In Salah",
    zone: 4,
    is_deliverable: true,
    name_ar: "عين صالح"
  },
  {
    id: 54,
    name: "In Guezzam",
    zone: 4,
    is_deliverable: false,
    name_ar: "عين قزام"
  },
  {
    id: 55,
    name: "Touggourt",
    zone: 4,
    is_deliverable: true,
    name_ar: "تقرت"
  },
  {
    id: 56,
    name: "Djanet",
    zone: 4,
    is_deliverable: true,
    name_ar: "جانت"
  },
  {
    id: 57,
    name: "El M'Ghair",
    zone: 4,
    is_deliverable: true,
    name_ar: "المغير"
  },
  {
    id: 58,
    name: "El Menia",
    zone: 4,
    is_deliverable: true,
    name_ar: "المنيعة"
  }
];

// دالة للحصول على ولاية حسب المعرف
export const getProvinceById = (id: number): YalidineProvince | undefined => {
  return yalidineProvinces.find(province => province.id === id);
};

// دالة للحصول على الولايات القابلة للتسليم فقط
export const getDeliverableProvinces = (): YalidineProvince[] => {
  return yalidineProvinces.filter(province => province.is_deliverable);
};

// دالة للحصول على الولايات حسب المنطقة
export const getProvincesByZone = (zone: number): YalidineProvince[] => {
  return yalidineProvinces.filter(province => province.zone === zone);
};

export default yalidineProvinces;
