/**
 * 🚀 Early Domain Detector - كاشف مبكر للنطاق
 * يحسن سرعة التوجه للمتجر عبر الكشف المبكر للنطاق
 */

import React, { useEffect, useState } from 'react';

interface EarlyDomainInfo {
  hostname: string;
  subdomain: string | null;
  isCustomDomain: boolean;
  isPublicDomain: boolean;
  pageType: 'max-store' | 'public-product' | 'public-store' | 'landing';
}

interface EarlyDomainDetectorProps {
  onDomainDetected: (domainInfo: EarlyDomainInfo) => void;
  children: React.ReactNode;
}

export const EarlyDomainDetector: React.FC<EarlyDomainDetectorProps> = ({ 
  onDomainDetected, 
  children 
}) => {
  const [domainInfo, setDomainInfo] = useState<EarlyDomainInfo | null>(null);
  const [isDetecting, setIsDetecting] = useState(true);

  useEffect(() => {
    const detectDomainEarly = () => {
      try {
        const hostname = window.location.hostname;
        const pathname = window.location.pathname;
        
        console.log('🔍 [EarlyDomainDetector] فحص النطاق:', { hostname, pathname });
        
        // فحص النطاقات العامة
        const publicDomains = ['ktobi.online', 'www.ktobi.online', 'stockiha.com', 'www.stockiha.com'];
        const isPublicDomain = publicDomains.includes(hostname);
        const isLocalhost = hostname.includes('localhost');
        
        let subdomain: string | null = null;
        let isCustomDomain = false;
        let pageType: EarlyDomainInfo['pageType'] = 'landing';
        
        // 🔥 التعرف على جميع أنواع النطاقات
        if (isLocalhost && hostname.includes('.')) {
          // localhost مع subdomain (مثل asraycollection.localhost)
          const parts = hostname.split('.');
          if (parts.length > 1 && parts[0] !== 'localhost') {
            subdomain = parts[0];
            isCustomDomain = true;
            console.log('🚀 [EarlyDomainDetector] تم اكتشاف subdomain في localhost:', subdomain);
          }
        } else if (hostname.includes('stockiha.com') && !isPublicDomain) {
          // subdomain من stockiha.com (مثل myshop.stockiha.com)
          const parts = hostname.split('.');
          if (parts.length > 2 && parts[0] !== 'www') {
            subdomain = parts[0];
            isCustomDomain = true;
            console.log('🚀 [EarlyDomainDetector] تم اكتشاف subdomain من stockiha.com:', subdomain);
          }
        } else if (hostname.includes('ktobi.online') && !isPublicDomain) {
          // subdomain من ktobi.online (مثل myshop.ktobi.online)
          const parts = hostname.split('.');
          if (parts.length > 2 && parts[0] !== 'www') {
            subdomain = parts[0];
            isCustomDomain = true;
            console.log('🚀 [EarlyDomainDetector] تم اكتشاف subdomain من ktobi.online:', subdomain);
          }
        } else if (!isPublicDomain && !isLocalhost) {
          // نطاق مخصص كامل (مثل myshop.com)
          isCustomDomain = true;
          subdomain = hostname;
          console.log('🚀 [EarlyDomainDetector] تم اكتشاف نطاق مخصص:', hostname);
        }
        
        // تحديد نوع الصفحة
        if (isCustomDomain) {
          if (pathname === '/') {
            pageType = 'max-store';
          } else if (pathname.includes('/products/') || pathname.includes('/product/')) {
            pageType = 'public-product';
          } else {
            pageType = 'public-store';
          }
        }
        
        const detectedInfo: EarlyDomainInfo = {
          hostname,
          subdomain,
          isCustomDomain,
          isPublicDomain,
          pageType
        };
        
        console.log('✅ [EarlyDomainDetector] نتيجة الكشف:', detectedInfo);
        
        setDomainInfo(detectedInfo);
        onDomainDetected(detectedInfo);
        
        // إذا كان نطاق مخصص، أرسل المعلومات فوراً
        if (isCustomDomain) {
          // حفظ المعلومات في sessionStorage للاستخدام السريع
          sessionStorage.setItem('bazaar_early_domain_detection', 'true');
          sessionStorage.setItem('bazaar_early_hostname', hostname);
          if (subdomain) {
            sessionStorage.setItem('bazaar_early_subdomain', subdomain);
          }
          sessionStorage.setItem('bazaar_early_page_type', pageType);
          
          // إرسال معلومات النطاق للـ window object للاستخدام السريع
          (window as any).__BAZAAR_EARLY_DOMAIN__ = detectedInfo;
          
          // إرسال event للـ components الأخرى
          window.dispatchEvent(new CustomEvent('bazaar:domain-detected', {
            detail: detectedInfo
          }));
          
          console.log('🚀 [EarlyDomainDetector] تم إرسال event domain-detected');
        }
        
      } catch (error) {
        console.warn('❌ [EarlyDomainDetector] خطأ في الكشف المبكر للنطاق:', error);
      } finally {
        setIsDetecting(false);
      }
    };
    
    // تشغيل الكشف فوراً
    detectDomainEarly();
    
    // تنظيف عند unmount
    return () => {
      if ((window as any).__BAZAAR_EARLY_DOMAIN__) {
        delete (window as any).__BAZAAR_EARLY_DOMAIN__;
      }
    };
  }, [onDomainDetected]);

  // إذا كان جاري الكشف، اعرض شاشة تحميل محسنة
  if (isDetecting && domainInfo?.isCustomDomain) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {domainInfo.subdomain ? `متجر ${domainInfo.subdomain}` : 'متجر'}
          </h2>
          <p className="text-gray-600 mb-4">جاري تحميل المتجر...</p>
          <div className="text-sm text-gray-500">
            {domainInfo.hostname}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default EarlyDomainDetector;
