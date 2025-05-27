import { supabase } from '@/lib/supabase';
import type { Product } from '@/types';
import type { InventoryLog, InventoryLogType } from '@/types';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';
import * as inventoryDB from '@/lib/db/inventoryDB';
import { toast } from 'sonner';

// Get all product categories
export const getProductCategories = async (): Promise<string[]> => {
  const { data, error } = await supabase
    .from('products')
    .select('category');

  if (error) {
    throw error;
  }

  // Extract unique categories
  const categories = [...new Set(data.map(item => item.category))];
  return categories;
};

// Get products with inventory information
export const getInventoryProducts = async (page = 1, limit = 50): Promise<{
  products: Product[],
  totalCount: number
}> => {
  // الحصول على معلومات المستخدم الحالي
  const userInfo = await supabase.auth.getUser();
  const userId = userInfo.data.user?.id;
  
  if (!userId) {
    throw new Error('المستخدم غير مسجل الدخول');
  }
  
  // البحث عن معرف المؤسسة الخاصة بالمستخدم
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', userId)
    .single();
    
  if (userError && userError.code !== 'PGRST116') {
    throw userError;
  }
  
  // استخدام معرف المؤسسة لجلب المنتجات الخاصة بها فقط
  const organizationId = userData?.organization_id;
  
  // تحسين الاستعلام لاستخدام التضمين بدلاً من استعلامات متعددة
  const start = (page - 1) * limit;
  const end = start + limit - 1;
  
  let query = supabase
    .from('products')
    .select(`
      *,
      product_colors (
        *,
        product_sizes (*)
      )
    `, { count: 'exact' });
  
  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }
  
  // إضافة التجزئة للاستعلام
  query = query.order('name').range(start, end);
  
  const { data: productsData, error, count } = await query;

  if (error) {
    throw error;
  }
  
  // تحضير قائمة المنتجات النهائية باستخدام وظيفة التحويل الموحدة
  const products: Product[] = productsData.map(product => mapProductFromDatabase(product));

  return {
    products,
    totalCount: count || products.length
  };
};

// وظيفة موحدة لتحويل بيانات المنتج من قاعدة البيانات إلى نموذج المنتج
export function mapProductFromDatabase(dbProduct: any): Product {
  // استخراج الألوان والمقاسات من البيانات المضمنة
  const colors = dbProduct.product_colors ? dbProduct.product_colors.map((color: any) => {
    const sizes = color.product_sizes ? color.product_sizes.map((size: any) => ({
      id: size.id,
      color_id: size.color_id,
      product_id: size.product_id,
      size_name: size.size_name,
      quantity: size.quantity,
      price: size.price,
      barcode: size.barcode || null,
      is_default: size.is_default
    })) : [];
    
    return {
      id: color.id,
      name: color.name,
      color_code: color.color_code,
      image_url: color.image_url,
      quantity: color.quantity || 0,
      price: color.price,
      is_default: color.is_default,
      barcode: color.barcode || null,
      has_sizes: color.has_sizes || false,
      sizes: sizes
    };
  }) : [];
  
  return {
    id: dbProduct.id,
    name: dbProduct.name,
    description: dbProduct.description || '',
    price: dbProduct.price,
    compareAtPrice: dbProduct.compare_at_price || undefined,
    sku: dbProduct.sku,
    barcode: dbProduct.barcode || undefined,
    category: dbProduct.category,
    subcategory: dbProduct.subcategory || undefined,
    brand: dbProduct.brand || undefined,
    images: dbProduct.images || [],
    thumbnailImage: dbProduct.thumbnail_image || '',
    stockQuantity: dbProduct.stock_quantity,
    stock_quantity: dbProduct.stock_quantity,
    min_stock_level: dbProduct.min_stock_level || 5,
    reorder_level: dbProduct.reorder_level || 10,
    reorder_quantity: dbProduct.reorder_quantity || 20,
    features: dbProduct.features || undefined,
    specifications: dbProduct.specifications || {},
    isDigital: dbProduct.is_digital,
    isNew: dbProduct.is_new || undefined,
    isFeatured: dbProduct.is_featured || undefined,
    createdAt: new Date(dbProduct.created_at),
    updatedAt: new Date(dbProduct.updated_at),
    colors: colors,
    has_variants: dbProduct.has_variants || false,
    use_sizes: dbProduct.use_sizes || false,
    synced: true // بشكل افتراضي العناصر المستردة من الخادم تعتبر متزامنة
  };
}

// Filter products by inventory status
export interface InventoryFilters {
  searchQuery?: string;
  category?: string;
  stockFilter?: 'all' | 'in-stock' | 'low-stock' | 'out-of-stock';
  sortBy?: 'name-asc' | 'name-desc' | 'stock-asc' | 'stock-desc';
}

