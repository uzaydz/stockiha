/**
 * offlineProductService - خدمة المنتجات المُوحدة (Offline-First)
 *
 * ⚡ تم التحديث لاستخدام Delta Sync بالكامل
 *
 * - Local-First: الكتابة محلياً فوراً
 * - Offline-First: يعمل بدون إنترنت
 * - تستخدم deltaWriteService بدلاً من inventoryDB مباشرة
 */

import {
  createLocalProduct,
  updateLocalProduct,
  deleteLocalProduct
} from './localProductService';
import { synchronizeWithServer, syncUnsyncedProducts } from './syncService';
import { Product } from './productService';
import { LocalProduct } from '@/database/localDb';
import { deltaWriteService } from '@/services/DeltaWriteService';
import { replaceProductInPOSCache, bumpProductStockInPOSCache } from '@/lib/cache/posCacheUpdater';

/**
 * تحليل حقول JSON من SQLite
 * ✅ تم إصلاح مشكلة الألوان: البحث في variants و product_colors و colors معاً
 * ⚠️ ملاحظة: RPC get_pos_products_optimized ترجع الألوان في حقل "variants"
 */
const parseJSONFields = (product: any): any => {
  const parseField = (value: any): any => {
    if (!value) return [];
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    return value;
  };

  // ✅ إصلاح شامل: البيانات قد تأتي من 3 مصادر مختلفة:
  // 1. "variants" - من RPC get_pos_products_optimized
  // 2. "product_colors" - من Supabase مباشرة مع JOIN
  // 3. "colors" - من البيانات المحلية القديمة
  const rawVariants = parseField(product.variants);
  const rawColors = parseField(product.colors);
  const rawProductColors = parseField(product.product_colors);

  // الأولوية: variants أولاً (من RPC)، ثم product_colors، ثم colors
  let colors: any[] = [];
  if (Array.isArray(rawVariants) && rawVariants.length > 0) {
    colors = rawVariants;
  } else if (Array.isArray(rawProductColors) && rawProductColors.length > 0) {
    colors = rawProductColors;
  } else if (Array.isArray(rawColors) && rawColors.length > 0) {
    colors = rawColors;
  }

  // نفس الشيء للمقاسات
  const rawSizes = parseField(product.sizes);
  const rawProductSizes = parseField(product.product_sizes);
  const sizes = (Array.isArray(rawProductSizes) && rawProductSizes.length > 0)
    ? rawProductSizes
    : rawSizes;

  return {
    ...product,
    images: parseField(product.images),
    colors: colors,
    product_colors: colors, // ✅ ضمان وجود كلا الحقلين للتوافق
    variants: colors, // ✅ ضمان وجود variants للتوافق مع POSDataContext
    sizes: sizes,
    product_sizes: sizes, // ✅ ضمان وجود كلا الحقلين للتوافق
    is_active: product.is_active === 1 || product.is_active === true,
    track_inventory: product.track_inventory === 1 || product.track_inventory === true,
    allow_backorder: product.allow_backorder === 1 || product.allow_backorder === true,
    synced: product.synced === 1 || product.synced === true,
  };
};

// التحقق من حالة الاتصال
const isOnline = (): boolean => navigator.onLine;

// الحصول على معرف المؤسسة
const getOrgId = (): string => {
  return (
    localStorage.getItem('currentOrganizationId') ||
    localStorage.getItem('bazaar_organization_id') ||
    ''
  );
};

// جدولة مزامنة خفيفة لتجنب الاستدعاءات المتكررة
let pendingSyncTimer: any = null;
const scheduleLightSync = () => {
  if (!isOnline()) return;
  if (pendingSyncTimer) return; // دمج الاستدعاءات المتقاربة
  pendingSyncTimer = setTimeout(async () => {
    pendingSyncTimer = null;
    try {
      // مزامنة المنتجات فقط لتقليل عدد الاستدعاءات
      await syncUnsyncedProducts();
    } catch {}
  }, 1500);
};

