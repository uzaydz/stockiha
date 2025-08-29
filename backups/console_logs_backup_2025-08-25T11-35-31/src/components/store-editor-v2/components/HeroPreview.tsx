import React from 'react';
import HeroSection, { HeroSectionProps } from './HeroSection';
import { cn } from '@/lib/utils';

interface HeroPreviewProps extends Omit<HeroSectionProps, 'isPreview'> {
  className?: string;
}

const HeroPreview: React.FC<HeroPreviewProps> = ({ className, ...props }) => {
  return (
    <div className={cn("w-full", className)}>
      <HeroSection
        {...props}
        isPreview={true}
        className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
      />
    </div>
  );
};

export default HeroPreview;
