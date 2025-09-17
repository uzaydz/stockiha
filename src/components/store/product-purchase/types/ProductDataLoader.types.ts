import type { Product, ProductColor, ProductSize } from '@/lib/api/products';
import { ExtendedFormSettings, ProductMarketingSettings as LocalProductMarketingSettings } from '../ProductStateHooks';
import type { CustomFormField } from '@/components/store/order-form/OrderFormTypes';

/**
 * خصائص مكون تحميل بيانات المنتج
 */
export interface ProductDataLoaderProps {
  slug: string | undefined;
  organizationId: string | undefined;
  isOrganizationLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setProduct: (product: Product | null) => void;
  setEffectiveProduct: (product: Product | null) => void;
  setSelectedColor: (color: ProductColor | null) => void;
  setSizes: (sizes: ProductSize[]) => void;
  setSelectedSize: (size: ProductSize | null) => void;
  setFormSettings: (settings: ExtendedFormSettings | null) => void;
  setCustomFormFields: (fields: CustomFormField[]) => void;
  setMarketingSettings: (settings: LocalProductMarketingSettings | null) => void;
  dataFetchedRef: React.MutableRefObject<boolean>;
}

/**
 * إعدادات إعادة المحاولة
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

/**
 * حالة تحميل البيانات
 */
export interface ProductDataState {
  isLoading: boolean;
  error: string | null;
  product: Product | null;
  effectiveProduct: Product | null;
  selectedColor: ProductColor | null;
  sizes: ProductSize[];
  selectedSize: ProductSize | null;
  formSettings: ExtendedFormSettings | null;
  customFormFields: CustomFormField[];
  marketingSettings: LocalProductMarketingSettings | null;
}
