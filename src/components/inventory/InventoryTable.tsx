import { useRef, useState, useEffect, lazy, Suspense } from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ArrowUpDown, 
  MoreHorizontal, 
  Plus, 
  Minus, 
  Package,
  History,
  AlertCircle,
  CheckCircle2,
  ShoppingCart,
  AlertTriangle,
  Palette,
  Ruler,
  Info,
  Filter,
  Search,
  RefreshCw,
  ArrowRight,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious,
  PaginationEllipsis
} from "@/components/ui/pagination";
import type { Product } from '@/types';
import { cn } from '@/lib/utils';
import { ProductColor } from '@/api/store';
import { ProductSize } from '@/types/product';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy Loading للمكونات الكبيرة
const InventoryLogDialog = lazy(() => import('./InventoryLogDialog'));
const MinimumStockDialog = lazy(() => import('./MinimumStockDialog'));

interface InventoryTableProps {
  products: Product[];
  onStockUpdate: (product: Product) => void;
  onProductUpdated: () => Promise<void>;
  canEdit?: boolean;
}

// مكون عرض حالة المخزون
const StockStatusBadge = ({ product }: { product: Product }) => {
  const quantity = product.stock_quantity;
  const minLevel = product.min_stock_level || 5;
  const reorderLevel = product.reorder_level || 10;
  
  if (quantity <= 0) {
    return (
      <Badge variant="destructive" className="gap-1 px-2 py-1 whitespace-nowrap">
        <AlertCircle className="h-3 w-3 ml-1" /> 
        نفذ من المخزون
      </Badge>
    );
  } else if (quantity <= minLevel) {
    return (
      <Badge variant="destructive" className="gap-1 px-2 py-1 whitespace-nowrap">
        <AlertCircle className="h-3 w-3 ml-1" /> 
        منخفض جداً ({quantity})
      </Badge>
    );
  } else if (quantity <= reorderLevel) {
    return (
      <Badge variant="outline" className={cn(
        "gap-1 px-2 py-1 whitespace-nowrap",
        "bg-amber-100 text-amber-700 hover:bg-amber-100/90 border-amber-200",
        "dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/40 dark:border-amber-700/30"
      )}>
        <AlertTriangle className="h-3 w-3 ml-1" /> 
        منخفض ({quantity})
      </Badge>
    );
  } else {
    return (
      <Badge variant="outline" className={cn(
        "gap-1 px-2 py-1 whitespace-nowrap",
        "bg-emerald-100 text-emerald-700 hover:bg-emerald-100/90 border-emerald-200",
        "dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/40 dark:border-emerald-700/30"
      )}>
        <CheckCircle2 className="h-3 w-3 ml-1" /> 
        متوفر ({quantity})
      </Badge>
    );
  }
};

// مكون عرض شارات المتغيرات
const VariantBadges = ({ product }: { product: Product }) => {
  const hasColors = product.colors && product.colors.length > 0;
  const hasSizes = product.use_sizes;
  
  if (!hasColors && !hasSizes) return null;
  
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {hasColors && (
        <Badge variant="outline" className={cn(
          "text-xs",
          "bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-50/90",
          "dark:bg-violet-900/20 dark:border-violet-700/30 dark:text-violet-400 dark:hover:bg-violet-900/30"
        )}>
          <Palette className="h-3 w-3 ml-1" />
          {product.colors?.length} {product.colors?.length === 1 ? 'لون' : 'ألوان'}
        </Badge>
      )}
      {hasSizes && (
        <Badge variant="outline" className={cn(
          "text-xs",
          "bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-50/90",
          "dark:bg-cyan-900/20 dark:border-cyan-700/30 dark:text-cyan-400 dark:hover:bg-cyan-900/30"
        )}>
          <Ruler className="h-3 w-3 ml-1" />
          مقاسات
        </Badge>
      )}
    </div>
  );
};

