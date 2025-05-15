/**
 * خدمة الشحن ياليدين
 * توفر وظائف مستوى عالٍ للتفاعل مع API ياليدين
 */

import { AxiosInstance, AxiosError } from 'axios';
import { getYalidineApiClient, isNetworkError } from './api';

// تعريف أنواع محدثة لتتوافق مع جداول _global
export interface Province {
  id: number;
  name: string;
  // zone?: number; // Zone may not be available in yalidine_provinces_global
  is_deliverable: boolean; 
}

export interface Municipality {
  id: number;
  name: string;
  wilaya_id: number;
  // wilaya_name?: string; // Wilaya name can be joined if needed, not directly in _municipalities_global
  is_deliverable: boolean; 
  has_stop_desk: boolean;  
}

export interface Center { // Keep as is, not directly modifying center logic now
  center_id: number;
  name: string;
  address: string;
  gps?: string;
  commune_id: number;
  commune_name: string;
  wilaya_id: number;
  wilaya_name: string;
}

// DeliveryFee type might be simplified or used by calculateDeliveryPrice internally
export interface DeliveryFee {
  from_wilaya_id?: number; // Added to make it more self-contained if needed
  to_wilaya_id?: number;   // Added
  commune_id?: number;     // Added
  express_home: number | null; // تم التغيير من home_delivery_fee
  express_desk: number | null; // تم التغيير من desk_delivery_fee
  oversize_fee: number | null;
}

export type DeliveryType = 'home' | 'desk';

import { supabase } from '@/lib/supabase-client';
import { yalidineRateLimiter } from './rate-limiter';

// وضع التطوير المحلي - يجب أن يتطابق مع قيمة DEV_MODE في ملف api.ts
const DEV_MODE = false;

// بيانات وهمية للولايات للاستخدام في وضع التطوير - تم تحديث النوع
const MOCK_PROVINCES: Province[] = [
  { id: 16, name: "الجزائر", is_deliverable: true },
  { id: 19, name: "سطيف", is_deliverable: true },
  { id: 31, name: "وهران", is_deliverable: true },
  { id: 23, name: "عنابة", is_deliverable: true },
  { id: 25, name: "قسنطينة", is_deliverable: true },
  { id: 9, name: "البليدة", is_deliverable: true },
  { id: 15, name: "تيزي وزو", is_deliverable: true },
  { id: 29, name: "معسكر", is_deliverable: true }
];

// بيانات وهمية للبلديات للاستخدام في وضع التطوير - تم تحديث النوع
const MOCK_MUNICIPALITIES: Record<string, Municipality[]> = {
  '16': [
    { id: 1601, name: "باب الوادي", wilaya_id: 16, is_deliverable: true, has_stop_desk: true },
    { id: 1602, name: "المحمدية", wilaya_id: 16, is_deliverable: true, has_stop_desk: true },
    { id: 1603, name: "برج الكيفان", wilaya_id: 16, is_deliverable: true, has_stop_desk: false },
    { id: 1604, name: "بئر مراد رايس", wilaya_id: 16, is_deliverable: true, has_stop_desk: true }
  ],
  '19': [
    { id: 1901, name: "سطيف", wilaya_id: 19, is_deliverable: true, has_stop_desk: true },
    { id: 1902, name: "العلمة", wilaya_id: 19, is_deliverable: true, has_stop_desk: true },
    { id: 1903, name: "عين الكبيرة", wilaya_id: 19, is_deliverable: true, has_stop_desk: false }
  ],
  '31': [
    { id: 3101, name: "وهران", wilaya_id: 31, is_deliverable: true, has_stop_desk: true },
    { id: 3102, name: "عين الترك", wilaya_id: 31, is_deliverable: true, has_stop_desk: false },
    { id: 3103, name: "أرزيو", wilaya_id: 31, is_deliverable: true, has_stop_desk: true }
  ]
};

