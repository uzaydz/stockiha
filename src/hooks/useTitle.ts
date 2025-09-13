import { useEffect } from 'react';
import { canMutateHead } from '@/lib/headGuard';

export function useTitle(title: string) {
  useEffect(() => {
    // حفظ العنوان الأصلي لإعادته عند إزالة المكون
    const originalTitle = document.title;
    
    // تعيين العنوان الجديد (محكوم بالـ head guard)
    if (canMutateHead()) {
      document.title = `${title}`;
    }
    
    // إعادة العنوان الأصلي عند إزالة المكون
    return () => {
      if (canMutateHead()) {
        document.title = originalTitle;
      }
    };
  }, [title]);
}
