import React, { memo, useMemo } from 'react';
import { Badge } from "@/components/ui/badge";
import { Package, Loader2 } from 'lucide-react';
import { 
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { SHIPPING_PROVIDERS, getColorClass, EnabledProvider } from './ShippingProviderConstants';

interface ProviderDropdownMenuProps {
  providers: EnabledProvider[];
  onSelectProvider: (providerCode: string) => void;
  isLoading: boolean;
  selectedProvider: string | null;
  excludeProviderCode?: string;
}

const ProviderDropdownMenu: React.FC<ProviderDropdownMenuProps> = ({
  providers,
  onSelectProvider,
  isLoading,
  selectedProvider,
  excludeProviderCode
}) => {
  const filteredProviders = useMemo(() => {
    return excludeProviderCode 
      ? providers.filter(p => p.provider_code !== excludeProviderCode)
      : providers;
  }, [providers, excludeProviderCode]);

  const menuItems = useMemo(() => {
    // تشخيص
    if (process.env.NODE_ENV === 'development') {
      console.log('ProviderDropdownMenu Debug:', {
        providersCount: providers.length,
        filteredProvidersCount: filteredProviders.length,
        excludeProviderCode,
        isLoading,
        selectedProvider
      });
    }

    return filteredProviders.map((provider) => {
      const providerInfo = SHIPPING_PROVIDERS[provider.provider_code as keyof typeof SHIPPING_PROVIDERS];
      const Icon = providerInfo?.icon || Package;
      const isCurrentlyLoading = isLoading && selectedProvider === provider.provider_code;
      
      return (
        <DropdownMenuItem
          key={provider.provider_code}
          onClick={() => {
            console.log('Provider clicked:', provider.provider_code);
            onSelectProvider(provider.provider_code);
          }}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent transition-colors"
          style={{ 
            contain: 'layout style',
            contentVisibility: 'auto',
            willChange: isCurrentlyLoading ? 'contents' : 'auto'
          }}
        >
          {isCurrentlyLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          ) : (
            <Icon className={cn(
              "h-4 w-4",
              getColorClass(providerInfo?.color || 'gray').icon
            )} />
          )}
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{providerInfo?.name || provider.provider_name}</span>
              {provider.auto_shipping && (
                <Badge variant="secondary" className="text-xs px-1 py-0">
                  تلقائي
                </Badge>
              )}
            </div>
            {providerInfo?.nameEn && (
              <div className="text-xs text-muted-foreground">
                {providerInfo.nameEn}
              </div>
            )}
          </div>
          
          {isCurrentlyLoading && (
            <span className="text-xs text-blue-600">
              {excludeProviderCode ? 'جاري التحويل...' : 'جاري الإرسال...'}
            </span>
          )}
        </DropdownMenuItem>
      );
    });
  }, [filteredProviders, isLoading, selectedProvider, onSelectProvider, excludeProviderCode]);

  if (filteredProviders.length === 0) {
    return (
      <div className="px-3 py-2 text-xs text-muted-foreground text-center">
        {excludeProviderCode ? 'لا توجد شركات أخرى متاحة' : 'لا توجد شركات متاحة'}
      </div>
    );
  }

  return <>{menuItems}</>;
};

export default memo(ProviderDropdownMenu);