// جلب المنتجات - تجمع بين المحلي والبعيد
export const getProducts = async (organizationId: string): Promise<LocalProduct[]> => {
  try {
    // محاولة مزامنة أولاً إذا كان متصلاً
    if (isOnline()) {
      try {
        await synchronizeWithServer(organizationId);
      } catch (error) {
        // تجاهل أخطاء المزامنة
      }
    }

    // ⚡ استخدام Delta Sync بدلاً من inventoryDB مباشرة
    console.log('[offlineProductService] 🗄️ Using Delta Sync for products...');
    const products = await deltaWriteService.getAll<LocalProduct>('products', organizationId, {
      where: 'is_active = 1 OR is_active = true'
    });

    // ⚡ جلب الألوان والمقاسات من جداولها المنفصلة
    const productIds = products.map(p => p.id);
    console.log('[offlineProductService] 🔍 DEBUG: Loading colors/sizes for', productIds.length, 'products');

    let colorsMap: Map<string, any[]> = new Map();
    let sizesMap: Map<string, any[]> = new Map();

    if (productIds.length > 0) {
      try {
        // جلب الألوان
        const allColors = await deltaWriteService.query<any>(
          'product_colors',
          `SELECT * FROM product_colors WHERE product_id IN (${productIds.map(() => '?').join(',')})`
        , productIds);

        console.log('[offlineProductService] 🎨 DEBUG: Loaded', allColors?.length || 0, 'colors from SQLite');

        // جلب المقاسات
        const allSizes = await deltaWriteService.query<any>(
          'product_sizes',
          `SELECT * FROM product_sizes WHERE product_id IN (${productIds.map(() => '?').join(',')})`
        , productIds);

        console.log('[offlineProductService] 📏 DEBUG: Loaded', allSizes?.length || 0, 'sizes from SQLite');

        // تجميع الألوان حسب product_id
        for (const color of allColors || []) {
          if (!colorsMap.has(color.product_id)) {
            colorsMap.set(color.product_id, []);
          }
          colorsMap.get(color.product_id)!.push(color);
        }

        // تجميع المقاسات حسب color_id
        for (const size of allSizes || []) {
          if (!sizesMap.has(size.color_id)) {
            sizesMap.set(size.color_id, []);
          }
          sizesMap.get(size.color_id)!.push(size);
        }

        // ربط المقاسات بالألوان
        for (const [productId, colors] of colorsMap) {
          for (const color of colors) {
            color.sizes = sizesMap.get(color.id) || [];
            color.product_sizes = color.sizes; // للتوافق
          }
        }
      } catch (error) {
        console.warn('[offlineProductService] ⚠️ Error loading colors/sizes:', error);
      }
    }

    // تحليل حقول JSON وإضافة الألوان والمقاسات
    const parsedProducts = products.map(product => {
      const parsed = parseJSONFields(product);

      // ⚡ إذا لم تكن هناك ألوان من JSON، استخدم من الجداول المنفصلة
      const colorsFromTable = colorsMap.get(product.id) || [];
      if ((!parsed.colors || parsed.colors.length === 0) && colorsFromTable.length > 0) {
        parsed.colors = colorsFromTable;
        parsed.product_colors = colorsFromTable;
        parsed.variants = colorsFromTable;
      }

      return parsed;
    });

    console.log('[offlineProductService] ✅ Delta Sync:', {
      count: parsedProducts.length,
      sampleHasColors: parsedProducts[0]?.colors?.length > 0,
      sampleColorsCount: parsedProducts[0]?.colors?.length || 0,
      totalColorsLoaded: Array.from(colorsMap.values()).flat().length,
      totalSizesLoaded: Array.from(sizesMap.values()).flat().length
    });

    return parsedProducts as LocalProduct[];
  } catch (error) {
    console.error('[offlineProductService] ❌ Error:', error);
    throw error;
  }
};

