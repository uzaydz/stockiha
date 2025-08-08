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

import { supabase } from '@/lib/supabase-unified';
import { yalidineRateLimiter } from './rate-limiter';

// ===========================================
// 🚀 Cache System for Yalidine API - نظام تخزين مؤقت متقدم
// ===========================================

interface CachedYalidineResponse {
  data: any;
  timestamp: number;
  ttl: number; // time to live in milliseconds
}

class YalidineAPICache {
  private cache = new Map<string, CachedYalidineResponse>();
  private readonly DEFAULT_TTL = 10 * 60 * 1000; // 10 دقائق

  // جيل مفتاح الكاش
  private generateKey(organizationId: string, fromWilayaId: number, toWilayaId: number): string {
    return `yalidine_${organizationId}_${fromWilayaId}_${toWilayaId}`;
  }

  // حفظ في الكاش
  set(organizationId: string, fromWilayaId: number, toWilayaId: number, data: any): void {
    const key = this.generateKey(organizationId, fromWilayaId, toWilayaId);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: this.DEFAULT_TTL
    });
    
    // تنظيف الكاش التلقائي (إبقاء آخر 50 استعلام فقط)
    if (this.cache.size > 50) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  // جلب من الكاش
  get(organizationId: string, fromWilayaId: number, toWilayaId: number): any | null {
    const key = this.generateKey(organizationId, fromWilayaId, toWilayaId);
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    // التحقق من انتهاء الصلاحية
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  // تنظيف الكاش المنتهي الصلاحية
  cleanup(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // إحصائيات الكاش
  getStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // يمكن تحسينه لاحقاً
    };
  }
}

// إنشاء instance واحد للكاش
const yalidineCache = new YalidineAPICache();

// تنظيف الكاش كل 5 دقائق
if (typeof window !== 'undefined') {
  setInterval(() => {
    yalidineCache.cleanup();
  }, 5 * 60 * 1000);
}

