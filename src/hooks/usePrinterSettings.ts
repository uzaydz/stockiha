/**
 * usePrinterSettings - Hook لإدارة إعدادات الطابعة المحلية
 *
 * ⚡ يجمع بين:
 * - إعدادات POS المُزامنة (اسم المتجر، الشعار، إلخ)
 * - إعدادات الطابعة المحلية (اسم الطابعة، الطباعة الصامتة، إلخ)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '@/context/TenantContext';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  localPrinterSettingsService,
  LocalPrinterSettings,
  DEFAULT_PRINTER_SETTINGS,
  getDeviceId
} from '@/api/localPrinterSettingsService';
import { usePOSSettings } from '@/hooks/usePOSSettings';

// ========================================
// Types
// ========================================

export interface CombinedPrintSettings {
  // من POS Settings (مُزامنة)
  store_name?: string;
  store_address?: string;
  store_phone?: string;
  store_logo_url?: string;
  receipt_header_text?: string;
  receipt_footer_text?: string;
  welcome_message?: string;
  show_qr_code?: boolean;
  show_tracking_code?: boolean;
  show_customer_info?: boolean;
  show_store_logo?: boolean;
  show_store_info?: boolean;
  show_date_time?: boolean;
  show_employee_name?: boolean;
  currency_symbol?: string;
  currency_position?: 'before' | 'after';
  tax_label?: string;
  // المعلومات التجارية
  activity?: string;
  rc?: string;
  nif?: string;
  nis?: string;
  rib?: string;

  // من Printer Settings (محلية)
  printer_name?: string | null;
  printer_type: 'thermal' | 'normal';
  silent_print: boolean;
  print_on_order: boolean;
  print_copies: number;
  open_cash_drawer: boolean;
  beep_after_print: boolean;
  auto_cut: boolean;
  paper_width: number;
  margin_top: number;
  margin_bottom: number;
  margin_left: number;
  margin_right: number;
  font_size: number;
  line_spacing: number;
  print_density: 'light' | 'normal' | 'dark';
  receipt_template: 'apple' | 'minimal' | 'modern' | 'classic';
  item_display_style: 'compact' | 'table' | 'list';
}

export interface UsePrinterSettingsReturn {
  // الإعدادات المجمعة
  settings: CombinedPrintSettings;
  // إعدادات الطابعة المحلية فقط
  printerSettings: LocalPrinterSettings;
  // حالة التحميل
  isLoading: boolean;
  isSaving: boolean;
  // تحديث إعدادات الطابعة
  updatePrinterSetting: <K extends keyof LocalPrinterSettings>(
    key: K,
    value: LocalPrinterSettings[K]
  ) => void;
  // حفظ إعدادات الطابعة
  savePrinterSettings: () => Promise<void>;
  // إعادة تعيين للقيم الافتراضية
  resetPrinterSettings: () => Promise<void>;
  // معرف الجهاز
  deviceId: string;
}

// ========================================
// Hook
// ========================================

export const usePrinterSettings = (): UsePrinterSettingsReturn => {
  const { currentOrganization } = useTenant();
  const queryClient = useQueryClient();
  const organizationId = currentOrganization?.id || '';
  const deviceId = getDeviceId();

  // جلب إعدادات POS المُزامنة
  const { settings: posSettings, isLoading: posLoading } = usePOSSettings({
    organizationId
  });

  // حالة محلية لإعدادات الطابعة
  const [localSettings, setLocalSettings] = useState<LocalPrinterSettings>({
    ...DEFAULT_PRINTER_SETTINGS,
    organization_id: organizationId,
    device_id: deviceId,
  });

  // جلب إعدادات الطابعة المحلية
  const {
    data: printerSettings,
    isLoading: printerLoading,
  } = useQuery({
    queryKey: ['local-printer-settings', organizationId, deviceId],
    queryFn: async () => {
      if (!organizationId) return null;
      return localPrinterSettingsService.getWithDefaults(organizationId);
    },
    enabled: !!organizationId,
    staleTime: Infinity, // محلي فقط - لا حاجة للتحديث
  });

  // تحديث الحالة المحلية عند جلب البيانات
  useEffect(() => {
    if (printerSettings) {
      setLocalSettings(printerSettings);
    }
  }, [printerSettings]);

  // تحديث حقل في الإعدادات المحلية
  const updatePrinterSetting = useCallback(<K extends keyof LocalPrinterSettings>(
    key: K,
    value: LocalPrinterSettings[K]
  ) => {
    setLocalSettings(prev => {
      const next = {
        ...prev,
        [key]: value,
      };
      queryClient.setQueryData(['local-printer-settings', organizationId, deviceId], next);
      return next;
    });
  }, [deviceId, organizationId, queryClient]);

  // حفظ إعدادات الطابعة
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error('Organization ID required');
      await localPrinterSettingsService.save({
        ...localSettings,
        organization_id: organizationId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['local-printer-settings', organizationId, deviceId]
      });
      toast.success('تم حفظ إعدادات الطابعة');
    },
    onError: (error) => {
      console.error('[usePrinterSettings] Save error:', error);
      toast.error('فشل حفظ إعدادات الطابعة');
    },
  });

  const savePrinterSettings = useCallback(async () => {
    await saveMutation.mutateAsync();
  }, [saveMutation]);

  // إعادة تعيين للقيم الافتراضية
  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error('Organization ID required');
      await localPrinterSettingsService.reset(organizationId);
    },
    onSuccess: () => {
      setLocalSettings({
        ...DEFAULT_PRINTER_SETTINGS,
        organization_id: organizationId,
        device_id: deviceId,
      });
      queryClient.invalidateQueries({
        queryKey: ['local-printer-settings', organizationId, deviceId]
      });
      toast.success('تم إعادة تعيين الإعدادات');
    },
  });

  const resetPrinterSettings = useCallback(async () => {
    await resetMutation.mutateAsync();
  }, [resetMutation]);

  // دمج الإعدادات
  const combinedSettings: CombinedPrintSettings = {
    // من POS Settings
    store_name: posSettings?.store_name,
    store_address: posSettings?.store_address,
    store_phone: posSettings?.store_phone,
    store_logo_url: posSettings?.store_logo_url,
    receipt_header_text: posSettings?.receipt_header_text,
    receipt_footer_text: posSettings?.receipt_footer_text,
    welcome_message: posSettings?.welcome_message,
    show_qr_code: posSettings?.show_qr_code,
    show_tracking_code: posSettings?.show_tracking_code,
    show_customer_info: posSettings?.show_customer_info,
    show_store_logo: posSettings?.show_store_logo,
    show_store_info: posSettings?.show_store_info,
    show_date_time: posSettings?.show_date_time,
    show_employee_name: posSettings?.show_employee_name,
    currency_symbol: posSettings?.currency_symbol || 'دج',
    currency_position: posSettings?.currency_position || 'after',
    tax_label: posSettings?.tax_label,
    activity: posSettings?.activity,
    rc: posSettings?.rc,
    nif: posSettings?.nif,
    nis: posSettings?.nis,
    rib: posSettings?.rib,

    // من Printer Settings (محلية)
    printer_name: localSettings.printer_name,
    printer_type: localSettings.printer_type,
    silent_print: localSettings.silent_print,
    print_on_order: localSettings.print_on_order,
    print_copies: localSettings.print_copies,
    open_cash_drawer: localSettings.open_cash_drawer,
    beep_after_print: localSettings.beep_after_print,
    auto_cut: localSettings.auto_cut,
    paper_width: localSettings.paper_width,
    margin_top: localSettings.margin_top,
    margin_bottom: localSettings.margin_bottom,
    margin_left: localSettings.margin_left,
    margin_right: localSettings.margin_right,
    font_size: localSettings.font_size,
    line_spacing: localSettings.line_spacing,
    print_density: localSettings.print_density,
    receipt_template: localSettings.receipt_template,
    item_display_style: localSettings.item_display_style,
  };

  return {
    settings: combinedSettings,
    printerSettings: localSettings,
    isLoading: posLoading || printerLoading,
    isSaving: saveMutation.isPending || resetMutation.isPending,
    updatePrinterSetting,
    savePrinterSettings,
    resetPrinterSettings,
    deviceId,
  };
};

export default usePrinterSettings;
