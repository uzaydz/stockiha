import { AlertTriangle, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface LowStockCardProps {
  products: any[];
}

const LowStockCard = ({ products }: LowStockCardProps) => {
  return (
    <div className="h-full">
        <div className="space-y-3">
          {products.length > 0 ? (
            <>
              {products.map((product) => (
                <div 
                  key={product.id} 
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl transition-all duration-300 group",
                    "bg-gradient-to-br from-background/60 to-background/40 backdrop-blur-sm border border-border/30",
                    "hover:shadow-md hover:scale-[1.02] cursor-pointer"
                  )}
                >
                  <div className="text-left">
                    <p className="text-sm font-medium">
                      المتبقي: <span className="font-bold text-yellow-600 dark:text-yellow-400 bg-gradient-to-r from-yellow-600 to-yellow-500 bg-clip-text text-transparent">{product.stock_quantity}</span>
                    </p>
                    <p className="text-xs text-muted-foreground font-medium">{product.sku}</p>
                  </div>
                  <div className="flex items-center">
                    <p className="text-sm font-semibold truncate max-w-[150px] group-hover:text-primary transition-colors duration-300">
                      {product.name}
                    </p>
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 ml-2 overflow-hidden border border-border/30 group-hover:scale-110 transition-transform duration-300">
                      <img
                        src={product.thumbnailImage || '/placeholder.svg'}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button 
                asChild 
                variant="outline" 
                className={cn(
                  "w-full mt-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20",
                  "hover:bg-gradient-to-br hover:from-primary/20 hover:to-primary/10 hover:border-primary/30",
                  "text-primary font-semibold transition-all duration-300"
                )}
              >
                <Link to="/dashboard/products" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  إدارة المخزون
                </Link>
              </Button>
            </>
          ) : (
            <div className={cn(
              "text-center p-6 rounded-xl",
              "bg-gradient-to-br from-muted/30 to-muted/20",
              "border border-border/20"
            )}>
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 inline-block mb-3">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <p className="text-muted-foreground font-medium">لا توجد منتجات بمخزون منخفض</p>
            </div>
          )}
        </div>
    </div>
  );
};

export default LowStockCard;