// ===========================================
// Types والـ Interfaces
// ===========================================

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
      .select('id, name, is_deliverable') // تحديد الحقول المطلوبة، is_deliverable يجب أن يكون boolean في الجدول
      .limit(1000); // إضافة limit لتجنب PGRST116
    
    if (error) {
      throw error; // أو التعامل مع الخطأ بطريقة أخرى مثل إرجاع مصفوفة فارغة
    }
    
    if (data) {
      
      // تأكد من أن is_deliverable يتم تحويله بشكل صحيح إذا كان رقمًا في قاعدة البيانات
      return data.map(p => ({ ...p, is_deliverable: Boolean(p.is_deliverable) }));
    }
    return [];
  } catch (error) {
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
      .eq('wilaya_id', parseInt(provinceId, 10))
      .limit(1000); // إضافة limit لتجنب PGRST116

    if (error) {
      throw error;
    }

    if (data) {
      
      // البيانات يجب أن تكون متوافقة مع النوع Municipality مباشرة
      return data as Municipality[];
    }
    return [];
  } catch (error) {
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
 * جلب جميع إعدادات ياليدين المطلوبة لصفحة شراء المنتج في استدعاء واحد محسن
 * @param organizationId معرف المؤسسة
 * @returns جميع البيانات المطلوبة أو null في حالة الفشل
 */
export async function getYalidineSettingsForProductPurchase(
  organizationId: string
): Promise<{
  success: boolean;
  data?: {
    yalidine_provider_id: number;
    origin_wilaya_id: number;
    api_credentials: {
      api_token: string;
      api_key: string;
      is_enabled: boolean;
    };
  };
  error?: string;
  message?: string;
} | null> {
  
  try {
    
    const { data, error } = await supabase
      .rpc('get_yalidine_settings_for_product_purchase' as any, {
        p_organization_id: organizationId
      }) as { data: any; error: any };

    if (error) {
      return null;
    }

    if (!data) {
      return null;
    }

    return data as {
      success: boolean;
      data?: {
        yalidine_provider_id: number;
        origin_wilaya_id: number;
        api_credentials: {
          api_token: string;
          api_key: string;
          is_enabled: boolean;
        };
      };
      error?: string;
      message?: string;
    };

  } catch (error) {
    return null;
  }
}

/**
 * جلب الأسعار مباشرة من API ياليدين (محسن مع Cache ذكي)
 * @param organizationId معرف المؤسسة
 * @param fromWilayaId معرف ولاية المصدر 
 * @param toWilayaId معرف ولاية الوجهة
 * @returns بيانات الأسعار من API ياليدين
 */
async function fetchYalidineFeesFromAPIOptimized(
  organizationId: string,
  fromWilayaId: number,
  toWilayaId: number
): Promise<any | null> {

  try {
    // 🔍 أولاً: التحقق من الكاش
    const cachedData = yalidineCache.get(organizationId, fromWilayaId, toWilayaId);
    if (cachedData) {
      return cachedData;
    }

    // استخدام RPC المحسن بدلاً من 3 استدعاءات منفصلة
    const settingsResult = await getYalidineSettingsForProductPurchase(organizationId);

    if (!settingsResult || !settingsResult.success || !settingsResult.data) {
      return null;
    }

    const { api_credentials } = settingsResult.data;

    if (!api_credentials.api_token || !api_credentials.api_key) {
      return null;
    }

    // استخدام Vite proxy مع timestamp فريد لتجنب request deduplication
    const uniqueTimestamp = Date.now();
    // لا نمرر مفاتيح API في الـ query لتجنّب كشفها ولضمان أن البروكسي يمررها كترويسات
    const proxyUrl = `/yalidine-api/fees/?from_wilaya_id=${fromWilayaId}&to_wilaya_id=${toWilayaId}&_t=${uniqueTimestamp}`;

    // إضافة timeout controller للسرعة
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // timeout 8 ثواني
    
    const response = await fetch(proxyUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        // تمرير بيانات الاعتماد عبر الترويسات ليستقبلها Vite proxy ويحوّلها إلى X-API-ID و X-API-TOKEN upstream
        'x-api-id': api_credentials.api_token,
        'x-api-token': api_credentials.api_key,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',  // منع الـ cache تماماً
        'Pragma': 'no-cache',                  // للمتصفحات القديمة
        'Expires': '0',                        // انتهاء فوري
        'X-Request-ID': `yalidine-${fromWilayaId}-${toWilayaId}-${uniqueTimestamp}`, // معرف فريد
        'X-Unique-Request': `${Math.random()}`  // عشوائية إضافية
      }
    });
    
    clearTimeout(timeoutId); // إلغاء الـ timeout عند النجاح

    if (!response.ok) {
      const errorText = await response.text();
      return null;
    }

    let rawData;
    try {
      rawData = await response.json();
    } catch (jsonError) {
      return null;
    }
    
    // التحقق من صحة الاستجابة - الـ function proxy ترجع البيانات بتنسيق مختلف
    const actualData = rawData.success && rawData.data ? rawData.data : rawData;
    
    if (!actualData || Object.keys(actualData).length === 0 || !actualData.per_commune) {
      return null;
    }

    // تحويل البيانات إلى التنسيق المتوقع  
    const communeData = actualData.per_commune;
    const firstCommune = Object.values(communeData)[0] as any;
    
    const processedData = {
      success: true,
      from_wilaya_id: fromWilayaId,
      to_wilaya_id: toWilayaId,
      data: {
        from_wilaya: {
          id: fromWilayaId,
          name: (rawData as any).from_wilaya_name || `Wilaya ${fromWilayaId}`
        },
        to_wilaya: {
          id: toWilayaId,
          name: (rawData as any).to_wilaya_name || `Wilaya ${toWilayaId}`
        },
        fees: {
          home_delivery: {
            price: firstCommune?.express_home || 500,
            currency: "DZD",
            description: "التوصيل للمنزل"
          },
          stopdesk_delivery: {
            price: firstCommune?.express_desk || 350,
            currency: "DZD",
            description: "التوصيل لمكتب التوقف"
          }
        },
        zone: (rawData as any).zone || 1,
        estimated_delivery_days: "1-3",
        insurance_rate: (rawData as any).insurance_percentage ? `${(rawData as any).insurance_percentage}%` : "1%",
        max_weight: "30kg",
        max_dimensions: "100x100x100cm",
        per_commune: communeData,
        cod_percentage: (rawData as any).cod_percentage,
        retour_fee: (rawData as any).retour_fee,
        oversize_fee: (rawData as any).oversize_fee
      },
      timestamp: new Date().toISOString(),
      source: 'yalidine_api_via_optimized_rpc'
    };

    // 💾 حفظ البيانات في الكاش للاستخدام المستقبلي
    yalidineCache.set(organizationId, fromWilayaId, toWilayaId, processedData);

    return processedData;

  } catch (error) {
    return null;
  }
}

/**
 * جلب الأسعار مباشرة من API ياليدين (النسخة القديمة)
 * @param organizationId معرف المؤسسة
 * @param fromWilayaId معرف ولاية المصدر 
 * @param toWilayaId معرف ولاية الوجهة
 * @returns بيانات الأسعار من API ياليدين
 */
