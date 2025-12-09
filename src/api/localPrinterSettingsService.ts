/**
 * localPrinterSettingsService - خدمة إعدادات الطابعة المحلية
 *
 * ⚡ إعدادات خاصة بكل جهاز - لا تُزامن مع السيرفر
 * - اسم الطابعة
 * - الطباعة الصامتة
 * - فتح درج النقود
 * - هوامش الطباعة
 * - إلخ...
 */

import { powerSyncService } from '@/lib/powersync/PowerSyncService';

// ========================================
// Types
// ========================================

export interface LocalPrinterSettings {
  id?: string;
  organization_id: string;
  device_id: string;
  // نوع الطابعة
  printer_name?: string | null;
  printer_type: 'thermal' | 'normal';
  // إعدادات الطباعة التلقائية
  silent_print: boolean;
  print_on_order: boolean;
  print_copies: number;
  // إعدادات الطابعة الحرارية
  open_cash_drawer: boolean;
  beep_after_print: boolean;
  auto_cut: boolean;
  // أبعاد الطباعة
  paper_width: number;        // 48, 58, 80 mm
  margin_top: number;
  margin_bottom: number;
  margin_left: number;
  margin_right: number;
  // جودة الطباعة
  font_size: number;
  line_spacing: number;
  print_density: 'light' | 'normal' | 'dark';
  // قالب الوصل
  receipt_template: 'apple' | 'minimal' | 'modern' | 'classic';
  item_display_style: 'compact' | 'table' | 'list';
  // التواريخ
  created_at?: string;
  updated_at?: string;
}

// ========================================
// Default Settings
// ========================================

export const DEFAULT_PRINTER_SETTINGS: Omit<LocalPrinterSettings, 'organization_id' | 'device_id'> = {
  printer_type: 'thermal',
  silent_print: true,
  print_on_order: true,
  print_copies: 1,
  open_cash_drawer: false,
  beep_after_print: false,
  auto_cut: true,
  paper_width: 58,
  margin_top: 0,
  margin_bottom: 0,
  margin_left: 0,
  margin_right: 0,
  font_size: 10,
  line_spacing: 1.2,
  print_density: 'normal',
  receipt_template: 'apple',
  item_display_style: 'compact',
};

// ========================================
// Device ID Generation
// ========================================

/**
 * الحصول على معرف الجهاز الفريد
 * يُستخدم لتمييز إعدادات كل جهاز
 */
export const getDeviceId = (): string => {
  // محاولة الحصول من localStorage أولاً
  let deviceId = localStorage.getItem('device_id');

  if (!deviceId) {
    // إنشاء معرف جديد
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('device_id', deviceId);
  }

  return deviceId;
};

// ========================================
// Table Initialization
// ========================================

let tableInitialized = false;

// قائمة الأعمدة المطلوبة مع أنواعها وقيمها الافتراضية
const REQUIRED_COLUMNS = [
  { name: 'id', type: 'TEXT PRIMARY KEY' },
  { name: 'organization_id', type: 'TEXT NOT NULL' },
  { name: 'device_id', type: 'TEXT NOT NULL' },
  { name: 'printer_name', type: 'TEXT', default: null },
  { name: 'printer_type', type: 'TEXT', default: "'thermal'" },
  { name: 'silent_print', type: 'INTEGER', default: '1' },
  { name: 'print_on_order', type: 'INTEGER', default: '1' },
  { name: 'print_copies', type: 'INTEGER', default: '1' },
  { name: 'open_cash_drawer', type: 'INTEGER', default: '0' },
  { name: 'beep_after_print', type: 'INTEGER', default: '0' },
  { name: 'auto_cut', type: 'INTEGER', default: '1' },
  { name: 'paper_width', type: 'INTEGER', default: '58' },
  { name: 'margin_top', type: 'INTEGER', default: '0' },
  { name: 'margin_bottom', type: 'INTEGER', default: '0' },
  { name: 'margin_left', type: 'INTEGER', default: '0' },
  { name: 'margin_right', type: 'INTEGER', default: '0' },
  { name: 'font_size', type: 'INTEGER', default: '10' },
  { name: 'line_spacing', type: 'REAL', default: '1.2' },
  { name: 'print_density', type: 'TEXT', default: "'normal'" },
  { name: 'receipt_template', type: 'TEXT', default: "'apple'" },
  { name: 'item_display_style', type: 'TEXT', default: "'compact'" },
  { name: 'created_at', type: 'TEXT', default: null },
  { name: 'updated_at', type: 'TEXT', default: null },
];

