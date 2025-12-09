/**
 * ConnectionQualityIndicator.tsx
 *
 * مكون مؤشر جودة الاتصال بالإنترنت
 * يعرض حالة الاتصال والجودة مع Tooltip تفصيلي
 *
 * @version 1.0.0
 */

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Wifi,
  WifiOff,
  WifiLow,
  AlertTriangle,
  RefreshCw,
  Zap,
  Signal,
  SignalLow,
  SignalMedium,
  SignalHigh,
  Cloud,
  CloudOff,
} from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useNetworkQuality } from '@/hooks/useNetworkQuality';
import type { ConnectionQuality } from '@/lib/connectivity/ConnectivityTypes';

// ============================================================================
// Types
// ============================================================================

interface ConnectionQualityIndicatorProps {
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'badge' | 'full';
}

interface QualityConfig {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  label: string;
  labelAr: string;
}

// ============================================================================
// Quality Configuration
// ============================================================================

const QUALITY_CONFIG: Record<ConnectionQuality | 'offline', QualityConfig> = {
  excellent: {
    icon: SignalHigh,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    label: 'Excellent',
    labelAr: 'ممتاز',
  },
  good: {
    icon: SignalMedium,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    label: 'Good',
    labelAr: 'جيد',
  },
  fair: {
    icon: SignalLow,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    label: 'Fair',
    labelAr: 'متوسط',
  },
  poor: {
    icon: WifiLow,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    label: 'Poor',
    labelAr: 'ضعيف',
  },
  offline: {
    icon: WifiOff,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    label: 'Offline',
    labelAr: 'غير متصل',
  },
};

const SIZE_CONFIG = {
  sm: { icon: 'h-3.5 w-3.5', container: 'h-6 w-6', text: 'text-[10px]' },
  md: { icon: 'h-4 w-4', container: 'h-8 w-8', text: 'text-xs' },
  lg: { icon: 'h-5 w-5', container: 'h-10 w-10', text: 'text-sm' },
};

// ============================================================================
// Component
// ============================================================================

