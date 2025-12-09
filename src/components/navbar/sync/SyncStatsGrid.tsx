/**
 * ⚡ مكون عرض إحصائيات المزامنة المحسّن
 * @version 3.0.0
 *
 * المميزات:
 * - تصميم حديث وجذاب
 * - عرض جميع الجداول (30 جدول)
 * - تصنيف الجداول حسب الفئات
 * - دعم التمرير للجداول الكثيرة
 * - اكتشاف الأخطاء والمشاكل
 */

import React, { useState, useMemo } from 'react';
import {
  Check,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Database,
  Package,
  Users,
  ShoppingCart,
  FileText,
  Settings,
  AlertCircle,
  XCircle,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { SyncSnapshot, TableStats, PowerSyncStatus } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// 🔹 تصنيفات الجداول
// ═══════════════════════════════════════════════════════════════════════════════

const TABLE_CATEGORIES = {
  products: {
    label: 'المنتجات',
    labelEn: 'Products',
    icon: Package,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    tables: ['products', 'productCategories', 'productSubcategories', 'productColors', 'productSizes', 'productImages', 'productWholesaleTiers']
  },
  inventory: {
    label: 'المخزون',
    labelEn: 'Inventory',
    icon: Database,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    tables: ['inventoryBatches', 'productSerialNumbers']
  },
  orders: {
    label: 'الطلبات',
    labelEn: 'Orders',
    icon: ShoppingCart,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    tables: ['orders', 'orderItems']
  },
  business: {
    label: 'العملاء والموردين',
    labelEn: 'Customers & Suppliers',
    icon: Users,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    tables: ['customers', 'suppliers']
  },
  invoices: {
    label: 'الفواتير',
    labelEn: 'Invoices',
    icon: FileText,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    tables: ['invoices', 'invoiceItems']
  },
  losses: {
    label: 'الخسائر',
    labelEn: 'Losses',
    icon: AlertTriangle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    tables: ['losses', 'lossItems']
  },
  returns: {
    label: 'المرتجعات',
    labelEn: 'Returns',
    icon: Package,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    tables: ['returns', 'returnItems']
  },
  repairs: {
    label: 'الإصلاحات',
    labelEn: 'Repairs',
    icon: Settings,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
    tables: ['repairOrders', 'repairLocations']
  },
  staff: {
    label: 'الموظفين',
    labelEn: 'Staff',
    icon: Users,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    tables: ['posStaffSessions', 'staffWorkSessions']
  },
  expenses: {
    label: 'المصروفات',
    labelEn: 'Expenses',
    icon: FileText,
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
    tables: ['expenses', 'expenseCategories']
  },
  subscriptions: {
    label: 'الاشتراكات',
    labelEn: 'Subscriptions',
    icon: FileText,
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
    tables: ['subscriptionTransactions', 'subscriptions']
  },
  system: {
    label: 'النظام',
    labelEn: 'System',
    icon: Settings,
    color: 'text-slate-500',
    bgColor: 'bg-slate-500/10',
    tables: ['users', 'organizations', 'posSettings', 'subscriptionPlans']
  }
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// 🔹 مكون عنصر الإحصائية
// ═══════════════════════════════════════════════════════════════════════════════

interface StatItemProps {
  stats: TableStats;
  compact?: boolean;
  hasError?: boolean;
  errorMessage?: string;
}

function StatItem({ stats, compact = false, hasError = false, errorMessage }: StatItemProps) {
  const { nameAr, icon, local, pending, synced } = stats;

  // ⚡ تحديد اللون بناءً على الحالة
  const getStatusColor = () => {
    if (hasError) return 'bg-red-500/10 border-red-500/30 text-red-600';
    if (pending > 0) return 'bg-amber-500/10 border-amber-500/30 text-amber-600';
    if (local > 0) return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600';
    return 'bg-slate-500/10 border-slate-500/20 text-slate-500';
  };

  const getStatusIcon = () => {
    if (hasError) return <XCircle className="h-3 w-3 text-red-500" />;
    if (pending > 0) return <Clock className="h-3 w-3 text-amber-500" />;
    if (local > 0) return <Check className="h-3 w-3 text-emerald-500" />;
    return null;
  };

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center justify-between px-2 py-1.5 rounded-md border transition-colors",
          getStatusColor()
        )}
        title={hasError ? errorMessage : undefined}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{icon}</span>
          <span className="text-xs font-medium truncate max-w-[100px]">{nameAr}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm font-bold">{local}</span>
          {pending > 0 && (
            <span className="text-[10px] text-amber-600 bg-amber-100 px-1 rounded">
              +{pending}
            </span>
          )}
          {hasError && (
            <XCircle className="h-3 w-3 text-red-500" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "relative p-3 rounded-xl border transition-all duration-200",
      "hover:shadow-md hover:scale-[1.02]",
      getStatusColor()
    )}>
      {/* Badge الحالة */}
      <div className="absolute -top-1 -right-1">
        {getStatusIcon()}
      </div>

      {/* الأيقونة والاسم */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs font-medium truncate">{nameAr}</span>
      </div>

      {/* الأرقام */}
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold">{local}</span>
        {pending > 0 && (
          <span className="text-xs text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">
            {pending} معلق
          </span>
        )}
      </div>

      {/* رسالة الخطأ */}
      {hasError && errorMessage && (
        <p className="mt-2 text-[10px] text-red-500 truncate" title={errorMessage}>
          {errorMessage}
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔹 مكون فئة الجداول القابلة للطي
// ═══════════════════════════════════════════════════════════════════════════════

interface TableCategoryProps {
  categoryKey: string;
  category: typeof TABLE_CATEGORIES[keyof typeof TABLE_CATEGORIES];
  snapshot: SyncSnapshot;
  tableErrors?: Record<string, string>;
  defaultExpanded?: boolean;
}

function TableCategory({ categoryKey, category, snapshot, tableErrors = {}, defaultExpanded = false }: TableCategoryProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const Icon = category.icon;

  // حساب إجمالي السجلات والأخطاء في الفئة
  const categoryStats = useMemo(() => {
    let total = 0;
    let pending = 0;
    let errors = 0;
    let hasData = false;

    category.tables.forEach(tableKey => {
      const stats = snapshot?.[tableKey as keyof SyncSnapshot];
      if (stats && typeof stats === 'object' && 'local' in stats) {
        total += (stats as TableStats).local || 0;
        pending += (stats as TableStats).pending || 0;
        if ((stats as TableStats).local > 0) hasData = true;
      }
      if (tableErrors[tableKey]) errors++;
    });

    return { total, pending, errors, hasData };
  }, [category.tables, snapshot, tableErrors]);

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header قابل للنقر */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center justify-between p-2 transition-colors",
          "hover:bg-accent/50",
          category.bgColor
        )}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <Icon className={cn("h-4 w-4", category.color)} />
          <span className="text-sm font-medium">{category.label}</span>
          <Badge variant="secondary" className="text-[10px] h-4">
            {category.tables.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {categoryStats.errors > 0 && (
            <Badge variant="destructive" className="text-[10px] h-4">
              {categoryStats.errors} خطأ
            </Badge>
          )}
          {categoryStats.pending > 0 && (
            <Badge className="bg-amber-500 text-[10px] h-4">
              {categoryStats.pending} معلق
            </Badge>
          )}
          <span className="text-sm font-bold">{categoryStats.total}</span>
        </div>
      </button>

      {/* المحتوى */}
      {isExpanded && (
        <div className="p-2 space-y-1 bg-background/50">
          {category.tables.map(tableKey => {
            const stats = snapshot?.[tableKey as keyof SyncSnapshot];
            if (!stats || typeof stats !== 'object' || !('local' in stats)) {
              return (
                <div key={tableKey} className="px-2 py-1.5 text-xs text-muted-foreground">
                  {tableKey}: جارٍ التحميل...
                </div>
              );
            }
            return (
              <StatItem
                key={tableKey}
                stats={stats as TableStats}
                compact
                hasError={!!tableErrors[tableKey]}
                errorMessage={tableErrors[tableKey]}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔹 مكون الشبكة الرئيسي
// ═══════════════════════════════════════════════════════════════════════════════

interface SyncStatsGridProps {
  snapshot: SyncSnapshot;
  showAll?: boolean;
}

export function SyncStatsGrid({ snapshot, showAll = false }: SyncStatsGridProps) {
  // الجداول الرئيسية للعرض المختصر
  const mainTables: (keyof SyncSnapshot)[] = [
    'products', 'customers', 'orders', 'suppliers'
  ];

  const tablesToShow = mainTables;

  return (
    <div className="grid grid-cols-2 gap-2">
      {tablesToShow.map((key) => {
        const stats = snapshot?.[key];
        if (!stats || typeof stats !== 'object' || !('local' in stats)) {
          return (
            <div key={key} className="p-3 rounded-xl border border-dashed border-muted opacity-50">
              <div className="text-xs text-muted-foreground">جارٍ التحميل...</div>
            </div>
          );
        }
        return (
          <StatItem
            key={key}
            stats={stats as TableStats}
            compact={!showAll}
          />
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔹 مكون العرض الموسع بالفئات
// ═══════════════════════════════════════════════════════════════════════════════

interface SyncStatsGridExpandedProps {
  snapshot: SyncSnapshot;
  tableErrors?: Record<string, string>;
  searchQuery?: string;
}

export function SyncStatsGridExpanded({ snapshot, tableErrors = {}, searchQuery = '' }: SyncStatsGridExpandedProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // تصفية الفئات حسب البحث
  const filteredCategories = useMemo(() => {
    if (!localSearch) return Object.entries(TABLE_CATEGORIES);

    return Object.entries(TABLE_CATEGORIES).filter(([key, category]) => {
      // البحث في اسم الفئة
      if (category.label.includes(localSearch) || category.labelEn.toLowerCase().includes(localSearch.toLowerCase())) {
        return true;
      }
      // البحث في أسماء الجداول
      return category.tables.some(tableKey => {
        const stats = snapshot?.[tableKey as keyof SyncSnapshot];
        if (stats && typeof stats === 'object' && 'nameAr' in stats) {
          return (stats as TableStats).nameAr.includes(localSearch) || tableKey.toLowerCase().includes(localSearch.toLowerCase());
        }
        return tableKey.toLowerCase().includes(localSearch.toLowerCase());
      });
    });
  }, [localSearch, snapshot]);

  return (
    <div className="space-y-3">
      {/* شريط البحث */}
      <div className="relative">
        <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="البحث في الجداول..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="h-8 pr-8 text-xs"
        />
      </div>

      {/* الفئات */}
      <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
        {filteredCategories.map(([key, category]) => (
          <TableCategory
            key={key}
            categoryKey={key}
            category={category}
            snapshot={snapshot}
            tableErrors={tableErrors}
            defaultExpanded={filteredCategories.length <= 3}
          />
        ))}

        {filteredCategories.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">لا توجد نتائج للبحث</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔹 مكون ملخص المزامنة
// ═══════════════════════════════════════════════════════════════════════════════

interface SyncSummaryProps {
  snapshot: SyncSnapshot;
  powerSyncStatus: PowerSyncStatus;
}

export function SyncSummary({ snapshot, powerSyncStatus }: SyncSummaryProps) {
  const { totalLocal = 0, totalPending = 0, syncedTables = 0 } = snapshot || {};
  const totalTables = 30; // إجمالي الجداول المزامنة
  const { connected = false, hasSynced = false, lastSyncedAt = null, error = null } = powerSyncStatus || {};

  // ⚡ تحديد حالة المزامنة الكلية
  const getOverallStatus = () => {
    if (error) return { color: 'text-red-500', bg: 'bg-red-500/10', label: 'خطأ في المزامنة', icon: '⚠️' };
    if (!connected) return { color: 'text-red-500', bg: 'bg-red-500/10', label: 'غير متصل', icon: '📴' };
    if (connected && !hasSynced) return { color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'المزامنة الأولى لم تكتمل', icon: '⏳' };
    if (totalPending > 0) return { color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'قيد المزامنة', icon: '🔄' };
    if (hasSynced) return { color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'متزامن', icon: '✅' };
    return { color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'جارٍ التحميل', icon: '⏳' };
  };

  const status = getOverallStatus();

  return (
    <div className={cn(
      "p-4 rounded-xl border-2",
      status.bg,
      connected ? 'border-emerald-500/30' : 'border-red-500/30'
    )}>
      {/* الحالة الرئيسية */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{(status as any).icon || '📊'}</span>
          <div className="flex flex-col">
            <span className={cn("text-sm font-bold", status.color)}>
              {status.label}
            </span>
            {connected && !hasSynced && (
              <span className="text-[10px] text-muted-foreground">
                تحقق من Sync Rules في PowerSync Dashboard
              </span>
            )}
          </div>
        </div>
        {lastSyncedAt && (
          <span className="text-xs text-muted-foreground">
            {new Date(lastSyncedAt).toLocaleTimeString('ar-SA')}
          </span>
        )}
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-2 rounded-lg bg-white/50 dark:bg-black/20">
          <div className="text-lg font-bold text-foreground">{totalLocal.toLocaleString()}</div>
          <div className="text-[10px] text-muted-foreground">سجل محلي</div>
        </div>
        <div className="p-2 rounded-lg bg-white/50 dark:bg-black/20">
          <div className={cn(
            "text-lg font-bold",
            totalPending > 0 ? 'text-amber-500' : 'text-emerald-500'
          )}>
            {totalPending}
          </div>
          <div className="text-[10px] text-muted-foreground">معلق</div>
        </div>
        <div className="p-2 rounded-lg bg-white/50 dark:bg-black/20">
          <div className="text-lg font-bold text-foreground">
            {syncedTables}/{totalTables}
          </div>
          <div className="text-[10px] text-muted-foreground">جدول</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔹 مكون حالة الاتصال
// ═══════════════════════════════════════════════════════════════════════════════

interface ConnectionStatusProps {
  powerSyncStatus: PowerSyncStatus;
  isOnline: boolean;
}

export function ConnectionStatus({ powerSyncStatus, isOnline }: ConnectionStatusProps) {
  const { connected = false, connecting = false, error = null } = powerSyncStatus || {};

  const getStatus = () => {
    if (!isOnline) return { icon: '📴', label: 'غير متصل بالإنترنت', color: 'text-slate-500' };
    if (error) return { icon: '⚠️', label: 'خطأ في الاتصال', color: 'text-red-500' };
    if (connecting) return { icon: '🔄', label: 'جارٍ الاتصال...', color: 'text-blue-500' };
    if (connected) return { icon: '✅', label: 'متصل', color: 'text-emerald-500' };
    return { icon: '⏳', label: 'في الانتظار', color: 'text-amber-500' };
  };

  const status = getStatus();

  return (
    <div className="flex items-center gap-2 text-xs">
      <span>{status.icon}</span>
      <span className={status.color}>{status.label}</span>
    </div>
  );
}