// جلب منتج واحد بواسطة المعرف
export const getProductById = async (organizationId: string, productId: string): Promise<LocalProduct | null> => {
  try {
    // ⚡ استخدام Delta Sync
    const product = await deltaWriteService.get<LocalProduct>('products', productId);
    if (product && product.organization_id === organizationId) {
      return parseJSONFields(product) as LocalProduct;
    }
    return null;
  } catch (error) {
    console.error('[offlineProductService] ❌ getProductById error:', error);
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

    // مزامنة خفيفة مجدولة (تجنب ضغط الشبكة)
    scheduleLightSync();

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

    // مزامنة خفيفة مجدولة (تجنب ضغط الشبكة)
    scheduleLightSync();

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
        await synchronizeWithServer(organizationId);
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

/**
 * ✅ دالة مساعدة لتحويل JSON string إلى array بشكل آمن
 */
const parseSizesArray = (value: any): any[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // ignore parse errors
    }
  }
  return [];
};

const calculateVariantStock = (colorsSource: any[] | string | undefined): number => {
  // ✅ إصلاح: تحويل JSON string إلى array إذا لزم الأمر
  let colors: any[] = [];
  if (Array.isArray(colorsSource)) {
    colors = colorsSource;
  } else if (typeof colorsSource === 'string' && colorsSource.trim()) {
    try {
      const parsed = JSON.parse(colorsSource);
      if (Array.isArray(parsed)) colors = parsed;
    } catch {
      return 0;
    }
  }

  if (colors.length === 0) {
    return 0;
  }

  return colors.reduce((sum, color) => {
    const baseQuantity = Number(color?.quantity ?? 0);
    // ✅ إصلاح: استخدام parseSizesArray للتعامل مع JSON strings
    const rawSizes = parseSizesArray(color?.product_sizes).length > 0
      ? parseSizesArray(color?.product_sizes)
      : parseSizesArray(color?.sizes);

    if (rawSizes.length === 0) {
      return sum + Math.max(0, baseQuantity);
    }

    const sizesTotal = rawSizes.reduce((sizesSum: number, size: any) => {
      return sizesSum + Math.max(0, Number(size?.quantity ?? 0));
    }, 0);

    return sum + sizesTotal;
  }, 0);
};

/**
 * ✅ دالة مساعدة لتحويل JSON string إلى array
 * تعالج البيانات من SQLite التي قد تكون كـ JSON strings
 */
const parseColorsArray = (value: any): any[] | null => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch (error) {
      console.warn('[offlineProductService] Failed to parse colors JSON:', error);
    }
  }
  return null;
};

