/**
 * 📦 Purchase Components Index
 * ============================================================
 *
 * تصدير جميع مكونات نظام المشتريات الذكي
 *
 * ============================================================
 */

// المكونات الرئيسية
export { PurchasesTabPage } from './PurchasesTabPage';
export { SmartPurchasePage } from './SmartPurchasePage';
export { SmartPurchaseRow, CompactPurchaseRow, TurboPurchaseRow } from './SmartPurchaseRow';
export { VariantMatrix, VariantMatrixButton } from './VariantMatrix';
export { UnitSelector, CompactUnitSelector, UnitBadge } from './UnitSelector';
export { LandedCostsPanel, LandedCostsSummary } from './LandedCostsPanel';

// إعادة تصدير الأنواع المهمة
export type {
  SmartPurchaseItem,
  SmartPurchase,
  LandedCost,
  LandedCostType,
  CostDistributionMethod,
  PurchaseUnitType,
  UnitInfo,
  VariantColor,
  VariantSize,
  VariantMatrixCell,
  TurboModeSettings,
} from '../types/smart-purchase.types';
