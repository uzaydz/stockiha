import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { Product, ProductColor, ProductSize, UpsellDownsellItem } from '@/lib/api/products';
import { FormSettings, CustomFormField } from '@/components/store/order-form/OrderFormTypes';

// تمديد واجهة FormSettings لإضافة حقل fields
export interface ExtendedFormSettings extends FormSettings {
  fields?: CustomFormField[];
}

// واجهة إعدادات التسويق
export interface ProductMarketingSettings {
  id: string;
  product_id: string;
  offer_timer_enabled?: boolean;
  offer_timer_title?: string;
  offer_timer_type?: 'evergreen' | 'specific_date' | 'fixed_duration_per_visitor';
  offer_timer_end_date?: string;
  offer_timer_duration_minutes?: number;
  offer_timer_text_above?: string;
  offer_timer_text_below?: string;
  offer_timer_end_action?: 'hide' | 'show_message' | 'redirect';
  offer_timer_end_action_message?: string;
  offer_timer_end_action_url?: string;
  offer_timer_restart_for_new_session?: boolean;
  offer_timer_cookie_duration_days?: number;
  offer_timer_show_on_specific_pages_only?: boolean;
  offer_timer_specific_page_urls?: string[];
  enable_reviews?: boolean;
  [key: string]: any;
}

export const useProductState = () => {
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(null);
  const [sizes, setSizes] = useState<ProductSize[]>([]);
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
  const [loadingSizes, setLoadingSizes] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [customFormFields, setCustomFormFields] = useState<CustomFormField[]>([]);
  const [formSettings, setFormSettings] = useState<ExtendedFormSettings | null>(null);
  const [showStickyButton, setShowStickyButton] = useState(false);
  const [effectiveProduct, setEffectiveProduct] = useState<Product | null>(null);
  const [effectivePrice, setEffectivePrice] = useState<number | null>(null);
  
  // إضافة حالة إعدادات التسويق
  const [marketingSettings, setMarketingSettings] = useState<ProductMarketingSettings | null>(null);
  
  const orderFormRef = useRef<HTMLDivElement>(null);
  const dataFetchedRef = useRef(false);

  return {
    product,
    setProduct,
    isLoading,
    setIsLoading,
    selectedColor,
    setSelectedColor,
    sizes,
    setSizes,
    selectedSize,
    setSelectedSize,
    loadingSizes,
    setLoadingSizes,
    quantity,
    setQuantity,
    error,
    setError,
    customFormFields,
    setCustomFormFields,
    formSettings,
    setFormSettings,
    showStickyButton,
    setShowStickyButton,
    effectiveProduct,
    setEffectiveProduct,
    effectivePrice,
    setEffectivePrice,
    marketingSettings,
    setMarketingSettings,
    orderFormRef,
    dataFetchedRef
  };
};

export const useStickyButtonLogic = (orderFormRef: React.RefObject<HTMLDivElement>) => {
  const [showStickyButton, setShowStickyButton] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!orderFormRef.current) return;
      
      const orderFormPosition = orderFormRef.current.getBoundingClientRect().top;
      const windowHeight = window.innerHeight;
      
      setShowStickyButton(orderFormPosition > windowHeight);
    };
    
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [orderFormRef]);

  const scrollToOrderForm = () => {
    if (orderFormRef.current) {
      orderFormRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return { showStickyButton, scrollToOrderForm };
};

export const useProductSelection = ({
  product,
  setSelectedColor,
  setSelectedSize,
  setSizes,
  setQuantity,
  setEffectiveProduct,
  effectiveProduct
}: {
  product: Product | null;
  setSelectedColor: (color: ProductColor | null) => void;
  setSelectedSize: (size: ProductSize | null) => void;
  setSizes: (sizes: ProductSize[]) => void;
  setQuantity: (quantity: number) => void;
  setEffectiveProduct: (product: Product | null) => void;
  effectiveProduct: Product | null;
}) => {
  
  const handleColorSelect = (color: ProductColor) => {
    setSelectedColor(color);
    setSelectedSize(null);
    setSizes([]);

    if (product?.use_sizes && product.id && product.sizes) {
      const filteredSizes = product.sizes.filter(
        (size: ProductSize) => size.color_id === color.id && size.product_id === product.id
      );
      if (filteredSizes.length > 0) {
        setSizes(filteredSizes);
        const defaultSize = filteredSizes.find(s => s.is_default) || filteredSizes[0];
        setSelectedSize(defaultSize);
      }
    }
    if (product && effectiveProduct?.id !== product.id) {
      setEffectiveProduct(product);
      toast.info('تم العودة إلى المنتج الأصلي.');
    }
  };

  const handleSizeSelect = (size: ProductSize) => {
    setSelectedSize(size);
    setQuantity(1); 
    if (product && effectiveProduct?.id !== product.id) {
      setEffectiveProduct(product);
    }
  };

  const handleQuantityChange = (newQuantity: number, maxQuantity: number) => {
    if (newQuantity > 0 && newQuantity <= maxQuantity) {
      setQuantity(newQuantity);
    }
  };

  const handleAcceptOffer = (acceptedItem: UpsellDownsellItem, finalPrice: number, acceptedProductData: Product) => {
    setEffectiveProduct(acceptedProductData); 
    setQuantity(1); 
    const defaultAcceptedColor = acceptedProductData.colors?.find(c => c.is_default) || acceptedProductData.colors?.[0] || null;
    setSelectedColor(defaultAcceptedColor);
    setSelectedSize(null);
    setSizes([]);

    if (acceptedProductData.use_sizes && defaultAcceptedColor && acceptedProductData.sizes) {
      const filteredSizes = acceptedProductData.sizes.filter(
        (size: ProductSize) => size.color_id === defaultAcceptedColor.id && size.product_id === acceptedProductData.id
      );
      if (filteredSizes.length > 0) {
        setSizes(filteredSizes);
        const defaultSize = filteredSizes.find(s => s.is_default) || filteredSizes[0];
        setSelectedSize(defaultSize);
      }
    }
    toast.success(`تم تغيير المنتج إلى: ${acceptedProductData.name}`);
  };

  return {
    handleColorSelect,
    handleSizeSelect,
    handleQuantityChange,
    handleAcceptOffer
  };
};

export const useProductPrice = ({
  product,
  selectedSize,
  selectedColor,
  effectiveProduct,
  setEffectivePrice
}: {
  product: Product | null;
  selectedSize: ProductSize | null;
  selectedColor: ProductColor | null;
  effectiveProduct: Product | null;
  setEffectivePrice: (price: number | null) => void;
}) => {
  
  useEffect(() => {
    if (effectiveProduct) {
      let base = effectiveProduct.discount_price ?? effectiveProduct.price;
      setEffectivePrice(base);
    }
  }, [effectiveProduct, setEffectivePrice]);

  const calculatePrice = () => {
    if (!product) return 0;
    if (selectedSize?.price != null) return selectedSize.price;
    if (selectedColor?.price != null) return selectedColor.price;
    return product.discount_price ?? product.price;
  };

  const getAvailableQuantity = () => {
    return selectedSize?.quantity ?? selectedColor?.quantity ?? product?.stock_quantity ?? 0;
  };

  return {
    calculatePrice,
    getAvailableQuantity
  };
}; 