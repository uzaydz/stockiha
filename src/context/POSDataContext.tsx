/**
 * 🎯 POSDataContext - PowerSync Version
 * نسخة محدثة تستخدم PowerSync بدلاً من النظام القديم
 */

import React, { createContext, useContext, useCallback, useMemo, ReactNode, useEffect, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useTenant } from './TenantContext';
import { useAuth } from './AuthContext';
import { usePowerSync } from '@/hooks/powersync/usePowerSync';
import { usePowerSyncQuery } from '@/hooks/powersync/usePowerSyncQuery';
import { usePowerSyncStatus } from '@/hooks/powersync/usePowerSyncStatus';
import type { LocalProduct, LocalCustomer } from '@/database/localDb';
import { getLocalCategories } from '@/lib/api/categories';

// =================================================================
// 🔹 INTERFACES
// =================================================================

interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  organization_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ProductColor {
  id: string;
  product_id: string;
  name: string;
  color_code: string;
  image_url?: string;
  quantity: number;
  price?: number;
  barcode?: string;
  is_default: boolean;
  has_sizes: boolean;
  variant_number?: number;
  purchase_price?: number;
  sizes?: ProductSize[];
}

interface ProductSize {
  id: string;
  color_id: string;
  product_id: string;
  size_name: string;
  quantity: number;
  price?: number;
  barcode?: string;
  is_default: boolean;
  purchase_price?: number;
}

interface SubscriptionService {
  id: string;
  name: string;
  description?: string;
  provider: string;
  organization_id: string;
  category_id?: string;
  logo_url?: string;
  purchase_price: number;
  selling_price: number;
  profit_margin?: number;
  profit_amount?: number;
  service_type: string;
  delivery_method: string;
  total_quantity: number;
  available_quantity: number;
  sold_quantity: number;
  reserved_quantity: number;
  status: string;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  category?: SubscriptionCategory;
  pricing_options?: any[];
}

interface SubscriptionCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color: string;
  is_active: boolean;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

interface POSProductWithVariants {
  id: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  sku: string;
  barcode?: string;
  category: any;
  category_id?: string;
  subcategory?: string;
  brand?: string;
  images: string[];
  thumbnail_image: string;
  thumbnailImage: string;
  stockQuantity: number;
  stock_quantity: number;
  features?: string[];
  specifications?: Record<string, any> | string;
  isDigital: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  createdAt: Date;
  updatedAt: Date;
  has_variants?: boolean;
  use_sizes?: boolean;
  compare_at_price?: number;
  purchase_price?: number;
  subcategory_id?: string;
  min_stock_level?: number;
  reorder_level?: number;
  reorder_quantity?: number;
  slug?: string;
  show_price_on_landing: boolean;
  last_inventory_update?: string;
  is_active: boolean;
  wholesale_price?: number;
  partial_wholesale_price?: number;
  min_wholesale_quantity?: number;
  min_partial_wholesale_quantity?: number;
  allow_retail: boolean;
  allow_wholesale: boolean;
  allow_partial_wholesale: boolean;
  colors?: ProductColor[];
  product_colors?: ProductColor[];
  thumbnail_base64?: string | null;
  images_base64?: string | null;
  actual_stock_quantity: number;
  total_variants_stock: number;
  low_stock_warning: boolean;
  has_fast_shipping: boolean;
  has_money_back: boolean;
  has_quality_guarantee: boolean;
  fast_shipping_text?: string;
  money_back_text?: string;
  quality_guarantee_text?: string;
  is_sold_by_unit: boolean;
  unit_type?: string;
  use_variant_prices: boolean;
  unit_purchase_price?: number;
  unit_sale_price?: number;
  shipping_clone_id?: number;
  name_for_shipping?: string;
  use_shipping_clone: boolean;
  shipping_method_type: string;
  created_by_user_id?: string;
  updated_by_user_id?: string;
  has_valid_barcodes: boolean;
}

interface POSDataContextType {
  // Products
  products: LocalProduct[];
  productsLoading: boolean;
  productsError: Error | null;

  // Categories
  categories: ProductCategory[];
  categoriesLoading: boolean;

  // Customers
  customers: LocalCustomer[];
  customersLoading: boolean;

  // Sync Status
  isOnline: boolean;
  isSyncing: boolean;
  pendingUploads: number;

