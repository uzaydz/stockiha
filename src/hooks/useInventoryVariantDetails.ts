import { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  fetchProductInventoryDetails,
  fetchInventoryLog,
  updateVariantInventory,
  syncInventoryLevels,
  type InventoryVariant,
  type InventoryVariantSize,
} from '@/services/InventoryService';
import type { InventoryLogEntry } from '@/lib/api/inventory-variants-api';
import { InventoryServiceError } from '@/services/InventoryService';

export interface VariantQuantityUpdate {
  variantId: string | null;
  newQuantity: number;
  notes?: string;
  operationType?: string;
}

export function useInventoryVariantDetails(productId: string | null) {
  const [logEnabled, setLogEnabled] = useState(false);

  const {
    data: details,
    error: detailsError,
    isLoading: detailsLoading,
    mutate: mutateDetails,
    isValidating: detailsValidating,
  } = useSWR(productId ? ['inventory:product-details', productId] : null, () => fetchProductInventoryDetails(productId!));

  const {
    data: logEntries,
    error: logError,
    isLoading: logLoading,
    mutate: mutateLog,
  } = useSWR<InventoryLogEntry[]>(logEnabled && productId ? ['inventory:product-log', productId] : null, () => fetchInventoryLog(productId!, 50), {
    revalidateOnFocus: false,
  });

  const variants = useMemo<InventoryVariant[]>(() => details?.variants ?? [], [details]);

  const variantSizesMap = useMemo<Record<string, InventoryVariantSize[]>>(() => {
    return variants.reduce<Record<string, InventoryVariantSize[]>>((acc, variant) => {
      acc[variant.id] = variant.sizes;
      return acc;
    }, {});
  }, [variants]);

  const refreshDetails = useCallback(async () => {
    await mutateDetails();
  }, [mutateDetails]);

  const refreshLog = useCallback(async () => {
    if (!productId) return;
    await mutateLog();
  }, [mutateLog, productId]);

  const ensureVariantExists = useCallback(
    (variantId: string | null) => {
      if (!variants.length) return null;
      const match = variants.find((variant) => variant.variantId === variantId || variant.id === variantId);
      if (match) {
        return match;
      }

      // البحث داخل الأحجام
      for (const variant of variants) {
        const size = variant.sizes.find((entry) => entry.id === variantId || entry.sizeId === variantId);
        if (size) {
          return { ...variant, quantity: size.quantity, sizes: [size] };
        }
      }

      return null;
    },
    [variants]
  );

  const applyVariantUpdate = useCallback(
    async (update: VariantQuantityUpdate) => {
      if (!productId) {
        throw new InventoryServiceError('Product id is required');
      }
      await updateVariantInventory({
        productId,
        variantId: update.variantId ?? null,
        newQuantity: update.newQuantity,
        notes: update.notes,
        operationType: update.operationType,
      });
      await mutateDetails();
    },
    [productId, mutateDetails]
  );

  const handleBulkUpdate = useCallback(
    async (updates: Array<{ variantId: string | null; newQuantity: number; notes?: string; operationType?: string }>) => {
      if (!updates.length) return;

      await Promise.all(
        updates.map((update) =>
          updateVariantInventory({
            productId: productId!,
            variantId: update.variantId,
            newQuantity: update.newQuantity,
            notes: update.notes,
            operationType: update.operationType,
          })
        )
      );

      await mutateDetails();
    },
    [productId, mutateDetails]
  );

  const runSync = useCallback(async () => {
    if (!productId) {
      throw new InventoryServiceError('Product id is required');
    }
    await syncInventoryLevels(productId);
    await mutateDetails();
  }, [productId, mutateDetails]);

  const enableLog = useCallback(() => setLogEnabled(true), []);

  return {
    details,
    variants,
    variantSizesMap,
    isLoading: detailsLoading,
    isValidating: detailsValidating,
    error: detailsError as InventoryServiceError | undefined,
    refresh: refreshDetails,
    ensureVariantExists,
    updateVariant: applyVariantUpdate,
    applyBulkUpdate: handleBulkUpdate,
    syncInventory: runSync,
    logEntries,
    logError: logError as InventoryServiceError | undefined,
    isLogLoading: logLoading,
    loadLog: enableLog,
    refreshLog,
  };
}
