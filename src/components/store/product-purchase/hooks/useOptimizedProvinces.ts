import { useProductPageData } from './useProductPageData';

export const useOptimizedProvinces = () => {
  const { data } = useProductPageData();
  return {
    provinces: data.provinces,
    isLoading: false, // البيانات متاحة من السياق
    error: null
  };
};
