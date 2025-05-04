import { Trash2, MinusCircle, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import type { Category } from '@/lib/api/categories';

interface StoreProductFiltersProps {
  categories: Category[];
  selectedCategory: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  priceRange: [number, number];
  onPriceRangeChange: (value: [number, number]) => void;
  stockFilter: string;
  onStockFilterChange: (value: string) => void;
  onResetFilters: () => void;
  className?: string;
}

const StoreProductFilters = ({
  categories,
  selectedCategory,
  onCategoryChange,
  priceRange,
  onPriceRangeChange,
  stockFilter,
  onStockFilterChange,
  onResetFilters,
  className
}: StoreProductFiltersProps) => {
  // Find min and max price from all products (calculated in parent component)
  const minPrice = priceRange[0];
  const maxPrice = priceRange[1];
  
  // Get the current selected min/max in the UI
  const currentMin = priceRange[0];
  const currentMax = priceRange[1];

  // Determine if any filter is active
  const hasActiveFilters = 
    selectedCategory !== null || 
    stockFilter !== 'all' || 
    (currentMin > minPrice || currentMax < maxPrice);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Reset Filters Button */}
      {hasActiveFilters && (
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full flex items-center justify-center gap-2"
          onClick={onResetFilters}
        >
          <Trash2 className="h-4 w-4" />
          إعادة ضبط الفلاتر
        </Button>
      )}
      
      {/* Price Range Filter */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">نطاق السعر</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-6">
            <Slider 
              defaultValue={[currentMin, currentMax]}
              min={minPrice}
              max={maxPrice}
              step={1}
              value={[currentMin, currentMax]}
              onValueChange={(value) => onPriceRangeChange(value as [number, number])}
              className="mt-6"
            />
            
            <div className="flex justify-between items-center">
              <div className="font-medium">{formatPrice(currentMin)}</div>
              <div className="font-medium">{formatPrice(currentMax)}</div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Categories Filter */}
      {categories.length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">الفئات</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <div 
                className={cn(
                  "cursor-pointer p-2 rounded-md hover:bg-muted flex justify-between items-center",
                  selectedCategory === null && "bg-muted/50 font-medium"
                )}
                onClick={() => onCategoryChange(null)}
              >
                <span>جميع الفئات</span>
                {selectedCategory === null && (
                  <Badge variant="outline" className="text-xs">
                    محدد
                  </Badge>
                )}
              </div>
              {categories.map((category) => (
                <div 
                  key={category.id}
                  className={cn(
                    "cursor-pointer p-2 rounded-md hover:bg-muted flex justify-between items-center",
                    selectedCategory === category.id && "bg-muted/50 font-medium"
                  )}
                  onClick={() => onCategoryChange(category.id)}
                >
                  <span>{category.name}</span>
                  {selectedCategory === category.id && (
                    <Badge variant="outline" className="text-xs">
                      محدد
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Stock Availability Filter */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">توفر المنتج</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <RadioGroup 
            value={stockFilter} 
            onValueChange={onStockFilterChange}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2 space-x-reverse">
              <RadioGroupItem value="all" id="all" />
              <Label htmlFor="all" className="cursor-pointer">جميع المنتجات</Label>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <RadioGroupItem value="in-stock" id="in-stock" />
              <Label htmlFor="in-stock" className="cursor-pointer">متوفر في المخزون</Label>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <RadioGroupItem value="out-of-stock" id="out-of-stock" />
              <Label htmlFor="out-of-stock" className="cursor-pointer">غير متوفر</Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>
    </div>
  );
};

export default StoreProductFilters; 