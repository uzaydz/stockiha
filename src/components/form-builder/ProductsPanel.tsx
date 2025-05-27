import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

interface ProductItem {
  id: string;
  name: string;
  image: string;
}

interface ProductsPanelProps {
  availableProducts: ProductItem[];
  selectedProducts: string[];
  onToggleProduct: (productId: string) => void;
  onSelectAll: () => void;
  onUnselectAll: () => void;
}

export function ProductsPanel({
  availableProducts,
  selectedProducts,
  onToggleProduct,
  onSelectAll,
  onUnselectAll
}: ProductsPanelProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">منتجات النموذج</h2>
        <div className="flex space-x-2">
          <Button onClick={onSelectAll} variant="outline" size="sm">
            تحديد الكل
          </Button>
          <Button onClick={onUnselectAll} variant="outline" size="sm">
            إلغاء تحديد الكل
          </Button>
        </div>
      </div>
      
      <p className="mb-6 text-muted-foreground">
        حدد المنتجات التي سيظهر فيها هذا النموذج. إذا لم تحدد أي منتج، سيتم تطبيق النموذج على جميع المنتجات.
      </p>
      
      {availableProducts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">لا توجد منتجات متاحة</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableProducts.map(product => (
            <div
              key={product.id}
              className={`border rounded-lg p-3 flex items-center space-x-3 space-x-reverse cursor-pointer hover:bg-accent transition-colors ${
                selectedProducts.includes(product.id) ? 'border-primary bg-primary/5' : ''
              }`}
              onClick={() => onToggleProduct(product.id)}
            >
              <div className="relative w-12 h-12 rounded overflow-hidden border">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {product.name}
                </p>
              </div>
              <div className="flex-shrink-0">
                {selectedProducts.includes(product.id) ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
