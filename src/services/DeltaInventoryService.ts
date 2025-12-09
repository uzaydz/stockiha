/**
 * DeltaInventoryService - خدمة المخزون مع دعم Delta Sync
 * تُستخدم لتحديث المخزون محلياً مع إرسال DELTA للخادم
 *
 * الاستخدام:
 * - عند البيع في POS: استخدم decrementStock
 * - عند الإرجاع: استخدم incrementStock
 * - عند التعديل اليدوي: استخدم setStock
 */

import { deltaWriteService } from './DeltaWriteService';

export interface StockUpdateResult {
  success: boolean;
  newQuantity?: number;
  error?: string;
}

export interface VariantStockUpdate {
  productId: string;
  colorId?: string | null;
  sizeId?: string | null;
  change: number; // موجب للزيادة، سالب للنقصان
}

class DeltaInventoryServiceClass {
  /**
   * تقليل المخزون (عند البيع)
   */
  async decrementStock(
    productId: string,
    quantity: number,
    options?: {
      colorId?: string | null;
      sizeId?: string | null;
    }
  ): Promise<StockUpdateResult> {
    return this.updateStock(productId, -Math.abs(quantity), options);
  }

  /**
   * زيادة المخزون (عند الإرجاع أو الاستلام)
   */
  async incrementStock(
    productId: string,
    quantity: number,
    options?: {
      colorId?: string | null;
      sizeId?: string | null;
    }
  ): Promise<StockUpdateResult> {
    return this.updateStock(productId, Math.abs(quantity), options);
  }

  /**
   * تحديث المخزون بقيمة محددة
   */
  async setStock(
    productId: string,
    newQuantity: number,
    options?: {
      colorId?: string | null;
      sizeId?: string | null;
    }
  ): Promise<StockUpdateResult> {
    try {
      // للتعيين المباشر، نستخدم UPDATE بدلاً من DELTA
      if (options?.sizeId) {
        // تحديث المقاس
        await deltaWriteService.localWrite(
          'product_sizes',
          'UPDATE',
          options.sizeId,
          { quantity: newQuantity }
        );
      } else if (options?.colorId) {
        // تحديث اللون
        await deltaWriteService.localWrite(
          'product_colors',
          'UPDATE',
          options.colorId,
          { quantity: newQuantity }
        );
      } else {
        // تحديث المنتج مباشرة
        await deltaWriteService.localWrite(
          'products',
          'UPDATE',
          productId,
          { stock_quantity: newQuantity }
        );
      }

      return { success: true, newQuantity };
    } catch (error) {
      console.error('[DeltaInventoryService] setStock error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * تحديث المخزون باستخدام DELTA
   * هذه هي الدالة الأساسية التي تستخدم عملية DELTA
   */
  private async updateStock(
    productId: string,
    change: number,
    options?: {
      colorId?: string | null;
      sizeId?: string | null;
    }
  ): Promise<StockUpdateResult> {
    try {
      if (change === 0) {
        return { success: true };
      }

      // تحديد الجدول والسجل والحقل المناسب
      if (options?.sizeId) {
        // تحديث كمية المقاس
        await deltaWriteService.stockDelta(
          'product_sizes',
          options.sizeId,
          'quantity',
          change
        );
        console.log(`[DeltaInventory] Size ${options.sizeId} stock delta: ${change}`);
      } else if (options?.colorId) {
        // تحديث كمية اللون
        await deltaWriteService.stockDelta(
          'product_colors',
          options.colorId,
          'quantity',
          change
        );
        console.log(`[DeltaInventory] Color ${options.colorId} stock delta: ${change}`);
      } else {
        // تحديث كمية المنتج مباشرة
        await deltaWriteService.stockDelta(
          'products',
          productId,
          'stock_quantity',
          change
        );
        console.log(`[DeltaInventory] Product ${productId} stock delta: ${change}`);
      }

      return { success: true };
    } catch (error) {
      console.error('[DeltaInventoryService] updateStock error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * تحديث مخزون متعدد (للطلبات)
   * يُستخدم عند إتمام طلب POS مع عدة منتجات
   */
  async batchStockUpdate(updates: VariantStockUpdate[]): Promise<{
    success: boolean;
    results: StockUpdateResult[];
    failedCount: number;
  }> {
    const results: StockUpdateResult[] = [];
    let failedCount = 0;

    for (const update of updates) {
      const result = await this.updateStock(update.productId, update.change, {
        colorId: update.colorId,
        sizeId: update.sizeId
      });

      results.push(result);
      if (!result.success) {
        failedCount++;
      }
    }

    return {
      success: failedCount === 0,
      results,
      failedCount
    };
  }

  /**
   * تحديث المخزون من عناصر طلب POS
   * يستخلص معلومات المتغيرات ويقوم بتحديث المخزون
   */
  async updateStockFromOrderItems(
    items: Array<{
      productId: string;
      quantity: number;
      variant_info?: {
        colorId?: string | null;
        sizeId?: string | null;
      } | null;
    }>
  ): Promise<{ success: boolean; failedCount: number }> {
    const updates: VariantStockUpdate[] = items.map(item => ({
      productId: item.productId,
      colorId: item.variant_info?.colorId,
      sizeId: item.variant_info?.sizeId,
      change: -Math.abs(item.quantity) // سالب لأننا نبيع
    }));

    const result = await this.batchStockUpdate(updates);

    if (result.failedCount > 0) {
      console.warn(`[DeltaInventoryService] ${result.failedCount} stock updates failed`);
    }

    return {
      success: result.success,
      failedCount: result.failedCount
    };
  }

  /**
   * استعادة المخزون (عند إلغاء طلب)
   */
  async restoreStockFromOrderItems(
    items: Array<{
      productId: string;
      quantity: number;
      variant_info?: {
        colorId?: string | null;
        sizeId?: string | null;
      } | null;
    }>
  ): Promise<{ success: boolean; failedCount: number }> {
    const updates: VariantStockUpdate[] = items.map(item => ({
      productId: item.productId,
      colorId: item.variant_info?.colorId,
      sizeId: item.variant_info?.sizeId,
      change: Math.abs(item.quantity) // موجب لأننا نستعيد
    }));

    const result = await this.batchStockUpdate(updates);

    return {
      success: result.success,
      failedCount: result.failedCount
    };
  }
}

// Export singleton instance
export const deltaInventoryService = new DeltaInventoryServiceClass();

// Export class for testing
export { DeltaInventoryServiceClass as DeltaInventoryService };
