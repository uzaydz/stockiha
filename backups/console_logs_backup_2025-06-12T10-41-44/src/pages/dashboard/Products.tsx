import { useState, useEffect, useMemo } from 'react';
import Layout from '@/components/Layout';
import { toast } from 'sonner';
import { getProducts, getProductsPaginated } from '@/lib/api/products'; // Direct import from products API
import ProductsHeader from '@/components/product/ProductsHeader';
import ProductsList from '@/components/product/ProductsList';
import ProductsFilter from '@/components/product/ProductsFilter';
import AddProductDialog from '@/components/product/AddProductDialog';
import { CustomPagination as Pagination } from '@/components/ui/pagination';
import type { Product } from '@/lib/api/products';
import { useTenant } from '@/context/TenantContext';
import SyncProducts from '@/components/product/SyncProducts';

// Define category type to help with type checking
type CategoryObject = { id: string; name: string; slug: string };

const Products = () => {

  const { currentOrganization } = useTenant();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<string>('newest');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  
  // حالة الـ pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);

  // Debug organization info
  useEffect(() => {
    
  }, [currentOrganization]);

  // جلب المنتجات مع الـ pagination
  const fetchProductsPaginated = async (page: number = currentPage) => {
    if (!currentOrganization?.id) {
      setProducts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const result = await getProductsPaginated(
        currentOrganization.id,
        page,
        pageSize,
        {
          includeInactive: false,
          searchQuery: searchQuery.trim(),
          categoryFilter: categoryFilter || '',
          stockFilter,
          sortOption,
        }
      );

      setProducts(result.products);
      setTotalCount(result.totalCount);
      setTotalPages(result.totalPages);
      setCurrentPage(result.currentPage);
      setHasNextPage(result.hasNextPage);
      setHasPreviousPage(result.hasPreviousPage);
    } catch (error) {
      setLoadError('حدث خطأ أثناء تحميل المنتجات');
      toast.error('حدث خطأ أثناء تحميل المنتجات');
    } finally {
      setIsLoading(false);
    }
  };

  // تأثير لتحميل المنتجات عند تغيير الفلاتر أو الصفحة
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1); // إعادة تعيين الصفحة إلى الأولى عند تغيير الفلاتر
      fetchProductsPaginated(1);
    }, 300); // debounce لتحسين الأداء

    return () => clearTimeout(timeoutId);
  }, [currentOrganization?.id, searchQuery, categoryFilter, sortOption, stockFilter, pageSize]);

  // تأثير منفصل لتغيير الصفحة
  useEffect(() => {
    fetchProductsPaginated(currentPage);
  }, [currentPage]);

  // معالجة تغيير الصفحة
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // معالجة تغيير حجم الصفحة
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // Product refresh after operations
  const refreshProducts = async () => {
    if (!currentOrganization?.id) {
      return;
    }
    
    await fetchProductsPaginated(currentPage);
    toast.success('تم تحديث قائمة المنتجات بنجاح');
  };

  // Handler for dummy sync - returns a promise to match expected type
  const handleDummySync = async (): Promise<void> => {
    toast.info('تم تعطيل المزامنة في هذه النسخة');
    return Promise.resolve();
  };

  // Handler for adding a new product
  const handleAddProduct = () => {
    setIsAddProductOpen(true);
  };

  // Categories list - نحتاج لجلب جميع المنتجات للحصول على الفئات (مؤقتاً)
  const [allProductsForCategories, setAllProductsForCategories] = useState<Product[]>([]);
  
  useEffect(() => {
    // جلب جميع المنتجات للحصول على قائمة الفئات
    const fetchCategoriesData = async () => {
      if (!currentOrganization?.id) return;
      try {
        const allProducts = await getProducts(currentOrganization.id);
        setAllProductsForCategories(allProducts);
      } catch (error) {
      }
    };
    
    fetchCategoriesData();
  }, [currentOrganization?.id]);

  const categories = useMemo(() => {
    return [...new Set(
      allProductsForCategories
        .map(product => {
          if (!product.category) return '';
          
          if (typeof product.category === 'object' && product.category !== null) {
            return (product.category as CategoryObject).name || '';
          }
          
          return String(product.category);
        })
        .filter(Boolean) // إزالة القيم الفارغة
    )];
  }, [allProductsForCategories]);

  // إعادة تحميل المنتجات يدويًا
  const handleRetry = () => {
    setLoadError(null);
    fetchProductsPaginated(1);
  };

  // عرض حالة الخطأ
  const renderErrorState = () => (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-8 border border-destructive/20 rounded-lg bg-destructive/5">
      <div className="text-destructive mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-destructive mb-2">حدث خطأ أثناء تحميل المنتجات</h3>
      <p className="text-sm text-destructive/80 mb-4">{loadError || 'حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى.'}</p>
      <button
        onClick={handleRetry}
        className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
      >
        إعادة المحاولة
      </button>
    </div>
  );

  // عرض حالة عدم وجود منتجات
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-8 border border-border rounded-lg bg-muted/30">
      <div className="text-muted-foreground mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">لا توجد منتجات</h3>
      <p className="text-sm text-muted-foreground mb-4">قم بإضافة منتجات جديدة لعرضها هنا</p>
      <button
        onClick={handleAddProduct}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
      >
        إضافة منتج جديد
      </button>
    </div>
  );

  return (
    <Layout>
      <SyncProducts
        count={unsyncedCount}
        onSync={handleDummySync}
        isSyncing={isSyncing}
      />
      
      <div className="container mx-auto py-6">
        <ProductsHeader
          productCount={totalCount}
          onAddProduct={() => setIsAddProductOpen(true)}
          products={products}
          onAddProductClick={() => setIsAddProductOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortOption={sortOption}
          onSortChange={setSortOption}
          totalProducts={totalCount}
          onShowFilter={() => {}} // أضف وظيفة إظهار الفلتر هنا
          isSyncing={isSyncing}
          unsyncedCount={unsyncedCount}
          onSync={handleDummySync}
        />
        
        <div className="mt-6">
          <ProductsFilter
            onCategoryChange={setCategoryFilter}
            categoryFilter={categoryFilter}
            onStockFilterChange={setStockFilter}
            stockFilter={stockFilter}
          />
        </div>
        
        {loadError ? (
          renderErrorState()
        ) : isLoading ? (
          <div className="flex justify-center items-center mt-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        ) : products.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            <div className="mt-6">
              <ProductsList products={products} onRefreshProducts={refreshProducts} />
            </div>
            
            {/* مكون الـ Pagination */}
            {totalPages > 1 && (
              <div className="mt-8">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  showSizeChanger={true}
                  pageSize={pageSize}
                  onPageSizeChange={handlePageSizeChange}
                  totalItems={totalCount}
                  loading={isLoading}
                />
              </div>
            )}
          </>
        )}
        
        <AddProductDialog
          open={isAddProductOpen}
          onOpenChange={setIsAddProductOpen}
          onProductAdded={refreshProducts}
        />
      </div>
    </Layout>
  );
};

export default Products;
