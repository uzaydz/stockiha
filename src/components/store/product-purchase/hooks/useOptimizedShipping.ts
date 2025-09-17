import { useProductPageData } from './useProductPageData';

export const useOptimizedShippingProviders = () => {
  const { data, getShippingProvider } = useProductPageData();
  return {
    providers: data.shippingProviders,
    getProvider: getShippingProvider,
    isLoading: false
  };
};

export const useOptimizedShippingClones = () => {
  const { data, getShippingClone } = useProductPageData();
  return {
    clones: data.shippingClones,
    getClone: getShippingClone,
    isLoading: false
  };
};