// بيانات وهمية لمراكز التوصيل للاستخدام في وضع التطوير
const MOCK_CENTERS: Record<string, Center[]> = {
  '16': [
    { center_id: 160101, name: "مركز باب الوادي", address: "شارع العربي بن مهيدي", gps: "36.7814,3.0583", commune_id: 1601, commune_name: "باب الوادي", wilaya_id: 16, wilaya_name: "الجزائر" },
    { center_id: 160201, name: "مركز المحمدية", address: "شارع الاستقلال", gps: "36.7381,3.1289", commune_id: 1602, commune_name: "المحمدية", wilaya_id: 16, wilaya_name: "الجزائر" }
  ]
};

// بيانات وهمية لأسعار التوصيل - تم تعديلها لتناسب النوع الجديد DeliveryFee
const MOCK_DELIVERY_FEES_CALC: Record<string, DeliveryFee[]> = {
  // from_wilaya_id - to_wilaya_id
  '16-19': [
    { from_wilaya_id: 16, to_wilaya_id: 19, commune_id: 1901, express_home: 600, express_desk: 500, oversize_fee: 100 },
    { from_wilaya_id: 16, to_wilaya_id: 19, commune_id: 1902, express_home: 650, express_desk: 550, oversize_fee: 100 },
  ],
  '16-31': [
    { from_wilaya_id: 16, to_wilaya_id: 31, commune_id: 3101, express_home: 700, express_desk: 600, oversize_fee: 120 },
  ],
  // إضافة بيانات وهمية لولاية خنشلة (40) كمصدر
  '40-10': [
    { from_wilaya_id: 40, to_wilaya_id: 10, commune_id: 1008, express_home: 900, express_desk: 400, oversize_fee: 50 },
  ],
  '40-7': [
    { from_wilaya_id: 40, to_wilaya_id: 7, commune_id: 714, express_home: 850, express_desk: 450, oversize_fee: 50 },
  ]
};

/**
 * جلب قائمة الولايات من جدول yalidine_provinces_global
 * @param organizationId (غير مستخدم حالياً، للاتساق مع الواجهات الأخرى إذا لزم الأمر لاحقًا)
 * @returns قائمة بالولايات المتاحة
 */
export async function getProvinces(organizationId?: string): Promise<Province[]> {
  // في وضع التطوير، إرجاع بيانات وهمية
  if (DEV_MODE) {
    
    return MOCK_PROVINCES;
  }

  try {
    
    const { data, error } = await supabase
      .from('yalidine_provinces_global') // استخدام الجدول العالمي
      .select('id, name, is_deliverable'); // تحديد الحقول المطلوبة، is_deliverable يجب أن يكون boolean في الجدول
    
    if (error) {
      console.error('خطأ أثناء جلب الولايات من yalidine_provinces_global:', error);
      throw error; // أو التعامل مع الخطأ بطريقة أخرى مثل إرجاع مصفوفة فارغة
    }
    
    if (data) {
      
      // تأكد من أن is_deliverable يتم تحويله بشكل صحيح إذا كان رقمًا في قاعدة البيانات
      return data.map(p => ({ ...p, is_deliverable: Boolean(p.is_deliverable) }));
    }
    return [];
  } catch (error) {
    console.error('فشل جلب الولايات:', error);
    return []; // إرجاع مصفوفة فارغة في حالة الخطأ
  }
}

/**
 * جلب البلديات لولاية معينة من جدول yalidine_municipalities_global
 * @param organizationId (غير مستخدم حالياً)
 * @param provinceId معرف الولاية
 * @returns قائمة بالبلديات أو مصفوفة فارغة في حالة فشل العملية
 */
export async function getMunicipalities(
  organizationId: string, // Kept for signature consistency if other internal calls expect it
  provinceId: string
): Promise<Municipality[]> {
  // في وضع التطوير، إرجاع بيانات وهمية
  if (DEV_MODE) {
    
    // التأكد من أن البيانات الوهمية متوافقة مع النوع Municipality المحدث
    return MOCK_MUNICIPALITIES[provinceId]?.map(m => ({
        ...m,
        // الحقول البوليانية يجب أن تكون موجودة بالفعل في MOCK_MUNICIPALITIES المحدث
    })) || [];
  }

  try {
    
    const { data, error } = await supabase
      .from('yalidine_municipalities_global') // استخدام الجدول العالمي
      .select('id, name, wilaya_id, is_deliverable, has_stop_desk') // تحديد الحقول المطلوبة
      .eq('wilaya_id', parseInt(provinceId, 10));

    if (error) {
      console.error('خطأ أثناء جلب البلديات من yalidine_municipalities_global:', error);
      throw error;
    }

    if (data) {
      
      // البيانات يجب أن تكون متوافقة مع النوع Municipality مباشرة
      return data as Municipality[];
    }
    return [];
  } catch (error) {
    console.error(`فشل جلب البلديات للولاية ${provinceId}:`, error);
    return [];
  }
}

