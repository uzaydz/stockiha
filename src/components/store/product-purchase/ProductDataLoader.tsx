import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProductPageData, ProductPageData, ProductMarketingSettings, ProductReview } from '@/api/product-page';
import type { Product, ProductColor, ProductSize } from '@/lib/api/products';
import { ExtendedFormSettings, ProductMarketingSettings as LocalProductMarketingSettings } from './ProductStateHooks';
import type { CustomFormField } from '@/components/store/order-form/OrderFormTypes';

interface ProductDataLoaderProps {
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

export const useProductDataLoader = ({
  slug,
  organizationId,
  isOrganizationLoading,
  setIsLoading,
  setError,
  setProduct,
  setEffectiveProduct,
  setSelectedColor,
  setSizes,
  setSelectedSize,
  setFormSettings,
  setCustomFormFields,
  setMarketingSettings,
  dataFetchedRef
}: ProductDataLoaderProps) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (dataFetchedRef.current && !slug) return;
    
    const loadProduct = async () => {
      if (!slug || !organizationId) {
        if (!isOrganizationLoading && !organizationId) {
          setError("Organization context is missing.");
        }
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null); 
        
        const responseData: ProductPageData | null = await getProductPageData(organizationId, slug);
        
        if (!responseData || !responseData.product || !responseData.product.id) {
          console.error('لم يتم العثور على المنتج أو لم يتم تحميل البيانات بشكل صحيح من Edge Function. الاستجابة:', responseData);
          setError('المنتج غير موجود أو تعذر تحميل تفاصيله.');
          setProduct(null);
          setEffectiveProduct(null);
          setSelectedColor(null);
          setSizes([]);
          setSelectedSize(null);
          setFormSettings(null);
          setCustomFormFields([]);
          setMarketingSettings(null);
          setIsLoading(false);
          return;
        }
        
        const actualProduct = responseData.product as Product;
        
        setProduct(actualProduct);
        setEffectiveProduct(actualProduct);
        console.log('[ProductDataLoader] Product data loaded:', actualProduct);
        console.log('[ProductDataLoader] Colors:', responseData.colors);
        console.log('[ProductDataLoader] Sizes:', responseData.sizes);
        console.log('[ProductDataLoader] Form Settings:', responseData.form_settings);
        console.log('[ProductDataLoader] Marketing Settings:', responseData.marketing_settings);
        console.log('[ProductDataLoader] Reviews:', responseData.reviews);
        setIsLoading(false);
        
        if (responseData.colors && Array.isArray(responseData.colors) && responseData.colors.length > 0) {
          const defaultColor = responseData.colors.find(c => c.is_default) || responseData.colors[0];
          if (defaultColor) {
            setSelectedColor(defaultColor as ProductColor);
            if (actualProduct.use_sizes) {
              const filteredSizes = (responseData.sizes || []).filter(
                (size: ProductSize) => size.color_id === defaultColor.id && size.product_id === actualProduct.id
              );
              if (filteredSizes.length > 0) {
                setSizes(filteredSizes);
                const defaultSize = filteredSizes.find(s => s.is_default) || filteredSizes[0];
                setSelectedSize(defaultSize);
              }
            }
          }
        } else {
          setSelectedColor(null);
          setSizes([]);
          setSelectedSize(null);
        }
        
        if (responseData.form_settings && typeof responseData.form_settings === 'object' && !Array.isArray(responseData.form_settings)) {
          const fs = responseData.form_settings as ExtendedFormSettings;
          setFormSettings(fs);
          if (fs.fields && Array.isArray(fs.fields)) {
            const processedFields = fs.fields.map(field => ({ ...field, isVisible: field.isVisible !== undefined ? field.isVisible : true })) as CustomFormField[];
            setCustomFormFields(processedFields);
          }
        } else {
          setFormSettings(null);
          setCustomFormFields([]);
        }

        if (responseData.marketing_settings && typeof responseData.marketing_settings === 'object' && !Array.isArray(responseData.marketing_settings)) {
          const ms = responseData.marketing_settings as LocalProductMarketingSettings;
          setMarketingSettings(ms);
        } else {
          setMarketingSettings(null);
        }

        dataFetchedRef.current = true;
      } catch (error: any) {
        console.error('Error loading product in ProductDataLoader:', error);
        setError(error.message || 'حدث خطأ أثناء تحميل المنتج');
        setProduct(null);
        setEffectiveProduct(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadProduct();
    return () => { dataFetchedRef.current = false; };
  }, [
    slug, 
    organizationId, 
    isOrganizationLoading, 
    navigate,
    setIsLoading,
    setError,
    setProduct,
    setEffectiveProduct,
    setSelectedColor,
    setSizes,
    setSelectedSize,
    setFormSettings,
    setCustomFormFields,
    setMarketingSettings,
    dataFetchedRef
  ]);
}; 