export function ConnectionQualityIndicator({
  className,
  showLabel = false,
  size = 'md',
  variant = 'icon',
}: ConnectionQualityIndicatorProps) {
  const {
    isOnline,
    quality,
    connectionStatus,
    averageLatency,
    effectiveType,
    isCaptivePortal,
    forceCheck,
  } = useNetworkStatus();

  const {
    downlink,
    rtt,
    isSlowConnection,
  } = useNetworkQuality();

  // Determine the display quality
  const displayQuality = useMemo(() => {
    if (!isOnline) return 'offline';
    return quality;
  }, [isOnline, quality]);

  const config = QUALITY_CONFIG[displayQuality];
  const sizeConfig = SIZE_CONFIG[size];
  const Icon = config.icon;

  // Connection status label
  const statusLabel = useMemo(() => {
    if (isCaptivePortal) return 'Captive Portal';
    if (connectionStatus === 'unstable') return 'غير مستقر';
    return config.labelAr;
  }, [connectionStatus, isCaptivePortal, config.labelAr]);

  // Tooltip content
  const tooltipContent = useMemo(() => {
    return (
      <div className="space-y-2 text-xs" dir="rtl">
        {/* Status header */}
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <div className={cn('p-1.5 rounded-lg', config.bgColor)}>
            <Icon className={cn('h-4 w-4', config.color)} />
          </div>
          <div>
            <div className="font-semibold text-foreground">{statusLabel}</div>
            <div className="text-muted-foreground text-[10px]">
              {isOnline ? 'متصل بالإنترنت' : 'غير متصل بالإنترنت'}
            </div>
          </div>
        </div>

        {/* Connection details */}
        {isOnline && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {effectiveType && (
              <>
                <span className="text-muted-foreground">نوع الشبكة:</span>
                <span className="font-mono font-medium text-foreground">
                  {effectiveType.toUpperCase()}
                </span>
              </>
            )}

            {averageLatency !== null && (
              <>
                <span className="text-muted-foreground">التأخير:</span>
                <span className={cn(
                  'font-mono font-medium',
                  averageLatency < 100 ? 'text-emerald-500' :
                  averageLatency < 300 ? 'text-amber-500' : 'text-red-500'
                )}>
                  {averageLatency}ms
                </span>
              </>
            )}

            {rtt !== null && (
              <>
                <span className="text-muted-foreground">RTT:</span>
                <span className="font-mono font-medium text-foreground">{rtt}ms</span>
              </>
            )}

            {downlink !== null && (
              <>
                <span className="text-muted-foreground">السرعة:</span>
                <span className="font-mono font-medium text-foreground">
                  {downlink >= 1 ? `${downlink} Mbps` : `${downlink * 1000} Kbps`}
                </span>
              </>
            )}
          </div>
        )}

        {/* Warnings */}
        {isCaptivePortal && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 text-amber-600">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="text-[10px]">
              يتطلب تسجيل الدخول (فندق/مطار)
            </span>
          </div>
        )}

        {isSlowConnection && !isCaptivePortal && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/10 text-orange-600">
            <WifiLow className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="text-[10px]">
              الاتصال بطيء - قد يؤثر على الأداء
            </span>
          </div>
        )}

        {/* Refresh button */}
        <button
          onClick={forceCheck}
          className="w-full flex items-center justify-center gap-2 p-2 mt-1 rounded-lg bg-muted hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          <span className="text-[10px]">فحص الاتصال</span>
        </button>
      </div>
    );
  }, [
    config,
    Icon,
    statusLabel,
    isOnline,
    effectiveType,
    averageLatency,
    rtt,
    downlink,
    isCaptivePortal,
    isSlowConnection,
    forceCheck,
  ]);

  // Render based on variant
  if (variant === 'badge') {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'inline-flex items-center gap-1.5 px-2 py-1 rounded-full border transition-colors',
                config.bgColor,
                'border-current/10',
                className
              )}
            >
              <Icon className={cn(sizeConfig.icon, config.color)} />
              {showLabel && (
                <span className={cn(sizeConfig.text, config.color, 'font-medium')}>
                  {statusLabel}
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="w-56 p-3">
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === 'full') {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors',
                'bg-card hover:bg-accent/50',
                'border-border',
                className
              )}
            >
              <div className={cn('p-1.5 rounded-md', config.bgColor)}>
                <Icon className={cn(sizeConfig.icon, config.color)} />
              </div>
              <div className="flex flex-col">
                <span className={cn('font-medium', sizeConfig.text, 'text-foreground')}>
                  {statusLabel}
                </span>
                {effectiveType && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {effectiveType.toUpperCase()}
                  </span>
                )}
              </div>
              {averageLatency !== null && (
                <span className={cn(
                  'ml-auto font-mono text-[10px] font-medium',
                  averageLatency < 100 ? 'text-emerald-500' :
                  averageLatency < 300 ? 'text-amber-500' : 'text-red-500'
                )}>
                  {averageLatency}ms
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="w-56 p-3">
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Default: icon variant
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <button
            className={cn(
              'relative flex items-center justify-center rounded-lg transition-all duration-200',
              'hover:bg-accent/50 active:scale-95',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              sizeConfig.container,
              className
            )}
            onClick={forceCheck}
            aria-label={`جودة الاتصال: ${statusLabel}`}
          >
            <Icon className={cn(sizeConfig.icon, config.color)} />

            {/* Pulse indicator for issues */}
            {(isCaptivePortal || connectionStatus === 'unstable' || displayQuality === 'poor') && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className={cn(
                  'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                  isCaptivePortal ? 'bg-amber-400' :
                  connectionStatus === 'unstable' ? 'bg-orange-400' : 'bg-red-400'
                )} />
                <span className={cn(
                  'relative inline-flex rounded-full h-2 w-2',
                  isCaptivePortal ? 'bg-amber-500' :
                  connectionStatus === 'unstable' ? 'bg-orange-500' : 'bg-red-500'
                )} />
              </span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="w-56 p-3">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// Simple Variants
// ============================================================================

/**
 * Simple online/offline indicator without quality details
 */
export function OnlineIndicator({
  className,
  size = 'md',
}: Pick<ConnectionQualityIndicatorProps, 'className' | 'size'>) {
  const { isOnline } = useNetworkStatus();
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full',
        sizeConfig.container,
        isOnline ? 'bg-emerald-500/10' : 'bg-red-500/10',
        className
      )}
    >
      {isOnline ? (
        <Wifi className={cn(sizeConfig.icon, 'text-emerald-500')} />
      ) : (
        <WifiOff className={cn(sizeConfig.icon, 'text-red-500')} />
      )}
    </div>
  );
}

/**
 * Minimal dot indicator for tight spaces
 */
export function ConnectionDot({
  className,
  pulse = true,
}: {
  className?: string;
  pulse?: boolean;
}) {
  const { isOnline, quality } = useNetworkStatus();

  const color = useMemo(() => {
    if (!isOnline) return 'bg-red-500';
    switch (quality) {
      case 'excellent':
        return 'bg-emerald-500';
      case 'good':
        return 'bg-blue-500';
      case 'fair':
        return 'bg-amber-500';
      case 'poor':
        return 'bg-orange-500';
      default:
        return 'bg-slate-500';
    }
  }, [isOnline, quality]);

  return (
    <span className={cn('relative flex h-2 w-2', className)}>
      {pulse && isOnline && (
        <span className={cn(
          'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
          color
        )} />
      )}
      <span className={cn('relative inline-flex rounded-full h-2 w-2', color)} />
    </span>
  );
}

export default ConnectionQualityIndicator;
