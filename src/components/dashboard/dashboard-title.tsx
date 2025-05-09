import React from 'react';
import { cn } from '@/lib/utils';

interface PageTitleProps {
  title: string;
  subtitle?: string;
  className?: string;
}

interface PageSubTitleProps {
  subtitle: string;
  className?: string;
}

/**
 * مكون عنوان الصفحة الرئيسي
 */
export const PageTitle: React.FC<PageTitleProps> = ({ title, subtitle, className }) => {
  return (
    <div className={cn("space-y-1", className)}>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {subtitle && (
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
};

/**
 * مكون العنوان الفرعي للصفحة
 */
export const PageSubTitle: React.FC<PageSubTitleProps> = ({ subtitle, className }) => {
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      {subtitle}
    </p>
  );
}; 