import React, { memo } from 'react';
import { Package, Loader2, AlertCircle, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';

interface ShippingStatusDisplayProps {
  status: 'not-available' | 'loading' | 'error' | 'no-providers';
  errorMessage?: string;
  className?: string;
}

const ShippingStatusDisplay: React.FC<ShippingStatusDisplayProps> = ({
  status,
  errorMessage,
  className
}) => {
  const getStatusContent = () => {
    switch (status) {
      case 'not-available':
        return {
          icon: Package,
          text: 'لم يتم الشحن',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-600',
          borderColor: 'border-gray-200',
          tooltip: null
        };
      
      case 'loading':
        return {
          icon: Loader2,
          text: 'جاري التحميل...',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-600',
          borderColor: 'border-gray-200',
          tooltip: null,
          animated: true
        };
      
      case 'error':
        return {
          icon: AlertCircle,
          text: 'خطأ',
          bgColor: 'bg-red-100',
          textColor: 'text-red-600',
          borderColor: 'border-red-200',
          tooltip: errorMessage || 'خطأ في تحميل شركات التوصيل'
        };
      
      case 'no-providers':
        return {
          icon: AlertTriangle,
          text: 'غير متاح',
          bgColor: 'bg-amber-100',
          textColor: 'text-amber-600',
          borderColor: 'border-amber-200',
          tooltip: 'لا توجد شركات توصيل مفعلة'
        };
      
      default:
        return {
          icon: Package,
          text: 'غير محدد',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-600',
          borderColor: 'border-gray-200',
          tooltip: null
        };
    }
  };

  const statusContent = getStatusContent();
  const Icon = statusContent.icon;

  const badge = (
    <div 
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border",
        statusContent.bgColor,
        statusContent.textColor,
        statusContent.borderColor,
        className
      )}
      style={{ 
        contain: 'layout style',
        contentVisibility: 'auto'
      }}
    >
      <Icon 
        className={cn(
          "h-3.5 w-3.5",
          statusContent.animated && "animate-spin"
        )} 
      />
      <span>{statusContent.text}</span>
    </div>
  );

  if (statusContent.tooltip) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {badge}
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{statusContent.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {badge}
    </div>
  );
};

export default memo(ShippingStatusDisplay);
