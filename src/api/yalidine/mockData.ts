/**
 * بيانات اختبارية لياليدين
 * تستخدم في وضع التطوير المحلي لتجنب الاتصال المباشر بواجهة برمجة التطبيقات
 */

import { Province, Municipality, Center, DeliveryFee, DeliveryType } from './types';

// قائمة الولايات
export const mockProvinces: Province[] = [
  { id: 16, name: "الجزائر", zone: 1, is_deliverable: 1 },
  { id: 19, name: "سطيف", zone: 2, is_deliverable: 1 },
  { id: 31, name: "وهران", zone: 3, is_deliverable: 1 },
  { id: 23, name: "عنابة", zone: 2, is_deliverable: 1 },
  { id: 25, name: "قسنطينة", zone: 2, is_deliverable: 1 },
  { id: 9, name: "البليدة", zone: 1, is_deliverable: 1 },
  { id: 15, name: "تيزي وزو", zone: 1, is_deliverable: 1 },
  { id: 29, name: "معسكر", zone: 3, is_deliverable: 1 },
  { id: 34, name: "برج بوعريريج", zone: 2, is_deliverable: 1 },
  { id: 20, name: "سعيدة", zone: 3, is_deliverable: 1 }
];

// قائمة البلديات حسب الولاية
export const mockMunicipalities: Record<string, Municipality[]> = {
  "16": [ // الجزائر
    { id: 160, name: "الجزائر", province_id: 16, is_home_deliverable: 1, is_stopdesk_deliverable: 1 },
    { id: 161, name: "باب الزوار", province_id: 16, is_home_deliverable: 1, is_stopdesk_deliverable: 1 },
    { id: 162, name: "بئر خادم", province_id: 16, is_home_deliverable: 1, is_stopdesk_deliverable: 1 },
    { id: 163, name: "حسين داي", province_id: 16, is_home_deliverable: 1, is_stopdesk_deliverable: 1 }
  ],
  "19": [ // سطيف
    { id: 190, name: "سطيف", province_id: 19, is_home_deliverable: 1, is_stopdesk_deliverable: 1 },
    { id: 191, name: "العلمة", province_id: 19, is_home_deliverable: 1, is_stopdesk_deliverable: 1 },
    { id: 192, name: "عين أرنات", province_id: 19, is_home_deliverable: 1, is_stopdesk_deliverable: 1 }
  ],
  "31": [ // وهران
    { id: 310, name: "وهران", province_id: 31, is_home_deliverable: 1, is_stopdesk_deliverable: 1 },
    { id: 311, name: "بئر الجير", province_id: 31, is_home_deliverable: 1, is_stopdesk_deliverable: 1 },
    { id: 312, name: "السانية", province_id: 31, is_home_deliverable: 1, is_stopdesk_deliverable: 1 }
  ]
};

// قائمة مراكز التوصيل
export const mockCenters: Record<string, Center[]> = {
  "16": [ // الجزائر
    { id: 1, name: "مكتب الجزائر الوسطى", province_id: 16, address: "وسط المدينة", stopdesk_code: "ALG01" },
    { id: 2, name: "مكتب باب الزوار", province_id: 16, address: "باب الزوار", stopdesk_code: "ALG02" }
  ],
  "19": [ // سطيف
    { id: 3, name: "مكتب سطيف", province_id: 19, address: "وسط مدينة سطيف", stopdesk_code: "SET01" }
  ],
  "31": [ // وهران
    { id: 4, name: "مكتب وهران", province_id: 31, address: "وسط مدينة وهران", stopdesk_code: "ORA01" }
  ]
};

// أسعار التوصيل
export const mockDeliveryFees: DeliveryFee[] = [
  // داخل الجزائر العاصمة
  { from_province_id: 16, to_province_id: 16, home_delivery: 500, desk_delivery: 400 },
  
  // من الجزائر إلى سطيف
  { from_province_id: 16, to_province_id: 19, home_delivery: 700, desk_delivery: 600 },
  
  // من الجزائر إلى وهران
  { from_province_id: 16, to_province_id: 31, home_delivery: 800, desk_delivery: 700 },
  
  // من سطيف إلى الجزائر
  { from_province_id: 19, to_province_id: 16, home_delivery: 700, desk_delivery: 600 },
  
  // داخل سطيف
  { from_province_id: 19, to_province_id: 19, home_delivery: 400, desk_delivery: 300 },
  
  // من سطيف إلى وهران
  { from_province_id: 19, to_province_id: 31, home_delivery: 900, desk_delivery: 800 },
  
  // من وهران إلى الجزائر
  { from_province_id: 31, to_province_id: 16, home_delivery: 800, desk_delivery: 700 },
  
  // من وهران إلى سطيف
  { from_province_id: 31, to_province_id: 19, home_delivery: 900, desk_delivery: 800 },
  
  // داخل وهران
  { from_province_id: 31, to_province_id: 31, home_delivery: 500, desk_delivery: 400 }
]; 