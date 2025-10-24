import React from 'react';

interface ConditionalRouteProps {
  appId: string;
  children: React.ReactNode;
  fallbackPath?: string;
}

/**
 * مكون بسيط يعرض الأطفال مباشرةً لأن جميع التطبيقات متاحة دائماً.
 */
const ConditionalRoute: React.FC<ConditionalRouteProps> = ({
  children,
}) => {
  // كافة التطبيقات متاحة دائماً، لذلك نعرض المحتوى مباشرةً دون أي تحقق
  return <>{children}</>;
};

export default ConditionalRoute;
