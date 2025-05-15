import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { toast } from 'sonner';
import { getProducts } from '@/lib/api/products'; // Direct import from products API
import ProductsHeader from '@/components/product/ProductsHeader';
import ProductsList from '@/components/product/ProductsList';
import ProductsFilter from '@/components/product/ProductsFilter';
import AddProductDialog from '@/components/product/AddProductDialog';
import type { Product } from '@/lib/api/products';
import { useTenant } from '@/context/TenantContext';
import SyncProducts from '@/components/product/SyncProducts';

// Define category type to help with type checking
type CategoryObject = { id: string; name: string; slug: string };

const Products = () => {
  
  
  const { currentOrganization } = useTenant();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<string>('newest');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [unsyncedCount, setUnsyncedCount] = useState(0);

  // Debug organization info
  useEffect(() => {
    
  }, [currentOrganization]);

  // Fetch products data - simplified version with direct DB query
  useEffect(() => {
    let isMounted = true;
    let timeoutId: number;
    
    const fetchProducts = async () => {
      if (!currentOrganization?.id) {
        
        if (isMounted) {
          setProducts([]);
          setFilteredProducts([]);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setLoadError(null);
      
      // Set timeout for loading - shorter timeout
      timeoutId = setTimeout(() => {
        if (isMounted) {
          console.error("انتهت مهلة جلب المنتجات");
          setLoadError("انتهت مهلة الاتصال. الرجاء المحاولة مرة أخرى.");
          setIsLoading(false);
        }
      }, 15000) as unknown as number;
      
      try {
        
        
        // Create a new direct Supabase client to bypass potential issues
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wrnssatuvmumsczyldth.supabase.co';
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybnNzYXR1dm11bXNjenlsZHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNTgxMTYsImV4cCI6MjA1ODgzNDExNn0.zBT3h3lXQgcFqzdpXARVfU9kwRLvNiQrSdAJwMdojYY';
        
        
        const directClient = createClient(supabaseUrl, supabaseAnonKey);
        
        // Implement direct query with a Promise.race to handle timeouts
        const directQueryPromise = directClient
          .from('products')
          .select('*')
          .eq('organization_id', currentOrganization.id)
          .eq('is_active', true);
        
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Database query timeout')), 5000);
        });
        
        
        const { data, error } = await Promise.race([
          directQueryPromise,
          timeoutPromise
        ]) as any;
        
        if (error) {
          console.error("Direct query error:", error);
          throw error;
        }
        
        
        
        if (!isMounted) {
          
          return;
        }
        
        
        setProducts(data);
        setFilteredProducts(data);
      } catch (error) {
        console.error('Error fetching products:', error);
        if (isMounted) {
          setLoadError('حدث خطأ أثناء تحميل المنتجات');
          toast.error('حدث خطأ أثناء تحميل المنتجات');
        }
      } finally {
        clearTimeout(timeoutId);
        if (isMounted) {
          
          setIsLoading(false);
        }
      }
    };

    fetchProducts();
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [currentOrganization]);

  // Apply filters and search
  useEffect(() => {
    if (products.length === 0) {
      setFilteredProducts([]);
      return;
    }
    
    let result = [...products];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        product => 
          product.name.toLowerCase().includes(query) || 
          (product.description && product.description.toLowerCase().includes(query)) ||
          (product.sku && product.sku.toLowerCase().includes(query)) ||
          (product.barcode && product.barcode.toLowerCase().includes(query))
      );
    }

    // Apply category filter
    if (categoryFilter) {
      result = result.filter(product => {
        if (!product.category) return false;
        
        if (typeof product.category === 'object' && product.category) {
          return (product.category as CategoryObject).id === categoryFilter;
        } else if (typeof product.category === 'string') {
          return product.category === categoryFilter;
        }
        return false;
      });
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
    if (!currentOrganization?.id) {
      
      return;
    }
    
    setIsLoading(true);
    setLoadError(null);
    
    try {
      
      const productsData = await getProducts(currentOrganization.id);
      
      
      setProducts(productsData);
      toast.success('تم تحديث قائمة المنتجات بنجاح');
    } catch (error) {
      console.error('Error refreshing products:', error);
      toast.error('حدث خطأ أثناء تحديث المنتجات');
      setLoadError('حدث خطأ أثناء تحديث المنتجات');
    } finally {
      setIsLoading(false);
    }
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

  // Categories list - معالجة الحالتين عندما تكون الفئة كائنًا أو نصًا
  const categories = [...new Set(
    products
      .map(product => {
        if (!product.category) return '';
        
        if (typeof product.category === 'object' && product.category !== null) {
          return (product.category as CategoryObject).name || '';
        }
        
        return String(product.category);
      })
      .filter(Boolean) // إزالة القيم الفارغة
  )];

  // إعادة تحميل المنتجات يدويًا
  const handleRetry = () => {
    setLoadError(null);
    refreshProducts();
  };

  // عرض حالة الخطأ
  const renderErrorState = () => (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-8 border border-red-200 rounded-lg bg-red-50">
      <div className="text-red-500 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-red-800 mb-2">حدث خطأ أثناء تحميل المنتجات</h3>
      <p className="text-sm text-red-600 mb-4">{loadError || 'حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى.'}</p>
      <button
        onClick={handleRetry}
        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
      >
        إعادة المحاولة
      </button>
    </div>
  );

  // عرض حالة عدم وجود منتجات
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-8 border border-gray-200 rounded-lg bg-gray-50">
      <div className="text-gray-400 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-800 mb-2">لا توجد منتجات</h3>
      <p className="text-sm text-gray-600 mb-4">قم بإضافة منتجات جديدة لعرضها هنا</p>
      <button
        onClick={handleAddProduct}
        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
      >
        إضافة منتج جديد
      </button>
    </div>
  );

  return (
    <Layout>
      <SyncProducts
        isLoading={isLoading}
        onSyncComplete={refreshProducts}
        onUnsyncedCountChange={setUnsyncedCount}
      />
      
      <div className="container mx-auto py-6">
        <ProductsHeader
          productCount={products.length}
          onAddProduct={() => setIsAddProductOpen(true)}
          products={products}
          onAddProductClick={() => setIsAddProductOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortOption={sortOption}
          onSortChange={setSortOption}
          totalProducts={products.length}
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
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          renderEmptyState()
        ) : (
          <div className="mt-6">
            <ProductsList products={filteredProducts} onProductsChanged={refreshProducts} />
          </div>
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