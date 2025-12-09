/**
 * Inventory Components Export
 * تصدير مكونات المخزون
 */

// المكونات الأساسية
export { default as InventoryModern } from './InventoryModern';
export { default as StockUpdateModern } from './StockUpdateModern';

// المكونات المتقدمة (الجديدة)
export { default as InventoryModernAdvanced } from './InventoryModernAdvanced';
export { default as StockUpdateAdvanced } from './StockUpdateAdvanced';
export type { StockUpdateParams } from './StockUpdateAdvanced';

// الأنواع
export * from './types';

// التصدير الافتراضي
export { default } from './InventoryModern';

