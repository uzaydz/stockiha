import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { useAppInitialization } from '@/context/AppInitializationContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/components/ui/use-toast';
import { useCallback, useState, useEffect } from 'react';
import { POSSettings, defaultPOSSettings } from '@/types/posSettings';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';

// =====================================================
// 🚀 Hook مخصص لإعدادات POS فقط - يمنع التكرار
// =====================================================

interface POSSettingsResponse {
  success: boolean;
  data?: POSSettings;
  error?: string;
}

interface UsePOSSettingsProps {
  organizationId?: string;
}

interface UsePOSSettingsReturn {
  settings: POSSettings;
  isLoading: boolean;
  error: string | null;
  updateSettings: (newSettings: Partial<POSSettings>) => void;
  saveSettings: () => Promise<void>;
  isSaving: boolean;
  saveSuccess: boolean;
  hasPermission: () => boolean;
}

export const usePOSSettings = ({ organizationId }: UsePOSSettingsProps): UsePOSSettingsReturn => {
  const { currentOrganization } = useTenant();
  const { userProfile } = useAuth();
  const { posSettings: appInitPosSettings, isLoading: appInitLoading } = useAppInitialization(); // ✅ استخدام البيانات من AppInitializationContext
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const resolvedOrganizationId = organizationId || currentOrganization?.id || '';
  // دمج الإعدادات المحفوظة مع الافتراضية لضمان وجود كل الحقول
  // ⚠️ ملاحظة: حقول الطابعة (printer_type, silent_print, etc) تأتي من local_printer_settings
  //    عبر usePrinterSettings وليس من هنا
  const mergeWithDefaults = (saved: Partial<POSSettings> | null): POSSettings => ({
    ...defaultPOSSettings,
    ...(saved || {}),
    organization_id: resolvedOrganizationId,
    // حقول الوصل المشتركة (موجودة في pos_settings)
    receipt_template: saved?.receipt_template ?? defaultPOSSettings.receipt_template,
    item_display_style: saved?.item_display_style ?? defaultPOSSettings.item_display_style,
    paper_width: saved?.paper_width ?? defaultPOSSettings.paper_width,
    font_size: saved?.font_size ?? defaultPOSSettings.font_size,
    line_spacing: saved?.line_spacing ?? defaultPOSSettings.line_spacing,
    print_density: saved?.print_density ?? defaultPOSSettings.print_density,
    auto_cut: saved?.auto_cut ?? defaultPOSSettings.auto_cut,
  });

  const [localSettings, setLocalSettings] = useState<POSSettings>(() =>
    mergeWithDefaults(null)
  );
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // دالة التحقق من الصلاحيات — موحّدة مع PermissionGuard
  const perms = usePermissions();
  const hasPermission = useCallback(() => {
    // إن توفر مزود الصلاحيات، استخدمه كمصدر وحيد
    if (perms && perms.ready) {
      return (
        perms.isSuperAdmin ||
        perms.isOrgAdmin ||
        perms.has('manageOrganizationSettings') ||
        // دعم قديم إذا تم تعريفه
        perms.has('managePOSSettings') ||
        // تسهيلات الوصول لمن لديه وصول POS عام
        perms.has('accessPOS') ||
        perms.has('manageOrders')
      );
    }

    // فالباك قديم عندما لا تتوفر PermissionsContext
    if (!userProfile) return false;
    if (userProfile.is_super_admin === true) return true;
    if (userProfile.is_org_admin === true) return true;
    if (userProfile.role === 'admin' || userProfile.role === 'owner') return true;
    const permissions = (userProfile.permissions || {}) as any;
    return (
      permissions.manageOrganizationSettings === true ||
      permissions.managePOSSettings === true ||
      permissions.accessPOS === true ||
      permissions.manageOrders === true
    );
  }, [perms, userProfile]);

  const {
    data: response,
    isLoading,
    error
  } = useQuery({
    queryKey: ['pos-settings', currentOrganization?.id],
    queryFn: async (): Promise<POSSettingsResponse> => {
      if (!currentOrganization?.id) {
        throw new Error('معرف المؤسسة مطلوب');
      }

      // التحقق من الصلاحيات أولاً
      if (!hasPermission()) {
        throw new Error('ليس لديك صلاحية للوصول إلى إعدادات نقطة البيع');
      }

      // ✅ استخدام البيانات من AppInitializationContext أولاً
      if (appInitPosSettings) {
        console.log('✅ [usePOSSettings] استخدام البيانات من AppInitializationContext');
        return {
          success: true,
          data: appInitPosSettings as POSSettings
        };
      }

      // ⚡ استخدام PowerSync مباشرة Offline-First
      // ⚠️ تحديد الأعمدة الموجودة فقط في pos_settings (بدون printer_type, etc)
      try {
        const settings = await powerSyncService.queryOne<Partial<POSSettings>>({
          sql: `SELECT
            id, organization_id,
            store_name, store_phone, store_email, store_address, store_website, store_logo_url,
            receipt_header_text, receipt_footer_text, welcome_message,
            show_qr_code, show_tracking_code, show_customer_info, show_store_logo,
            show_store_info, show_date_time, show_employee_name,
            paper_width, font_size, line_spacing, print_density, auto_cut,
            primary_color, secondary_color, text_color, background_color,
            receipt_template, header_style, footer_style, item_display_style, price_position,
            custom_css, currency_symbol, currency_position, tax_label, tax_number,
            business_license, activity, rc, nif, nis, rib,
            allow_price_edit, require_manager_approval,
            created_at, updated_at
          FROM pos_settings WHERE organization_id = ? LIMIT 1`,
          params: [currentOrganization.id]
        });

        if (settings) {
          return {
            success: true,
            data: { ...defaultPOSSettings, ...settings, organization_id: currentOrganization.id } as POSSettings
          };
        }

        // إرجاع الإعدادات الافتراضية إذا لم توجد
        return {
          success: true,
          data: { ...defaultPOSSettings, organization_id: currentOrganization.id }
        };
      } catch (error) {
        console.error('[usePOSSettings] Error loading settings:', error);
        // في حالة الخطأ، نعيد الإعدادات الافتراضية بدلاً من الفشل
        return {
          success: true,
          data: { ...defaultPOSSettings, organization_id: currentOrganization.id }
        };
      }
    },
    enabled: !!currentOrganization?.id && hasPermission(),
    staleTime: 5 * 60 * 1000, // 5 دقائق
    gcTime: 10 * 60 * 1000, // 10 دقائق
    networkMode: 'always', // ⚡ يعمل Offline-First
    retry: 1
  });

  // ⚡ تحديث الإعدادات محلياً
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<POSSettings>): Promise<void> => {
      if (!currentOrganization?.id) throw new Error('Organization ID required');

      const now = new Date().toISOString();
      if (!powerSyncService.db) {
        console.warn('[usePOSSettings] PowerSync DB not initialized');
        return null;
      }
      const existing = await powerSyncService.queryOne<{ id: string }>({
        sql: 'SELECT id FROM pos_settings WHERE organization_id = ? LIMIT 1',
        params: [currentOrganization.id]
      });

      // ⚠️ حقول الطابعة المتقدمة - تُحفظ في local_printer_settings وليس هنا
      const PRINTER_FIELDS = [
        'printer_name', 'printer_type', 'silent_print', 'print_copies',
        'open_cash_drawer', 'print_on_order', 'beep_after_print',
        'margin_top', 'margin_bottom', 'margin_left', 'margin_right'
      ];

      if (existing) {
        await powerSyncService.transaction(async (tx) => {
          // استبعاد حقول الطابعة من التحديث
          const updateKeys = Object.keys(newSettings).filter(k =>
            k !== 'id' &&
            k !== 'organization_id' &&
            k !== 'created_at' &&
            !PRINTER_FIELDS.includes(k)
          );

          if (updateKeys.length === 0) {
            console.log('[usePOSSettings] No valid fields to update');
            return;
          }

          const setClause = [...updateKeys, 'updated_at'].map(k => `${k} = ?`).join(', ');
          const values = [...updateKeys.map(k => (newSettings as any)[k]), now, currentOrganization.id];

          await tx.execute(
            `UPDATE pos_settings SET ${setClause} WHERE organization_id = ?`,
            values
          );
        });
      } else {
        await powerSyncService.transaction(async (tx) => {
          // استبعاد حقول الطابعة من الإدراج
          const settingsData = {
            ...defaultPOSSettings,
            ...newSettings,
            organization_id: currentOrganization.id,
            created_at: now,
            updated_at: now
          };

          // إزالة حقول الطابعة
          PRINTER_FIELDS.forEach(field => {
            delete (settingsData as any)[field];
          });

          const columns = Object.keys(settingsData);
          const placeholders = columns.map(() => '?').join(', ');
          const values = columns.map(col => (settingsData as any)[col]);

          await tx.execute(
            `INSERT INTO pos_settings (${columns.join(', ')}) VALUES (${placeholders})`,
            values
          );
        });
      }

      queryClient.invalidateQueries({ queryKey: ['pos-settings', currentOrganization.id] });
    }
  });

  const updateSettings = useCallback((newSettings: Partial<POSSettings>) => {
    setLocalSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const saveSettings = useCallback(async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await updateSettingsMutation.mutateAsync(localSettings);
      setSaveSuccess(true);
      toast({
        title: 'تم الحفظ',
        description: 'تم حفظ إعدادات نقطة البيع بنجاح'
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل حفظ الإعدادات'
      });
    } finally {
      setIsSaving(false);
    }
  }, [localSettings, updateSettingsMutation, toast]);

  // تحديث الإعدادات المحلية عند جلبها من الـ query مع دمج القيم الافتراضية
  useEffect(() => {
    if (response?.success && response.data) {
      setLocalSettings(mergeWithDefaults(response.data));
    }
  }, [response]);

  return {
    settings: localSettings,
    isLoading: isLoading || appInitLoading,
    error: response?.error || error?.message || null,
    updateSettings,
    saveSettings,
    isSaving: isSaving || updateSettingsMutation.isPending,
    saveSuccess,
    hasPermission
  };
};


export default usePOSSettings;
