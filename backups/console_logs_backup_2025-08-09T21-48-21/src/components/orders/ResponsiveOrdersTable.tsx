import React, { memo, useState, useEffect } from "react";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { Button } from "@/components/ui/button";
import { Grid, LayoutList, Monitor, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

import OrdersTable from "./table/OrdersTable";
import OrdersCardView from "./cards/OrdersCardView";
import { type ExtendedOrdersTableProps } from "./table/OrderTableTypes";

interface ResponsiveOrdersTableProps extends ExtendedOrdersTableProps {
  forceViewMode?: 'auto' | 'table' | 'cards';
  defaultMobileViewMode?: 'grid' | 'list';
}

const ResponsiveOrdersTable = memo(({
  forceViewMode = 'auto',
  defaultMobileViewMode = 'grid',
  ...props
}: ResponsiveOrdersTableProps) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(defaultMobileViewMode);
  const [userPreference, setUserPreference] = useState<'auto' | 'table' | 'cards'>('auto');

  // لا نستخدم virtualization مؤقتاً على سطح المكتب لتفادي عدم تطابق الأعمدة
  
  // Responsive breakpoints
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');
  
  // تحديد العرض المناسب
  const shouldShowCards = (() => {
    if (forceViewMode === 'cards') return true;
    if (forceViewMode === 'table') return false;
    if (userPreference === 'cards') return true;
    if (userPreference === 'table') return false;
    // Auto mode: cards on mobile/tablet, table on desktop
    return isMobile || isTablet;
  })();

  // Load user preference from localStorage
  useEffect(() => {
    const savedPreference = localStorage.getItem('orders-view-preference');
    if (savedPreference && ['auto', 'table', 'cards'].includes(savedPreference)) {
      setUserPreference(savedPreference as 'auto' | 'table' | 'cards');
    }
  }, []);

  // Save user preference to localStorage
  const handlePreferenceChange = (preference: 'auto' | 'table' | 'cards') => {
    setUserPreference(preference);
    localStorage.setItem('orders-view-preference', preference);
  };

  // Handle mobile view mode change
  const handleMobileViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('orders-mobile-view-mode', mode);
  };

  // Load mobile view mode from localStorage
  useEffect(() => {
    const savedMobileMode = localStorage.getItem('orders-mobile-view-mode');
    if (savedMobileMode && ['grid', 'list'].includes(savedMobileMode)) {
      setViewMode(savedMobileMode as 'grid' | 'list');
    }
  }, []);

  return (
    <div className="relative">
      {/* View Toggle Controls - Only show when not forced */}
      {forceViewMode === 'auto' && (
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">عرض:</span>
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
              <Button
                variant={userPreference === 'auto' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handlePreferenceChange('auto')}
                className="h-8 px-3"
              >
                <Monitor className="h-4 w-4 mr-1" />
                تلقائي
              </Button>
              <Button
                variant={userPreference === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handlePreferenceChange('table')}
                className="h-8 px-3"
              >
                <LayoutList className="h-4 w-4 mr-1" />
                جدول
              </Button>
              <Button
                variant={userPreference === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handlePreferenceChange('cards')}
                className="h-8 px-3"
              >
                <Grid className="h-4 w-4 mr-1" />
                بطاقات
              </Button>
            </div>
          </div>

          {/* Current view indicator */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {shouldShowCards ? (
              <>
                <Smartphone className="h-4 w-4" />
                <span>عرض البطاقات</span>
              </>
            ) : (
              <>
                <Monitor className="h-4 w-4" />
                <span>عرض الجدول</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Render appropriate component */}
      <div className={cn(
        "transition-all duration-300",
        shouldShowCards && "bg-gradient-to-br from-background to-muted/20"
      )}>
        {shouldShowCards ? (
          <OrdersCardView
            {...props}
            viewMode={viewMode}
            onViewModeChange={handleMobileViewModeChange}
          />
        ) : (
          <OrdersTable {...props} />
        )}
      </div>

      {/* Performance indicator for mobile */}
      {shouldShowCards && isMobile && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-primary/10 text-primary text-xs px-3 py-1 rounded-full border border-primary/20">
            محسن للهاتف
          </div>
        </div>
      )}
    </div>
  );
});

ResponsiveOrdersTable.displayName = "ResponsiveOrdersTable";

export default ResponsiveOrdersTable;
