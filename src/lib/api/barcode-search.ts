import { powerSyncService } from '@/lib/powersync/PowerSyncService';

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
 * ⚡ البحث المباشر عن منتج بالباركود من PowerSync (Offline-First)
 * يعمل محلياً من SQLite بدون الحاجة للاتصال بالإنترنت
 */
export async function searchProductByBarcode(
  organizationId: string,
  barcode: string
): Promise<BarcodeSearchResult | null> {
  if (!barcode || !organizationId) {
    return null;
  }

  try {
    // 1️⃣ البحث في المنتجات الأساسية (barcode أو sku)
    const product = await powerSyncService.queryOne<any>({
      sql: `SELECT * FROM products 
       WHERE organization_id = ? 
       AND is_active = 1 
       AND (barcode = ? OR sku = ?)
       LIMIT 1`,
      params: [organizationId, barcode, barcode]
    });

    if (product) {
      // جلب الألوان والمقاسات
      const [colors, sizes] = await Promise.all([
        powerSyncService.query<any>({
          sql: `SELECT * FROM product_colors 
           WHERE product_id = ? 
           ORDER BY is_default DESC, name ASC`,
          params: [product.id]
        }),
        powerSyncService.query<any>({
          sql: `SELECT ps.* FROM product_sizes ps
           INNER JOIN product_colors pc ON ps.color_id = pc.id
           WHERE ps.product_id = ?
           ORDER BY ps.size_name ASC`,
          params: [product.id]
        })
      ]);

      // تجميع المقاسات حسب اللون
      const colorsWithSizes = colors.map((color: any) => ({
        ...color,
        sizes: sizes.filter((s: any) => s.color_id === color.id)
      }));

      return transformDatabaseProductToSearchResult({
        ...product,
        product_colors: colorsWithSizes
      });
    }

    // 2️⃣ البحث في الألوان
    const color = await powerSyncService.queryOne<any>({
      sql: `SELECT pc.*, p.* 
       FROM product_colors pc
       INNER JOIN products p ON pc.product_id = p.id
       WHERE pc.organization_id = ? 
       AND p.is_active = 1 
       AND pc.barcode = ?
       LIMIT 1`,
      params: [organizationId, barcode]
    });

    if (color) {
      // جلب المقاسات لهذا اللون
      const colorSizes = await powerSyncService.query<any>({
        sql: `SELECT * FROM product_sizes 
         WHERE color_id = ? 
         ORDER BY size_name ASC`,
        params: [color.id]
      });

      return transformColorResultToSearchResult({
        ...color,
        product: {
          id: color.product_id,
          name: color.name,
          description: color.description,
          price: color.price,
          compare_at_price: color.compare_at_price,
          sku: color.sku,
          barcode: color.barcode,
          category_id: color.category_id,
          brand: color.brand,
          images: color.images ? JSON.parse(color.images) : [],
          thumbnail_image: color.thumbnail_image,
          stock_quantity: color.stock_quantity,
          has_variants: color.has_variants,
          use_sizes: color.use_sizes,
          is_active: color.is_active,
          organization_id: color.organization_id
        },
        product_sizes: colorSizes
      });
    }

    // 3️⃣ البحث في المقاسات
    const size = await powerSyncService.queryOne<any>({
      sql: `SELECT ps.*, pc.*, p.*
       FROM product_sizes ps
       INNER JOIN product_colors pc ON ps.color_id = pc.id
       INNER JOIN products p ON ps.product_id = p.id
       WHERE ps.organization_id = ? 
       AND p.is_active = 1 
       AND ps.barcode = ?
       LIMIT 1`,
      params: [organizationId, barcode]
    });

    if (size) {
      // جلب اللون الكامل
      const colorFull = await powerSyncService.queryOne<any>({
        sql: `SELECT * FROM product_colors WHERE id = ?`,
        params: [size.color_id]
      });

      return transformSizeResultToSearchResult({
        ...size,
        color: {
          ...colorFull,
          product: {
            id: size.product_id,
            name: size.name,
            description: size.description,
            price: size.price,
            compare_at_price: size.compare_at_price,
            sku: size.sku,
            barcode: size.barcode,
            category_id: size.category_id,
            brand: size.brand,
            images: size.images ? JSON.parse(size.images) : [],
            thumbnail_image: size.thumbnail_image,
            stock_quantity: size.stock_quantity,
            has_variants: size.has_variants,
            use_sizes: size.use_sizes,
            is_active: size.is_active,
            organization_id: size.organization_id
          }
        }
      });
    }

    return null;

  } catch (error) {
    console.error('[barcode-search] Error:', error);
    return null;
  }
}

/**
 * تحويل منتج من قاعدة البيانات إلى نتيجة بحث
 */
function transformDatabaseProductToSearchResult(product: any): BarcodeSearchResult {
  // معالجة images إذا كانت JSON string
  let images: string[] = [];
  if (product.images) {
    if (typeof product.images === 'string') {
      try {
        images = JSON.parse(product.images);
      } catch {
        images = [product.images];
      }
    } else if (Array.isArray(product.images)) {
      images = product.images;
    }
  }

  const colors = (product.product_colors || []).map((color: any) => ({
    id: color.id,
    name: color.name,
    color_code: color.color_code,
    image_url: color.image_url,
    quantity: color.quantity || 0,
    price: color.price,
    barcode: color.barcode,
    is_default: color.is_default || false,
    has_sizes: color.has_sizes || false,
    sizes: (color.sizes || color.product_sizes || []).map((size: any) => ({
      id: size.id,
      size_name: size.size_name,
      quantity: size.quantity || 0,
      price: size.price,
      barcode: size.barcode,
      is_default: size.is_default || false,
    }))
  }));

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price || 0,
    compare_at_price: product.compare_at_price,
    sku: product.sku || '',
    barcode: product.barcode,
    category_id: product.category_id,
    brand: product.brand,
    images,
    thumbnail_image: product.thumbnail_image,
    stock_quantity: product.stock_quantity || 0,
    has_variants: product.has_variants || false,
    use_sizes: product.use_sizes || false,
    is_active: product.is_active !== undefined ? product.is_active : true,
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