/**
 * جلب البلديات لولاية معينة وتصفيتها حسب نوع التوصيل
 * @param organizationId معرف المؤسسة (غير مستخدم حالياً)
 * @param provinceId معرف الولاية
 * @param deliveryType نوع التوصيل (منزل أو مكتب)
 * @returns قائمة بالبلديات المصفاة حسب نوع التوصيل
 */
export async function getMunicipalitiesByDeliveryType(
  organizationId: string, // Kept for signature consistency
  provinceId: string,
  deliveryType: DeliveryType,
  toWilayaName: string // تمت إضافته
): Promise<Municipality[]> {
  try {
    // في وضع التطوير، قم بتصفية البيانات الوهمية المحدثة
    if (DEV_MODE) {
      
      const mockCommunes = MOCK_MUNICIPALITIES[provinceId] || [];
      return mockCommunes.filter(commune => 
        deliveryType === 'home' ? commune.is_deliverable : commune.has_stop_desk
      ).map(commune => ({ ...commune, wilaya_name: toWilayaName })); // تمت إضافة toWilayaName
    }

    // استدعاء الدالة الأساسية لجلب البلديات
    const allMunicipalities = await getMunicipalities(organizationId, provinceId);
    
    // تصفية البلديات بناءً على نوع التوصيل باستخدام الحقول البوليانية الجديدة
    const filteredMunicipalities = allMunicipalities.filter(municipality => {
      if (deliveryType === 'home') {
        return municipality.is_deliverable; // استخدام الحقل البولياني مباشرة
      }
      if (deliveryType === 'desk') {
        return municipality.has_stop_desk; // استخدام الحقل البولياني مباشرة
      }
      return false; // Should not happen if deliveryType is correctly 'home' or 'desk'
    }).map(municipality => ({ ...municipality, wilaya_name: toWilayaName })); // تمت إضافة toWilayaName
    
    
    return filteredMunicipalities;
  } catch (error) {
    console.error(`فشل جلب البلديات المصفاة للولاية ${provinceId}:`, error);
    return [];
  }
}

/**
 * جلب مراكز الاستلام (المكاتب) لولاية معينة
 * @param organizationId معرف المؤسسة
 * @param provinceId معرف الولاية
 * @returns قائمة بمراكز الاستلام أو مصفوفة فارغة في حالة فشل العملية
 */
