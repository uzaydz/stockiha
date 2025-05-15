import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast as showToast } from "@/components/ui/use-toast";
import { AlertCircle } from "lucide-react";
import { syncYalidineData, getSyncStatus, syncGlobalProvincesOnly } from '@/api/yalidine/data-sync';
import { syncFees } from '@/api/yalidine/new-fees-sync';
import { supabase } from '@/lib/supabase';
import { yalidineRateLimiter } from '@/api/yalidine/rate-limiter';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import 'dayjs/locale/ar-sa';

// استيراد المكونات الفرعية
import { YalidineProviderProps, SyncStatus, YalidineTableStatus } from './YalidineTypes';
import { SyncStatus as SyncStatusComponent } from './SyncStatus';
import { SourceProvinceSelector } from './SourceProvinceSelector';
import { DataFixTools } from './DataFixTools';
import { SyncControls } from './SyncControls';
import { handleNetworkError } from './NetworkErrorHandler';
import { useSyncState } from './useSyncState';

/**
 * مكون مزامنة بيانات ياليدين
 * يتيح للمستخدم مزامنة البيانات من واجهة برمجة تطبيقات ياليدين
 */
export default function YalidineDataSync({
  isEnabled,
  apiToken,
  apiKey,
  originWilayaId,
  currentOrganizationId,
  toast
}: YalidineProviderProps) {
  const { t } = useTranslation();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncingProvinces, setIsSyncingProvinces] = useState(false);
  
  // استخدام هوك حالة المزامنة
  const { syncProgress, setSyncProgress, resetSyncState } = useSyncState();
  
  // حالة إصلاح البيانات
  const [hasAppliedTableFix, setHasAppliedTableFix] = useState(false);
  const [isCheckingTableStatus, setIsCheckingTableStatus] = useState(false);
  const [tableStatus, setTableStatus] = useState<YalidineTableStatus | null>(null);
  const [isFixingData, setIsFixingData] = useState<boolean>(false);
  
  // ولاية المصدر
  const [selectedSourceProvince, setSelectedSourceProvince] = useState<number | undefined>(
    originWilayaId ? Number(originWilayaId) : undefined
  );
  
  // متغيرات لتتبع أخطاء الشبكة
  const errorCountRef = useRef(0);
  const lastErrorTimeRef = useRef(0);
  const maxConsecutiveErrors = 3; // الحد الأقصى للأخطاء المتتالية قبل إيقاف المزامنة
  const errorResetTime = 3000; // إعادة تعيين عداد الأخطاء بعد 3 ثوانية دون أخطاء جديدة
  const syncAbortedRef = useRef(false);
  
  // مراقبة أخطاء معدل الطلبات
  useEffect(() => {
    if (!yalidineRateLimiter || typeof yalidineRateLimiter.schedule !== 'function') {
      return;
    }
    
    // تسجيل الاستماع لأحداث الخطأ من معدل الطلبات
    const originalSchedule = yalidineRateLimiter.schedule;
    
    // استبدال وظيفة schedule بوظيفة مخصصة لاكتشاف الأخطاء
    // @ts-ignore - التجاهل لأننا نعلم ما نفعله
    yalidineRateLimiter.schedule = async function<T>(task: () => Promise<T>): Promise<T> {
      try {
        const result = await originalSchedule.call(yalidineRateLimiter, task);
        // إعادة تعيين عداد الأخطاء عند النجاح
        errorCountRef.current = 0;
        return result;
      } catch (error: any) {
        // التحقق مما إذا كان الخطأ متعلقًا بالشبكة
        if (error?.message?.includes('Network Error') || 
            error?.toString()?.includes('Network Error') ||
            error?.code === 'ERR_NETWORK' ||
            error?.name === 'AxiosError') {
          
          // استخدام معالج أخطاء الشبكة
          handleNetworkError(
            errorCountRef,
            lastErrorTimeRef,
            maxConsecutiveErrors,
            errorResetTime,
            syncAbortedRef,
            () => {
              // وظيفة تنفذ عند إلغاء المزامنة بسبب الأخطاء المتكررة
              // تحديث حالة المزامنة إلى فاشلة
              const currentStatus = getSyncStatus();
              if (currentStatus.fees.status === 'syncing') {
                currentStatus.fees.status = 'failed';
                localStorage.setItem('yalidine_sync_status', JSON.stringify(currentStatus));
                setSyncProgress(currentStatus);
              }
              
              // إظهار رسالة للمستخدم
              toast({
                title: "توقفت المزامنة",
                description: "تم إيقاف المزامنة تلقائيًا بسبب تجاوز حد أخطاء الشبكة. يرجى المحاولة مرة أخرى لاحقًا.",
                variant: "destructive",
              });
              
              // إيقاف المزامنة
              setIsSyncing(false);
            }
          );
        }
        throw error;
      }
    };
    
    // تسجيل الاستماع لحدث إلغاء معالج الصف
    if (typeof yalidineRateLimiter.onCancel === 'function') {
      yalidineRateLimiter.onCancel(() => {
        // ينفذ هذا الكود عند إلغاء معالج الصف تلقائيًا
        if (isSyncing && !syncAbortedRef.current) {
          syncAbortedRef.current = true;
          console.warn('[SYNC] تم إلغاء المزامنة بسبب تجاوز حد معالج معدل الطلبات');
          
          // تحديث حالة المزامنة إلى فاشلة
          const currentStatus = getSyncStatus();
          if (currentStatus.fees.status === 'syncing') {
            currentStatus.fees.status = 'failed';
            localStorage.setItem('yalidine_sync_status', JSON.stringify(currentStatus));
            setSyncProgress(currentStatus);
          }
          
          // إظهار رسالة للمستخدم
          toast({
            title: "توقفت المزامنة",
            description: "تم إيقاف المزامنة تلقائيًا بسبب تجاوز حد معدل الطلبات. يرجى المحاولة مرة أخرى لاحقًا.",
            variant: "destructive",
          });
          
          // إيقاف المزامنة
          setIsSyncing(false);
        }
      });
    }
    
    // تنظيف عند إزالة المكون
    return () => {
      // استعادة الوظيفة الأصلية
      if (yalidineRateLimiter && typeof originalSchedule === 'function') {
        // @ts-ignore
        yalidineRateLimiter.schedule = originalSchedule;
      }
    };
  }, [isSyncing, toast, setSyncProgress]);
  
  // وظيفة لمزامنة البيانات
  const handleSyncClick = async () => {
    if (!currentOrganizationId) {
      toast({
        title: "خطأ في المزامنة",
        description: "لم يتم العثور على معرف المنظمة الحالية",
        variant: "destructive",
      });
      return;
    }
    
    // التحقق من تحديد ولاية المصدر
    if (!selectedSourceProvince) {
      toast({
        title: "خطأ في المزامنة",
        description: "يرجى تحديد ولاية المصدر أولاً",
        variant: "destructive",
      });
      return;
    }
    
    // إعادة تعيين متغيرات تتبع الأخطاء
    errorCountRef.current = 0;
    lastErrorTimeRef.current = 0;
    syncAbortedRef.current = false;
    
    setIsSyncing(true);
    try {
      toast({
        title: "جاري المزامنة",
        description: "بدأت عملية مزامنة بيانات ياليدين. قد تستغرق هذه العملية بضع دقائق.",
        variant: "default",
      });
      
      // إعادة تعيين حالة المزامنة قبل البدء
      resetSyncState();
      
      // استخدام خاصية البيانات الإضافية (custom settings) لتمرير ولاية المصدر
      localStorage.setItem('yalidine_sync_options', JSON.stringify({
        sourceProvinceId: selectedSourceProvince
      }));
      
      
      
      // استخدام وظيفة المزامنة الجديدة
      const success = await syncFees(currentOrganizationId, undefined, {
        sourceProvinceId: selectedSourceProvince
      });
      
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
      
      // تحديث حالة المزامنة بعد الانتهاء
      const finalStatus = getSyncStatus();
      setSyncProgress(finalStatus);
      
    } catch (error) {
      console.error('خطأ أثناء مزامنة بيانات ياليدين:', error);
      toast({
        title: "خطأ في المزامنة",
        description: "حدث خطأ أثناء مزامنة بيانات ياليدين: " + ((error as Error)?.message || 'خطأ غير معروف'),
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };
  
  // وظيفة لمزامنة بيانات الولايات العالمية فقط
  const handleSyncGlobalProvinces = async () => {
    if (!currentOrganizationId) {
      toast({
        title: "خطأ في المزامنة",
        description: "لم يتم العثور على معرف المنظمة الحالية",
        variant: "destructive",
      });
      return;
    }
    
    setIsSyncingProvinces(true);
    try {
      const result = await syncGlobalProvincesOnly(currentOrganizationId);
      
      if (result) {
        toast({
          title: "تمت المزامنة",
          description: "تم تحديث بيانات الولايات العالمية بنجاح",
          variant: "default",
        });
        
        // إعادة تحميل الصفحة لعرض البيانات المحدثة
        window.location.reload();
      } else {
        toast({
          title: "فشل المزامنة",
          description: "حدث خطأ أثناء مزامنة بيانات الولايات العالمية",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error syncing global provinces:', error);
      toast({
        title: "خطأ في المزامنة",
        description: "حدث خطأ غير متوقع أثناء مزامنة بيانات الولايات العالمية",
        variant: "destructive",
      });
    } finally {
      setIsSyncingProvinces(false);
    }
  };
  
  // وظيفة لإعادة تعيين المزامنة
  const handleForceReset = () => {
    localStorage.removeItem('yalidine_sync_status');
    localStorage.removeItem('yalidine_sync_options');
    resetSyncState();
    
    toast({
      title: "تم إعادة التعيين",
      description: "تم إعادة تعيين حالة المزامنة",
      variant: "default",
    });
  };
  
  // وظيفة لإيقاف المزامنة
  const handleStopSync = () => {
    if (!isSyncing) return;
    
    // تعيين متغير لإشارة إلى أن المزامنة تم إيقافها عمدًا
    syncAbortedRef.current = true;
    
    // إيقاف معالج قائمة الانتظار في نظام معدل الطلبات
    if (yalidineRateLimiter && typeof yalidineRateLimiter.cancelProcessing === 'function') {
      yalidineRateLimiter.cancelProcessing();
      
    }
    
    // تحديث حالة المزامنة إلى ملغاة
    const currentStatus = getSyncStatus();
    
    // تحديث حالة العناصر التي لا تزال قيد المزامنة فقط
    Object.keys(currentStatus).forEach(key => {
      const item = currentStatus[key as keyof SyncStatus];
      if (item.status === 'syncing') {
        item.status = 'canceled';
      }
    });
    
    localStorage.setItem('yalidine_sync_status', JSON.stringify(currentStatus));
    setSyncProgress(currentStatus);
    
    // إظهار رسالة للمستخدم
    toast({
      title: "تم إيقاف المزامنة",
      description: "تم إيقاف عملية المزامنة بنجاح",
      variant: "default",
    });
    
    // إيقاف المزامنة
    setIsSyncing(false);
  };
  
  // وظيفة لفحص حالة الجداول
  const checkTablesStatus = async () => {
    if (!currentOrganizationId) return;
    
    setIsCheckingTableStatus(true);
    try {
      const { data, error } = await supabase.rpc('check_yalidine_tables_status', {
        p_organization_id: currentOrganizationId
      });
      
      if (error) {
        console.error('خطأ في فحص حالة الجداول:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء فحص حالة الجداول",
          variant: "destructive",
        });
        return;
      }
      
      setTableStatus(data);
    } catch (error) {
      console.error('خطأ غير متوقع:', error);
    } finally {
      setIsCheckingTableStatus(false);
    }
  };
  
  // وظيفة لإصلاح البيانات
  const handleFixData = async () => {
    if (!currentOrganizationId) return;
    
    setIsFixingData(true);
    try {
      const { data, error } = await supabase.rpc('fix_yalidine_tables', {
        p_organization_id: currentOrganizationId
      });
      
      if (error) {
        console.error('خطأ في إصلاح الجداول:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء إصلاح الجداول",
          variant: "destructive",
        });
        return;
      }
      
      setHasAppliedTableFix(true);
      
      toast({
        title: "تم الإصلاح",
        description: "تم إصلاح الجداول بنجاح. يرجى إعادة المزامنة الآن.",
        variant: "default",
      });
      
      // إعادة فحص حالة الجداول
      await checkTablesStatus();
    } catch (error) {
      console.error('خطأ غير متوقع:', error);
    } finally {
      setIsFixingData(false);
    }
  };
  
  // فحص حالة الجداول عند تحميل المكون
  useEffect(() => {
    if (currentOrganizationId) {
      checkTablesStatus();
    }
  }, [currentOrganizationId]);
  
  // تحديث ولاية المصدر في قاعدة البيانات عند تغييرها
  useEffect(() => {
    const updateSourceProvince = async () => {
      if (!currentOrganizationId || !selectedSourceProvince) return;
      
      try {
        // تحديث إعدادات المتجر
        const { error } = await supabase
          .from('store_settings')
          .upsert({
            organization_id: currentOrganizationId,
            key: 'yalidine_source_province_id',
            value: selectedSourceProvince.toString()
          }, {
            onConflict: 'organization_id,key'
          });
        
        if (error) {
          console.error('خطأ في تحديث ولاية المصدر:', error);
        }
      } catch (error) {
        console.error('خطأ غير متوقع:', error);
      }
    };
    
    updateSourceProvince();
  }, [currentOrganizationId, selectedSourceProvince]);
  
  // تحديث تاريخ آخر مزامنة
  const getLastSyncDate = () => {
    try {
      const status = getSyncStatus();
      
      // التحقق من وجود مزامنة ناجحة
      const hasSuccessfulSync = 
        status.provinces.status === 'success' ||
        status.municipalities.status === 'success' ||
        status.centers.status === 'success' ||
        status.fees.status === 'success';
      
      if (!hasSuccessfulSync) {
        return 'لم تتم المزامنة بعد';
      }
      
      // استخدام تاريخ آخر تحديث من localStorage
      const lastUpdate = localStorage.getItem('yalidine_last_update');
      if (lastUpdate) {
        return dayjs(lastUpdate).locale('ar-sa').format('YYYY/MM/DD HH:mm');
      }
      
      return 'غير معروف';
    } catch (error) {
      return 'غير معروف';
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('yalidine.sync.cardTitle', 'مزامنة بيانات ياليدين')}</CardTitle>
        <CardDescription>
          {t('yalidine.sync.cardDescription', 'مزامنة بيانات الولايات والبلديات والمراكز وأسعار التوصيل من ياليدين')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* معلومات المزامنة */}
          <div className="flex justify-between text-sm">
            <span>{t('yalidine.sync.lastSync', 'آخر مزامنة')}:</span>
            <span>{getLastSyncDate()}</span>
          </div>
          
          {/* اختيار ولاية المصدر */}
          <SourceProvinceSelector
            currentOrganizationId={currentOrganizationId}
            originWilayaId={originWilayaId}
            disabled={isSyncing}
            onChange={setSelectedSourceProvince}
          />
          
          {/* عرض حالة المزامنة */}
          <SyncStatusComponent
            syncProgress={syncProgress}
            isSyncing={isSyncing}
          />
          
          {/* أزرار التحكم */}
          <SyncControls
            isSyncing={isSyncing}
            isSyncingProvinces={isSyncingProvinces}
            onSyncClick={handleSyncClick}
            onSyncGlobalProvinces={handleSyncGlobalProvinces}
            onStopSync={handleStopSync}
            onForceReset={handleForceReset}
            isEnabled={isEnabled}
          />
          
          {/* رسالة تحذير إذا كانت الخدمة معطلة */}
          {!isEnabled && (
            <Alert variant="default" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t('yalidine.status.disabledWarning', 'خدمة ياليدين معطلة حاليًا. قم بتفعيلها لاستخدام ميزات المزامنة.')}
              </AlertDescription>
            </Alert>
          )}
          
          {/* أدوات إصلاح البيانات */}
          {tableStatus && (
            <DataFixTools
              tableStatus={tableStatus}
              isFixingData={isFixingData}
              onFixData={handleFixData}
              isCheckingTableStatus={isCheckingTableStatus}
              onCheckTablesStatus={checkTablesStatus}
            />
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-xs text-muted-foreground">
          {t('yalidine.sync.note', 'ملاحظة: قد تستغرق عملية المزامنة بضع دقائق حسب حجم البيانات.')}
        </div>
      </CardFooter>
    </Card>
  );
}
