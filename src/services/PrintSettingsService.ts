/**
 * ⚡ PrintSettingsService - v3.0 (PowerSync Best Practices 2025)
 * ============================================================
 *
 * حفظ واسترجاع إعدادات الطباعة:
 * - حفظ في localStorage
 * - Cache للإعدادات
 * - دعم إعدادات متعددة (للمستخدمين/المؤسسات)
 *
 * ✅ يستخدم localStorage للتخزين البسيط
 * ✅ لا يحتاج PowerSync (بيانات محلية فقط)
 */

// =====================================================
// Types
// =====================================================

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

// =====================================================
// Default Settings
// =====================================================

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

// =====================================================
// PrintSettingsService
// =====================================================

class PrintSettingsServiceClass {
  private readonly STORAGE_PREFIX = 'barcode_print_settings_';
  private cache: Map<string, PrintSettings> = new Map();

  // ========================================
  // 💾 حفظ الإعدادات
  // ========================================

  /**
   * ⚡ حفظ الإعدادات
   */
  async saveSettings(settings: PrintSettings, orgId: string): Promise<boolean> {
    try {
      // حفظ في الـ cache
      this.cache.set(orgId, settings);

      // حفظ في localStorage
      localStorage.setItem(
        this.STORAGE_PREFIX + orgId,
        JSON.stringify(settings)
      );

      return true;
    } catch (error) {
      console.warn('[PrintSettings] فشل حفظ الإعدادات:', error);
      return false;
    }
  }

  // ========================================
  // 📖 جلب الإعدادات
  // ========================================

  /**
   * ⚡ جلب الإعدادات
   */
  async getSettings(orgId: string): Promise<PrintSettings> {
    // تحقق من الـ cache أولاً
    const cached = this.cache.get(orgId);
    if (cached) {
      return cached;
    }

    try {
      // جلب من localStorage
      const data = localStorage.getItem(this.STORAGE_PREFIX + orgId);
      if (data) {
        const settings = JSON.parse(data) as PrintSettings;
        this.cache.set(orgId, settings);
        return settings;
      }
    } catch {
      // تجاهل الأخطاء
    }

    // إرجاع الإعدادات الافتراضية
    return { ...DEFAULT_SETTINGS };
  }

  /**
   * ⚡ جلب الإعدادات الافتراضية
   */
  getDefaultSettings(): PrintSettings {
    return { ...DEFAULT_SETTINGS };
  }

  // ========================================
  // 🔄 إعادة تعيين
  // ========================================

  /**
   * ⚡ إعادة تعيين الإعدادات للافتراضية
   */
  async resetSettings(orgId: string): Promise<boolean> {
    try {
      this.cache.delete(orgId);
      localStorage.removeItem(this.STORAGE_PREFIX + orgId);
      return true;
    } catch {
      return false;
    }
  }

  // ========================================
  // 🔧 Helper Methods
  // ========================================

  /**
   * ⚡ تهيئة الخدمة (للتوافق مع الكود القديم)
   */
  async initTable(): Promise<void> {
    // لا يحتاج تهيئة - نستخدم localStorage
  }

  /**
   * ⚡ مسح الـ cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// ========================================
// 📤 Export Singleton
// ========================================

export const printSettingsService = new PrintSettingsServiceClass();
export default printSettingsService;
