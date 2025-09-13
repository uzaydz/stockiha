import { useCallback } from 'react';

export function usePurchaseActions({
  canPurchase,
  pageState,
  setPageState,
  actions,
  effectiveProduct,
  productTracking,
  priceInfo,
  selectedColor,
  selectedSize
}: any) {
  const { setQuantity } = actions;

  const handleFormChange = useCallback((data: Record<string, any>) => {
    if (process.env.NODE_ENV === 'development') {}
    setPageState((prev: any) => {
      const newData = { ...prev.submittedFormData, ...data };
      if (!newData.province && prev.submittedFormData.province) newData.province = prev.submittedFormData.province;
      if (!newData.municipality && prev.submittedFormData.municipality) newData.municipality = prev.submittedFormData.municipality;
      return { ...prev, submittedFormData: newData };
    });
  }, [setPageState]);

  const handleQuantityChange = useCallback((newQuantity: number) => {
    setQuantity(newQuantity);
    if (effectiveProduct && productTracking?.isReady && newQuantity > 0) {
      productTracking.trackAddToCart?.({
        name: effectiveProduct.name,
        price: priceInfo?.price || 0,
        quantity: 1,
        image: effectiveProduct.images?.thumbnail_image || effectiveProduct.images?.additional_images?.[0]?.url,
        selectedColor: selectedColor?.name,
        selectedSize: selectedSize?.size_name
      });
    }
  }, [setQuantity, effectiveProduct, productTracking, priceInfo, selectedColor, selectedSize]);

  return { handleFormChange, handleQuantityChange };
}

