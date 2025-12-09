/**
 * ⚡ localProductService - Adapter للخدمة الموحدة
 * 
 * هذا الملف يُعيد التصدير من UnifiedProductService للحفاظ على التوافق مع الكود القديم
 * 
 * تم استبدال التنفيذ القديم بـ UnifiedProductService للعمل Offline-First
 */

import { unifiedProductService } from '@/services/UnifiedProductService';
import type { Product } from '@/services/UnifiedProductService';

// إعادة تصدير جميع الصادرات من الخدمة الموحدة
export * from '@/services/UnifiedProductService';

// إعادة تصدير كـ default للتوافق
export { unifiedProductService as default } from '@/services/UnifiedProductService';

// إعادة تصدير الأنواع للتوافق
export type {
  Product,
  ProductWithDetails,
  ProductColor,
  ProductSize,
  ProductCategory,
  ProductSubcategory,
  ProductFilters,
  PaginatedResult
} from '@/services/UnifiedProductService';

// ⚡ دوال التوافق القديمة
/**
 * إنشاء منتج محلياً (PowerSync Offline-First)
 */
export const createLocalProduct = async (productData: any): Promise<Product> => {
  const orgId = localStorage.getItem('currentOrganizationId') || 
                localStorage.getItem('bazaar_organization_id');
  if (!orgId) throw new Error('Organization ID not found');
  
  unifiedProductService.setOrganizationId(orgId);
  return unifiedProductService.createProduct(productData);
};

/**
 * تحديث منتج محلياً (PowerSync Offline-First)
 */
export const updateLocalProduct = async (productId: string, updates: any): Promise<Product | null> => {
  const orgId = localStorage.getItem('currentOrganizationId') || 
                localStorage.getItem('bazaar_organization_id');
  if (!orgId) throw new Error('Organization ID not found');
  
  unifiedProductService.setOrganizationId(orgId);
  return unifiedProductService.updateProduct(productId, updates);
};

/**
 * حذف منتج محلياً (PowerSync Offline-First)
 */
export const deleteLocalProduct = async (productId: string): Promise<boolean> => {
  const orgId = localStorage.getItem('currentOrganizationId') || 
                localStorage.getItem('bazaar_organization_id');
  if (!orgId) throw new Error('Organization ID not found');
  
  unifiedProductService.setOrganizationId(orgId);
  await unifiedProductService.deleteProduct(productId);
  return true;
};

/**
 * تحديث حالة مزامنة المنتج (PowerSync يتعامل مع المزامنة تلقائياً)
 * @deprecated PowerSync handles sync automatically - no need to mark as synced
 */
export const markProductAsSynced = async (
  productId: string,
  remoteData?: Partial<Product>
): Promise<Product | null> => {
  // PowerSync يتعامل مع المزامنة تلقائياً
  // إذا كان هناك remoteData، نقوم بتحديث المنتج
  if (remoteData) {
    return updateLocalProduct(productId, remoteData);
  }
  
  // فقط إرجاع المنتج الحالي
  const orgId = localStorage.getItem('currentOrganizationId') || 
                localStorage.getItem('bazaar_organization_id');
  if (!orgId) return null;
  
  unifiedProductService.setOrganizationId(orgId);
  return unifiedProductService.getProduct(productId);
};

/**
 * ⚡ تقليل مخزون منتج محلياً (للخسائر والمبيعات)
 * يدعم أنواع البيع المختلفة: قطعة، متر، وزن، علبة
 */
export const reduceLocalProductStock = async (
  productId: string,
  quantity: number,
  options?: {
    colorId?: string;
    sizeId?: string;
    sellingUnit?: 'piece' | 'weight' | 'meter' | 'box';
  }
): Promise<boolean> => {
  try {
    const orgId = localStorage.getItem('currentOrganizationId') ||
                  localStorage.getItem('bazaar_organization_id');
    if (!orgId) throw new Error('Organization ID not found');

    unifiedProductService.setOrganizationId(orgId);

    // جلب المنتج الحالي
    const product = await unifiedProductService.getProduct(productId) as any;
    if (!product) {
      console.error('[reduceLocalProductStock] Product not found:', productId);
      return false;
    }

    // تحديد نوع البيع
    let sellingUnit = options?.sellingUnit;
    if (!sellingUnit) {
      if (product.sell_by_meter) sellingUnit = 'meter';
      else if (product.sell_by_weight) sellingUnit = 'weight';
      else if (product.sell_by_box) sellingUnit = 'box';
      else sellingUnit = 'piece';
    }

    // تحديد الحقل الصحيح للتحديث
    let updateData: Record<string, any> = {};
    let logInfo: Record<string, any> = {
      productId,
      productName: product.name,
      sellingUnit,
      reduced: quantity
    };

    switch (sellingUnit) {
      case 'meter':
        const currentLength = product.available_length || 0;
        const newLength = Math.max(0, currentLength - quantity);
        updateData = { available_length: newLength };
        logInfo = { ...logInfo, previousLength: currentLength, newLength };
        break;

      case 'weight':
        const currentWeight = product.available_weight || 0;
        const newWeight = Math.max(0, currentWeight - quantity);
        updateData = { available_weight: newWeight };
        logInfo = { ...logInfo, previousWeight: currentWeight, newWeight };
        break;

      case 'box':
        const currentBoxes = product.available_boxes || 0;
        const newBoxes = Math.max(0, currentBoxes - quantity);
        updateData = { available_boxes: newBoxes };
        logInfo = { ...logInfo, previousBoxes: currentBoxes, newBoxes };
        break;

      default: // piece
        const currentStock = product.stock_quantity || 0;
        const newStock = Math.max(0, currentStock - quantity);
        updateData = { stock_quantity: newStock };
        logInfo = { ...logInfo, previousStock: currentStock, newStock };
        break;
    }

    // تحديث المخزون
    await unifiedProductService.updateProduct(productId, updateData);

    console.log('[reduceLocalProductStock] ✅ Stock reduced:', logInfo);

    return true;
  } catch (error) {
    console.error('[reduceLocalProductStock] ❌ Error:', error);
    return false;
  }
};
