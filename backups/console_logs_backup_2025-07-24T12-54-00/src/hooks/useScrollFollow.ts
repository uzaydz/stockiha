import { useState, useEffect, useRef, useCallback } from 'react';

interface UseScrollFollowProps {
  enabled?: boolean;
  offset?: number;
  stickyMode?: boolean; // جديد: وضع sticky دائم
}

interface ScrollFollowState {
  isFollowing: boolean;
  position: {
    top: number;
    left: number;
    width: number;
  };
}

export const useScrollFollow = ({ 
  enabled = true, 
  offset = 20,
  stickyMode = true // تفعيل الوضع sticky بشكل افتراضي
}: UseScrollFollowProps = {}) => {
  const [scrollState, setScrollState] = useState<ScrollFollowState>({
    isFollowing: false,
    position: { top: 0, left: 0, width: 0 }
  });
  
  const [isMobile, setIsMobile] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const originalPositionRef = useRef<DOMRect | null>(null);

  // كشف الأجهزة المحمولة
  useEffect(() => {
    const checkMobile = () => {
      const newIsMobile = window.innerWidth < 768;
      setIsMobile(newIsMobile);
      
      // إعادة تعيين عند تغيير نوع الجهاز
      if (newIsMobile) {
        setScrollState(prev => ({ ...prev, isFollowing: false }));
        setHasInitialized(false);
        originalPositionRef.current = null;
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // تهيئة الموضع الأصلي
  const initializePosition = useCallback(() => {
    if (!containerRef.current || isMobile || !enabled) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const scrollY = window.scrollY;
    
    originalPositionRef.current = {
      ...rect,
      top: rect.top + scrollY,
      left: rect.left,
      width: rect.width
    } as DOMRect;
    
    setHasInitialized(true);
  }, [isMobile, enabled]);

  // معالجة التمرير والتتبع (sticky mode)
  const handleScroll = useCallback(() => {
    if (!enabled || isMobile || !containerRef.current || !galleryRef.current || !hasInitialized) {
      return;
    }
    
    if (!originalPositionRef.current) {
      initializePosition();
      return;
    }
    
    const currentScrollY = window.scrollY;
    const windowHeight = window.innerHeight;
    const galleryRect = galleryRef.current.getBoundingClientRect();
    const originalTop = originalPositionRef.current.top;
    const originalLeft = originalPositionRef.current.left;
    const originalWidth = originalPositionRef.current.width;
    
    if (stickyMode) {
      // وضع sticky دائم - يتبع دائماً بمجرد الوصول للموضع
      const currentTop = originalTop - currentScrollY;
      
      if (currentTop <= offset) {
        // بدء التتبع الفوري
        const galleryHeight = galleryRect.height || 400;
        const maxTop = windowHeight - galleryHeight - offset;
        const idealTop = Math.min(offset, maxTop);
        
        // حساب الموضع الأفقي بناءً على الموضع الأصلي
        const viewportWidth = window.innerWidth;
        const containerLeft = Math.max(originalLeft, offset);
        const maxWidth = viewportWidth - (offset * 2);
        const finalWidth = Math.min(originalWidth, maxWidth);
        
        // التأكد من أن المعرض لا يخرج من الشاشة
        const finalLeft = Math.min(containerLeft, viewportWidth - finalWidth - offset);
        
        const newPosition = {
          top: Math.max(idealTop, 10),
          left: Math.max(finalLeft, offset),
          width: finalWidth
        };
        
        if (!scrollState.isFollowing || 
            Math.abs(scrollState.position.top - newPosition.top) > 2 ||
            Math.abs(scrollState.position.left - newPosition.left) > 2 ||
            Math.abs(scrollState.position.width - newPosition.width) > 5) {
          
          setScrollState({
            isFollowing: true,
            position: newPosition
          });
        }
      } else {
        // لا يزال فوق نقطة التفعيل
        if (scrollState.isFollowing) {
          setScrollState(prev => ({ ...prev, isFollowing: false }));
        }
      }
    }
  }, [enabled, isMobile, hasInitialized, offset, stickyMode, scrollState.isFollowing, scrollState.position, initializePosition]);

  // معالجة تغيير حجم الشاشة
  const handleResize = useCallback(() => {
    if (isMobile) return;
    
    // إعادة تهيئة الموضع الأصلي
    setHasInitialized(false);
    originalPositionRef.current = null;
    
    // إعادة التهيئة بعد قليل
    setTimeout(() => {
      initializePosition();
      setTimeout(handleScroll, 50);
    }, 100);
  }, [isMobile, initializePosition, handleScroll]);

  // ربط مستمعي الأحداث
  useEffect(() => {
    if (!enabled || isMobile) {
      // إعادة تعيين الحالة إذا تم تعطيل الميزة أو كان الجهاز محمول
      if (scrollState.isFollowing) {
        setScrollState(prev => ({ ...prev, isFollowing: false }));
      }
      setHasInitialized(false);
      return;
    }

    // تهيئة فورية
    if (!hasInitialized) {
      const timeoutId = setTimeout(initializePosition, 100);
      return () => clearTimeout(timeoutId);
    }

    // استخدام requestAnimationFrame لتحسين الأداء
    let ticking = false;
    const optimizedScrollHandler = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', optimizedScrollHandler, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    
    // تشغيل فوري للتحقق من الحالة الحالية
    const timeoutId = setTimeout(handleScroll, 150);
    
    return () => {
      window.removeEventListener('scroll', optimizedScrollHandler);
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [enabled, isMobile, hasInitialized, handleScroll, handleResize, scrollState.isFollowing, initializePosition]);

  // إعادة تعيين عند تعطيل الميزة
  useEffect(() => {
    if (!enabled) {
      setScrollState(prev => ({ ...prev, isFollowing: false }));
      setHasInitialized(false);
      originalPositionRef.current = null;
    }
  }, [enabled]);

  // وظيفة لإعادة تعيين التتبع يدوياً
  const resetFollow = useCallback(() => {
    originalPositionRef.current = null;
    setHasInitialized(false);
    setScrollState(prev => ({ ...prev, isFollowing: false }));
  }, []);

  // وظيفة للحصول على معلومات التتبع للتطوير
  const getDebugInfo = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      return {
        enabled,
        isMobile,
        stickyMode,
        hasInitialized,
        isFollowing: scrollState.isFollowing,
        position: scrollState.position,
        originalPosition: originalPositionRef.current,
        currentScrollY: window.scrollY
      };
    }
    return null;
  }, [enabled, isMobile, stickyMode, hasInitialized, scrollState]);

  return {
    ...scrollState,
    containerRef,
    galleryRef,
    isMobile,
    resetFollow,
    getDebugInfo
  };
}; 