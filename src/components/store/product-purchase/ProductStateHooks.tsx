import React from 'react';

// Re-export from the new modular structure
export * from './state-hooks';

// Legacy exports for backward compatibility - will be removed in future versions
export { useProductState as useProductStateLegacy } from './state-hooks';
export { useStickyButtonLogic, useProductSelection, useProductPrice } from './state-hooks';
