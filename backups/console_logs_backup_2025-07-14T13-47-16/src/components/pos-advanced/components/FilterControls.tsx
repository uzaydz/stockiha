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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  isPending?: boolean;
}>(({ activeTab, filteredProductsCount, subscriptionsCount, isAppEnabled, onTabChange, isPending }) => (
  <Tabs value={activeTab} onValueChange={onTabChange} className="flex-shrink-0">
    <TabsList className="h-10 bg-gradient-to-r from-muted/30 to-muted/60 border border-border/40 p-1 shadow-sm">
      <TabsTrigger 
        value="products" 
        className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md h-8 gap-2 px-3 transition-all duration-300 data-[state=active]:scale-[1.02] text-xs"
        disabled={isPending}
      >
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-primary/15 border border-primary/20">
            {isPending ? (
              <Loader2 className="h-3 w-3 text-primary animate-spin" />
            ) : (
              <Package2 className="h-3 w-3 text-primary" />
            )}
          </div>
          <span className="font-semibold hidden sm:inline">المنتجات</span>
          <Badge 
            variant="secondary" 
            className="text-xs font-medium bg-primary/10 text-primary border-primary/20 px-1.5 py-0.5 group-data-[state=active]:bg-primary/15 group-data-[state=active]:text-primary group-hover:bg-primary/15"
          >
            {isPending ? '...' : filteredProductsCount.toLocaleString('ar-DZ')}
          </Badge>
        </div>
      </TabsTrigger>
      
      {isAppEnabled('subscription-services') && (
        <TabsTrigger 
          value="subscriptions" 
          className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md h-8 gap-2 px-3 transition-all duration-300 data-[state=active]:scale-[1.02] text-xs"
          disabled={isPending}
        >
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-blue-500/15 border border-blue-500/20">
              <CreditCard className="h-3 w-3 text-blue-600" />
            </div>
            <span className="font-semibold hidden sm:inline">الاشتراكات</span>
            <Badge 
              variant="secondary" 
              className="text-xs font-medium bg-blue-500/10 text-blue-600 border-blue-500/20 px-1.5 py-0.5 group-data-[state=active]:bg-blue-500/15 group-data-[state=active]:text-blue-600 group-hover:bg-blue-500/15"
            >
              {subscriptionsCount.toLocaleString('ar-DZ')}
            </Badge>
          </div>
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
  isPending?: boolean;
}>(({ selectedCategory, availableCategories, onCategoryChange, isPending }) => {
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
      disabled={isPending}
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <SelectTrigger className={cn(
        "w-32 sm:w-40 h-9 bg-background/80 border-border/60 hover:bg-background transition-all duration-200 shadow-sm hover:shadow-md",
        isPending && "opacity-50 cursor-not-allowed"
      )}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Tag className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="truncate text-xs font-medium">
            {selectedCategoryName}
          </span>
        </div>
        <ChevronDown className={cn(
          "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 flex-shrink-0",
          isOpen && "rotate-180"
        )} />
      </SelectTrigger>
      <SelectContent className="max-h-64 w-40">
        <SelectItem value="all">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-semibold">جميع الفئات</span>
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
  isPending?: boolean;
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
  isPending
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
    <div className="flex items-center gap-2 overflow-hidden">
      {/* تصفية الفئات المحسنة */}
      <CategorySelect
        selectedCategory={selectedCategory}
        availableCategories={availableCategories}
        onCategoryChange={handleCategoryChange}
        isPending={isPending}
      />

      {/* تصفية المخزون */}
      <Select value={stockFilter} onValueChange={handleStockFilterChange} disabled={isPending}>
        <SelectTrigger className={cn(
          "w-24 sm:w-28 h-9 bg-background/80 border-border/60 hover:bg-background transition-all duration-200 shadow-sm hover:shadow-md",
          isPending && "opacity-50 cursor-not-allowed"
        )}>
          <TrendingUp className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
          <SelectValue className="font-medium text-xs" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              الكل
            </div>
          </SelectItem>
          <SelectItem value="instock">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              متوفر
            </div>
          </SelectItem>
          <SelectItem value="lowstock">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              منخفض
            </div>
          </SelectItem>
          <SelectItem value="outofstock">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              نفد
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* ترتيب */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={cn(
              "h-9 px-2 sm:px-3 bg-background/80 border-border/60 hover:bg-background transition-all duration-200 gap-1.5 shadow-sm hover:shadow-md",
              isPending && "opacity-50 cursor-not-allowed"
            )}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              sortIcon
            )}
            <span className="font-medium text-xs hidden sm:inline">ترتيب</span>
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

      {/* وضع العرض */}
      <div className="flex rounded-lg border border-border/60 bg-background/80 p-0.5 shadow-sm">
        <Button
          variant={viewMode === 'grid' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleViewModeChange('grid')}
          className={cn(
            "h-8 px-2 transition-all duration-200",
            viewMode === 'grid' && "shadow-md scale-[1.02]"
          )}
          title="عرض شبكي"
        >
          <Grid3X3 className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={viewMode === 'list' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleViewModeChange('list')}
          className={cn(
            "h-8 px-2 transition-all duration-200",
            viewMode === 'list' && "shadow-md scale-[1.02]"
          )}
          title="عرض قائمة"
        >
          <List className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
});

ControlsSection.displayName = 'ControlsSection';

const FilterControls: React.FC<FilterControlsProps & { isPending?: boolean }> = ({
  filterState,
  availableCategories,
  filteredProductsCount,
  subscriptionsCount,
  isAppEnabled,
  onFilterChange,
  isPending = false
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
    <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border-b border-border/30 px-3 sm:px-6 py-3">
      {/* Container محسن مع تخطيط مرن ومتجاوب */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full">
        {/* التبويبات */}
        <TabsSection
          activeTab={filterState.activeTab}
          filteredProductsCount={filteredProductsCount}
          subscriptionsCount={subscriptionsCount}
          isAppEnabled={isAppEnabled}
          onTabChange={handleTabChange}
          isPending={isPending}
        />

        {/* خط فاصل بصري - يظهر فقط على الشاشات الكبيرة */}
        <div className="hidden sm:block h-6 w-px bg-border/40" />

        {/* أدوات التحكم */}
        <div className="flex-1 flex justify-start sm:justify-end w-full sm:w-auto overflow-hidden">
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
            isPending={isPending}
          />
        </div>
      </div>
    </div>
  );
};

export default React.memo(FilterControls);
