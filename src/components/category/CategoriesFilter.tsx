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

interface CategoriesFilterProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sortOption: string;
  onSortChange: (value: string) => void;
  activeFilter: string;
  onActiveFilterChange: (value: string) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
}

const CategoriesFilter = ({
  searchQuery,
  onSearchChange,
  sortOption,
  onSortChange,
  activeFilter,
  onActiveFilterChange,
  typeFilter,
  onTypeFilterChange,
}: CategoriesFilterProps) => {
  
  // حساب عدد الفلاتر النشطة
  const activeFiltersCount = 
    (activeFilter !== 'all' ? 1 : 0) + 
    (typeFilter !== 'all' ? 1 : 0);
  
  return (
    <div className="bg-background border rounded-lg p-4 shadow-sm">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="البحث عن فئة بالاسم أو الوصف..."
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
            <SelectContent>
              <SelectItem value="name-asc">الاسم: أ-ي</SelectItem>
              <SelectItem value="name-desc">الاسم: ي-أ</SelectItem>
              <SelectItem value="newest">الأحدث</SelectItem>
              <SelectItem value="oldest">الأقدم</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Advanced Filters */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 w-full md:w-auto">
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">فلترة متقدمة</span>
              <span className="sm:hidden">فلترة</span>
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 rounded-sm px-1 py-0">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="bottom" sideOffset={5} className="w-[220px] z-50">
            <DropdownMenuLabel>خيارات الفلترة</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground mt-2">
                حالة الفئة
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup value={activeFilter} onValueChange={onActiveFilterChange}>
                <DropdownMenuRadioItem value="all">جميع الفئات</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="active">فئات نشطة</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="inactive">فئات غير نشطة</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />
            
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground mt-2">
                نوع الفئة
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup value={typeFilter} onValueChange={onTypeFilterChange}>
                <DropdownMenuRadioItem value="all">جميع الأنواع</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="product">فئات منتجات</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="service">فئات خدمات</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Active Filters */}
      {(activeFilter !== 'all' || typeFilter !== 'all') && (
        <div className="flex flex-wrap gap-2 mt-3">
          {activeFilter !== 'all' && (
            <Badge variant="secondary" className="gap-2">
              الحالة:{' '}
              {activeFilter === 'active'
                ? 'نشطة'
                : 'غير نشطة'}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => onActiveFilterChange('all')}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">إزالة الفلتر</span>
              </Button>
            </Badge>
          )}
          
          {typeFilter !== 'all' && (
            <Badge variant="secondary" className="gap-2">
              النوع:{' '}
              {typeFilter === 'product'
                ? 'منتجات'
                : 'خدمات'}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => onTypeFilterChange('all')}
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

export default CategoriesFilter;
