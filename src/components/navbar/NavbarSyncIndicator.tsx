/**
 * ⚡ NavbarSyncIndicator - مؤشر المزامنة المحسّن
 * @version 3.0.0
 *
 * المميزات:
 * - 4 تبويبات: ملخص، تفاصيل، قاعدة البيانات، الأخطاء
 * - عرض حالة PowerSync في الوقت الحقيقي
 * - إحصائيات تفصيلية لكل جدول (30 جدول)
 * - اكتشاف الجداول التي فيها مشاكل
 * - تشخيص الأخطاء بشكل واضح
 * - دعم السكرول داخل المكون
 */

import React, { useState, useEffect, useMemo, useCallback, useContext } from 'react';
import {
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Cloud,
  CloudOff,
  Wifi,
  WifiOff,
  Database,
  Activity,
  Settings2,
  AlertTriangle,
  HardDrive,
  Bug,
  LayoutList
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useOrganization } from '@/hooks/useOrganization';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';
import { PowerSyncContext } from '@powersync/react';

// ⚡ مكونات المزامنة المحسّنة
import {
  useSyncStats,
  SyncStatsGrid,
  SyncStatsGridExpanded,
  SyncSummary,
  OutboxDetailsPanel,
  DiagnosticsPanel
} from './sync';

// ⚡ كشف بيئة التشغيل
import { needsPowerSync } from '@/lib/powersync/config';

// ═══════════════════════════════════════════════════════════════════════════════
// 🔹 Types
// ═══════════════════════════════════════════════════════════════════════════════

interface NavbarSyncIndicatorProps {
  className?: string;
}

type ViewTab = 'summary' | 'details' | 'database' | 'errors';

// ═══════════════════════════════════════════════════════════════════════════════
// 🔹 مساعدات
// ═══════════════════════════════════════════════════════════════════════════════

