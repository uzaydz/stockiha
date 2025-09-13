/**
 * SafeHydrate - مكون يضمن تنفيذ محتواه فقط في بيئة المتصفح بعد الـ hydration
 * يمنع مشاكل الـ hydration mismatch ويحل مشكلة الصفحة البيضاء
 */

import React, { useState, useEffect } from 'react';

interface SafeHydrateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const SafeHydrate: React.FC<SafeHydrateProps> = ({ 
  children, 
  fallback = <div className="min-h-screen bg-background flex items-center justify-center p-4"><div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" /></div>
}) => {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // تأكد من أننا في المتصفح وليس في الخادم
    if (typeof window !== 'undefined') {
      // تأخير قصير لضمان اكتمال الـ hydration
      const timer = setTimeout(() => {
        setIsHydrated(true);
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, []);

  // إذا لم يتم الـ hydration بعد، اعرض fallback
  if (!isHydrated) {
    return <>{fallback}</>;
  }

  // بعد الـ hydration، اعرض المحتوى الحقيقي
  return <div suppressHydrationWarning>{children}</div>;
};

export default SafeHydrate;