/**
 * إنشاء جدول local_printer_settings إذا لم يكن موجوداً
 * أو إضافة الأعمدة المفقودة إذا كان الجدول موجوداً
 */
async function ensureTableExists(): Promise<void> {
  if (tableInitialized) return;

  try {
    // التحقق من وجود الجدول (table أو view)
    const checkResult = await powerSyncService.queryOne<{ name: string; type: string }>({
      sql: `SELECT name, type FROM sqlite_master WHERE name='local_printer_settings'`,
    });

    const isView = checkResult?.type === 'view';

    if (!checkResult) {
      console.log('[LocalPrinterSettings] Creating table...');

      // إنشاء الجدول
      await powerSyncService.transaction(async (tx) => {
        const columnDefs = REQUIRED_COLUMNS.map(col => {
          let def = `${col.name} ${col.type}`;
          if (col.default !== undefined && col.default !== null) {
            def += ` DEFAULT ${col.default}`;
          }
          return def;
        }).join(', ');

        await tx.execute(`CREATE TABLE IF NOT EXISTS local_printer_settings (${columnDefs})`);

        // إنشاء الفهارس (فقط للجداول وليس للـ views)
        await tx.execute(`CREATE INDEX IF NOT EXISTS idx_lps_org ON local_printer_settings(organization_id)`);
        await tx.execute(`CREATE INDEX IF NOT EXISTS idx_lps_device ON local_printer_settings(device_id)`);
      });

      console.log('[LocalPrinterSettings] ✅ Table created successfully');
    } else if (isView) {
      // إذا كان view (من PowerSync) - لا نحاول إنشاء indexes
      console.log('[LocalPrinterSettings] ✅ Using PowerSync view - no index creation needed');
    } else {
      // الجدول موجود - تحقق من الأعمدة المفقودة وأضفها
      console.log('[LocalPrinterSettings] Table exists, checking for missing columns...');

      const tableInfo = await powerSyncService.query<{ name: string }>({
        sql: `PRAGMA table_info(local_printer_settings)`,
      });

      const existingColumns = new Set(tableInfo.map(col => col.name));
      const missingColumns = REQUIRED_COLUMNS.filter(col => !existingColumns.has(col.name));

      if (missingColumns.length > 0) {
        console.log('[LocalPrinterSettings] Adding missing columns:', missingColumns.map(c => c.name));

        await powerSyncService.transaction(async (tx) => {
          for (const col of missingColumns) {
            // لا يمكن إضافة PRIMARY KEY أو NOT NULL بعد إنشاء الجدول
            let type = col.type.replace(' PRIMARY KEY', '').replace(' NOT NULL', '');
            let sql = `ALTER TABLE local_printer_settings ADD COLUMN ${col.name} ${type}`;
            if (col.default !== undefined && col.default !== null) {
              sql += ` DEFAULT ${col.default}`;
            }
            try {
              await tx.execute(sql);
              console.log(`[LocalPrinterSettings] ✅ Added column: ${col.name}`);
            } catch (e) {
              // العمود قد يكون موجوداً بالفعل
              console.warn(`[LocalPrinterSettings] Column ${col.name} might already exist:`, e);
            }
          }
        });
      } else {
        console.log('[LocalPrinterSettings] ✅ All columns exist');
      }
    }

    tableInitialized = true;
  } catch (error) {
    console.error('[LocalPrinterSettings] Error ensuring table exists:', error);
    // لا نرمي الخطأ - سنحاول مرة أخرى لاحقاً
    // نعتبر الجدول موجوداً لتجنب تكرار الخطأ
    tableInitialized = true;
  }
}

/**
 * إعادة تعيين حالة تهيئة الجدول (للاختبار)
 */
export function resetTableInitialization(): void {
  tableInitialized = false;
}

// ========================================
// Service
// ========================================