function isElectronApp(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as any;
  return Boolean(w.electronAPI || w.__ELECTRON__ || w.electron?.isElectron);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔹 مكون عرض قاعدة البيانات المحلية (تصميم حديث)
// ═══════════════════════════════════════════════════════════════════════════════

interface LocalDatabaseViewProps {
  snapshot: any;
  isLoading: boolean;
}

function LocalDatabaseView({ snapshot, isLoading }: LocalDatabaseViewProps) {
  // تصنيف الجداول حسب وجود البيانات
  const tableGroups = useMemo(() => {
    const withData: { key: string; name: string; nameAr: string; icon: string; count: number }[] = [];
    const empty: { key: string; name: string; nameAr: string; icon: string }[] = [];

    const allTables = [
      // المنتجات
      { key: 'products', nameAr: 'المنتجات', icon: '📦' },
      { key: 'productCategories', nameAr: 'التصنيفات', icon: '📁' },
      { key: 'productSubcategories', nameAr: 'التصنيفات الفرعية', icon: '📂' },
      { key: 'productColors', nameAr: 'ألوان المنتجات', icon: '🎨' },
      { key: 'productSizes', nameAr: 'مقاسات المنتجات', icon: '📏' },
      { key: 'productImages', nameAr: 'صور المنتجات', icon: '🖼️' },
      { key: 'productWholesaleTiers', nameAr: 'مستويات الجملة', icon: '📊' },
      // المخزون
      { key: 'inventoryBatches', nameAr: 'دفعات المخزون', icon: '📋' },
      { key: 'productSerialNumbers', nameAr: 'الأرقام التسلسلية', icon: '🔢' },
      // الطلبات
      { key: 'orders', nameAr: 'الطلبات', icon: '🛒' },
      { key: 'orderItems', nameAr: 'عناصر الطلبات', icon: '📝' },
      // العملاء والموردين
      { key: 'customers', nameAr: 'العملاء', icon: '👤' },
      { key: 'suppliers', nameAr: 'الموردين', icon: '🏭' },
      // الفواتير
      { key: 'invoices', nameAr: 'الفواتير', icon: '🧾' },
      { key: 'invoiceItems', nameAr: 'عناصر الفواتير', icon: '📄' },
      // الخسائر
      { key: 'losses', nameAr: 'الخسائر', icon: '📉' },
      { key: 'lossItems', nameAr: 'عناصر الخسائر', icon: '❌' },
      // المرتجعات
      { key: 'returns', nameAr: 'المرتجعات', icon: '↩️' },
      { key: 'returnItems', nameAr: 'عناصر المرتجعات', icon: '📦' },
      // الإصلاحات
      { key: 'repairOrders', nameAr: 'طلبات الإصلاح', icon: '🔧' },
      { key: 'repairLocations', nameAr: 'مواقع الإصلاح', icon: '📍' },
      // الموظفين
      { key: 'posStaffSessions', nameAr: 'الموظفين', icon: '👷' },
      { key: 'staffWorkSessions', nameAr: 'جلسات العمل', icon: '⏱️' },
      // المصروفات
      { key: 'expenses', nameAr: 'المصروفات', icon: '💸' },
      { key: 'expenseCategories', nameAr: 'تصنيفات المصروفات', icon: '📋' },
      // الاشتراكات
      { key: 'subscriptionTransactions', nameAr: 'معاملات الاشتراكات', icon: '💰' },
      { key: 'subscriptions', nameAr: 'الاشتراكات', icon: '💳' },
      // النظام
      { key: 'users', nameAr: 'المستخدمين', icon: '👥' },
      { key: 'organizations', nameAr: 'المنظمة', icon: '🏢' },
      { key: 'posSettings', nameAr: 'إعدادات POS', icon: '⚙️' },
      { key: 'subscriptionPlans', nameAr: 'خطط الاشتراك', icon: '📋' },
    ];

    allTables.forEach(table => {
      const stats = snapshot?.[table.key];
      if (stats && typeof stats === 'object' && 'local' in stats) {
        const count = stats.local || 0;
        if (count > 0) {
          withData.push({ ...table, name: stats.name || table.key, count });
        } else {
          empty.push({ ...table, name: stats.name || table.key });
        }
      } else {
        empty.push({ ...table, name: table.key });
      }
    });

    // ترتيب الجداول التي فيها بيانات حسب العدد
    withData.sort((a, b) => b.count - a.count);

    return { withData, empty };
  }, [snapshot]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-3">
        <RefreshCw className="h-8 w-8 animate-spin text-primary/30" />
        <p className="text-sm text-muted-foreground animate-pulse">جارٍ تحميل البيانات...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1">
      {/* 📊 إحصائيات عامة بتصميم البطاقات */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/10 border border-emerald-500/10">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
            {tableGroups.withData.length}
          </div>
          <div className="text-[10px] font-medium text-emerald-600/70 uppercase tracking-wider mt-1">جداول نشطة</div>
        </div>

        <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-950/30 dark:to-slate-900/10 border border-slate-500/10">
          <div className="text-2xl font-bold text-slate-600 dark:text-slate-400 font-mono tracking-tight">
            {tableGroups.empty.length}
          </div>
          <div className="text-[10px] font-medium text-slate-600/70 uppercase tracking-wider mt-1">جداول فارغة</div>
        </div>

        <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/10 border border-blue-500/10">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 font-mono tracking-tight">
            {snapshot?.totalLocal?.toLocaleString() || 0}
          </div>
          <div className="text-[10px] font-medium text-blue-600/70 uppercase tracking-wider mt-1">إجمالي السجلات</div>
        </div>
      </div>

      {/* 🟢 الجداول التي فيها بيانات */}
      {tableGroups.withData.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-md bg-emerald-500/10">
              <Database className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">الجداول النشطة</h4>
            <Badge variant="secondary" className="mr-auto text-[10px] font-mono">
              {tableGroups.withData.length}
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-1.5 pr-1">
            {tableGroups.withData.map(table => (
              <div
                key={table.key}
                className="group flex items-center justify-between px-3 py-2 rounded-lg bg-card hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border border-border/50 hover:border-emerald-500/20 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <span className="text-base group-hover:scale-110 transition-transform">{table.icon}</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-foreground">{table.nameAr}</span>
                    <span className="text-[9px] text-muted-foreground font-mono opacity-50">{table.key}</span>
                  </div>
                </div>
                <div className="flex items-center">
                  <Badge variant="outline" className="bg-emerald-500/5 text-emerald-600 border-emerald-200 dark:border-emerald-800 font-mono text-[10px]">
                    {table.count.toLocaleString()}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ⚪ الجداول الفارغة */}
      {tableGroups.empty.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-md bg-slate-500/10">
              <HardDrive className="h-3.5 w-3.5 text-slate-500" />
            </div>
            <h4 className="text-sm font-semibold text-muted-foreground">الجداول الفارغة</h4>
            <div className="h-px bg-border flex-1 ml-2"></div>
            <span className="text-xs text-muted-foreground font-mono">{tableGroups.empty.length}</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {tableGroups.empty.map(table => (
              <div
                key={table.key}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100 transition-opacity"
              >
                <span className="text-xs grayscale">{table.icon}</span>
                <span className="text-[10px] text-slate-500 font-medium">{table.nameAr}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔹 مكون اكتشاف الأخطاء الشامل
// ═══════════════════════════════════════════════════════════════════════════════

type ErrorSeverity = 'critical' | 'error' | 'warning' | 'info';

interface DetectedIssue {
  id: string;
  category: string;
  categoryAr: string;
  table?: string;
  severity: ErrorSeverity;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  solution?: string;
  solutionAr?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface ErrorsDetectionViewProps {
  snapshot: any;
  powerSyncStatus: any;
  onRefresh: () => void;
}

// تعريف جميع الجداول المتوقعة
const EXPECTED_TABLES = [
  // المنتجات (7)
  { key: 'products', name: 'products', nameAr: 'المنتجات', required: true, minRecords: 0 },
  { key: 'productCategories', name: 'product_categories', nameAr: 'التصنيفات', required: false, minRecords: 0 },
  { key: 'productSubcategories', name: 'product_subcategories', nameAr: 'التصنيفات الفرعية', required: false, minRecords: 0 },
  { key: 'productColors', name: 'product_colors', nameAr: 'ألوان المنتجات', required: false, minRecords: 0 },
  { key: 'productSizes', name: 'product_sizes', nameAr: 'مقاسات المنتجات', required: false, minRecords: 0 },
  { key: 'productImages', name: 'product_images', nameAr: 'صور المنتجات', required: false, minRecords: 0 },
  { key: 'productWholesaleTiers', name: 'product_wholesale_tiers', nameAr: 'مستويات الجملة', required: false, minRecords: 0 },
  // المخزون (2)
  { key: 'inventoryBatches', name: 'inventory_batches', nameAr: 'دفعات المخزون', required: false, minRecords: 0 },
  { key: 'productSerialNumbers', name: 'product_serial_numbers', nameAr: 'الأرقام التسلسلية', required: false, minRecords: 0 },
  // الطلبات (2)
  { key: 'orders', name: 'orders', nameAr: 'الطلبات', required: true, minRecords: 0 },
  { key: 'orderItems', name: 'order_items', nameAr: 'عناصر الطلبات', required: false, minRecords: 0 },
  // العملاء والموردين (2)
  { key: 'customers', name: 'customers', nameAr: 'العملاء', required: true, minRecords: 0 },
  { key: 'suppliers', name: 'suppliers', nameAr: 'الموردين', required: false, minRecords: 0 },
  // الفواتير (2)
  { key: 'invoices', name: 'invoices', nameAr: 'الفواتير', required: false, minRecords: 0 },
  { key: 'invoiceItems', name: 'invoice_items', nameAr: 'عناصر الفواتير', required: false, minRecords: 0 },
  // الخسائر (2)
  { key: 'losses', name: 'losses', nameAr: 'الخسائر', required: false, minRecords: 0 },
  { key: 'lossItems', name: 'loss_items', nameAr: 'عناصر الخسائر', required: false, minRecords: 0 },
  // المرتجعات (2)
  { key: 'returns', name: 'returns', nameAr: 'المرتجعات', required: false, minRecords: 0 },
  { key: 'returnItems', name: 'return_items', nameAr: 'عناصر المرتجعات', required: false, minRecords: 0 },
  // الإصلاحات (2)
  { key: 'repairOrders', name: 'repair_orders', nameAr: 'طلبات الإصلاح', required: false, minRecords: 0 },
  { key: 'repairLocations', name: 'repair_locations', nameAr: 'مواقع الإصلاح', required: false, minRecords: 0 },
  // الموظفين (2)
  { key: 'posStaffSessions', name: 'pos_staff_sessions', nameAr: 'الموظفين', required: false, minRecords: 0 },
  { key: 'staffWorkSessions', name: 'staff_work_sessions', nameAr: 'جلسات العمل', required: false, minRecords: 0 },
  // المصروفات (2)
  { key: 'expenses', name: 'expenses', nameAr: 'المصروفات', required: false, minRecords: 0 },
  { key: 'expenseCategories', name: 'expense_categories', nameAr: 'تصنيفات المصروفات', required: false, minRecords: 0 },
  // الاشتراكات (2)
  { key: 'subscriptionTransactions', name: 'subscription_transactions', nameAr: 'معاملات الاشتراكات', required: false, minRecords: 0 },
  { key: 'subscriptions', name: 'organization_subscriptions', nameAr: 'الاشتراكات', required: false, minRecords: 0 },
  // النظام (4)
  { key: 'users', name: 'users', nameAr: 'المستخدمين', required: true, minRecords: 1 },
  { key: 'organizations', name: 'organizations', nameAr: 'المنظمة', required: true, minRecords: 1 },
  { key: 'posSettings', name: 'pos_settings', nameAr: 'إعدادات POS', required: false, minRecords: 0 },
  { key: 'subscriptionPlans', name: 'subscription_plans', nameAr: 'خطط الاشتراك', required: false, minRecords: 0 },
];

// أسماء الجداول الخاطئة الشائعة
const COMMON_TABLE_NAME_MISTAKES: Record<string, { correct: string; wrongNames: string[] }> = {
  'losses': { correct: 'losses', wrongNames: ['loss_declarations', 'loss', 'lossDeclarations'] },
  'returns': { correct: 'returns', wrongNames: ['product_returns', 'return', 'productReturns'] },
  'repair_orders': { correct: 'repair_orders', wrongNames: ['repairs', 'repair', 'repairOrders'] },
  'organization_subscriptions': { correct: 'organization_subscriptions', wrongNames: ['subscriptions', 'org_subscriptions'] },
  'pos_staff_sessions': { correct: 'pos_staff_sessions', wrongNames: ['staff_sessions', 'pos_staff', 'staffSessions'] },
  'staff_work_sessions': { correct: 'staff_work_sessions', wrongNames: ['work_sessions', 'workSessions'] },
};

function ErrorsDetectionView({ snapshot, powerSyncStatus, onRefresh }: ErrorsDetectionViewProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [issues, setIssues] = useState<DetectedIssue[]>([]);
  const [activeFilter, setActiveFilter] = useState<ErrorSeverity | 'all'>('all');
  const [isDebugging, setIsDebugging] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔍 Debug Sync - تشخيص شامل مع طباعة كل التفاصيل في Console
  // ═══════════════════════════════════════════════════════════════════════════
  const runDebugSync = useCallback(async () => {
    setIsDebugging(true);
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                    🔍 بدء تشخيص المزامنة الشامل                              ║');
    console.log('║                         Debug Sync Started                                   ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
    console.log('\n');

    const startTime = Date.now();

    try {
      // ═══════════════════════════════════════════════════════════════════════
      // الخطوة 1: فحص PowerSync Service
      // ═══════════════════════════════════════════════════════════════════════
      console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
      console.log('│ 📦 الخطوة 1: فحص PowerSync Service                                         │');
      console.log('└─────────────────────────────────────────────────────────────────────────────┘');

      const psService = powerSyncService;
      console.log('✓ PowerSync Service Instance:', !!psService);
      console.log('✓ Database Instance:', !!psService.db);
      console.log('✓ Is Initialized:', psService.isInitialized);
      console.log('✓ Is Ready:', psService.isReady());
      console.log('✓ Sync Enabled:', psService.isSyncEnabled());

      if (!psService.db) {
        console.error('❌ قاعدة البيانات غير متاحة! حاول إعادة تحميل الصفحة.');
        setIsDebugging(false);
        return;
      }

      // ═══════════════════════════════════════════════════════════════════════
      // الخطوة 2: فحص حالة الاتصال
      // ═══════════════════════════════════════════════════════════════════════
      console.log('\n');
      console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
      console.log('│ 🔌 الخطوة 2: فحص حالة الاتصال                                              │');
      console.log('└─────────────────────────────────────────────────────────────────────────────┘');

      const status = psService.db.currentStatus;
      console.log('PowerSync Status:', status);
      console.log('✓ Connected:', status?.connected);
      console.log('✓ Has Synced:', status?.hasSynced);
      console.log('✓ Last Synced At:', status?.lastSyncedAt);
      console.log('✓ Data Flow:', status?.dataFlowStatus);

      // ═══════════════════════════════════════════════════════════════════════
      // الخطوة 3: فحص Sync Rules (ps_buckets)
      // ═══════════════════════════════════════════════════════════════════════
      console.log('\n');
      console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
      console.log('│ 📋 الخطوة 3: فحص Sync Rules (Buckets)                                      │');
      console.log('└─────────────────────────────────────────────────────────────────────────────┘');

      // ⚡ Helper function with timeout to prevent hanging
      const queryWithTimeout = async <T,>(query: Promise<T>, timeoutMs: number = 5000): Promise<T | null> => {
        try {
          return await Promise.race([
            query,
            new Promise<null>((_, reject) =>
              setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
            )
          ]);
        } catch (e: any) {
          if (e?.message === 'Query timeout') {
            console.warn('⏱️ الاستعلام استغرق وقتاً طويلاً وتم إلغاؤه');
          }
          return null;
        }
      };

      try {
        const buckets = await queryWithTimeout(psService.query({ sql: 'SELECT * FROM ps_buckets', params: [] }), 3000);
        if (buckets === null) {
          console.log('ℹ️ تعذر قراءة ps_buckets (timeout أو غير موجود)');
        } else {
          console.log('Buckets Count:', buckets.length);
          console.log('Buckets Data:', buckets);

          if (buckets.length === 0) {
            console.warn('⚠️ لا توجد Buckets! هذا يعني أن Sync Rules غير منشورة.');
            console.warn('💡 الحل: اذهب إلى PowerSync Dashboard وانشر sync-rules-complete.yaml');
          } else {
            console.log('✅ Sync Rules منشورة:', buckets.map((b: any) => b.name || b.id).join(', '));
          }
        }
      } catch (e) {
        console.log('ℹ️ جدول ps_buckets غير موجود (قد يكون طبيعياً في بعض الإصدارات)');
      }

      // ═══════════════════════════════════════════════════════════════════════
      // الخطوة 4: فحص Parameter Query Result
      // ═══════════════════════════════════════════════════════════════════════
      console.log('\n');
      console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
      console.log('│ 🔑 الخطوة 4: فحص Parameter Query (organization_id)                         │');
      console.log('└─────────────────────────────────────────────────────────────────────────────┘');

      // فحص جدول users المحلي
      try {
        const users = await psService.query({ sql: 'SELECT id, auth_user_id, organization_id, email, name FROM users LIMIT 5', params: [] });
        console.log('Users in local DB:', users.length);
        console.log('Users Data:', users);

        if (users.length === 0) {
          console.warn('⚠️ لا يوجد مستخدمين في قاعدة البيانات المحلية!');
          console.warn('💡 هذا يعني أن Parameters Query لم تُرجع أي organization_id');
          console.warn('💡 تحقق من أن جدول users في Supabase يحتوي على سجل بـ auth_user_id = المستخدم الحالي');
        } else {
          const orgIds = [...new Set(users.map((u: any) => u.organization_id))];
          console.log('✅ Organization IDs found:', orgIds);
        }
      } catch (e) {
        console.error('❌ خطأ في قراءة جدول users:', e);
      }

      // ═══════════════════════════════════════════════════════════════════════
      // الخطوة 5: فحص ps_crud (العمليات المعلقة)
      // ═══════════════════════════════════════════════════════════════════════
      console.log('\n');
      console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
      console.log('│ 📤 الخطوة 5: فحص العمليات المعلقة (ps_crud)                                │');
      console.log('└─────────────────────────────────────────────────────────────────────────────┘');

      try {
        const pendingOps = await psService.query({ sql: 'SELECT * FROM ps_crud LIMIT 20', params: [] });
        console.log('Pending Operations:', pendingOps.length);
        if (pendingOps.length > 0) {
          console.log('Sample Pending Ops:', pendingOps.slice(0, 5));
          console.warn('⚠️ توجد عمليات معلقة لم تُرفع بعد!');
        } else {
          console.log('✅ لا توجد عمليات معلقة');
        }
      } catch (e) {
        console.log('ℹ️ جدول ps_crud غير متاح');
      }

      // ═══════════════════════════════════════════════════════════════════════
      // الخطوة 6: فحص جميع الجداول الرئيسية
      // ═══════════════════════════════════════════════════════════════════════
      console.log('\n');
      console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
      console.log('│ 📊 الخطوة 6: فحص الجداول الرئيسية                                          │');
      console.log('└─────────────────────────────────────────────────────────────────────────────┘');

      const tablesToCheck = [
        'products', 'product_categories', 'product_subcategories',
        'product_colors', 'product_sizes', 'product_images',
        'orders', 'order_items',
        'customers', 'suppliers',
        'invoices', 'invoice_items',
        'expenses', 'expense_categories',
        'losses', 'loss_items',
        'returns', 'return_items',
        'repair_orders', 'repair_locations',
        'pos_staff_sessions', 'staff_work_sessions',
        'users', 'organizations', 'pos_settings',
        'subscription_plans', 'payment_methods'
      ];

      const tableResults: { table: string; count: number; status: string }[] = [];

      for (const table of tablesToCheck) {
        try {
          const result = await psService.db.getAll<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM ${table}`);
          const count = result?.[0]?.cnt || 0;
          const status = count > 0 ? '✅' : '⚪';
          tableResults.push({ table, count, status });
        } catch (e) {
          tableResults.push({ table, count: -1, status: '❌' });
        }
      }

      // طباعة بشكل جدول
      console.log('\nنتائج فحص الجداول:');
      console.log('─────────────────────────────────────────');
      console.log('│ الحالة │    العدد    │      الجدول      │');
      console.log('─────────────────────────────────────────');
      tableResults.forEach(({ table, count, status }) => {
        const countStr = count === -1 ? 'خطأ' : count.toString().padStart(8, ' ');
        console.log(`│   ${status}   │ ${countStr} │ ${table.padEnd(20)} │`);
      });
      console.log('─────────────────────────────────────────');

      const tablesWithData = tableResults.filter(t => t.count > 0);
      const emptyTables = tableResults.filter(t => t.count === 0);
      const errorTables = tableResults.filter(t => t.count === -1);

      console.log(`\n📈 الملخص:`);
      console.log(`   - جداول فيها بيانات: ${tablesWithData.length}`);
      console.log(`   - جداول فارغة: ${emptyTables.length}`);
      console.log(`   - جداول بها أخطاء: ${errorTables.length}`);
      console.log(`   - إجمالي السجلات: ${tableResults.reduce((sum, t) => sum + (t.count > 0 ? t.count : 0), 0)}`);

      // ═══════════════════════════════════════════════════════════════════════
      // الخطوة 7: فحص بيانات عينة من المنتجات
      // ═══════════════════════════════════════════════════════════════════════
      console.log('\n');
      console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
      console.log('│ 🔍 الخطوة 7: عينة من البيانات                                              │');
      console.log('└─────────────────────────────────────────────────────────────────────────────┘');

      try {
        const sampleProducts = await psService.query({ sql: 'SELECT id, name, organization_id, price, stock_quantity FROM products LIMIT 3', params: [] });
        if (sampleProducts.length > 0) {
          console.log('✅ عينة من المنتجات:', sampleProducts);
        } else {
          console.log('⚪ لا توجد منتجات');
        }
      } catch (e) {
        console.log('❌ خطأ في قراءة المنتجات:', e);
      }

      try {
        const sampleOrders = await psService.query({ sql: 'SELECT id, status, total, organization_id FROM orders LIMIT 3', params: [] });
        if (sampleOrders.length > 0) {
          console.log('✅ عينة من الطلبات:', sampleOrders);
        } else {
          console.log('⚪ لا توجد طلبات');
        }
      } catch (e) {
        console.log('❌ خطأ في قراءة الطلبات:', e);
      }

      try {
        const sampleCustomers = await psService.query({ sql: 'SELECT id, name, phone, organization_id FROM customers LIMIT 3', params: [] });
        if (sampleCustomers.length > 0) {
          console.log('✅ عينة من العملاء:', sampleCustomers);
        } else {
          console.log('⚪ لا توجد عملاء');
        }
      } catch (e) {
        console.log('❌ خطأ في قراءة العملاء:', e);
      }

      // ═══════════════════════════════════════════════════════════════════════
      // الخطوة 8: التشخيص النهائي والتوصيات
      // ═══════════════════════════════════════════════════════════════════════
      console.log('\n');
      console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
      console.log('│ 💡 الخطوة 8: التشخيص النهائي والتوصيات                                     │');
      console.log('└─────────────────────────────────────────────────────────────────────────────┘');

      const allEmpty = tableResults.every(t => t.count <= 0);
      const usersExist = tableResults.find(t => t.table === 'users')?.count || 0;

      if (!status?.connected) {
        console.error('❌ المشكلة: غير متصل بـ PowerSync Backend');
        console.log('💡 الحل: تحقق من الاتصال بالإنترنت و VITE_POWERSYNC_URL في .env');
      } else if (!status?.hasSynced) {
        console.warn('⚠️ المشكلة: المزامنة الأولى لم تكتمل');
        console.log('💡 الحل: انتظر قليلاً أو أعد تحميل الصفحة');
      } else if (allEmpty && usersExist === 0) {
        console.error('❌ المشكلة: Sync Rules Parameters Query لم تُرجع organization_id');
        console.log('');
        console.log('💡 الأسباب المحتملة:');
        console.log('   1. لا يوجد سجل في جدول users بـ auth_user_id = المستخدم الحالي');
        console.log('   2. السجل موجود لكن organization_id فارغ');
        console.log('   3. Sync Rules غير منشورة بشكل صحيح');
        console.log('');
        console.log('💡 الحل:');
        console.log('   1. افتح Supabase Dashboard');
        console.log('   2. اذهب لجدول users');
        console.log('   3. تأكد من وجود سجل بـ:');
        console.log('      - auth_user_id = [UUID من auth.users]');
        console.log('      - organization_id = [UUID المنظمة]');
        console.log('   4. إذا لم يكن موجوداً، أضفه يدوياً');
      } else if (allEmpty) {
        console.error('❌ المشكلة: لا توجد بيانات رغم وجود مستخدم');
        console.log('💡 تحقق من أن البيانات في Supabase لها نفس organization_id');
      } else {
        console.log('✅ المزامنة تعمل بشكل صحيح!');
        console.log(`   - ${tablesWithData.length} جدول يحتوي على بيانات`);
      }

      const duration = Date.now() - startTime;
      console.log('\n');
      console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
      console.log(`║           ✅ اكتمل التشخيص في ${duration}ms                                   ║`);
      console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
      console.log('\n');

    } catch (error) {
      console.error('❌ خطأ أثناء التشخيص:', error);
    } finally {
      setIsDebugging(false);
    }
  }, []);

  // فحص شامل للأخطاء
  const runComprehensiveCheck = useCallback(async () => {
    setIsChecking(true);
    const detectedIssues: DetectedIssue[] = [];
    const now = new Date();

    // ════════════════════════════════════════════════════════════════════════
    // 1. فحص الاتصال بـ PowerSync
    // ════════════════════════════════════════════════════════════════════════

    if (!powerSyncStatus?.connected) {
      detectedIssues.push({
        id: 'conn-001',
        category: 'connection',
        categoryAr: 'الاتصال',
        severity: 'critical',
        title: 'PowerSync Disconnected',
        titleAr: 'غير متصل بـ PowerSync',
        description: 'The application is not connected to PowerSync service',
        descriptionAr: 'التطبيق غير متصل بخدمة PowerSync',
        solution: 'Check your internet connection and PowerSync configuration',
        solutionAr: 'تحقق من اتصالك بالإنترنت وإعدادات PowerSync',
        timestamp: now,
        metadata: { connected: false }
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // 2. فحص Sync Rules
    // ════════════════════════════════════════════════════════════════════════

    if (powerSyncStatus?.syncRulesDeployed === false) {
      detectedIssues.push({
        id: 'sync-001',
        category: 'sync_rules',
        categoryAr: 'قواعد المزامنة',
        severity: 'critical',
        title: 'Sync Rules Not Deployed',
        titleAr: 'Sync Rules غير منشورة',
        description: 'Sync rules are not deployed on PowerSync Dashboard',
        descriptionAr: 'قواعد المزامنة غير منشورة في PowerSync Dashboard',
        solution: 'Deploy sync rules from PowerSync Dashboard',
        solutionAr: 'انشر قواعد المزامنة من PowerSync Dashboard',
        timestamp: now,
        metadata: { syncRulesDeployed: false }
      });
    }

    if (powerSyncStatus?.syncRulesError) {
      detectedIssues.push({
        id: 'sync-002',
        category: 'sync_rules',
        categoryAr: 'قواعد المزامنة',
        severity: 'error',
        title: 'Sync Rules Error',
        titleAr: 'خطأ في قواعد المزامنة',
        description: powerSyncStatus.syncRulesError,
        descriptionAr: powerSyncStatus.syncRulesError,
        solution: 'Check sync rules YAML syntax and table/column names',
        solutionAr: 'تحقق من صياغة YAML وأسماء الجداول والأعمدة',
        timestamp: now,
        metadata: { error: powerSyncStatus.syncRulesError }
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // 3. فحص المزامنة الأولى
    // ════════════════════════════════════════════════════════════════════════

    if (powerSyncStatus?.connected && !powerSyncStatus?.hasSynced) {
      detectedIssues.push({
        id: 'sync-003',
        category: 'initial_sync',
        categoryAr: 'المزامنة الأولى',
        severity: 'error',
        title: 'Initial Sync Not Completed',
        titleAr: 'المزامنة الأولى لم تكتمل',
        description: 'PowerSync is connected but initial sync has not completed',
        descriptionAr: 'PowerSync متصل لكن المزامنة الأولى لم تكتمل',
        solution: 'Wait for sync to complete or check sync rules configuration',
        solutionAr: 'انتظر اكتمال المزامنة أو تحقق من إعدادات Sync Rules',
        timestamp: now,
        metadata: { hasSynced: false }
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // 4. فحص العمليات المعلقة (Outbox)
    // ════════════════════════════════════════════════════════════════════════

    const totalPending = snapshot?.totalPending || 0;

    if (totalPending > 100) {
      detectedIssues.push({
        id: 'outbox-001',
        category: 'outbox',
        categoryAr: 'العمليات المعلقة',
        severity: 'critical',
        title: 'Too Many Pending Operations',
        titleAr: 'عدد كبير من العمليات المعلقة',
        description: `${totalPending} operations are pending sync - possible sync blockage`,
        descriptionAr: `${totalPending} عملية معلقة - قد يكون هناك انسداد في المزامنة`,
        solution: 'Check network connection and Supabase access. May need to clear outbox.',
        solutionAr: 'تحقق من الاتصال وصلاحيات Supabase. قد تحتاج لمسح الـ outbox.',
        timestamp: now,
        metadata: { pendingCount: totalPending }
      });
    } else if (totalPending > 50) {
      detectedIssues.push({
        id: 'outbox-002',
        category: 'outbox',
        categoryAr: 'العمليات المعلقة',
        severity: 'warning',
        title: 'Many Pending Operations',
        titleAr: 'عمليات معلقة كثيرة',
        description: `${totalPending} operations pending - sync may be slow`,
        descriptionAr: `${totalPending} عملية معلقة - المزامنة قد تكون بطيئة`,
        solution: 'Wait for sync to complete or check connection',
        solutionAr: 'انتظر اكتمال المزامنة أو تحقق من الاتصال',
        timestamp: now,
        metadata: { pendingCount: totalPending }
      });
    } else if (totalPending > 10) {
      detectedIssues.push({
        id: 'outbox-003',
        category: 'outbox',
        categoryAr: 'العمليات المعلقة',
        severity: 'info',
        title: 'Pending Operations',
        titleAr: 'عمليات معلقة',
        description: `${totalPending} operations waiting to sync`,
        descriptionAr: `${totalPending} عملية في انتظار المزامنة`,
        timestamp: now,
        metadata: { pendingCount: totalPending }
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // 5. فحص كل جدول
    // ════════════════════════════════════════════════════════════════════════

    for (const table of EXPECTED_TABLES) {
      const stats = snapshot?.[table.key];

      // فحص وجود الجدول
      if (!stats || typeof stats !== 'object') {
        detectedIssues.push({
          id: `table-missing-${table.key}`,
          category: 'schema',
          categoryAr: 'المخطط',
          table: table.name,
          severity: table.required ? 'error' : 'warning',
          title: `Table Not Found: ${table.name}`,
          titleAr: `جدول غير موجود: ${table.nameAr}`,
          description: `Table "${table.name}" is not accessible in local database`,
          descriptionAr: `الجدول "${table.nameAr}" غير متاح في قاعدة البيانات المحلية`,
          solution: 'Check if table exists in sync rules and Supabase',
          solutionAr: 'تحقق من وجود الجدول في Sync Rules و Supabase',
          timestamp: now,
          metadata: { tableKey: table.key, tableName: table.name }
        });
        continue;
      }

      const localCount = stats.local || 0;
      const pendingCount = stats.pending || 0;

      // فحص الجداول المطلوبة الفارغة
      if (table.required && table.minRecords > 0 && localCount < table.minRecords) {
        detectedIssues.push({
          id: `table-empty-${table.key}`,
          category: 'data',
          categoryAr: 'البيانات',
          table: table.name,
          severity: 'warning',
          title: `Required Table Empty: ${table.nameAr}`,
          titleAr: `جدول مطلوب فارغ: ${table.nameAr}`,
          description: `Table "${table.nameAr}" should have at least ${table.minRecords} record(s) but has ${localCount}`,
          descriptionAr: `الجدول "${table.nameAr}" يجب أن يحتوي على ${table.minRecords} سجل على الأقل لكن يحتوي على ${localCount}`,
          solution: 'Check if data exists in Supabase and sync rules are correct',
          solutionAr: 'تحقق من وجود البيانات في Supabase وصحة Sync Rules',
          timestamp: now,
          metadata: { expected: table.minRecords, actual: localCount }
        });
      }

      // فحص العمليات المعلقة لكل جدول
      if (pendingCount > 20) {
        detectedIssues.push({
          id: `table-pending-${table.key}`,
          category: 'sync',
          categoryAr: 'المزامنة',
          table: table.name,
          severity: 'warning',
          title: `Many Pending for: ${table.nameAr}`,
          titleAr: `عمليات معلقة كثيرة: ${table.nameAr}`,
          description: `${pendingCount} pending operations for table "${table.nameAr}"`,
          descriptionAr: `${pendingCount} عملية معلقة للجدول "${table.nameAr}"`,
          solution: 'Check if there are sync errors for this table',
          solutionAr: 'تحقق من وجود أخطاء مزامنة لهذا الجدول',
          timestamp: now,
          metadata: { pendingCount }
        });
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // 6. فحص تناسق البيانات
    // ════════════════════════════════════════════════════════════════════════

    // فحص: orders موجودة لكن order_items فارغ
    const ordersCount = snapshot?.orders?.local || 0;
    const orderItemsCount = snapshot?.orderItems?.local || 0;

    if (ordersCount > 0 && orderItemsCount === 0) {
      detectedIssues.push({
        id: 'consistency-001',
        category: 'data_consistency',
        categoryAr: 'تناسق البيانات',
        severity: 'warning',
        title: 'Orders Without Items',
        titleAr: 'طلبات بدون عناصر',
        description: `Found ${ordersCount} orders but no order items`,
        descriptionAr: `يوجد ${ordersCount} طلب لكن لا توجد عناصر طلبات`,
        solution: 'Check order_items sync rules and Supabase data',
        solutionAr: 'تحقق من sync rules لـ order_items والبيانات في Supabase',
        timestamp: now,
        metadata: { ordersCount, orderItemsCount }
      });
    }

    // فحص: products موجودة لكن product_categories فارغ
    const productsCount = snapshot?.products?.local || 0;
    const categoriesCount = snapshot?.productCategories?.local || 0;

    if (productsCount > 5 && categoriesCount === 0) {
      detectedIssues.push({
        id: 'consistency-002',
        category: 'data_consistency',
        categoryAr: 'تناسق البيانات',
        severity: 'info',
        title: 'Products Without Categories',
        titleAr: 'منتجات بدون تصنيفات',
        description: `Found ${productsCount} products but no categories`,
        descriptionAr: `يوجد ${productsCount} منتج لكن لا توجد تصنيفات`,
        solution: 'Consider adding product categories for better organization',
        solutionAr: 'فكر في إضافة تصنيفات للمنتجات لتنظيم أفضل',
        timestamp: now,
        metadata: { productsCount, categoriesCount }
      });
    }

    // فحص: invoices موجودة لكن invoice_items فارغ
    const invoicesCount = snapshot?.invoices?.local || 0;
    const invoiceItemsCount = snapshot?.invoiceItems?.local || 0;

    if (invoicesCount > 0 && invoiceItemsCount === 0) {
      detectedIssues.push({
        id: 'consistency-003',
        category: 'data_consistency',
        categoryAr: 'تناسق البيانات',
        severity: 'warning',
        title: 'Invoices Without Items',
        titleAr: 'فواتير بدون عناصر',
        description: `Found ${invoicesCount} invoices but no invoice items`,
        descriptionAr: `يوجد ${invoicesCount} فاتورة لكن لا توجد عناصر فواتير`,
        timestamp: now,
        metadata: { invoicesCount, invoiceItemsCount }
      });
    }

    // فحص: losses موجودة لكن loss_items فارغ
    const lossesCount = snapshot?.losses?.local || 0;
    const lossItemsCount = snapshot?.lossItems?.local || 0;

    if (lossesCount > 0 && lossItemsCount === 0) {
      detectedIssues.push({
        id: 'consistency-004',
        category: 'data_consistency',
        categoryAr: 'تناسق البيانات',
        severity: 'warning',
        title: 'Losses Without Items',
        titleAr: 'خسائر بدون عناصر',
        description: `Found ${lossesCount} losses but no loss items`,
        descriptionAr: `يوجد ${lossesCount} خسارة لكن لا توجد عناصر خسائر`,
        timestamp: now,
        metadata: { lossesCount, lossItemsCount }
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // 7. فحص آخر مزامنة
    // ════════════════════════════════════════════════════════════════════════

    if (powerSyncStatus?.lastSyncedAt) {
      const lastSync = new Date(powerSyncStatus.lastSyncedAt);
      const minutesSinceLastSync = (now.getTime() - lastSync.getTime()) / (1000 * 60);

      if (minutesSinceLastSync > 30) {
        detectedIssues.push({
          id: 'sync-stale-001',
          category: 'sync',
          categoryAr: 'المزامنة',
          severity: 'warning',
          title: 'Stale Sync',
          titleAr: 'مزامنة قديمة',
          description: `Last sync was ${Math.round(minutesSinceLastSync)} minutes ago`,
          descriptionAr: `آخر مزامنة كانت قبل ${Math.round(minutesSinceLastSync)} دقيقة`,
          solution: 'Try manual sync or check connection',
          solutionAr: 'جرب المزامنة اليدوية أو تحقق من الاتصال',
          timestamp: now,
          metadata: { minutesSinceLastSync: Math.round(minutesSinceLastSync) }
        });
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // 8. فحص إجمالي البيانات
    // ════════════════════════════════════════════════════════════════════════

    const totalLocal = snapshot?.totalLocal || 0;

    if (powerSyncStatus?.connected && powerSyncStatus?.hasSynced && totalLocal === 0) {
      detectedIssues.push({
        id: 'data-empty-001',
        category: 'data',
        categoryAr: 'البيانات',
        severity: 'critical',
        title: 'No Data After Sync',
        titleAr: 'لا توجد بيانات بعد المزامنة',
        description: 'Sync completed but local database is empty',
        descriptionAr: 'اكتملت المزامنة لكن قاعدة البيانات المحلية فارغة',
        solution: 'Check sync rules, Supabase data, and organization_id in JWT',
        solutionAr: 'تحقق من Sync Rules والبيانات في Supabase و organization_id في JWT',
        timestamp: now,
        metadata: { totalLocal: 0 }
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // 9. فحص النسب والتناسب
    // ════════════════════════════════════════════════════════════════════════

    // نسبة order_items إلى orders (يجب أن تكون > 1 عادة)
    if (ordersCount > 10 && orderItemsCount > 0) {
      const ratio = orderItemsCount / ordersCount;
      if (ratio < 0.5) {
        detectedIssues.push({
          id: 'ratio-001',
          category: 'data_quality',
          categoryAr: 'جودة البيانات',
          severity: 'info',
          title: 'Low Order Items Ratio',
          titleAr: 'نسبة عناصر الطلبات منخفضة',
          description: `Average ${ratio.toFixed(1)} items per order (usually should be higher)`,
          descriptionAr: `متوسط ${ratio.toFixed(1)} عنصر لكل طلب (عادة يجب أن يكون أعلى)`,
          timestamp: now,
          metadata: { ratio: ratio.toFixed(2) }
        });
      }
    }

    // ترتيب الأخطاء حسب الأهمية
    detectedIssues.sort((a, b) => {
      const severityOrder: Record<ErrorSeverity, number> = { critical: 0, error: 1, warning: 2, info: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    setIssues(detectedIssues);
    setIsChecking(false);
  }, [snapshot, powerSyncStatus]);

  useEffect(() => {
    runComprehensiveCheck();
  }, [runComprehensiveCheck]);

  // إحصائيات الأخطاء
  const stats = useMemo(() => {
    return {
      critical: issues.filter(i => i.severity === 'critical').length,
      error: issues.filter(i => i.severity === 'error').length,
      warning: issues.filter(i => i.severity === 'warning').length,
      info: issues.filter(i => i.severity === 'info').length,
      total: issues.length
    };
  }, [issues]);

  // تصفية الأخطاء
  const filteredIssues = useMemo(() => {
    if (activeFilter === 'all') return issues;
    return issues.filter(i => i.severity === activeFilter);
  }, [issues, activeFilter]);

  // ألوان حسب الخطورة
  const getSeverityConfig = (severity: ErrorSeverity) => {
    switch (severity) {
      case 'critical':
        return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-600', icon: AlertCircle, label: 'حرج' };
      case 'error':
        return { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-600', icon: AlertCircle, label: 'خطأ' };
      case 'warning':
        return { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-600', icon: AlertTriangle, label: 'تحذير' };
      case 'info':
        return { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-600', icon: Activity, label: 'معلومة' };
    }
  };

  return (
    <div className="space-y-4 p-1">
      {/* إحصائيات شاملة */}
      <div className="grid grid-cols-5 gap-2">
        <button
          onClick={() => setActiveFilter('all')}
          className={cn(
            "p-2 rounded-xl border transition-all duration-200 flex flex-col items-center justify-center gap-0.5",
            activeFilter === 'all' ? "bg-white dark:bg-slate-800 shadow-sm ring-1 ring-primary/20 border-primary/30" : "bg-transparent border-transparent hover:bg-muted/50",
            stats.total > 0 && activeFilter !== 'all' && "opacity-60"
          )}
        >
          <div className="text-lg font-bold font-mono">{stats.total}</div>
          <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide">الكل</div>
        </button>
        <button
          onClick={() => setActiveFilter('critical')}
          className={cn(
            "p-2 rounded-xl border transition-all duration-200 flex flex-col items-center justify-center gap-0.5",
            activeFilter === 'critical' ? "bg-red-50 dark:bg-red-950/30 shadow-sm ring-1 ring-red-500/20 border-red-500/30" : "bg-transparent border-transparent hover:bg-red-50/50 dark:hover:bg-red-950/20",
          )}
        >
          <div className={cn("text-lg font-bold font-mono", stats.critical > 0 ? "text-red-600" : "text-slate-400")}>
            {stats.critical}
          </div>
          <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide">حرج</div>
        </button>
        <button
          onClick={() => setActiveFilter('error')}
          className={cn(
            "p-2 rounded-xl border transition-all duration-200 flex flex-col items-center justify-center gap-0.5",
            activeFilter === 'error' ? "bg-orange-50 dark:bg-orange-950/30 shadow-sm ring-1 ring-orange-500/20 border-orange-500/30" : "bg-transparent border-transparent hover:bg-orange-50/50 dark:hover:bg-orange-950/20",
          )}
        >
          <div className={cn("text-lg font-bold font-mono", stats.error > 0 ? "text-orange-600" : "text-slate-400")}>
            {stats.error}
          </div>
          <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide">خطأ</div>
        </button>
        <button
          onClick={() => setActiveFilter('warning')}
          className={cn(
            "p-2 rounded-xl border transition-all duration-200 flex flex-col items-center justify-center gap-0.5",
            activeFilter === 'warning' ? "bg-amber-50 dark:bg-amber-950/30 shadow-sm ring-1 ring-amber-500/20 border-amber-500/30" : "bg-transparent border-transparent hover:bg-amber-50/50 dark:hover:bg-amber-950/20",
          )}
        >
          <div className={cn("text-lg font-bold font-mono", stats.warning > 0 ? "text-amber-600" : "text-slate-400")}>
            {stats.warning}
          </div>
          <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide">تحذير</div>
        </button>
        <button
          onClick={() => setActiveFilter('info')}
          className={cn(
            "p-2 rounded-xl border transition-all duration-200 flex flex-col items-center justify-center gap-0.5",
            activeFilter === 'info' ? "bg-blue-50 dark:bg-blue-950/30 shadow-sm ring-1 ring-blue-500/20 border-blue-500/30" : "bg-transparent border-transparent hover:bg-blue-50/50 dark:hover:bg-blue-950/20",
          )}
        >
          <div className={cn("text-lg font-bold font-mono", stats.info > 0 ? "text-blue-600" : "text-slate-400")}>
            {stats.info}
          </div>
          <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide">معلومة</div>
        </button>
      </div>

      {/* أزرار التشخيص */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            onRefresh();
            runComprehensiveCheck();
          }}
          disabled={isChecking || isDebugging}
          className="flex-1 h-8 text-xs font-medium border-dashed"
        >
          {isChecking ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 ml-2 animate-spin text-muted-foreground" />
              جارٍ الفحص...
            </>
          ) : (
            <>
              <RefreshCw className="h-3.5 w-3.5 ml-2 text-muted-foreground" />
              فحص سريع
            </>
          )}
        </Button>

        {/* 🔍 زر التشخيص الشامل - يطبع كل التفاصيل في Console */}
        <Button
          size="sm"
          variant="default"
          onClick={runDebugSync}
          disabled={isDebugging || isChecking}
          className="flex-1 h-8 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200 dark:shadow-none"
        >
          {isDebugging ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 ml-2 animate-spin" />
              جارٍ التشخيص...
            </>
          ) : (
            <>
              <Bug className="h-3.5 w-3.5 ml-2" />
              تشخيص شامل (Console)
            </>
          )}
        </Button>
      </div>

      {/* تنبيه للمستخدم */}
      {isDebugging && (
        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 text-xs text-blue-700 dark:text-blue-300 animate-in fade-in zoom-in duration-200">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1 rounded-full bg-blue-100 dark:bg-blue-900">
              <Bug className="h-3 w-3" />
            </div>
            <span className="font-semibold">افتح Developer Console لرؤية التفاصيل</span>
          </div>
          <p className="text-[10px] opacity-80 pl-6">
            اضغط F12 أو Cmd+Option+I ثم اختر Console
          </p>
        </div>
      )}

      {/* قائمة الأخطاء */}
      {filteredIssues.length > 0 ? (
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
          {filteredIssues.map((issue) => {
            const config = getSeverityConfig(issue.severity);
            const Icon = config.icon;

            return (
              <div
                key={issue.id}
                className={cn(
                  "group p-3 rounded-xl border transition-all duration-200 hover:shadow-sm",
                  "bg-card hover:bg-accent/30",
                  config.border
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("mt-0.5 p-1.5 rounded-lg", config.bg)}>
                    <Icon className={cn("h-4 w-4", config.text)} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-bold text-foreground">
                        {issue.titleAr}
                      </span>
                      <Badge variant="outline" className="text-[9px] h-4 px-1.5 font-normal bg-background/50">
                        {issue.categoryAr}
                      </Badge>
                      {issue.table && (
                        <Badge variant="secondary" className="text-[9px] h-4 px-1.5 font-normal bg-muted text-muted-foreground">
                          {issue.table}
                        </Badge>
                      )}
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {issue.descriptionAr}
                    </p>

                    {issue.solutionAr && (
                      <div className="mt-2 flex items-start gap-1.5 px-2 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                        <div className="mt-0.5">💡</div>
                        <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                          {issue.solutionAr}
                        </p>
                      </div>
                    )}

                    {issue.metadata && Object.keys(issue.metadata).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Object.entries(issue.metadata).slice(0, 3).map(([key, value]) => (
                          <span key={key} className="text-[9px] text-muted-foreground/70 bg-muted px-1.5 py-0.5 rounded-md font-mono border border-border">
                            {key}: {String(value)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 rounded-full bg-emerald-50 dark:bg-emerald-950/30 mb-3">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
          </div>
          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
            {activeFilter === 'all' ? 'النظام سليم تماماً!' : `لا توجد ${getSeverityConfig(activeFilter as ErrorSeverity).label}`}
          </p>
          <p className="text-xs text-muted-foreground max-w-[200px]">جميع الفحوصات اجتازت بنجاح، لا توجد أي مشاكل مكتشفة حالياً.</p>
        </div>
      )}

      {/* ملخص الفحوصات */}
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
        <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">📋 نطاق الفحص:</h5>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
          <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
            <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
            اتصال PowerSync
          </div>
          <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
            <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
            قواعد المزامنة (Rules)
          </div>
          <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
            <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
            المزامنة الأولى
          </div>
          <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
            <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
            العمليات المعلقة
          </div>
          <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
            <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
            هيكل الجداول (30)
          </div>
          <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
            <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
            تناسق البيانات
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔹 مكون وضع الويب - بدون PowerSync
// ═══════════════════════════════════════════════════════════════════════════════

function WebModeIndicator({ className }: { className?: string }) {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className="relative flex items-center justify-center">
        <div className={cn(
          "w-2 h-2 rounded-full transition-colors duration-300",
          isOnline ? "bg-emerald-500" : "bg-slate-400"
        )} />
        {isOnline && (
          <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500/50 animate-ping" />
        )}
      </div>
      <span className={cn(
        "text-xs font-medium transition-colors duration-300",
        isOnline ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"
      )}>
        {isOnline ? 'متصل' : 'غير متصل'}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔹 المكون الرئيسي - Wrapper للتفريق بين الويب و Electron
// ═══════════════════════════════════════════════════════════════════════════════

export function NavbarSyncIndicator({ className }: NavbarSyncIndicatorProps) {
  // ⚡ فحص البيئة - web vs electron
  // هذا الفحص يحدث مرة واحدة عند تحميل الصفحة
  const isPowerSyncEnabled = needsPowerSync();
  const powerSyncCtx = useContext(PowerSyncContext);

  // ⚡ في وضع الويب - عرض مؤشر بسيط بدون PowerSync hooks
  // أو إذا لم يكن PowerSyncProvider مركّباً (لتجنب crash داخل usePowerSyncStatus)
  if (!isPowerSyncEnabled || !powerSyncCtx) {
    return <WebModeIndicator className={className} />;
  }

  // ⚡ في وضع Electron - استخدام المكون الكامل مع PowerSync
  return <PowerSyncSyncIndicator className={className} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔹 مكون PowerSync الكامل - يُستخدم فقط في Electron
// ═══════════════════════════════════════════════════════════════════════════════

function PowerSyncSyncIndicator({ className }: NavbarSyncIndicatorProps) {
  const isDesktopApp = useMemo(() => isElectronApp(), []);

  // ⚡ الحالات
  const { isOnline, connectionStatus } = useNetworkStatus();
  const { organization } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ViewTab>('summary');
  const [isSyncing, setIsSyncing] = useState(false);
  const [navigatorOnline, setNavigatorOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // ⚡ الحالة الفعلية للاتصال
  const isActuallyOnline = useMemo(() =>
    isOnline && navigatorOnline,
    [isOnline, navigatorOnline]
  );

  // ⚡ تتبع navigator.onLine
  useEffect(() => {
    const handleOnline = () => setNavigatorOnline(true);
    const handleOffline = () => setNavigatorOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ⚡ Hook الإحصائيات المحسّن
  const {
    snapshot,
    powerSyncStatus,
    outbox,
    isLoading,
    isInitialized,
    error,
    refresh,
    getDiagnostics
  } = useSyncStats({
    organizationId: organization?.id,
    isOnline: isActuallyOnline,
  });

  // ⚡ المزامنة اليدوية - فقط عند الضغط على زر "مزامنة الآن"
  const handleSync = useCallback(async () => {
    if (!isActuallyOnline || isSyncing) return;

    setIsSyncing(true);
    try {
      await powerSyncService.forceSync();
      // لا نستدعي refresh() لأن الإحصائيات تتحدث تلقائياً
    } catch (err) {
      console.error('[NavbarSync] Sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [isActuallyOnline, isSyncing]);

  // ⚡ تحديث عند فتح القائمة - فقط إحصائيات بدون forceSync
  // لأن forceSync يغلق ويعيد فتح WebSocket وهذا غير ضروري
  useEffect(() => {
    if (isOpen) {
      // لا نستدعي refresh() لأنه يستدعي forceSync()
      // الإحصائيات تتحدث تلقائياً من خلال powerSyncStatus
    }
  }, [isOpen]);

  // ⚡ حساب الإحصائيات
  const { totalPending, statusLabel, statusIcon, statusColor, hasErrors } = useMemo(() => {
    const pending = outbox?.total || 0;
    const connected = powerSyncStatus?.connected || false;
    const hasSynced = powerSyncStatus?.hasSynced || false;
    const syncRulesDeployed = powerSyncStatus?.syncRulesDeployed !== false;

    let label = 'متزامن';
    let icon: React.ReactNode = <CheckCircle className="h-4 w-4" />;
    let color = 'text-emerald-400';
    let errors = false;

    if (!isActuallyOnline) {
      label = 'غير متصل';
      icon = <WifiOff className="h-4 w-4" />;
      color = 'text-slate-400';
    } else if (error || !syncRulesDeployed) {
      label = 'خطأ';
      icon = <AlertCircle className="h-4 w-4" />;
      color = 'text-red-400';
      errors = true;
    } else if (isSyncing) {
      label = 'جارٍ المزامنة';
      icon = <RefreshCw className="h-4 w-4 animate-spin" />;
      color = 'text-blue-400';
    } else if (pending > 0) {
      label = `${pending} معلق`;
      icon = <Cloud className="h-4 w-4" />;
      color = 'text-amber-400';
    } else if (!connected) {
      label = 'قطع الاتصال';
      icon = <CloudOff className="h-4 w-4" />;
      color = 'text-amber-400';
    } else if (!hasSynced && !isInitialized) {
      label = 'جارٍ التحميل';
      icon = <Activity className="h-4 w-4 animate-pulse" />;
      color = 'text-blue-400';
    }

    return { totalPending: pending, statusLabel: label, statusIcon: icon, statusColor: color, hasErrors: errors };
  }, [outbox?.total, powerSyncStatus, isActuallyOnline, error, isSyncing, isInitialized]);

  // ⚡ إخفاء المكون في المتصفح
  if (!isDesktopApp) return null;
  if (!organization?.id) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "relative flex items-center justify-center",
            "h-7 w-7 sm:h-9 sm:w-9", // حجم أصغر على الهاتف
            "rounded-lg sm:rounded-xl transition-all duration-200",
            "hover:bg-white/10 active:scale-95",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
            statusColor,
            className
          )}
          aria-label="حالة المزامنة"
          title={statusLabel}
        >
          {statusIcon}

          {/* Badge للعناصر المعلقة أو الأخطاء */}
          {(totalPending > 0 || hasErrors) && !isSyncing && (
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5 sm:h-3 sm:w-3">
              <span className={cn(
                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                hasErrors ? "bg-red-400" : "bg-amber-400"
              )} />
              <span className={cn(
                "relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 text-[7px] sm:text-[8px] text-white items-center justify-center font-bold",
                hasErrors ? "bg-red-500" : "bg-amber-500"
              )}>
                {hasErrors ? '!' : (totalPending > 9 ? '9+' : totalPending)}
              </span>
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[calc(100vw-16px)] sm:w-[420px] max-w-[420px] p-0" align="end">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="font-bold text-sm flex items-center gap-2">
                <Database className="h-4 w-4" />
                حالة المزامنة
              </h4>
              <p className="text-xs text-muted-foreground">{statusLabel}</p>
            </div>
            <Button
              size="sm"
              onClick={handleSync}
              disabled={isSyncing || !isActuallyOnline}
              className="h-8"
            >
              {isSyncing ? (
                <RefreshCw className="h-3 w-3 animate-spin ml-1" />
              ) : (
                <RefreshCw className="h-3 w-3 ml-1" />
              )}
              مزامنة
            </Button>
          </div>

          <Separator className="mb-3" />

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ViewTab)}>
            <TabsList className="w-full grid grid-cols-4 h-8">
              <TabsTrigger value="summary" className="text-xs h-7 px-2">
                <Activity className="h-3 w-3 ml-1" />
                ملخص
              </TabsTrigger>
              <TabsTrigger value="details" className="text-xs h-7 px-2">
                <LayoutList className="h-3 w-3 ml-1" />
                تفاصيل
              </TabsTrigger>
              <TabsTrigger value="database" className="text-xs h-7 px-2">
                <HardDrive className="h-3 w-3 ml-1" />
                محلي
              </TabsTrigger>
              <TabsTrigger value="errors" className="text-xs h-7 px-2 relative">
                <Bug className="h-3 w-3 ml-1" />
                أخطاء
                {hasErrors && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </TabsTrigger>
            </TabsList>

            {/* المحتوى مع السكرول */}
            <ScrollArea className="h-[380px] mt-3">
              <div className="pr-3">
                {/* تبويب الملخص */}
                <TabsContent value="summary" className="mt-0 space-y-4">
                  {/* تحذيرات */}
                  {powerSyncStatus?.syncRulesDeployed === false && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                      <div className="flex items-center gap-2 text-sm text-amber-700 mb-2">
                        <AlertCircle className="h-4 w-4" />
                        <span className="font-medium">Sync Rules غير منشورة</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        يرجى نشر القواعد من PowerSync Dashboard
                      </p>
                    </div>
                  )}

                  {powerSyncStatus?.connected && !powerSyncStatus?.hasSynced && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <div className="flex items-center gap-2 text-sm text-amber-600 mb-2">
                        <Activity className="h-4 w-4 animate-pulse" />
                        <span className="font-medium">المزامنة الأولى لم تكتمل</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        PowerSync متصل لكن البيانات لم تُحمّل بعد
                      </p>
                    </div>
                  )}

                  {/* ملخص المزامنة */}
                  <SyncSummary
                    snapshot={snapshot}
                    powerSyncStatus={powerSyncStatus}
                  />

                  {/* الإحصائيات المختصرة */}
                  <SyncStatsGrid snapshot={snapshot} />

                  {/* Outbox Panel */}
                  <OutboxDetailsPanel
                    outbox={outbox}
                    powerSyncStatus={powerSyncStatus}
                    error={error}
                    isOnline={isActuallyOnline}
                    isSyncing={isSyncing}
                    onSync={handleSync}
                  />
                </TabsContent>

                {/* تبويب التفاصيل */}
                <TabsContent value="details" className="mt-0">
                  <SyncStatsGridExpanded snapshot={snapshot} />
                </TabsContent>

                {/* تبويب قاعدة البيانات المحلية */}
                <TabsContent value="database" className="mt-0">
                  <LocalDatabaseView
                    snapshot={snapshot}
                    isLoading={isLoading}
                  />
                </TabsContent>

                {/* تبويب الأخطاء */}
                <TabsContent value="errors" className="mt-0">
                  <ErrorsDetectionView
                    snapshot={snapshot}
                    powerSyncStatus={powerSyncStatus}
                    onRefresh={refresh}
                  />
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>

          <Separator className="my-3" />

          {/* معلومات الاتصال */}
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              {isActuallyOnline ? (
                <Wifi className="h-3 w-3 text-emerald-500" />
              ) : (
                <WifiOff className="h-3 w-3 text-red-500" />
              )}
              <span>{isActuallyOnline ? 'متصل' : 'غير متصل'}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className={cn(
                "w-2 h-2 rounded-full",
                powerSyncStatus?.connected ? 'bg-emerald-500' : 'bg-red-500'
              )} />
              <span>PowerSync</span>
            </div>
            {powerSyncStatus?.lastSyncedAt && (
              <span>
                آخر: {new Date(powerSyncStatus.lastSyncedAt).toLocaleTimeString('ar-SA')}
              </span>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
