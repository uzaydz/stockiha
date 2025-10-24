// دالة لمسح كاش المتجر بعد الحفظ
export const clearStoreCache = (organizationId: string) => {
  try {
    console.log('🧹 [clearStoreCache] بدء مسح الكاش للمؤسسة:', organizationId);
    
    // مسح localStorage بجميع المفاتيح المحتملة
    const keysToRemove = [
      'bazaar_store_unified_data',
      `store_init_data:${organizationId}`,
      `store_data:${organizationId}`,
      'store_basic_data',
      'store_components_cache'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log('🗑️ [clearStoreCache] تم حذف المفتاح:', key);
    });
    
    // مسح sessionStorage
    sessionStorage.clear();
    
    // مسح window object
    if (typeof window !== 'undefined') {
      (window as any).__EARLY_STORE_DATA__ = null;
      (window as any).__STORE_DATA__ = null;
      (window as any).__PREFETCHED_STORE_DATA__ = null;
      (window as any).__STORE_ORGANIZATION__ = null;
      (window as any).__STORE_SETTINGS__ = null;
      
      console.log('✅ [clearStoreCache] تم مسح window objects');
      
      // إطلاق حدث تحديث مع تأخير بسيط للسماح بحفظ البيانات
      setTimeout(() => {
        console.log('📢 [clearStoreCache] إطلاق حدث store_components_updated');
        window.dispatchEvent(new CustomEvent('store_components_updated', { 
          detail: { 
            organizationId,
            timestamp: Date.now(),
            source: 'OrganizationComponentsEditor'
          } 
        }));
      }, 100);
    }
  } catch (error) {
    console.error('❌ [clearStoreCache] خطأ في مسح الكاش:', error);
  }
};
