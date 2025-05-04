import { Database, Package, PackageX, PackageMinus } from 'lucide-react';

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
        <div className="bg-primary/10 p-3 rounded-full">
          <Database className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">إدارة المخزون</h1>
          <p className="text-muted-foreground">
            متابعة وتحديث كميات المنتجات في المخزون
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Stock Items */}
        <div className="bg-background border rounded-lg p-4 flex items-center">
          <div className="bg-primary/10 p-3 rounded-full ml-4">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-muted-foreground text-sm">إجمالي المنتجات</p>
            <p className="text-2xl font-bold">{stockStats.total}</p>
          </div>
        </div>
        
        {/* In Stock Items */}
        <div className="bg-background border rounded-lg p-4 flex items-center">
          <div className="bg-green-100 p-3 rounded-full ml-4">
            <Package className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-muted-foreground text-sm">متوفر في المخزون</p>
            <p className="text-2xl font-bold">{stockStats.inStock}</p>
          </div>
        </div>
        
        {/* Low Stock Items */}
        <div className="bg-background border rounded-lg p-4 flex items-center">
          <div className="bg-amber-100 p-3 rounded-full ml-4">
            <PackageMinus className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-muted-foreground text-sm">منخفض المخزون</p>
            <p className="text-2xl font-bold">{stockStats.lowStock}</p>
          </div>
        </div>
        
        {/* Out of Stock Items */}
        <div className="bg-background border rounded-lg p-4 flex items-center">
          <div className="bg-red-100 p-3 rounded-full ml-4">
            <PackageX className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="text-muted-foreground text-sm">نفذ من المخزون</p>
            <p className="text-2xl font-bold">{stockStats.outOfStock}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryHeader; 