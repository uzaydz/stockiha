import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ShoppingCart, X, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CartTab {
  id: string;
  name: string;
  cartItems: any[];
  selectedServices: any[];
  selectedSubscriptions: any[];
  customerId?: string;
  customerName?: string;
  discount?: number;
  discountAmount?: number;
  discountType?: 'percentage' | 'fixed';
}

interface CartTabsProps {
  tabs: CartTab[];
  activeTabId: string;
  setActiveTabId: (tabId: string) => void;
  removeTab: (tabId: string) => void;
}

const CartTabs: React.FC<CartTabsProps> = ({
  tabs,
  activeTabId,
  setActiveTabId,
  removeTab
}) => {
  if (tabs.length <= 1) {
    return null;
  }

  return (
    <div className="px-4 pb-3 pt-2">
      <div className="flex items-center gap-2 mb-2">
        <Layers className="h-4 w-4 text-slate-600 dark:text-slate-400" />
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">التبويبات النشطة</span>
      </div>
      <Tabs value={activeTabId} onValueChange={setActiveTabId}>
        <TabsList className="w-full h-auto p-1.5 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 border border-slate-200/60 dark:border-slate-700/60 rounded-xl shadow-sm">
          {tabs.map((tab, index) => {
            const itemCount = tab.cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
            const isActive = tab.id === activeTabId;
            
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "group flex-1 text-xs relative h-10 rounded-lg transition-all duration-200",
                  "data-[state=active]:bg-gradient-to-br data-[state=active]:from-muted data-[state=active]:to-muted/50 dark:data-[state=active]:from-slate-700 dark:data-[state=active]:to-slate-800",
                  "data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-primary/30",
                  "data-[state=inactive]:hover:bg-slate-50/50 dark:data-[state=inactive]:hover:bg-slate-800/50"
                )}
              >
                <div className="flex items-center gap-2 px-1">
                  <div className={cn(
                    "p-1 rounded-md transition-colors",
                    isActive ? "bg-primary/10" : "bg-slate-200/60 dark:bg-slate-700/60 group-hover:bg-slate-300/60 dark:group-hover:bg-slate-600/60"
                  )}>
                    <ShoppingCart className={cn(
                      "h-3.5 w-3.5 transition-colors",
                      isActive ? "text-primary" : "text-slate-600 dark:text-slate-400"
                    )} />
                  </div>
                  <span className={cn(
                    "truncate max-w-[50px] font-semibold transition-colors",
                    isActive ? "text-slate-900 dark:text-slate-50" : "text-slate-600 dark:text-slate-400"
                  )}>
                    {typeof tab.name === 'string' ? tab.name : `#${index + 1}`}
                  </span>
                  {itemCount > 0 && (
                    <Badge className={cn(
                      "text-[10px] h-4 px-1.5 rounded-md font-bold",
                      isActive 
                        ? "bg-primary/10 text-primary border border-primary/20" 
                        : "bg-slate-200/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 border border-slate-300/60 dark:border-slate-600/60"
                    )}>
                      {itemCount}
                    </Badge>
                  )}
                </div>
                {tabs.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTab(tab.id);
                    }}
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 p-0 shadow-md border-2 border-white dark:border-slate-900 transition-all hover:scale-110 active:scale-95"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
    </div>
  );
};

export default React.memo(CartTabs);
