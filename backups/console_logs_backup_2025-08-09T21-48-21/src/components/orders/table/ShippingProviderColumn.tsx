import React, { memo } from 'react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Truck, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useShippingProviderLogic } from "./shipping/useShippingProviderLogic";
import { ShippingOrder, EnabledProvider } from "./shipping/ShippingProviderConstants";
import ActiveProviderBadge from "./shipping/ActiveProviderBadge";
import ProviderDropdownMenu from "./shipping/ProviderDropdownMenu";
import ProviderSelectionButton from "./shipping/ProviderSelectionButton";
import ShippingStatusDisplay from "./shipping/ShippingStatusDisplay";
import TestShippingDropdown from "./TestShippingDropdown";

// تم نقل دالة getColorClass إلى ShippingProviderConstants.ts

export interface ShippingProviderColumnProps {
  order: ShippingOrder;
  onSendToProvider?: (orderId: string, providerCode: string) => void;
  hasUpdatePermission?: boolean;
  className?: string;
  enabledProviders?: EnabledProvider[];
}

// تم نقل SHIPPING_PROVIDERS إلى ShippingProviderConstants.ts

export const ShippingProviderColumn: React.FC<ShippingProviderColumnProps> = ({ 
  order, 
  onSendToProvider,
  className,
  enabledProviders = []
}) => {
  const {
    activeProvider,
    canSendToShipping,
    showShippingOptions,
    isLoading,
    selectedProvider,
    uniqueProviders,
    handleSendToProvider
  } = useShippingProviderLogic({
    order,
    enabledProviders,
    onSendToProvider
  });

  // تشخيص للمساعدة في حل المشاكل
  if (process.env.NODE_ENV === 'development') {
    console.log('ShippingProviderColumn Debug:', {
      orderId: order.id,
      activeProvider,
      canSendToShipping,
      showShippingOptions,
      enabledProvidersCount: enabledProviders.length,
      uniqueProvidersCount: uniqueProviders.length,
    });
  }

  // إذا كان هناك مزود نشط، عرض معلوماته مع إمكانية التغيير
  if (activeProvider) {
    const { providerName, code, trackingId } = activeProvider;
    const displayName = providerName || code;

    return (
      <div className={cn("flex items-center gap-2", className)}>
        <DropdownMenu 
          onOpenChange={(open) => console.log('DropdownMenu activeProvider opened:', open)}
        >
          <DropdownMenuTrigger asChild>
            <button 
              type="button"
              className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border transition-all duration-200 cursor-pointer hover:shadow-md hover:scale-105 active:scale-95 hover:brightness-110 bg-green-100 text-green-800 border-green-300"
              title={`شركة التوصيل: ${displayName} - رقم التتبع: ${trackingId} - انقر لتغيير`}
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span>{displayName}</span>
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <svg className="h-3 w-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent 
            align="end" 
            side="bottom"
            className="w-64 rounded-lg border shadow-lg bg-background"
            sideOffset={4}
            avoidCollisions={true}
            style={{ zIndex: 9999 }}
          >
            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground px-2 py-1.5 flex items-center gap-2">
              <RefreshCw className="h-3.5 w-3.5" />
              تغيير شركة التوصيل
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <div className="px-2 py-1.5 text-xs text-muted-foreground bg-muted/50">
              الشركة الحالية: {displayName} ({trackingId})
            </div>
            <DropdownMenuSeparator />
            
            <ProviderDropdownMenu
              providers={uniqueProviders}
              onSelectProvider={handleSendToProvider}
              isLoading={isLoading}
              selectedProvider={selectedProvider}
              excludeProviderCode={activeProvider.code}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // إذا لم يكن بإمكان إرسال الطلب، عرض رسالة
  if (!canSendToShipping) {
    return <ShippingStatusDisplay status="not-available" className={className} />;
  }

  // إذا لم تكن هناك شركات مفعلة
  if (!enabledProviders.length) {
    return <ShippingStatusDisplay status="no-providers" className={className} />;
  }

  // عرض خيارات الشحن المتاحة
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <DropdownMenu 
        onOpenChange={(open) => console.log('DropdownMenu selection opened:', open)}
      >
        <DropdownMenuTrigger asChild>
          <button 
            type="button"
            className="h-7 px-2.5 py-0.5 text-xs hover:bg-accent transition-colors rounded-full border-dashed border flex items-center gap-1.5"
            disabled={isLoading}
          >
            {isLoading && selectedProvider ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent ml-1.5" />
                <span>جاري الإرسال...</span>
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span>اختر شركة التوصيل</span>
                <svg className="h-3 w-3 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </>
            )}
          </button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent 
          align="end" 
          side="bottom"
          className="w-56 rounded-lg border shadow-lg bg-background"
          sideOffset={4}
          avoidCollisions={true}
          style={{ zIndex: 9999 }}
        >
          <DropdownMenuLabel className="text-xs font-medium text-muted-foreground px-2 py-1.5 flex items-center gap-2">
            <Truck className="h-3.5 w-3.5" />
            شركات التوصيل المتاحة ({enabledProviders.length})
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <ProviderDropdownMenu
            providers={uniqueProviders}
            onSelectProvider={handleSendToProvider}
            isLoading={isLoading}
            selectedProvider={selectedProvider}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default memo(ShippingProviderColumn);
