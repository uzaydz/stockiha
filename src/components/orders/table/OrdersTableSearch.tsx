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
    <div className="p-4 bg-muted/20 border-b border-border/30">
      <div className="space-y-3">
        <div className="flex flex-col space-y-3 lg:flex-row lg:space-y-0 lg:space-x-3 lg:items-center lg:justify-between">
          <div className="relative flex items-center w-full lg:w-96">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground z-10" />
            <Input
              type="search"
              placeholder="ابحث برقم الطلب أو اسم العميل..."
              className="pl-10 pr-4 py-2 w-full rounded-lg border border-border/40 bg-card focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all text-sm"
              value={searchFilter}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {searchFilter && (
              <div className="absolute right-3 text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
                {filteredOrdersCount}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {selectedOrders.length > 0 && (
              <div className="bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5">
                <span className="font-semibold text-primary">{selectedOrders.length}</span>
                <span className="text-primary/80">محدد</span>
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

            <Button variant="outline" size="sm" className="gap-1.5 px-3 py-1.5 h-8 rounded-lg border-border/40 bg-card hover:bg-muted/60 hover:border-primary/30 transition-all text-xs">
              <Filter className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">تصفية</span>
            </Button>

            <Button variant="outline" size="sm" className="gap-1.5 px-3 py-1.5 h-8 rounded-lg border-border/40 bg-card hover:bg-muted/60 hover:border-primary/30 transition-all text-xs">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">الأعمدة</span>
            </Button>

            <Button variant="outline" size="sm" className="gap-1.5 px-3 py-1.5 h-8 rounded-lg border-border/40 bg-card hover:bg-muted/60 hover:border-primary/30 transition-all text-xs">
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">تصدير</span>
            </Button>

            <Button variant="outline" size="sm" className="gap-1.5 px-3 py-1.5 h-8 rounded-lg border-border/40 bg-card hover:bg-muted/60 hover:border-primary/30 transition-all text-xs">
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">طباعة</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

OrdersTableSearch.displayName = "OrdersTableSearch";

export default OrdersTableSearch;
