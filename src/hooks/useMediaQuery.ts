import { useState, useEffect } from 'react';

/**
 * Hook للتحقق من استعلامات الميديا (media queries) مثل حجم الشاشة
 * @param query استعلام CSS للميديا مثل '(max-width: 768px)'
 * @returns قيمة بوليانية تشير إلى ما إذا كان الاستعلام مطابقاً أم لا
 */
export function useMediaQuery(query: string): boolean {
  // تهيئة الحالة الأولية بناءً على استعلام الميديا الحالي
  const getMatches = (): boolean => {
    // للتأكد من أننا في بيئة المتصفح
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  };

  const [matches, setMatches] = useState<boolean>(getMatches());

  useEffect(() => {
    // تحديث الحالة عند تغيير حجم النافذة
    const mediaQuery = window.matchMedia(query);
    const updateMatches = () => setMatches(mediaQuery.matches);
    
    // إضافة مستمع للتغييرات
    mediaQuery.addEventListener('change', updateMatches);
    
    // تنظيف المستمع عند إزالة المكون
    return () => {
      mediaQuery.removeEventListener('change', updateMatches);
    };
  }, [query]);

  return matches;
}
