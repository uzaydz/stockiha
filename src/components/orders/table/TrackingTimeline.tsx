/**
 * ============================================
 * TrackingTimeline Component
 * ============================================
 * عرض تسلسلي زمني لسجل تتبع الشحنة
 */

import { memo } from 'react';
import {
  Clock,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Truck,
  Package,
  PackageCheck,
  Undo2,
  XCircle,
  HelpCircle,
  PackagePlus,
  PackageSearch,
  ArrowRightLeft,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { YalidineDeliveryHistory } from '@/types/yalidineTracking';
import { TrackingStatus, TRACKING_STATUS_ICONS } from '@/types/yalidineTracking';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

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

interface TrackingTimelineProps {
  history: YalidineDeliveryHistory[];
}

// ============================================
// Main Component
// ============================================

const TrackingTimeline = memo(function TrackingTimeline({ history }: TrackingTimelineProps) {
  if (!history || history.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        لا توجد سجلات
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="relative">
        {/* الخط الرأسي الموصل */}
        <div className="absolute right-[17px] top-2 bottom-2 w-[2px] bg-border" />

        {/* قائمة الأحداث */}
        <div className="space-y-4">
          {history.map((event, index) => (
            <TimelineEvent
              key={event.id}
              event={event}
              isLatest={index === 0}
              isLast={index === history.length - 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

// ============================================
// Timeline Event Component
// ============================================

interface TimelineEventProps {
  event: YalidineDeliveryHistory;
  isLatest: boolean;
  isLast: boolean;
}

const TimelineEvent = memo(function TimelineEvent({
  event,
  isLatest,
  isLast,
}: TimelineEventProps) {
  const StatusIcon = getStatusIcon(event.status_normalized as TrackingStatus);

  // تحديد لون الأيقونة حسب الحالة
  const iconColor = getIconColor(event.status_normalized as TrackingStatus);

  return (
    <div className={cn('relative flex gap-4', isLatest && 'bg-muted/30 -mx-4 px-4 py-3 rounded-lg')}>
      {/* الأيقونة */}
      <div className="relative flex-shrink-0">
        <div
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-full border-2 bg-background',
            iconColor.border,
            isLatest && 'ring-2 ring-primary/20'
          )}
        >
          <StatusIcon className={cn('h-4 w-4', iconColor.text)} />
        </div>
      </div>

      {/* المحتوى */}
      <div className="flex-1 min-w-0 pt-0.5">
        {/* العنوان والوقت */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm leading-tight">
              {event.status_ar || event.status}
            </h4>

            {/* الموقع */}
            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">
                {event.center_name} - {event.wilaya_name}, {event.commune_name}
              </span>
            </div>
          </div>

          {/* التاريخ والوقت */}
          <div className="text-xs text-muted-foreground whitespace-nowrap">
            <div className="text-left" dir="ltr">
              {format(new Date(event.date_status), 'HH:mm', { locale: ar })}
            </div>
            <div className="text-left" dir="ltr">
              {format(new Date(event.date_status), 'dd/MM/yyyy', { locale: ar })}
            </div>
          </div>
        </div>

        {/* السبب (إن وجد) */}
        {event.reason && (
          <div className="mt-2 p-2 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                {event.reason}
              </p>
            </div>
          </div>
        )}

        {/* Badge للحالة الأخيرة */}
        {isLatest && (
          <Badge variant="outline" className="mt-2 text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            آخر حالة
          </Badge>
        )}
      </div>
    </div>
  );
});

// ============================================
// Helper Functions
// ============================================

/**
 * الحصول على ألوان الأيقونة حسب الحالة
 */
function getIconColor(status: TrackingStatus): {
  border: string;
  text: string;
  bg: string;
} {
  switch (status) {
    case TrackingStatus.DELIVERED:
      return {
        border: 'border-green-500',
        text: 'text-green-600',
        bg: 'bg-green-50',
      };

    case TrackingStatus.OUT_FOR_DELIVERY:
      return {
        border: 'border-blue-500',
        text: 'text-blue-600',
        bg: 'bg-blue-50',
      };

    case TrackingStatus.DELIVERY_FAILED:
      return {
        border: 'border-red-500',
        text: 'text-red-600',
        bg: 'bg-red-50',
      };

    case TrackingStatus.RETURNED:
      return {
        border: 'border-orange-500',
        text: 'text-orange-600',
        bg: 'bg-orange-50',
      };

    case TrackingStatus.ON_HOLD:
      return {
        border: 'border-purple-500',
        text: 'text-purple-600',
        bg: 'bg-purple-50',
      };

    case TrackingStatus.IN_TRANSIT:
      return {
        border: 'border-yellow-500',
        text: 'text-yellow-600',
        bg: 'bg-yellow-50',
      };

    case TrackingStatus.PICKED_UP:
    case TrackingStatus.RECEIVED:
      return {
        border: 'border-cyan-500',
        text: 'text-cyan-600',
        bg: 'bg-cyan-50',
      };

    case TrackingStatus.READY:
      return {
        border: 'border-indigo-500',
        text: 'text-indigo-600',
        bg: 'bg-indigo-50',
      };

    case TrackingStatus.CANCELLED:
      return {
        border: 'border-slate-500',
        text: 'text-slate-600',
        bg: 'bg-slate-50',
      };

    default:
      return {
        border: 'border-gray-400',
        text: 'text-gray-600',
        bg: 'bg-gray-50',
      };
  }
}

// ============================================
// Export
// ============================================

export default TrackingTimeline;
