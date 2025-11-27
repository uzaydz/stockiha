/**
 * ⚡ مكون عرض إحصائيات المزامنة
 */

import React from 'react';
import type { SyncSnapshot } from './types';

interface SyncStatsGridProps {
  snapshot: SyncSnapshot;
}

interface StatItemProps {
  label: string;
  unsynced: number;
  total: number;
}

function StatItem({ label, unsynced, total }: StatItemProps) {
  return (
    <div className="p-2 rounded-lg bg-muted/50">
      <p className="text-lg font-bold text-foreground">
        {unsynced}
        <span className="text-xs text-muted-foreground">/{total}</span>
      </p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

export function SyncStatsGrid({ snapshot }: SyncStatsGridProps) {
  return (
    <div className="space-y-2">
      {/* الصف الأول */}
      <div className="grid grid-cols-6 gap-2 text-center">
        <StatItem 
          label="منتجات" 
          unsynced={snapshot.products.unsynced} 
          total={snapshot.products.total} 
        />
        <StatItem 
          label="طلبات" 
          unsynced={snapshot.orders.unsynced} 
          total={snapshot.orders.total} 
        />
        <StatItem 
          label="عملاء" 
          unsynced={snapshot.customers.unsynced} 
          total={snapshot.customers.total} 
        />
        <StatItem 
          label="موردين" 
          unsynced={snapshot.suppliers.unsynced} 
          total={snapshot.suppliers.total} 
        />
        <StatItem 
          label="موظفين" 
          unsynced={snapshot.employees.unsynced} 
          total={snapshot.employees.total} 
        />
        <StatItem 
          label="تصليح" 
          unsynced={snapshot.repairs.unsynced} 
          total={snapshot.repairs.total} 
        />
      </div>
    </div>
  );
}

// ⚡ مكون موسع يعرض كل الإحصائيات
export function SyncStatsGridExpanded({ snapshot }: SyncStatsGridProps) {
  return (
    <div className="space-y-2">
      {/* الصف الأول - الأساسيات */}
      <div className="grid grid-cols-6 gap-2 text-center">
        <StatItem 
          label="منتجات" 
          unsynced={snapshot.products.unsynced} 
          total={snapshot.products.total} 
        />
        <StatItem 
          label="طلبات" 
          unsynced={snapshot.orders.unsynced} 
          total={snapshot.orders.total} 
        />
        <StatItem 
          label="عملاء" 
          unsynced={snapshot.customers.unsynced} 
          total={snapshot.customers.total} 
        />
        <StatItem 
          label="موردين" 
          unsynced={snapshot.suppliers.unsynced} 
          total={snapshot.suppliers.total} 
        />
        <StatItem 
          label="موظفين" 
          unsynced={snapshot.employees.unsynced} 
          total={snapshot.employees.total} 
        />
        <StatItem 
          label="تصليح" 
          unsynced={snapshot.repairs.unsynced} 
          total={snapshot.repairs.total} 
        />
      </div>
      
      {/* الصف الثاني - إضافية */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <StatItem 
          label="فواتير" 
          unsynced={snapshot.invoices.unsynced} 
          total={snapshot.invoices.total} 
        />
        <StatItem 
          label="جلسات" 
          unsynced={snapshot.workSessions.unsynced} 
          total={snapshot.workSessions.total} 
        />
        <StatItem 
          label="مرتجعات" 
          unsynced={snapshot.returns.unsynced} 
          total={snapshot.returns.total} 
        />
        <StatItem 
          label="ديون" 
          unsynced={snapshot.debts.unsynced} 
          total={snapshot.debts.total} 
        />
      </div>
    </div>
  );
}
