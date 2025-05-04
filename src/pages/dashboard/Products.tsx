import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { toast } from 'sonner';
import { getProducts } from '@/lib/api/offlineProductsAdapter';
import { syncIndexDBProducts } from '@/lib/api/indexedDBProducts';
import ProductsHeader from '@/components/product/ProductsHeader';
import ProductsList from '@/components/product/ProductsList';
import ProductsFilter from '@/components/product/ProductsFilter';
import AddProductDialog from '@/components/product/AddProductDialog';
import type { Product } from '@/lib/api/products';
import { useTenant } from '@/context/TenantContext';
import SyncProducts from '@/components/product/SyncProducts';

const Products = () => {
  const { currentOrganization } = useTenant();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<string>('newest');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [unsyncedCount, setUnsyncedCount] = useState(0);

  // Fetch products data
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        if (!currentOrganization) {
          console.log("لا توجد مؤسسة حالية، لا يمكن جلب المنتجات");
          setProducts([]);
          setFilteredProducts([]);
          return;
        }
          
        const productsData = await getProducts(currentOrganization.id);
        setProducts(productsData);
        setFilteredProducts(productsData);

        // حساب عدد المنتجات غير المتزامنة
        const unsyncedItems = productsData.filter(p => p.id.startsWith('temp_') || (p as any).synced === false);
        setUnsyncedCount(unsyncedItems.length);
      } catch (error) {
        console.error('Error fetching products:', error);
        toast.error('حدث خطأ أثناء تحميل المنتجات');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [currentOrganization]);

  // Apply filters and search
  useEffect(() => {
    let result = [...products];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        product => 
          product.name.toLowerCase().includes(query) || 
          product.description.toLowerCase().includes(query) ||
          product.sku.toLowerCase().includes(query) ||
          (product.barcode && product.barcode.toLowerCase().includes(query))
      );
    }

    // Apply category filter
    if (categoryFilter) {
      result = result.filter(product => product.category === categoryFilter);
    }

    // Apply stock filter
    if (stockFilter !== 'all') {
      if (stockFilter === 'in-stock') {
        result = result.filter(product => product.stock_quantity > 0);
      } else if (stockFilter === 'out-of-stock') {
        result = result.filter(product => product.stock_quantity === 0);
      } else if (stockFilter === 'low-stock') {
        result = result.filter(product => product.stock_quantity > 0 && product.stock_quantity <= 5);
      }
    }

    // Apply sorting
    if (sortOption === 'newest') {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortOption === 'oldest') {
      result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortOption === 'price-high') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortOption === 'price-low') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortOption === 'name-asc') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === 'name-desc') {
      result.sort((a, b) => b.name.localeCompare(a.name));
    }

    setFilteredProducts(result);
  }, [products, searchQuery, categoryFilter, sortOption, stockFilter]);

  // Product refresh after operations
  const refreshProducts = async () => {
    try {
      if (!currentOrganization) {
        console.log("لا توجد مؤسسة حالية، لا يمكن تحديث المنتجات");
        return;
      }
        
      const productsData = await getProducts(currentOrganization.id);
      setProducts(productsData);
      
      // حساب عدد المنتجات غير المتزامنة بعد التحديث
      const unsyncedItems = productsData.filter(p => p.id.startsWith('temp_') || (p as any).synced === false);
      setUnsyncedCount(unsyncedItems.length);
      
      toast.success('تم تحديث قائمة المنتجات بنجاح');
    } catch (error) {
      console.error('Error refreshing products:', error);
      toast.error('حدث خطأ أثناء تحديث المنتجات');
    }
  };

  // مزامنة المنتجات مع الخادم
  const handleSync = async () => {
    if (navigator.onLine) {
      setIsSyncing(true);
      try {
        const { success, syncedCount } = await syncIndexDBProducts();
        if (syncedCount > 0) {
          toast.success(`تمت مزامنة ${syncedCount} منتج بنجاح`);
          // تحديث قائمة المنتجات بعد المزامنة
          await refreshProducts();
        } else {
          toast.info('لا توجد منتجات غير متزامنة');
        }
      } catch (error) {
        console.error('Error syncing products:', error);
        toast.error('حدث خطأ أثناء مزامنة المنتجات');
      } finally {
        setIsSyncing(false);
      }
    } else {
      toast.warning('لا يمكن مزامنة المنتجات عندما تكون غير متصل بالإنترنت');
    }
  };

  // Handler for adding a new product
  const handleAddProduct = () => {
    setIsAddProductOpen(true);
  };

  // Categories list - معالجة الحالتين عندما تكون الفئة كائنًا أو نصًا
  const categories = [...new Set(
    products
      .map(product => {
        if (!product.category) return '';
        return typeof product.category === 'object' && product.category !== null
          ? (product.category as { name: string }).name
          : product.category;
      })
      .filter(Boolean) // إزالة القيم الفارغة
  )];

  return (
    <Layout>
      {isLoading ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg">جاري تحميل المنتجات...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6 w-full">
          {/* Products Header with Title and Add Button */}
          <div className="flex justify-between items-center">
            <ProductsHeader 
              productCount={filteredProducts.length}
              onAddProduct={handleAddProduct}
              products={filteredProducts}
            />
            
            {/* إضافة زر المزامنة */}
            {unsyncedCount > 0 && (
              <SyncProducts 
                count={unsyncedCount}
                onSync={handleSync}
                isSyncing={isSyncing}
              />
            )}
          </div>
          
          {/* Filters Row */}
          <ProductsFilter
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            categories={categories}
            selectedCategory={categoryFilter}
            onCategoryChange={setCategoryFilter}
            sortOption={sortOption}
            onSortChange={setSortOption}
            stockFilter={stockFilter}
            onStockFilterChange={setStockFilter}
          />
          
          {/* Products List */}
          <ProductsList 
            products={filteredProducts}
            onRefreshProducts={refreshProducts}
          />
          
          {/* Add Product Dialog */}
          <AddProductDialog
            open={isAddProductOpen}
            onOpenChange={setIsAddProductOpen}
            onProductAdded={refreshProducts}
          />
        </div>
      )}
    </Layout>
  );
};

export default Products; 