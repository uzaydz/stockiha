import { useCallback, useEffect, useMemo, useState } from 'react';
import { getDeviceId } from '@/api/localPrinterSettingsService';

export type RepairReceiptSettings = {
  // أقسام الوصل
  showCustomerReceipt: boolean;
  showAdminReceipt: boolean;

  // معلومات المتجر
  showStoreLogo: boolean;
  showStoreInfo: boolean;

  // أكواد QR
  showTrackingQr: boolean;
  trackingQrSize: number;
  showCompleteQr: boolean;
  completeQrSize: number;

  // تفاصيل إضافية
  showQueuePosition: boolean;
  showWarrantyAndTerms: boolean;
};

export const DEFAULT_REPAIR_RECEIPT_SETTINGS: RepairReceiptSettings = {
  showCustomerReceipt: true,
  showAdminReceipt: true,
  showStoreLogo: true,
  showStoreInfo: true,
  showTrackingQr: true,
  trackingQrSize: 100,
  showCompleteQr: true,
  completeQrSize: 80,
  showQueuePosition: true,
  showWarrantyAndTerms: true,
};

function getStorageKey(organizationId: string, deviceId: string) {
  return `repair_receipt_settings:${organizationId}:${deviceId}`;
}

function safeParse(json: string | null): unknown {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function useRepairReceiptSettings(organizationId: string | null | undefined) {
  const deviceId = useMemo(() => getDeviceId(), []);
  const storageKey = useMemo(() => (organizationId ? getStorageKey(organizationId, deviceId) : null), [organizationId, deviceId]);

  const [settings, setSettings] = useState<RepairReceiptSettings>(DEFAULT_REPAIR_RECEIPT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadFromStorage = useCallback(() => {
    if (!storageKey) return;
    const parsed = safeParse(localStorage.getItem(storageKey));
    if (parsed && typeof parsed === 'object') {
      setSettings({ ...DEFAULT_REPAIR_RECEIPT_SETTINGS, ...(parsed as Partial<RepairReceiptSettings>) });
    } else {
      setSettings(DEFAULT_REPAIR_RECEIPT_SETTINGS);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    loadFromStorage();
    setIsLoaded(true);
  }, [loadFromStorage, storageKey]);

  useEffect(() => {
    if (!storageKey) return;

    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey) {
        loadFromStorage();
      }
    };

    const onLocalChange = (e: Event) => {
      const ce = e as CustomEvent<{ storageKey?: string }>;
      if (ce.detail?.storageKey === storageKey) {
        loadFromStorage();
      }
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('repair-receipt-settings-changed', onLocalChange as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('repair-receipt-settings-changed', onLocalChange as EventListener);
    };
  }, [loadFromStorage, storageKey]);

  const save = useCallback(async (next?: RepairReceiptSettings) => {
    if (!storageKey) return;
    const toSave = next ?? settings;
    localStorage.setItem(storageKey, JSON.stringify(toSave));
    window.dispatchEvent(new CustomEvent('repair-receipt-settings-changed', { detail: { storageKey } }));
  }, [settings, storageKey]);

  const updateSetting = useCallback(<K extends keyof RepairReceiptSettings>(key: K, value: RepairReceiptSettings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      if (storageKey) {
        localStorage.setItem(storageKey, JSON.stringify(next));
        window.dispatchEvent(new CustomEvent('repair-receipt-settings-changed', { detail: { storageKey } }));
      }
      return next;
    });
  }, [storageKey]);

  const reset = useCallback(() => {
    setSettings(DEFAULT_REPAIR_RECEIPT_SETTINGS);
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(DEFAULT_REPAIR_RECEIPT_SETTINGS));
      window.dispatchEvent(new CustomEvent('repair-receipt-settings-changed', { detail: { storageKey } }));
    }
  }, [storageKey]);

  return { settings, updateSetting, reset, save, isLoaded, deviceId };
}