  // Methods
  refreshProducts: () => Promise<void>;
  refreshCategories: () => Promise<void>;
  refreshCustomers: () => Promise<void>;
  updateProductStock: (productId: string, newQuantity: number) => Promise<void>;
  addProduct: (product: Partial<LocalProduct>) => Promise<void>;
  updateProduct: (productId: string, updates: Partial<LocalProduct>) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
}

const POSDataContext = createContext<POSDataContextType | undefined>(undefined);

// =================================================================
// 🔹 PROVIDER
// =================================================================

export function POSDataProvider({ children }: { children: ReactNode }) {
  const { currentOrganization } = useTenant();
  const organizationId = currentOrganization?.id;
  const { user } = useAuth();
  const { db, isReady, powerSyncService } = usePowerSync();
  const { isOnline, isSyncing, pendingUploads } = usePowerSyncStatus();
  const queryClient = useQueryClient();

  // =================================================================
  // 📊 PRODUCTS QUERY
  // =================================================================

  const {
    data: products = [],
    isLoading: productsLoading,
    error: productsError,
    refetch: refetchProducts,
  } = usePowerSyncQuery<LocalProduct>({
    queryKey: ['products', organizationId],
    sql: `
      SELECT * FROM products
      WHERE organization_id = ?
        AND is_active = 1
      ORDER BY name ASC
    `,
    params: [organizationId],
    enabled: !!organizationId && isReady,
  });

  // =================================================================
  // 📂 CATEGORIES QUERY
  // =================================================================

  const {
    data: categories = [],
    isLoading: categoriesLoading,
    refetch: refetchCategories,
  } = usePowerSyncQuery<ProductCategory>({
    queryKey: ['categories', organizationId],
    sql: `
      SELECT * FROM product_categories
      WHERE organization_id = ?
        AND is_active = 1
      ORDER BY name ASC
    `,
    params: [organizationId],
    enabled: !!organizationId && isReady,
  });

  // =================================================================
  // 👥 CUSTOMERS QUERY
  // =================================================================

  const {
    data: customers = [],
    isLoading: customersLoading,
    refetch: refetchCustomers,
  } = usePowerSyncQuery<LocalCustomer>({
    queryKey: ['customers', organizationId],
    sql: `
      SELECT * FROM customers
      WHERE organization_id = ?
        AND is_active = 1
      ORDER BY name ASC
    `,
    params: [organizationId],
    enabled: !!organizationId && isReady,
  });

  // =================================================================
  // 🔄 MUTATIONS
  // =================================================================

  /**
   * تحديث مخزون المنتج
   */
  const updateProductStockMutation = useMutation({
    mutationFn: async ({ productId, newQuantity }: { productId: string; newQuantity: number }) => {
      if (!db) throw new Error('PowerSync not initialized');

      await powerSyncService.transaction(async (tx) => {
        await tx.execute(
          `UPDATE products
           SET stock_quantity = ?,
               last_inventory_update = ?,
               updated_at = ?
           WHERE id = ?`,
          [newQuantity, new Date().toISOString(), new Date().toISOString(), productId]
        );
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', organizationId] });
    },
  });

  /**
   * إضافة منتج جديد
   */
  const addProductMutation = useMutation({
    mutationFn: async (product: Partial<LocalProduct>) => {
      if (!db) throw new Error('PowerSync not initialized');

      const newProduct = {
        id: crypto.randomUUID(),
        organization_id: organizationId,
        name: product.name || '',
        sku: product.sku || '',
        price: product.price || 0,
        purchase_price: product.purchase_price || 0,
        stock_quantity: product.stock_quantity || 0,
        is_active: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...product,
      };

      await powerSyncService.transaction(async (tx) => {
        const columns = Object.keys(newProduct);
        const values = Object.values(newProduct);
        const placeholders = columns.map(() => '?').join(', ');

        await tx.execute(
          `INSERT INTO products (${columns.join(', ')})
           VALUES (${placeholders})`,
          values
        );
      });

      return newProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', organizationId] });
    },
  });

  /**
   * تحديث منتج
   */
  const updateProductMutation = useMutation({
    mutationFn: async ({ productId, updates }: { productId: string; updates: Partial<LocalProduct> }) => {
      if (!db) throw new Error('PowerSync not initialized');

      const updatedFields = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      await powerSyncService.transaction(async (tx) => {
        const setClause = Object.keys(updatedFields)
          .map((key) => `${key} = ?`)
          .join(', ');
        const values = [...Object.values(updatedFields), productId];

        await tx.execute(
          `UPDATE products SET ${setClause} WHERE id = ?`,
          values
        );
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', organizationId] });
    },
  });

  /**
   * حذف منتج (soft delete)
   */
  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      if (!db) throw new Error('PowerSync not initialized');

      await powerSyncService.transaction(async (tx) => {
        await tx.execute(
          `UPDATE products SET is_active = 0, updated_at = ? WHERE id = ?`,
          [new Date().toISOString(), productId]
        );
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', organizationId] });
    },
  });

  // =================================================================
  // 🔹 CONTEXT VALUE
  // =================================================================

  const value: POSDataContextType = useMemo(
    () => ({
      // Products
      products,
      productsLoading,
      productsError: productsError as Error | null,

      // Categories
      categories,
      categoriesLoading,

      // Customers
      customers,
      customersLoading,

      // Sync Status
      isOnline,
      isSyncing,
      pendingUploads,

      // Methods
      refreshProducts: async () => {
        await refetchProducts();
      },
      refreshCategories: async () => {
        await refetchCategories();
      },
      refreshCustomers: async () => {
        await refetchCustomers();
      },
      updateProductStock: async (productId: string, newQuantity: number) => {
        await updateProductStockMutation.mutateAsync({ productId, newQuantity });
      },
      addProduct: async (product: Partial<LocalProduct>) => {
        await addProductMutation.mutateAsync(product);
      },
      updateProduct: async (productId: string, updates: Partial<LocalProduct>) => {
        await updateProductMutation.mutateAsync({ productId, updates });
      },
      deleteProduct: async (productId: string) => {
        await deleteProductMutation.mutateAsync(productId);
      },
    }),
    [
      products,
      productsLoading,
      productsError,
      categories,
      categoriesLoading,
      customers,
      customersLoading,
      isOnline,
      isSyncing,
      pendingUploads,
      organizationId,
    ]
  );

  return <POSDataContext.Provider value={value}>{children}</POSDataContext.Provider>;
}

// =================================================================
// 🔹 UTILITY FUNCTIONS
// =================================================================

export const arrayOrEmpty = <T,>(value: T[] | null | undefined): T[] =>
  Array.isArray(value) ? value : [];

/**
 * دالة مساعدة لتحويل JSON string إلى array أو إرجاع array كما هو
 * مهم جداً: البيانات من SQLite تأتي كـ JSON strings وليس arrays
 */
export const ensureArray = (value: unknown, fieldName?: string): unknown[] => {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
      console.warn(`[ensureArray] Parsed JSON is not an array${fieldName ? ` for field: ${fieldName}` : ''}:`, typeof parsed);
      return [];
    } catch (error) {
      console.warn(`[ensureArray] JSON parse error${fieldName ? ` for field: ${fieldName}` : ''}:`, value.slice(0, 100), error);
      return [];
    }
  }
  if (value !== '') {
    console.warn(`[ensureArray] Unexpected value type${fieldName ? ` for field: ${fieldName}` : ''}:`, typeof value);
  }
  return [];
};

/**
 * تحويل LocalProduct إلى POSProductWithVariants
 */
export const mapLocalProductToPOSProduct = (
  product: LocalProduct
): POSProductWithVariants => {
  let metadata: any = {};
  try {
    if (typeof (product as any).metadata === 'string') {
      metadata = JSON.parse((product as any).metadata);
    } else if (typeof (product as any).metadata === 'object') {
      metadata = (product as any).metadata || {};
    }
  } catch (e) {
    console.warn('Failed to parse product metadata:', e);
  }

  const parsedVariants = ensureArray((product as any).variants, 'variants');
  const parsedProductColors = ensureArray((product as any).product_colors, 'product_colors');
  const parsedColors = ensureArray((product as any).colors, 'colors');
  const metaVariants = ensureArray(metadata.variants, 'metadata.variants');
  const metaProductColors = ensureArray(metadata.product_colors, 'metadata.product_colors');
  const metaColors = ensureArray(metadata.colors, 'metadata.colors');

  const rawColors = parsedVariants.length > 0
    ? parsedVariants
    : parsedProductColors.length > 0
      ? parsedProductColors
      : parsedColors.length > 0
        ? parsedColors
        : metaVariants.length > 0
          ? metaVariants
          : metaProductColors.length > 0
            ? metaProductColors
            : metaColors;

  const processedColors: ProductColor[] = rawColors.map((color: any) => {
    const rawSizes = Array.isArray(color?.product_sizes)
      ? color.product_sizes
      : Array.isArray(color?.sizes)
        ? color.sizes
        : [];

    const processedSizes: ProductSize[] = rawSizes.map((size: any) => ({
      id: size?.id ?? `${product.id}-${color?.id ?? 'variant'}-${size?.size_name ?? 'size'}`,
      color_id: color?.id ?? color?.color_id ?? product.id,
      product_id: product.id,
      size_name: size?.size_name ?? size?.name ?? '',
      quantity: Number(size?.quantity ?? 0),
      price: size?.price,
      barcode: size?.barcode ?? undefined,
      is_default: Boolean(size?.is_default),
      purchase_price: size?.purchase_price
    }));

    return {
      id: color?.id ?? color?.color_id ?? `${product.id}-color`,
      product_id: color?.product_id ?? product.id,
      name: color?.name ?? color?.color_name ?? 'لون',
      color_code: color?.color_code ?? '#000000',
      image_url: color?.image_url,
      quantity: Number(color?.quantity ?? 0),
      price: color?.price,
      barcode: color?.barcode ?? undefined,
      is_default: Boolean(color?.is_default),
      has_sizes: Boolean(color?.has_sizes) || processedSizes.length > 0,
      variant_number: color?.variant_number,
      purchase_price: color?.purchase_price,
      sizes: processedSizes
    };
  });

  const variantsStock = processedColors.reduce((sum, color) => {
    const sizesTotal = (color.sizes || []).reduce((sizeSum, size) => sizeSum + Number(size.quantity ?? 0), 0);
    const colorTotal = color.has_sizes ? sizesTotal : Number(color.quantity ?? 0);
    return sum + colorTotal;
  }, 0);

  const stockQuantity = Number(product.stock_quantity ?? 0);
  const resolvedStock = variantsStock > 0 ? variantsStock : stockQuantity;
  const images = arrayOrEmpty((product as any).images) as string[];

  const localThumbnail = (product as any).thumbnail_base64;
  const thumbnail = (
    localThumbnail ||
    product.thumbnail_image ||
    (product as any).image_url ||
    (product as any).image_thumbnail ||
    images[0] ||
    ''
  ) as string;

  return {
    id: product.id,
    name: product.name,
    description: product.description ?? '',
    price: Number(product.price ?? 0),
    compareAtPrice: (product as any).compare_at_price ?? undefined,
    sku: product.sku ?? '',
    barcode: product.barcode ?? undefined,
    category: (product as any).category ?? 'أخرى',
    category_id: product.category_id,
    subcategory: (product as any).subcategory ?? undefined,
    subcategory_id: product.subcategory_id,
    brand: product.brand ?? undefined,
    images,
    thumbnail_image: thumbnail,
    thumbnailImage: thumbnail,
    thumbnail_base64: localThumbnail || null,
    images_base64: (product as any).images_base64 || null,
    stockQuantity: resolvedStock,
    stock_quantity: resolvedStock,
    features: arrayOrEmpty((product as any).features),
    specifications: typeof (product as any).specifications === 'object' && (product as any).specifications !== null
      ? (product as any).specifications
      : {},
    isDigital: Boolean(product.is_digital),
    isNew: (product as any).is_new,
    isFeatured: (product as any).is_featured,
    createdAt: new Date(product.created_at),
    updatedAt: new Date(product.updated_at || product.created_at),
    has_variants: Boolean((product as any).has_variants) || processedColors.length > 0,
    use_sizes: Boolean((product as any).use_sizes),
    compare_at_price: (product as any).compare_at_price,
    purchase_price: product.purchase_price,
    min_stock_level: product.min_stock_level,
    reorder_level: (product as any).reorder_level,
    reorder_quantity: (product as any).reorder_quantity,
    slug: (product as any).slug,
    show_price_on_landing: (product as any).show_price_on_landing !== false,
    last_inventory_update: (product as any).last_inventory_update,
    is_active: product.is_active !== false,
    wholesale_price: product.wholesale_price,
    partial_wholesale_price: product.partial_wholesale_price,
    min_wholesale_quantity: product.min_wholesale_quantity,
    min_partial_wholesale_quantity: product.min_partial_wholesale_quantity,
    allow_retail: product.allow_retail !== false,
    allow_wholesale: product.allow_wholesale !== false,
    allow_partial_wholesale: product.allow_partial_wholesale !== false,
    colors: processedColors,
    product_colors: processedColors,
    actual_stock_quantity: resolvedStock,
    total_variants_stock: variantsStock,
    low_stock_warning: resolvedStock <= (product.min_stock_level ?? 5),
    has_fast_shipping: Boolean((product as any).has_fast_shipping),
    has_money_back: Boolean((product as any).has_money_back),
    has_quality_guarantee: Boolean((product as any).has_quality_guarantee),
    fast_shipping_text: (product as any).fast_shipping_text,
    money_back_text: (product as any).money_back_text,
    quality_guarantee_text: (product as any).quality_guarantee_text,
    is_sold_by_unit: Boolean((product as any).is_sold_by_unit),
    unit_type: (product as any).unit_type,
    use_variant_prices: Boolean((product as any).use_variant_prices),
    unit_purchase_price: (product as any).unit_purchase_price,
    unit_sale_price: (product as any).unit_sale_price,
    shipping_clone_id: (product as any).shipping_clone_id,
    name_for_shipping: (product as any).name_for_shipping,
    use_shipping_clone: Boolean((product as any).use_shipping_clone),
    shipping_method_type: (product as any).shipping_method_type ?? 'normal',
    created_by_user_id: (product as any).created_by_user_id,
    updated_by_user_id: (product as any).updated_by_user_id,
    has_valid_barcodes:
      Boolean(product.barcode?.trim?.()) ||
      processedColors.some((color) =>
        Boolean(color.barcode) || (color.sizes || []).some((size) => Boolean(size.barcode))
      ),
    // ⚡ حقول البيع بالوزن
    sell_by_weight: Boolean((product as any).sell_by_weight),
    enable_weight_based_sale: Boolean((product as any).sell_by_weight || (product as any).enable_weight_based_sale),
    weight_unit: (product as any).weight_unit ?? 'kg',
    price_per_weight_unit: Number((product as any).price_per_weight_unit ?? 0),
    purchase_price_per_weight_unit: Number((product as any).purchase_price_per_weight_unit ?? 0),
    min_weight_per_sale: Number((product as any).min_weight_per_sale ?? 0),
    max_weight_per_sale: Number((product as any).max_weight_per_sale ?? 0),
    average_item_weight: Number((product as any).average_item_weight ?? 0),
    available_weight: Number((product as any).available_weight ?? 0),
    // ⚡ حقول البيع بالمتر/الطول
    sell_by_meter: Boolean((product as any).sell_by_meter),
    enable_meter_based_sale: Boolean((product as any).sell_by_meter || (product as any).enable_meter_based_sale),
    meter_unit: (product as any).meter_unit ?? 'm',
    price_per_meter: Number((product as any).price_per_meter ?? 0),
    purchase_price_per_meter: Number((product as any).purchase_price_per_meter ?? 0),
    min_meters_per_sale: Number((product as any).min_meters_per_sale ?? 0),
    roll_length_meters: Number((product as any).roll_length_meters ?? 0),
    available_length: Number((product as any).available_length ?? 0),
    // ⚡ حقول البيع بالعلبة/الكرتون
    sell_by_box: Boolean((product as any).sell_by_box),
    enable_carton_sale: Boolean((product as any).sell_by_box || (product as any).enable_carton_sale),
    units_per_box: Number((product as any).units_per_box ?? 0),
    box_price: Number((product as any).box_price ?? 0),
    box_purchase_price: Number((product as any).box_purchase_price ?? 0),
    box_barcode: (product as any).box_barcode ?? undefined,
    allow_single_unit_sale: Boolean((product as any).allow_single_unit_sale),
    available_boxes: Number((product as any).available_boxes ?? 0),
    // ⚡ حقل نوع وحدة البيع الرئيسي - مهم جداً للإرجاع والسلة
    // ⚠️ ملاحظة: SQLite يخزن القيم كـ 0/1 أو true/false أو '0'/'1'
    selling_unit_type: (() => {
      // أولاً: تحقق من وجود selling_unit_type مباشرة
      if ((product as any).selling_unit_type) return (product as any).selling_unit_type;
      // ثانياً: تحقق من الخصائص البديلة (مع دعم 0/1 و true/false و '0'/'1')
      const sellByMeter = (product as any).sell_by_meter;
      const sellByWeight = (product as any).sell_by_weight;
      const sellByBox = (product as any).sell_by_box;
      if (sellByMeter === true || sellByMeter === 1 || sellByMeter === '1') return 'meter';
      if (sellByWeight === true || sellByWeight === 1 || sellByWeight === '1') return 'weight';
      if (sellByBox === true || sellByBox === 1 || sellByBox === '1') return 'box';
      return 'piece';
    })(),
    sellingUnit: (() => {
      if ((product as any).selling_unit_type) return (product as any).selling_unit_type;
      const sellByMeter = (product as any).sell_by_meter;
      const sellByWeight = (product as any).sell_by_weight;
      const sellByBox = (product as any).sell_by_box;
      if (sellByMeter === true || sellByMeter === 1 || sellByMeter === '1') return 'meter';
      if (sellByWeight === true || sellByWeight === 1 || sellByWeight === '1') return 'weight';
      if (sellByBox === true || sellByBox === 1 || sellByBox === '1') return 'box';
      return 'piece';
    })()
  };
};

/**
 * تحويل LocalOrganizationSubscription إلى SubscriptionService
 */
export const mapLocalSubscriptionToService = (
  subscription: any
): SubscriptionService => {
  const amount = Number((subscription as any).amount ?? 0);
  const derivedName = (subscription as any).name ?? (subscription as any).plan_name ?? 'خدمة اشتراك';
  return {
    id: subscription.id,
    name: derivedName,
    description: (subscription as any).description ?? '',
    provider: (subscription as any).provider ?? 'offline',
    organization_id: subscription.organization_id,
    category_id: (subscription as any).category_id,
    category: (subscription as any).category,
    logo_url: (subscription as any).logo_url,
    purchase_price: Number((subscription as any).purchase_price ?? amount),
    selling_price: Number((subscription as any).selling_price ?? amount),
    profit_margin: (subscription as any).profit_margin,
    profit_amount: (subscription as any).profit_amount,
    service_type: (subscription as any).service_type ?? 'subscription',
    delivery_method: (subscription as any).delivery_method ?? 'instant',
    total_quantity: Number((subscription as any).total_quantity ?? 0),
    available_quantity: Number((subscription as any).available_quantity ?? 0),
    sold_quantity: Number((subscription as any).sold_quantity ?? 0),
    reserved_quantity: Number((subscription as any).reserved_quantity ?? 0),
    status: subscription.status ?? 'active',
    is_active: (subscription.status ?? '').toLowerCase() !== 'cancelled',
    is_featured: Boolean((subscription as any).is_featured),
    created_at: subscription.created_at ?? new Date().toISOString(),
    updated_at: subscription.updated_at ?? subscription.created_at ?? new Date().toISOString(),
    pricing_options: arrayOrEmpty((subscription as any).pricing_options)
  };
};

/**
 * تحويل ProductCategory إلى SubscriptionCategory
 */
export const mapLocalCategoryToSubscriptionCategory = (
  category: Awaited<ReturnType<typeof getLocalCategories>>[number]
): SubscriptionCategory => ({
  id: category.id,
  name: category.name,
  description: category.description,
  icon: category.icon ?? undefined,
  color: (category as any)?.color ?? '#3B82F6',
  organization_id: category.organization_id,
  is_active: category.is_active !== false,
  created_at: category.created_at ?? new Date().toISOString(),
  updated_at: category.updated_at ?? category.created_at ?? new Date().toISOString()
});

// =================================================================
// 🔹 HOOK
// =================================================================

export function usePOSData() {
  const context = useContext(POSDataContext);
  if (!context) {
    throw new Error('usePOSData must be used within POSDataProvider');
  }
  return context;
}
