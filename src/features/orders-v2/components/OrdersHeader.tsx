/**
 * OrdersHeader - رأس صفحة الطلبيات المحسن
 */

import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, ListFilter } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useOrders } from '../context/OrdersContext';
import type { ViewMode } from '../types';

const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  all: 'كل الطلبيات',
  mine: 'طلبياتي',
  unassigned: 'غير المعينة',
};

const OrdersHeader: React.FC = () => {
  const {
    displayOrders,
    viewMode,
    setViewMode,
    refresh,
    loading,
  } = useOrders();

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">الطلبيات</h1>
        <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded-md">
          {displayOrders.length} طلبية
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* View Mode Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <ListFilter className="h-4 w-4" />
              {VIEW_MODE_LABELS[viewMode]}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(Object.keys(VIEW_MODE_LABELS) as ViewMode[]).map((mode) => (
              <DropdownMenuItem
                key={mode}
                onClick={() => setViewMode(mode)}
                className={viewMode === mode ? 'bg-primary/10' : ''}
              >
                {VIEW_MODE_LABELS[mode]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Refresh Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
      </div>
    </div>
  );
};

export default memo(OrdersHeader);
