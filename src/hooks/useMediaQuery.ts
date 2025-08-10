import { useState, useEffect } from 'react';

/**
 * Hook مخصص للتحقق من media queries والاستجابة للتغييرات
 * @param query - CSS media query string
 * @returns boolean indicating if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    // التحقق من وجود window object (للتوافق مع SSR)
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia(query);
    
    // تعيين القيمة الأولية
    setMatches(mediaQuery.matches);

    // إنشاء listener للتغييرات
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // إضافة listener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', listener);
    } else {
      // للمتصفحات القديمة
      mediaQuery.addListener(listener);
    }

    // تنظيف عند unmount
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', listener);
      } else {
        // للمتصفحات القديمة
        mediaQuery.removeListener(listener);
      }
    };
  }, [query]);

  return matches;
}

/**
 * Hook مخصص للحصول على breakpoints شائعة
 */
export function useBreakpoints() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
  const isDesktop = useMediaQuery('(min-width: 1025px)');
  const isLargeDesktop = useMediaQuery('(min-width: 1440px)');

  return {
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
  };
}
