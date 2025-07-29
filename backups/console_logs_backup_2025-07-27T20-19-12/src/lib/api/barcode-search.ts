import { supabase } from '@/lib/supabase';
import { deduplicateRequest } from '@/lib/cache/deduplication';

// واجهة المنتج المبسطة للبحث
export interface BarcodeSearchResult {
  id: string;
  name: string;
  description?: string;
  price: number;
  compare_at_price?: number;
  sku: string;
  barcode?: string;
  category_id?: string;
  brand?: string;
  images: string[];
  thumbnail_image?: string;
  stock_quantity: number;
  has_variants?: boolean;
  use_sizes?: boolean;
  is_active: boolean;
  colors?: Array<{
    id: string;
    name: string;
    color_code: string;
    image_url?: string;
    quantity: number;
    price?: number;
    barcode?: string;
    is_default: boolean;
    has_sizes: boolean;
    sizes?: Array<{
      id: string;
      size_name: string;
      quantity: number;
      price?: number;
      barcode?: string;
      is_default: boolean;
    }>;
  }>;
}

/**
 * البحث المباشر عن منتج بالباركود في قاعدة البيانات
 * يُستخدم فقط عندما لا يُوجد المنتج في الكاش المحلي
 */
export async function searchProductByBarcode(
  organizationId: string,
  barcode: string
): Promise<BarcodeSearchResult | null> {
  if (!barcode || !organizationId) {
    return null;
  }

  const cacheKey = `barcode-search-${organizationId}-${barcode}`;
  
  return deduplicateRequest(cacheKey, async () => {
    try {
      // البحث في المنتجات الأساسية
      const { data: products, error: productError } = await supabase
        .from('products')
        .select(`
          *,
          product_colors (
            id, product_id, name, color_code, image_url, quantity, price, barcode, 
            is_default, has_sizes, variant_number, purchase_price,
            product_sizes (
              id, color_id, product_id, size_name, quantity, price, barcode, 
              is_default, purchase_price
            )
          )
        `)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .or(`barcode.eq.${barcode},sku.eq.${barcode}`)
        .limit(1);

      if (productError) {
        return null;
      }

      if (products && products.length > 0) {
        const product = products[0];
        return transformDatabaseProductToSearchResult(product);
      }

      // البحث في الألوان والمقاسات إذا لم نجد في المنتجات الأساسية
      const { data: colorResults, error: colorError } = await supabase
        .from('product_colors')
        .select(`
          *,
          product:products!inner (
            id, name, description, price, compare_at_price, sku, barcode,
            category_id, brand, images, thumbnail_image, stock_quantity,
            has_variants, use_sizes, is_active, organization_id
          ),
          product_sizes (
            id, color_id, product_id, size_name, quantity, price, barcode, 
            is_default, purchase_price
          )
        `)
        .eq('product.organization_id', organizationId)
        .eq('product.is_active', true)
        .eq('barcode', barcode)
        .limit(1);

      if (!colorError && colorResults && colorResults.length > 0) {
        const colorResult = colorResults[0];
        return transformColorResultToSearchResult(colorResult);
      }

      // البحث في المقاسات
      const { data: sizeResults, error: sizeError } = await supabase
        .from('product_sizes')
        .select(`
          *,
          color:product_colors!inner (
            id, product_id, name, color_code, image_url, quantity, price, barcode, 
            is_default, has_sizes, variant_number, purchase_price,
            product:products!inner (
              id, name, description, price, compare_at_price, sku, barcode,
              category_id, brand, images, thumbnail_image, stock_quantity,
              has_variants, use_sizes, is_active, organization_id
            )
          )
        `)
        .eq('color.product.organization_id', organizationId)
        .eq('color.product.is_active', true)
        .eq('barcode', barcode)
        .limit(1);

      if (!sizeError && sizeResults && sizeResults.length > 0) {
        const sizeResult = sizeResults[0];
        return transformSizeResultToSearchResult(sizeResult);
      }

      return null;

    } catch (error) {
      return null;
    }
  });
}

/**
 * تحويل منتج من قاعدة البيانات إلى نتيجة بحث
 */
function transformDatabaseProductToSearchResult(product: any): BarcodeSearchResult {
  const colors = (product.product_colors || []).map((color: any) => ({
    id: color.id,
    name: color.name,
    color_code: color.color_code,
    image_url: color.image_url,
    quantity: color.quantity,
    price: color.price,
    barcode: color.barcode,
    is_default: color.is_default,
    has_sizes: color.has_sizes,
    sizes: (color.product_sizes || []).map((size: any) => ({
      id: size.id,
      size_name: size.size_name,
      quantity: size.quantity,
      price: size.price,
      barcode: size.barcode,
      is_default: size.is_default,
    }))
  }));

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    compare_at_price: product.compare_at_price,
    sku: product.sku,
    barcode: product.barcode,
    category_id: product.category_id,
    brand: product.brand,
    images: product.images || [],
    thumbnail_image: product.thumbnail_image,
    stock_quantity: product.stock_quantity,
    has_variants: product.has_variants,
    use_sizes: product.use_sizes,
    is_active: product.is_active,
    colors
  };
}

/**
 * تحويل نتيجة بحث اللون إلى نتيجة بحث
 */
function transformColorResultToSearchResult(colorResult: any): BarcodeSearchResult {
  const product = colorResult.product;
  const color = {
    id: colorResult.id,
    name: colorResult.name,
    color_code: colorResult.color_code,
    image_url: colorResult.image_url,
    quantity: colorResult.quantity,
    price: colorResult.price,
    barcode: colorResult.barcode,
    is_default: colorResult.is_default,
    has_sizes: colorResult.has_sizes,
    sizes: (colorResult.product_sizes || []).map((size: any) => ({
      id: size.id,
      size_name: size.size_name,
      quantity: size.quantity,
      price: size.price,
      barcode: size.barcode,
      is_default: size.is_default,
    }))
  };

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    compare_at_price: product.compare_at_price,
    sku: product.sku,
    barcode: product.barcode,
    category_id: product.category_id,
    brand: product.brand,
    images: product.images || [],
    thumbnail_image: product.thumbnail_image,
    stock_quantity: product.stock_quantity,
    has_variants: product.has_variants,
    use_sizes: product.use_sizes,
    is_active: product.is_active,
    colors: [color]
  };
}

/**
 * تحويل نتيجة بحث المقاس إلى نتيجة بحث
 */
function transformSizeResultToSearchResult(sizeResult: any): BarcodeSearchResult {
  const product = sizeResult.color.product;
  const color = sizeResult.color;
  const size = {
    id: sizeResult.id,
    size_name: sizeResult.size_name,
    quantity: sizeResult.quantity,
    price: sizeResult.price,
    barcode: sizeResult.barcode,
    is_default: sizeResult.is_default,
  };

  const colorWithSize = {
    id: color.id,
    name: color.name,
    color_code: color.color_code,
    image_url: color.image_url,
    quantity: color.quantity,
    price: color.price,
    barcode: color.barcode,
    is_default: color.is_default,
    has_sizes: color.has_sizes,
    sizes: [size]
  };

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    compare_at_price: product.compare_at_price,
    sku: product.sku,
    barcode: product.barcode,
    category_id: product.category_id,
    brand: product.brand,
    images: product.images || [],
    thumbnail_image: product.thumbnail_image,
    stock_quantity: product.stock_quantity,
    has_variants: product.has_variants,
    use_sizes: product.use_sizes,
    is_active: product.is_active,
    colors: [colorWithSize]
  };
}