// مكون أزرار الإجراءات
const ActionButtons = ({ 
  product, 
  onStockUpdate, 
  onShowLog, 
  onShowMinStock, 
  onShowVariants,
  canEdit 
}: { 
  product: Product;
  onStockUpdate: (product: Product) => void;
  onShowLog: (product: Product) => void;
  onShowMinStock: (product: Product) => void;
  onShowVariants: (product: Product) => void;
  canEdit: boolean;
}) => {
  return (
    <div className="flex items-center gap-1">
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "text-xs h-8 w-8 p-0",
                "hover:bg-gray-100 text-gray-700",
                "dark:hover:bg-gray-800 dark:text-gray-300"
              )}
              onClick={() => onStockUpdate(product)}
              disabled={!canEdit}
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>تحديث الكمية</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "text-xs h-8 w-8 p-0",
                "hover:bg-gray-100 text-gray-700",
                "dark:hover:bg-gray-800 dark:text-gray-300"
              )}
              onClick={() => onShowLog(product)}
            >
              <History className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>سجل المخزون</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DropdownMenu>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className={cn(
                  "h-8 w-8 p-0",
                  "hover:bg-gray-100 text-gray-700",
                  "dark:hover:bg-gray-800 dark:text-gray-300"
                )}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>المزيد من الخيارات</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => onShowMinStock(product)}>
            <ShoppingCart className="ml-2 h-4 w-4" />
            <span>ضبط حدود المخزون</span>
          </DropdownMenuItem>
          {product.colors && product.colors.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onShowVariants(product)}>
                <Palette className="ml-2 h-4 w-4" />
                <span>عرض المتغيرات</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

