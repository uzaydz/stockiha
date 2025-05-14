import React, { useState, useEffect } from 'react';
import { YalidineApiClient } from '../lib/yalidine-api-client';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

// إعداد عميل Yalidine API
const yalidineConfig = {
  apiId: process.env.NEXT_PUBLIC_YALIDINE_API_ID || '',
  apiToken: process.env.NEXT_PUBLIC_YALIDINE_API_TOKEN || ''
};

// نوع بيانات الولاية
interface Wilaya {
  id: number;
  name: string;
  zone: number;
  is_deliverable: boolean;
}

// نوع بيانات البلدية
interface Commune {
  id: number;
  name: string;
  wilaya_id: number;
  has_stop_desk: boolean;
  is_deliverable: boolean;
  delivery_time_parcel: number;
  delivery_time_payment: number;
}

// نوع بيانات مركز التوصيل
interface Center {
  center_id: number;
  name: string;
  address: string;
  commune_id: number;
  wilaya_id: number;
}

// نوع بيانات الرسوم
interface ShippingFees {
  from_wilaya_id: number;
  to_wilaya_id: number;
  zone: number;
  retour_fee: number;
  cod_percentage: number;
  insurance_percentage: number;
  oversize_fee: number;
  fee_data: any;
}

interface ShippingSettingsProps {
  formId?: string;
  organizationId: string;
  initialSettings?: any;
  onSave: (settings: any) => void;
}

export default function ShippingProviderForm({ 
  formId, 
  organizationId,
  initialSettings,
  onSave
}: ShippingSettingsProps) {
  const supabase = useSupabaseClient();
  
  // حالة النموذج
  const [provider, setProvider] = useState<string>(initialSettings?.provider || '');
  const [enabled, setEnabled] = useState<boolean>(initialSettings?.enabled || false);
  const [fromWilaya, setFromWilaya] = useState<number | null>(null);
  
  // بيانات مستلمة من API
  const [wilayas, setWilayas] = useState<Wilaya[]>([]);
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [isLoadingWilayas, setIsLoadingWilayas] = useState<boolean>(false);
  const [feesCache, setFeesCache] = useState<Record<string, ShippingFees>>({});
  
  // إنشاء عميل Yalidine API
  const yalidineClient = new YalidineApiClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    yalidineConfig.apiId,
    yalidineConfig.apiToken
  );
  
  // تحميل قائمة الولايات عند تحميل المكون
  useEffect(() => {
    async function loadWilayas() {
      setIsLoadingWilayas(true);
      try {
        const result = await yalidineClient.getWilayas();
        
        if (result.success && result.data) {
          setWilayas(result.data);
          console.log(`Loaded ${result.data.length} wilayas (from ${result.fromCache ? 'cache' : 'API'})`);
        } else {
          console.error('Failed to load wilayas:', result);
        }
      } catch (error) {
        console.error('Error loading wilayas:', error);
      } finally {
        setIsLoadingWilayas(false);
      }
    }
    
    loadWilayas();
  }, []);
  
  // تحميل قائمة البلديات عند تغيير الولاية المصدر
  useEffect(() => {
    async function loadCommunes() {
      if (!fromWilaya) return;
      
      try {
        const result = await yalidineClient.getCommunes(fromWilaya);
        
        if (result.success && result.data) {
          setCommunes(result.data);
          console.log(`Loaded ${result.data.length} communes (from ${result.fromCache ? 'cache' : 'API'})`);
        } else {
          console.error('Failed to load communes:', result);
        }
      } catch (error) {
        console.error('Error loading communes:', error);
      }
    }
    
    loadCommunes();
  }, [fromWilaya]);
  
  // تحميل قائمة مراكز التوصيل
  const loadCenters = async (communeId: number) => {
    try {
      const result = await yalidineClient.getCenters(communeId);
      
      if (result.success && result.data) {
        setCenters(result.data);
        console.log(`Loaded ${result.data.length} centers (from ${result.fromCache ? 'cache' : 'API'})`);
      } else {
        console.error('Failed to load centers:', result);
      }
    } catch (error) {
      console.error('Error loading centers:', error);
    }
  };
  
  // حساب رسوم الشحن
  const calculateShippingFees = async (fromWilayaId: number, toWilayaId: number) => {
    const cacheKey = `${fromWilayaId}_${toWilayaId}`;
    
    // تحقق من التخزين المؤقت المحلي أولاً
    if (feesCache[cacheKey]) {
      console.log(`Using cached shipping fees for ${cacheKey}`);
      return feesCache[cacheKey];
    }
    
    try {
      const result = await yalidineClient.getShippingFees(fromWilayaId, toWilayaId);
      
      if (result.success && result.data) {
        console.log(`Loaded shipping fees (from ${result.fromCache ? 'cache' : 'API'})`);
        
        // تخزين النتيجة في التخزين المؤقت المحلي
        setFeesCache(prev => ({
          ...prev,
          [cacheKey]: result.data
        }));
        
        return result.data;
      } else {
        console.error('Failed to load shipping fees:', result);
        return null;
      }
    } catch (error) {
      console.error('Error loading shipping fees:', error);
      return null;
    }
  };
  
  // حفظ الإعدادات
  const handleSave = async () => {
    const settings = {
      enabled,
      provider,
      fromWilaya,
      // يمكن إضافة المزيد من الإعدادات هنا
    };
    
    onSave(settings);
  };
  
  // إرسال طرد جديد (مثال)
  const createParcel = async (parcelData: any) => {
    try {
      const result = await yalidineClient.createParcel(parcelData);
      
      if (result.success) {
        console.log('Parcel created successfully:', result.data);
        return result.data;
      } else {
        console.error('Failed to create parcel:', result);
        return null;
      }
    } catch (error) {
      console.error('Error creating parcel:', error);
      return null;
    }
  };
  
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">إعدادات مزود الشحن</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="mr-2"
          />
          تفعيل الشحن
        </label>
      </div>
      
      {enabled && (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              مزود الشحن
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">اختر مزود الشحن</option>
              <option value="yalidine">Yalidine</option>
              {/* يمكن إضافة المزيد من مزودي الشحن هنا */}
            </select>
          </div>
          
          {provider === 'yalidine' && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ولاية المصدر
                </label>
                <select
                  value={fromWilaya || ''}
                  onChange={(e) => setFromWilaya(parseInt(e.target.value) || null)}
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  disabled={isLoadingWilayas}
                >
                  <option value="">اختر ولاية المصدر</option>
                  {wilayas.map(wilaya => (
                    <option key={wilaya.id} value={wilaya.id}>
                      {wilaya.name} (المنطقة: {wilaya.zone})
                    </option>
                  ))}
                </select>
              </div>
              
              {/* يمكن إضافة المزيد من حقول التكوين هنا */}
            </>
          )}
          
          <button
            onClick={handleSave}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            حفظ الإعدادات
          </button>
        </>
      )}
      
      {/* رسالة معلومات عن مصدر البيانات */}
      <div className="mt-4 text-xs text-gray-500">
        تم تحميل البيانات باستخدام نظام التخزين المؤقت لـ Yalidine API لتجنب تجاوز حدود معدل الاستعلامات.
      </div>
    </div>
  );
} 