export const filterInventoryProducts = (products: Product[], filters: InventoryFilters): Product[] => {
  let filteredProducts = [...products];

  // Apply search filter
  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    filteredProducts = filteredProducts.filter(product => 
      product.name.toLowerCase().includes(query) || 
      product.sku.toLowerCase().includes(query) ||
      (product.barcode && product.barcode.toLowerCase().includes(query))
    );
  }

  // Apply category filter
  if (filters.category && filters.category !== 'all') {
    filteredProducts = filteredProducts.filter(product => 
      product.category === filters.category
    );
  }

  // Apply stock filter
  if (filters.stockFilter) {
    switch (filters.stockFilter) {
      case 'in-stock':
        filteredProducts = filteredProducts.filter(product => product.stock_quantity > 5);
        break;
      case 'low-stock':
        filteredProducts = filteredProducts.filter(product => 
          product.stock_quantity > 0 && product.stock_quantity <= 5
        );
        break;
      case 'out-of-stock':
        filteredProducts = filteredProducts.filter(product => product.stock_quantity <= 0);
        break;
      default:
        // 'all' - no filtering needed
        break;
    }
  }

  // Apply sorting
  if (filters.sortBy) {
    switch (filters.sortBy) {
      case 'name-asc':
        filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        filteredProducts.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'stock-asc':
        filteredProducts.sort((a, b) => a.stock_quantity - b.stock_quantity);
        break;
      case 'stock-desc':
        filteredProducts.sort((a, b) => b.stock_quantity - a.stock_quantity);
        break;
      default:
        // Default to name-asc
        filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
  } else {
    // Default sort by name ascending
    filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
  }

  return filteredProducts;
};

// Get inventory statistics
export interface InventoryStats {
  totalProducts: number;
  inStockProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
}

export const getInventoryStats = (products: Product[]): InventoryStats => {
  const totalProducts = products.length;
  const inStockProducts = products.filter(product => product.stock_quantity > 5).length;
  const lowStockProducts = products.filter(
    product => product.stock_quantity > 0 && product.stock_quantity <= 5
  ).length;
  const outOfStockProducts = products.filter(product => product.stock_quantity <= 0).length;

  return {
    totalProducts,
    inStockProducts,
    lowStockProducts,
    outOfStockProducts
  };
};

