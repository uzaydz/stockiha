// ULTRA FAST STORE SERVICE DISABLED - تم تعطيل خدمة المزامنة المكثفة

// Mock service for compatibility
export class UltraFastStoreService {
  private static instance: UltraFastStoreService;

  private constructor() {
    // DISABLED: No background sync
  }

  static getInstance(): UltraFastStoreService {
    if (!UltraFastStoreService.instance) {
      UltraFastStoreService.instance = new UltraFastStoreService();
    }
    return UltraFastStoreService.instance;
  }

  // Mock methods for compatibility
  async getStoreData() { return null; }
  async getProducts() { return []; }
  async getCategories() { return []; }
  async invalidateCache() {}
  async preloadData() {}
  cleanup() {}
}

export const ultraFastStoreService = UltraFastStoreService.getInstance();
