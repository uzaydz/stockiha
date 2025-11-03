import { queryClient } from '@/lib/config/queryClient';
import { computeAvailableStock } from '@/lib/stock';

type Any = any;

// يستبدل المنتج في جميع كاشات استعلام unified-pos-data بدون جلب من الخادم
export function replaceProductInPOSCache(updatedProduct: Any) {
  try {
    const queries = queryClient.getQueriesData<Any>({ queryKey: ['unified-pos-data'], exact: false });
    for (const [key, data] of queries) {
      if (!data || !data.success || !data.data || !Array.isArray(data.data.products)) continue;
      const nextProducts = data.data.products.map((p: Any) => {
        if (p.id !== updatedProduct.id) return p;
        const total = computeAvailableStock(updatedProduct);
        const next = {
          ...p,
          ...updatedProduct,
          stock_quantity: Number((updatedProduct as any).stock_quantity ?? total) || 0,
          stockQuantity: Number((updatedProduct as any).stock_quantity ?? total) || 0,
          actual_stock_quantity: Number((updatedProduct as any).actual_stock_quantity ?? total) || total,
          total_variants_stock: total
        };
        return next;
      });
      const nextData = {
        ...data,
        data: {
          ...data.data,
          products: nextProducts
        }
      };
      queryClient.setQueryData(key, nextData);
    }
  } catch (e) {
    // تجاهل أي أخطاء غير متوقعة
  }
}

// تحديث جزئي لقيم مخزون المنتج في الكاش (delta أو absolute)
export function bumpProductStockInPOSCache(productId: string, delta: number) {
  try {
    const queries = queryClient.getQueriesData<Any>({ queryKey: ['unified-pos-data'], exact: false });
    for (const [key, data] of queries) {
      if (!data || !data.success || !data.data || !Array.isArray(data.data.products)) continue;
      const nextProducts = data.data.products.map((p: Any) => {
        if (p.id !== productId) return p;
        const base = Number(p.actual_stock_quantity ?? p.stock_quantity ?? 0) || 0;
        const total = Math.max(0, base + delta);
        return {
          ...p,
          stock_quantity: total,
          stockQuantity: total,
          actual_stock_quantity: total,
          total_variants_stock: total
        };
      });
      const nextData = {
        ...data,
        data: {
          ...data.data,
          products: nextProducts
        }
      };
      queryClient.setQueryData(key, nextData);
    }
  } catch {}
}

// تحديث شامل لخصائص المنتج (الاسم، الحقول الأساسية) عبر جميع كاشات POS المعروفة
export function patchProductInAllPOSCaches(productId: string, patch: Any) {
  try {
    const applyPatch = (p: Any) => {
      if (p.id !== productId) return p;
      const merged = { ...p, ...patch };
      return merged;
    };

    // 1) unified-pos-data
    const unifiedQueries = queryClient.getQueriesData<Any>({ queryKey: ['unified-pos-data'], exact: false });
    for (const [key, data] of unifiedQueries) {
      if (!data?.success || !Array.isArray(data?.data?.products)) continue;
      const next = data.data.products.map(applyPatch);
      queryClient.setQueryData(key, { ...data, data: { ...data.data, products: next } });
    }

    // 2) pos-products (كل الصفحات/المعاملات)
    const posQueries = queryClient.getQueriesData<Any>({ queryKey: ['pos-products'], exact: false });
    for (const [key, data] of posQueries) {
      if (!data?.success || !Array.isArray(data?.data?.products)) continue;
      const next = data.data.products.map(applyPatch);
      queryClient.setQueryData(key, { ...data, data: { ...data.data, products: next } });
    }

    // 3) complete-pos-data
    const completeQueries = queryClient.getQueriesData<Any>({ queryKey: ['complete-pos-data'], exact: false });
    for (const [key, data] of completeQueries) {
      if (!data?.success || !Array.isArray(data?.data?.products)) continue;
      const next = data.data.products.map(applyPatch);
      queryClient.setQueryData(key, { ...data, data: { ...data.data, products: next } });
    }
  } catch {}
}
