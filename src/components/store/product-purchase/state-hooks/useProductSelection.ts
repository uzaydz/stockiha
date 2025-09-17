import { toast } from 'sonner';
import type { Product, ProductColor, ProductSize, UpsellDownsellItem } from '@/lib/api/products';

interface UseProductSelectionOptions {
  product: Product | null;
  setSelectedColor: (color: ProductColor | null) => void;
  setSelectedSize: (size: ProductSize | null) => void;
  setSizes: (sizes: ProductSize[]) => void;
  setQuantity: (quantity: number) => void;
  setEffectiveProduct: (product: Product | null) => void;
  effectiveProduct: Product | null;
}

interface UseProductSelectionReturn {
  handleColorSelect: (color: ProductColor) => void;
  handleSizeSelect: (size: ProductSize) => void;
  handleQuantityChange: (newQuantity: number, maxQuantity: number) => void;
  handleAcceptOffer: (acceptedItem: UpsellDownsellItem, finalPrice: number, acceptedProductData: Product) => void;
}

export const useProductSelection = ({
  product,
  setSelectedColor,
  setSelectedSize,
  setSizes,
  setQuantity,
  setEffectiveProduct,
  effectiveProduct
}: UseProductSelectionOptions): UseProductSelectionReturn => {

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
