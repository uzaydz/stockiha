import { useEffect } from 'react';

export function useTitle(title: string) {
  useEffect(() => {
    // حفظ العنوان الأصلي لإعادته عند إزالة المكون
    const originalTitle = document.title;
    
    // تعيين العنوان الجديد
    document.title = `${title} | نظام بازار`;
    
    // إعادة العنوان الأصلي عند إزالة المكون
    return () => {
      document.title = originalTitle;
    };
  }, [title]);
} 