async function fetchYalidineFeesFromAPI(
  organizationId: string,
  fromWilayaId: number,
  toWilayaId: number
): Promise<any | null> {

  try {
    // 🔍 أولاً: التحقق من الكاش (مشارك مع الدالة المحسنة)
    const cachedData = yalidineCache.get(organizationId, fromWilayaId, toWilayaId);
    if (cachedData) {
      return cachedData;
    }

    // جلب معرف مزود ياليدين أولاً
    const { data: providerData, error: providerError } = await supabase
      .from('shipping_providers')
      .select('id')
      .eq('code', 'yalidine')
      .single();

    if (providerError || !providerData) {
      return null;
    }

    // جلب بيانات الاعتماد من إعدادات المؤسسة
    const { data: settings, error: settingsError } = await supabase
      .from('shipping_provider_settings')
      .select('api_token, api_key, is_enabled')
      .eq('organization_id', organizationId)
      .eq('provider_id', providerData.id)
      .eq('is_enabled', true)
      .single();

    if (settingsError || !settings) {
      return null;
    }

    if (!settings.api_token || !settings.api_key) {
      return null;
    }

    // استخدام Vite proxy مع timestamp فريد لتجنب request deduplication
    const uniqueTimestamp = Date.now();
    const proxyUrl = `/yalidine-api/fees/?from_wilaya_id=${fromWilayaId}&to_wilaya_id=${toWilayaId}&api_id=${encodeURIComponent(settings.api_token)}&api_token=${encodeURIComponent(settings.api_key)}&_t=${uniqueTimestamp}`;

    // إضافة timeout controller للسرعة
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // timeout 8 ثواني
    
    const response = await fetch(proxyUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'x-api-id': settings.api_token,        // lowercase للـ proxy
        'x-api-token': settings.api_key,       // lowercase للـ proxy
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',  // منع الـ cache تماماً
        'Pragma': 'no-cache',                  // للمتصفحات القديمة
        'Expires': '0',                        // انتهاء فوري
        'X-Request-ID': `yalidine-${fromWilayaId}-${toWilayaId}-${uniqueTimestamp}`, // معرف فريد
        'X-Unique-Request': `${Math.random()}`  // عشوائية إضافية
      }
    });
    
    clearTimeout(timeoutId); // إلغاء الـ timeout عند النجاح

    if (!response.ok) {
      return null;
    }

    let rawData;
    try {
      rawData = await response.json();
    } catch (jsonError) {
      return null;
    }
    
    // التحقق من صحة الاستجابة - الـ function proxy ترجع البيانات بتنسيق مختلف
    const actualData = rawData.success && rawData.data ? rawData.data : rawData;
    
    if (!actualData || Object.keys(actualData).length === 0 || !actualData.per_commune) {
      return null;
    }

    // تحويل البيانات إلى التنسيق المتوقع  
    const communeData = actualData.per_commune;
    const firstCommune = Object.values(communeData)[0] as any;
    
    const processedData = {
      success: true,
      from_wilaya_id: fromWilayaId,
      to_wilaya_id: toWilayaId,
      data: {
        from_wilaya: {
          id: fromWilayaId,
          name: (rawData as any).from_wilaya_name || `Wilaya ${fromWilayaId}`
        },
        to_wilaya: {
          id: toWilayaId,
          name: (rawData as any).to_wilaya_name || `Wilaya ${toWilayaId}`
        },
        fees: {
          home_delivery: {
            price: firstCommune?.express_home || 500,
            currency: "DZD",
            description: "التوصيل للمنزل"
          },
          stopdesk_delivery: {
            price: firstCommune?.express_desk || 350,
            currency: "DZD",
            description: "التوصيل لمكتب التوقف"
          }
        },
        zone: (rawData as any).zone || 1,
        estimated_delivery_days: "1-3",
        insurance_rate: (rawData as any).insurance_percentage ? `${(rawData as any).insurance_percentage}%` : "1%",
        max_weight: "30kg",
        max_dimensions: "100x100x100cm",
        per_commune: communeData,
        cod_percentage: (rawData as any).cod_percentage,
        retour_fee: (rawData as any).retour_fee,
        oversize_fee: (rawData as any).oversize_fee
      },
      timestamp: new Date().toISOString(),
      source: 'yalidine_api_via_proxy'
    };

    return processedData;

  } catch (error) {
    
    // تسجيل معلومات إضافية عن الخطأ
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
    } else if (error instanceof SyntaxError) {
    }
    
    return null;
  }
}

