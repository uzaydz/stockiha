import { useState, useEffect, useCallback } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import type { Province, Municipality, DeliveryType } from '@/api/formShippingIntegration';
import { 
  getProvinces, 
  getMunicipalities, 
  getDeliveryPrice,
  checkYalidineConfiguration
} from '@/api/formShippingIntegration';

interface ShippingIntegrationOptions {
  enabled: boolean;
  provider: string | null;
}

export function useFormShippingIntegration({ enabled, provider }: ShippingIntegrationOptions) {
  const { organization } = useOrganization();
  const organizationId = organization?.id || '';

  // State variables
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [diagnostic, setDiagnostic] = useState<{
    lastChecked: number | null;
    configStatus: 'unchecked' | 'checking' | 'valid' | 'invalid';
    message: string | null;
    data?: any;
  }>({ 
    lastChecked: null, 
    configStatus: 'unchecked', 
    message: null 
  });
  
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [selectedMunicipality, setSelectedMunicipality] = useState<string | null>(null);
  const [deliveryType, setDeliveryType] = useState<DeliveryType | null>('home');
  const [deliveryPrice, setDeliveryPrice] = useState<number | null>(null);
  
  // يمكن استخدام هذا لتخزين القيم في حقول النموذج
  const setFieldValue = useCallback((field: string, value: any) => {
    console.log('تم تعيين قيمة الحقل:', field, value);
    // يمكنك هنا تنفيذ أي منطق إضافي لتعيين قيم الحقول
  }, []);

  // فحص التكوين
  useEffect(() => {
    if (enabled && provider && organizationId) {
      setDiagnostic(prev => ({ ...prev, configStatus: 'checking', message: 'جاري التحقق من التكوين...' }));
      
      checkYalidineConfiguration(organizationId)
        .then(result => {
          if (result.success) {
            setDiagnostic({
              lastChecked: Date.now(),
              configStatus: 'valid',
              message: result.message,
              data: result.data
            });
          } else {
            setDiagnostic({
              lastChecked: Date.now(),
              configStatus: 'invalid',
              message: result.message,
              data: result.data
            });
          }
        })
        .catch(err => {
          console.error('خطأ أثناء فحص التكوين:', err);
          setDiagnostic({
            lastChecked: Date.now(),
            configStatus: 'invalid',
            message: 'خطأ غير متوقع أثناء فحص التكوين'
          });
        });
    }
  }, [enabled, provider, organizationId]);

  // جلب الولايات
  useEffect(() => {
    if (enabled && provider && organizationId && diagnostic.configStatus === 'valid') {
      setLoading(true);
      
      getProvinces(organizationId)
        .then(data => {
          setProvinces(data);
          setLoading(false);
        })
        .catch(err => {
          console.error('خطأ في جلب الولايات:', err);
          setDiagnostic(prev => ({ 
            ...prev, 
            message: 'فشل في جلب الولايات. قد تكون هناك مشكلة في الاتصال بالإنترنت أو مشكلة CORS.' 
          }));
          setLoading(false);
        });
    }
  }, [enabled, provider, organizationId, diagnostic.configStatus]);

  // جلب البلديات عند تغيير الولاية المحددة ونوع التوصيل
  useEffect(() => {
    if (enabled && provider && organizationId && selectedProvince && deliveryType) {
      setLoading(true);
      setMunicipalities([]);
      setSelectedMunicipality(null); // إعادة تعيين البلدية المختارة عند تغيير الولاية أو نوع التوصيل
      
      getMunicipalities(organizationId, selectedProvince, deliveryType)
        .then(data => {
          // استخدام البيانات المصفاة من الخادم مباشرة
          setMunicipalities(data);
          setLoading(false);
          
          // تسجيل عدد البلديات المتاحة
          console.log(`تم العثور على ${data.length} بلدية متاحة لنوع التوصيل ${deliveryType}`);
          
          // إذا كان نوع التوصيل هو مكتب، تحقق من وجود بلديات بها مكاتب استلام
          if (deliveryType === 'desk' && data.length === 0) {
            setDiagnostic(prev => ({ 
              ...prev, 
              message: 'لا توجد بلديات بها مكاتب استلام متاحة في هذه الولاية.' 
            }));
          }
        })
        .catch(err => {
          console.error('خطأ في جلب البلديات:', err);
          setDiagnostic(prev => ({ 
            ...prev, 
            message: 'فشل في جلب البلديات. قد تكون هناك مشكلة في الاتصال بالإنترنت أو مشكلة CORS.' 
          }));
          setLoading(false);
        });
    }
  }, [enabled, provider, organizationId, selectedProvince, deliveryType]);

  // حساب سعر التوصيل
  useEffect(() => {
    if (enabled && provider && organizationId && selectedProvince && selectedMunicipality && deliveryType) {
      setLoading(true);

      // استخدم ولاية افتراضية كنقطة بداية (عادة يجب إضافتها كإعداد للمنظمة)
      // في الوضع المثالي يجب جلب الولاية من إعدادات المتجر أو المؤسسة
      const fromProvinceId = '16'; // الجزائر العاصمة كمثال

      getDeliveryPrice(
        organizationId,
        fromProvinceId,
        selectedProvince,
        selectedMunicipality,
        deliveryType
      )
        .then(price => {
          setDeliveryPrice(price);
          setLoading(false);
        })
        .catch(err => {
          console.error('خطأ في حساب سعر التوصيل:', err);
          setDiagnostic(prev => ({ 
            ...prev, 
            message: 'فشل في حساب سعر التوصيل. قد تكون هناك مشكلة في الاتصال بالإنترنت أو مشكلة CORS.' 
          }));
          setLoading(false);
        });
    }
  }, [enabled, provider, organizationId, selectedProvince, selectedMunicipality, deliveryType]);

  // وظيفة مساعدة لجلب البلديات للولاية المحددة
  const getMunicipalitiesForProvince = useCallback(async (provinceId: string, type: DeliveryType = 'home') => {
    if (!enabled || !provider || !organizationId) {
      return [];
    }

    try {
      const data = await getMunicipalities(organizationId, provinceId, type);
      return data;
    } catch (err) {
      console.error('خطأ في جلب البلديات في الوظيفة المساعدة:', err);
      return [];
    }
  }, [enabled, provider, organizationId]);

  // وظيفة لإعادة محاولة الاتصال بالخادم
  const retryConnection = useCallback(() => {
    if (!organizationId) return;
    
    setDiagnostic(prev => ({ ...prev, configStatus: 'checking', message: 'جاري إعادة التحقق من التكوين...' }));
    
    checkYalidineConfiguration(organizationId)
      .then(result => {
        if (result.success) {
          setDiagnostic({
            lastChecked: Date.now(),
            configStatus: 'valid',
            message: result.message,
            data: result.data
          });
        } else {
          setDiagnostic({
            lastChecked: Date.now(),
            configStatus: 'invalid',
            message: result.message,
            data: result.data
          });
        }
      });
  }, [organizationId]);

  return {
    provinces,
    municipalities,
    selectedProvince,
    setSelectedProvince,
    selectedMunicipality,
    setSelectedMunicipality,
    deliveryType,
    setDeliveryType,
    deliveryPrice,
    setDeliveryPrice,
    loading,
    diagnostic,
    retryConnection,
    getMunicipalitiesForProvince,
    setFieldValue,
    isEnabled: enabled && Boolean(provider)
  };
} 