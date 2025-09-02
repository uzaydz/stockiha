import React, { useState, useEffect, useMemo } from 'react';
import { useProductsCache } from '@/hooks/useProductsCache';
import { useDebounce } from '@/hooks/useDebounce';
import ProductsSearchHeader from './ProductsSearchHeader';
import ProductsList from './ProductsList';
import ProductsFilter from './ProductsFilter';
import { CustomPagination as Pagination } from '@/components/ui/pagination';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Plus, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { checkUserPermissionsLocal } from '@/lib/utils/permissions-utils';

interface FilterState {
  searchQuery: string;
  categoryFilter: string | null;
  stockFilter: string;
  sortOption: string;
}

const ProductsWithCache: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // فحص صلاحيات المستخدم
  const hasAddProductPermission = useMemo(() => {
    if (!user) return false;
    
    // التحقق من الأدوار الإدارية
    const isAdmin = 
      user.user_metadata?.role === 'admin' ||
      user.user_metadata?.role === 'owner' ||
      user.user_metadata?.is_org_admin === true ||
      user.user_metadata?.is_super_admin === true;
    
    if (isAdmin) return true;
    
    // التحقق من الصلاحيات المحددة
    const permissions = user.user_metadata?.permissions || {};
    return Boolean(permissions.addProducts || permissions.manageProducts);
  }, [user]);
  
  // حالة الفلاتر
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    categoryFilter: null,
    stockFilter: 'all',
    sortOption: 'name-asc'
  });

  // حالة الصفحة
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(12);
  const [showFilters, setShowFilters] = useState(false);

  // تأخير البحث
  const debouncedSearchQuery = useDebounce(filters.searchQuery, 300);

  // استخدام الـ cache
  const {
    products,
    totalCount,
    totalPages,
    currentPage: cachePage,
    hasNextPage,
    hasPreviousPage,
    isLoading,
    error,
    cacheInfo,
    refreshCache,
    clearProductsCache
  } = useProductsCache({
    searchQuery: debouncedSearchQuery,
    categoryFilter: filters.categoryFilter || '',
    stockFilter: filters.stockFilter,
    sortOption: filters.sortOption,
    page: currentPage,
    limit: pageSize,
    autoLoad: true
  });

  // معالجة تغيير البحث
  const handleSearchChange = (query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query }));
    setCurrentPage(1);
  };

  // معالجة البحث بالباركود
  const handleBarcodeSearch = (barcode: string) => {
    setFilters(prev => ({ ...prev, searchQuery: barcode }));
    setCurrentPage(1);
    toast.success(`جاري البحث عن المنتج: ${barcode}`);
  };

  // معالجة تغيير الفلاتر
  const handleFilterChange = (filterType: keyof FilterState, value: string | null) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
    setCurrentPage(1);
  };

  // معالجة تغيير الصفحة
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // معالجة تحديث الـ cache
  const handleRefreshCache = async () => {
    try {
      await refreshCache();
      toast.success('تم تحديث البيانات بنجاح');
    } catch (error) {
      toast.error('فشل في تحديث البيانات');
    }
  };

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-500 mb-4">حدث خطأ: {error}</div>
        <Button onClick={handleRefreshCache}>
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* رأس الصفحة مع الأزرار */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">المنتجات</h1>
          <p className="text-muted-foreground text-sm">
            إدارة {totalCount || 0} منتج في متجرك
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            variant="default" 
            className="flex-1 sm:w-auto whitespace-nowrap" 
            onClick={() => navigate('/dashboard/products/new')}
            disabled={!hasAddProductPermission}
            title={!hasAddProductPermission ? "ليس لديك صلاحية لإضافة منتجات" : ""}
          >
            <Plus className="h-4 w-4 ml-2" />
            إضافة منتج
          </Button>
          <Button 
            variant="outline" 
            className="flex-1 sm:w-auto whitespace-nowrap"
            onClick={() => navigate('/dashboard/quick-barcode-print')}
          >
            <Printer className="h-4 w-4 ml-2" />
            طباعة سريعة
          </Button>
        </div>
      </div>

      {/* رأس البحث */}
      <ProductsSearchHeader
        searchQuery={filters.searchQuery}
        onSearchChange={handleSearchChange}
        onBarcodeSearch={handleBarcodeSearch}
        onRefreshData={handleRefreshCache}
        productsCount={totalCount}
        isLoading={isLoading}
        showBarcodeSearch={true}
      />

      {/* قائمة المنتجات */}
      <ProductsList
        products={products || []}
        isLoading={isLoading}
        viewMode="grid"
        onRefreshProducts={handleRefreshCache}
      />

      {/* الـ Pagination */}
      {(totalPages || 0) > 1 && (
        <div className="flex justify-center mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages || 1}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* إحصائيات */}
      <div className="text-center text-sm text-muted-foreground">
        عرض {products?.length || 0} من أصل {totalCount || 0} منتج
        {debouncedSearchQuery && (
          <span> • البحث عن: "{debouncedSearchQuery}"</span>
        )}
      </div>
    </div>
  );
};

export default ProductsWithCache;