export async function getCenters(
  organizationId: string,
  provinceId: string
): Promise<Center[]> {
  try {
    // استخدام بيانات وهمية مباشرة في وضع التطوير
    if (DEV_MODE) {
      
      
      // إذا كانت هناك بيانات وهمية متاحة لهذه الولاية، استخدمها
      if (MOCK_CENTERS[provinceId]) {
        return MOCK_CENTERS[provinceId];
      }
      
      // وإلا، قم بإنشاء مراكز وهمية لهذه الولاية
      const provinceName = MOCK_PROVINCES.find(p => p.id.toString() === provinceId)?.name || `ولاية ${provinceId}`;
      
      return [
        { center_id: parseInt(`${provinceId}001`), name: `مركز 1 - ${provinceName}`, address: `عنوان المركز 1 - ${provinceName}`, gps: "36.7814,3.0583", commune_id: parseInt(`${provinceId}01`), commune_name: `بلدية 1 - ${provinceName}`, wilaya_id: parseInt(provinceId), wilaya_name: provinceName },
        { center_id: parseInt(`${provinceId}002`), name: `مركز 2 - ${provinceName}`, address: `عنوان المركز 2 - ${provinceName}`, gps: "36.7381,3.1289", commune_id: parseInt(`${provinceId}02`), commune_name: `بلدية 2 - ${provinceName}`, wilaya_id: parseInt(provinceId), wilaya_name: provinceName }
      ];
    }
    
    const apiClient = await getYalidineApiClient(organizationId);
    
    if (!apiClient) {
      throw new Error('فشل إنشاء عميل API ياليدين');
    }
    
    const response = await apiClient.get(`centers/?wilaya_id=${provinceId}`);
    
    // تحويل البيانات
    const data = response.data;
    let centerData: any[] = [];
    
    if (Array.isArray(data)) {
      centerData = data;
    } else if (data && data.data && Array.isArray(data.data)) {
      centerData = data.data;
    }
    
    // ترجع البيانات كما هي من API ياليدين
    return centerData;
  } catch (error) {
    console.error(`خطأ أثناء جلب مراكز الاستلام للولاية ${provinceId} من ياليدين:`, error);
    
    // استخدام بيانات وهمية في وضع التطوير
    if (DEV_MODE && isNetworkError(error)) {
      
      
      // إذا كانت هناك بيانات وهمية متاحة لهذه الولاية، استخدمها
      if (MOCK_CENTERS[provinceId]) {
        return MOCK_CENTERS[provinceId];
      }
      
      // وإلا، قم بإنشاء مركز وهمي لهذه الولاية
      const provinceIdNum = parseInt(provinceId, 10);
      const provinceName = MOCK_PROVINCES.find(p => p.id === provinceIdNum)?.name || `ولاية ${provinceIdNum}`;
      
      return [
        { center_id: parseInt(`${provinceId}001`), name: `مركز 1 - ${provinceName}`, address: `عنوان المركز 1 - ${provinceName}`, gps: "36.7814,3.0583", commune_id: parseInt(`${provinceId}01`), commune_name: `بلدية 1 - ${provinceName}`, wilaya_id: provinceIdNum, wilaya_name: provinceName },
        { center_id: parseInt(`${provinceId}002`), name: `مركز 2 - ${provinceName}`, address: `عنوان المركز 2 - ${provinceName}`, gps: "36.7381,3.1289", commune_id: parseInt(`${provinceId}02`), commune_name: `بلدية 2 - ${provinceName}`, wilaya_id: provinceIdNum, wilaya_name: provinceName }
      ];
    }
    
    return [];
  }
}

/**
 * جلب مراكز الاستلام لبلدية معينة
 * @param organizationId معرف المؤسسة
 * @param communeId معرف البلدية
 * @returns قائمة بمراكز الاستلام في البلدية المحددة
 */
export async function getCentersByCommune(
  organizationId: string,
  communeId: string
): Promise<Center[]> {
  try {
    const apiClient = await getYalidineApiClient(organizationId);
    
    if (!apiClient) {
      throw new Error('فشل إنشاء عميل API ياليدين');
    }
    
    const response = await apiClient.get(`centers/?commune_id=${communeId}`);
    
    // تحويل البيانات
    const data = response.data;
    let centerData: any[] = [];
    
    if (Array.isArray(data)) {
      centerData = data;
    } else if (data && data.data && Array.isArray(data.data)) {
      centerData = data.data;
    }
    
    return centerData;
  } catch (error) {
    console.error(`خطأ أثناء جلب مراكز الاستلام للبلدية ${communeId} من ياليدين:`, error);
    
    // استخدام بيانات وهمية في وضع التطوير
    if (DEV_MODE && isNetworkError(error)) {
      
      
      // في وضع التطوير، نقوم بإنشاء مركز وهمي لهذه البلدية
      const provinceId = communeId.slice(0, 2);
      const provinceName = MOCK_PROVINCES.find(p => p.id.toString() === provinceId)?.name || `ولاية ${provinceId}`;
      
      // البحث عن البلدية في البيانات الوهمية
      for (const key in MOCK_MUNICIPALITIES) {
        const municipality = MOCK_MUNICIPALITIES[key].find(m => m.id.toString() === communeId);
        
        if (municipality && municipality.has_stop_desk) {
          // البحث عن اسم الولاية المطابق لـ wilaya_id الخاص بالبلدية
          const currentWilayaName = MOCK_PROVINCES.find(p => p.id === municipality.wilaya_id)?.name || `ولاية ${municipality.wilaya_id}`;
          return [{
            center_id: parseInt(`${municipality.id}01`), // معرف وهمي فريد
            name: `مركز ${municipality.name}`,
            address: `عنوان مركز ${municipality.name}`,
            gps: "36.7814,3.0583", // إحداثيات وهمية
            commune_id: municipality.id,
            commune_name: municipality.name,
            wilaya_id: municipality.wilaya_id,
            wilaya_name: currentWilayaName // استخدام اسم الولاية الذي تم البحث عنه
          }];
        }
      }
    }
    
    return [];
  }
}

