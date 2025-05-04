import { PlusCircle, FileUp, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BulkBarcodePrint from './BulkBarcodePrint';
import type { Product } from '@/lib/api/products';

interface ProductsHeaderProps {
  productCount: number;
  onAddProduct: () => void;
  products?: Product[];
}

const ProductsHeader = ({ productCount, onAddProduct, products = [] }: ProductsHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b pb-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">المنتجات</h1>
        <p className="text-muted-foreground">
          إدارة منتجاتك - لديك {productCount} منتج
        </p>
      </div>
      <div className="flex items-center gap-2 mt-4 sm:mt-0">
        {products.length > 0 && (
          <BulkBarcodePrint products={products} />
        )}
        <Button variant="outline">
          <FileUp className="ml-2 h-4 w-4" />
          استيراد
        </Button>
        <Button onClick={onAddProduct}>
          <PlusCircle className="ml-2 h-4 w-4" />
          إضافة منتج
        </Button>
      </div>
    </div>
  );
};

export default ProductsHeader; 