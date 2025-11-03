import React, { useCallback, useMemo, useTransition, startTransition, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
 } from "@/components/ui/dropdown-menu";
import {
  Grid3X3,
  List,
  Package2,
  CreditCard,
  Tag,
  TrendingUp,
  SortAsc,
  SortDesc,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  Filter
} from 'lucide-react';
import { FilterControlsProps } from '../types';

// مكون فرعي للتبويبات محسن للأداء
const TabsSection = React.memo<{
  activeTab: string;
  filteredProductsCount: number;
  subscriptionsCount: number;
  isAppEnabled: (appName: string) => boolean;
  onTabChange: (tab: string) => void;
  isMobile?: boolean;
}>(({ activeTab, filteredProductsCount, subscriptionsCount, isAppEnabled, onTabChange, isMobile }) => (
  <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
    <TabsList className="h-10 bg-muted/50 p-1 rounded-xl border border-border/50 w-full sm:w-auto inline-flex">
      <TabsTrigger 
        value="products" 
        className="h-8 gap-2 px-4 text-sm rounded-lg transition-all flex-1 sm:flex-initial"
      >
        <Package2 className="h-4 w-4 flex-shrink-0" />
        <span className="font-medium whitespace-nowrap">المنتجات</span>
        <Badge variant="secondary" className="text-xs font-semibold">
          {filteredProductsCount.toLocaleString('ar-DZ')}
        </Badge>
      </TabsTrigger>
      
      {isAppEnabled('subscription-services') && (
        <TabsTrigger 
          value="subscriptions" 
          className="h-8 gap-2 px-4 text-sm rounded-lg transition-all flex-1 sm:flex-initial"
        >
          <CreditCard className="h-4 w-4 flex-shrink-0" />
          <span className="font-medium whitespace-nowrap">الاشتراكات</span>
          <Badge variant="secondary" className="text-xs font-semibold">
            {subscriptionsCount.toLocaleString('ar-DZ')}
          </Badge>
        </TabsTrigger>
      )}
    </TabsList>
  </Tabs>
));

TabsSection.displayName = 'TabsSection';

// مكون محسن لقائمة الفئات مع تحميل مسبق
const CategorySelect = React.memo<{
  selectedCategory: string;
  availableCategories: { id: string; name: string }[];
  onCategoryChange: (value: string) => void;
  isMobile?: boolean;
}>(({ selectedCategory, availableCategories, onCategoryChange, isMobile }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);

  // تحميل مسبق للفئات عند فتح القائمة لأول مرة
  useEffect(() => {
    if (isOpen && !categoriesLoaded) {
      const timer = setTimeout(() => {
        setCategoriesLoaded(true);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, categoriesLoaded]);

  // تحسين عرض العناصر مع virtualization للقوائم الطويلة
  const categoryItems = useMemo(() => {
    if (!categoriesLoaded && isOpen) {
      return (
        <SelectItem value="loading" disabled>
          <div className="flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            جاري تحميل الفئات...
          </div>
        </SelectItem>
      );
    }

    return availableCategories.map(category => (
      <SelectItem key={category.id} value={category.id}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary/60"></div>
          {category.name}
        </div>
      </SelectItem>
    ));
  }, [availableCategories, categoriesLoaded, isOpen]);

  // اسم الفئة المختارة
  const selectedCategoryName = useMemo(() => {
    if (selectedCategory === 'all') return 'جميع الفئات';
    const category = availableCategories.find(cat => cat.id === selectedCategory);
    return category?.name || 'غير محدد';
  }, [selectedCategory, availableCategories]);

  return (
    <Select 
      value={selectedCategory} 
      onValueChange={onCategoryChange} 
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <SelectTrigger className="h-9 rounded-lg border-border/50 bg-background hover:bg-muted/50 transition-colors w-36">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <span className="truncate text-sm">
            {selectedCategoryName}
          </span>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </SelectTrigger>
      <SelectContent className={cn("max-h-64", isMobile ? "w-full" : "w-40") }>
        <SelectItem value="all">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            <span>جميع الفئات</span>
          </div>
        </SelectItem>
        {availableCategories.length > 0 && (
          <div className="h-px bg-border my-1" />
        )}
        {categoryItems}
      </SelectContent>
    </Select>
  );
});

CategorySelect.displayName = 'CategorySelect';

// مكون فرعي لأدوات التحكم محسن للأداء
const ControlsSection = React.memo<{
  selectedCategory: string;
  stockFilter: string;
  sortOrder: string;
  viewMode: string;
  availableCategories: { id: string; name: string }[];
  onCategoryChange: (value: string) => void;
  onStockFilterChange: (value: string) => void;
  onSortChange: (sortBy: string, sortOrder: string) => void;
  onViewModeChange: (mode: string) => void;
  isMobile?: boolean;
}>(({ 
  selectedCategory, 
  stockFilter, 
  sortOrder, 
  viewMode, 
  availableCategories,
  onCategoryChange,
  onStockFilterChange,
  onSortChange,
  onViewModeChange,
  isMobile
}) => {
  const sortIcon = useMemo(() => 
    sortOrder === 'asc' ? <SortAsc className="h-3.5 w-3.5" /> : <SortDesc className="h-3.5 w-3.5" />
  , [sortOrder]);

  // دوال محسنة للتعامل مع التأخير
  const handleCategoryChange = useCallback((value: string) => {
    if (value === 'loading') return;
    startTransition(() => {
      onCategoryChange(value);
    });
  }, [onCategoryChange]);

  const handleStockFilterChange = useCallback((value: string) => {
    startTransition(() => {
      onStockFilterChange(value);
    });
  }, [onStockFilterChange]);

  const handleSortChange = useCallback((sortBy: string, sortOrder: string) => {
    startTransition(() => {
      onSortChange(sortBy, sortOrder);
    });
  }, [onSortChange]);

  const handleViewModeChange = useCallback((mode: string) => {
    onViewModeChange(mode);
  }, [onViewModeChange]);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* تصفية الفئات المحسنة */}
      <div className="flex-shrink-0">
        <CategorySelect
          selectedCategory={selectedCategory}
          availableCategories={availableCategories}
          onCategoryChange={handleCategoryChange}
          isMobile={isMobile}
        />
      </div>

      {/* تصفية المخزون */}
      <div className="flex-shrink-0">
        <Select value={stockFilter} onValueChange={handleStockFilterChange}>
          <SelectTrigger className="h-9 rounded-lg border-border/50 bg-background hover:bg-muted/50 transition-colors w-28">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={cn(isMobile ? "w-full" : "") }>
          <SelectItem value="all">الكل</SelectItem>
          <SelectItem value="instock">متوفر</SelectItem>
          <SelectItem value="lowstock">منخفض</SelectItem>
          <SelectItem value="outofstock">نفد</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ترتيب */}
      <div className="flex-shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-9 gap-2 rounded-lg border-border/50 hover:bg-muted/50 transition-colors min-w-24"
            >
              {sortIcon}
              <span className={cn(!isMobile && "hidden sm:inline")}>ترتيب</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => handleSortChange('name', 'asc')}>
            <SortAsc className="h-4 w-4 mr-2" />
            ترتيب أبجدي (أ-ي)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleSortChange('name', 'desc')}>
            <SortDesc className="h-4 w-4 mr-2" />
            ترتيب أبجدي (ي-أ)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleSortChange('price', 'asc')}>
            <TrendingUp className="h-4 w-4 mr-2" />
            السعر (منخفض → مرتفع)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleSortChange('price', 'desc')}>
            <TrendingUp className="h-4 w-4 mr-2 rotate-180" />
            السعر (مرتفع → منخفض)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleSortChange('stock', 'desc')}>
            <Package2 className="h-4 w-4 mr-2" />
            المخزون (مرتفع → منخفض)
          </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* وضع العرض */}
      <div className="flex-shrink-0 flex rounded-lg border border-border/50 bg-muted/30 p-1">
        <Button
          variant={viewMode === 'grid' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleViewModeChange('grid')}
          className="h-8 px-3"
        >
          <Grid3X3 className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === 'list' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleViewModeChange('list')}
          className="h-8 px-3"
        >
          <List className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

