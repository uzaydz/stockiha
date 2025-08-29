import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

// 🚀 Hook محسن للغاية لتحميل بيانات المنتج
// يركز على السرعة والكفاءة مع تقليل الطلبات إلى الحد الأدنى

interface FastProductData {
  id: string;
  name: string;
  description: string;
  slug: string;
  price: number;
  thumbnail_image: string;
  stock_quantity: number;
  has_variants: boolean;
  use_sizes: boolean;
  colors?: Array<{
    id: string;
    name: string;
    color_code: string;
    image_url?: string;
    quantity: number;
    price?: number;
    is_default: boolean;
    has_sizes: boolean;
    sizes?: Array<{
      id: string;
      size_name: string;
      quantity: number;
      price?: number;
      is_default: boolean;
    }>;
  }>;
  organization?: {
    id: string;
    name: string;
    domain: string;
  };
  features?: string[];
  specifications?: Record<string, any>;
}

interface UseFastProductPurchaseProps {
  productId: string;
  organizationId?: string;
}

interface FastProductState {
  product: FastProductData | null;
  loading: boolean;
  error: string | null;
  selectedColor: any;
  selectedSize: any;
  quantity: number;
  isReady: boolean;
}

// مخزن مؤقت للمنتجات مع انتهاء صلاحية 5 دقائق
const productCache = new Map<string, { data: FastProductData; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق

// استراتيجية تحميل مبسطة: استعلام واحد صغير ومحسن
const fetchProductFast = async (productId: string, organizationId?: string): Promise<FastProductData | null> => {
  const startTime = performance.now();
  
  try {
    // استعلام محسن يجلب فقط البيانات الأساسية الضرورية
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        slug,
        price,
        thumbnail_image,
        stock_quantity,
        has_variants,
        use_sizes,
        features,
        specifications,
        organization:organizations(id, name, domain)
      `)
      .eq('id', productId)
      .eq('is_active', true)
      .single();

    if (productError) {
      throw productError;
    }

    if (!productData) {
      return null;
    }

    // إذا كان المنتج يحتوي على متغيرات، جلب الألوان والأحجام بطلب منفصل محسن
    let colors: any[] = [];
    if (productData.has_variants) {
      const { data: colorsData, error: colorsError } = await supabase
        .from('product_colors')
        .select(`
          id,
          name,
          color_code,
          image_url,
          quantity,
          price,
          is_default,
          has_sizes,
          sizes:product_sizes(
            id,
            size_name,
            quantity,
            price,
            is_default
          )
        `)
        .eq('product_id', productId)
        .order('is_default', { ascending: false })
        .order('created_at');

      if (!colorsError && colorsData) {
        colors = colorsData;
      }
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    return {
      ...productData,
      colors: colors.length > 0 ? colors : undefined
    } as FastProductData;

  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;

    throw error;
  }
};

export const useProductPurchaseFast = ({ productId, organizationId }: UseFastProductPurchaseProps) => {
  const { toast } = useToast();
  const [state, setState] = useState<FastProductState>({
    product: null,
    loading: true,
    error: null,
    selectedColor: null,
    selectedSize: null,
    quantity: 1,
    isReady: false
  });

  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);

  // فحص المخزن المؤقت أولاً
  const getCachedProduct = useCallback((id: string): FastProductData | null => {
    const cached = productCache.get(id);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }, []);

  // حفظ في المخزن المؤقت
  const setCachedProduct = useCallback((id: string, data: FastProductData) => {
    productCache.set(id, { data, timestamp: Date.now() });
  }, []);

  // جلب المنتج الرئيسي
  const fetchProduct = useCallback(async () => {
    if (!productId || fetchingRef.current) return;

    try {
      fetchingRef.current = true;
      
      setState(prev => ({ 
        ...prev, 
        loading: true, 
        error: null 
      }));

      // فحص المخزن المؤقت أولاً
      const cached = getCachedProduct(productId);
      if (cached) {
        setState(prev => ({
          ...prev,
          product: cached,
          loading: false,
          selectedColor: cached.colors?.[0] || null,
          selectedSize: cached.colors?.[0]?.sizes?.[0] || null,
          isReady: true
        }));
        return;
      }

      // جلب بيانات جديدة
      const productData = await fetchProductFast(productId, organizationId);
      
      if (!mountedRef.current) return;

      if (productData) {
        setCachedProduct(productId, productData);
        
        const defaultColor = productData.colors?.find(c => c.is_default) || productData.colors?.[0];
        const defaultSize = defaultColor?.sizes?.find(s => s.is_default) || defaultColor?.sizes?.[0];

        setState(prev => ({
          ...prev,
          product: productData,
          loading: false,
          selectedColor: defaultColor || null,
          selectedSize: defaultSize || null,
          isReady: true
        }));
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'المنتج غير موجود',
          isReady: false
        }));
      }

    } catch (error) {
      if (!mountedRef.current) return;
      
      const errorMessage = error instanceof Error ? error.message : 'فشل في تحميل المنتج';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        isReady: false
      }));

      toast({
        title: "خطأ في تحميل المنتج",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      fetchingRef.current = false;
    }
  }, [productId, organizationId, getCachedProduct, setCachedProduct, toast]);

  // تحميل المنتج عند التغيير
  useEffect(() => {
    fetchProduct();
    
    return () => {
      mountedRef.current = false;
    };
  }, [fetchProduct]);

  // دوال التحديث
  const actions = useMemo(() => ({
    setSelectedColor: (color: any) => {
      setState(prev => ({
        ...prev,
        selectedColor: color,
        selectedSize: color?.sizes?.[0] || null
      }));
    },

    setSelectedSize: (size: any) => {
      setState(prev => ({
        ...prev,
        selectedSize: size
      }));
    },

    setQuantity: (quantity: number) => {
      setState(prev => ({
        ...prev,
        quantity: Math.max(1, quantity)
      }));
    },

    refetch: fetchProduct
  }), [fetchProduct]);

  // معلومات إضافية محسوبة
  const computed = useMemo(() => {
    const { product, selectedColor, selectedSize, quantity } = state;
    
    if (!product) {
      return {
        finalPrice: 0,
        availableStock: 0,
        canPurchase: false,
        totalPrice: 0
      };
    }

    let finalPrice = product.price;
    let availableStock = product.stock_quantity;

    // حساب السعر والمخزون حسب المتغيرات
    if (product.has_variants && selectedColor) {
      if (selectedColor.price) {
        finalPrice = selectedColor.price;
      }
      
      if (product.use_sizes && selectedSize) {
        if (selectedSize.price) {
          finalPrice = selectedSize.price;
        }
        availableStock = selectedSize.quantity;
      } else {
        availableStock = selectedColor.quantity;
      }
    }

    const totalPrice = finalPrice * quantity;
    const canPurchase = availableStock >= quantity && availableStock > 0;

    return {
      finalPrice,
      availableStock,
      canPurchase,
      totalPrice
    };
  }, [state]);

  return {
    ...state,
    ...computed,
    actions
  };
};
