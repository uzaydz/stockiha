import React from 'react';

/**
 * مكون يضمن تنفيذ محتواه فقط في بيئة المتصفح بعد الـ hydration
 * يساعد على تجنب أخطاء عدم تطابق SSR وأخطاء useLayoutEffect
 */
function SafeHydrate({ children }: { children: React.ReactNode }) {
  return (
    <div suppressHydrationWarning>
      {typeof window === 'undefined' ? null : children}
    </div>
  );
}

export default SafeHydrate; 