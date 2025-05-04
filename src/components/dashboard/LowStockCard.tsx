import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface LowStockCardProps {
  products: any[];
}

const LowStockCard = ({ products }: LowStockCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-end">
          <span>تنبيه المخزون المنخفض</span>
          <AlertTriangle className="h-4 w-4 text-yellow-500 ml-2" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {products.length > 0 ? (
            <>
              {products.map((product) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-sm font-medium">
                      المتبقي: <span className="text-yellow-500">{product.stock_quantity}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{product.sku}</p>
                  </div>
                  <div className="flex items-center">
                    <p className="text-sm font-medium truncate max-w-[150px]">
                      {product.name}
                    </p>
                    <div className="h-8 w-8 rounded-md bg-muted ml-2 overflow-hidden">
                      <img
                        src={product.thumbnailImage || '/placeholder.svg'}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button asChild variant="outline" className="w-full">
                <Link to="/dashboard/products">إدارة المخزون</Link>
              </Button>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground">لا توجد منتجات بمخزون منخفض</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LowStockCard;