ControlsSection.displayName = 'ControlsSection';

const FilterControls: React.FC<FilterControlsProps & { isMobile?: boolean }> = ({
  filterState,
  availableCategories,
  filteredProductsCount,
  subscriptionsCount,
  isAppEnabled,
  onFilterChange,
  isMobile = false
}) => {
  // استخدام useCallback لتحسين الأداء
  const handleTabChange = useCallback((tab: string) => {
    onFilterChange({ activeTab: tab as any });
  }, [onFilterChange]);

  const handleCategoryChange = useCallback((value: string) => {
    onFilterChange({ selectedCategory: value });
  }, [onFilterChange]);

  const handleStockFilterChange = useCallback((value: string) => {
    onFilterChange({ stockFilter: value as any });
  }, [onFilterChange]);

  const handleSortChange = useCallback((sortBy: string, sortOrder: string) => {
    onFilterChange({ 
      sortBy: sortBy as any, 
      sortOrder: sortOrder as any 
    });
  }, [onFilterChange]);

  const handleViewModeChange = useCallback((mode: string) => {
    onFilterChange({ viewMode: mode as any });
  }, [onFilterChange]);

  return (
    <div className="w-full overflow-hidden">
      <div className="px-3 py-3 space-y-3">
        {/* التبويبات */}
        <div className="w-full">
          <TabsSection
            activeTab={filterState.activeTab}
            filteredProductsCount={filteredProductsCount}
            subscriptionsCount={subscriptionsCount}
            isAppEnabled={isAppEnabled}
            onTabChange={handleTabChange}
            isMobile={isMobile}
          />
        </div>

        {/* أدوات التحكم */}
        <div className="w-full overflow-x-auto">
          <div className="min-w-max">
            <ControlsSection
              selectedCategory={filterState.selectedCategory}
              stockFilter={filterState.stockFilter}
              sortOrder={filterState.sortOrder}
              viewMode={filterState.viewMode}
              availableCategories={availableCategories}
              onCategoryChange={handleCategoryChange}
              onStockFilterChange={handleStockFilterChange}
              onSortChange={handleSortChange}
              onViewModeChange={handleViewModeChange}
              isMobile={isMobile}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(FilterControls);
