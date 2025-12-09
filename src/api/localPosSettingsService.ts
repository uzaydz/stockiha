/**
 * localPosSettingsService - خدمة إعدادات نقطة البيع المحلية
 *
 * ⚡ تم التحديث لاستخدام PowerSync بالكامل
 */

import type { LocalPOSSettings } from '@/database/localDb';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';

// ⚠️ حقول الطابعة المتقدمة - تُحفظ في local_printer_settings وليس هنا
const PRINTER_FIELDS = [
  'printer_name', 'printer_type', 'silent_print', 'print_copies',
  'open_cash_drawer', 'print_on_order', 'beep_after_print',
  'margin_top', 'margin_bottom', 'margin_left', 'margin_right'
];

export const localPosSettingsService = {
  async save(settings: LocalPOSSettings): Promise<void> {
    if (!settings?.organization_id) return;
    // ⚡ استخدام PowerSync مباشرة
    await powerSyncService.transaction(async (tx) => {
      // استبعاد حقول الطابعة - تُحفظ في local_printer_settings
      const keys = Object.keys(settings).filter(k =>
        k !== 'id' && !PRINTER_FIELDS.includes(k)
      );
      const values = keys.map(k => (settings as any)[k]);
      const placeholders = keys.map(() => '?').join(', ');
      const now = new Date().toISOString();

      await tx.execute(
        `INSERT INTO pos_settings (id, ${keys.join(', ')}, created_at, updated_at)
         VALUES (?, ${placeholders}, ?, ?)
         ON CONFLICT(id) DO UPDATE SET ${keys.map(k => `${k} = excluded.${k}`).join(', ')}, updated_at = ?`,
        [(settings as any).id || settings.organization_id, ...values, settings.created_at || now, settings.updated_at || now, now]
      );
    });
  },

  // اسم بديل للتوافق
  async saveSettings(settings: LocalPOSSettings): Promise<void> {
    return this.save(settings);
  },

  async get(organizationId: string): Promise<LocalPOSSettings | null> {
    if (!organizationId) return null;
    // ⚡ استخدام PowerSync مباشرة
    // ⚠️ تحديد الأعمدة الموجودة فقط (بدون printer_type, etc - تأتي من local_printer_settings)
    return await powerSyncService.get<LocalPOSSettings>(
      `SELECT
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
      FROM pos_settings WHERE organization_id = ?`,
      [organizationId]
    );
  },

  async clear(organizationId: string): Promise<void> {
    if (!organizationId) return;
    // ⚡ استخدام PowerSync مباشرة
    await powerSyncService.transaction(async (tx) => {
await tx.execute('DELETE FROM pos_settings WHERE organization_id = ?', [organizationId]);
    });
  },

  async markPending(organizationId: string, pending = true): Promise<void> {
    if (!organizationId) return;
    // ⚡ استخدام PowerSync مباشرة - نحتاج فقط للتحقق من الوجود
    const current = await powerSyncService.get<{ id: string }>(
      'SELECT id FROM pos_settings WHERE organization_id = ?',
      [organizationId]
    );
    if (current) {
      await powerSyncService.transaction(async (tx) => {
await tx.execute(
          'UPDATE pos_settings SET pending_sync = ?, updated_at = ? WHERE organization_id = ?',
          [pending ? 1 : 0, new Date().toISOString(), organizationId]
        );
      });
    }
  }
};
