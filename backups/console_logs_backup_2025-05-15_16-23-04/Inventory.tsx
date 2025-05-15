import { useState, useEffect, useCallback, useRef } from 'react';
import Layout from '@/components/Layout';
import { toast } from 'sonner';
import { getInventoryProducts, getProductsToReorder } from '@/lib/api/inventory';
import { filterInventoryProducts, getInventoryStats, getProductCategories } from '@/lib/api/inventory';
import type { Product, ProductCategory } from '@/types';
import type { InventoryFilters, InventoryStats } from '@/lib/api/inventory';
import InventoryHeader from '@/components/inventory/InventoryHeader';
import InventoryFilter from '@/components/inventory/InventoryFilter';
import InventoryTable from '@/components/inventory/InventoryTable';
import StockUpdateDialog from '@/components/inventory/StockUpdateDialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Package, 
  AlertCircle, 
  History,
  ShoppingCart,
  Loader2,
  WifiOff,
  Cloud,
  CloudOff,
  Lock,
  Database,
  PackageMinus,
  PackageX,
  ArrowDown,
  ArrowUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import useInventorySync from '@/hooks/useInventorySync';
import { useAuth } from '@/context/AuthContext';
import { checkUserPermissions } from '@/lib/api/permissions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const Inventory = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [productsToReorder, setProductsToReorder] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReorderLoading, setIsReorderLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [stockFilter, setStockFilter] = useState<'all' | 'in-stock' | 'low-stock' | 'out-of-stock'>('all');
  const [sortOption, setSortOption] = useState<string>('name-asc');
  const [activeTab, setActiveTab] = useState<'all' | 'to-reorder'>('all');
  const [stats, setStats] = useState<InventoryStats>({
    totalProducts: 0,
    inStockProducts: 0,
    lowStockProducts: 0,
    outOfStockProducts: 0
  });
  
  // إضافة دعم التجزئة (pagination)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [productsPerPage] = useState(50);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Stock Update Dialog
  const [isStockUpdateOpen, setIsStockUpdateOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // استخدام hook مزامنة المخزون
  const { isOnline, isSyncing, unsyncedCount, syncInventory, fetchUnsyncedCount } = useInventorySync();

  // استدعاء معلومات المستخدم من سياق المصادقة
  const { user } = useAuth();
  
  // صلاحيات المستخدم
  const [canViewInventory, setCanViewInventory] = useState(false);
  const [canManageInventory, setCanManageInventory] = useState(false);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);
  
  // إضافة متغير لتتبع حالة التحديث ومنع التحديثات المتزامنة
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // التحقق من صلاحيات المستخدم
  useEffect(() => {
    const checkPermissions = async () => {
      if (!user) {
        setCanViewInventory(false);
        setCanManageInventory(false);
        setIsCheckingPermissions(false);
        return;
      }
      
      console.log('التحقق من صلاحيات المستخدم للمخزون:', user);
      
      // التحقق من صلاحية مشاهدة المخزون
      const hasViewPermission = await checkUserPermissions(user, 'viewInventory');
      console.log('نتيجة التحقق من صلاحية viewInventory:', hasViewPermission);
      setCanViewInventory(hasViewPermission);
      
      // التحقق من صلاحية تعديل المخزون
      const hasManagePermission = await checkUserPermissions(user, 'manageInventory');
      console.log('نتيجة التحقق من صلاحية manageInventory:', hasManagePermission);
      setCanManageInventory(hasManagePermission);
      
      setIsCheckingPermissions(false);
    };
    
    checkPermissions();
  }, [user]);

  // Fetch products data and categories
  const fetchProducts = useCallback(async (page: number, isInitialLoad = false) => {
    try {
      // عند التحميل الأولي، نعرض مؤشر التحميل للصفحة كاملة
      if (isInitialLoad) {
        setIsLoading(true);
      } else {
        // عند تحميل المزيد، نعرض مؤشر التحميل للمزيد فقط
        setIsLoadingMore(true);
      }
      
      // جلب المنتجات مع دعم الصفحات
      const result = await getInventoryProducts(page, productsPerPage);
      
      // إذا كانت الصفحة الأولى، نستبدل المنتجات
      // وإلا نضيف المنتجات الجديدة إلى القائمة الحالية
      if (page === 1) {
        setProducts(result.products);
      } else {
        setProducts(prevProducts => [...prevProducts, ...result.products]);
      }
      
      // تحديث إجمالي عدد المنتجات
      setTotalProducts(result.totalCount);
      
      // حساب الإحصائيات
      if (page === 1) {
        setStats(getInventoryStats(result.products));
      } else {
        setProducts(prevProducts => {
          const updatedProducts = [...prevProducts, ...result.products];
          setStats(getInventoryStats(updatedProducts));
          return updatedProducts;
        });
      }
      
      // جلب التصنيفات عند التحميل الأولي فقط
      if (isInitialLoad) {
        const categoriesData = await getProductCategories();
        setCategories(categoriesData);
        
        // التحقق من وجود عمليات غير متزامنة
        fetchUnsyncedCount();
      }
    } catch (error) {
      console.error('Error fetching inventory data:', error);
      toast.error('حدث خطأ أثناء تحميل بيانات المخزون');
    } finally {
      if (isInitialLoad) {
        setIsLoading(false);
      } else {
        setIsLoadingMore(false);
      }
    }
  }, [productsPerPage, fetchUnsyncedCount]);
  
  // تحميل المنتجات عند تحميل الصفحة - استخدام useRef لضمان التحميل مرة واحدة فقط
  const initialLoadDoneRef = useRef(false);
  
  useEffect(() => {
    if (!initialLoadDoneRef.current && (canViewInventory || !isCheckingPermissions)) {
      fetchProducts(1, true);
      initialLoadDoneRef.current = true;
    }
  }, [fetchProducts, canViewInventory, isCheckingPermissions]);
  
  // وظيفة تحميل المزيد من المنتجات
  const loadMoreProducts = useCallback(() => {
    if (!isLoadingMore && products.length < totalProducts) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchProducts(nextPage);
    }
  }, [isLoadingMore, products.length, totalProducts, currentPage, fetchProducts]);

  // Fetch products that need reordering
  useEffect(() => {
    const fetchReorderProducts = async () => {
      if (activeTab !== 'to-reorder') return;
      
      setIsReorderLoading(true);
      try {
        const data = await getProductsToReorder();
        setProductsToReorder(data);
      } catch (error) {
        console.error('Error fetching products to reorder:', error);
        toast.error('حدث خطأ أثناء تحميل قائمة المنتجات التي تحتاج إعادة طلب');
      } finally {
        setIsReorderLoading(false);
      }
    };
    
    fetchReorderProducts();
  }, [activeTab]);

  // Apply filters and search
  useEffect(() => {
    // Create filters object
    const filters: InventoryFilters = {
      searchQuery,
      category: selectedCategory || undefined,
      stockFilter,
      sortBy: sortOption as any,
    };
    
    // Apply filters
    const filtered = filterInventoryProducts(products, filters);
    setFilteredProducts(filtered);
  }, [products, searchQuery, selectedCategory, stockFilter, sortOption]);

  // Product refresh after operations
  const refreshProducts = async () => {
    // تجنب التحديثات المتزامنة
    if (isRefreshing) {
      console.log('هناك عملية تحديث قيد التنفيذ بالفعل، تم تجاهل طلب التحديث');
      return;
    }
    
    // إلغاء أي مؤقت تحديث سابق
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
    
    setIsRefreshing(true);
    
    try {
      console.log('بدء تحديث قائمة المنتجات...');
      
      // تحقق من حالة الاتصال
      if (!isOnline) {
        console.log('نحن في وضع عدم الاتصال، سنحاول تحديث البيانات من التخزين المحلي');
        
        try {
          // إنشاء اتصال مباشر بقاعدة بيانات Dexie المحلية
          const inventoryDB = await import('@/lib/db/inventoryDB');
          
          // جلب بيانات المخزون من قاعدة البيانات المحلية
          const inventory = await inventoryDB.inventoryDB.inventory.toArray();
          
          // تحويل بيانات المخزون إلى صيغة المنتجات
          const localProducts = inventory.map(item => {
            // تحويل البيانات في قاعدة البيانات المحلية إلى نوع Product
            const product: Product = {
              id: item.product_id,
              name: item.product_id,
              stockQuantity: item.stock_quantity,
              stock_quantity: item.stock_quantity,
              updatedAt: item.last_updated || new Date(),
              sku: 'SKU غير متوفر',
              category: 'accessories' as ProductCategory,
              min_stock_level: 5,
              reorder_level: 10,
              reorder_quantity: 20,
              images: [],
              thumbnailImage: '',
              description: '',
              price: 0,
              isDigital: false,
              createdAt: new Date(),
              synced: false
            };
            return product;
          });
          
          // تحديث حالة المكونات
          setProducts(localProducts);
          setStats(getInventoryStats(localProducts));
          console.log('تم تحديث المنتجات من التخزين المحلي', localProducts.length);
        } catch (localError) {
          console.error('خطأ في تحديث المنتجات محليًا:', localError);
        }
        
        // تحديث عدد العناصر غير المتزامنة
        fetchUnsyncedCount();
        
        setIsRefreshing(false);
        return; // لا داعي للاستمرار إذا كنا في وضع عدم اتصال
      }
      
      // في وضع الاتصال، إعادة تحميل البيانات من الصفحة الأولى
      setCurrentPage(1);
      await fetchProducts(1, true);
      
      if (activeTab === 'to-reorder') {
        const reorderData = await getProductsToReorder();
        setProductsToReorder(reorderData);
      }
      
      // تحديث عدد العناصر غير المتزامنة
      fetchUnsyncedCount();
      
      toast.success('تم تحديث قائمة المخزون بنجاح');
    } catch (error) {
      console.error('Error refreshing products:', error);
      toast.error('حدث خطأ أثناء تحديث المخزون');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle product stock update
  const handleStockUpdate = (product: Product) => {
    // التحقق من صلاحية تعديل المخزون
    if (!canManageInventory) {
      toast.error('ليس لديك صلاحية تعديل المخزون');
      return;
    }
    
    setSelectedProduct(product);
    setIsStockUpdateOpen(true);
  };
  
  // معالجة إغلاق نافذة تحديث المخزون
  const handleStockUpdateDialogClose = (open: boolean) => {
    setIsStockUpdateOpen(open);
    
    // عند إغلاق النافذة، تأخير إزالة المنتج المحدد لتجنب الأخطاء
    if (!open) {
      setTimeout(() => {
        setSelectedProduct(null);
      }, 300);
    }
  };
  
  // وظيفة تحديث المخزون بعد تعديله
  const handleStockUpdated = async () => {
    // منع التحديثات المتكررة باستخدام مؤقت للتأخير
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    // تأخير التحديث قليلاً لإعطاء وقت للتحديثات الأخرى
    refreshTimeoutRef.current = setTimeout(() => {
      refreshProducts();
      refreshTimeoutRef.current = null;
    }, 500);
    
    return Promise.resolve();
  };
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value as 'all' | 'to-reorder');
  };
  
  // مزامنة المخزون مع الخادم
  const handleSyncInventory = async () => {
    const syncedCount = await syncInventory();
    if (syncedCount > 0) {
      // تحديث المنتجات بعد المزامنة
      refreshProducts();
    }
  };

  // عرض رسالة عدم وجود صلاحية
  if (!canViewInventory && !isCheckingPermissions) {
    return (
      <Layout>
        <div className="container mx-auto py-10">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>ليس لديك صلاحية</AlertTitle>
            <AlertDescription>
              ليس لديك صلاحية للوصول إلى صفحة المخزون. يرجى التواصل مع مدير النظام للحصول على هذه الصلاحية.
            </AlertDescription>
          </Alert>
          
          <div className="flex justify-center items-center mt-10 py-20">
            <div className="text-center">
              <Lock className="h-16 w-16 mx-auto text-muted-foreground/50" />
              <h2 className="mt-4 text-xl font-semibold">صفحة محظورة</h2>
              <p className="mt-2 text-muted-foreground">
                ليس لديك صلاحية للوصول إلى هذه الصفحة. يرجى التواصل مع مدير النظام.
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }
  
  // عرض مؤشر تحميل أثناء التحقق من الصلاحيات
  if (isCheckingPermissions) {
    return (
      <Layout>
        <div className="container mx-auto py-10">
          <div className="flex justify-center items-center min-h-[200px]">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">جاري التحقق من الصلاحيات...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-10">
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <Database className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">إدارة المخزون</h1>
              <p className="text-muted-foreground">
                متابعة وتحديث كميات المنتجات في المخزون
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Stock Items */}
            <div className="bg-background border rounded-lg p-4 flex items-center">
              <div className="bg-primary/10 p-3 rounded-full ml-4">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">إجمالي المنتجات</p>
                <p className="text-2xl font-bold">{stats.totalProducts}</p>
              </div>
            </div>
            
            {/* In Stock Items */}
            <div className="bg-background border rounded-lg p-4 flex items-center">
              <div className="bg-green-100 p-3 rounded-full ml-4">
                <Package className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">متوفر في المخزون</p>
                <p className="text-2xl font-bold">{stats.inStockProducts}</p>
              </div>
            </div>
            
            {/* Low Stock Items */}
            <div className="bg-background border rounded-lg p-4 flex items-center">
              <div className="bg-amber-100 p-3 rounded-full ml-4">
                <PackageMinus className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">منخفض المخزون</p>
                <p className="text-2xl font-bold">{stats.lowStockProducts}</p>
              </div>
            </div>
            
            {/* Out of Stock Items */}
            <div className="bg-background border rounded-lg p-4 flex items-center">
              <div className="bg-red-100 p-3 rounded-full ml-4">
                <PackageX className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">نفذ من المخزون</p>
                <p className="text-2xl font-bold">{stats.outOfStockProducts}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* عرض تحذير لصلاحية المشاهدة فقط */}
        {canViewInventory && !canManageInventory && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>صلاحية محدودة</AlertTitle>
            <AlertDescription>
              لديك صلاحية مشاهدة المخزون فقط. لا يمكنك تعديل كميات المخزون. 
              إذا كنت تحتاج إلى صلاحية التعديل، يرجى التواصل مع مدير النظام.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-6 w-full">
          {/* Inventory Header with Title and Stats */}
          {/* تم استبدال استدعاء InventoryHeader بالكود المباشر في الأعلى */}
          
          {/* Tabs for All Products and Products to Reorder */}
          <Tabs 
            defaultValue="all" 
            value={activeTab} 
            onValueChange={handleTabChange}
            className="w-full"
          >
            <div className="flex items-center justify-between mb-4">
              <TabsList className="grid w-96 grid-cols-2">
                <TabsTrigger value="all" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  جميع المنتجات
                </TabsTrigger>
                <TabsTrigger value="to-reorder" className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  يحتاج إعادة طلب
                  {stats.lowStockProducts > 0 && (
                    <span className="flex items-center justify-center bg-amber-100 text-amber-700 rounded-full h-5 w-5 text-xs font-medium">
                      {stats.lowStockProducts}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
              
              <div className="flex items-center gap-2">
                {!isOnline && (
                  <Badge variant="outline" className="bg-amber-50 flex items-center gap-1 border-amber-200">
                    <WifiOff className="h-3 w-3 text-amber-600" />
                    <span className="text-amber-700">وضع عدم الاتصال</span>
                  </Badge>
                )}
                
                {unsyncedCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 text-xs"
                    onClick={handleSyncInventory}
                    disabled={!isOnline || isSyncing}
                  >
                    {isSyncing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Cloud className="h-3.5 w-3.5" />
                    )}
                    مزامنة المخزون
                    <Badge variant="secondary" className="ml-1">
                      {unsyncedCount}
                    </Badge>
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 text-xs"
                  onClick={refreshProducts}
                >
                  <History className="h-3.5 w-3.5" />
                  تحديث
                </Button>
              </div>
            </div>
            
            <TabsContent value="all" className="m-0">
              {/* Filters Row */}
              <InventoryFilter
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                categories={categories}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                sortOption={sortOption}
                onSortChange={setSortOption}
                stockFilter={stockFilter}
                onStockFilterChange={(value) => setStockFilter(value as any)}
              />
              
              {/* Inventory Table */}
              <div className="mt-4">
                {isLoading ? (
                  <div className="flex justify-center items-center min-h-[200px]">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">جاري تحميل بيانات المخزون...</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <InventoryTable 
                      products={filteredProducts}
                      onStockUpdate={handleStockUpdate}
                      onProductUpdated={refreshProducts}
                      canEdit={canManageInventory}
                    />
                    
                    {/* زر تحميل المزيد من المنتجات */}
                    {products.length < totalProducts && (
                      <div className="flex justify-center mt-6">
                        <Button 
                          variant="outline" 
                          onClick={loadMoreProducts}
                          disabled={isLoadingMore}
                          className="w-64"
                        >
                          {isLoadingMore ? (
                            <>
                              <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                              جاري تحميل المزيد...
                            </>
                          ) : (
                            <>
                              <ArrowDown className="h-4 w-4 ml-2" />
                              تحميل المزيد من المنتجات
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                    
                    {/* إظهار معلومات عدد المنتجات المعروضة من الإجمالي */}
                    <div className="text-center text-sm text-muted-foreground mt-4">
                      يتم عرض {filteredProducts.length} من أصل {totalProducts} منتج
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="to-reorder" className="m-0">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 ml-3" />
                  <div>
                    <h3 className="text-amber-800 font-medium mb-1">منتجات بحاجة إلى إعادة طلب</h3>
                    <p className="text-amber-700 text-sm">
                      هذه القائمة تعرض المنتجات التي وصلت كمياتها إلى أو أقل من حد إعادة الطلب المحدد لكل منتج.
                    </p>
                  </div>
                </div>
              </div>
              
              {isReorderLoading ? (
                <div className="flex justify-center items-center min-h-[200px]">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">جاري تحميل المنتجات التي تحتاج إعادة طلب...</p>
                  </div>
                </div>
              ) : (
                <InventoryTable 
                  products={productsToReorder}
                  onStockUpdate={handleStockUpdate}
                  onProductUpdated={refreshProducts}
                  canEdit={canManageInventory}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Stock Update Dialog */}
      <StockUpdateDialog 
        open={isStockUpdateOpen} 
        onOpenChange={handleStockUpdateDialogClose}
        product={selectedProduct}
        onStockUpdated={handleStockUpdated}
      />
    </Layout>
  );
};

export default Inventory; 