const applyVariantQuantityUpdate = (
  colorsSource: any[] | string | undefined,
  signedDelta: number,
  colorId?: string | null,
  sizeId?: string | null
): any[] | undefined => {
  // ✅ إصلاح: تحويل JSON string إلى array إذا لزم الأمر
  const colors = parseColorsArray(colorsSource);
  if (!colors || !colorId) {
    return undefined;
  }

  let hasChanges = false;
  const updatedColors = colors.map((rawColor) => {
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

    const normalizeSizes = (sizesSource: any[] | string | undefined) => {
      // ✅ إصلاح: تحويل JSON string إلى array إذا لزم الأمر
      let sizes: any[] = [];
      if (Array.isArray(sizesSource)) {
        sizes = sizesSource;
      } else if (typeof sizesSource === 'string' && sizesSource.trim()) {
        try {
          const parsed = JSON.parse(sizesSource);
          if (Array.isArray(parsed)) sizes = parsed;
        } catch {
          // ignore parse errors
        }
      }

      if (sizes.length === 0) {
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
  options?: VariantUpdateOptions & { skipSync?: boolean }
): Promise<LocalProduct | null> => {
  try {
    const product = await getProductById(organizationId, productId);

    if (!product) {
      throw new Error(`لم يتم العثور على المنتج بالمعرف: ${productId}`);
    }

    const now = new Date().toISOString();
    const safeQuantity = Math.abs(quantity);
    const signedDelta = isReduction ? -safeQuantity : safeQuantity;

    const currentNumericStock = Math.max(
      Number((product as any)?.actual_stock_quantity ?? 0) || 0,
      Number((product as any)?.stock_quantity ?? 0) || 0,
      Number((product as any)?.stockQuantity ?? 0) || 0
    );

    const baseStockAfterChange = Math.max(0, currentNumericStock + signedDelta);

    const variantOptions = options || {};
    const colorId = variantOptions.colorId ?? null;
    const sizeId = variantOptions.sizeId ?? null;

    // ✅ زيادة إصدار المخزون للكشف عن التعارضات
    const currentVersion = Number((product as any)?.stock_version ?? 0) || 0;
    const newVersion = currentVersion + 1;

    const updates: Partial<LocalProduct> & {
      product_colors?: any[];
      colors?: any[];
      stock_version?: number;
    } = {
      stock_quantity: baseStockAfterChange,
      stockQuantity: baseStockAfterChange,
      actual_stock_quantity: baseStockAfterChange,
      last_inventory_update: now,
      stock_version: newVersion
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

    // تحديث الكاش فوراً بدون انتظار أي مزامنة/إعادة جلب
    if (updatedProduct) {
      replaceProductInPOSCache(updatedProduct as any);
    } else {
      bumpProductStockInPOSCache(productId, signedDelta);
    }

    // مزامنة خفيفة مجدولة لتقليل عدد الاستدعاءات
    if (!options?.skipSync) {
      scheduleLightSync();
    }

    return updatedProduct;
  } catch (error) {
    throw error;
  }
};

// الحصول على كمية المتغير (لون/مقاس) الحالية
// ✅ تم إصلاح: التعامل مع JSON strings من SQLite
const getCurrentVariantQuantity = (product: any, colorId?: string | null, sizeId?: string | null): number => {
  // ✅ إصلاح: تحويل JSON string إلى array إذا لزم الأمر
  const rawColors = product?.colors || product?.product_colors;
  const colors = parseSizesArray(rawColors);

  if (!colorId) {
    const a = Number(product?.actual_stock_quantity ?? 0) || 0;
    const b = Number(product?.stock_quantity ?? 0) || 0;
    const c = Number(product?.stockQuantity ?? 0) || 0;
    return Math.max(a, b, c);
  }
  const color = colors.find((c: any) => c?.id === colorId);
  if (!color) return 0;
  if (sizeId) {
    // ✅ إصلاح: تحويل sizes من JSON string إلى array
    const sizes = parseSizesArray(color?.sizes || color?.product_sizes);
    const size = sizes.find((s: any) => s?.id === sizeId);
    return Number(size?.quantity ?? 0) || 0;
  }
  const hasSizes = Boolean(color?.has_sizes);
  if (hasSizes) {
    // ✅ إصلاح: تحويل sizes من JSON string إلى array
    const sizes = parseSizesArray(color?.sizes || color?.product_sizes);
    if (sizes.length === 0) return 0;
    return sizes.reduce((sum: number, s: any) => sum + (Number(s?.quantity ?? 0) || 0), 0);
  }
  return Number(color?.quantity ?? 0) || 0;
};

export const setProductStockAbsolute = async (
  organizationId: string,
  productId: string,
  newQuantity: number,
  options?: VariantUpdateOptions
): Promise<LocalProduct | null> => {
  try {
    const product = await getProductById(organizationId, productId);
    if (!product) {
      throw new Error(`لم يتم العثور على المنتج بالمعرف: ${productId}`);
    }

    const colorId = options?.colorId ?? null;
    const sizeId = options?.sizeId ?? null;

    const currentQty = getCurrentVariantQuantity(product as any, colorId, sizeId);
    const delta = Number(newQuantity) - Number(currentQty);
    if (delta === 0) {
      // تحديث الكاش أيضاً لضمان التزامن الفوري
      replaceProductInPOSCache(product as any);
      return product; // لا تغيير
    }

    const isReduction = delta < 0;
    const absDelta = Math.abs(delta);
    const res = await updateProductStock(organizationId, productId, absDelta, isReduction, { colorId, sizeId });
    if (res) replaceProductInPOSCache(res as any);
    return res;
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

    const orgId = getOrgId();
    if (!orgId) {
      throw new Error('Organization ID is required for synchronization');
    }

    await synchronizeWithServer(orgId);
    return true;
  } catch (error) {
    throw error;
  }
};
