import { Product } from '@/types';

// أنواع حالة التصفية
export type ViewMode = 'grid' | 'list';
export type SortBy = 'name' | 'price' | 'stock' | 'category';
export type SortOrder = 'asc' | 'desc';
export type StockFilter = 'all' | 'instock' | 'lowstock' | 'outofstock';
export type ActiveTab = 'products' | 'subscriptions';

// واجهة حالة التصفية
export interface FilterState {
  searchQuery: string;
  selectedCategory: string;
  viewMode: ViewMode;
  sortBy: SortBy;
  sortOrder: SortOrder;
  stockFilter: StockFilter;
  activeTab: ActiveTab;
}

// واجهة الفئة
export interface Category {
  id: string;
  name: string;
}

// واجهة pagination
export interface PaginationInfo {
  current_page: number;
  total_pages: number;
  total_count: number;
  per_page: number;
  has_next_page: boolean;
  has_prev_page: boolean;
}

// واجهة الخصائص الرئيسية
export interface POSAdvancedContentProps {
  products: Product[];
  pagination: PaginationInfo;
  favoriteProducts: any[];
  productCategories: any[];
  subscriptionServices: any[];
  subscriptionCategories: any[];
  isReturnMode: boolean;
  isLossMode?: boolean;
  isPOSDataLoading: boolean;
  onAddToCart: (product: Product) => void;
  onAddSubscription?: (subscription: any, pricing?: any) => void;
  onRefreshData: () => void;
  isAppEnabled: (appName: string) => boolean;
  // دوال pagination والبحث
  onPageChange: (page: number) => void;
  onSearchChange: (query: string) => void;
  onCategoryFilter: (categoryId: string) => void;
  onPageSizeChange: (size: number) => void;
  searchQuery: string;
  categoryFilter: string;
  // دالة السكانر
  onBarcodeSearch: (barcode: string) => void;
  isScannerLoading: boolean;
  onOpenMobileScanner?: () => void;
  isCameraScannerSupported?: boolean;
  hasNativeBarcodeDetector?: boolean;
  isMobile?: boolean;
  // ⚡ إخفاء الهيدر الداخلي (للتصميم الجديد Infinity Space)
  hideInternalHeader?: boolean;
}

// واجهة خصائص مكون الرأس
export interface HeaderProps {
  isReturnMode: boolean;
  isLossMode?: boolean;
  filteredProductsCount: number;
  isPOSDataLoading: boolean;
  onRefreshData: () => void;
  // دوال البحث والسكانر
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onBarcodeSearch?: (barcode: string) => void;
  isScannerLoading?: boolean;
  onOpenMobileScanner?: () => void;
  isCameraScannerSupported?: boolean;
  hasNativeBarcodeDetector?: boolean;
  isMobile?: boolean;
}

// واجهة خصائص أدوات التحكم
export interface FilterControlsProps {
  filterState: FilterState;
  availableCategories: Category[];
  filteredProductsCount: number;
  subscriptionsCount: number;
  isAppEnabled: (appName: string) => boolean;
  onFilterChange: (updates: Partial<FilterState>) => void;
  isMobile?: boolean;
}

// واجهة خصائص عنصر المنتج
export interface ProductItemProps {
  product: Product;
  favoriteProducts: any[];
  isReturnMode: boolean;
  isLossMode?: boolean;
  onAddToCart: (product: Product) => void;
}

// واجهة خصائص شبكة المنتجات
export interface ProductsGridProps {
  products: Product[];
  favoriteProducts: any[];
  isReturnMode: boolean;
  isLossMode?: boolean;
  viewMode: ViewMode;
  searchQuery: string;
  selectedCategory: string;
  stockFilter: StockFilter;
  onAddToCart: (product: Product) => void;
  isMobile?: boolean;
}

// واجهة خصائص تبويب الاشتراكات
export interface SubscriptionsTabProps {
  subscriptions: any[];
  categories: any[];
  onAddSubscription: (subscription: any, pricing?: any) => void;
}
