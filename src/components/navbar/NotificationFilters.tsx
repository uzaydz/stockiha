import React from 'react';
import { cn } from '@/lib/utils';

interface NotificationFiltersProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  counts: {
    all: number;
    unread: number;
    urgent: number;
    orders: number;
    stock: number;
  };
}

export function NotificationFilters({ activeTab, onTabChange, counts }: NotificationFiltersProps) {
  const tabs = [
    { value: 'all', label: 'الكل', count: counts.all },
    { value: 'unread', label: 'جديد', count: counts.unread },
    { value: 'urgent', label: 'عاجل', count: counts.urgent },
    { value: 'orders', label: 'طلبات', count: counts.orders },
    { value: 'stock', label: 'مخزون', count: counts.stock },
  ];

  return (
    <div className="flex gap-1 p-2 border-b bg-background overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onTabChange(tab.value)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors",
            activeTab === tab.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {tab.label}
          {tab.count > 0 && (
            <span className={cn(
              "min-w-[18px] h-[18px] rounded-full text-[10px] flex items-center justify-center",
              activeTab === tab.value
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-muted-foreground/20 text-muted-foreground"
            )}>
              {tab.count > 99 ? '99+' : tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
