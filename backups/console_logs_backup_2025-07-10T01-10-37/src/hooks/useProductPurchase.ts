import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  getProductCompleteData,
  CompleteProduct, 
  ProductColor, 
  ProductSize,
  getDefaultColor,
  getDefaultSize,
  getVariantStock,
  isProductAvailable,
  getFinalPrice,
  DataScope,
  clearProductCache
} from '@/lib/api/productComplete';
import { useToast } from '@/hooks/use-toast';

export interface UseProductPurchaseProps {
  productId?: string;
  organizationId?: string;
  dataScope?: DataScope;
}

export interface ProductPurchaseState {
  // بيانات المنتج
  product: CompleteProduct | null;
  loading: boolean;
  error: string | null;
  
  // الاختيارات الحالية
  selectedColor?: ProductColor;
  selectedSize?: ProductSize;
  quantity: number;
  
  // حالة الإجراءات
  addingToCart: boolean;
  buyingNow: boolean;
  isInWishlist: boolean;
  
  // المعلومات المحسوبة
  availableStock: number;
  isOutOfStock: boolean;
  canPurchase: boolean;
  priceInfo: ReturnType<typeof getFinalPrice>;
  totalPrice: number;
  
  // النماذج 🆕
  formData: any | null;
  hasCustomForm: boolean;
  formStrategy: 'custom_form_found' | 'default_form_used' | 'no_form_available';
}

export interface ProductPurchaseActions {
  // إجراءات الاختيار
  setSelectedColor: (color: ProductColor | undefined) => void;
  setSelectedSize: (size: ProductSize | undefined) => void;
  setQuantity: (quantity: number) => void;
  
  // إجراءات الشراء
  addToCart: () => Promise<void>;
  buyNow: () => Promise<{ success: boolean; data?: any }>;
  toggleWishlist: () => Promise<void>;
  shareProduct: () => Promise<void>;
  
  // إجراءات التحكم
  resetSelections: () => void;
  refreshProduct: () => Promise<void>;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق

export const useProductPurchase = ({
  productId,
  organizationId,
  dataScope = 'ultra'
}: UseProductPurchaseProps): [ProductPurchaseState, ProductPurchaseActions] => {
  const { toast } = useToast();
  
  // الحالة الأساسية
  const [product, setProduct] = useState<CompleteProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // حالة الاختيارات
  const [selectedColor, setSelectedColor] = useState<ProductColor | undefined>();
  const [selectedSize, setSelectedSize] = useState<ProductSize | undefined>();
  const [quantity, setQuantity] = useState(1);
  
  // حالة العمليات
  const [addingToCart, setAddingToCart] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);

  // refs لتجنب الاستدعاءات المتعددة
  const fetchingRef = useRef(false);
  const lastFetchKey = useRef<string>('');
  const mountedRef = useRef(true);
  const lastParamsRef = useRef<string>('');

  // الوصول إلى الـ cache العالمي
  const getCache = useCallback(() => {
    if (typeof window !== 'undefined' && window.productCache) {
      return window.productCache;
    }
    return new Map();
  }, []);

