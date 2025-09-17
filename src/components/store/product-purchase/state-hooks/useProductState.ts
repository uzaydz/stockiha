import { useState, useRef } from 'react';
import type { Product, ProductColor, ProductSize } from '@/lib/api/products';
import { FormSettings, CustomFormField } from '@/components/store/order-form/OrderFormTypes';
// واجهة إعدادات التسويق
interface ProductMarketingSettings {
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

interface UseProductStateReturn {
  product: Product | null;
  setProduct: (product: Product | null) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  selectedColor: ProductColor | null;
  setSelectedColor: (color: ProductColor | null) => void;
  sizes: ProductSize[];
  setSizes: (sizes: ProductSize[]) => void;
  selectedSize: ProductSize | null;
  setSelectedSize: (size: ProductSize | null) => void;
  loadingSizes: boolean;
  setLoadingSizes: (loading: boolean) => void;
  quantity: number;
  setQuantity: (quantity: number) => void;
  error: string | null;
  setError: (error: string | null) => void;
  customFormFields: CustomFormField[];
  setCustomFormFields: (fields: CustomFormField[]) => void;
  formSettings: FormSettings | null;
  setFormSettings: (settings: FormSettings | null) => void;
  showStickyButton: boolean;
  setShowStickyButton: (show: boolean) => void;
  effectiveProduct: Product | null;
  setEffectiveProduct: (product: Product | null) => void;
  effectivePrice: number | null;
  setEffectivePrice: (price: number | null) => void;
  marketingSettings: ProductMarketingSettings | null;
  setMarketingSettings: (settings: ProductMarketingSettings | null) => void;
  orderFormRef: React.RefObject<HTMLDivElement>;
  dataFetchedRef: React.MutableRefObject<boolean>;
}

export const useProductState = (): UseProductStateReturn => {
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(null);
  const [sizes, setSizes] = useState<ProductSize[]>([]);
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
  const [loadingSizes, setLoadingSizes] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [customFormFields, setCustomFormFields] = useState<CustomFormField[]>([]);
  const [formSettings, setFormSettings] = useState<FormSettings | null>(null);
  const [showStickyButton, setShowStickyButton] = useState(false);
  const [effectiveProduct, setEffectiveProduct] = useState<Product | null>(null);
  const [effectivePrice, setEffectivePrice] = useState<number | null>(null);
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
