import { useEffect, useMemo, useRef, useState } from 'react';
import { useSharedOrgSettingsOnly } from '@/context/SharedStoreDataContext';

// 🔥 إصلاح: Cache عالمي محسن لمنع التكرار مع TTL
const globalFetchedOrgs = new Set<string>();
const globalOrgSettingsCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// TTL للـ cache (5 دقائق)
const CACHE_TTL = 5 * 60 * 1000;

const getCachedData = (key: string) => {
  const cached = globalOrgSettingsCache.get(key);
  if (!cached) return null;

  // فحص انتهاء صلاحية البيانات
  if (Date.now() - cached.timestamp > cached.ttl) {
    globalOrgSettingsCache.delete(key);
    globalFetchedOrgs.delete(key);
    return null;
  }

  return cached.data;
};

const setCachedData = (key: string, data: any, ttl = CACHE_TTL) => {
  globalOrgSettingsCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
};

export function useOrgCartSettings(organizationId: string | null, effectiveData: any) {
  const { organizationSettings: sharedOrgSettings } = useSharedOrgSettingsOnly();
  const [enableCartFallback, setEnableCartFallback] = useState<boolean | null>(null);
  const fetchedEnableCartRef = useRef(false);
  const currentOrgIdRef = useRef<string | null>(null);

  // 🔥 إصلاح: استدعاء جميع الـ hooks أولاً قبل أي early return
  const organizationSettings = useMemo(() => {
    // 🚫 منع التغييرات غير الجوهرية
    const effectiveOrgSettings = effectiveData?.organizationSettings;
    const fallbackOrgSettings = sharedOrgSettings;

    // استخدم البيانات الفعالة إذا كانت متوفرة، وإلا استخدم الاحتياطية
    return effectiveOrgSettings || fallbackOrgSettings;
  }, [effectiveData?.organizationSettings?.id, sharedOrgSettings?.id]); // 🔥 إصلاح: استخدام id فقط بدلاً من الكامل object

  const showAddToCart = useMemo(() => {
    // 🔥 إصلاح: فحص effectiveData داخل useMemo بدلاً من early return
    if (!effectiveData) {
      if (process.env.NODE_ENV === 'development') console.log('🔍 [useOrgCartSettings] showAddToCart: لا توجد effectiveData، إرجاع true افتراضياً');
      return true; // افتراضياً أظهر الزر
    }

    try {
      const raw = (organizationSettings as any)?.custom_js;
      const js = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {};
      const enabled = !!js?.enable_cart;
      const productSkip = !!(effectiveData?.product as any)?.advanced_settings?.skip_cart;

      if (process.env.NODE_ENV === 'development') console.log('🔍 [useOrgCartSettings] showAddToCart تفاصيل:', {
        hasOrganizationSettings: !!organizationSettings,
        raw: raw,
        rawType: typeof raw,
        parsedJs: js,
        enableCart: enabled,
        productSkip: productSkip,
        productSkipPath: 'effectiveData.product.advanced_settings.skip_cart',
        hostname: window.location.hostname,
        pathname: window.location.pathname,
        timestamp: new Date().toISOString()
      });

      // إذا كان لدينا إعدادات من organizationSettings، استخدمها
      if (raw && (typeof raw === 'string' ? raw.length > 0 : !!raw)) {
        const result = enabled && !productSkip;
        if (process.env.NODE_ENV === 'development') console.log('🔍 [useOrgCartSettings] showAddToCart: استخدام organizationSettings:', {
          enabled: enabled,
          productSkip: productSkip,
          result: result
        });
        return result;
      }

      // إذا لم تكن متوفرة بعد وأجرينا fetch، استخدم النتيجة
      if (enableCartFallback !== null) {
        const result = enableCartFallback && !productSkip;
        if (process.env.NODE_ENV === 'development') console.log('🔍 [useOrgCartSettings] showAddToCart: استخدام enableCartFallback:', {
          enableCartFallback: enableCartFallback,
          productSkip: productSkip,
          result: result
        });
        return result;
      }

      // افتراضياً، أظهر الزر (لتفادي التذبذب)
      const result = !productSkip;
      if (process.env.NODE_ENV === 'development') console.log('🔍 [useOrgCartSettings] showAddToCart: استخدام الافتراضي:', {
        productSkip: productSkip,
        result: result
      });
      return result;
    } catch (error) {
      console.error('❌ [useOrgCartSettings] showAddToCart خطأ:', error);
      return false;
    }
  }, [organizationSettings, effectiveData?.product, enableCartFallback, effectiveData]);

  useEffect(() => {
    // 🔥 إصلاح: فحص شامل للبيانات المطلوبة
    if (!effectiveData || !organizationId) return;

    // 🔥 إصلاح: منع re-run إذا لم يتغير organizationId
    if (currentOrgIdRef.current === organizationId && fetchedEnableCartRef.current) return;

    // 🔥 إصلاح: فحص إذا كانت البيانات متوفرة في organizationSettings
    const raw = (organizationSettings as any)?.custom_js;
    const hasCustomJs = typeof raw === 'string' ? raw.length > 0 : !!raw;
    if (hasCustomJs) return;

    // 🔥 إصلاح: التحقق من Global cache المحسن لمنع التكرار
    if (globalFetchedOrgs.has(organizationId)) {
      const cachedData = getCachedData(organizationId);
      if (cachedData !== null) {
        setEnableCartFallback(cachedData);
        fetchedEnableCartRef.current = true;
        currentOrgIdRef.current = organizationId;
        return;
      }
    }

    // 🚫 منع الاستدعاءات المتكررة في نفس الجلسة
    const lastFetchTime = (window as any).lastOrgSettingsFetch?.[organizationId];
    if (lastFetchTime && Date.now() - lastFetchTime < 5000) { // 5 ثوانٍ
      return;
    }

    // 🚫 منع الاستدعاءات المتكررة - تحقق من وجود طلب معلق
    if ((window as any).fetchEnableCartPending?.[organizationId]) {
      return;
    }

    const fetchEnableCart = async () => {
      try {
        // وضع علامة في Global cache أننا بدأنا الجلب
        globalFetchedOrgs.add(organizationId);
        fetchedEnableCartRef.current = true;

        // تسجيل وقت الاستدعاء الأخير
        (window as any).lastOrgSettingsFetch = {
          ...(window as any).lastOrgSettingsFetch,
          [organizationId]: Date.now()
        };

        // 🚫 منع الطلبات المتعددة
        (window as any).fetchEnableCartPending = {
          ...(window as any).fetchEnableCartPending,
          [organizationId]: true
        };

        const { supabase } = await import('@/lib/supabase-unified');
        const { data } = await supabase
          .from('organization_settings')
          .select('custom_js')
          .eq('organization_id', organizationId)
          .maybeSingle();

        let result = false;
        if (data?.custom_js) {
          try {
            const js = typeof data.custom_js === 'string' ? JSON.parse(data.custom_js) : data.custom_js;
            result = !!js?.enable_cart;
          } catch {
            result = false;
          }
        }

        // حفظ في Global cache المحسن
        setCachedData(organizationId, result);
        setEnableCartFallback(result);
        currentOrgIdRef.current = organizationId;

        // إزالة علامة الطلب المعلق
        delete (window as any).fetchEnableCartPending?.[organizationId];

      } catch (error) {
        // حفظ خطأ في Global cache أيضاً
        setCachedData(organizationId, false);
        setEnableCartFallback(false);
        currentOrgIdRef.current = organizationId;

        // إزالة علامة الطلب المعلق في حالة الخطأ
        delete (window as any).fetchEnableCartPending?.[organizationId];
      }
    };

    // 🚫 تأخير الطلب لمنع الاستدعاءات المتكررة السريعة
    const timeoutId = setTimeout(() => {
      fetchEnableCart();
    }, 300); // زيادة التأخير إلى 300ms

    // تنظيف الـ timeout عند إلغاء الـ effect
    return () => clearTimeout(timeoutId);
  }, [organizationId]); // 🔥 إصلاح: إزالة organizationSettings و effectiveData من dependencies

  return { organizationSettings, showAddToCart } as const;
}
