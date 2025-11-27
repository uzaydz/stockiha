/**
 * ============================================
 * TrackingStatusColumn Component
 * ============================================
 * عمود تتبع الشحنات في جدول الطلبات
 * مُحسّن للأداء مع Lazy Loading و Smart Caching
 */

import { useState, memo, Suspense, lazy } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  RefreshCw,
  Package,
  Clock,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Truck,
  PackageCheck,
  Undo2,
  XCircle,
  HelpCircle,
  PackagePlus,
  PackageSearch,
  ArrowRightLeft,
} from 'lucide-react';
import { useTrackingHistory } from '@/hooks/useTrackingHistory';
import {
  getStatusColor,
  TrackingStatus,
  TRACKING_STATUS_ICONS,
  needsAttention,
} from '@/types/yalidineTracking';
import type { YalidineDeliveryHistory } from '@/types/yalidineTracking';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// ============================================
// Lazy load للمكونات الثقيلة
// ============================================

const TrackingTimeline = lazy(() => import('./TrackingTimeline'));

// ============================================
// Icons Map
// ============================================

const ICON_COMPONENTS: Record<string, any> = {
  CheckCircle2,
  Truck,
  Package,
  AlertCircle,
  Undo2,
  Clock,
  PackageCheck,
  PackagePlus,
  PackageSearch,
  ArrowRightLeft,
  XCircle,
  HelpCircle,
};

function getStatusIcon(status: TrackingStatus) {
  const iconName = TRACKING_STATUS_ICONS[status];
  const IconComponent = ICON_COMPONENTS[iconName] || HelpCircle;
  return IconComponent;
}

// ============================================
// Props Interface
// ============================================

interface TrackingStatusColumnProps {
  orderId: string;
  trackingNumber: string | null;
  /** مزود الشحن (yalidine, zrexpress, ecotrack) */
  provider?: string;
  /** الحالة الحالية (اختياري) */
  currentStatus?: string;
  /** حجم Badge */
  size?: 'sm' | 'md' | 'lg';
}

// ============================================
// Main Component
// ============================================

export const TrackingStatusColumn = memo(function TrackingStatusColumn({
  orderId,
  trackingNumber,
  provider = 'yalidine',
  currentStatus,
  size = 'sm',
}: TrackingStatusColumnProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Hook للتتبع (lazy loading)
  const {
    history,
    latestEvent,
    hasHistory,
    isLoading,
    isRefreshing,
    isFinal,
    canRefresh,
    loadHistory,
    refresh,
  } = useTrackingHistory({
    orderId,
    trackingNumber,
    lazy: true, // تحميل فقط عند الطلب
    enableAutoRefresh: false, // لا نريد تحديث تلقائي في الجدول
  });

  // ============================================
  // Event Handlers
  // ============================================

  const handleOpen = (open: boolean) => {
    setIsOpen(open);

    // جلب البيانات من API عند فتح Popover لأول مرة
    if (open && !hasHistory && !isLoading) {
      refresh(); // استخدام refresh بدلاً من loadHistory لجلب من API
    }
  };

  const handleRefresh = () => {
    refresh();
  };

  // ============================================
  // Early Returns
  // ============================================

  // إذا لم يكن هناك رقم تتبع
  if (!trackingNumber) {
    return (
      <Badge
        variant="outline"
        className="text-muted-foreground border-dashed cursor-not-allowed"
      >
        <Package className="h-3 w-3 mr-1" />
        لا يوجد
      </Badge>
    );
  }

  // إذا كان المزود ليس ياليدين
  if (provider !== 'yalidine') {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <Package className="h-3 w-3 mr-1" />
        {provider}
      </Badge>
    );
  }

  // ============================================
  // Render Badge
  // ============================================

  const StatusIcon = latestEvent
    ? getStatusIcon(latestEvent.status_normalized as TrackingStatus)
    : Package;

  const statusColor = latestEvent
    ? getStatusColor(latestEvent.status_normalized || '')
    : 'bg-gray-100 text-gray-800 border-gray-300';

  const badgeText = latestEvent
    ? latestEvent.status_ar || latestEvent.status
    : 'تتبع';

  const showAttentionDot = latestEvent && needsAttention(latestEvent.status_normalized || '');

  return (
    <Popover open={isOpen} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto p-0 hover:bg-transparent"
          onClick={() => handleOpen(!isOpen)}
        >
          <Badge
            className={cn(
              statusColor,
              'cursor-pointer hover:opacity-80 transition-opacity relative',
              size === 'sm' && 'text-xs py-0.5 px-2',
              size === 'md' && 'text-sm py-1 px-2.5',
              size === 'lg' && 'text-base py-1.5 px-3'
            )}
          >
            <StatusIcon className={cn('mr-1', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
            {badgeText}

            {/* نقطة تنبيه للحالات التي تحتاج انتباه */}
            {showAttentionDot && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
            )}
          </Badge>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[420px] p-0" align="start" side="bottom">
        <TrackingPopoverContent
          trackingNumber={trackingNumber}
          history={history || []}
          latestEvent={latestEvent}
          isLoading={isLoading}
          isRefreshing={isRefreshing}
          isFinal={isFinal}
          canRefresh={canRefresh}
          onRefresh={handleRefresh}
          onLoadHistory={refresh}
        />
      </PopoverContent>
    </Popover>
  );
});

