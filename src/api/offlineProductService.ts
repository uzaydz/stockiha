import { supabase } from '@/lib/supabase';
import { 
  createLocalProduct,
  updateLocalProduct,
  deleteLocalProduct,
  getLocalProducts as fetchLocalProducts
} from './localProductService';
import { synchronizeWithServer } from './syncService';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Product } from './productService';
import { LocalProduct } from '@/database/localDb';

/**
 * خدمة المنتجات المُوحدة (Offline-First)
 * تقوم بالتعامل مع البيانات المحلية والبعيدة بشكل موحد
 */

// التحقق من حالة الاتصال
const isOnline = (): boolean => {
  return navigator.onLine;
};

// جلب المنتجات - تجمع بين المحلي والبعيد
export const getProducts = async (organizationId: string): Promise<LocalProduct[]> => {
  try {
    // محاولة مزامنة أولاً إذا كان متصلاً
    if (isOnline()) {
      try {
        await synchronizeWithServer();
      } catch (error) {
      }
    }

    // استخدام البيانات المحلية بغض النظر عن حالة الاتصال
    const products = await fetchLocalProducts();
    
    // تصفية حسب المؤسسة
    return products.filter(product => product.organization_id === organizationId);
    
  } catch (error) {
    throw error;
  }
};

// جلب منتج واحد بواسطة المعرف
export const getProductById = async (organizationId: string, productId: string): Promise<LocalProduct | null> => {
  try {
    const products = await fetchLocalProducts();
    return products.find(p => p.id === productId && p.organization_id === organizationId) || null;
  } catch (error) {
    throw error;
  }
};

// إنشاء منتج جديد
export const createProduct = async (
  organizationId: string, 
  product: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'organization_id'>
): Promise<LocalProduct> => {
  try {
    // إنشاء المنتج محلياً أولاً
    const newProduct = await createLocalProduct(organizationId, {
      ...product,
      organization_id: organizationId
    });
    
    // محاولة المزامنة إذا كان متصلاً
    if (isOnline()) {
      try {
        await synchronizeWithServer();
      } catch (error) {
      }
    }
    
    return newProduct;
  } catch (error) {
    throw error;
  }
};

// تحديث منتج موجود
export const updateProduct = async (
  organizationId: string, 
  productId: string, 
  updates: Partial<Omit<Product, 'id' | 'created_at' | 'updated_at' | 'organization_id'>>
): Promise<LocalProduct | null> => {
  try {
    // تحديث المنتج محلياً أولاً
    const updatedProduct = await updateLocalProduct(productId, updates);
    
    if (!updatedProduct) {
      throw new Error(`لم يتم العثور على المنتج بالمعرف: ${productId}`);
    }
    
    // محاولة المزامنة إذا كان متصلاً
    if (isOnline()) {
      try {
        await synchronizeWithServer();
      } catch (error) {
      }
    }
    
    return updatedProduct;
  } catch (error) {
    throw error;
  }
};

// حذف منتج
export const deleteProduct = async (organizationId: string, productId: string): Promise<boolean> => {
  try {
    // التحقق من أن المنتج ينتمي للمؤسسة الصحيحة
    const product = await getProductById(organizationId, productId);
    
    if (!product) {
      throw new Error(`لم يتم العثور على المنتج بالمعرف: ${productId}`);
    }
    
    // حذف المنتج محلياً
    const result = await deleteLocalProduct(productId);
    
    // محاولة المزامنة إذا كان متصلاً
    if (isOnline()) {
      try {
        await synchronizeWithServer();
      } catch (error) {
      }
    }
    
    return result;
  } catch (error) {
    throw error;
  }
};

// تحديث كمية المخزون (مثلاً عند البيع)
type VariantUpdateOptions = {
  colorId?: string | null;
  sizeId?: string | null;
};

const calculateVariantStock = (colors: any[] | undefined): number => {
  if (!Array.isArray(colors)) {
    return 0;
  }

  return colors.reduce((sum, color) => {
    const baseQuantity = Number(color?.quantity ?? 0);
    const rawSizes = Array.isArray(color?.product_sizes)
      ? color.product_sizes
      : Array.isArray(color?.sizes)
        ? color.sizes
        : [];

    if (rawSizes.length === 0) {
      return sum + Math.max(0, baseQuantity);
    }

    const sizesTotal = rawSizes.reduce((sizesSum: number, size: any) => {
      return sizesSum + Math.max(0, Number(size?.quantity ?? 0));
    }, 0);

    return sum + sizesTotal;
  }, 0);
};

