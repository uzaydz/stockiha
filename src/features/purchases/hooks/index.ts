/**
 * 🚀 Smart Purchase Hooks - Exports
 * ============================================================
 */

// ⚡ PowerSync Reactive Hooks
export {
  useReactivePurchases,
  useReactivePurchase,
  useReactivePurchaseStats,
  useSupplierPurchasesSummary,
  useReactivePurchaseCount,
  useReactiveRecentPurchases,
  useReactiveOverduePurchases,
  type ReactivePurchase,
  type ReactivePurchaseItem,
  type UseReactivePurchasesOptions,
  type UseReactivePurchasesResult,
} from './useReactivePurchases';

// 🔄 Unit Conversion
export {
  useUnitConversion,
  productToUnitConfig,
  getAvailableUnitsForProduct,
  formatQuantityWithUnit,
  formatCostPerUnit,
  type ProductUnitConfig,
  type UnitConversionResult,
} from './useUnitConversion';

// 💰 Smart Pricing
export {
  useSmartPricing,
  useBatchSmartPricing,
  calculateSuggestedPrice,
  calculateMargin,
  calculateCostFromMargin,
  calculatePriceFromMargin,
  formatPercentage,
  formatCurrency,
  getAlertColor,
  type PricingConfig,
  type SmartPricingResult,
  type BatchPricingItem,
  type BatchPricingResult,
} from './useSmartPricing';

// 📦 Landed Costs
export {
  useLandedCostDistributor,
  calculateFinalUnitCost,
  calculateLandedCostPercentage,
  createLandedCost,
  formatLandedCost,
  getLandedCostIcon,
  getDistributionMethodLabel,
  validateLandedCost,
  type LandedCostDistributorConfig,
  type ItemWithLandedCost,
  type LandedCostDistributorResult,
} from './useLandedCostDistributor';