// ============================================
// Popover Content Component
// ============================================

interface TrackingPopoverContentProps {
  trackingNumber: string;
  history: YalidineDeliveryHistory[];
  latestEvent: YalidineDeliveryHistory | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isFinal: boolean;
  canRefresh: boolean;
  onRefresh: () => void;
  onLoadHistory: () => void;
}

const TrackingPopoverContent = memo(function TrackingPopoverContent({
  trackingNumber,
  history,
  latestEvent,
  isLoading,
  isRefreshing,
  isFinal,
  canRefresh,
  onRefresh,
  onLoadHistory,
}: TrackingPopoverContentProps) {
  return (
    <>
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between bg-muted/30">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm">سجل التتبع</h4>
          <p className="text-xs text-muted-foreground font-mono dir-ltr truncate">
            {trackingNumber}
          </p>
        </div>

        {/* أزرار الإجراءات */}
        <div className="flex items-center gap-2">
          {/* حالة نهائية */}
          {isFinal && (
            <Badge variant="outline" className="text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              مكتمل
            </Badge>
          )}

          {/* زر التحديث */}
          {canRefresh && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="h-8"
            >
              <RefreshCw
                className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')}
              />
            </Button>
          )}
        </div>
      </div>

      {/* محتوى السجل */}
      <div className="max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <LoadingState />
        ) : !history || history.length === 0 ? (
          <EmptyState onLoad={onLoadHistory} />
        ) : (
          <Suspense fallback={<LoadingState />}>
            <TrackingTimeline history={history} />
          </Suspense>
        )}
      </div>

      {/* Footer معلومات إضافية */}
      {latestEvent && (
        <div className="p-3 border-t bg-muted/20 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>آخر تحديث: {formatDistanceToNow(new Date(latestEvent.date_status), { addSuffix: true, locale: ar })}</span>
            {latestEvent.reason && (
              <Badge variant="outline" className="text-xs">
                <AlertCircle className="h-3 w-3 mr-1" />
                يوجد ملاحظة
              </Badge>
            )}
          </div>
        </div>
      )}
    </>
  );
});

// ============================================
// Loading State
// ============================================

function LoadingState() {
  return (
    <div className="p-6 text-center">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <p className="text-sm text-muted-foreground mt-2">جاري التحميل...</p>
    </div>
  );
}

// ============================================
// Empty State
// ============================================

function EmptyState({ onLoad }: { onLoad: () => void }) {
  return (
    <div className="p-8 text-center">
      <Package className="h-16 w-16 mx-auto text-muted-foreground/50 mb-3" />
      <p className="text-sm text-muted-foreground mb-3">
        لا توجد سجلات تتبع بعد
      </p>
      <Button size="sm" variant="outline" onClick={onLoad}>
        <RefreshCw className="h-3.5 w-3.5 mr-2" />
        جلب معلومات التتبع
      </Button>
    </div>
  );
}

// ============================================
// Export
// ============================================

export default TrackingStatusColumn;
