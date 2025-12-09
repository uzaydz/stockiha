/**
 * ⚡ مكون عرض تفاصيل العمليات المعلقة المحسّن
 * @version 2.0.0
 */

import React, { useState } from 'react';
import { 
  Zap, 
  RefreshCw, 
  Send, 
  ChevronDown, 
  ChevronUp,
  Database,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';
import type { OutboxDetails, PowerSyncStatus, SyncError } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// 🔹 Props
// ═══════════════════════════════════════════════════════════════════════════════

interface OutboxDetailsPanelProps {
  outbox: OutboxDetails;
  powerSyncStatus: PowerSyncStatus;
  error: SyncError | null;
  isOnline: boolean;
  isSyncing: boolean;
  onSync: () => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔹 مكون التفاصيل
// ═══════════════════════════════════════════════════════════════════════════════

export function OutboxDetailsPanel({
  outbox,
  powerSyncStatus,
  error,
  isOnline,
  isSyncing,
  onSync
}: OutboxDetailsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { total = 0, byTable = {} } = outbox || {};
  const { connected = false, hasSynced = false, lastSyncedAt = null } = powerSyncStatus || {};

  // ⚡ تحديد حالة العرض
  const getStatusConfig = () => {
    if (error) {
      return {
        icon: AlertCircle,
        label: 'خطأ',
        color: 'text-red-500',
        bg: 'bg-red-500/10',
        border: 'border-red-500/20'
      };
    }
    if (!isOnline) {
      return {
        icon: Database,
        label: 'غير متصل',
        color: 'text-slate-500',
        bg: 'bg-slate-500/10',
        border: 'border-slate-500/20'
      };
    }
    if (isSyncing) {
      return {
        icon: RefreshCw,
        label: 'جارٍ المزامنة',
        color: 'text-blue-500',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20',
        animate: true
      };
    }
    if (total > 0) {
      return {
        icon: Clock,
        label: `${total} عملية معلقة`,
        color: 'text-amber-500',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20'
      };
    }
    if (connected && hasSynced) {
      return {
        icon: CheckCircle2,
        label: 'متزامن',
        color: 'text-emerald-500',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20'
      };
    }
    return {
      icon: Zap,
      label: 'PowerSync',
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20'
    };
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={cn(
      "rounded-xl border transition-all duration-200",
      config.bg,
      config.border
    )}>
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Icon className={cn(
            "h-4 w-4",
            config.color,
            (config as any).animate && 'animate-spin'
          )} />
          <span className={cn("text-sm font-medium", config.color)}>
            {config.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* زر المزامنة */}
          {total > 0 && isOnline && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onSync();
              }}
              disabled={isSyncing}
              className={cn(
                "h-7 px-2",
                "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-100"
              )}
            >
              {isSyncing ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </Button>
          )}

          {/* Badge العدد */}
          {total > 0 && (
            <Badge variant="secondary" className="h-5 text-xs">
              {total}
            </Badge>
          )}

          {/* السهم */}
          {(total > 0 || error) && (
            isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )
          )}
        </div>
      </div>

      {/* التفاصيل الموسعة */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-inherit">
          {/* رسالة الخطأ */}
          {error && (
            <div className="mt-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-xs font-medium text-red-600">{error.messageAr}</p>
              {error.details && (
                <p className="text-[10px] text-red-400 mt-1 font-mono truncate">
                  {error.details}
                </p>
              )}
            </div>
          )}

          {/* العمليات حسب الجدول */}
          {Object.keys(byTable).length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] text-muted-foreground mb-2">
                العمليات المعلقة حسب الجدول:
              </p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(byTable).map(([table, count]) => (
                  <Badge
                    key={table}
                    variant="outline"
                    className="text-[10px] h-5"
                  >
                    {getTableNameAr(table)}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* آخر مزامنة */}
          {lastSyncedAt && (
            <div className="mt-3 text-center">
              <p className="text-[10px] text-muted-foreground">
                آخر مزامنة: {new Date(lastSyncedAt).toLocaleString('ar-SA')}
              </p>
            </div>
          )}

          {/* حالة الاتصال */}
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-center gap-3 text-[10px]">
              <div className="flex items-center gap-1">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  connected ? 'bg-emerald-500' : 'bg-red-500'
                )} />
                <span className="text-muted-foreground">
                  {connected ? 'متصل' : 'غير متصل'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  hasSynced ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                )} />
                <span className="text-muted-foreground">
                  {hasSynced ? 'تم التزامن' : 'لم يتزامن'}
                </span>
              </div>
            </div>
            
            {/* تحذير إذا لم تكتمل المزامنة الأولى */}
            {connected && !hasSynced && (
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-[10px] text-amber-600 font-medium mb-1">
                  ⚠️ المزامنة الأولى لم تكتمل
                </p>
                <p className="text-[9px] text-muted-foreground">
                  تحقق من Sync Rules في PowerSync Dashboard
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔹 مساعدات
// ═══════════════════════════════════════════════════════════════════════════════

function getTableNameAr(table: string): string {
  const names: Record<string, string> = {
    products: 'المنتجات',
    customers: 'العملاء',
    orders: 'الطلبات',
    order_items: 'عناصر الطلبات',
    suppliers: 'الموردين',
    users: 'المستخدمين',
    organizations: 'المنظمات',
    product_categories: 'التصنيفات',
    product_subcategories: 'التصنيفات الفرعية',
    transactions: 'المعاملات',
    expenses: 'المصروفات',
    expense_categories: 'تصنيفات المصروفات',
    unknown: 'غير معروف'
  };
  return names[table] || table;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔹 مكون التشخيص
// ═══════════════════════════════════════════════════════════════════════════════

interface DiagnosticsPanelProps {
  onGetDiagnostics: () => Promise<any>;
}

export function DiagnosticsPanel({ onGetDiagnostics }: DiagnosticsPanelProps) {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLoad = async () => {
    setIsLoading(true);
    try {
      const data = await onGetDiagnostics();
      setDiagnostics(data);
      console.log('[Diagnostics] 🔍 Full diagnostics:', data);
    } catch (err) {
      console.error('[Diagnostics] Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/50 border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium">🔧 التشخيص</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleLoad}
          disabled={isLoading}
          className="h-6 text-xs"
        >
          {isLoading ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            'تحديث'
          )}
        </Button>
      </div>

      {diagnostics && (
        <div className="space-y-2 text-[10px]">
          <div className="p-2 rounded bg-white/50 dark:bg-black/20 space-y-1">
            <div className="flex items-center justify-between">
              <span>🔌 الاتصال:</span>
              <span className={diagnostics.connection?.isOnline ? 'text-emerald-500' : 'text-red-500'}>
                {diagnostics.connection?.isOnline ? '✅ متصل' : '❌ غير متصل'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>📡 PowerSync:</span>
              <span className={diagnostics.powersync?.isInitialized ? 'text-emerald-500' : 'text-red-500'}>
                {diagnostics.powersync?.isInitialized ? '✅ مهيأ' : '❌ غير مهيأ'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>💾 السجلات المحلية:</span>
              <span className="font-mono">{diagnostics.database?.totalRecords || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>🔐 المستخدم:</span>
              <span className="font-mono text-[9px]">{diagnostics.auth?.userId?.slice(0, 8) || 'غير معروف'}...</span>
            </div>
            <div className="flex items-center justify-between">
              <span>🏢 المنظمة:</span>
              <span className="font-mono text-[9px]">{diagnostics.auth?.organizationId?.slice(0, 8) || 'غير معروف'}...</span>
            </div>
            {diagnostics.connection?.lastConnectedAt && (
              <div className="flex items-center justify-between">
                <span>🕐 آخر اتصال:</span>
                <span className="text-[9px]">
                  {new Date(diagnostics.connection.lastConnectedAt).toLocaleTimeString('ar-SA')}
                </span>
              </div>
            )}
          </div>
          
          {/* تحذير إذا لم تكتمل المزامنة الأولى */}
          {diagnostics.powersync?.isInitialized && diagnostics.connection?.isOnline && diagnostics.database?.totalRecords === 0 && (
            <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
              <p className="text-[9px] text-amber-600 font-medium mb-1">
                ⚠️ المزامنة الأولى لم تكتمل
              </p>
              <p className="text-[8px] text-muted-foreground">
                تحقق من Sync Rules في PowerSync Dashboard
              </p>
            </div>
          )}
          
          {/* حالة Sync Rules */}
          {diagnostics.connection?.syncRulesDeployed !== undefined && (
            <div className={cn(
              "p-2 rounded border text-[9px]",
              diagnostics.connection.syncRulesDeployed
                ? "bg-emerald-500/10 border-emerald-500/20"
                : "bg-red-500/10 border-red-500/20"
            )}>
              <div className="flex items-center gap-1 mb-1">
                <span>{diagnostics.connection.syncRulesDeployed ? '✅' : '❌'}</span>
                <span className="font-medium">
                  Sync Rules: {diagnostics.connection.syncRulesDeployed ? 'منشورة' : 'غير منشورة'}
                </span>
              </div>
              {diagnostics.connection.syncRulesError && (
                <p className="text-[8px] text-muted-foreground mt-1">
                  {diagnostics.connection.syncRulesError}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
