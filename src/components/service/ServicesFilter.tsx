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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ServicesFilterProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sortBy: 'name' | 'price' | 'newest' | 'oldest';
  onSortChange: (value: 'name' | 'price' | 'newest' | 'oldest') => void;
  statusFilter: 'all' | 'active' | 'inactive';
  onStatusChange: (value: 'all' | 'active' | 'inactive') => void;
  categories: string[];
  activeCategories: string[];
  onCategoryToggle: (category: string) => void;
  onResetFilters: () => void;
  activeFilterCount: number;
}

const ServicesFilter = ({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  statusFilter,
  onStatusChange,
  categories,
  activeCategories,
  onCategoryToggle,
  onResetFilters,
  activeFilterCount,
}: ServicesFilterProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-background p-4 border rounded-lg shadow-sm">
      <div className="relative w-full sm:w-96 flex-1">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="البحث عن خدمة..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-3 pr-9 w-full"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-0 top-0 h-full px-3 py-0 hover:bg-transparent"
            onClick={() => onSearchChange('')}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">مسح البحث</span>
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 w-full sm:w-auto">
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="الترتيب" />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="name">الاسم</SelectItem>
            <SelectItem value="price">السعر</SelectItem>
            <SelectItem value="newest">الأحدث</SelectItem>
            <SelectItem value="oldest">الأقدم</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              className={cn(
                "h-10 border-dashed",
                activeFilterCount > 0 && "border-primary text-primary"
              )}
            >
              <SlidersHorizontal className="ml-2 h-4 w-4" />
              فلترة
              {activeFilterCount > 0 && (
                <Badge
                  variant="secondary"
                  className="mr-2 px-1 py-0 w-5 h-5 rounded-full"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="start">
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">حالة الخدمة</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={statusFilter === 'all' ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => onStatusChange('all')}
                  >
                    الكل
                  </Badge>
                  <Badge
                    variant={statusFilter === 'active' ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => onStatusChange('active')}
                  >
                    نشط
                  </Badge>
                  <Badge
                    variant={statusFilter === 'inactive' ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => onStatusChange('inactive')}
                  >
                    غير نشط
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">الفئة</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={activeCategories.length === 0 ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={onResetFilters}
                  >
                    الكل
                  </Badge>
                  {categories.map((category) => (
                    <Badge
                      key={category}
                      variant={activeCategories.includes(category) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => onCategoryToggle(category)}
                    >
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>

              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={onResetFilters}
                >
                  <X className="ml-2 h-4 w-4" />
                  إعادة تعيين الفلاتر
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default ServicesFilter;