/**
 * حساب سعر التوصيل بناءً على الولاية المرسل منها، الولاية المرسل إليها، البلدية، نوع التوصيل، والوزن.
 * يستخدم API ياليدين مباشرة لجلب الأسعار الحديثة
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

  // إضافة cache على مستوى الولاية (لأن كل البلديات لها نفس السعر)
  const wilayaCacheKey = `yalidine_wilaya_${fromProvinceId}_${toProvinceId}_${deliveryType}`;
  const cachedWilayaPrice = sessionStorage.getItem(wilayaCacheKey);
  
  if (cachedWilayaPrice) {
    const parsedCache = JSON.parse(cachedWilayaPrice);
    const cacheAge = Date.now() - parsedCache.timestamp;
    
    // استخدام الـ cache إذا كان عمره أقل من 30 دقيقة (أطول لأنه على مستوى الولاية)
    if (cacheAge < 30 * 60 * 1000) {
      return parsedCache.price;
    } else {
      // إزالة الـ cache المنتهي الصلاحية
      sessionStorage.removeItem(wilayaCacheKey);
    }
  }

  // لا تعيد طلب RPC هنا لتفادي تكرار الاستدعاءات؛ استخدم fromProvinceId الممرر كمرجع لولاية المصدر
  const originWilayaId: number = parseInt(fromProvinceId, 10);

  const toWilayaIdNum = parseInt(toProvinceId, 10);

  // في وضع التطوير، استخدم البيانات الوهمية
  if (DEV_MODE) {
    const mockKey = `${originWilayaId}-${toWilayaIdNum}`;
    const feesForRoute = MOCK_DELIVERY_FEES_CALC[mockKey];

    if (feesForRoute) {
      const toCommuneIdNum = parseInt(toCommuneId, 10);
      const feeData = feesForRoute.find(f => f.commune_id === toCommuneIdNum);

      if (feeData) {
        let basePrice = deliveryType === 'home' ? feeData.express_home : feeData.express_desk;
        
        if (basePrice === null || basePrice === undefined) {
          return null;
        }
        
        // حساب رسوم الوزن الزائد
        const BASE_WEIGHT_LIMIT_KG = 5;
        let oversizeCharge = 0;
        if (weight > BASE_WEIGHT_LIMIT_KG && feeData.oversize_fee) {
          const extraWeight = weight - BASE_WEIGHT_LIMIT_KG;
          oversizeCharge = extraWeight * feeData.oversize_fee;
        }
        
        const finalPrice = basePrice + oversizeCharge;
        return finalPrice;
      }
    }
    
    // سعر وهمي افتراضي
    return 750;
  }

  // في وضع الإنتاج، استخدم API ياليدين مباشرة (أولوية قصوى للسرعة)
  
  try {
    // محاولة استخدام النسخة المحسنة أولاً
    let apiData = await fetchYalidineFeesFromAPIOptimized(organizationId, originWilayaId, toWilayaIdNum);
    
    // إذا فشلت النسخة المحسنة، استخدم النسخة القديمة كـ fallback
    if (!apiData) {
      apiData = await fetchYalidineFeesFromAPI(organizationId, originWilayaId, toWilayaIdNum);
    }

    if (!apiData) {
      // بدلاً من انتظار قاعدة البيانات، استخدام سعر افتراضي سريع
      const quickFallbackPrice = deliveryType === 'home' ? 600 : 450;
      return quickFallbackPrice;
    }

    // تحليل استجابة API ياليدين الحقيقية (format جديد)
    
    if (apiData && apiData.success && apiData.data) {
      
      let basePrice = 0;
      let usedCommuneData = null;
      
      // محاولة الحصول على أسعار البلدية المطلوبة من per_commune
      
      if (apiData.data.per_commune && apiData.data.per_commune[toCommuneId]) {
        usedCommuneData = apiData.data.per_commune[toCommuneId];
      } else {
        // إذا لم تكن البلدية المطلوبة متاحة، استخدم أول بلدية متاحة
        const communeEntries = Object.entries(apiData.data.per_commune || {});
        if (communeEntries.length > 0) {
          const [firstCommuneId, firstCommuneData] = communeEntries[0];
          usedCommuneData = firstCommuneData;
        } else {
        }
      }

      // استخراج السعر من بيانات البلدية
      
      if (usedCommuneData) {
        if (deliveryType === 'home') {
          basePrice = usedCommuneData.express_home || 0;
        } else if (deliveryType === 'desk') {
          basePrice = usedCommuneData.express_desk || 0;
        }
      } else {
        // استخدام الأسعار العامة من البيانات المحولة كـ fallback أخير
        const fees = apiData.data.fees;

        if (deliveryType === 'home') {
          basePrice = fees?.home_delivery?.price || 0;
        } else if (deliveryType === 'desk') {
          basePrice = fees?.stopdesk_delivery?.price || 0;
        }
      }

      if (basePrice === 0) {
        // استخدام سعر افتراضي سريع بدلاً من قاعدة البيانات
        const quickFallbackPrice = deliveryType === 'home' ? 650 : 450;
        return quickFallbackPrice;
      }

      // حساب رسوم الوزن الزائد باستخدام oversize_fee من الاستجابة
      let oversizeCharge = 0;
      const BASE_WEIGHT_LIMIT_KG = 1; // ياليدين عادة 1 كيلو كحد أساسي
      if (weight > BASE_WEIGHT_LIMIT_KG) {
        const oversizeRate = apiData.data.oversize_fee || 50; // استخدام oversize_fee من الاستجابة أو 50 كافتراضي
        const extraWeight = weight - BASE_WEIGHT_LIMIT_KG;
        oversizeCharge = extraWeight * oversizeRate;
      }

      const finalPrice = basePrice + oversizeCharge;
      
      // حفظ النتيجة في الـ cache لتسريع الطلبات المستقبلية
      try {
        const cacheData = {
          price: finalPrice,
          timestamp: Date.now()
        };
        sessionStorage.setItem(wilayaCacheKey, JSON.stringify(cacheData));
      } catch (error) {
      }
      
      return finalPrice;

    } else {
      // العودة لقاعدة البيانات المحلية
      return await calculateDeliveryPriceFromDatabase(organizationId, originWilayaId, toWilayaIdNum, parseInt(toCommuneId, 10), deliveryType, weight);
    }

  } catch (error) {
    // العودة لقاعدة البيانات المحلية كـ fallback
    return await calculateDeliveryPriceFromDatabase(organizationId, originWilayaId, toWilayaIdNum, parseInt(toCommuneId, 10), deliveryType, weight);
  }
}

/**
 * حساب سعر التوصيل من قاعدة البيانات المحلية (fallback)
 */
