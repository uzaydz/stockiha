import { useProductPageData } from './useProductPageData';

export const useOptimizedProductConfig = (productId?: string) => {
  const { data, getProductConfig } = useProductPageData();
  return {
    config: productId ? getProductConfig(productId) : null,
    isLoading: false
  };
};

export const useOptimizedServices = () => {
  const { data } = useProductPageData();
  return {
    services: data.services,
    isLoading: false
  };
};