// Get inventory log entries for a product
export const getInventoryLog = async (productId?: string, limit: number = 20): Promise<InventoryLog[]> => {
  try {
    let query = supabase
      .from('inventory_log')
      .select(`
        *,
        products(name),
        users:created_by(name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (productId) {
      query = query.eq('product_id', productId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw error;
    }
    
    return data.map(entry => ({
      id: entry.id,
      product_id: entry.product_id,
      productName: entry.products?.name,
      quantity: entry.quantity,
      previous_stock: entry.previous_stock,
      new_stock: entry.new_stock,
      type: entry.type,
      reference_id: entry.reference_id || undefined,
      reference_type: entry.reference_type || undefined,
      notes: entry.notes || undefined,
      created_by: entry.created_by || undefined,
      created_by_name: entry.users?.name,
      created_at: new Date(entry.created_at)
    }));
  } catch (error) {
    throw error;
  }
};

// Update minimum stock level for a product
export const updateMinimumStockLevel = async (
  productId: string, 
  minStockLevel: number, 
  reorderLevel: number, 
  reorderQuantity: number
): Promise<void> => {
  try {
    // Split update and select operations
    const { error } = await supabase
      .from('products')
      .update({
        min_stock_level: minStockLevel,
        reorder_level: reorderLevel,
        reorder_quantity: reorderQuantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId);
    
    if (error) {
      throw error;
    }
  } catch (error) {
    throw error;
  }
};

// Add inventory log entry manually
export const addInventoryLogEntry = async (
  productId: string,
  quantity: number,
  type: InventoryLogType,
  notes?: string,
  referenceId?: string,
  referenceType?: string
): Promise<void> => {
  try {
    // Get current stock level
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', productId)
      .single();
    
    if (productError) {
      throw productError;
    }
    
    const currentStock = productData.stock_quantity;
    let newStock = currentStock;
    
    // Calculate new stock based on operation type
    if (type === 'purchase' || type === 'return') {
      newStock = currentStock + quantity;
    } else if (type === 'sale' || type === 'loss') {
      newStock = Math.max(0, currentStock - quantity);
    } else if (type === 'adjustment') {
      newStock = quantity; // Direct set for adjustment
    }
    
    // Update product stock
    const { error: updateError } = await supabase
      .from('products')
      .update({
        stock_quantity: newStock,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId);
    
    if (updateError) {
      throw updateError;
    }
    
    // Get current user
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    
    // Add inventory log entry
    const { error: logError } = await supabase
      .from('inventory_log')
      .insert({
        product_id: productId,
        quantity,
        previous_stock: currentStock,
        new_stock: newStock,
        type,
        reference_id: referenceId,
        reference_type: referenceType || 'manual',
        notes,
        created_by: userId,
        created_at: new Date().toISOString()
      });
    
    if (logError) {
      throw logError;
    }
  } catch (error) {
    throw error;
  }
};

// Get products that need reordering
export const getProductsToReorder = async (): Promise<Product[]> => {
  try {
    // الحصول على معلومات المستخدم الحالي
    const userInfo = await supabase.auth.getUser();
    const userId = userInfo.data.user?.id;
    
    if (!userId) {
      throw new Error('المستخدم غير مسجل الدخول');
    }
    
    // البحث عن معرف المؤسسة الخاصة بالمستخدم
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', userId)
      .single();
      
    if (userError && userError.code !== 'PGRST116') {
      throw userError;
    }
    
    // استخدام معرف المؤسسة لجلب المنتجات الخاصة بها فقط
    const organizationId = userData?.organization_id;
    
    // استخدام استراتيجية مختلفة: جلب جميع المنتجات ثم تصفيتها
    let query = supabase
      .from('products')
      .select('*')
      .not('is_digital', 'eq', true);
    
    // إضافة تصفية حسب المؤسسة إذا كان معرف المؤسسة متوفرًا
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw error;
    }
    
    // تصفية المنتجات على جانب العميل حسب معايير إعادة الطلب
    const productsToReorder = data.filter(product => {
      // المنتجات التي نفدت من المخزون (الكمية = 0)
      if (product.stock_quantity === 0) return true;
      
      // المنتجات التي الكمية فيها أقل من مستوى إعادة الطلب
      // استخدام || لتحديد قيمة افتراضية إذا كان reorder_level غير معرف
      const reorderLevel = product.reorder_level || 10;
      return product.stock_quantity < reorderLevel;
    });

    return productsToReorder.map(mapProductFromDatabase);
  } catch (error) {
    throw error;
  }
};

/**
 * الحصول على مخزون منتج
 * @param productId معرف المنتج
 * @param variantId معرف المتغير (اختياري)
 * @returns كمية المخزون الحالية
 */
export async function getProductStock(productId: string, variantId?: string): Promise<number> {
  try {
    // التأكد من وجود معرف منتج صالح
    if (!productId) {
      return 0;
    }
    
    // التحقق ما إذا كان المستخدم متصلاً بالإنترنت
    if (!navigator.onLine) {
      
      return await inventoryDB.getProductStock(productId, variantId);
    }
    
    // محاولة جلب البيانات من الخادم
    const { data, error } = await supabase
      .from('product_inventory')
      .select('stock_quantity')
      .eq('product_id', productId)
      .eq('variant_id', variantId || null)
      .single();
    
    if (error) {
      // في حالة الخطأ، استخدم التخزين المحلي
      return await inventoryDB.getProductStock(productId, variantId);
    }
    
    // إذا نجح الطلب، أعد كمية المخزون ونزامن البيانات المحلية
    if (data) {
      await inventoryDB.updateProductStock({
        product_id: productId,
        variant_id: variantId || null,
        quantity: data.stock_quantity,
        reason: 'sync-from-server',
        created_by: 'system'
      });
      return data.stock_quantity;
    }
    
    // إذا لم يتم العثور على البيانات، أعد 0
    return 0;
  } catch (error) {
    // في حالة حدوث خطأ، استخدم التخزين المحلي
    return await inventoryDB.getProductStock(productId, variantId);
  }
}

/**
 * التحقق من الاتصال بالخادم وقاعدة البيانات بطريقة أكثر دقة
 * @returns وعد يحل إلى قيمة منطقية تشير إلى حالة الاتصال
 */
async function checkServerConnection(): Promise<boolean> {
  try {
    // 1. التحقق أولاً من الاتصال بالإنترنت بشكل عام
    if (!navigator.onLine) {
      
      return false;
    }
    
    // 2. محاولة الاتصال بـ Supabase عبر عملية استعلام بسيطة
    try {
      // الحصول على معلومات المستخدم الحالي
      const userInfo = await supabase.auth.getUser();
      const userId = userInfo.data.user?.id;
      
      if (!userId) {
        return false;
      }
      
      // استخدام استعلام بسيط للتحقق من الاتصال
      const { error } = await supabase
        .from('products')
        .select('count', { count: 'exact', head: true })
        .limit(1);
        
      if (error) {
        return false;
      }

      return true;
    } catch (supabaseError) {
      return false;
    }
  } catch (error) {
    return false;
  }
}

/**
 * التحقق مما إذا كان المعرف المعطى هو معرف مقاس
 * @param variantId معرف المتغير للفحص
 * @returns true إذا كان المعرف هو معرف مقاس
 */
async function isSizeId(variantId: string): Promise<boolean> {
  try {
    // فحص ما إذا كان المعرف موجودًا في جدول المقاسات
    const { data, error } = await supabase
      .from('product_sizes')
      .select('id')
      .eq('id', variantId)
      .maybeSingle();
    
    if (error) {
      return false;
    }
    
    return !!data;
  } catch (error) {
    return false;
  }
}

/**
 * التحقق مما إذا كان المعرف المعطى هو معرف لون
 * @param variantId معرف المتغير للفحص
 * @returns true إذا كان المعرف هو معرف لون
 */
async function isColorId(variantId: string): Promise<boolean> {
  try {
    // فحص ما إذا كان المعرف موجودًا في جدول الألوان
    const { data, error } = await supabase
      .from('product_colors')
      .select('id')
      .eq('id', variantId)
      .maybeSingle();
    
    if (error) {
      return false;
    }
    
    return !!data;
  } catch (error) {
    return false;
  }
}

/**
 * الحصول على معلومات عن المتغير (اللون أو المقاس)
 * @param variantId معرف المتغير
 * @returns معلومات عن المتغير: نوعه ومعرف المقاس ومعرف اللون والمنتج
 */
async function getVariantInfo(variantId: string): Promise<{
  type: 'size' | 'color' | 'unknown';
  sizeId?: string;
  colorId?: string;
  productId?: string;
}> {
  // التحقق أولاً إذا كان معرف مقاس
  const isSizeVariant = await isSizeId(variantId);
  
  if (isSizeVariant) {
    try {
      // جلب معلومات المقاس
      const { data, error } = await supabase
        .from('product_sizes')
        .select('id, color_id, product_id')
        .eq('id', variantId)
        .single();
      
      if (error || !data) {
        throw error || new Error('لم يتم العثور على المقاس');
      }
      
      return {
        type: 'size',
        sizeId: data.id,
        colorId: data.color_id,
        productId: data.product_id
      };
    } catch (error) {
      return { type: 'unknown' };
    }
  }
  
  // التحقق إذا كان معرف لون
  const isColorVariant = await isColorId(variantId);
  
  if (isColorVariant) {
    try {
      // جلب معلومات اللون
      const { data, error } = await supabase
        .from('product_colors')
        .select('id, product_id')
        .eq('id', variantId)
        .single();
      
      if (error || !data) {
        throw error || new Error('لم يتم العثور على اللون');
      }
      
      return {
        type: 'color',
        colorId: data.id,
        productId: data.product_id
      };
    } catch (error) {
      return { type: 'unknown' };
    }
  }
  
  // إذا لم يكن المعرف لا للون ولا للمقاس
  return { type: 'unknown' };
}

/**
 * تحديث مخزون المنتج
 * @param data بيانات تحديث المخزون
 * @returns نجاح العملية
 */
export async function updateProductStock(data: {
  product_id: string;
  variant_id?: string;
  quantity: number;  // الكمية المطلوبة للإضافة أو الطرح
  reason: string;
  notes?: string;
  source_id?: string;
  created_by: string;
}): Promise<boolean> {
  try {
    // التأكد من وجود معرف منتج صالح
    if (!data.product_id) {
      toast.error('حدث خطأ: معرف المنتج غير صالح');
      return false;
    }
    
    // التأكد من أن الكمية هي عدد صحيح
    if (typeof data.quantity !== 'number') {
      toast.error('حدث خطأ: كمية التعديل غير صالحة');
      return false;
    }

    // تسجيل المعلومات قبل التحديث

    // التأكد من أن variant_id هو null وليس undefined
    const stockUpdateData = {
      ...data,
      variant_id: data.variant_id ?? null
    };
    
    let transaction;
    
    try {
      // تحديث المخزون محليًا أولاً لضمان استجابة سريعة
      transaction = await inventoryDB.updateProductStock(stockUpdateData);
      
      // إظهار إشعار بنجاح التحديث
      toast.success('تم تحديث المخزون بنجاح');
    } catch (localError) {
      
      // محاولة إصلاح قاعدة البيانات
      try {
        
        // إذا كان الخطأ مرتبطًا بنسخة قاعدة البيانات، دعنا نحاول إنشاء سجل مباشرة
        const directInventoryItem = {
          id: `direct-${data.product_id}:${data.variant_id ?? 'null'}`,
          product_id: data.product_id,
          variant_id: stockUpdateData.variant_id,
          quantity: data.quantity,
          reason: data.reason,
          notes: data.notes ?? '',
          source_id: data.source_id ?? '',
          created_by: data.created_by,
          timestamp: new Date(),
          synced: false
        };

        toast.warning('جاري محاولة إصلاح قاعدة البيانات المحلية...');
        
        // إضافة سجل للعمليات بشكل مباشر
        transaction = directInventoryItem;
        
      } catch (recoveryError) {
        toast.error('حدث خطأ في قاعدة البيانات المحلية. يرجى تحديث الصفحة');
        return false;
      }
    }
    
    // التحقق من الاتصال بالخادم بطريقة أكثر دقة
    const isConnected = await checkServerConnection();
    
    // إذا كان المستخدم غير متصل، اكتفِ بالتخزين المحلي
    if (!isConnected) {
      
      toast.info('تم تخزين التغييرات محليًا وسيتم مزامنتها عند استعادة الاتصال');
      return true;
    }

    // تحديد نوع المتغير (مقاس أم لون) لإجراء التحديث المناسب
    if (data.variant_id) {
      try {
        const variantInfo = await getVariantInfo(data.variant_id);

        if (variantInfo.type === 'size') {
          // في حالة تحديث مقاس
          // 1. تحديث كمية المقاس
          const { data: currentSizeData, error: sizeError } = await supabase
            .from('product_sizes')
            .select('quantity')
            .eq('id', data.variant_id)
            .single();
          
          if (sizeError) {
            throw sizeError;
          }

          const currentQuantity = currentSizeData?.quantity || 0;
          const newSizeQuantity = Math.max(0, currentQuantity + data.quantity);
          
          // تحديث كمية المقاس
          const { error: updateSizeError } = await supabase
            .from('product_sizes')
            .update({ quantity: newSizeQuantity })
            .eq('id', data.variant_id);
          
          if (updateSizeError) {
            throw updateSizeError;
          }

          // 2. تحديث كمية اللون بناءً على مجموع كميات المقاسات
          if (variantInfo.colorId) {
            await updateColorStock(variantInfo.colorId);
          }
          
          // 3. تحديث كمية المنتج بناءً على مجموع كميات الألوان
          if (variantInfo.productId) {
            await updateProductTotalStock(variantInfo.productId);
          }
        } else if (variantInfo.type === 'color') {
          // في حالة تحديث لون
          // 1. تحديث كمية اللون
          const { data: currentColorData, error: colorError } = await supabase
            .from('product_colors')
            .select('quantity')
            .eq('id', data.variant_id)
            .single();
          
          if (colorError) {
            throw colorError;
          }

          const currentQuantity = currentColorData?.quantity || 0;
          const newColorQuantity = Math.max(0, currentQuantity + data.quantity);
          
          // تحديث كمية اللون
          const { error: updateColorError } = await supabase
            .from('product_colors')
            .update({ quantity: newColorQuantity })
            .eq('id', data.variant_id);
          
          if (updateColorError) {
            throw updateColorError;
          }
          
          // 2. تحديث كمية المنتج بناءً على مجموع كميات الألوان
          if (variantInfo.productId) {
            await updateProductTotalStock(variantInfo.productId);
          }
        }
      } catch (variantError) {
      }
    }
    
    // مزامنة التغيير مع الخادم
    try {
      // الحصول على المخزون الحالي قبل التعديل
      let previousStock = 0;
      let canUpdateProduct = true;
      
      try {
        const { data: productData, error: fetchError } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', data.product_id)
          .single();
          
        if (fetchError) {
          canUpdateProduct = false; // لا يمكن تحديث المنتج إذا فشل الاستعلام
          // استخدام القيمة المخزنة محليًا إذا كانت متاحة
          previousStock = 0; // قيمة افتراضية آمنة
        } else if (productData) {
          previousStock = productData.stock_quantity;
        }
      } catch (stockError) {
        canUpdateProduct = false;
        previousStock = 0; // قيمة افتراضية آمنة
      }
      
      // حساب المخزون الجديد
      const newStock = Math.max(0, previousStock + data.quantity);
      
      // محاولة تحديث المنتج في قاعدة البيانات
      if (canUpdateProduct && !data.variant_id) {
        try {
          // 1. تحديث المخزون في جدول المنتجات (فقط إذا لم يكن هناك متغير محدد)
          const { error: updateError } = await supabase
            .from('products')
            .update({
              stock_quantity: newStock,
              updated_at: new Date().toISOString(),
              last_inventory_update: new Date().toISOString()
            })
            .eq('id', data.product_id);
          
          if (updateError) {
            // لا نتوقف هنا، نحاول إضافة سجل في inventory_logs على الأقل
            canUpdateProduct = false;
          }
        } catch (updateError) {
          canUpdateProduct = false;
        }
      }
      
      // إضافة سجل معاملة حتى لو فشل تحديث المنتج
      try {
        // 2. إضافة سجل المعاملة
        const { error } = await supabase
          .from('inventory_logs')
          .insert({
            product_id: data.product_id,
            quantity: data.quantity,
            previous_stock: previousStock,
            new_stock: newStock,
            type: data.reason,
            notes: data.notes ?? '',
            reference_id: data.source_id ?? null,
            created_by: data.created_by,
            created_at: transaction.timestamp,
            organization_id: (await supabase.auth.getUser()).data.user?.user_metadata?.organization_id
          });
        
        if (error) {
          // في حالة فشل إضافة السجل، نحاول مرة أخرى في وقت لاحق
          return true;
        }
        
        // تحديث السجل المحلي فقط إذا نجحت عملية المزامنة
        if (transaction && transaction.id) {
          try {
            await inventoryDB.inventoryDB.transactions.update(transaction.id, { synced: true });
          } catch (updateError) {
          }
        }
        
        // إذا كانت عملية تحديث المنتج قد فشلت، نخبر المستخدم أن التحديث سيتم مزامنته لاحقًا
        if (!canUpdateProduct) {
          toast.info('تم تسجيل العملية ولكن تحديث المخزون سيتم مزامنته لاحقًا');
        } else {
          
        }
        
        return true;
      } catch (syncError) {
        // في حالة الخطأ، سيتم المزامنة لاحقًا
        return true;
      }
    } catch (syncError) {
      // في حالة الخطأ، سيتم المزامنة لاحقًا
      return true;
    }
  } catch (error) {
    toast.error('حدث خطأ أثناء تحديث المخزون');
    return false;
  }
}

/**
 * ضبط الكمية المطلقة للمخزون (تعيين قيمة محددة)
 * @param data بيانات ضبط المخزون
 * @returns نجاح العملية
 */
export async function setProductStock(data: {
  product_id: string;
  variant_id?: string;
  stock_quantity: number;  // الكمية المطلقة الجديدة
  reason: string;
  notes?: string;
  created_by: string;
}): Promise<boolean> {
  try {
    // التأكد من أن الكمية هي عدد صحيح موجب
    if (typeof data.stock_quantity !== 'number' || data.stock_quantity < 0) {
      toast.error('الكمية يجب أن تكون رقمًا صحيحًا موجباً');
      return false;
    }
    
    // حساب الفرق بين الكمية الحالية والجديدة لاستخدامه في updateProductStock
    let currentQuantity = 0;
    
    try {
      // التحقق من نوع المعرف (لون أم مقاس)
      if (data.variant_id) {
        const variantInfo = await getVariantInfo(data.variant_id);
        
        if (variantInfo.type === 'size') {
          // في حالة المقاس، نحصل على الكمية الحالية للمقاس
          const { data: sizeData, error: sizeError } = await supabase
            .from('product_sizes')
            .select('quantity')
            .eq('id', data.variant_id)
            .single();
            
          if (sizeError) {
            return false;
          }
          
          currentQuantity = sizeData?.quantity || 0;
          
          // تحديث كمية المقاس مباشرة
          const { error: updateSizeError } = await supabase
            .from('product_sizes')
            .update({ quantity: data.stock_quantity })
            .eq('id', data.variant_id);
          
          if (updateSizeError) {
            return false;
          }
          
          // تحديث كمية اللون بناءً على مجموع كميات المقاسات
          if (variantInfo.colorId) {
            await updateColorStock(variantInfo.colorId);
          }
          
          // تحديث كمية المنتج بناءً على مجموع كميات الألوان
          if (variantInfo.productId) {
            await updateProductTotalStock(variantInfo.productId);
          }
        } else if (variantInfo.type === 'color') {
          // في حالة اللون، نحصل على الكمية الحالية للون
          const { data: colorData, error: colorError } = await supabase
            .from('product_colors')
            .select('quantity')
            .eq('id', data.variant_id)
            .single();
            
          if (colorError) {
            return false;
          }
          
          currentQuantity = colorData?.quantity || 0;
          
          // تحديث كمية اللون مباشرة
          const { error: updateColorError } = await supabase
            .from('product_colors')
            .update({ quantity: data.stock_quantity })
            .eq('id', data.variant_id);
          
          if (updateColorError) {
            return false;
          }
          
          // تحديث كمية المنتج بناءً على مجموع كميات الألوان
          if (variantInfo.productId) {
            await updateProductTotalStock(variantInfo.productId);
          }
        }
      } else {
        // في حالة المنتج نفسه، نحصل على الكمية الحالية للمنتج
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', data.product_id)
          .single();
          
        if (productError) {
          return false;
        }
        
        currentQuantity = productData?.stock_quantity || 0;
        
        // تحديث كمية المنتج مباشرة
        const { error: updateProductError } = await supabase
          .from('products')
          .update({ stock_quantity: data.stock_quantity })
          .eq('id', data.product_id);
        
        if (updateProductError) {
          return false;
        }
      }
      
      // حساب الفرق للسجل
      const difference = data.stock_quantity - currentQuantity;
      
      // إضافة سجل بالتغيير
      const success = await updateProductStock({
        product_id: data.product_id,
        variant_id: data.variant_id,
        quantity: difference,
        reason: data.reason,
        notes: data.notes || `تعيين المخزون إلى ${data.stock_quantity}`,
        created_by: data.created_by
      });
      
      return success;
    } catch (variantError) {
      // لا نريد فشل العملية الرئيسية إذا فشل تحديث المتغيرات
    }
    
    return false;
  } catch (error) {
    toast.error('حدث خطأ أثناء ضبط كمية المخزون');
    return false;
  }
}

/**
 * تحديث كمية اللون بناءً على مجموع كميات المقاسات
 */
async function updateColorStock(colorId: string): Promise<void> {
  try {
    // الحصول على مجموع كميات المقاسات لهذا اللون
    const { data: sizes, error: sizesError } = await supabase
      .from('product_sizes')
      .select('quantity')
      .eq('color_id', colorId);
    
    if (sizesError) throw sizesError;
    
    const totalQuantity = sizes?.reduce((sum, size) => sum + (size.quantity || 0), 0) || 0;
    
    // تحديث كمية اللون
    const { error: updateError } = await supabase
      .from('product_colors')
      .update({ quantity: totalQuantity })
      .eq('id', colorId);
    
    if (updateError) throw updateError;
  } catch (error) {
  }
}

/**
 * تحديث كمية المنتج بناءً على مجموع كميات الألوان
 */
async function updateProductTotalStock(productId: string): Promise<void> {
  try {
    // الحصول على مجموع كميات الألوان لهذا المنتج
    const { data: colors, error: colorsError } = await supabase
      .from('product_colors')
      .select('quantity')
      .eq('product_id', productId);
    
    if (colorsError) throw colorsError;
    
    const totalQuantity = colors?.reduce((sum, color) => sum + (color.quantity || 0), 0) || 0;
    
    // تحديث كمية المنتج
    const { error: updateError } = await supabase
      .from('products')
      .update({ stock_quantity: totalQuantity })
      .eq('id', productId);
    
    if (updateError) throw updateError;
  } catch (error) {
  }
}

/**
 * مزامنة بيانات المخزون مع الخادم
 * @returns عدد العمليات التي تمت مزامنتها
 */
export async function syncInventoryData(): Promise<number> {
  // التحقق من الاتصال بطريقة أكثر دقة
  const isConnected = await checkServerConnection();
  
  if (!isConnected) {
    toast.error('لا يمكن مزامنة المخزون: أنت غير متصل بالخادم');
    return 0;
  }
  
  toast.loading('جارٍ مزامنة بيانات المخزون...', { id: 'sync-inventory' });
  
  try {
    // تنفيذ المزامنة
    const syncedCount = await inventoryDB.syncInventoryData();
    
    if (syncedCount > 0) {
      toast.success(`تمت مزامنة ${syncedCount} عملية مخزون بنجاح`, { id: 'sync-inventory' });
    } else {
      toast.info('لا توجد بيانات مخزون للمزامنة', { id: 'sync-inventory' });
    }
    
    return syncedCount;
  } catch (error) {
    toast.error('حدث خطأ أثناء مزامنة بيانات المخزون', { id: 'sync-inventory' });
    return 0;
  }
}

/**
 * الحصول على سجل عمليات المخزون لمنتج معين
 * @param productId معرف المنتج
 * @param variantId معرف المتغير (اختياري)
 * @returns قائمة العمليات
 */
export async function getProductInventoryHistory(productId: string, variantId?: string): Promise<inventoryDB.InventoryTransaction[]> {
  try {
    // التأكد من وجود معرف منتج صالح
    if (!productId) {
      return [];
    }
    
    // تأكد من أن variant_id هو null بدلاً من undefined
    const normalizedVariantId = variantId || null;
    
    if (!navigator.onLine) {
      
      return await inventoryDB.getProductTransactions(productId, normalizedVariantId);
    }
    
    try {
      // محاولة جلب البيانات من الخادم
      let query = supabase
        .from('inventory_transactions')
        .select('*')
        .eq('product_id', productId);
      
      // التعامل مع قيم variant_id بطريقة مختلفة بناءً على ما إذا كانت null أم لا
      if (normalizedVariantId === null) {
        query = query.is('variant_id', null);
      } else {
        query = query.eq('variant_id', normalizedVariantId);
      }
      
      // إضافة الترتيب
      const { data, error } = await query.order('created_at', { ascending: false });
      
      // إذا لم يكن هناك خطأ وتم إرجاع بيانات
      if (!error && data && data.length > 0) {
        return data.map(item => ({
          id: item.id,
          product_id: item.product_id,
          variant_id: item.variant_id || null,
          quantity: item.quantity,
          reason: item.reason,
          notes: item.notes || undefined,
          source_id: item.source_id || undefined,
          timestamp: new Date(item.created_at),
          synced: true,
          created_by: item.created_by
        }));
      }
    } catch (serverError) {
      // استمرار التنفيذ لاستخدام البيانات المحلية
    }
    
    // في حالة عدم وجود بيانات من الخادم أو حدوث خطأ، استخدم التخزين المحلي
    
    return await inventoryDB.getProductTransactions(productId, normalizedVariantId);
  } catch (error) {
    // في حالة حدوث خطأ، استخدم التخزين المحلي
    return await inventoryDB.getProductTransactions(productId, variantId || null);
  }
}

/**
 * تحميل بيانات المخزون الأساسية من الخادم
 * @returns نجاح العملية
 */
export async function loadInventoryData(): Promise<boolean> {
  // التحقق من الاتصال بطريقة أكثر دقة
  const isConnected = await checkServerConnection();
  
  if (!isConnected) {
    return false;
  }
  
  try {
    // تحميل بيانات المخزون من الخادم
    const itemsCount = await inventoryDB.loadInventoryDataFromServer();
    
    if (itemsCount > 0) {
      
      return true;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
}

/**
 * تهيئة نظام المخزون
 */
export function initInventorySystem(): void {

  // تعيين مستمع لحالة الاتصال لمزامنة البيانات عند استعادة الاتصال
  if (typeof window !== 'undefined') {
    // دالة مساعدة لمحاولة المزامنة عند استعادة الاتصال
    const attemptSyncOnReconnect = async (): Promise<void> => {
      try {
        // التحقق من حالة الاتصال بـ Supabase بطريقة موثوقة
        const isConnected = await checkServerConnection();
        
        if (!isConnected) {
          
          return;
        }

        // الحصول على عدد العمليات غير المتزامنة
        const unsyncedCount = await inventoryDB.getUnsyncedTransactionsCount();
        
        if (unsyncedCount > 0) {
          toast.info(`يوجد ${unsyncedCount} عملية مخزون غير متزامنة، جاري المزامنة...`);
          
          // تنفيذ المزامنة بعد تأخير قصير للتأكد من استقرار الاتصال
          setTimeout(async () => {
            try {
              const syncResult = await syncInventoryData();
              
            } catch (syncError) {
            }
          }, 2000);
        } else {
          
        }
      } catch (error) {
      }
    };
    
    // إضافة مستمع لحدث استعادة الاتصال
    window.addEventListener('online', () => {

      // محاولة المزامنة بعد تأخير قصير للتأكد من استقرار الاتصال
      setTimeout(attemptSyncOnReconnect, 1000);
    });
    
    // إضافة مراقبة دورية لحالة الاتصال (مفيدة عندما لا يتم إطلاق حدث online بشكل موثوق)
    let connectionWatcherId: number;
    let lastConnectionState = navigator.onLine;
    let lastCheckTime = 0;
    
    const checkConnectionStatus = async () => {
      // تحقق إذا مر وقت كافٍ منذ آخر فحص (2 دقائق)
      const now = Date.now();
      if (now - lastCheckTime < 120000) {
        return; // تجاهل الفحص إذا لم يمر وقت كافٍ
      }
      
      lastCheckTime = now;
      
      try {
        const isConnected = await checkServerConnection();
        
        // إذا انتقلنا من حالة غير متصل إلى متصل، حاول المزامنة
        if (!lastConnectionState && isConnected) {
          
          attemptSyncOnReconnect();
        }
        
        lastConnectionState = isConnected;
      } catch (error) {
      }
    };
    
    // بدء المراقبة الدورية (كل 2 دقيقة بدلاً من 30 ثانية)
    connectionWatcherId = window.setInterval(checkConnectionStatus, 120000);
    
    // فحص مبدئي (بعد تحميل الصفحة مباشرة، ولكن ليس مباشرة)
    // زيادة التأخير لتجنب تنفيذ الفحص فور تحميل الصفحة
    setTimeout(checkConnectionStatus, 15000);
  }
}

// استدعاء دالة التهيئة تلقائيًا عند استيراد الوحدة
initInventorySystem();
