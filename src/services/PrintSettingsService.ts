/**
 * PrintSettingsService - حفظ واسترجاع إعدادات الطباعة من SQLite
 * 
 * ⚡ المميزات:
 * - حفظ في SQLite (يعمل أوفلاين)
 * - Cache للإعدادات
 * - دعم إعدادات متعددة (للمستخدمين/المؤسسات)
 */

import { isSQLiteAvailable } from '@/lib/db/sqliteAPI';
import { sqliteWriteQueue } from '@/lib/sync/delta/SQLiteWriteQueue';

export interface PrintSettings {
  label_width: number;
  label_height: number;
  barcode_type: string;
  display_store_name: boolean;
  display_product_name: boolean;
  display_price: boolean;
  display_sku: boolean;
  display_barcode_value: boolean;
  custom_width: string;
  custom_height: string;
  selected_label_size: string;
  selected_template_id: string;
  font_family_css: string;
}

const DEFAULT_SETTINGS: PrintSettings = {
  label_width: 50,
  label_height: 30,
  barcode_type: "CODE128",
  display_store_name: true,
  display_product_name: true,
  display_price: true,
  display_sku: true,
  display_barcode_value: true,
  custom_width: "50",
  custom_height: "30",
  selected_label_size: "50x30",
  selected_template_id: "default",
  font_family_css: "system-ui",
};

class PrintSettingsService {
  private cache: PrintSettings | null = null;
  private readonly TABLE_NAME = 'app_settings';
  private readonly SETTING_KEY = 'barcode_print_settings';

  /**
   * ⚡ حفظ الإعدادات
   */
  async saveSettings(settings: PrintSettings, orgId: string): Promise<boolean> {
    this.cache = settings;
    
    // حفظ في localStorage دائماً كنسخة احتياطية
    try {
      localStorage.setItem(`${this.SETTING_KEY}_${orgId}`, JSON.stringify(settings));
    } catch (e) {
      console.warn('فشل الحفظ في localStorage', e);
    }

    // حفظ في SQLite إذا كان متاحاً
    if (isSQLiteAvailable()) {
      try {
        // التأكد من وجود الجدول
        await sqliteWriteQueue.write(`
          CREATE TABLE IF NOT EXISTS ${this.TABLE_NAME} (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at TEXT
          )
        `);

        const key = `${this.SETTING_KEY}_${orgId}`;
        const value = JSON.stringify(settings);
        
        await sqliteWriteQueue.write(`
          INSERT OR REPLACE INTO ${this.TABLE_NAME} (key, value, updated_at)
          VALUES (?, ?, datetime('now'))
        `, [key, value]);
        
        return true;
      } catch (error) {
        console.error('[PrintSettings] فشل الحفظ في SQLite:', error);
        return false;
      }
    }
    
    return true;
  }

  /**
   * ⚡ استرجاع الإعدادات
   */
  async getSettings(orgId: string): Promise<PrintSettings> {
    if (this.cache) return this.cache;

    // محاولة الاسترجاع من SQLite أولاً
    if (isSQLiteAvailable()) {
      try {
        const key = `${this.SETTING_KEY}_${orgId}`;
        const result = await sqliteWriteQueue.read<any[]>(`
          SELECT value FROM ${this.TABLE_NAME} WHERE key = ?
        `, [key]);

        if (result && result.length > 0 && result[0].value) {
          try {
            const settings = JSON.parse(result[0].value);
            this.cache = { ...DEFAULT_SETTINGS, ...settings };
            return this.cache!;
          } catch (e) {
            console.warn('[PrintSettings] بيانات تالفة في SQLite');
          }
        }
      } catch (error) {
        console.warn('[PrintSettings] فشل القراءة من SQLite:', error);
      }
    }

    // Fallback: localStorage
    try {
      const stored = localStorage.getItem(`${this.SETTING_KEY}_${orgId}`);
      if (stored) {
        const settings = JSON.parse(stored);
        this.cache = { ...DEFAULT_SETTINGS, ...settings };
        return this.cache!;
      }
    } catch (e) {
      console.warn('[PrintSettings] فشل القراءة من localStorage');
    }

    return DEFAULT_SETTINGS;
  }
}

export const printSettingsService = new PrintSettingsService();