  // جلب بيانات المنتج مع caching
  const fetchProduct = useCallback(async () => {
    if (!productId) {
      setError('معرف المنتج غير صحيح');
      setLoading(false);
      return;
    }

    const fetchKey = `${productId}-${organizationId || 'public'}-${dataScope}`;
    
    // تجنب الاستدعاءات المتعددة
    if (fetchingRef.current && lastFetchKey.current === fetchKey) {
      return;
    }

    // فحص الـ cache أولاً
    const cache = getCache();
    const cacheKey = `${productId}-${organizationId || 'public'}`;
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log('⚡ [useProductPurchase] Using cached product data:', {
        productId: cached.data.id,
        productName: cached.data.name,
        useVariantPrices: cached.data.variants.use_variant_prices,
        hasVariants: cached.data.variants.has_variants,
        colorsCount: cached.data.variants.colors?.length || 0
      });
      
      setProduct(cached.data);
      setLoading(false);
      setError(null);
      
      // تعيين الاختيارات الافتراضية
      if (cached.data.variants.has_variants) {
        const defaultColor = getDefaultColor(cached.data);
        console.log('🎨 [useProductPurchase] Setting default color from cache:', {
          hasVariants: cached.data.variants.has_variants,
          useVariantPrices: cached.data.variants.use_variant_prices,
          defaultColor: defaultColor ? {
            id: defaultColor.id,
            name: defaultColor.name,
            price: defaultColor.price,
            isDefault: defaultColor.is_default
          } : null
        });
        
        setSelectedColor(defaultColor || undefined);
        
        if (defaultColor && defaultColor.has_sizes) {
          const defaultSize = getDefaultSize(defaultColor);
          setSelectedSize(defaultSize || undefined);
        }
      }
      
      setQuantity(1);
      return;
    }

    try {
      fetchingRef.current = true;
      lastFetchKey.current = fetchKey;
      setLoading(true);
      setError(null);

      const response = await getProductCompleteData(productId, {
        organizationId,
        dataScope
      });

      if (!response || !response.success) {
        throw new Error('فشل في جلب بيانات المنتج');
      }

      const productData = response.product;
      
      // حفظ في الـ cache العالمي
      cache.set(cacheKey, {
        data: productData,
        timestamp: Date.now(),
        organizationId
      });
      
      setProduct(productData);

      // تعيين الاختيارات الافتراضية
      if (productData.variants.has_variants) {
        const defaultColor = getDefaultColor(productData);
        console.log('🎨 [useProductPurchase] Setting default color:', {
          hasVariants: productData.variants.has_variants,
          useVariantPrices: productData.variants.use_variant_prices,
          defaultColor: defaultColor ? {
            id: defaultColor.id,
            name: defaultColor.name,
            price: defaultColor.price,
            isDefault: defaultColor.is_default
          } : null,
          allColors: productData.variants.colors?.map(c => ({
            id: c.id,
            name: c.name,
            price: c.price,
            isDefault: c.is_default
          })) || []
        });
        
        setSelectedColor(defaultColor || undefined);
        
        if (defaultColor && defaultColor.has_sizes) {
          const defaultSize = getDefaultSize(defaultColor);
          console.log('📏 [useProductPurchase] Setting default size:', {
            defaultSize: defaultSize ? {
              id: defaultSize.id,
              size_name: defaultSize.size_name,
              price: defaultSize.price,
              isDefault: defaultSize.is_default
            } : null
          });
          setSelectedSize(defaultSize || undefined);
        }
      }

      // إعادة تعيين الكمية إلى 1
      setQuantity(1);

    } catch (err) {
      setError('فشل في تحميل بيانات المنتج');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [productId, organizationId, dataScope, getCache]);

  // جلب المنتج فقط عندما تتوفر جميع البيانات المطلوبة - مع منع الطلبات المكررة
  useEffect(() => {
    // إذا لم يكن لدينا productId، لا نفعل شيئاً
    if (!productId) return;
    
    // منع الطلبات المكررة: إذا كان هناك طلب جاري، لا نبدأ آخر
    if (fetchingRef.current) {
      return;
    }
    
    // تأخير البحث قليلاً للسماح للـ organizationId بالتحديث
    const timeoutId = setTimeout(() => {
      if (!fetchingRef.current) { // فحص إضافي للتأكد
        fetchProduct();
      }
    }, 300); // زيادة التأخير لتقليل الطلبات المكررة

    return () => clearTimeout(timeoutId);
  }, [productId, organizationId, dataScope, fetchProduct]);

  // تحديث المقاس عند تغيير اللون
  useEffect(() => {
    if (selectedColor && selectedColor.has_sizes) {
      const defaultSize = getDefaultSize(selectedColor);
      console.log('📏 [useProductPurchase] Auto-updating size after color change:', {
        colorId: selectedColor.id,
        colorName: selectedColor.name,
        colorHasSizes: selectedColor.has_sizes,
        sizesCount: selectedColor.sizes?.length || 0,
        selectedSizeId: defaultSize?.id,
        selectedSizeName: defaultSize?.size_name,
        selectedSizeStock: defaultSize?.quantity || 0,
        isSelectedSizeDefault: defaultSize?.is_default
      });
      setSelectedSize(defaultSize || undefined);
    } else {
      setSelectedSize(undefined);
    }
  }, [selectedColor]);

  // حساب المخزون المتاح
  const availableStock = useMemo(() => {
    if (!product) return 0;
    return getVariantStock(product, selectedColor?.id, selectedSize?.id);
  }, [product, selectedColor, selectedSize]);

  // تحديد حالة المخزون
  const isOutOfStock = useMemo(() => {
    return availableStock === 0;
  }, [availableStock]);

  // تحديد إمكانية الشراء (السماح بالعرض حتى لو كان المخزون 0)
  const canPurchase = useMemo(() => {
    if (!product) return false;
    if (!isProductAvailable(product)) return false;
    if (quantity <= 0) return false;
    if (product.variants.has_variants && !selectedColor) return false;
    if (selectedColor?.has_sizes && !selectedSize) return false;
    return true;
  }, [product, quantity, selectedColor, selectedSize]);

  // حساب معلومات السعر
  const priceInfo = useMemo(() => {
    console.log('🛒 [useProductPurchase] Calculating priceInfo with:', {
      hasProduct: !!product,
      productId: product?.id,
      productName: product?.name,
      productBasePrice: product?.pricing?.price,
      useVariantPrices: product?.variants?.use_variant_prices,
      hasVariants: product?.variants?.has_variants,
      colorsCount: product?.variants?.colors?.length || 0,
      quantity,
      selectedColorId: selectedColor?.id,
      selectedColorName: selectedColor?.name,
      selectedColorPrice: selectedColor?.price,
      selectedSizeId: selectedSize?.id,
      selectedSizeName: selectedSize?.size_name,
      selectedSizePrice: selectedSize?.price
    });

    if (!product) {
      console.log('❌ [useProductPurchase] No product, returning default priceInfo');
      return {
        price: 0,
        originalPrice: 0,
        isWholesale: false,
        hasCompareAtPrice: false
      };
    }
    
    const result = getFinalPrice(product, quantity, selectedColor?.id, selectedSize?.id);
    console.log('🛒 [useProductPurchase] PriceInfo calculated:', result);
    return result;
  }, [product, quantity, selectedColor, selectedSize]);

  // حساب السعر الإجمالي
  const totalPrice = useMemo(() => {
    return priceInfo.price * quantity;
  }, [priceInfo.price, quantity]);

  // معالجة تغيير اللون
  const handleColorChange = useCallback((color: ProductColor | undefined) => {
    console.log('🎨 [useProductPurchase] Color change triggered:', {
      previousColor: selectedColor?.name,
      previousColorId: selectedColor?.id,
      previousColorPrice: selectedColor?.price,
      newColor: color?.name,
      newColorId: color?.id,
      newColorPrice: color?.price
    });
    
    setSelectedColor(color);
    
    // إبقاء الكمية 1 دائماً (لا نقوم بتقليلها حسب المخزون)
    setQuantity(prev => {
      if (!color) return prev;
      const newStock = getVariantStock(product!, color.id, undefined);
      // نبقي الكمية كما هي أو نضعها 1 كحد أدنى
      const newQuantity = Math.max(1, prev);
      console.log('🎨 [useProductPurchase] Quantity kept at:', {
        previousQuantity: prev,
        newStock,
        newQuantity,
        note: newStock === 0 ? 'Out of stock but quantity kept at 1' : 'In stock'
      });
      return newQuantity;
    });
  }, [product, selectedColor]);

  // معالجة تغيير المقاس
  const handleSizeChange = useCallback((size: ProductSize | undefined) => {
    setSelectedSize(size);
    // إبقاء الكمية 1 دائماً (لا نقوم بتقليلها حسب المخزون)
    setQuantity(prev => {
      if (!size || !selectedColor) return prev;
      const newStock = getVariantStock(product!, selectedColor.id, size.id);
      // نبقي الكمية كما هي أو نضعها 1 كحد أدنى
      const newQuantity = Math.max(1, prev);
      console.log('📏 [useProductPurchase] Size change - quantity kept at:', {
        sizeName: size.size_name,
        newStock,
        newQuantity,
        note: newStock === 0 ? 'Out of stock but quantity kept at 1' : 'In stock'
      });
      return newQuantity;
    });
  }, [product, selectedColor]);

  // معالجة تغيير الكمية
  const handleQuantityChange = useCallback((newQuantity: number) => {
    const maxQuantity = Math.min(availableStock, 100);
    const validQuantity = Math.max(1, Math.min(newQuantity, maxQuantity));
    setQuantity(validQuantity);
  }, [availableStock]);

  // معالجة إضافة إلى السلة
  const handleAddToCart = useCallback(async () => {
    if (!canPurchase || !product) return;

    try {
      setAddingToCart(true);
      
      // هنا يمكن إضافة منطق إضافة المنتج إلى السلة
      await new Promise(resolve => setTimeout(resolve, 1000)); // محاكاة API call
      
      toast({
        title: "تم بنجاح",
        description: "تم إضافة المنتج إلى السلة",
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في إضافة المنتج إلى السلة",
        variant: "destructive"
      });
    } finally {
      setAddingToCart(false);
    }
  }, [canPurchase, product]);

  // معالجة الشراء المباشر
  const handleBuyNow = useCallback(async (): Promise<{ success: boolean; data?: any }> => {
    if (!canPurchase || !product) {
      return { success: false };
    }

    try {
      setBuyingNow(true);
      
      // هنا يمكن إضافة منطق الشراء المباشر
      await new Promise(resolve => setTimeout(resolve, 1000)); // محاكاة API call
      
      const orderData = {
        product,
        selectedColor,
        selectedSize,
        quantity,
        totalPrice,
        priceInfo
      };
      
      return { success: true, data: orderData };
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في عملية الشراء",
        variant: "destructive"
      });
      return { success: false };
    } finally {
      setBuyingNow(false);
    }
  }, [canPurchase, product, selectedColor, selectedSize, quantity, totalPrice, priceInfo]);

  // معالجة إضافة/إزالة من المفضلة
  const handleToggleWishlist = useCallback(async () => {
    try {
      // هنا يمكن إضافة منطق المفضلة
      setIsInWishlist(!isInWishlist);
      toast({
        title: isInWishlist ? "تم الإزالة" : "تم الإضافة",
        description: isInWishlist ? 'تم إزالة المنتج من المفضلة' : 'تم إضافة المنتج إلى المفضلة',
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في تحديث المفضلة",
        variant: "destructive"
      });
    }
  }, [isInWishlist]);

  // مشاركة المنتج
  const handleShareProduct = useCallback(async () => {
    try {
      if (navigator.share && product) {
        await navigator.share({
          title: product.name,
          text: product.description,
          url: window.location.href,
        });
      } else {
        // نسخ الرابط إلى الحافظة
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "تم النسخ",
          description: "تم نسخ رابط المنتج",
        });
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في مشاركة المنتج",
        variant: "destructive"
      });
    }
  }, [product]);

  // إعادة تعيين الاختيارات
  const resetSelections = useCallback(() => {
    if (product?.variants.has_variants) {
      const defaultColor = getDefaultColor(product);
      setSelectedColor(defaultColor || undefined);
      
      if (defaultColor && defaultColor.has_sizes) {
        const defaultSize = getDefaultSize(defaultColor);
        setSelectedSize(defaultSize || undefined);
      } else {
        setSelectedSize(undefined);
      }
    } else {
      setSelectedColor(undefined);
      setSelectedSize(undefined);
    }
    setQuantity(1);
  }, [product]);

  // تحديث المنتج (بدون cache)
  const refreshProduct = useCallback(async () => {
    if (!productId) return;
    
    // مسح الـ cache
    clearProductCache(productId);
    
    await fetchProduct();
  }, [productId, fetchProduct]);

  // استخراج بيانات النماذج
  const formData = useMemo(() => {
    return product?.form_data || null;
  }, [product]);

  const hasCustomForm = useMemo(() => {
    return formData?.type === 'custom';
  }, [formData]);

  const formStrategy = useMemo(() => {
    if (formData?.type === 'custom') return 'custom_form_found';
    if (formData?.type === 'default') return 'default_form_used';
    return 'no_form_available';
  }, [formData]);

  // إنشاء الكائنات المرجعة
  const state: ProductPurchaseState = {
    product,
    loading,
    error,
    selectedColor,
    selectedSize,
    quantity,
    addingToCart,
    buyingNow,
    isInWishlist,
    availableStock,
    isOutOfStock,
    canPurchase,
    priceInfo,
    totalPrice,
    formData,
    hasCustomForm,
    formStrategy
  };

  const actions: ProductPurchaseActions = {
    setSelectedColor: handleColorChange,
    setSelectedSize: handleSizeChange,
    setQuantity: handleQuantityChange,
    addToCart: handleAddToCart,
    buyNow: handleBuyNow,
    toggleWishlist: handleToggleWishlist,
    shareProduct: handleShareProduct,
    resetSelections,
    refreshProduct
  };

  return [state, actions];
};

export default useProductPurchase;
