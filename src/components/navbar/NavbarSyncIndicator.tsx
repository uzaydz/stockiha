/**
 * ⚡ NavbarSyncIndicator - مؤشر المزامنة في شريط العنوان
 * 
 * النسخة المحسنة:
 * - استعلام SQL واحد بدلاً من 12+ استعلام
 * - Polling ذكي (سريع عند وجود عناصر معلقة، بطيء عند التزامن)
 * - فحص مزدوج للاتصال (ConnectionState + navigator.onLine)
 * - مكونات منفصلة لتحسين الأداء
 * - حفظ lastSyncAt في localStorage
 */

import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Cloud, CloudOff, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useOrganization } from '@/hooks/useOrganization';

// ⚡ مكونات منفصلة
import { 
  useSyncStats, 
  useSyncActions, 
  SyncStatsGrid,
  SyncStatsGridExpanded,
  OutboxDetailsPanel 
} from './sync';

interface NavbarSyncIndicatorProps {
  className?: string;
}

// ⚡ فحص بيئة Tauri
function isTauriApp(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as any;
  return Boolean(w.__TAURI_IPC__ || w.__TAURI__ || w.__TAURI_INTERNALS__);
}

export function NavbarSyncIndicator({ className }: NavbarSyncIndicatorProps) {
  // ⚡ فحص البيئة مرة واحدة
  const isDesktopApp = useMemo(() => isTauriApp(), []);
  
  const { isOnline, connectionStatus } = useNetworkStatus();
  const { organization } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false); // ⚡ حالة عرض التفاصيل
  
  // ⚡ حالة navigator.onLine للفحص المزدوج
  const [navigatorOnline, setNavigatorOnline] = useState(() => 
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  
  // ⚡ الحالة الفعلية للاتصال
  const isActuallyOnline = useMemo(() => 
    isOnline && navigatorOnline, 
    [isOnline, navigatorOnline]
  );

  // ⚡ تتبع حالة navigator.onLine
  useEffect(() => {
    const handleOnline = () => setNavigatorOnline(true);
    const handleOffline = () => {
      setNavigatorOnline(false);
      console.log('[NavbarSync] 📴 navigator.onLine = false');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ⚡ Hook للإحصائيات
  const { 
    snapshot, 
    outboxDetails, 
    pendingOutbox, 
    refresh: refreshStats 
  } = useSyncStats({
    organizationId: organization?.id,
    isOnline: isActuallyOnline
  });

  // ⚡ Hook للإجراءات
  const {
    isSyncing,
    isFullSyncing,
    isForceSending,
    lastSyncAt,
    lastSyncError,
    runSync,
    runFullSync,
    forceSendPending,
    clearPendingOutbox
  } = useSyncActions({
    organizationId: organization?.id,
    isOnline: isActuallyOnline,
    onSyncComplete: refreshStats
  });

  // ⚡ مزامنة تلقائية عند عودة الاتصال
  useEffect(() => {
    if (isActuallyOnline && navigatorOnline) {
      void runSync('auto');
    }
  }, [isActuallyOnline, navigatorOnline, runSync]);

  // ⚡ حساب العناصر المعلقة
  const pendingCount = useMemo(() =>
    snapshot.products.unsynced +
    snapshot.orders.unsynced +
    snapshot.customers.unsynced +
    snapshot.invoices.unsynced +
    pendingOutbox,
    [snapshot, pendingOutbox]
  );

  // ⚡ تحديد حالة المزامنة
  const statusLabel = useMemo(() => {
    if (!isActuallyOnline) return 'غير متصل';
    if (connectionStatus === 'unstable') return 'اتصال غير مستقر';
    if (isSyncing || isFullSyncing) return 'جارٍ المزامنة...';
    if (pendingCount > 0) return `${pendingCount} بانتظار المزامنة`;
    return 'متزامن';
  }, [isActuallyOnline, connectionStatus, isSyncing, isFullSyncing, pendingCount]);

  const getStatusIcon = () => {
    if (!isActuallyOnline) return <CloudOff className="h-4 w-4" />;
    if (isSyncing || isFullSyncing) return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (lastSyncError) return <AlertCircle className="h-4 w-4" />;
    if (pendingCount > 0) return <Cloud className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  const getStatusColor = () => {
    if (!isActuallyOnline) return 'text-white/40';
    if (isSyncing || isFullSyncing) return 'text-blue-400';
    if (lastSyncError) return 'text-red-400';
    if (pendingCount > 0) return 'text-amber-400';
    return 'text-green-400';
  };

  // ⚡ إخفاء المكون في المتصفح
  if (!isDesktopApp) return null;
  if (!organization?.id) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "relative flex items-center justify-center h-8 w-8",
            "rounded-lg transition-all duration-200",
            "hover:bg-white/10 active:scale-95 active:bg-white/15",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
            getStatusColor(),
            className
          )}
          aria-label="حالة المزامنة"
          title={statusLabel}
        >
          <div className="relative z-10 transition-colors duration-200">
            {getStatusIcon()}
          </div>

          {/* Badge للعناصر المعلقة */}
          {pendingCount > 0 && !isSyncing && !isFullSyncing && (
            <span className="absolute top-1 right-1 h-2.5 w-2.5 flex items-center justify-center rounded-full bg-red-500 border border-slate-900 shadow-sm animate-pulse" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-sm">حالة المزامنة</h4>
              <p className="text-xs text-muted-foreground">{statusLabel}</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => runSync('manual')}
                disabled={isSyncing || isFullSyncing || !isActuallyOnline}
                className="h-8"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="h-3 w-3 ml-1 animate-spin" />
                    جارٍ...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 ml-1" />
                    مزامنة
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={runFullSync}
                disabled={isSyncing || isFullSyncing || !isActuallyOnline}
                className="h-8"
                title="إصلاح البيانات المحلية"
              >
                {isFullSyncing ? (
                  <>
                    <RotateCcw className="h-3 w-3 ml-1 animate-spin" />
                    جارٍ...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-3 w-3 ml-1" />
                    إصلاح
                  </>
                )}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Stats Grid */}
          {showDetails ? (
            <SyncStatsGridExpanded snapshot={snapshot} />
          ) : (
            <SyncStatsGrid snapshot={snapshot} />
          )}
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs h-6 text-muted-foreground hover:text-foreground"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'إخفاء التفاصيل' : 'عرض كل الإحصائيات'}
          </Button>

          <Separator />

          {/* Last Sync Info */}
          {lastSyncAt && (
            <div className="text-xs text-muted-foreground text-center">
              آخر مزامنة: {new Date(lastSyncAt).toLocaleTimeString('ar-SA')}
            </div>
          )}

          {/* Error Message */}
          {lastSyncError && (
            <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-xs text-destructive">{lastSyncError}</p>
            </div>
          )}

          {/* Delta Sync / Outbox Status */}
          <OutboxDetailsPanel
            pendingOutbox={pendingOutbox}
            outboxDetails={outboxDetails}
            isOnline={isActuallyOnline}
            isForceSending={isForceSending}
            onForceSend={forceSendPending}
            onClear={clearPendingOutbox}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
