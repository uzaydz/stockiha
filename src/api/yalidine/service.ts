/**
 * خدمة الشحن ياليدين
 * توفر وظائف مستوى عالٍ للتفاعل مع API ياليدين
 */

import { AxiosInstance, AxiosError } from 'axios';
import { getYalidineApiClient, isNetworkError } from './api';
import { 
  Province, 
  Municipality, 
  Center, 
  DeliveryFee, 
  DeliveryType 
} from './types';

// وضع التطوير المحلي - يجب أن يتطابق مع قيمة DEV_MODE في ملف api.ts
const DEV_MODE = false;

// بيانات وهمية للولايات للاستخدام في وضع التطوير
const MOCK_PROVINCES: Province[] = [
  { id: 16, name: "الجزائر", zone: 1, is_deliverable: 1 },
  { id: 19, name: "سطيف", zone: 2, is_deliverable: 1 },
  { id: 31, name: "وهران", zone: 3, is_deliverable: 1 },
  { id: 23, name: "عنابة", zone: 2, is_deliverable: 1 },
  { id: 25, name: "قسنطينة", zone: 2, is_deliverable: 1 },
  { id: 9, name: "البليدة", zone: 1, is_deliverable: 1 },
  { id: 15, name: "تيزي وزو", zone: 1, is_deliverable: 1 },
  { id: 29, name: "معسكر", zone: 3, is_deliverable: 1 }
];

// بيانات وهمية للبلديات للاستخدام في وضع التطوير
const MOCK_MUNICIPALITIES: Record<string, Municipality[]> = {
  '16': [
    { id: 1601, name: "باب الوادي", wilaya_id: 16, wilaya_name: "الجزائر", has_stop_desk: 1, is_deliverable: 1 },
    { id: 1602, name: "المحمدية", wilaya_id: 16, wilaya_name: "الجزائر", has_stop_desk: 1, is_deliverable: 1 },
    { id: 1603, name: "برج الكيفان", wilaya_id: 16, wilaya_name: "الجزائر", has_stop_desk: 0, is_deliverable: 1 },
    { id: 1604, name: "بئر مراد رايس", wilaya_id: 16, wilaya_name: "الجزائر", has_stop_desk: 1, is_deliverable: 1 }
  ],
  '19': [
    { id: 1901, name: "سطيف", wilaya_id: 19, wilaya_name: "سطيف", has_stop_desk: 1, is_deliverable: 1 },
    { id: 1902, name: "العلمة", wilaya_id: 19, wilaya_name: "سطيف", has_stop_desk: 1, is_deliverable: 1 },
    { id: 1903, name: "عين الكبيرة", wilaya_id: 19, wilaya_name: "سطيف", has_stop_desk: 0, is_deliverable: 1 }
  ],
  '31': [
    { id: 3101, name: "وهران", wilaya_id: 31, wilaya_name: "وهران", has_stop_desk: 1, is_deliverable: 1 },
    { id: 3102, name: "عين الترك", wilaya_id: 31, wilaya_name: "وهران", has_stop_desk: 0, is_deliverable: 1 },
    { id: 3103, name: "أرزيو", wilaya_id: 31, wilaya_name: "وهران", has_stop_desk: 1, is_deliverable: 1 }
  ]
};

// بيانات وهمية لمراكز التوصيل للاستخدام في وضع التطوير
const MOCK_CENTERS: Record<string, Center[]> = {
  '16': [
    { center_id: 160101, name: "مركز باب الوادي", address: "شارع العربي بن مهيدي", gps: "36.7814,3.0583", commune_id: 1601, commune_name: "باب الوادي", wilaya_id: 16, wilaya_name: "الجزائر" },
    { center_id: 160201, name: "مركز المحمدية", address: "شارع الاستقلال", gps: "36.7381,3.1289", commune_id: 1602, commune_name: "المحمدية", wilaya_id: 16, wilaya_name: "الجزائر" }
  ]
};

