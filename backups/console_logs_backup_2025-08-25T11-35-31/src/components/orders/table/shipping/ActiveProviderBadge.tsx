import React, { memo, useMemo, forwardRef } from 'react';
import { Package, CheckCircle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SHIPPING_PROVIDERS, getColorClass, ActiveProvider } from './ShippingProviderConstants';

interface ActiveProviderBadgeProps {
  activeProvider: ActiveProvider;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  showChevron?: boolean;
  title?: string;
}

const ActiveProviderBadge = forwardRef<HTMLButtonElement, ActiveProviderBadgeProps>(({
  activeProvider,
  className,
  onClick,
  showChevron = true,
  title
}, ref) => {
  const providerInfo = useMemo(() => 
    SHIPPING_PROVIDERS[activeProvider.code as keyof typeof SHIPPING_PROVIDERS], 
    [activeProvider.code]
  );
  
  const Icon = providerInfo?.icon || Package;
  const colorClass = useMemo(() => getColorClass(providerInfo?.color || 'gray'), [providerInfo?.color]);
  const displayName = providerInfo?.name || activeProvider.providerName || activeProvider.code;

  const defaultTitle = `شركة التوصيل: ${displayName} - رقم التتبع: ${activeProvider.trackingId}${showChevron ? ' - انقر لتغيير' : ''}`;

  return (
    <button 
      ref={ref}
      type="button"
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border transition-all duration-200",
        "cursor-pointer hover:shadow-md hover:scale-105 active:scale-95 hover:brightness-110",
        colorClass.bg,
        colorClass.text,
        colorClass.border,
        className
      )}
      onClick={onClick}
      title={title || defaultTitle}
      style={{ 
        contain: 'layout style',
        contentVisibility: 'auto',
        willChange: 'transform'
      }}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{displayName}</span>
      <CheckCircle className="h-3 w-3" />
      {showChevron && <ChevronDown className="h-3 w-3 opacity-60" />}
    </button>
  );
});

ActiveProviderBadge.displayName = 'ActiveProviderBadge';

export default memo(ActiveProviderBadge);
