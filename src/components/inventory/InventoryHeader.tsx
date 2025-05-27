import { Database, Package, PackageX, PackageMinus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StockStatsType {
  total: number;
  inStock: number;
  outOfStock: number;
  lowStock: number;
}

interface InventoryHeaderProps {
  stockStats: StockStatsType;
}

const InventoryHeader = ({ stockStats }: InventoryHeaderProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <div className="bg-primary/10 dark:bg-primary/20 p-3 rounded-full">
          <Database className="h-6 w-6 text-primary dark:text-primary/90" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground dark:text-zinc-100">إدارة المخزون</h1>
          <p className="text-muted-foreground dark:text-zinc-400">
            متابعة وتحديث كميات المنتجات في المخزون
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Stock Items */}
        <div className="bg-background dark:bg-zinc-900 border dark:border-zinc-800 rounded-lg p-4 flex items-center shadow-sm">
          <div className="bg-primary/10 dark:bg-primary/20 p-3 rounded-full ml-4">
            <Package className="h-5 w-5 text-primary dark:text-primary/90" />
          </div>
          <div>
            <p className="text-muted-foreground dark:text-zinc-400 text-sm">إجمالي المنتجات</p>
            <p className="text-2xl font-bold text-foreground dark:text-zinc-100">{stockStats.total}</p>
          </div>
        </div>
        
        {/* In Stock Items */}
        <div className="bg-background dark:bg-zinc-900 border dark:border-zinc-800 rounded-lg p-4 flex items-center shadow-sm">
          <div className={cn(
            "p-3 rounded-full ml-4",
            "bg-green-100 dark:bg-green-900/30"
          )}>
            <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-muted-foreground dark:text-zinc-400 text-sm">متوفر في المخزون</p>
            <p className="text-2xl font-bold text-foreground dark:text-zinc-100">{stockStats.inStock}</p>
          </div>
        </div>
        
        {/* Low Stock Items */}
        <div className="bg-background dark:bg-zinc-900 border dark:border-zinc-800 rounded-lg p-4 flex items-center shadow-sm">
          <div className={cn(
            "p-3 rounded-full ml-4",
            "bg-amber-100 dark:bg-amber-900/30"
          )}>
            <PackageMinus className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-muted-foreground dark:text-zinc-400 text-sm">منخفض المخزون</p>
            <p className="text-2xl font-bold text-foreground dark:text-zinc-100">{stockStats.lowStock}</p>
          </div>
        </div>
        
        {/* Out of Stock Items */}
        <div className="bg-background dark:bg-zinc-900 border dark:border-zinc-800 rounded-lg p-4 flex items-center shadow-sm">
          <div className={cn(
            "p-3 rounded-full ml-4",
            "bg-red-100 dark:bg-red-900/30"
          )}>
            <PackageX className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-muted-foreground dark:text-zinc-400 text-sm">نفذ من المخزون</p>
            <p className="text-2xl font-bold text-foreground dark:text-zinc-100">{stockStats.outOfStock}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryHeader;