// بيانات وهمية لأسعار التوصيل للاستخدام في وضع التطوير
const MOCK_DELIVERY_FEES: Record<string, DeliveryFee> = {
  // من الجزائر إلى سطيف
  '16-19': {
    from_wilaya_name: "الجزائر",
    to_wilaya_name: "سطيف",
    zone: 2,
    retour_fee: 250,
    cod_percentage: 0.75,
    insurance_percentage: 0.75,
    oversize_fee: 100,
    per_commune: {
      '1901': {
        commune_id: 1901,
        commune_name: "سطيف",
        express_home: 600,
        express_desk: 500,
        economic_home: null,
        economic_desk: null
      },
      '1902': {
        commune_id: 1902,
        commune_name: "العلمة",
        express_home: 650,
        express_desk: 550,
        economic_home: null,
        economic_desk: null
      }
    }
  },
  // من الجزائر إلى وهران
  '16-31': {
    from_wilaya_name: "الجزائر",
    to_wilaya_name: "وهران",
    zone: 3,
    retour_fee: 300,
    cod_percentage: 0.75,
    insurance_percentage: 0.75,
    oversize_fee: 120,
    per_commune: {
      '3101': {
        commune_id: 3101,
        commune_name: "وهران",
        express_home: 700,
        express_desk: 600,
        economic_home: null,
        economic_desk: null
      }
    }
  }
};

/**
 * جلب قائمة الولايات من ياليدين
 * @param organizationId معرف المؤسسة
 * @returns قائمة بالولايات أو مصفوفة فارغة في حالة فشل العملية
 */
export async function getProvinces(organizationId: string): Promise<Province[]> {
  try {
    console.log('جاري جلب قائمة الولايات من ياليدين');
    
    const apiClient = await getYalidineApiClient(organizationId);
    
    if (!apiClient) {
      throw new Error('فشل إنشاء عميل API ياليدين');
    }
    
    const response = await apiClient.get('wilayas/');
    
    // تحويل البيانات
    const data = response.data;
    console.log('تم استلام بيانات الولايات بنجاح');
    
    let wilayaData: any[] = [];
    
    if (Array.isArray(data)) {
      wilayaData = data;
      console.log(`تم العثور على ${wilayaData.length} ولاية`);
    } else if (data && data.data && Array.isArray(data.data)) {
      wilayaData = data.data;
      console.log(`تم العثور على ${wilayaData.length} ولاية`);
    } else {
      console.error('تنسيق بيانات الولايات غير متوقع:', data);
    }
    
    // ترجع البيانات كما هي من API ياليدين
    return wilayaData;
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error('خطأ أثناء جلب الولايات من ياليدين:', axiosError);
    
    if (axiosError.response) {
      console.error('رد الخادم:', axiosError.response.status, axiosError.response.data);
    }
    
    // استخدام بيانات وهمية في وضع التطوير
    if (DEV_MODE && isNetworkError(error)) {
      console.log('استخدام بيانات وهمية للولايات في وضع التطوير');
      return MOCK_PROVINCES;
    }
    
    return [];
  }
}

/**
 * جلب البلديات لولاية معينة من ياليدين
 * @param organizationId معرف المؤسسة
 * @param provinceId معرف الولاية
 * @returns قائمة بالبلديات أو مصفوفة فارغة في حالة فشل العملية
 */
