import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  ProductColor, 
  ProductSize,
  getDefaultColor,
  getDefaultSize,
  getVariantStock
} from '@/lib/api/productComplete';
import { CompleteProduct } from '@/lib/api/productComplete';

interface UseProductVariantsProps {
  product: CompleteProduct | null;
  initialColor?: ProductColor;
  initialSize?: ProductSize;
}

interface ProductVariantsState {
  selectedColor?: ProductColor;
  selectedSize?: ProductSize;
  availableColors: ProductColor[];
  availableSizes: ProductSize[];
  hasVariants: boolean;
  hasSizes: boolean;
}

interface ProductVariantsActions {
  setSelectedColor: (color: ProductColor | undefined) => void;
  setSelectedSize: (size: ProductSize | undefined) => void;
  resetSelections: () => void;
  getAvailableStock: (colorId?: string, sizeId?: string) => number;
}

/**
 * Hook لإدارة متغيرات المنتج - محسن للأداء
 * - يدير الألوان والمقاسات
 * - يحسب المخزون المتاح
 * - يمنع الاختيارات غير الصحيحة
 * - يستخدم useMemo لتحسين الأداء
 */
export const useProductVariants = ({
  product,
  initialColor,
  initialSize
}: UseProductVariantsProps): [ProductVariantsState, ProductVariantsActions] => {
  // الحالة الأساسية
  const [selectedColor, setSelectedColorState] = useState<ProductColor | undefined>(initialColor);
  const [selectedSize, setSelectedSizeState] = useState<ProductSize | undefined>(initialSize);
  
  // استخدام useRef لتتبع ما إذا تم التهيئة الأولية
  const isInitialized = useRef(false);
  const lastProductId = useRef<string | null>(null);
  const sizeSetManually = useRef(false); // تتبع ما إذا تم تعيين المقاس يدوياً

  // حساب المتغيرات المتاحة
  const availableColors = useMemo(() => {
    if (!product?.variants?.colors) return [];
    return product.variants.colors.filter(color => 
      color && color.id && color.quantity > 0
    );
  }, [product?.variants?.colors]);

  const availableSizes = useMemo(() => {
    if (!selectedColor?.sizes) return [];
    return selectedColor.sizes.filter(size => 
      size && size.id && size.quantity > 0
    );
  }, [selectedColor?.sizes]);

  // فحص وجود متغيرات
  const hasVariants = useMemo(() => {
    return product?.variants?.has_variants === true && availableColors.length > 0;
  }, [product?.variants?.has_variants, availableColors.length]);

  const hasSizes = useMemo(() => {
    return selectedColor?.has_sizes === true && availableSizes.length > 0;
  }, [selectedColor?.has_sizes, availableSizes.length]);

  // حساب المخزون المتاح
  const getAvailableStock = useCallback((colorId?: string, sizeId?: string): number => {
    if (!product) return 0;
    
    const colorIdToUse = colorId || selectedColor?.id;
    const sizeIdToUse = sizeId || selectedSize?.id;
    
    return getVariantStock(product, colorIdToUse, sizeIdToUse);
  }, [product, selectedColor?.id, selectedSize?.id]);

  // تعيين الاختيارات الأولية عند تحميل المنتج - محسن
  useEffect(() => {
    const currentProductId = product?.id;
    
    // تجنب إعادة التهيئة لنفس المنتج
    if (currentProductId === lastProductId.current) {
      return;
    }
    
    if (product && !isInitialized.current) {
      resetSelections();
      isInitialized.current = true;
      lastProductId.current = currentProductId;
    } else if (product && currentProductId !== lastProductId.current) {
      // منتج جديد - إعادة التهيئة
      resetSelections();
      lastProductId.current = currentProductId;
    }
  }, [product?.id]); // استخدام product.id فقط بدلاً من product كاملاً

  // تعيين اللون مع التحقق من صحة المقاس
  const setSelectedColor = useCallback((color: ProductColor | undefined) => {
    setSelectedColorState(color);
    
    // إعادة تعيين المقاس إذا كان اللون الجديد لا يدعم المقاسات
    if (!color || !color.has_sizes) {
      setSelectedSizeState(undefined);
    } else {
      // تعيين المقاس الافتراضي للون الجديد
      const defaultSize = getDefaultSize(color);
      setSelectedSizeState(defaultSize || undefined);
    }
  }, []);

  // تعيين المقاس مع التحقق من المخزون
  const setSelectedSize = useCallback((size: ProductSize | undefined) => {
    console.log('🔧 useProductVariants: setSelectedSize called with:', size?.size_name);
    console.log('🔧 useProductVariants: current selectedColor:', selectedColor?.name);

    // نقبل المقاس دائماً - التحقق سيتم لاحقاً في useEffect إذا لزم الأمر
    console.log('🔧 useProductVariants: Setting size to:', size?.size_name);

    // تحديد أن المقاس تم تعيينه يدوياً
    sizeSetManually.current = true;

    setSelectedSizeState(size);

    // إعادة تعيين العلامة بعد فترة قصيرة
    setTimeout(() => {
      sizeSetManually.current = false;
    }, 100);
  }, []); // إزالة selectedColor من dependencies لتجنب إعادة الإنشاء

  // إعادة تعيين الاختيارات - محسن لتجنب إعادة الإنشاء
  const resetSelections = useCallback(() => {
    if (product?.variants?.has_variants) {
      const defaultColor = getDefaultColor(product);
      
      if (defaultColor) {
        setSelectedColorState(defaultColor);
        
        if (defaultColor.has_sizes) {
          const defaultSize = getDefaultSize(defaultColor);
          setSelectedSizeState(defaultSize || undefined);
        } else {
          setSelectedSizeState(undefined);
        }
      } else {
        setSelectedColorState(undefined);
        setSelectedSizeState(undefined);
      }
    } else {
      setSelectedColorState(undefined);
      setSelectedSizeState(undefined);
    }
  }, [product]); // إضافة product إلى dependencies

  // تحديث المقاس عند تغيير اللون - محسن
  useEffect(() => {
    // لا نحدث المقاس إذا تم تعيينه يدوياً مؤخراً
    if (sizeSetManually.current) {
      console.log('🔄 useProductVariants: Skipping automatic size update (size set manually)');
      return;
    }

    if (selectedColor && selectedColor.has_sizes) {
      const defaultSize = getDefaultSize(selectedColor);
      if (defaultSize && defaultSize.id !== selectedSize?.id) {
        console.log('🔄 useProductVariants: Auto-updating size for new color:', defaultSize.size_name);
        setSelectedSizeState(defaultSize);
      }
    } else {
      setSelectedSizeState(undefined);
    }
  }, [selectedColor?.id]); // استخدام selectedColor.id فقط

  // التحقق من صحة الاختيارات - محسن
  useEffect(() => {
    // تجنب التحقق إذا لم يتم التهيئة بعد
    if (!isInitialized.current) return;
    
    let hasChanges = false;
    
    if (selectedColor && !availableColors.some(c => c.id === selectedColor.id)) {
      setSelectedColorState(undefined);
      hasChanges = true;
    }
    
    if (selectedSize && !availableSizes.some(s => s.id === selectedSize.id)) {
      setSelectedSizeState(undefined);
      hasChanges = true;
    }
    
    // إذا تم إجراء تغييرات، تجنب إعادة التشغيل
    if (hasChanges) return;
  }, [availableColors, availableSizes]); // إزالة selectedColor و selectedSize من dependencies

  const state: ProductVariantsState = {
    selectedColor,
    selectedSize,
    availableColors,
    availableSizes,
    hasVariants,
    hasSizes
  };

  const actions: ProductVariantsActions = {
    setSelectedColor,
    setSelectedSize,
    resetSelections,
    getAvailableStock
  };

  return [state, actions];
};
