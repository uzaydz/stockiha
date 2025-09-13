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
  pageType: 'max-store' | 'public-product' | 'public-store' | 'landing' | 'dashboard' | 'pos' | 'super-admin' | 'call-center' | 'auth' | 'minimal';
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

        // فحص النطاقات العامة
        const publicDomains = ['ktobi.online', 'www.ktobi.online', 'stockiha.com', 'www.stockiha.com', 'stockiha.pages.dev'];
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
          }
        } else if (hostname.includes('stockiha.com') && !isPublicDomain) {
          // subdomain من stockiha.com (مثل myshop.stockiha.com)
          const parts = hostname.split('.');
          if (parts.length > 2 && parts[0] !== 'www') {
            subdomain = parts[0];
            isCustomDomain = true;
          }
        } else if (hostname.includes('ktobi.online') && !isPublicDomain) {
          // subdomain من ktobi.online (مثل myshop.ktobi.online)
          const parts = hostname.split('.');
          if (parts.length > 2 && parts[0] !== 'www') {
            subdomain = parts[0];
            isCustomDomain = true;
          }
        } else if (!isPublicDomain && !isLocalhost) {
          // نطاق مخصص كامل (مثل myshop.com)
          isCustomDomain = true;
          subdomain = hostname;
        }
        
        // تحديد نوع الصفحة
        if (isPublicDomain) {
          // النطاقات العامة - فحص المسارات الإدارية
          if (pathname.startsWith('/dashboard')) {
            pageType = 'dashboard';
          } else if (pathname.startsWith('/pos')) {
            pageType = 'pos';
          } else if (pathname.startsWith('/super-admin')) {
            pageType = 'super-admin';
          } else if (pathname.startsWith('/call-center')) {
            pageType = 'call-center';
          } else if (pathname.startsWith('/login') || pathname.startsWith('/forgot-password') || pathname.startsWith('/reset-password')) {
            pageType = 'auth';
          } else if (pathname === '/') {
            pageType = 'landing';
          } else {
            pageType = 'minimal';
          }
        } else if (isCustomDomain) {
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
          
        }
        
      } catch (error) {
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
      <div className="flex items-center justify-center min-h-screen bg-background">
        <span className="sr-only">جار التحميل...</span>
        <div className="w-10 h-10 mx-auto border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return <>{children}</>;
};

export default EarlyDomainDetector;