export async function getMunicipalities(
  organizationId: string,
  provinceId: string
): Promise<Municipality[]> {
  try {
    console.log(`جاري جلب البلديات للولاية ${provinceId} من ياليدين`);
    
    const apiClient = await getYalidineApiClient(organizationId);
    
    if (!apiClient) {
      throw new Error('فشل إنشاء عميل API ياليدين');
    }
    
    const response = await apiClient.get(`communes/?wilaya_id=${provinceId}`);
    
    // تحويل البيانات
    const data = response.data;
    console.log(`تم استلام بيانات البلديات للولاية ${provinceId} بنجاح`);
    
    let communeData: any[] = [];
    
    if (Array.isArray(data)) {
      communeData = data;
      console.log(`تم العثور على ${communeData.length} بلدية`);
    } else if (data && data.data && Array.isArray(data.data)) {
      communeData = data.data;
      console.log(`تم العثور على ${communeData.length} بلدية`);
    } else {
      console.error('تنسيق بيانات البلديات غير متوقع:', data);
    }
    
    // ترجع البيانات كما هي من API ياليدين
    return communeData;
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error(`خطأ أثناء جلب البلديات للولاية ${provinceId} من ياليدين:`, axiosError);
    
    if (axiosError.response) {
      console.error('رد الخادم:', axiosError.response.status, axiosError.response.data);
    }
    
    // استخدام بيانات وهمية في وضع التطوير
    if (DEV_MODE && isNetworkError(error)) {
      console.log(`استخدام بيانات وهمية للبلديات للولاية ${provinceId} في وضع التطوير`);
      
      // إذا كانت هناك بيانات وهمية متاحة لهذه الولاية، استخدمها
      if (MOCK_MUNICIPALITIES[provinceId]) {
        return MOCK_MUNICIPALITIES[provinceId];
      }
      
      // وإلا، قم بإنشاء بلديات وهمية لهذه الولاية
      const provinceName = MOCK_PROVINCES.find(p => p.id.toString() === provinceId)?.name || `ولاية ${provinceId}`;
      
      return [
        { id: parseInt(`${provinceId}01`), name: `بلدية 1 - ${provinceName}`, wilaya_id: parseInt(provinceId), wilaya_name: provinceName, has_stop_desk: 1, is_deliverable: 1 },
        { id: parseInt(`${provinceId}02`), name: `بلدية 2 - ${provinceName}`, wilaya_id: parseInt(provinceId), wilaya_name: provinceName, has_stop_desk: 0, is_deliverable: 1 },
        { id: parseInt(`${provinceId}03`), name: `بلدية 3 - ${provinceName}`, wilaya_id: parseInt(provinceId), wilaya_name: provinceName, has_stop_desk: 1, is_deliverable: 1 }
      ];
    }
    
    return [];
  }
}

/**
 * جلب البلديات لولاية معينة وتصفيتها حسب نوع التوصيل
 * @param organizationId معرف المؤسسة
 * @param provinceId معرف الولاية
 * @param deliveryType نوع التوصيل (منزل أو مكتب)
 * @returns قائمة بالبلديات المصفاة حسب نوع التوصيل
 */
