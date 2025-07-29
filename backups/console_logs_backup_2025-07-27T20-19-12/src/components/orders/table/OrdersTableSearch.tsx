import { memo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  Filter, 
  SlidersHorizontal, 
  Download, 
  Printer 
} from "lucide-react";
import OrderBulkActions from "./OrderBulkActions";

interface OrdersTableSearchProps {
  searchFilter: string;
  onSearchChange: (value: string) => void;
  filteredOrdersCount: number;
  selectedOrders: string[];
  onBulkUpdateStatus?: (orderIds: string[], newStatus: string, userId?: string) => Promise<void>;
  onResetSelections: () => void;
  hasUpdatePermission: boolean;
  hasCancelPermission: boolean;
}

const OrdersTableSearch = memo(({
  searchFilter,
  onSearchChange,
  filteredOrdersCount,
  selectedOrders,
  onBulkUpdateStatus,
  onResetSelections,
  hasUpdatePermission,
  hasCancelPermission,
}: OrdersTableSearchProps) => {
  return (
    <div className="p-5">
      <div className="mb-6 space-y-4">
        <div className="flex flex-col space-y-4 lg:flex-row lg:space-y-0 lg:space-x-4 lg:items-center lg:justify-between">
          <div className="relative flex items-center w-full lg:w-96">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground z-10" />
            <Input
              type="search"
              placeholder="البحث في الطلبات..."
              className="pl-10 pr-4 py-2.5 w-full rounded-lg border border-border/40 bg-background/50 backdrop-blur-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-foreground placeholder:text-muted-foreground"
              value={searchFilter}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {searchFilter && (
              <div className="absolute right-3 text-xs text-muted-foreground bg-primary/10 px-2 py-1 rounded-md">
                {filteredOrdersCount}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            {selectedOrders.length > 0 && (
              <div className="bg-primary/10 border border-primary/30 px-4 py-2 rounded-lg text-sm flex items-center gap-2 backdrop-blur-sm">
                <span className="font-semibold text-primary">{selectedOrders.length}</span>
                <span className="text-primary/80">طلب محدد</span>
              </div>
            )}
            
            {selectedOrders.length > 0 && onBulkUpdateStatus && (
              <OrderBulkActions
                selectedOrders={selectedOrders}
                onUpdateStatus={onBulkUpdateStatus}
                onReset={onResetSelections}
                hasUpdatePermission={hasUpdatePermission}
                hasCancelPermission={hasCancelPermission}
              />
            )}
            
            <Button variant="outline" size="sm" className="gap-2 px-4 py-2 rounded-lg border-border/40 bg-background/50 backdrop-blur-sm hover:bg-accent/50 hover:border-primary/30 transition-all duration-200">
              <Filter className="h-4 w-4" />
              <span>تصفية</span>
            </Button>
            
            <Button variant="outline" size="sm" className="gap-2 px-4 py-2 rounded-lg border-border/40 bg-background/50 backdrop-blur-sm hover:bg-accent/50 hover:border-primary/30 transition-all duration-200">
              <SlidersHorizontal className="h-4 w-4" />
              <span>الأعمدة</span>
            </Button>
            
            <Button variant="outline" size="sm" className="gap-2 px-4 py-2 rounded-lg border-border/40 bg-background/50 backdrop-blur-sm hover:bg-accent/50 hover:border-primary/30 transition-all duration-200">
              <Download className="h-4 w-4" />
              <span>تصدير</span>
            </Button>
            
            <Button variant="outline" size="sm" className="gap-2 px-4 py-2 rounded-lg border-border/40 bg-background/50 backdrop-blur-sm hover:bg-accent/50 hover:border-primary/30 transition-all duration-200">
              <Printer className="h-4 w-4" />
              <span>طباعة</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

OrdersTableSearch.displayName = "OrdersTableSearch";

export default OrdersTableSearch; 