/**
 * حساب سعر التوصيل بناءً على الولاية المرسل منها، الولاية المرسل إليها، البلدية، نوع التوصيل، والوزن.
 * @param organizationId معرف المؤسسة
 * @param fromProvinceId معرف ولاية الإرسال (سيتم تجاهله واستخدام الولاية المحددة في إعدادات المؤسسة)
 * @param toProvinceId معرف ولاية الاستقبال
 * @param toCommuneId معرف بلدية الاستقبال
 * @param deliveryType نوع التوصيل ('home' أو 'desk')
 * @param weight وزن الطرد بالكيلوغرام
 * @returns سعر التوصيل المحسوب أو null في حالة عدم توفر الرسوم
 */
export async function calculateDeliveryPrice(
  organizationId: string, 
  fromProvinceId: string,
  toProvinceId: string,
  toCommuneId: string,
  deliveryType: DeliveryType,
  weight: number
): Promise<number | null> {
  // جلب ولاية المصدر من إعدادات المؤسسة
  let originWilayaId: number;
  
  try {
    // استعلام عن إعدادات ياليدين للمؤسسة
    const { data: settingsData, error: settingsError } = await supabase
      .from('yalidine_settings_with_origin')
      .select('origin_wilaya_id')
      .eq('organization_id', organizationId)
      .single();
    
    if (settingsError) {
      console.error('خطأ أثناء جلب إعدادات ياليدين للمؤسسة:', settingsError);
      return null;
    }
    
    if (!settingsData || !settingsData.origin_wilaya_id) {
      console.error(`لم يتم العثور على ولاية المصدر في إعدادات المؤسسة ${organizationId}`);
      
      originWilayaId = parseInt(fromProvinceId, 10);
    } else {
      originWilayaId = settingsData.origin_wilaya_id;
      
    }
  } catch (error) {
    console.error('فشل في جلب ولاية المصدر من إعدادات المؤسسة:', error);
    
    originWilayaId = parseInt(fromProvinceId, 10);
  }
  
  

  const toWilayaIdNum = parseInt(toProvinceId, 10);
  const toCommuneIdNum = parseInt(toCommuneId, 10);

  let feeData: DeliveryFee | undefined;

  if (DEV_MODE) {
    
    const mockKey = `${originWilayaId}-${toWilayaIdNum}`;
    
    const feesForRoute = MOCK_DELIVERY_FEES_CALC[mockKey];
    if (feesForRoute) {
      
      feeData = feesForRoute.find(f => f.commune_id === toCommuneIdNum);
      if (feeData) {
        
      }
    } else {
      
    }
    if (!feeData) {
        console.warn(`لم يتم العثور على بيانات رسوم وهمية لـ from:${originWilayaId}, to:${toWilayaIdNum}, commune:${toCommuneIdNum}`);
        // يمكن إرجاع سعر وهمي افتراضي أو null
        // للتبسيط، سنرجع null إذا لم نجد تطابقاً دقيقاً في الوهمي
        // أو يمكنك إنشاء رسم وهمي عام هنا
        // feeData = { express_home: 700, express_desk: 600, oversize_fee: 100, from_wilaya_id:originWilayaId, to_wilaya_id:toWilayaIdNum, commune_id: toCommuneIdNum };
         return 750; // سعر وهمي افتراضي بسيط لتجنب الأعطال في وضع التطوير
    }
  } else {
    try {
      
      const { data, error } = await supabase
        .from('yalidine_fees') // اسم الجدول الذي يحتوي على رسوم الشحن العالمية
        .select('express_home, express_desk, oversize_fee, from_wilaya_id, to_wilaya_id, commune_id') // تم التغيير هنا
        .eq('organization_id', organizationId) 
        .eq('from_wilaya_id', originWilayaId) // استخدام ولاية المصدر من الإعدادات
        .eq('to_wilaya_id', toWilayaIdNum)
        .eq('commune_id', toCommuneIdNum)
        .single(); // نتوقع سجل واحد فقط لكل تركيبة فريدة

      if (error) {
        console.error('خطأ أثناء جلب رسوم الشحن من yalidine_fees:', error);
        // إذا كان الخطأ بسبب عدم وجود سجل (PGRST116: "Query result has no rows"), فهذا يعني أن الرسوم غير معرّفة
        if (error.code === 'PGRST116') {
            console.warn(`لا توجد رسوم شحن محددة للمسار: من ${originWilayaId} إلى ${toProvinceId}, بلدية ${toCommuneId}`);
            return null;
        } 
        throw error; // لأخطاء أخرى
      }

      if (!data) {
        console.warn(`لم يتم العثور على رسوم شحن محددة للمسار: من ${originWilayaId} إلى ${toProvinceId}, بلدية ${toCommuneId}`);
        return null;
      }
      feeData = data as DeliveryFee;
      

    } catch (error) {
      console.error('فشل حساب سعر التوصيل:', error);
      return null;
    }
  }

  if (!feeData) {
    console.warn(`لا توجد بيانات رسوم متاحة لحساب السعر للمسار المحدد.`);
    return null;
  }

  let basePrice = 0;
  if (deliveryType === 'home') {
    if (feeData.express_home === null || feeData.express_home === undefined) {
        console.warn(`التوصيل للمنزل غير متوفر أو سعره غير محدد لهذه البلدية.`);
        return null;
    }
    basePrice = feeData.express_home;
  } else if (deliveryType === 'desk') {
    if (feeData.express_desk === null || feeData.express_desk === undefined) {
        console.warn(`التوصيل للمكتب غير متوفر أو سعره غير محدد لهذه البلدية.`);
        return null;
    }
    basePrice = feeData.express_desk;
  } else {
    console.error(`نوع توصيل غير معروف: ${deliveryType}`);
    return null;
  }

  // حساب رسوم الوزن الزائد
  // نفترض أن الوزن الأساسي المضمن في السعر هو 1 كجم (أو يجب تحديد ذلك من إعدادات ياليدين)
  // عادة ما يكون هناك حد أقصى للوزن قبل تطبيق رسوم إضافية، لنفترض 5 كجم كحد افتراضي إذا لم يكن محدداً
  const BASE_WEIGHT_LIMIT_KG = 5; // هذا افتراض، يجب التحقق من سياسة ياليدين
  let oversizeCharge = 0;

  if (weight > BASE_WEIGHT_LIMIT_KG) {
    if (feeData.oversize_fee === null || feeData.oversize_fee === undefined || feeData.oversize_fee <= 0) {
        console.warn(`رسوم الوزن الزائد غير محددة أو غير صالحة، لن يتم حساب تكلفة إضافية للوزن.`);
    } else {
        const extraWeight = weight - BASE_WEIGHT_LIMIT_KG;
        oversizeCharge = extraWeight * feeData.oversize_fee;
        
    }
  }

  const totalPrice = basePrice + oversizeCharge;
  
  return totalPrice;
}

