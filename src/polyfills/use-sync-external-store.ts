/**
 * Polyfill for use-sync-external-store for React 19
 * React 19 has useSyncExternalStore built-in, but some libraries still
 * try to import from the external package.
 */

import { useSyncExternalStore as useSyncExternalStoreReact } from 'react';

// Re-export the base hook
export { useSyncExternalStore } from 'react';

// Export the hook with the same interface as the package
export function useSyncExternalStoreWithSelector<Snapshot, Selection>(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => Snapshot,
  getServerSnapshot: undefined | null | (() => Snapshot),
  selector: (snapshot: Snapshot) => Selection,
  isEqual?: (a: Selection, b: Selection) => boolean
): Selection {
  // Use React's built-in useSyncExternalStore
  const snapshot = useSyncExternalStoreReact(subscribe, getSnapshot, getServerSnapshot);

  // Apply selector
  const selection = selector(snapshot);

  // For simplicity, we're not implementing isEqual optimization here
  // as React 19's built-in hook already handles most optimizations
  return selection;
}

// Default export for CJS compatibility
export default useSyncExternalStoreWithSelector;
