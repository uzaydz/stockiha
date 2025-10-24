import React from 'react';

interface OrganizationComponentsHeaderProps {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

const OrganizationComponentsHeader: React.FC<OrganizationComponentsHeaderProps> = ({
  isMobile,
  isTablet,
  isDesktop
}) => {
  return (
    <div className="mb-6 sm:mb-8">
      <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
        مكوّنات واجهة المؤسسة
      </h1>
      <p className="mt-2 text-sm text-muted-foreground sm:text-base">
        تحكم في المظهر والإعدادات مع إمكانية الحفظ في قاعدة البيانات. 
        التغييرات محلية وسريعة مع إشعارات فورية.
      </p>
    </div>
  );
};

export default React.memo(OrganizationComponentsHeader);