// تعديل وظيفة getDeliveryFees المهملة أيضًا لتستخدم ولاية المصدر
async function getDeliveryFees(
  organizationId: string,
  fromWilayaId: string,
  toWilayaId: string
): Promise<DeliveryFee | null> { 
  // هذه الدالة أصبحت مهملة وستُزال أو يُعاد تصميمها بالكامل
  // خطأ LINT المشار إليه سابقاً (ID: 855f8b8b-02ff-4ad1-8523-08b9bc6200fe) موجود في البيانات الوهمية لهذه الدالة القديمة.
  // بما أننا سنزيل الاعتماد عليها، سيتم حل الخطأ.
  console.warn("getDeliveryFees is deprecated and should not be used directly for price calculation.");

  // جلب ولاية المصدر من إعدادات المؤسسة
  let originWilayaId: number;
  
  try {
    // استعلام عن إعدادات ياليدين للمؤسسة
    const { data: settingsData, error: settingsError } = await supabase
      .from('yalidine_settings_with_origin')
      .select('origin_wilaya_id')
      .eq('organization_id', organizationId)
      .single();
    
    if (settingsError) {
      console.error('خطأ أثناء جلب إعدادات ياليدين للمؤسسة:', settingsError);
      return null;
    }
    
    if (!settingsData || !settingsData.origin_wilaya_id) {
      console.error(`لم يتم العثور على ولاية المصدر في إعدادات المؤسسة ${organizationId}`);
      return null;
    }
    
    originWilayaId = settingsData.origin_wilaya_id;
  } catch (error) {
    console.error('فشل في جلب ولاية المصدر من إعدادات المؤسسة:', error);
    return null;
  }

  if (DEV_MODE) {
    
    const mockFeeKey = `${originWilayaId}-${toWilayaId}`;
    if (MOCK_DELIVERY_FEES_CALC[mockFeeKey] && MOCK_DELIVERY_FEES_CALC[mockFeeKey].length > 0) {
      // نرجع أول رسم مطابق كعينة، مع العلم أن هذه الدالة لم تعد تتطابق مع المنطق الجديد
      return MOCK_DELIVERY_FEES_CALC[mockFeeKey][0];
    }
    // إنشاء بيانات وهمية مبسطة جداً إذا لم يوجد شيء
    return {
        from_wilaya_id: originWilayaId,
        to_wilaya_id: parseInt(toWilayaId),
        // commune_id is missing here, highlighting issues with old mock logic
        express_home: 600, 
        express_desk: 500,
        oversize_fee: 100
    };
  }
  
  // المنطق الأصلي للاتصال بـ API أو قاعدة بيانات المؤسسة تم حذفه لأنه لم يعد مستخدماً
  // وسيتم استبداله بالاستعلام المباشر من yalidine_fees في calculateDeliveryPrice
  return null;
}