async function calculateDeliveryPriceFromDatabase(
  organizationId: string,
  originWilayaId: number,
  toWilayaIdNum: number,
  toCommuneIdNum: number,
  deliveryType: DeliveryType,
  weight: number
): Promise<number | null> {

  try {
      const { data, error } = await supabase
      .from('yalidine_fees')
      .select('express_home, express_desk, oversize_fee, from_wilaya_id, to_wilaya_id, commune_id')
        .eq('organization_id', organizationId) 
      .eq('from_wilaya_id', originWilayaId)
        .eq('to_wilaya_id', toWilayaIdNum)
        .eq('commune_id', toCommuneIdNum)
      .single();

      if (error) {
        if (error.code === 'PGRST116') {
            return null;
        } 
      throw error;
      }

      if (!data) {
      return null;
  }

    const feeData = data as DeliveryFee;

  let basePrice = 0;

  if (deliveryType === 'home') {
    if (feeData.express_home === null || feeData.express_home === undefined) {
        return null;
    }
    basePrice = feeData.express_home;
  } else if (deliveryType === 'desk') {
    if (feeData.express_desk === null || feeData.express_desk === undefined) {
        return null;
    }
    basePrice = feeData.express_desk;
  } else {
    return null;
  }

  // حساب رسوم الوزن الزائد
    const BASE_WEIGHT_LIMIT_KG = 5;
  let oversizeCharge = 0;

  if (weight > BASE_WEIGHT_LIMIT_KG) {
      if (feeData.oversize_fee && feeData.oversize_fee > 0) {
        const extraWeight = weight - BASE_WEIGHT_LIMIT_KG;
        oversizeCharge = extraWeight * feeData.oversize_fee;
    }
  }

    const finalPrice = basePrice + oversizeCharge;
    return finalPrice;
  
  } catch (error) {
    return null;
  }
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

  // جلب ولاية المصدر من إعدادات المؤسسة باستخدام RPC المحسن
  let originWilayaId: number;
  
  try {
    // 🆕 استخدام RPC المحسن بدلاً من الاستعلام المنفصل
    const yalidineSettings = await getYalidineSettingsForProductPurchase(organizationId);
    
    if (yalidineSettings && yalidineSettings.success && yalidineSettings.data) {
      originWilayaId = yalidineSettings.data.origin_wilaya_id;
    } else {
      return null;
    }
  } catch (error) {
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
      return null;
    }
  } catch (error: any) {
    return null;
  }
}
