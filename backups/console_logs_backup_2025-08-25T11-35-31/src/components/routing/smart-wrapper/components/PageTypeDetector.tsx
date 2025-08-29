/**
 * 🔍 Page Type Detector
 * كاشف نوع الصفحة المحسن للسرعة
 * مكون منفصل لتحسين الأداء وسهولة الصيانة
 */

import React, { memo, useEffect, useState, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import type { PageType } from '../types';

interface PageTypeDetectorProps {
  onPageTypeDetected: (pageType: PageType, isEarly: boolean) => void;
}

// Cache محسن لنوع الصفحة
const pageTypeCache = new Map<string, { pageType: PageType; timestamp: number }>();
const PAGE_TYPE_CACHE_DURATION = 30 * 60 * 1000; // 30 دقيقة

export const PageTypeDetector = memo<PageTypeDetectorProps>(({ onPageTypeDetected }) => {
  const location = useLocation();
  const [earlyPageType, setEarlyPageType] = useState<PageType | null>(null);
  const lastDetectionRef = useRef<{ hostname: string; pathname: string } | null>(null);
  const detectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // دالة مساعدة للحصول على نوع الصفحة من cache
  const getCachedPageType = useCallback((hostname: string, pathname: string): PageType | null => {
    const cacheKey = `${hostname}:${pathname}`;
    const cached = pageTypeCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < PAGE_TYPE_CACHE_DURATION) {
      return cached.pageType;
    }
    
    return null;
  }, []);

  // دالة مساعدة لحفظ نوع الصفحة في cache
  const cachePageType = useCallback((hostname: string, pathname: string, pageType: PageType) => {
    const cacheKey = `${hostname}:${pathname}`;
    pageTypeCache.set(cacheKey, { pageType, timestamp: Date.now() });
  }, []);

  // 🔥 الكشف المبكر لنوع الصفحة - محسن للسرعة
  const detectEarlyPageType = useCallback(() => {
    try {
      const hostname = window.location.hostname;
      const pathname = location.pathname;
      
      // فحص cache أولاً
      const cachedPageType = getCachedPageType(hostname, pathname);
      if (cachedPageType) {
        setEarlyPageType(cachedPageType);
        console.log('🚀 [PageTypeDetector] تم استخدام نوع الصفحة من Cache:', cachedPageType);
        
        // إخطار المكون الأب
        onPageTypeDetected(cachedPageType, true);
        return;
      }

      // فحص التكرار
      if (lastDetectionRef.current && 
          lastDetectionRef.current.hostname === hostname && 
          lastDetectionRef.current.pathname === pathname) {
        return;
      }

      // تحديث آخر فحص
      lastDetectionRef.current = { hostname, pathname };
      
      console.log('🔍 [PageTypeDetector] فحص النطاق:', { hostname, pathname });
      
      // فحص سريع للنطاقات العامة
      const isPublicDomain = ['ktobi.online', 'www.ktobi.online', 'stockiha.com', 'www.stockiha.com'].includes(hostname);
      const isLocalhost = hostname.includes('localhost');
      
      let detectedPageType: PageType | null = null;
      
      if (!isPublicDomain && !isLocalhost) {
        // نطاق مخصص أو subdomain
        if (pathname === '/') {
          detectedPageType = 'max-store';
        } else if (pathname.includes('/products/') || pathname.includes('/product/')) {
          detectedPageType = 'public-product';
        } else {
          detectedPageType = 'public-store';
        }
      } else if (isLocalhost && hostname.includes('.')) {
        // localhost مع subdomain
        const parts = hostname.split('.');
        if (parts.length > 1 && parts[0] !== 'localhost') {
          if (pathname === '/') {
            detectedPageType = 'max-store';
          } else if (pathname.includes('/products/') || pathname.includes('/product/')) {
            detectedPageType = 'public-product';
          } else {
            detectedPageType = 'public-store';
          }
        }
      } else if (hostname.includes('stockiha.com') && !isPublicDomain) {
        // subdomain من stockiha.com
        const parts = hostname.split('.');
        if (parts.length > 2 && parts[0] !== 'www') {
          if (pathname === '/') {
            detectedPageType = 'max-store';
          } else if (pathname.includes('/products/') || pathname.includes('/product/')) {
            detectedPageType = 'public-product';
          } else {
            detectedPageType = 'public-store';
          }
        }
      } else if (hostname.includes('ktobi.online') && !isPublicDomain) {
        // subdomain من ktobi.online
        const parts = hostname.split('.');
        if (parts.length > 2 && parts[0] !== 'www') {
          if (pathname === '/') {
            detectedPageType = 'max-store';
          } else if (pathname.includes('/products/') || pathname.includes('/product/')) {
            detectedPageType = 'public-product';
          } else {
            detectedPageType = 'public-store';
          }
        }
      }
      
      if (detectedPageType) {
        setEarlyPageType(detectedPageType);
        console.log('🚀 [PageTypeDetector] تم الكشف المبكر لنوع الصفحة:', detectedPageType);
        
        // حفظ في cache
        cachePageType(hostname, pathname, detectedPageType);
        
        // حفظ في sessionStorage للاستخدام السريع
        sessionStorage.setItem('bazaar_early_page_type', detectedPageType);
        sessionStorage.setItem('bazaar_early_hostname', hostname);
        
        // إخطار المكون الأب
        onPageTypeDetected(detectedPageType, true);
      }
    } catch (error) {
      console.warn('❌ [PageTypeDetector] خطأ في الكشف المبكر لنوع الصفحة:', error);
    }
  }, [location.pathname, onPageTypeDetected, getCachedPageType, cachePageType]);

  // تأثير لجلب نوع الصفحة مع debouncing
  useEffect(() => {
    // إلغاء الفحص السابق
    if (detectionTimeoutRef.current) {
      clearTimeout(detectionTimeoutRef.current);
    }

    // ✅ فحص فوري بدون تأخير لحل مشكلة التأخير
    detectEarlyPageType();

    return () => {
      if (detectionTimeoutRef.current) {
        clearTimeout(detectionTimeoutRef.current);
      }
    };
  }, [detectEarlyPageType]);

  // إرسال event للكشف عن نوع الصفحة
  useEffect(() => {
    if (earlyPageType) {
      const eventData = { 
        earlyPageType, 
        pathname: location.pathname,
        timestamp: Date.now()
      };
      
      window.dispatchEvent(new CustomEvent('bazaar:page-type-detected', {
        detail: eventData
      }));
      
      console.log('🚀 [PageTypeDetector] تم إرسال event page-type-detected:', eventData);
    }
  }, [earlyPageType, location.pathname]);

  // تنظيف cache دوري
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, value] of pageTypeCache.entries()) {
        if (now - value.timestamp > PAGE_TYPE_CACHE_DURATION) {
          pageTypeCache.delete(key);
        }
      }
    }, 20 * 60 * 1000); // زيادة من 10 دقائق إلى 20 دقيقة

    return () => clearInterval(cleanupInterval);
  }, []);

  // هذا المكون لا يعرض أي شيء، إنه فقط للكشف
  return null;
});

PageTypeDetector.displayName = 'PageTypeDetector';
