// INVENTORY SYNC DISABLED - تم تعطيل مزامنة المخزون لتوفير الذاكرة

// Mock hook for compatibility
export const useInventorySync = () => {
  return {
    unsyncedCount: 0,
    isSyncing: false,
    lastSyncTime: null,
    triggerSync: () => Promise.resolve(),
    isOnline: navigator.onLine
  };
};