// مكون عرض صف فردي من جدول المخزون (للشاشات الكبيرة)
const TableRow = ({
  product, 
  onStockUpdate, 
  onShowLog, 
  onShowMinStock, 
  onShowVariants,
  canEdit
}: {
  product: Product;
  onStockUpdate: (product: Product) => void;
  onShowLog: (product: Product) => void;
  onShowMinStock: (product: Product) => void;
  onShowVariants: (product: Product) => void;
  canEdit: boolean;
}) => {
  return (
    <div className={cn(
      "grid grid-cols-12 py-4 px-4 items-center border-b gap-4",
      "border-border dark:border-zinc-800",
      "hover:bg-accent/10 dark:hover:bg-accent/5 transition-colors"
    )}>
      {/* المنتج */}
      <div className="col-span-3 flex items-center gap-3">
        <Avatar className="rounded-md h-10 w-10 border border-border dark:border-zinc-800 shadow-sm flex-shrink-0">
          <AvatarImage src={product.thumbnailImage} alt={product.name} />
          <AvatarFallback className="rounded-md bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary/80">
            {product.name.substring(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="font-medium truncate text-foreground dark:text-zinc-200">{product.name}</div>
          {product.barcode && (
            <div className="text-xs text-muted-foreground dark:text-zinc-400 truncate">
              الباركود: {product.barcode}
            </div>
          )}
          <VariantBadges product={product} />
        </div>
      </div>
      
      {/* الصنف */}
      <div className="col-span-2 truncate text-foreground dark:text-zinc-300">
        {product.category}
      </div>
      
      {/* SKU */}
      <div className="col-span-2 font-mono text-sm truncate text-foreground dark:text-zinc-300">
        {product.sku}
      </div>
      
      {/* الكمية */}
      <div className="col-span-2 flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full flex-shrink-0 border-border dark:border-zinc-800 bg-background dark:bg-zinc-800 text-foreground dark:text-zinc-300"
          onClick={() => onStockUpdate(product)}
          disabled={!canEdit}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="w-12 text-center font-medium text-lg text-foreground dark:text-zinc-200">{product.stock_quantity}</span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full flex-shrink-0 border-border dark:border-zinc-800 bg-background dark:bg-zinc-800 text-foreground dark:text-zinc-300"
          onClick={() => onStockUpdate(product)}
          disabled={!canEdit}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      
      {/* حالة المخزون */}
      <div className="col-span-2">
        <StockStatusBadge product={product} />
      </div>
      
      {/* الإجراءات */}
      <div className="col-span-1 flex items-center justify-end">
        <ActionButtons 
          product={product}
          onStockUpdate={onStockUpdate}
          onShowLog={onShowLog}
          onShowMinStock={onShowMinStock}
          onShowVariants={onShowVariants}
          canEdit={canEdit}
        />
      </div>
    </div>
  );
};

// مكون عرض صف فردي من جدول المخزون كبطاقة (للشاشات الصغيرة)
const CardRow = ({
  product, 
  onStockUpdate, 
  onShowLog, 
  onShowMinStock, 
  onShowVariants,
  canEdit
}: {
  product: Product;
  onStockUpdate: (product: Product) => void;
  onShowLog: (product: Product) => void;
  onShowMinStock: (product: Product) => void;
  onShowVariants: (product: Product) => void;
  canEdit: boolean;
}) => {
  return (
    <Card className="mb-3 overflow-hidden border-border dark:border-zinc-800 bg-background dark:bg-zinc-900">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex justify-between items-start">
          <div className="flex gap-3 items-center">
            <Avatar className="rounded-md h-10 w-10 border border-border dark:border-zinc-800 shadow-sm flex-shrink-0">
              <AvatarImage src={product.thumbnailImage} alt={product.name} />
              <AvatarFallback className="rounded-md bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary/80">
                {product.name.substring(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base text-foreground dark:text-zinc-200">{product.name}</CardTitle>
              <CardDescription className="text-muted-foreground dark:text-zinc-400">
                {product.category} • {product.sku}
              </CardDescription>
              <VariantBadges product={product} />
            </div>
          </div>
          <StockStatusBadge product={product} />
        </div>
      </CardHeader>
      <CardContent className="px-4 py-2">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm text-muted-foreground dark:text-zinc-400 mb-1">الكمية الحالية</div>
            <div className="flex items-center justify-start gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full border-border dark:border-zinc-800 bg-background dark:bg-zinc-800 text-foreground dark:text-zinc-300"
                onClick={() => onStockUpdate(product)}
                disabled={!canEdit}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-12 text-center font-medium text-lg text-foreground dark:text-zinc-200">{product.stock_quantity}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full border-border dark:border-zinc-800 bg-background dark:bg-zinc-800 text-foreground dark:text-zinc-300"
                onClick={() => onStockUpdate(product)}
                disabled={!canEdit}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ActionButtons 
              product={product}
              onStockUpdate={onStockUpdate}
              onShowLog={onShowLog}
              onShowMinStock={onShowMinStock}
              onShowVariants={onShowVariants}
              canEdit={canEdit}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// مكون حالة عدم وجود منتجات
const EmptyInventory = () => {
  return (
    <Card className="border border-dashed border-border dark:border-zinc-800 bg-background dark:bg-zinc-900">
      <CardHeader className="text-center">
        <CardTitle className="text-foreground dark:text-zinc-200">لا توجد منتجات</CardTitle>
        <CardDescription className="text-muted-foreground dark:text-zinc-400">لم يتم العثور على أي منتجات تطابق معايير البحث</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center pb-6">
        <Package className="w-16 h-16 text-muted-foreground/50 dark:text-zinc-600" />
      </CardContent>
    </Card>
  );
};

// عرض رأس الجدول (للشاشات الكبيرة)
const TableHeader = () => {
  return (
    <div className={cn(
      "grid grid-cols-12 py-3 px-4 font-medium text-sm sticky top-0 z-10 border-b gap-4",
      "bg-gray-50 text-gray-700 border-border",
      "dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800"
    )}>
      <div className="col-span-3">المنتج</div>
      <div className="col-span-2">الصنف</div>
      <div className="col-span-2">SKU</div>
      <div className="col-span-2 text-center">الكمية الحالية</div>
      <div className="col-span-2">حالة المخزون</div>
      <div className="col-span-1 text-center">إجراءات</div>
    </div>
  );
};

// مكون تقسيم الصفحات
const InventoryPagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange 
}: { 
  currentPage: number; 
  totalPages: number; 
  onPageChange: (page: number) => void;
}) => {
  // إنشاء مصفوفة من أرقام الصفحات التي سيتم عرضها
  const getPageNumbers = () => {
    const pages = [];
    
    // دائماً نعرض الصفحة الأولى
    pages.push(1);
    
    // حساب النطاق المحيط بالصفحة الحالية (صفحتين قبل وبعد)
    let startPage = Math.max(2, currentPage - 1);
    let endPage = Math.min(totalPages - 1, currentPage + 1);
    
    // إضافة ...  قبل النطاق إذا كانت الصفحة الأولى ليست جزءاً من النطاق
    if (startPage > 2) {
      pages.push('ellipsis-start');
    }
    
    // إضافة الصفحات في النطاق
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    // إضافة ...  بعد النطاق إذا كانت الصفحة الأخيرة ليست جزءاً من النطاق
    if (endPage < totalPages - 1) {
      pages.push('ellipsis-end');
    }
    
    // دائماً نعرض الصفحة الأخيرة (إذا كان هناك أكثر من صفحة واحدة)
    if (totalPages > 1) {
      pages.push(totalPages);
    }
    
    return pages;
  };

  // الصفحة السابقة
  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  // الصفحة التالية
  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  // قائمة الصفحات
  const pageNumbers = getPageNumbers();

  return (
    <Pagination className="mt-6">
      <PaginationContent dir="rtl">
        <PaginationItem>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 w-8 p-0" 
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </PaginationItem>
        <PaginationItem>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 w-8 p-0" 
            onClick={handlePrevious}
            disabled={currentPage === 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </PaginationItem>

        {pageNumbers.map((page, index) => (
          page === 'ellipsis-start' || page === 'ellipsis-end' ? (
            <PaginationItem key={`ellipsis-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={`page-${page}`}>
              <Button 
                variant={currentPage === page ? "default" : "outline"} 
                size="sm" 
                className={cn(
                  "h-8 w-8 p-0",
                  currentPage === page && "bg-primary text-white"
                )}
                onClick={() => onPageChange(page as number)}
                disabled={currentPage === page}
              >
                {page}
              </Button>
            </PaginationItem>
          )
        ))}

        <PaginationItem>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 w-8 p-0" 
            onClick={handleNext}
            disabled={currentPage === totalPages}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </PaginationItem>
        <PaginationItem>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 w-8 p-0" 
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};

// مكون التحميل
const LoadingState = () => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <Skeleton className="h-8 w-48 dark:bg-zinc-800" />
      <Skeleton className="h-8 w-32 dark:bg-zinc-800" />
    </div>
    {Array(5).fill(0).map((_, index) => (
      <Card key={index} className="border border-border dark:border-zinc-800 bg-background dark:bg-zinc-900">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-md dark:bg-zinc-800" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40 dark:bg-zinc-800" />
                <Skeleton className="h-4 w-32 dark:bg-zinc-800" />
              </div>
            </div>
            <Skeleton className="h-6 w-16 dark:bg-zinc-800" />
          </div>
        </CardHeader>
        <CardContent className="px-4 py-2">
          <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-32 dark:bg-zinc-800" />
            <Skeleton className="h-10 w-24 dark:bg-zinc-800" />
          </div>
        </CardContent>
      </Card>
    ))}
    <div className="flex justify-center">
      <Skeleton className="h-8 w-64 dark:bg-zinc-800" />
    </div>
  </div>
);

// المكون الرئيسي لجدول المخزون
const InventoryTable = ({ products, onStockUpdate, onProductUpdated, canEdit = true }: InventoryTableProps) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [isMinStockDialogOpen, setIsMinStockDialogOpen] = useState(false);
  const [isColorDialogOpen, setIsColorDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [currentBreakpoint, setCurrentBreakpoint] = useState<'sm' | 'md' | 'lg' | 'xl'>('xl');
  
  // حالة الصفحات
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const productsPerPage = 15;
  const tableRef = useRef<HTMLDivElement>(null);

  // تتبع تغيرات حجم النافذة وتحديد نوع الشاشة
  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setCurrentBreakpoint('sm');
        setViewMode('cards');
      } else if (width < 768) {
        setCurrentBreakpoint('md');
        setViewMode('cards');
      } else if (width < 1024) {
        setCurrentBreakpoint('lg');
      } else {
        setCurrentBreakpoint('xl');
      }
    };
    
    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    
    return () => {
      window.removeEventListener('resize', updateScreenSize);
    };
  }, []);
  
  // محاكاة تحميل البيانات عند تغيير الصفحة
  useEffect(() => {
    if (products.length > 0) {
      setIsLoading(true);
      // محاكاة تأخير التحميل (يمكن إزالته في الإنتاج)
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [currentPage]);

  // تغيير الصفحة
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // التمرير إلى أعلى الجدول عند تغيير الصفحة
    tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  
  // فتح نافذة سجل المخزون
  const handleShowInventoryLog = (product: Product) => {
    setSelectedProduct(product);
    setIsLogDialogOpen(true);
  };
  
  // فتح نافذة ضبط الحد الأدنى للمخزون
  const handleShowMinStockSettings = (product: Product) => {
    setSelectedProduct(product);
    setIsMinStockDialogOpen(true);
  };

  // فتح نافذة عرض الألوان والمقاسات
  const handleShowColorDetails = (product: Product) => {
    setSelectedProduct(product);
    setIsColorDialogOpen(true);
  };

  // إظهار حالة عدم وجود منتجات
  if (products.length === 0) {
    return <EmptyInventory />;
  }

  // حساب إجمالي عدد الصفحات
  const totalPages = Math.ceil(products.length / productsPerPage);
  
  // تحديد المنتجات التي سيتم عرضها في الصفحة الحالية
  const startIndex = (currentPage - 1) * productsPerPage;
  const endIndex = Math.min(startIndex + productsPerPage, products.length);
  const currentProducts = products.slice(startIndex, endIndex);

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">قائمة المخزون</h3>
          <p className="text-sm text-muted-foreground">
            عرض {startIndex + 1} - {endIndex} من أصل {products.length} منتج
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={viewMode === 'table' ? "secondary" : "outline"} 
                  size="sm" 
                  className="h-9 px-3"
                  onClick={() => setViewMode('table')}
                  disabled={currentBreakpoint === 'sm' || currentBreakpoint === 'md'}
                >
                  <List className="h-4 w-4 ml-1" />
                  <span>جدول</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>عرض كجدول</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={viewMode === 'cards' ? "secondary" : "outline"} 
                  size="sm" 
                  className="h-9 px-3"
                  onClick={() => setViewMode('cards')}
                >
                  <LayoutGrid className="h-4 w-4 ml-1" />
                  <span>بطاقات</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>عرض كبطاقات</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : (
        <>
          {/* عرض جدول للشاشات المتوسطة والكبيرة */}
          {viewMode === 'table' && (
            <div className="bg-white dark:bg-zinc-900 rounded-lg border shadow-sm overflow-hidden dark:border-zinc-800" ref={tableRef}>
              <div className="overflow-x-auto">
                <TableHeader />
                
                <div className="divide-y divide-gray-100 dark:divide-zinc-800">
                  {currentProducts.map((product) => (
                    <TableRow
                      key={product.id}
                      product={product}
                      onStockUpdate={onStockUpdate}
                      onShowLog={handleShowInventoryLog}
                      onShowMinStock={handleShowMinStockSettings}
                      onShowVariants={handleShowColorDetails}
                      canEdit={canEdit}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* عرض بطاقات للشاشات الصغيرة */}
          {viewMode === 'cards' && (
            <div className="space-y-3">
              {currentProducts.map((product) => (
                <CardRow
                  key={product.id}
                  product={product}
                  onStockUpdate={onStockUpdate}
                  onShowLog={handleShowInventoryLog}
                  onShowMinStock={handleShowMinStockSettings}
                  onShowVariants={handleShowColorDetails}
                  canEdit={canEdit}
                />
              ))}
            </div>
          )}

          {/* عنصر التنقل بين الصفحات */}
          {totalPages > 1 && (
            <InventoryPagination 
              currentPage={currentPage} 
              totalPages={totalPages} 
              onPageChange={handlePageChange} 
            />
          )}
        </>
      )}
      
      {/* نوافذ الحوار */}
      {selectedProduct && (
        <Suspense fallback={
          <Dialog open={isLogDialogOpen || isMinStockDialogOpen}>
            <DialogContent aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>جاري التحميل</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center justify-center p-6">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">جاري تحميل المحتوى...</p>
              </div>
            </DialogContent>
          </Dialog>
        }>
          {isLogDialogOpen && (
            <InventoryLogDialog
              product={selectedProduct}
              open={isLogDialogOpen}
              onOpenChange={setIsLogDialogOpen}
              onInventoryUpdated={onProductUpdated}
            />
          )}
          
          {isMinStockDialogOpen && (
            <MinimumStockDialog
              product={selectedProduct}
              open={isMinStockDialogOpen}
              onOpenChange={setIsMinStockDialogOpen}
              onSettingsUpdated={onProductUpdated}
            />
          )}
        </Suspense>
      )}
      
      <Dialog open={isColorDialogOpen} onOpenChange={setIsColorDialogOpen}>
        <DialogContent 
          className="sm:max-w-md"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle>متغيرات المنتج</DialogTitle>
            <DialogDescription>
              عرض الألوان والمقاسات المتاحة لهذا المنتج
            </DialogDescription>
          </DialogHeader>
          {selectedProduct ? (
            <div className="grid gap-4 py-4">
              {selectedProduct.colors && selectedProduct.colors.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                  {selectedProduct.colors.map((color) => (
                    <AccordionItem value={color.id} key={color.id}>
                      <AccordionTrigger className="flex justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-5 h-5 rounded-full border shadow-sm dark:border-zinc-600" 
                            style={{ backgroundColor: color.color_code || '#ccc' }}
                          />
                          <span>{color.name}</span>
                        </div>
                        <Badge className="mr-2">{color.quantity}</Badge>
                      </AccordionTrigger>
                      <AccordionContent>
                        {color.has_sizes && color.sizes && color.sizes.length > 0 ? (
                          <div className="space-y-2">
                            <div className="text-sm font-medium">المقاسات المتاحة:</div>
                            <div className="grid grid-cols-2 gap-2">
                              {color.sizes.map((size) => (
                                <div 
                                  key={size.id} 
                                  className="border rounded p-2 flex justify-between items-center"
                                >
                                  <span>{size.name || ''}</span>
                                  <Badge variant="outline">{size.quantity}</Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground py-2">
                            لا توجد مقاسات لهذا اللون
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  لا توجد متغيرات لهذا المنتج
                </div>
              )}
            </div>
          ) : (
            <div className="py-6 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">إغلاق</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InventoryTable; 