import React from 'react';
import { cn } from '@/lib/utils';

interface ShimmerProps {
  className?: string;
  children?: React.ReactNode;
  isLoading?: boolean;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
}

const Shimmer: React.FC<ShimmerProps> = ({ 
  className, 
  children, 
  isLoading = false,
  rounded = 'lg'
}) => {
  if (!isLoading) {
    return <>{children}</>;
  }

  const roundedClasses = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md', 
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    '3xl': 'rounded-3xl',
    full: 'rounded-full'
  };

  return (
    <div 
      className={cn(
        'relative overflow-hidden bg-gray-200 dark:bg-gray-700',
        roundedClasses[rounded],
        className
      )}
    >
      {/* الطبقة المتحركة */}
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 dark:via-white/10 to-transparent"></div>
      
      {/* المحتوى المخفي أثناء التحميل */}
      <div className="opacity-0">
        {children}
      </div>
    </div>
  );
};

export default Shimmer;

// CSS Animation للـ shimmer - يجب إضافته للـ globals.css أو tailwind config
export const shimmerAnimation = `
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
  
  .animate-shimmer {
    animation: shimmer 2s infinite;
  }
`;