export async function getMunicipalitiesByDeliveryType(
  organizationId: string,
  provinceId: string,
  deliveryType: DeliveryType
): Promise<Municipality[]> {
  try {
    console.log(`جاري جلب البلديات للولاية ${provinceId} وتصفيتها حسب نوع التوصيل: ${deliveryType}`);
    
    const municipalities = await getMunicipalities(organizationId, provinceId);
    
    console.log(`تم الحصول على ${municipalities.length} بلدية، جاري التصفية حسب نوع التوصيل: ${deliveryType}`);
    
    // تصفية البلديات حسب نوع التوصيل
    const filteredMunicipalities = municipalities.filter(municipality => {
      if (deliveryType === 'desk') {
        // إظهار فقط البلديات التي تدعم التوصيل للمكتب
        return municipality.has_stop_desk === 1;
      } else if (deliveryType === 'home') {
        // إظهار جميع البلديات القابلة للتوصيل للتوصيل المنزلي
        return municipality.is_deliverable === 1;
      }
      return false;
    });
    
    console.log(`تم تصفية البلديات. العدد النهائي: ${filteredMunicipalities.length} بلدية`);
    
    return filteredMunicipalities;
  } catch (error) {
    console.error(`خطأ أثناء جلب وتصفية البلديات للولاية ${provinceId} حسب نوع التوصيل:`, error);
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
      console.log(`استخدام بيانات وهمية لمراكز الاستلام للولاية ${provinceId} في وضع التطوير`);
      
      // إذا كانت هناك بيانات وهمية متاحة لهذه الولاية، استخدمها
      if (MOCK_CENTERS[provinceId]) {
        return MOCK_CENTERS[provinceId];
      }
      
      // وإلا، قم بإنشاء مراكز وهمية لهذه الولاية
      const provinceName = MOCK_PROVINCES.find(p => p.id.toString() === provinceId)?.name || `ولاية ${provinceId}`;
      const municipalities = await getMunicipalitiesByDeliveryType(organizationId, provinceId, 'desk');
      
      if (municipalities.length === 0) {
        return [];
      }
      
      return municipalities.filter(m => m.has_stop_desk === 1).map(m => ({
        center_id: parseInt(`${m.id}01`),
        name: `مركز ${m.name}`,
        address: `عنوان مركز ${m.name}`,
        gps: "36.7814,3.0583",
        commune_id: m.id,
        commune_name: m.name,
        wilaya_id: parseInt(provinceId),
        wilaya_name: provinceName
      }));
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
      console.log(`استخدام بيانات وهمية لمراكز الاستلام للبلدية ${communeId} في وضع التطوير`);
      
      // في وضع التطوير، نقوم بإنشاء مركز وهمي لهذه البلدية
      const provinceId = communeId.slice(0, 2);
      const provinceName = MOCK_PROVINCES.find(p => p.id.toString() === provinceId)?.name || `ولاية ${provinceId}`;
      
      // البحث عن البلدية في البيانات الوهمية
      for (const key in MOCK_MUNICIPALITIES) {
        const municipality = MOCK_MUNICIPALITIES[key].find(m => m.id.toString() === communeId);
        
        if (municipality && municipality.has_stop_desk === 1) {
          return [{
            center_id: parseInt(`${municipality.id}01`),
            name: `مركز ${municipality.name}`,
            address: `عنوان مركز ${municipality.name}`,
            gps: "36.7814,3.0583",
            commune_id: municipality.id,
            commune_name: municipality.name,
            wilaya_id: municipality.wilaya_id,
            wilaya_name: municipality.wilaya_name
          }];
        }
      }
    }
    
    return [];
  }
}

/**
 * جلب معلومات رسوم التوصيل بين ولايتين
 * @param organizationId معرف المؤسسة
 * @param fromProvinceId معرف ولاية الإرسال
 * @param toProvinceId معرف ولاية الاستلام
 * @returns معلومات رسوم التوصيل أو null في حالة فشل العملية
 */
