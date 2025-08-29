/**
 * مكون Preloader لجلب بيانات المتجر مبكراً
 * يتم تشغيله قبل ظهور أي مكون آخر لضمان توفر البيانات فوراً
 */

import React, { useEffect, useState, useRef } from 'react';
import { preloadStoreData } from '@/services/preloadService';

interface StorePreloaderProps {
  children: React.ReactNode;
  showLoadingIndicator?: boolean;
  loadingComponent?: React.ReactNode;
  maxWaitTime?: number; // بالميلي ثانية
}

interface PreloadState {
  isPreloading: boolean;
  isComplete: boolean;
  hasError: boolean;
  error?: string;
  storeIdentifier?: string;
  executionTime?: number;
}

const StorePreloader: React.FC<StorePreloaderProps> = ({
  children,
  showLoadingIndicator = true,
  loadingComponent,
  maxWaitTime = 3000 // 3 ثواني كحد أقصى
}) => {
  const [preloadState, setPreloadState] = useState<PreloadState>({
    isPreloading: true,
    isComplete: false,
    hasError: false
  });
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const preloadStartTime = useRef<number>(Date.now());

  // تحديد store identifier
  const resolveStoreIdentifier = (): string | null => {
    try {
      const stored = localStorage.getItem('bazaar_current_subdomain');
      if (stored && stored !== 'main' && stored !== 'www') return stored;
    } catch {}
    
    try {
      const hostname = window.location.hostname.split(':')[0];
      const baseDomains = ['.ktobi.online', '.stockiha.com', '.bazaar.dev', '.vercel.app', '.bazaar.com'];
      const isBaseDomain = baseDomains.some((d) => hostname.endsWith(d));
      const isLocalhost = hostname.includes('localhost') || hostname.startsWith('127.');
      const isCustomDomain = !isLocalhost && !isBaseDomain;
      
      if (isBaseDomain) {
        const parts = hostname.split('.');
        if (parts.length > 2 && parts[0] && parts[0] !== 'www') {
          return parts[0];
        }
      }
      
      if (isCustomDomain) {
        return hostname;
      }
    } catch {}
    
    return null;
  };

  useEffect(() => {
    const storeIdentifier = resolveStoreIdentifier();
    
    if (!storeIdentifier) {
      console.log('🤷 [StorePreloader] لا يوجد store identifier، تخطي preload');
      setPreloadState({
        isPreloading: false,
        isComplete: true,
        hasError: false
      });
      return;
    }

    console.log(`🚀 [StorePreloader] بدء preload للمتجر: ${storeIdentifier}`);
    
    // تعيين timeout للحد الأقصى لوقت الانتظار
    timeoutRef.current = setTimeout(() => {
      console.log(`⏰ [StorePreloader] انتهى الوقت المحدد (${maxWaitTime}ms)، إظهار المحتوى`);
      setPreloadState(prev => ({
        ...prev,
        isPreloading: false,
        isComplete: true
      }));
    }, maxWaitTime);

    // تشغيل preload
    const runPreload = async () => {
      try {
        const result = await preloadStoreData(storeIdentifier);
        const totalTime = Date.now() - preloadStartTime.current;
        
        if (result.success) {
          console.log(`✅ [StorePreloader] اكتمل preload بنجاح في ${totalTime}ms`);
          setPreloadState({
            isPreloading: false,
            isComplete: true,
            hasError: false,
            storeIdentifier,
            executionTime: result.executionTime
          });
        } else {
          console.error(`❌ [StorePreloader] فشل preload:`, result.error);
          setPreloadState({
            isPreloading: false,
            isComplete: true,
            hasError: true,
            error: result.error,
            storeIdentifier,
            executionTime: result.executionTime
          });
        }
      } catch (error: any) {
        const totalTime = Date.now() - preloadStartTime.current;
        console.error(`❌ [StorePreloader] خطأ في preload:`, error);
        setPreloadState({
          isPreloading: false,
          isComplete: true,
          hasError: true,
          error: error?.message || 'خطأ غير معروف',
          storeIdentifier,
          executionTime: totalTime
        });
      }
    };

    runPreload();

    // تنظيف
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [maxWaitTime]);

  // إذا كان preload مكتمل أو فشل، اعرض المحتوى
  if (preloadState.isComplete) {
    return <>{children}</>;
  }

  // إذا لم يكن مطلوب عرض loading indicator، اعرض المحتوى مباشرة
  if (!showLoadingIndicator) {
    return <>{children}</>;
  }

  // عرض loading component مخصص إذا تم توفيره
  if (loadingComponent) {
    return <>{loadingComponent}</>;
  }

  // عرض loading indicator افتراضي
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="text-center space-y-4 p-8">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-secondary/50 rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">
            جاري تحضير المتجر...
          </h3>
          <p className="text-sm text-muted-foreground">
            {preloadState.storeIdentifier ? `تحميل بيانات ${preloadState.storeIdentifier}` : 'تحضير البيانات'}
          </p>
        </div>
        
        <div className="w-64 bg-secondary/20 rounded-full h-2 mx-auto overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-secondary h-full rounded-full animate-pulse"></div>
        </div>
        
        <p className="text-xs text-muted-foreground">
          هذا سيستغرق بضع ثوانٍ فقط...
        </p>
      </div>
    </div>
  );
};

export default StorePreloader;
