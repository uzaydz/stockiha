/**
 * 🚀 مكون منع Layout Shift
 * يحل مشاكل Layout Shift Culprits ويحسن Core Web Vitals
 */

import React, { useEffect } from 'react';

interface LayoutShiftPreventionProps {
  children: React.ReactNode;
}

export const LayoutShiftPrevention: React.FC<LayoutShiftPreventionProps> = ({ children }) => {
  useEffect(() => {
    // إضافة أحجام ثابتة للصور لمنع Layout Shift
    const preventImageLayoutShift = () => {
      const images = document.querySelectorAll('img:not([width]):not([height])');
      images.forEach((img) => {
        const htmlImg = img as HTMLImageElement;
        
        // إضافة أحجام افتراضية إذا لم تكن موجودة
        if (!htmlImg.style.aspectRatio && !htmlImg.width && !htmlImg.height) {
          // تعيين aspect ratio افتراضي للصور
          htmlImg.style.aspectRatio = '1';
          htmlImg.style.objectFit = 'cover';
          htmlImg.style.width = '100%';
          htmlImg.style.height = 'auto';
        }
      });
    };

    // منع Layout Shift للخطوط
    const preventFontLayoutShift = () => {
      // إضافة font-display: swap للخطوط المحلية
      const style = document.createElement('style');
      style.textContent = `
        @font-face {
          font-family: 'TajawalOptimized';
          src: url('/fonts/tajawal-regular.woff2') format('woff2');
          font-display: swap;
          font-weight: 400;
        }
        @font-face {
          font-family: 'TajawalOptimized';
          src: url('/fonts/tajawal-medium.woff2') format('woff2');
          font-display: swap;
          font-weight: 500;
        }
        @font-face {
          font-family: 'TajawalOptimized';
          src: url('/fonts/tajawal-bold.woff2') format('woff2');
          font-display: swap;
          font-weight: 700;
        }
      `;
      document.head.appendChild(style);
    };

    // منع Layout Shift للمحتوى الديناميكي
    const preventContentLayoutShift = () => {
      // إضافة min-height للحاويات الديناميكية
      const containers = document.querySelectorAll('[data-dynamic-content]');
      containers.forEach((container) => {
        const htmlContainer = container as HTMLElement;
        if (!htmlContainer.style.minHeight) {
          htmlContainer.style.minHeight = '200px';
        }
      });
    };

    // تشغيل التحسينات
    preventImageLayoutShift();
    preventFontLayoutShift();
    preventContentLayoutShift();

    // مراقبة التغييرات في DOM — مع Throttle لتقليل إعادة الحساب
    let scheduled = false;
    const scheduleFix = () => {
      if (scheduled) return;
      scheduled = true;
      const cb = () => {
        try {
          preventImageLayoutShift();
          preventContentLayoutShift();
        } finally {
          scheduled = false;
        }
      };
      if (typeof (window as any).requestIdleCallback === 'function') {
        (window as any).requestIdleCallback(cb, { timeout: 300 });
      } else {
        requestAnimationFrame(cb);
      }
    };

    const observer = new MutationObserver(() => {
      scheduleFix();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // تنظيف المراقب عند إلغاء التحميل
    return () => {
      observer.disconnect();
    };
  }, []);

  return <>{children}</>;
};

/**
 * Hook لمنع Layout Shift في المكونات
 */
export const useLayoutShiftPrevention = () => {
  useEffect(() => {
    // إضافة CSS متغيرات لمنع Layout Shift
    const style = document.createElement('style');
    style.textContent = `
      /* منع Layout Shift للعناصر الحرجة */
      .layout-stable {
        contain: layout style;
      }
      
      .image-container {
        position: relative;
        overflow: hidden;
      }
      
      .image-container::before {
        content: '';
        display: block;
        padding-top: 100%; /* 1:1 aspect ratio */
      }
      
      .image-container img {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      
      /* منع Layout Shift للنصوص */
      .text-stable {
        min-height: 1.5em;
        line-height: 1.5;
      }
      
      /* منع Layout Shift للأزرار */
      .button-stable {
        min-height: 40px;
        min-width: 80px;
      }
      
      /* منع Layout Shift للجداول */
      .table-stable {
        table-layout: fixed;
        width: 100%;
      }
      
      .table-stable td {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);
};

export default LayoutShiftPrevention;