/**
 * جلب معدل الوزن الزائد للمنطقة من نقطة نهاية /v1/fees/ لياليدين.
 * @param organizationId معرف المؤسسة.
 * @param fromWilayaId معرف ولاية المصدر.
 * @param toWilayaId معرف ولاية الوجهة.
 * @returns قيمة معدل الوزن الزائد للمنطقة، أو null.
 */
export async function getZoneOversizeRate(
  organizationId: string,
  fromWilayaId: string,
  toWilayaId: string
): Promise<number | null> {
  // افتراض أن DEV_MODE و YalidineApiClient معرفان/مستوردان في هذا الملف
  if (DEV_MODE) {
    
    return 50; // معدل وهمي بسيط
  }

  try {
    // تم التغيير هنا لاستخدام getYalidineApiClient بدلاً من YalidineApiClient.getInstance مباشرة
    // إذا كان هذا يسبب مشكلة، يجب مراجعة كيفية تهيئة apiClient
    const apiClient = await getYalidineApiClient(organizationId); 
    
    if (!apiClient) {
      console.error(`[getZoneOversizeRate] No API client for org ${organizationId}`);
      return null;
    }

    // استدعاء Yalidine API لجلب الرسوم
    const response = await apiClient.get('fees', {
      params: { from_wilaya_id: fromWilayaId, to_wilaya_id: toWilayaId },
    });

    // التحقق من وجود البيانات المطلوبة في الرد
    if (response?.data && typeof response.data.oversize_fee === 'number') {
      return response.data.oversize_fee;
    } else {
      console.warn('[getZoneOversizeRate] Oversize fee not in API response or invalid:', response.data);
      return null;
    }
  } catch (error: any) {
    console.error(`[getZoneOversizeRate] Error fetching zone oversize fee:`, error.message || error);
    return null;
  }
}