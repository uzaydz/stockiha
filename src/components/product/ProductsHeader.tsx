import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Sliders, Search, FileUp, Loader2 } from 'lucide-react';
import { PlusCircle } from 'lucide-react';
import BulkBarcodePrint from './BulkBarcodePrint';
import type { Product } from '@/lib/api/products';

interface ProductsHeaderProps {
  productCount: number;
  onAddProduct: () => void;
  products?: Product[];
  onAddProductClick: () => void;
  onSearchChange: (query: string) => void;
  searchQuery: string;
  onSortChange: (value: string) => void;
  sortOption: string;
  totalProducts: number;
  onShowFilter: () => void;
  isSyncing?: boolean;
  unsyncedCount?: number;
  onSync?: () => Promise<void>;
}

const ProductsHeader = ({
  productCount,
  onAddProduct,
  products = [],
  onAddProductClick,
  onSearchChange,
  searchQuery,
  onSortChange,
  sortOption,
  totalProducts,
  onShowFilter,
  isSyncing = false,
  unsyncedCount = 0,
  onSync
}: ProductsHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4 items-stretch md:gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">المنتجات</h1>
          <p className="text-muted-foreground text-sm">
            إدارة {totalProducts || 0} منتج في متجرك
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            variant="default" 
            className="w-1/2 sm:w-auto whitespace-nowrap" 
            onClick={() => navigate('/dashboard/product/new')}
          >
            <Plus className="h-4 w-4 ml-2" />
            إضافة منتج
          </Button>
          <Button 
            variant="outline" 
            className="w-1/2 sm:w-auto whitespace-nowrap"
            onClick={onAddProductClick}
          >
            <Plus className="h-4 w-4 ml-2" />
            إضافة سريع
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 w-full">
        <div className="relative lg:col-span-3">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ابحث في المنتجات..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="lg:col-span-1">
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={onShowFilter}
          >
            <Sliders className="h-4 w-4 ml-2" />
            فلترة
          </Button>
        </div>
        <div className="lg:col-span-1">
          <Select value={sortOption} onValueChange={onSortChange}>
            <SelectTrigger>
              <SelectValue placeholder="الفرز حسب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">الأحدث</SelectItem>
              <SelectItem value="oldest">الأقدم</SelectItem>
              <SelectItem value="price-high">السعر (من الأعلى)</SelectItem>
              <SelectItem value="price-low">السعر (من الأقل)</SelectItem>
              <SelectItem value="name-asc">الاسم (أ-ي)</SelectItem>
              <SelectItem value="name-desc">الاسم (ي-أ)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {onSync && (
          <div className="lg:col-span-1">
            <Button 
              variant={unsyncedCount > 0 ? "destructive" : "outline"} 
              className="w-full relative" 
              onClick={onSync}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              ) : (
                <FileUp className="h-4 w-4 ml-2" />
              )}
              مزامنة
              {unsyncedCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unsyncedCount}
                </span>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductsHeader; 