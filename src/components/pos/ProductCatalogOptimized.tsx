import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Product } from '@/types';
import { Search, Filter, Tag, Package, Percent, Users, Plus, ArrowUpDown, Grid3X3, Grid2X2, List, ChevronDown, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import { useTenant } from '@/context/TenantContext';
import { usePOSData } from '@/context/POSDataContext';
import { unifiedProductService } from '@/services/UnifiedProductService';
import { useInView } from 'react-intersection-observer';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebounce } from '@/hooks/useDebounce';
import { logProductAdd, logError } from '@/utils/inventoryLogger';
import { resolveProductImageSrc } from '@/lib/products/productImageResolver';

interface ProductCatalogOptimizedProps {
  onAddToCart: (product: Product) => void;
  onStockUpdate?: (productId: string, stockChange: number) => void;
  isReturnMode?: boolean;
}

export default function ProductCatalogOptimized({ onAddToCart, onStockUpdate, isReturnMode = false }: ProductCatalogOptimizedProps) {
  const { currentOrganization } = useTenant();
  const { productCategories } = usePOSData();
  
  // حالة البيانات
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<any>(null);
  
  // حالة Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [useCacheBrowse, setUseCacheBrowse] = useState(true); // تصفح من الكاش لتخفيف الضغط
  const [allProducts, setAllProducts] = useState<Product[]>([]); // الكاش الكامل للتصفح
  const [useLocalPagination, setUseLocalPagination] = useState<boolean>(false); // تفعيل pagination من IndexedDB
  const offlineMode = typeof navigator !== 'undefined' ? !navigator.onLine : false;
  
  // حالة الفلترة والبحث
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortOption, setSortOption] = useState<'name' | 'price' | 'stock' | 'created'>('name');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'compact'>('grid');
  const [showFilters, setShowFilters] = useState(true);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  
  // Debounced search query
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  // Infinite scroll observer
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  });
  
  // خطأ في التحميل
  const [error, setError] = useState<string | null>(null);
  
  // مرجع للـ ScrollArea
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const pageSize = useMemo(() => {
    return viewMode === 'grid' ? 50 : viewMode === 'compact' ? 80 : 30;
  }, [viewMode]);

  // ⚡ جلب إحصائيات المنتجات من PowerSync (Offline-First)
  useEffect(() => {
    const fetchStats = async () => {
      if (!currentOrganization?.id) return;
      try {
        unifiedProductService.setOrganizationId(currentOrganization.id);
        const s = await unifiedProductService.getProductStats();
        setStats(s);
      } catch {}
    };
    fetchStats();
  }, [currentOrganization?.id]);

  // تحميل الصفحة الأولى عند تغيير الفلاتر
  useEffect(() => {
    if (!currentOrganization?.id) return;
    const orgId = currentOrganization.id;

    const loadFromCache = async () => {
      setIsInitialLoading(true);
      setError(null);
      try {
        // تقرير متى نستخدم pagination من IndexedDB بشكل مفهرس
        const canUseIndexedPagination = !debouncedSearchQuery && sortOption === 'name';
        setUseLocalPagination(canUseIndexedPagination);

        if (debouncedSearchQuery) {
          // ⚡ بحث محلي سريع من PowerSync (Offline-First)
          unifiedProductService.setOrganizationId(orgId);
          const localMatches = await unifiedProductService.searchProducts(debouncedSearchQuery, 1500);
          const transformed = localMatches.map((p: any) => {
            const imageSrc = resolveProductImageSrc(p, '/placeholder-product.svg');
            return ({
            ...p,
            stockQuantity: p.stock_quantity,
            stock_quantity: p.stock_quantity,
            thumbnailImage: imageSrc,
            thumbnail_image: imageSrc,
            compareAtPrice: p.compare_at_price,
            compare_at_price: p.compare_at_price,
            createdAt: p.created_at ? new Date(p.created_at) : new Date(),
            updatedAt: p.updated_at ? new Date(p.updated_at) : new Date()
          });
          }) as Product[];
          setAllProducts(transformed);
          const filtered = transformed
            .filter(p => (selectedCategory === 'all' ? true : (p as any).category_id === selectedCategory));
          const sorted = filtered.sort((a, b) => {
            const dir = sortOrder === 'ASC' ? 1 : -1;
            switch (sortOption) {
              case 'price': return dir * (((a as any).price || 0) - ((b as any).price || 0));
              case 'stock': {
                const sa = (a as any).stockQuantity ?? (a as any).stock_quantity ?? 0;
                const sb = (b as any).stockQuantity ?? (b as any).stock_quantity ?? 0;
                return dir * (sa - sb);
              }
              case 'created': return dir * ((a as any).createdAt?.getTime?.() - (b as any).createdAt?.getTime?.());
              default: return dir * (a.name?.localeCompare(b.name) || 0);
            }
          });
          setProducts(sorted.slice(0, pageSize));
          setCurrentPage(1);
          setTotalPages(Math.ceil(sorted.length / pageSize));
          setTotalProducts(sorted.length);
          setHasNextPage(sorted.length > pageSize);
          if (scrollAreaRef.current) scrollAreaRef.current.scrollTop = 0;
        } else {
          // ⚡ جلب المنتجات من PowerSync مع Pagination (Offline-First)
          unifiedProductService.setOrganizationId(orgId);
          const filters: any = {
            is_active: true
          };
          if (selectedCategory !== 'all') {
            filters.category_id = selectedCategory;
          }
          
          const res = await unifiedProductService.getProducts(filters, 1, pageSize);
          const transformed = res.data.map((p: any) => {
            const imageSrc = resolveProductImageSrc(p, '/placeholder-product.svg');
            return ({
            ...p,
            stockQuantity: p.stock_quantity,
            stock_quantity: p.stock_quantity,
            thumbnailImage: imageSrc,
            thumbnail_image: imageSrc,
            compareAtPrice: p.compare_at_price,
            compare_at_price: p.compare_at_price,
            createdAt: p.created_at ? new Date(p.created_at) : new Date(),
            updatedAt: p.updated_at ? new Date(p.updated_at) : new Date()
          });
          }) as Product[];
          
          if (canUseIndexedPagination) {
            setProducts(transformed);
            setAllProducts([]);
            setCurrentPage(1);
            setTotalProducts(res.total);
            setTotalPages(Math.ceil(res.total / pageSize));
            setHasNextPage(res.hasMore);
            if (scrollAreaRef.current) scrollAreaRef.current.scrollTop = 0;
          } else {
            // تحميل كامل للتصفح المحلي
            const allRes = await unifiedProductService.getProducts(filters, 1, 10000);
            const allTransformed = allRes.data.map((p: any) => {
              const imageSrc = resolveProductImageSrc(p, '/placeholder-product.svg');
              return ({
              ...p,
              stockQuantity: p.stock_quantity,
              stock_quantity: p.stock_quantity,
              thumbnailImage: imageSrc,
              thumbnail_image: imageSrc,
              compareAtPrice: p.compare_at_price,
              compare_at_price: p.compare_at_price,
              createdAt: p.created_at ? new Date(p.created_at) : new Date(),
              updatedAt: p.updated_at ? new Date(p.updated_at) : new Date()
            });
            }) as Product[];
            setAllProducts(allTransformed);
            const filtered = allTransformed
              .filter(p => (selectedCategory === 'all' ? true : (p as any).category_id === selectedCategory));
            const sorted = filtered.sort((a, b) => {
              const dir = sortOrder === 'ASC' ? 1 : -1;
              switch (sortOption) {
                case 'price': return dir * (((a as any).price || 0) - ((b as any).price || 0));
                case 'stock': {
                  const sa = (a as any).stockQuantity ?? (a as any).stock_quantity ?? 0;
                  const sb = (b as any).stockQuantity ?? (b as any).stock_quantity ?? 0;
                  return dir * (sa - sb);
                }
                case 'created': return dir * ((a as any).createdAt?.getTime?.() - (b as any).createdAt?.getTime?.());
                default: return dir * (a.name?.localeCompare(b.name) || 0);
              }
            });
            setProducts(sorted.slice(0, pageSize));
            setCurrentPage(1);
            setTotalPages(Math.ceil(sorted.length / pageSize));
            setTotalProducts(sorted.length);
            setHasNextPage(sorted.length > pageSize);
            if (scrollAreaRef.current) scrollAreaRef.current.scrollTop = 0;
          }
        }
      } catch (e) {
        setError('تعذر تحميل المنتجات من الكاش');
      } finally {
        setIsInitialLoading(false);
      }
    };

    // ⚡ دائماً نستخدم PowerSync (Offline-First)
    void loadFromCache();
  }, [debouncedSearchQuery, selectedCategory, sortOption, sortOrder, currentOrganization?.id, pageSize, useCacheBrowse, offlineMode]);

  // دالة لتحديث المخزون محلياً (يمكن استدعاؤها من الخارج)
  const updateLocalStock = useCallback((productId: string, stockChange: number) => {
    setProducts(prevProducts =>
      prevProducts.map((product) => {
        if (product.id !== productId) {
          return product;
        }

        const clamp = (value: number) => Math.max(0, value);
        const nextStockQuantity = clamp((product.stockQuantity ?? product.stock_quantity ?? 0) + stockChange);

        return {
          ...product,
          stockQuantity: nextStockQuantity,
          stock_quantity: nextStockQuantity,
          actual_stock_quantity: nextStockQuantity,
          total_variants_stock: nextStockQuantity
        };
      })
    );
  }, []);

  // تمرير دالة تحديث المخزون للمكون الأب
  useEffect(() => {
    if (onStockUpdate) {
      // إرسال مرجع للدالة للمكون الأب
      onStockUpdate('__update_function__', updateLocalStock as any);
    }
  }, [onStockUpdate, updateLocalStock]);

  // إضافة دالة للتحديث اليدوي
  const handleManualRefresh = useCallback(async () => {
    if (!currentOrganization?.id || isInitialLoading) return;
    setIsInitialLoading(true);
    setError(null);
    try {
      // ⚡ جلب كل المنتجات من PowerSync (Offline-First)
      unifiedProductService.setOrganizationId(currentOrganization.id);
      const filters: any = { is_active: true };
      if (selectedCategory !== 'all') {
        filters.category_id = selectedCategory;
      }
      const res = await unifiedProductService.getProducts(filters, 1, 10000);
      const transformed = res.data.map((p: any) => {
        const imageSrc = resolveProductImageSrc(p, '/placeholder-product.svg');
        return ({
          ...p,
          stockQuantity: p.stock_quantity,
          stock_quantity: p.stock_quantity,
          thumbnailImage: imageSrc,
          thumbnail_image: imageSrc,
          compareAtPrice: p.compare_at_price,
          compare_at_price: p.compare_at_price,
          createdAt: p.created_at ? new Date(p.created_at) : new Date(),
          updatedAt: p.updated_at ? new Date(p.updated_at) : new Date()
        });
      }) as Product[];
      setAllProducts(transformed);
      // تطبيق الفلاتر محلياً
      const filtered = transformed
        .filter(p => (selectedCategory === 'all' ? true : (p as any).category_id === selectedCategory))
        .filter(p => (debouncedSearchQuery ? (p.name?.toLowerCase()?.includes(debouncedSearchQuery.toLowerCase())) : true));
      setProducts(filtered.slice(0, pageSize));
      setCurrentPage(1);
      setTotalPages(Math.ceil(filtered.length / pageSize));
      setTotalProducts(filtered.length);
      setHasNextPage(filtered.length > pageSize);
      if (scrollAreaRef.current) scrollAreaRef.current.scrollTop = 0;
    } catch (error) {
      setError('حدث خطأ في التحديث.');
    } finally {
      setIsInitialLoading(false);
    }
  }, [currentOrganization?.id, pageSize, debouncedSearchQuery, selectedCategory, sortOption, sortOrder, isInitialLoading]);

  // تحميل المزيد (صفحات) عند التمرير في وضع الكاش
  useEffect(() => {
    if (!useCacheBrowse || isInitialLoading) return;
    if (inView && hasNextPage && !isLoadingMore) {
      setIsLoadingMore(true);
      setTimeout(async () => {
        try {
          const nextPage = currentPage + 1;
          if (useLocalPagination && !debouncedSearchQuery) {
            const orgId = currentOrganization?.id as string;
            unifiedProductService.setOrganizationId(orgId);
            const filters: any = { is_active: true };
            if (selectedCategory !== 'all') {
              filters.category_id = selectedCategory;
            }
            const res = await unifiedProductService.getProducts(filters, nextPage, pageSize);
            const slice = res.data.map((p: any) => {
              const imageSrc = resolveProductImageSrc(p, '/placeholder-product.svg');
              return ({
                ...p,
                stockQuantity: p.stock_quantity,
                stock_quantity: p.stock_quantity,
                thumbnailImage: imageSrc,
                thumbnail_image: imageSrc,
                compareAtPrice: p.compare_at_price,
                compare_at_price: p.compare_at_price,
                createdAt: p.created_at ? new Date(p.created_at) : new Date(),
                updatedAt: p.updated_at ? new Date(p.updated_at) : new Date()
              });
            }) as Product[];
            setProducts(prev => prev.concat(slice));
            setCurrentPage(nextPage);
            setHasNextPage(res.hasMore);
          } else {
            // fallback: احسب الصفحة التالية من allProducts
            const filtered = allProducts
              .filter(p => (selectedCategory === 'all' ? true : (p as any).category_id === selectedCategory))
              .filter(p => (debouncedSearchQuery ? (p.name?.toLowerCase()?.includes(debouncedSearchQuery.toLowerCase())) : true));
            const slice = filtered.slice((nextPage - 1) * pageSize, nextPage * pageSize);
            setProducts(prev => prev.concat(slice));
            setCurrentPage(nextPage);
            setHasNextPage(filtered.length > nextPage * pageSize);
          }
        } finally {
          setIsLoadingMore(false);
        }
      }, 0);
    }
  }, [useCacheBrowse, inView, hasNextPage, isLoadingMore, isInitialLoading, allProducts, selectedCategory, debouncedSearchQuery, pageSize, currentPage, useLocalPagination, currentOrganization?.id]);

  // دالة للحصول على الفئات المعروضة
  const displayCategories = useMemo(() => {
    if (!productCategories.length) return [];
    
    const categoriesWithCount = productCategories
      .filter(cat => cat.is_active)
      .map(cat => {
        // في هذا الإصدار، سنستخدم الإحصائيات من stats
        const productCount = products.filter(product => 
          product.category_id === cat.id
        ).length;
        
        return {
          id: cat.id,
          name: cat.name,
          productCount
        };
      })
      .sort((a, b) => {
        if (a.productCount === 0 && b.productCount === 0) {
          return a.name.localeCompare(b.name);
        }
        if (a.productCount === 0) return 1;
        if (b.productCount === 0) return -1;
        return b.productCount - a.productCount;
      });

    // فلترة حسب البحث
    if (categorySearchQuery.trim()) {
      const query = categorySearchQuery.toLowerCase();
      return categoriesWithCount.filter(cat => 
        cat.name.toLowerCase().includes(query)
      );
    }

    return categoriesWithCount;
  }, [productCategories, products, categorySearchQuery]);
  
  // معالج إضافة المنتج للسلة
  const handleProductClick = useCallback((product: Product) => {
    try {
      // في وضع الإرجاع، لا نحتاج للتحقق من المخزون
      if (!isReturnMode && product.stockQuantity <= 0) {
        logError('محاولة إضافة منتج نفذت كميته', 'ProductCatalogOptimized.handleProductClick', {
          productId: product.id,
          productName: product.name,
          currentStock: product.stockQuantity,
          isReturnMode
        });
        return;
      }

      // تسجيل عملية إضافة المنتج
      if (isReturnMode) {
        logProductAdd(
          product.id,
          product.name,
          1,
          'ProductCatalogOptimized.handleProductClick',
          {
            operation: 'RETURN_MODE',
            currentStock: product.stockQuantity,
            price: product.price,
            sku: product.sku
          }
        );
      } else {
        logProductAdd(
          product.id,
          product.name,
          1,
          'ProductCatalogOptimized.handleProductClick',
          {
            operation: 'SALE_MODE',
            currentStock: product.stockQuantity,
            price: product.price,
            sku: product.sku
          }
        );
      }
      
      onAddToCart(product);
      
      // ✅ تم إصلاح المشكلة: لا يتم تحديث المخزون عند إضافة المنتج للسلة
      // المخزون سيتم تحديثه فقط عند إتمام الشراء الفعلي في:
      // 1. posOrderService.createPOSOrder() عند إتمام الطلب
      // 2. عبر نظام FIFO في قاعدة البيانات
      // 3. تحديث البيانات من الخادم بعد نجاح العملية
      
      // تسجيل عملية إضافة المنتج للسلة (بدون تحديث المخزون)
      logProductAdd(
        product.id,
        product.name,
        1,
        'ProductCatalogOptimized.handleProductClick.addToCart',
        {
          operation: isReturnMode ? 'ADD_TO_RETURN_CART' : 'ADD_TO_CART',
          currentStock: product.stockQuantity,
          price: product.price,
          sku: product.sku,
          note: 'المخزون لم يتم تحديثه - سيحدث عند إتمام الطلب فقط'
        }
      );
      
    } catch (error) {
      logError(
        `خطأ في handleProductClick: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
        'ProductCatalogOptimized.handleProductClick',
        {
          productId: product.id,
          productName: product.name,
          error: error instanceof Error ? error.stack : error
        }
      );
    }
  }, [onAddToCart, isReturnMode]);
  
    // مكون لعرض المنتج الواحد
  const ProductCard = useCallback(({ product }: { product: Product }) => {
    const isOutOfStock = product.stockQuantity <= 0;
    const isLowStock = product.stockQuantity > 0 && product.stockQuantity <= 5;
    const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
    const discountPercentage = hasDiscount
      ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
      : 0;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "relative group rounded-2xl border bg-gradient-to-b overflow-hidden transition-all duration-300 z-0",
          "hover:shadow-xl hover:shadow-primary/5 hover:z-10",
          product.stockQuantity > 0
            ? "from-card to-card/80 border-border/50 hover:border-primary/30 hover:-translate-y-1 hover:shadow-2xl"
            : "from-muted/30 to-muted/20 border-muted opacity-75"
        )}
      >
        {/* خلفية gradient عند hover */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        )} />

        <div
          className="relative aspect-square bg-gradient-to-br from-muted/20 via-background/50 to-muted/30 cursor-pointer overflow-hidden"
          onClick={() => handleProductClick(product)}
        >
          {/* شريط التخفيض */}
          {hasDiscount && !isOutOfStock && (
            <div className="absolute top-3 right-3 z-10">
              <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1">
                <Percent className="h-3 w-3" />
                <span className="text-xs font-bold">-{discountPercentage}%</span>
              </div>
            </div>
          )}

          {/* الصورة */}
          <div className="relative w-full h-full p-4 flex items-center justify-center">
            <img
              src={product.thumbnailImage || '/placeholder-product.svg'}
              alt={product.name}
              className="object-contain w-full h-full transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />

            {/* تأثير blur للصورة عند نفاذ المخزون */}
            {isOutOfStock && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/50 to-black/30 flex items-center justify-center backdrop-blur-[2px]">
                <div className="bg-black/80 px-4 py-2 rounded-full shadow-2xl">
                  <span className="text-white text-sm font-bold">نفذت الكمية</span>
                </div>
              </div>
            )}
          </div>

          {/* شارات المنتج */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
            {(product as any).allow_wholesale && (product as any).wholesale_price !== undefined && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl hover:scale-105 border border-blue-400/20">
                      <Users className="h-3 w-3 mr-1" />
                      <span>جملة</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
                    <p className="text-xs font-medium">سعر الجملة: {formatPrice((product as any).wholesale_price ?? 0)}</p>
                    <p className="text-xs text-slate-300">الحد الأدنى: {(product as any).min_wholesale_quantity} قطعة</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {product.isDigital && (
              <div className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg border border-purple-400/20">
                رقمي
              </div>
            )}
          </div>

          {/* زر الإضافة للسلة */}
          {(isReturnMode || product.stockQuantity > 0) && (
            <Button
              size="sm"
              variant="ghost"
              className={cn(
                "absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl w-10 h-10 p-0 shadow-lg hover:shadow-xl hover:scale-110 z-10",
                isReturnMode
                  ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 border border-orange-400/30"
                  : "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground hover:from-primary hover:to-primary border border-primary/20"
              )}
              onClick={(e) => {
                e.stopPropagation();
                if (isReturnMode || product.stockQuantity > 0) {
                  onAddToCart(product);
                }
              }}
            >
              <Plus className="h-5 w-5" />
              <span className="sr-only">{isReturnMode ? 'إضافة للإرجاع' : 'إضافة إلى السلة'}</span>
            </Button>
          )}
        </div>

        {/* معلومات المنتج */}
        <div className="relative p-4 space-y-3 bg-gradient-to-b from-card/50 to-card">
          {/* اسم المنتج */}
          <h3 className="text-sm font-semibold line-clamp-2 min-h-[2.5rem] text-foreground/90 leading-relaxed group-hover:text-primary transition-colors">
            {product.name}
          </h3>

          {/* السعر والمخزون */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                  {formatPrice(product.price)}
                </span>
                {hasDiscount && (
                  <span className="text-xs text-muted-foreground line-through font-medium">
                    {formatPrice(product.compareAtPrice)}
                  </span>
                )}
              </div>
            </div>

            {/* شارة المخزون */}
            <Badge
              variant={isOutOfStock ? "destructive" : isLowStock ? "outline" : "secondary"}
              className={cn(
                "text-xs font-semibold shadow-sm transition-all",
                isLowStock && "border-orange-500/50 text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30",
                !isOutOfStock && !isLowStock && "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 text-green-700 dark:text-green-400 border-green-500/30"
              )}
            >
              {isOutOfStock ? (
                <span className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  نفذ
                </span>
              ) : (
                <span>{product.stockQuantity} متاح</span>
              )}
            </Badge>
          </div>

          {/* SKU و Barcode */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground/80 border-t border-border/50 pt-2">
            <span className="font-medium">SKU:</span>
            <span className="font-mono">{product.sku}</span>
            {product.barcode && (
              <>
                <span className="text-muted-foreground/40">•</span>
                <span className="font-mono">{product.barcode}</span>
              </>
            )}
          </div>
        </div>
      </motion.div>
    );
  }, [handleProductClick, onAddToCart, isReturnMode]);
  
  // مكون لعرض skeleton loader
  const ProductSkeleton = () => (
    <div className="rounded-2xl border border-border/50 overflow-hidden bg-gradient-to-b from-card to-card/80 animate-pulse">
      <Skeleton className="aspect-square bg-gradient-to-br from-muted/30 to-muted/10" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4 rounded-lg" />
        <div className="flex justify-between items-center gap-2">
          <Skeleton className="h-7 w-24 rounded-lg" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-3 w-full rounded-md" />
      </div>
    </div>
  );
  
  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-background via-card/30 to-background rounded-2xl border border-border/50 shadow-xl overflow-hidden relative isolate">
      {/* شريط البحث والفلترة */}
      <div className="bg-gradient-to-r from-card via-card/95 to-card/90 backdrop-blur-md p-4 border-b border-border/50 sticky top-0 z-50 shadow-sm">
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              type="text"
              placeholder="بحث عن منتج، باركود، SKU..."
              className="pl-9 w-full border-border/60 bg-background/50 focus:bg-background focus:border-primary/50 shadow-sm hover:shadow-md transition-all rounded-xl h-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* أزرار التحكم */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (sortOption === 'name') {
                      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
                    } else {
                      setSortOption('name');
                      setSortOrder('ASC');
                    }
                  }}
                  className="flex-shrink-0 shadow-sm hover:shadow-md transition-all rounded-xl bg-background/50 hover:bg-background border-border/60"
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
                <p>ترتيب: {sortOption === 'name' ? 'الاسم' : sortOption === 'price' ? 'السعر' : sortOption === 'stock' ? 'المخزون' : 'التاريخ'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex-shrink-0 shadow-sm hover:shadow-md transition-all rounded-xl bg-background/50 border-border/60",
              showFilters && "bg-gradient-to-br from-primary/20 to-primary/10 text-primary border-primary/50 shadow-md"
            )}
          >
            <Filter className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              if (viewMode === 'grid') setViewMode('compact');
              else if (viewMode === 'compact') setViewMode('list');
              else setViewMode('grid');
            }}
            className="flex-shrink-0 shadow-sm hover:shadow-md transition-all rounded-xl bg-background/50 hover:bg-background border-border/60"
          >
            {viewMode === 'grid' && <Grid3X3 className="h-4 w-4" />}
            {viewMode === 'compact' && <Grid2X2 className="h-4 w-4" />}
            {viewMode === 'list' && <List className="h-4 w-4" />}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={handleManualRefresh}
            disabled={isInitialLoading}
            className="flex-shrink-0 shadow-sm hover:shadow-md transition-all rounded-xl bg-background/50 hover:bg-background border-border/60 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", isInitialLoading && "animate-spin")} />
          </Button>
          <Button
            variant={useCacheBrowse ? 'default' : 'outline'}
            onClick={() => setUseCacheBrowse(v => !v)}
            className={cn(
              "flex-shrink-0 shadow-sm hover:shadow-md transition-all rounded-xl",
              useCacheBrowse
                ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground border-primary/20"
                : "bg-background/50 hover:bg-background border-border/60"
            )}
          >
            {useCacheBrowse ? 'تصفح من الكاش' : 'تصفح أونلاين'}
          </Button>
          {offlineMode && (
            <Badge className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 shadow-sm">
              وضع الأوفلاين
            </Badge>
          )}
        </div>
        
        {/* الفئات */}
        {showFilters && (
          <div className="pt-1 pb-1 relative z-50">
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="relative z-50"
            >
              {productCategories.length > 5 && (
                <div className="mb-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder={`بحث في ${productCategories.length} فئة...`}
                      className="pl-9 h-8 text-sm border-primary/20 focus:border-primary"
                      value={categorySearchQuery}
                      onChange={(e) => setCategorySearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Tag className="h-4 w-4" />
                  <span>الفئة:</span>
                </div>
                
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue>
                      {selectedCategory === 'all' 
                        ? `جميع الفئات (${totalProducts})`
                        : `${displayCategories.find(cat => cat.id === selectedCategory)?.name || selectedCategory}`
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="all" className="flex items-center justify-between font-medium">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        <span>جميع الفئات</span>
                      </div>
                    </SelectItem>
                    
                    <div className="border-t my-1" />
                    
                    {displayCategories.map(category => (
                      <SelectItem 
                        key={category.id} 
                        value={category.id} 
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          <span>{category.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      <Separator className="opacity-30" />

      {/* معلومات المنتجات */}
      <div className="bg-gradient-to-r from-muted/20 via-muted/10 to-transparent px-4 py-3 flex items-center justify-between text-sm border-b border-border/30 sticky top-[68px] z-40 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Package className="h-4 w-4 text-primary" />
          </div>
          <span className="font-medium text-foreground/80">
            عرض <span className="text-primary font-bold">{products.length}</span> من{' '}
            <span className="text-primary font-bold">{totalProducts}</span> منتج
          </span>
          {isLoadingMore && (
            <div className="flex items-center gap-1.5 text-primary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="text-xs">جاري التحميل...</span>
            </div>
          )}
        </div>
        <div className="text-muted-foreground flex items-center gap-2">
          {selectedCategory !== 'all' && (
            <Badge
              variant="outline"
              className="bg-gradient-to-r from-primary/10 to-primary/5 shadow-sm border-primary/30 text-primary font-medium"
            >
              {displayCategories.find(cat => cat.id === selectedCategory)?.name || selectedCategory}
            </Badge>
          )}
          {searchQuery && (
            <Badge
              variant="outline"
              className="bg-gradient-to-r from-blue-500/10 to-blue-400/5 shadow-sm border-blue-500/30 text-blue-700 dark:text-blue-400 font-medium"
            >
              بحث: {searchQuery}
            </Badge>
          )}
        </div>
      </div>

      {/* كتالوج المنتجات */}
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        {error && (
          <Alert variant="destructive" className="m-4 border-red-500/30 bg-gradient-to-r from-red-50 to-red-50/50 dark:from-red-950/30 dark:to-red-950/10 shadow-lg rounded-xl">
            <AlertCircle className="h-5 w-5" />
            <AlertDescription className="font-medium">{error}</AlertDescription>
          </Alert>
        )}
        
        {isInitialLoading ? (
          <div className={cn(
            "p-4",
            viewMode === 'grid' ? "grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4" :
            viewMode === 'compact' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3" :
            "space-y-2"
          )}>
            {Array.from({ length: pageSize }).map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-muted-foreground p-8">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-primary/5 blur-2xl rounded-full" />
              <div className="relative p-6 rounded-full bg-gradient-to-br from-muted/30 to-muted/10 border border-border/50">
                <Package className="h-16 w-16 text-muted-foreground/40" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-foreground/80 mb-2">لم يتم العثور على منتجات</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
              لا توجد منتجات تطابق معايير البحث الحالية. جرب تغيير الفلاتر أو البحث بكلمات مختلفة.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="bg-gradient-to-r from-background to-card hover:from-card hover:to-background border-border/60 shadow-sm hover:shadow-md transition-all rounded-xl"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              إعادة ضبط الفلتر
            </Button>
          </div>
        ) : (
          <>
            <div className={cn(
              "p-4",
              viewMode === 'grid' ? "grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4" :
              viewMode === 'compact' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3" :
              "space-y-2"
            )}>
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            
            {/* مؤشر تحميل المزيد */}
            {hasNextPage && (
              <div ref={loadMoreRef} className="p-6 flex justify-center">
                {isLoadingMore ? (
                  <div className="flex items-center gap-3 text-muted-foreground bg-gradient-to-r from-muted/20 to-transparent px-6 py-3 rounded-xl border border-border/30">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="font-medium">جاري تحميل المزيد...</span>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (currentOrganization?.id && !isLoadingMore) {
                        setIsLoadingMore(true);

                        try {
                          unifiedProductService.setOrganizationId(currentOrganization.id);
                          const filters: any = { is_active: true };
                          if (selectedCategory !== 'all') {
                            filters.category_id = selectedCategory;
                          }
                          if (debouncedSearchQuery) {
                            filters.search = debouncedSearchQuery;
                          }
                          const response = await unifiedProductService.getProducts(filters, currentPage + 1, pageSize);
                          const transformedProducts = response.data.map((p: any) => {
                            const imageSrc = resolveProductImageSrc(p, '/placeholder-product.svg');
                            return ({
                              ...p,
                              stockQuantity: p.stock_quantity,
                              stock_quantity: p.stock_quantity,
                              thumbnailImage: imageSrc,
                              thumbnail_image: imageSrc,
                              compareAtPrice: p.compare_at_price,
                              compare_at_price: p.compare_at_price,
                              createdAt: p.created_at ? new Date(p.created_at) : new Date(),
                              updatedAt: p.updated_at ? new Date(p.updated_at) : new Date()
                            });
                          }) as Product[];
                          setProducts(prev => [...prev, ...transformedProducts]);
                          setCurrentPage(response.page);
                          setTotalPages(Math.ceil(response.total / pageSize));
                          setTotalProducts(response.total);
                          setHasNextPage(response.hasMore);
                        } catch (error) {
                        } finally {
                          setIsLoadingMore(false);
                        }
                      }
                    }}
                    className="bg-gradient-to-r from-background to-card hover:from-card hover:to-background border-border/60 shadow-md hover:shadow-lg transition-all rounded-xl px-8 py-2.5 font-medium group"
                  >
                    <span className="flex items-center gap-2">
                      تحميل المزيد
                      <ChevronDown className="h-4 w-4 group-hover:translate-y-0.5 transition-transform" />
                    </span>
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </ScrollArea>
    </div>
  );
}
