import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  getProductInventoryDetails,
  updateVariantInventory,
  syncInventoryLevels,
  getInventoryVariantsLog,
  getInventoryQuickSummary,
  bulkUpdateVariants,
  type ProductInventoryDetails,
  type VariantUpdateRequest,
  type VariantUpdateResponse,
  type InventoryLogEntry,
  type ProductVariant,
  type ProductSize
} from '@/lib/api/inventory-variants-api';

interface UseInventoryVariantsOptions {
  productId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableRealTimeUpdates?: boolean;
  cacheResults?: boolean;
}

interface UseInventoryVariantsState {
  // البيانات الأساسية
  inventoryDetails: ProductInventoryDetails | null;
  inventoryLog: InventoryLogEntry[];
  
  // حالة التحميل
  isLoading: boolean;
  isUpdating: boolean;
  isSyncing: boolean;
  isLoadingLog: boolean;
  
  // إدارة الأخطاء
  error: string | null;
  updateError: string | null;
  
  // معلومات الصفحات
  logPage: number;
  hasMoreLog: boolean;
  
  // إحصائيات سريعة
  quickSummary: {
    total_stock: number;
    variants_count: number;
    low_stock_count: number;
    out_of_stock_count: number;
    stock_status: string;
    last_update: string;
  } | null;
  
  // بيانات مؤقتة للتعديل
  editingVariant: {
    productId: string;
    variantId?: string;
    sizeId?: string;
    currentQuantity: number;
    newQuantity: number;
    notes: string;
  } | null;
  
  // معاينة التغييرات
  changePreview: {
    affectedLevels: any;
    estimatedImpact: string;
  } | null;
  
  // إحصائيات الأداء
  lastFetchTime: number;
  updateCount: number;
}

interface UseInventoryVariantsActions {
  // عمليات البيانات الأساسية
  loadInventoryDetails: (productId: string) => Promise<void>;
  refreshInventoryDetails: () => Promise<void>;
  
  // تحديث المخزون
  updateVariant: (request: VariantUpdateRequest) => Promise<VariantUpdateResponse>;
  bulkUpdateVariants: (updates: Array<{
    product_id: string;
    variant_id?: string;
    new_quantity: number;
    notes?: string;
  }>) => Promise<void>;
  
  // مزامنة المخزون
  syncInventory: () => Promise<void>;
  
  // سجل المخزون
  loadInventoryLog: (productId?: string, variantId?: string) => Promise<void>;
  loadMoreLog: () => Promise<void>;
  refreshLog: () => Promise<void>;
  
  // إدارة التعديل
  startEditingVariant: (productId: string, variantId?: string, sizeId?: string, currentQuantity?: number) => void;
  updateEditingQuantity: (newQuantity: number) => void;
  updateEditingNotes: (notes: string) => void;
  previewChanges: () => Promise<void>;
  cancelEditing: () => void;
  saveChanges: () => Promise<VariantUpdateResponse>;
  
  // إدارة الأخطاء
  clearError: () => void;
  clearUpdateError: () => void;
  
  // تحديث سريع
  quickRefresh: () => Promise<void>;
  
  // تصدير البيانات
  exportInventoryData: () => Promise<void>;
}

export type UseInventoryVariantsReturn = UseInventoryVariantsState & UseInventoryVariantsActions;

const DEFAULT_OPTIONS: UseInventoryVariantsOptions = {
  autoRefresh: false,
  refreshInterval: 30000, // 30 ثانية
  enableRealTimeUpdates: true,
  cacheResults: true
};