export async function getDeliveryFees(
  organizationId: string,
  fromProvinceId: string,
  toProvinceId: string
): Promise<DeliveryFee | null> {
  try {
    const apiClient = await getYalidineApiClient(organizationId);
    
    if (!apiClient) {
      throw new Error('فشل إنشاء عميل API ياليدين');
    }
    
    const response = await apiClient.get(`fees/?from_wilaya_id=${fromProvinceId}&to_wilaya_id=${toProvinceId}`);
    
    return response.data;
  } catch (error) {
    console.error(`خطأ أثناء جلب رسوم التوصيل بين الولايتين ${fromProvinceId} و ${toProvinceId} من ياليدين:`, error);
    
    // استخدام بيانات وهمية في وضع التطوير
    if (DEV_MODE && isNetworkError(error)) {
      console.log(`استخدام بيانات وهمية لرسوم التوصيل بين الولايتين ${fromProvinceId} و ${toProvinceId} في وضع التطوير`);
      
      const mockFeeKey = `${fromProvinceId}-${toProvinceId}`;
      
      // إذا كانت هناك بيانات وهمية متاحة لهذه الرحلة، استخدمها
      if (MOCK_DELIVERY_FEES[mockFeeKey]) {
        return MOCK_DELIVERY_FEES[mockFeeKey];
      }
      
      // وإلا، قم بإنشاء بيانات وهمية
      const fromProvinceName = MOCK_PROVINCES.find(p => p.id.toString() === fromProvinceId)?.name || `ولاية ${fromProvinceId}`;
      const toProvinceName = MOCK_PROVINCES.find(p => p.id.toString() === toProvinceId)?.name || `ولاية ${toProvinceId}`;
      
      // إنشاء بيانات وهمية للبلديات في الولاية المستلمة
      const municipalities = await getMunicipalitiesByDeliveryType(organizationId, toProvinceId, 'home');
      
      if (municipalities.length === 0) {
        return null;
      }
      
      const perCommune: Record<string, any> = {};
      
      // إنشاء بيانات أسعار لكل بلدية
      municipalities.forEach(municipality => {
        perCommune[municipality.id.toString()] = {
          commune_id: municipality.id,
          commune_name: municipality.name,
          express_home: 600 + Math.floor(Math.random() * 300),
          express_desk: municipality.has_stop_desk === 1 ? 500 + Math.floor(Math.random() * 200) : null,
          economic_home: null,
          economic_desk: null
        };
      });
      
      return {
        from_wilaya_name: fromProvinceName,
        to_wilaya_name: toProvinceName,
        zone: 2,
        retour_fee: 250,
        cod_percentage: 0.75,
        insurance_percentage: 0.75,
        oversize_fee: 100,
        per_commune: perCommune
      };
    }
    
    return null;
  }
}

/**
 * حساب سعر التوصيل
 * @param organizationId معرف المؤسسة
 * @param fromProvinceId معرف ولاية الإرسال
 * @param toProvinceId معرف ولاية الاستلام
 * @param toCommuneId معرف بلدية الاستلام
 * @param deliveryType نوع التوصيل (منزل أو مكتب)
 * @param weight وزن الشحنة (اختياري)
 * @returns سعر التوصيل أو null في حالة فشل العملية
 */
export async function calculateDeliveryPrice(
  organizationId: string,
  fromProvinceId: string,
  toProvinceId: string,
  toCommuneId: string,
  deliveryType: DeliveryType,
  weight: number = 1
): Promise<number | null> {
  try {
    const fees = await getDeliveryFees(organizationId, fromProvinceId, toProvinceId);
    
    if (!fees) {
      throw new Error('فشل جلب رسوم التوصيل');
    }
    
    // حساب سعر التوصيل بناءً على البلدية ونوع التوصيل
    let basePrice = 0;
    
    if (toCommuneId && fees.per_commune && fees.per_commune[toCommuneId]) {
      const communeFees = fees.per_commune[toCommuneId];
      
      if (deliveryType === 'home' && communeFees.express_home !== null) {
        basePrice = communeFees.express_home;
      } else if (deliveryType === 'desk' && communeFees.express_desk !== null) {
        basePrice = communeFees.express_desk;
      } else {
        throw new Error(`نوع التوصيل ${deliveryType} غير متوفر للبلدية ${toCommuneId}`);
      }
    } else {
      throw new Error(`لم يتم العثور على معلومات رسوم للبلدية ${toCommuneId}`);
    }
    
    // حساب رسوم الوزن الزائد
    let oversizePrice = 0;
    if (weight > 5 && fees.oversize_fee) {
      oversizePrice = (weight - 5) * fees.oversize_fee;
    }
    
    // السعر النهائي = السعر الأساسي + رسوم الوزن الزائد
    const finalPrice = basePrice + oversizePrice;
    
    return finalPrice;
  } catch (error) {
    console.error('خطأ أثناء حساب سعر التوصيل:', error);
    
    if (DEV_MODE && isNetworkError(error)) {
      // في وضع التطوير، نقدم سعرًا افتراضيًا
      console.log('استخدام سعر افتراضي للتوصيل في وضع التطوير');
      
      if (deliveryType === 'home') {
        return 700;
      } else {
        return 600;
      }
    }
    
    return null;
  }
} 