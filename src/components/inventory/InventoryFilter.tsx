import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface InventoryFilterProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  categories: string[];
  selectedCategory: string | null;
  onCategoryChange: (value: string | null) => void;
  sortOption: string;
  onSortChange: (value: string) => void;
  stockFilter: string;
  onStockFilterChange: (value: string) => void;
}

const InventoryFilter = ({
  searchQuery,
  onSearchChange,
  categories,
  selectedCategory,
  onCategoryChange,
  sortOption,
  onSortChange,
  stockFilter,
  onStockFilterChange,
}: InventoryFilterProps) => {
  return (
    <div className="bg-background border rounded-lg p-4 shadow-sm">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="البحث عن منتج بالاسم، الرمز، الباركود..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-3 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => onSearchChange('')}
            >
              <X className="h-3 w-3" />
              <span className="sr-only">مسح البحث</span>
            </Button>
          )}
        </div>

        {/* Category Filter */}
        <div className="w-full md:w-[200px]">
          <Select
            value={selectedCategory || 'all'}
            onValueChange={(value) => onCategoryChange(value === 'all' ? null : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="كل الفئات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الفئات</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sort Options */}
        <div className="w-full md:w-[200px]">
          <Select value={sortOption} onValueChange={onSortChange}>
            <SelectTrigger>
              <SelectValue placeholder="ترتيب حسب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stock-low">المخزون: من الأقل</SelectItem>
              <SelectItem value="stock-high">المخزون: من الأكثر</SelectItem>
              <SelectItem value="name-asc">الاسم: أ-ي</SelectItem>
              <SelectItem value="name-desc">الاسم: ي-أ</SelectItem>
              <SelectItem value="sku">رمز المنتج (SKU)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stock Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              فلترة المخزون
              {(stockFilter !== 'all') && (
                <Badge variant="secondary" className="ml-1 rounded-sm px-1 py-0">
                  1
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[220px]">
            <DropdownMenuLabel>حالة المخزون</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuGroup>
              <DropdownMenuRadioGroup value={stockFilter} onValueChange={onStockFilterChange}>
                <DropdownMenuRadioItem value="all">جميع المنتجات</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="in-stock">متوفر في المخزون</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="low-stock">منخفض المخزون</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="out-of-stock">نفذ من المخزون</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Active Filters */}
      {(selectedCategory || stockFilter !== 'all') && (
        <div className="flex flex-wrap gap-2 mt-3">
          {selectedCategory && (
            <Badge variant="secondary" className="gap-2">
              الفئة: {selectedCategory}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => onCategoryChange(null)}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">إزالة الفلتر</span>
              </Button>
            </Badge>
          )}
          {stockFilter !== 'all' && (
            <Badge variant="secondary" className="gap-2">
              المخزون:{' '}
              {stockFilter === 'in-stock'
                ? 'متوفر'
                : stockFilter === 'out-of-stock'
                ? 'نفذ'
                : 'منخفض'}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => onStockFilterChange('all')}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">إزالة الفلتر</span>
              </Button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default InventoryFilter; 