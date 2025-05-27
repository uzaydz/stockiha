import { Search, Grid3X3, Grid2X2, ListFilter, X } from 'lucide-react';
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
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { Badge } from '@/components/ui/badge';

interface StoreProductHeaderProps {
  productCount: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sortOption: string;
  onSortChange: (value: string) => void;
  view: 'grid' | 'list';
  onViewChange: (value: 'grid' | 'list') => void;
  onGridColumnsChange: (columns: 2 | 3 | 4) => void;
}

const StoreProductHeader = ({
  productCount,
  searchQuery,
  onSearchChange,
  sortOption,
  onSortChange,
  view,
  onViewChange,
  onGridColumnsChange,
}: StoreProductHeaderProps) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">المنتجات</h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="rounded-md px-2 py-1.5 text-sm">
            {productCount} منتج
          </Badge>
        </div>
      </div>
      
      <div className="bg-card rounded-xl p-4 shadow-sm border">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث عن منتج..."
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
          
          {/* Sort Options */}
          <div className="w-full md:w-[200px]">
            <Select value={sortOption} onValueChange={onSortChange}>
              <SelectTrigger>
                <SelectValue placeholder="ترتيب حسب" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="newest">الأحدث</SelectItem>
                <SelectItem value="price-high">السعر: من الأعلى</SelectItem>
                <SelectItem value="price-low">السعر: من الأقل</SelectItem>
                <SelectItem value="popularity">الأكثر شعبية</SelectItem>
                <SelectItem value="rating">التقييم</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex items-center space-x-2">
            <ToggleGroup type="single" value={view} onValueChange={(value) => value && onViewChange(value as 'grid' | 'list')}>
              <ToggleGroupItem value="grid" aria-label="عرض الشبكة">
                <Grid3X3 className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="عرض القائمة">
                <ListFilter className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
            
            {view === 'grid' && (
              <ToggleGroup 
                type="single" 
                defaultValue="3"
                onValueChange={(value) => {
                  if (value === '2') onGridColumnsChange(2);
                  else if (value === '3') onGridColumnsChange(3);
                  else if (value === '4') onGridColumnsChange(4);
                }}
              >
                <ToggleGroupItem value="2" aria-label="عمودين">
                  <div className="text-xs font-medium">2</div>
                </ToggleGroupItem>
                <ToggleGroupItem value="3" aria-label="ثلاثة أعمدة">
                  <div className="text-xs font-medium">3</div>
                </ToggleGroupItem>
                <ToggleGroupItem value="4" aria-label="أربعة أعمدة">
                  <div className="text-xs font-medium">4</div>
                </ToggleGroupItem>
              </ToggleGroup>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreProductHeader;