export function useInventoryVariants(
  options: UseInventoryVariantsOptions = {}
): UseInventoryVariantsReturn {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  // المراجع
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());
  
  // الحالة الأساسية
  const [state, setState] = useState<UseInventoryVariantsState>({
    inventoryDetails: null,
    inventoryLog: [],
    isLoading: false,
    isUpdating: false,
    isSyncing: false,
    isLoadingLog: false,
    error: null,
    updateError: null,
    logPage: 1,
    hasMoreLog: true,
    quickSummary: null,
    editingVariant: null,
    changePreview: null,
    lastFetchTime: 0,
    updateCount: 0
  });

  // تنظيف عند إلغاء التحميل
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // دالة cache مساعدة
  const getCachedData = useCallback((key: string) => {
    if (!config.cacheResults) return null;
    
    const cached = cacheRef.current.get(key);
    if (cached && Date.now() - cached.timestamp < 30000) { // 30 ثانية
      return cached.data;
    }
    return null;
  }, [config.cacheResults]);

  const setCachedData = useCallback((key: string, data: any) => {
    if (!config.cacheResults) return;
    
    cacheRef.current.set(key, { data, timestamp: Date.now() });
  }, [config.cacheResults]);

  // تحميل تفاصيل المخزون
  const loadInventoryDetails = useCallback(async (productId: string) => {
    try {
      // إلغاء الطلب السابق
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // تحقق من الـ cache
      const cacheKey = `inventory_details_${productId}`;
      const cachedData = getCachedData(cacheKey);
      
      if (cachedData) {
        setState(prev => ({
          ...prev,
          inventoryDetails: cachedData,
          isLoading: false,
          lastFetchTime: Date.now()
        }));
        return;
      }

      const details = await getProductInventoryDetails(productId);
      
      setState(prev => ({
        ...prev,
        inventoryDetails: details,
        isLoading: false,
        error: null,
        lastFetchTime: Date.now()
      }));

      // حفظ في الـ cache
      setCachedData(cacheKey, details);

      // تحميل الملخص السريع
      if (config.enableRealTimeUpdates) {
        const summary = await getInventoryQuickSummary(productId);
        setState(prev => ({ ...prev, quickSummary: summary }));
      }

    } catch (error: any) {
      if (error.name === 'AbortError') return;
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'خطأ في تحميل تفاصيل المخزون'
      }));
      
      toast.error('حدث خطأ أثناء تحميل تفاصيل المخزون');
    }
  }, [getCachedData, setCachedData, config.enableRealTimeUpdates]);

  // تحديث تفاصيل المخزون
  const refreshInventoryDetails = useCallback(async () => {
    if (!state.inventoryDetails?.product_id) return;
    
    // مسح الـ cache
    const cacheKey = `inventory_details_${state.inventoryDetails.product_id}`;
    cacheRef.current.delete(cacheKey);
    
    await loadInventoryDetails(state.inventoryDetails.product_id);
  }, [state.inventoryDetails?.product_id, loadInventoryDetails]);

  // تحديث المتغير
  const updateVariant = useCallback(async (request: VariantUpdateRequest): Promise<VariantUpdateResponse> => {
    try {
      setState(prev => ({ ...prev, isUpdating: true, updateError: null }));

      const response = await updateVariantInventory(request);

      setState(prev => ({
        ...prev,
        isUpdating: false,
        updateCount: prev.updateCount + 1
      }));

      // تحديث البيانات المحلية
      if (state.inventoryDetails?.product_id === request.product_id) {
        await refreshInventoryDetails();
      }

      toast.success(response.message);
      return response;

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isUpdating: false,
        updateError: error.message || 'خطأ في تحديث المخزون'
      }));
      
      toast.error(error.message || 'حدث خطأ أثناء تحديث المخزون');
      throw error;
    }
  }, [state.inventoryDetails?.product_id, refreshInventoryDetails]);

  // تحديث مجمع
  const bulkUpdateVariantsAction = useCallback(async (updates: Array<{
    product_id: string;
    variant_id?: string;
    quantity_change: number;
    notes?: string;
  }>) => {
    try {
      setState(prev => ({ ...prev, isUpdating: true, updateError: null }));

      const result = await bulkUpdateVariants(updates);

      setState(prev => ({
        ...prev,
        isUpdating: false,
        updateCount: prev.updateCount + 1
      }));

      toast.success(`تم تحديث ${result.success_count} متغير بنجاح`);
      
      // تحديث البيانات المحلية
      if (state.inventoryDetails?.product_id) {
        await refreshInventoryDetails();
      }

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isUpdating: false,
        updateError: error.message || 'خطأ في التحديث المجمع'
      }));
      
      toast.error(error.message || 'حدث خطأ أثناء التحديث المجمع');
    }
  }, [state.inventoryDetails?.product_id, refreshInventoryDetails]);

  // مزامنة المخزون
  const syncInventory = useCallback(async () => {
    if (!state.inventoryDetails?.product_id) return;

    try {
      setState(prev => ({ ...prev, isSyncing: true, error: null }));

      const result = await syncInventoryLevels(state.inventoryDetails.product_id);

      setState(prev => ({ ...prev, isSyncing: false }));

      if (result.success) {
        toast.success(result.message);
        await refreshInventoryDetails();
      } else {
        toast.error('فشلت مزامنة المخزون');
      }

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isSyncing: false,
        error: error.message || 'خطأ في مزامنة المخزون'
      }));
      
      toast.error('حدث خطأ أثناء مزامنة المخزون');
    }
  }, [state.inventoryDetails?.product_id, refreshInventoryDetails]);

  // تحميل سجل المخزون
  const loadInventoryLog = useCallback(async (productId?: string, limit: number = 50) => {
    try {
      setState(prev => ({ ...prev, isLoadingLog: true, error: null }));

      const log = await getInventoryVariantsLog(productId || '', limit);

      setState(prev => ({
        ...prev,
        inventoryLog: log,
        isLoadingLog: false,
        logPage: 1,
        hasMoreLog: log.length === limit
      }));

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoadingLog: false,
        error: error.message || 'خطأ في تحميل سجل المخزون'
      }));
      
      toast.error('حدث خطأ أثناء تحميل سجل المخزون');
    }
  }, []);

  // تحميل المزيد من السجل
  const loadMoreLog = useCallback(async () => {
    if (!state.hasMoreLog || state.isLoadingLog) return;

    try {
      setState(prev => ({ ...prev, isLoadingLog: true }));

      const nextPage = state.logPage + 1;
      const moreLog = await getInventoryVariantsLog(
        state.inventoryDetails?.product_id || '',
        50
      );

      setState(prev => ({
        ...prev,
        inventoryLog: [...prev.inventoryLog, ...moreLog],
        isLoadingLog: false,
        logPage: nextPage,
        hasMoreLog: moreLog.length === 50
      }));

    } catch (error: any) {
      setState(prev => ({ ...prev, isLoadingLog: false }));
      toast.error('حدث خطأ أثناء تحميل المزيد من السجل');
    }
  }, [state.hasMoreLog, state.isLoadingLog, state.logPage, state.inventoryDetails?.product_id]);

  // تحديث السجل
  const refreshLog = useCallback(async () => {
    await loadInventoryLog(state.inventoryDetails?.product_id);
  }, [state.inventoryDetails?.product_id, loadInventoryLog]);

  // إدارة التعديل
  const startEditingVariant = useCallback((productId: string, variantId?: string, sizeId?: string, currentQuantity?: number) => {
    setState(prev => ({
      ...prev,
      editingVariant: {
        productId,
        variantId,
        sizeId,
        currentQuantity: currentQuantity || 0,
        newQuantity: currentQuantity || 0,
        notes: ''
      },
      changePreview: null,
      updateError: null
    }));
  }, []);

  const updateEditingQuantity = useCallback((newQuantity: number) => {
    setState(prev => ({
      ...prev,
      editingVariant: prev.editingVariant ? {
        ...prev.editingVariant,
        newQuantity
      } : null,
      // مسح معاينة التغييرات السابقة
      changePreview: null
    }));
  }, []);

  const updateEditingNotes = useCallback((notes: string) => {
    setState(prev => ({
      ...prev,
      editingVariant: prev.editingVariant ? {
        ...prev.editingVariant,
        notes
      } : null
    }));
  }, []);

  const previewChanges = useCallback(async () => {
    if (!state.editingVariant) return;

    const quantityDiff = state.editingVariant.newQuantity - state.editingVariant.currentQuantity;
    const impactLevel = Math.abs(quantityDiff) > 100 ? 'عالي' : 
                       Math.abs(quantityDiff) > 20 ? 'متوسط' : 'منخفض';

    setState(prev => ({
      ...prev,
      changePreview: {
        affectedLevels: {
          quantity_change: quantityDiff,
          impact_level: impactLevel
        },
        estimatedImpact: `سيتم تغيير الكمية بـ ${quantityDiff > 0 ? '+' : ''}${quantityDiff} (تأثير ${impactLevel})`
      }
    }));
  }, [state.editingVariant]);

  const cancelEditing = useCallback(() => {
    setState(prev => ({
      ...prev,
      editingVariant: null,
      changePreview: null,
      updateError: null
    }));
  }, []);

  // حفظ التغييرات
  const saveChanges = useCallback(async (): Promise<VariantUpdateResponse> => {
    if (!state.editingVariant) {
      throw new Error('لا يوجد متغير قيد التعديل');
    }

    const { productId, variantId, sizeId, newQuantity, notes } = state.editingVariant;

    try {
      const response = await updateVariant({
        product_id: productId,
        variant_id: variantId,
        size_id: sizeId,
        quantity_change: newQuantity,
        operation_type: 'manual',
        notes: notes || undefined
      });

      setState(prev => ({
        ...prev,
        editingVariant: null,
        changePreview: null
      }));

      return response;

    } catch (error) {
      // الخطأ يتم التعامل معه في updateVariant
      throw error;
    }
  }, [state.editingVariant, updateVariant]);

  // دوال مساعدة
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const clearUpdateError = useCallback(() => {
    setState(prev => ({ ...prev, updateError: null }));
  }, []);

  const quickRefresh = useCallback(async () => {
    if (!state.inventoryDetails?.product_id) return;

    try {
      const summary = await getInventoryQuickSummary(state.inventoryDetails.product_id);
      setState(prev => ({ ...prev, quickSummary: summary }));
    } catch (error) {
    }
  }, [state.inventoryDetails?.product_id]);

  const exportInventoryData = useCallback(async () => {
    if (!state.inventoryDetails) return;

    try {
      const dataStr = JSON.stringify(state.inventoryDetails, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `inventory-${state.inventoryDetails.product_name}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('تم تصدير بيانات المخزون بنجاح');
    } catch (error) {
      toast.error('حدث خطأ أثناء تصدير البيانات');
    }
  }, [state.inventoryDetails]);

  // التحديث التلقائي
  useEffect(() => {
    if (config.autoRefresh && config.productId) {
      loadInventoryDetails(config.productId);
      
      refreshIntervalRef.current = setInterval(() => {
        quickRefresh();
      }, config.refreshInterval);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [config.autoRefresh, config.productId, config.refreshInterval, loadInventoryDetails, quickRefresh]);

  return {
    // الحالة
    ...state,
    
    // الإجراءات
    loadInventoryDetails,
    refreshInventoryDetails,
    updateVariant,
    bulkUpdateVariants: bulkUpdateVariantsAction,
    syncInventory,
    loadInventoryLog,
    loadMoreLog,
    refreshLog,
    startEditingVariant,
    updateEditingQuantity,
    updateEditingNotes,
    previewChanges,
    cancelEditing,
    saveChanges,
    clearError,
    clearUpdateError,
    quickRefresh,
    exportInventoryData
  };
}

export default useInventoryVariants;