const applyVariantQuantityUpdate = (
  colorsSource: any[] | undefined,
  signedDelta: number,
  colorId?: string | null,
  sizeId?: string | null
): any[] | undefined => {
  if (!Array.isArray(colorsSource) || !colorId) {
    return undefined;
  }

  let hasChanges = false;
  const updatedColors = colorsSource.map((rawColor) => {
    const colorCandidates = [
      rawColor?.id,
      rawColor?.color_id,
      rawColor?.colorId,
      rawColor?.variant_id
    ].filter(Boolean);

    if (!colorCandidates.includes(colorId)) {
      return rawColor;
    }

    hasChanges = true;
    const color = { ...rawColor };

    const normalizeSizes = (sizes: any[] | undefined) => {
      if (!Array.isArray(sizes)) {
        return [];
      }

      let sizeChanged = false;
      const nextSizes = sizes.map((rawSize) => {
        const sizeCandidates = [
          rawSize?.id,
          rawSize?.size_id,
          rawSize?.sizeId
        ].filter(Boolean);

        if (!sizeId || !sizeCandidates.includes(sizeId)) {
          return rawSize;
        }

        sizeChanged = true;
        const size = { ...rawSize };
        const currentQty = Number(size?.quantity ?? 0);
        const nextQty = Math.max(0, currentQty + signedDelta);
        size.quantity = nextQty;

        if (typeof size?.remaining_quantity !== 'undefined') {
          size.remaining_quantity = nextQty;
        }

        return size;
      });

      if (sizeChanged && nextSizes.length > 0) {
        const totalSizeQuantity = nextSizes.reduce((sum, size) => {
          return sum + Math.max(0, Number(size?.quantity ?? 0));
        }, 0);

        color.quantity = totalSizeQuantity;
      }

      return nextSizes;
    };

    const updatedProductSizes = normalizeSizes(color.product_sizes);
    if (updatedProductSizes.length > 0) {
      color.product_sizes = updatedProductSizes;
    }

    const updatedSizes = normalizeSizes(color.sizes);
    if (updatedSizes.length > 0) {
      color.sizes = updatedSizes;
    }

    if (!sizeId) {
      const currentColorQty = Number(color?.quantity ?? 0);
      const nextColorQty = Math.max(0, currentColorQty + signedDelta);
      color.quantity = nextColorQty;
    }

    return color;
  });

  return hasChanges ? updatedColors : undefined;
};

export const updateProductStock = async (
  organizationId: string, 
  productId: string, 
  quantity: number, 
  isReduction: boolean = true,
  options?: VariantUpdateOptions
): Promise<LocalProduct | null> => {
  try {
    const product = await getProductById(organizationId, productId);
    
    if (!product) {
      throw new Error(`لم يتم العثور على المنتج بالمعرف: ${productId}`);
    }
    
    const now = new Date().toISOString();
    const safeQuantity = Math.abs(quantity);
    const signedDelta = isReduction ? -safeQuantity : safeQuantity;

    const currentNumericStock = Number(
      (product as any)?.actual_stock_quantity ??
      product.stock_quantity ??
      (product as any)?.stockQuantity ??
      0
    );

    const baseStockAfterChange = Math.max(0, currentNumericStock + signedDelta);

    const variantOptions = options || {};
    const colorId = variantOptions.colorId ?? null;
    const sizeId = variantOptions.sizeId ?? null;

    const updates: Partial<LocalProduct> & {
      product_colors?: any[];
      colors?: any[];
    } = {
      stock_quantity: baseStockAfterChange,
      stockQuantity: baseStockAfterChange,
      actual_stock_quantity: baseStockAfterChange,
      last_inventory_update: now
    };

    const updatedProductColors = applyVariantQuantityUpdate(
      (product as any).product_colors,
      signedDelta,
      colorId,
      sizeId
    );

    if (updatedProductColors) {
      updates.product_colors = updatedProductColors;
      const recalculatedStock = calculateVariantStock(updatedProductColors);
      if (recalculatedStock > 0) {
        updates.stock_quantity = recalculatedStock;
        updates.stockQuantity = recalculatedStock;
        updates.actual_stock_quantity = recalculatedStock;
      }
    }

    const updatedColors = applyVariantQuantityUpdate(
      (product as any).colors,
      signedDelta,
      colorId,
      sizeId
    );

    if (updatedColors) {
      updates.colors = updatedColors;
      if (!updatedProductColors) {
        const recalculatedStock = calculateVariantStock(updatedColors);
        if (recalculatedStock > 0) {
          updates.stock_quantity = recalculatedStock;
          updates.stockQuantity = recalculatedStock;
          updates.actual_stock_quantity = recalculatedStock;
        }
      }
    }

    if (!updatedProductColors && !updatedColors && colorId) {
      // إذا لم نجد المتغير المحدد، تأكد من عدم تغيير المخزون الأساسي بالعلامة الخاطئة
      updates.stock_quantity = Math.max(0, product.stock_quantity + signedDelta);
      updates.stockQuantity = updates.stock_quantity;
      updates.actual_stock_quantity = updates.stock_quantity;
    }

    let updatedProduct: LocalProduct | null = await updateLocalProduct(productId, updates as any);

    // محاولة المزامنة إذا كان متصلاً
    if (isOnline()) {
      try {
        await synchronizeWithServer();
      } catch (error) {
      }
    }
    
    return updatedProduct;
  } catch (error) {
    throw error;
  }
};

// تحديث حالة المزامنة اليدوية
export const forceSynchronization = async (): Promise<boolean> => {
  try {
    if (!isOnline()) {
      throw new Error('لا يمكن المزامنة لأن الجهاز غير متصل بالإنترنت');
    }
    
    return await synchronizeWithServer();
  } catch (error) {
    throw error;
  }
};
