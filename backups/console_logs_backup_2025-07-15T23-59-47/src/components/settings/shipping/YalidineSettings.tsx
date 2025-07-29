import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck, ShieldOff, RefreshCw, Activity } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createShippingService, ShippingProvider } from '@/api/shippingService';
import { useShippingSettings } from '@/hooks/useShippingSettings';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { validateYalidineCredentials, syncYalidineData } from '@/api/yalidine/data-sync';
import { useTenant } from '@/context/TenantContext';
import { yalidineRateLimiter } from '@/api/yalidine/rate-limiter';
import { Progress } from '@/components/ui/progress';

// Importar los componentes separados
import YalidineCredentialsCard from './yalidine/YalidineCredentialsCard';
import YalidineAdvancedSettings from './yalidine/YalidineAdvancedSettings';
import YalidineDataSync from './yalidine/YalidineDataSync';
import YalidineRateLimiter from './yalidine/YalidineRateLimiter';
import YalidineOriginSelector from './yalidine/YalidineOriginSelector';
import { ShippingProviderSettings } from '@/api/shippingSettingsService';

export default function YalidineSettings() {
  const { toast } = useToast();
  const { tenant, currentOrganization } = useTenant();
  
  // Use the shipping settings hook
  const { 
    settings, 
    isLoading: isLoadingSettings, 
    saveSettings,
    refetch,
    error: settingsError
  } = useShippingSettings(ShippingProvider.YALIDINE);
  
  // Local state
  const [isEnabled, setIsEnabled] = useState(false);
  const [apiToken, setApiToken] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [autoShipping, setAutoShipping] = useState(false);
  const [trackUpdates, setTrackUpdates] = useState(false);
  const [originWilayaId, setOriginWilayaId] = useState<number | undefined>(undefined);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingEnabled, setIsTogglingEnabled] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [rateLimiterStats, setRateLimiterStats] = useState<{
    perSecond: number;
    perMinute: number;
    perHour: number;
    perDay: number;
  }>({ perSecond: 0, perMinute: 0, perHour: 0, perDay: 0 });
  const [remainingRequests, setRemainingRequests] = useState<{
    perSecond: number;
    perMinute: number;
    perHour: number;
    perDay: number;
  }>({ perSecond: 5, perMinute: 50, perHour: 1000, perDay: 10000 });
  
  // إضافة حالة متابعة تقدم المزامنة
  const [syncProgress, setSyncProgress] = useState({
    provinces: { total: 0, added: 0, status: 'pending' },
    municipalities: { total: 0, added: 0, status: 'pending' },
    centers: { total: 0, added: 0, status: 'pending' },
    fees: { total: 0, added: 0, status: 'pending' }
  });

  // Initialize shipping tables if needed when component mounts
  useEffect(() => {
    const initializeTables = async () => {
      if (settingsError && settingsError.message && settingsError.message.includes('does not exist')) {
        try {
          setTableError('جاري إنشاء جداول إعدادات الشحن...');
          
          // Create create_shipping_tables function if it doesn't exist
          await supabase.rpc('create_function_if_not_exists');
          
          // Create shipping tables
          await supabase.rpc('create_shipping_tables');
          
          setTableError(null);
          refetch();
          
          toast({
            title: "تم إنشاء الجداول",
            description: "تم إنشاء جداول إعدادات الشحن بنجاح",
            variant: "default",
          });
        } catch (error) {
          setTableError('حدث خطأ أثناء إنشاء جداول إعدادات الشحن. حاول مرة أخرى لاحقًا.');
          
          toast({
            title: "خطأ في إنشاء الجداول",
            description: "حدث خطأ أثناء إنشاء جداول إعدادات الشحن",
            variant: "destructive",
          });
        }
      }
    };
    
    initializeTables();
  }, [settingsError, refetch, toast]);

  // Update local state when settings are loaded
  useEffect(() => {
    if (settings) {
      
      setIsEnabled(settings.is_enabled);
      setApiToken(settings.api_token || '');
      setApiKey(settings.api_key || '');
      setAutoShipping(settings.auto_shipping);
      setTrackUpdates(settings.track_updates);
      
      // Extraer origin_wilaya_id del campo settings (JSON)
      if (settings.settings && settings.settings.origin_wilaya_id) {
        setOriginWilayaId(settings.settings.origin_wilaya_id);
      }
    }
  }, [settings]);

  // Actualizar estadísticas de rate-limiter periódicamente
  useEffect(() => {
    if (!isEnabled) return;
    
    const updateStats = () => {
      const stats = yalidineRateLimiter.getStats();
      const remaining = yalidineRateLimiter.getRemainingRequests();
      setRateLimiterStats(stats);
      setRemainingRequests(remaining);
    };
    
    // Actualizar estadísticas inmediatamente
    updateStats();
    
    // Actualizar cada 3 segundos
    const interval = setInterval(updateStats, 3000);
    
    return () => clearInterval(interval);
  }, [isEnabled]);

  // إضافة useEffect لمراقبة تغيرات حالة المزامنة
  useEffect(() => {
    // تحقق من حالة المزامنة عند تحميل المكون
    try {
      const status = localStorage.getItem('yalidine_sync_status');
      if (status) {
        const parsedStatus = JSON.parse(status);
        setSyncProgress(parsedStatus);
        
        // تحقق مما إذا كانت المزامنة جارية بالفعل
        const isSyncInProgress = 
          parsedStatus.provinces.status === 'syncing' || 
          parsedStatus.municipalities.status === 'syncing' || 
          parsedStatus.centers.status === 'syncing' || 
          parsedStatus.fees.status === 'syncing';
          
        if (isSyncInProgress) {
          setIsSyncing(true);
        }
      }
    } catch (e) {
    }
    
    // إعداد المراقبة المستمرة لحالة المزامنة إذا كانت المزامنة جارية
    const checkSyncStatus = () => {
      if (!isSyncing) return;
      
      try {
        const status = localStorage.getItem('yalidine_sync_status');
        if (status) {
          const parsedStatus = JSON.parse(status);
          setSyncProgress(parsedStatus);
          
          // تحقق مما إذا كانت المزامنة قد انتهت
          const isSyncCompleted = 
            (parsedStatus.provinces.status === 'success' || parsedStatus.provinces.status === 'failed') &&
            (parsedStatus.municipalities.status === 'success' || parsedStatus.municipalities.status === 'failed') &&
            (parsedStatus.centers.status === 'success' || parsedStatus.centers.status === 'failed') &&
            (parsedStatus.fees.status === 'success' || parsedStatus.fees.status === 'failed');
            
          if (isSyncCompleted && isSyncing) {
            setIsSyncing(false);
          }
        }
      } catch (e) {
      }
    };
    
    // مراقبة حالة المزامنة بشكل مستمر
    const interval = setInterval(checkSyncStatus, 1000);
    
    return () => clearInterval(interval);
  }, [isSyncing]);

  // وظيفة لمزامنة بيانات ياليدين
  const handleSyncData = async () => {
    if (!currentOrganization?.id) {
      toast({
        title: "خطأ في المزامنة",
        description: "لم يتم العثور على معرف المنظمة الحالية",
        variant: "destructive",
      });
      return;
    }
    
    // إعادة تعيين حالة المزامنة قبل البدء
    const initialSyncStatus = {
      provinces: { total: 0, added: 0, status: 'pending' },
      municipalities: { total: 0, added: 0, status: 'pending' },
      centers: { total: 0, added: 0, status: 'pending' },
      fees: { total: 0, added: 0, status: 'pending' }
    };
    
    // تحديث localStorage وحالة المكون
    localStorage.setItem('yalidine_sync_status', JSON.stringify(initialSyncStatus));
    setSyncProgress(initialSyncStatus);
    
    // إعادة تعيين إحصائيات المحدد
    if (typeof yalidineRateLimiter.resetStats === 'function') {
      yalidineRateLimiter.resetStats();
    } else {
      setRateLimiterStats({ perSecond: 0, perMinute: 0, perHour: 0, perDay: 0 });
      setRemainingRequests({ perSecond: 5, perMinute: 50, perHour: 1000, perDay: 10000 });
    }
    
    setIsSyncing(true);
    try {
      // التحقق من صحة البيانات أولاً
      const isValid = await validateYalidineCredentials(currentOrganization.id);
      
      if (!isValid) {
        toast({
          title: "خطأ في الاتصال",
          description: "فشل التحقق من صحة مفاتيح ياليدين. تأكد من صحة البيانات المدخلة وحاول مرة أخرى.",
          variant: "destructive",
        });
        setIsSyncing(false);
        return;
      }
      
      // بدء عملية المزامنة
      toast({
        title: "جاري المزامنة",
        description: "بدأت عملية مزامنة بيانات ياليدين. قد تستغرق هذه العملية بضع دقائق.",
        variant: "default",
      });
      
      // استخدام forceUpdate=true لضمان تحديث البيانات بغض النظر عن آخر تحديث
      // لكن بدون skipValidation لأننا تحققنا من صلاحية البيانات بالفعل
      
      const success = await syncYalidineData(currentOrganization.id, true, false);
      
      if (success) {
        toast({
          title: "تمت المزامنة",
          description: "تمت مزامنة بيانات ياليدين بنجاح.",
          variant: "default",
        });
      } else {
        toast({
          title: "تنبيه",
          description: "اكتملت المزامنة مع وجود بعض الأخطاء. قد تكون البيانات غير مكتملة.",
          variant: "default",
        });
      }
    } catch (error) {
      toast({
        title: "خطأ في المزامنة",
        description: "حدث خطأ أثناء مزامنة بيانات ياليدين: " + ((error as Error)?.message || 'خطأ غير معروف'),
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // تعديل وظيفة حفظ الإعدادات لبدء المزامنة بعد الحفظ
  const handleSaveSettings = async (settingsToSave: Partial<ShippingProviderSettings>): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        saveSettings(settingsToSave);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  };

  // Handle enable/disable toggle with immediate feedback
  const handleToggleEnabled = async (checked: boolean) => {
    setIsTogglingEnabled(true);
    setIsEnabled(checked);
    
    try {

      // Always save the new enabled state
      await handleSaveSettings({
        is_enabled: checked,
        api_token: apiToken,
        api_key: apiKey,
        auto_shipping: autoShipping,
        track_updates: trackUpdates
      });
      
      // Show success message
      toast({
        title: checked ? "تم التفعيل" : "تم التعطيل",
        description: checked 
          ? "تم تفعيل خدمة ياليدين بنجاح، أدخل بيانات API الآن" 
          : "تم تعطيل خدمة ياليدين بنجاح",
        variant: "default",
      });
      
      // Refresh settings data
      refetch();
    } catch (error) {
      
      // Revert state on error
      setIsEnabled(!checked);
      
      // Show error message
      toast({
        title: "خطأ في التفعيل",
        description: "حدث خطأ أثناء تغيير حالة التفعيل: " + ((error as Error)?.message || 'خطأ غير معروف'),
        variant: "destructive",
      });
    } finally {
      setIsTogglingEnabled(false);
    }
  };

  const testConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {

      // Create an instance of the shipping service with Yalidine provider
      // تصحيح ترتيب البيانات: apiKey هو الرقم القصير (API ID) و apiToken هو الرمز الطويل (API TOKEN)
      const shippingService = createShippingService(
        ShippingProvider.YALIDINE, 
        { token: apiKey, key: apiToken }  // عكس الترتيب ليتطابق مع API ياليدين
      );
      
      // Test the credentials
      const result = await shippingService.testCredentials();
      
      // إذا فشل الاختبار، جرب طريقة بديلة باستخدام Vite proxy
      if (!result.success && apiToken && apiKey) {
        try {
          const proxyResponse = await fetch('/yalidine-api/wilayas', {
            method: 'GET',
            headers: {
              'X-API-ID': apiKey,      // apiKey هو الرقم القصير (API ID)
              'X-API-TOKEN': apiToken, // apiToken هو الرمز الطويل (API TOKEN)
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          });
          
          if (proxyResponse.ok) {
            const data = await proxyResponse.json();
            if (Array.isArray(data) && data.length > 0) {
              setTestResult({
                success: true,
                message: 'تم الاتصال بنجاح بخدمة ياليدين (عبر الوسيط المحلي)'
              });
              
              // Save settings if successful
              await handleSaveSettings({
                is_enabled: isEnabled,
                api_token: apiToken,
                api_key: apiKey,
                auto_shipping: autoShipping,
                track_updates: trackUpdates
              });
              return;
            }
          }
        } catch (proxyError) {
        }
      }
      
      setTestResult({
        success: result.success,
        message: result.message
      });
      
      // If the test was successful, automatically save the settings
      if (result.success) {
        await handleSaveSettings({
          is_enabled: isEnabled,
          api_token: apiToken,
          api_key: apiKey,
          auto_shipping: autoShipping,
          track_updates: trackUpdates
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
      
      setTestResult({
        success: false,
        message: 'حدث خطأ أثناء الاتصال بالخدمة: ' + errorMessage
      });
    } finally {
      setIsTesting(false);
    }
  };

  // وظيفة لإعادة تعيين كل شيء وإعادة المزامنة من الصفر
  const handleForceReset = () => {

    // إظهار رسالة للمستخدم
    toast({
      title: "جاري إعادة التعيين",
      description: "جاري إعادة تعيين حالة المزامنة وتنظيف النظام...",
      variant: "default",
    });
    
    // حتى لو كانت المزامنة جارية، قم بإيقافها
    setIsSyncing(false);
    
    // حذف جميع المفاتيح المتعلقة بياليدين من localStorage
    try {
      const allKeys = Object.keys(localStorage);
      const yalidineKeys = allKeys.filter(key => key.includes('yalidine'));
      
      yalidineKeys.forEach(key => localStorage.removeItem(key));
    } catch (e) {
    }
    
    // إعادة تعيين حالة المزامنة
    const initialSyncStatus = {
      provinces: { total: 0, added: 0, status: 'pending' },
      municipalities: { total: 0, added: 0, status: 'pending' },
      centers: { total: 0, added: 0, status: 'pending' },
      fees: { total: 0, added: 0, status: 'pending' }
    };
    localStorage.setItem('yalidine_sync_status', JSON.stringify(initialSyncStatus));
    setSyncProgress(initialSyncStatus);
    
    // إعادة تعيين محدد المعدل بشكل كامل
    if (typeof yalidineRateLimiter.resetStats === 'function') {
      yalidineRateLimiter.resetStats();
      
    } else {
    }
    
    // إعادة تعيين حالة المعالجة في محدد المعدل يدوياً (يحل مشكلة توقف المعالجة)
    // @ts-ignore - الوصول إلى خاصية داخلية لإصلاح المشكلة
    if (yalidineRateLimiter.isProcessing !== undefined) {
      try {
        // @ts-ignore
        yalidineRateLimiter.isProcessing = false;
        // @ts-ignore
        yalidineRateLimiter.lastProcessingStartTime = null;
        // @ts-ignore
        yalidineRateLimiter.queue = [];

      } catch (error) {
      }
    }
    
    // إعادة تعيين إحصائيات المعدل في واجهة المستخدم
    setRateLimiterStats({ perSecond: 0, perMinute: 0, perHour: 0, perDay: 0 });
    setRemainingRequests({ perSecond: 5, perMinute: 50, perHour: 1000, perDay: 10000 });
    
    // تأخير قصير ثم بدء المزامنة من جديد بعد تنظيف النظام
    setTimeout(async () => {
      if (!currentOrganization?.id) {
        toast({
          title: "خطأ في المزامنة",
          description: "لم يتم العثور على معرف المنظمة الحالية",
          variant: "destructive",
        });
        return;
      }

      // استخدام handleSyncData بدلاً من تكرار الكود
      // هذا يضمن اتباع نفس المنطق في كل مكان
      handleSyncData();
    }, 2000); // تأخير لضمان تنظيف النظام بشكل كامل
  };

  // تنظيف الحالة عند إزالة المكون
  useEffect(() => {
    return () => {
      // لا نقوم بإعادة تعيين localStorage هنا لأنه قد يكون مفيدًا للحفاظ على حالة المزامنة بين التنقلات
      // لكن نعيد تعيين حالة المزامنة في المكون نفسه
      setIsSyncing(false);
    };
  }, []);

  if (isLoadingSettings) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="mr-2">جاري تحميل الإعدادات...</span>
      </div>
    );
  }

  if (tableError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {tableError}
          </AlertDescription>
        </Alert>
        <Button onClick={() => refetch()} disabled={isLoadingSettings}>
          {isLoadingSettings ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  // Propiedades comunes para pasar a los componentes hijos
  const commonProps = {
    settings,
    isEnabled,
    apiToken,
    apiKey,
    autoShipping,
    trackUpdates,
    originWilayaId,
    setIsEnabled,
    setApiToken,
    setApiKey,
    setAutoShipping,
    setTrackUpdates,
    setOriginWilayaId,
    saveSettings: handleSaveSettings,
    refetch,
    currentOrganizationId: currentOrganization?.id,
    toast
  };

  return (
    <div className="space-y-6">
      <YalidineCredentialsCard {...commonProps} />

      {isEnabled && (
        <>
          <YalidineOriginSelector {...commonProps} />
          <YalidineAdvancedSettings {...commonProps} />
          <YalidineDataSync {...commonProps} />
          <YalidineRateLimiter {...commonProps} />
        </>
      )}
    </div>
  );
}
