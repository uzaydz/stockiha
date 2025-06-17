// POSOrders Components - نقطة البيع
// Export all POS orders related components

// Original components
export { POSOrderStats } from './POSOrderStats';
export { POSOrderFilters } from './POSOrderFilters';
export { POSOrdersTable } from './POSOrdersTable';
export { POSOrderDetails } from './POSOrderDetails';
export { POSOrderActions } from './POSOrderActions';

// Optimized components
export { POSOrderStatsOptimized } from './POSOrderStatsOptimized';
export { POSOrderFiltersOptimized } from './POSOrderFiltersOptimized';
export { POSOrdersTableOptimized } from './POSOrdersTableOptimized';

// Default exports for lazy loading
export { default } from './POSOrderStats';
export { default as POSOrderStatsDefault } from './POSOrderStats';
export { default as POSOrderFiltersDefault } from './POSOrderFilters';
export { default as POSOrdersTableDefault } from './POSOrdersTable';
export { default as POSOrderDetailsDefault } from './POSOrderDetails';
export { default as POSOrderActionsDefault } from './POSOrderActions';

// Optimized defaults
export { default as POSOrderStatsOptimizedDefault } from './POSOrderStatsOptimized';
export { default as POSOrderFiltersOptimizedDefault } from './POSOrderFiltersOptimized';
export { default as POSOrdersTableOptimizedDefault } from './POSOrdersTableOptimized';

// Re-export types and service
export type { 
  POSOrderWithDetails,
  POSOrderFilters,
  POSOrderStats 
} from '../../api/posOrdersService';

export { POSOrdersService } from '../../api/posOrdersService';
