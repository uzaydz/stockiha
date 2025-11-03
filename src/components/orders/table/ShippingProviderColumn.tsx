import React, { memo } from 'react';
import { Truck, RefreshCw } from "lucide-react";
import './ShippingProviderColumn.css';
import { cn } from "@/lib/utils";
import { useShippingProviderLogic } from "./shipping/useShippingProviderLogic";
import { ShippingOrder, EnabledProvider } from "./shipping/ShippingProviderConstants";
import ActiveProviderBadge from "./shipping/ActiveProviderBadge";
import ProviderDropdownMenu from "./shipping/ProviderDropdownMenu";
import ProviderSelectionButton from "./shipping/ProviderSelectionButton";
import ShippingStatusDisplay from "./shipping/ShippingStatusDisplay";

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
      orderStatus: order.status,
      canSendToShipping,
      enabledProvidersCount: enabledProviders.length,
      enabledProviders: enabledProviders.map(p => p.provider_code),
      activeProvider,
      uniqueProvidersCount: uniqueProviders.length
    });
  }

  // إذا كان هناك مزود نشط، عرض معلوماته مع إمكانية التغيير
  if (activeProvider) {
    const { providerName, code, trackingId } = activeProvider;
    const displayName = providerName || code;

    return (
      <div className={cn("shipping-provider-column flex items-center gap-2", className)}>
        <div className="relative inline-block">
          <select
            value={code}
            onChange={(e) => handleSendToProvider(e.target.value)}
            disabled={isLoading}
            className="h-8 px-3 py-1 pr-8 text-xs font-medium border rounded-full bg-green-100 text-green-800 border-green-300 cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform-gpu hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200"
            style={{
              contain: 'paint',
              willChange: 'auto',
              backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 8px center',
              backgroundSize: '12px'
            }}
            title={`شركة التوصيل: ${displayName} - رقم التتبع: ${trackingId} - انقر لتغيير`}
          >
            <option value={code} disabled>
              {displayName}
            </option>
            {uniqueProviders
              .filter(provider => provider.provider_code !== code)
              .map((provider) => (
                <option
                  key={provider.provider_code}
                  value={provider.provider_code}
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#374151'
                  }}
                >
                  {provider.provider_name}
                </option>
              ))
            }
          </select>
        </div>
        <div className="flex items-center gap-1">
          <svg className="h-3.5 w-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-xs text-green-600 font-medium">{trackingId}</span>
        </div>
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
    <div className={cn("shipping-provider-column flex items-center gap-2", className)}>
      <div className="relative inline-block">
        <select
          value={selectedProvider || ''}
          onChange={(e) => handleSendToProvider(e.target.value)}
          disabled={isLoading}
          className="h-7 px-3 py-1 pr-8 text-xs border-dashed border rounded-full bg-transparent cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform-gpu hover:bg-accent transition-colors"
          style={{
            contain: 'paint',
            willChange: 'auto',
            backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 8px center',
            backgroundSize: '12px'
          }}
        >
          <option value="" disabled>اختر شركة التوصيل</option>
          {uniqueProviders.map((provider) => (
            <option
              key={provider.provider_code}
              value={provider.provider_code}
              style={{
                backgroundColor: '#ffffff',
                color: '#374151'
              }}
            >
              {provider.provider_name}
            </option>
          ))}
        </select>
      </div>
      {isLoading && selectedProvider && (
        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      )}
    </div>
  );
};

export default memo(ShippingProviderColumn);
