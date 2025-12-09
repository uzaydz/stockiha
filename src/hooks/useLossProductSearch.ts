import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { deltaWriteService } from '@/services/DeltaWriteService';
import type { LocalProduct } from '@/database/localDb';
import type { Product, ProductVariant } from '@/types/losses';

interface UseLossProductSearchResult {
  products: Product[];
  searchingProducts: boolean;
  productSearchQuery: string;
  setProductSearchQuery: (value: string) => void;
  selectedProduct: Product | null;
  productVariants: ProductVariant[];
  loadingVariants: boolean;
  isVariantDialogOpen: boolean;
  setIsVariantDialogOpen: (value: boolean) => void;
  searchProducts: (query: string, organizationId?: string) => Promise<void>;
  getProductVariants: (productId: string) => Promise<void>;
  resetSelection: () => void;
  startVariantSelection: (product: Product) => Promise<void>;
}

export const useLossProductSearch = (): UseLossProductSearchResult => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [isVariantDialogOpen, setIsVariantDialogOpen] = useState(false);

  const resetSelection = useCallback(() => {
    setProducts([]);
    setProductSearchQuery('');
    setSelectedProduct(null);
    setProductVariants([]);
    setIsVariantDialogOpen(false);
  }, []);

  const searchProducts = useCallback(async (query: string, organizationId?: string) => {
    if (!query || !organizationId) return;
    setSearchingProducts(true);
    try {
      const allProducts = await deltaWriteService.getAll<LocalProduct>('products', organizationId);

      const lowerQuery = query.toLowerCase();
      const filteredProducts = allProducts
        .filter(p =>
          p.name.toLowerCase().includes(lowerQuery) ||
          p.sku.toLowerCase().includes(lowerQuery)
        )
        .slice(0, 20);

      const productsWithVariants = await Promise.all(
        filteredProducts.map(async (product) => {
          try {
            const [colorsRes, sizesRes] = await Promise.all([
              supabase
                .from('product_colors')
                .select('id')
                .eq('product_id', product.id)
                .limit(1),
              supabase
                .from('product_sizes')
                .select('id')
                .eq('product_id', product.id)
                .limit(1)
            ]);

            return {
              ...product,
              has_colors: (colorsRes.data?.length || 0) > 0,
              has_sizes: (sizesRes.data?.length || 0) > 0
            };
          } catch (err) {
            return {
              ...product,
              has_colors: false,
              has_sizes: false
            };
          }
        })
      );

      setProducts(productsWithVariants as Product[]);
    } catch (error) {
      console.error('خطأ في البحث عن المنتجات:', error);
      toast.error('حدث خطأ في البحث عن المنتجات');
    } finally {
      setSearchingProducts(false);
    }
  }, []);

  const getProductVariants = useCallback(async (productId: string) => {
    setLoadingVariants(true);
    try {
      const [colorsQuery, sizesQuery, productQuery] = await Promise.all([
        supabase
          .from('product_colors')
          .select('id, name, color_code, quantity')
          .eq('product_id', productId),

        supabase
          .from('product_sizes')
          .select('id, size_name, color_id, quantity')
          .eq('product_id', productId),

        supabase
          .from('products')
          .select('id, name, sku, purchase_price, price, stock_quantity')
          .eq('id', productId)
          .single()
      ]);

      const product = productQuery.data;
      if (!product) {
        throw new Error('المنتج غير موجود');
      }

      const colors = colorsQuery.data || [];
      const sizes = sizesQuery.data || [];

      const variants: ProductVariant[] = [];

      if (colors.length > 0 && sizes.length > 0) {
        colors.forEach(color => {
          sizes.forEach(size => {
            variants.push({
              product_id: product.id,
              product_name: product.name,
              product_sku: product.sku,
              product_purchase_price: product.purchase_price,
              product_price: product.price,
              has_colors: true,
              has_sizes: true,
              variant_type: 'color_size',
              color_id: color.id,
              color_name: color.name,
              color_code: color.color_code,
              size_id: size.id,
              size_name: size.size_name,
              size_code: size.size_name,
              current_stock: color.quantity || 0,
              variant_display_name: `${color.name} - ${size.size_name}`
            });
          });
        });
      } else if (colors.length > 0) {
        colors.forEach(color => {
          variants.push({
            product_id: product.id,
            product_name: product.name,
            product_sku: product.sku,
            product_purchase_price: product.purchase_price,
            product_price: product.price,
            has_colors: true,
            has_sizes: false,
            variant_type: 'color_only',
            color_id: color.id,
            color_name: color.name,
            color_code: color.color_code,
            current_stock: color.quantity || 0,
            variant_display_name: color.name
          });
        });
      } else if (sizes.length > 0) {
        sizes.forEach(size => {
          variants.push({
            product_id: product.id,
            product_name: product.name,
            product_sku: product.sku,
            product_purchase_price: product.purchase_price,
            product_price: product.price,
            has_colors: false,
            has_sizes: true,
            variant_type: 'size_only',
            size_id: size.id,
            size_name: size.size_name,
            size_code: size.size_name,
            current_stock: size.quantity || 0,
            variant_display_name: size.size_name
          });
        });
      } else {
        variants.push({
          product_id: product.id,
          product_name: product.name,
          product_sku: product.sku,
          product_purchase_price: product.purchase_price,
          product_price: product.price,
          has_colors: false,
          has_sizes: false,
          variant_type: 'main',
          current_stock: product.stock_quantity,
          variant_display_name: 'المنتج الأساسي'
        });
      }

      setProductVariants(variants);
    } catch (error) {
      toast.error('حدث خطأ في جلب متغيرات المنتج');
      setProductVariants([]);
    } finally {
      setLoadingVariants(false);
    }
  }, []);

  const startVariantSelection = useCallback(async (product: Product) => {
    setSelectedProduct(product);
    await getProductVariants(product.id);
    setIsVariantDialogOpen(true);
  }, [getProductVariants]);

  return {
    products,
    searchingProducts,
    productSearchQuery,
    setProductSearchQuery,
    selectedProduct,
    productVariants,
    loadingVariants,
    isVariantDialogOpen,
    setIsVariantDialogOpen,
    searchProducts,
    getProductVariants,
    resetSelection,
    startVariantSelection
  };
};