export const localPrinterSettingsService = {
  /**
   * الحصول على إعدادات الطابعة للجهاز الحالي
   */
  async get(organizationId: string): Promise<LocalPrinterSettings | null> {
    if (!organizationId) return null;

    // التأكد من وجود الجدول أولاً
    await ensureTableExists();

    const deviceId = getDeviceId();

    try {
      const result = await powerSyncService.queryOne<any>({
        sql: `
          SELECT * FROM local_printer_settings
          WHERE organization_id = ? AND device_id = ?
          LIMIT 1
        `,
        params: [organizationId, deviceId]
      });

      if (result) {
        // تحويل القيم من SQLite
        return {
          ...result,
          silent_print: !!result.silent_print,
          print_on_order: !!result.print_on_order,
          open_cash_drawer: !!result.open_cash_drawer,
          beep_after_print: !!result.beep_after_print,
          auto_cut: !!result.auto_cut,
        };
      }

      return null;
    } catch (error) {
      console.error('[LocalPrinterSettings] Error getting settings:', error);
      return null;
    }
  },

  /**
   * الحصول على الإعدادات مع القيم الافتراضية
   */
  async getWithDefaults(organizationId: string): Promise<LocalPrinterSettings> {
    const saved = await this.get(organizationId);
    const deviceId = getDeviceId();

    if (saved) {
      return {
        ...DEFAULT_PRINTER_SETTINGS,
        ...saved,
        organization_id: organizationId,
        device_id: deviceId,
      };
    }

    return {
      ...DEFAULT_PRINTER_SETTINGS,
      organization_id: organizationId,
      device_id: deviceId,
    };
  },

  /**
   * حفظ إعدادات الطابعة
   */
  async save(settings: Partial<LocalPrinterSettings> & { organization_id: string }): Promise<void> {
    if (!settings.organization_id) {
      throw new Error('Organization ID is required');
    }

    // التأكد من وجود الجدول أولاً
    await ensureTableExists();

    const deviceId = getDeviceId();
    const now = new Date().toISOString();

    try {
      const existing = await this.get(settings.organization_id);

      await powerSyncService.transaction(async (tx) => {
        if (existing) {
          // تحديث الإعدادات الموجودة
          const updates = {
            ...settings,
            device_id: deviceId,
            updated_at: now,
          };

          delete updates.id;
          delete updates.created_at;

          const keys = Object.keys(updates).filter(k => k !== 'organization_id');
          const setClause = keys.map(k => `${k} = ?`).join(', ');
          const values = keys.map(k => {
            const val = (updates as any)[k];
            // تحويل boolean إلى integer
            if (typeof val === 'boolean') return val ? 1 : 0;
            return val;
          });

          await tx.execute(
            `UPDATE local_printer_settings SET ${setClause} WHERE organization_id = ? AND device_id = ?`,
            [...values, settings.organization_id, deviceId]
          );
        } else {
          // إنشاء إعدادات جديدة
          const newSettings = {
            ...DEFAULT_PRINTER_SETTINGS,
            ...settings,
            id: `lps_${deviceId}_${Date.now()}`,
            device_id: deviceId,
            created_at: now,
            updated_at: now,
          };

          const columns = Object.keys(newSettings);
          const placeholders = columns.map(() => '?').join(', ');
          const values = columns.map(col => {
            const val = (newSettings as any)[col];
            if (typeof val === 'boolean') return val ? 1 : 0;
            return val;
          });

          await tx.execute(
            `INSERT INTO local_printer_settings (${columns.join(', ')}) VALUES (${placeholders})`,
            values
          );
        }
      });

      console.log('[LocalPrinterSettings] Settings saved successfully');
    } catch (error) {
      console.error('[LocalPrinterSettings] Error saving settings:', error);
      throw error;
    }
  },

  /**
   * تحديث حقل واحد
   */
  async updateField<K extends keyof LocalPrinterSettings>(
    organizationId: string,
    field: K,
    value: LocalPrinterSettings[K]
  ): Promise<void> {
    const current = await this.getWithDefaults(organizationId);
    await this.save({
      ...current,
      [field]: value,
    });
  },

  /**
   * إعادة تعيين للقيم الافتراضية
   */
  async reset(organizationId: string): Promise<void> {
    const deviceId = getDeviceId();

    try {
      await powerSyncService.transaction(async (tx) => {
        await tx.execute(
          'DELETE FROM local_printer_settings WHERE organization_id = ? AND device_id = ?',
          [organizationId, deviceId]
        );
      });

      console.log('[LocalPrinterSettings] Settings reset to defaults');
    } catch (error) {
      console.error('[LocalPrinterSettings] Error resetting settings:', error);
      throw error;
    }
  },

  /**
   * حذف إعدادات الجهاز
   */
  async delete(organizationId: string): Promise<void> {
    return this.reset(organizationId);
  },
};

export default localPrinterSettingsService;
