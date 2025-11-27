/**
 * DeltaWriteService - خدمة الكتابة الموحدة باستخدام Delta Sync
 *
 * تُستخدم لجميع عمليات الكتابة المحلية مع المزامنة التلقائية
 *
 * المزايا:
 * - Local-First: الكتابة محلياً فوراً
 * - Offline-First: يعمل بدون إنترنت
 * - Event-Driven: المزامنة عند الاتصال
 * - DELTA operations: للمخزون والأرقام
 */

import { deltaSyncEngine } from '@/lib/sync/delta';
import { sqliteWriteQueue } from '@/lib/sync/delta/SQLiteWriteQueue';
import { v4 as uuidv4 } from 'uuid';

export type EntityType =
  | 'products'
  | 'product_colors'
  | 'product_sizes'
  | 'product_images'
  | 'product_advanced_settings'
  | 'product_marketing_settings'
  | 'product_wholesale_tiers'
  | 'customers'
  | 'customer_addresses'
  | 'invoices'
  | 'invoice_items'
  | 'customer_debts'
  | 'customer_debt_payments'
  | 'product_returns'
  | 'return_items'
  | 'loss_declarations'
  | 'loss_items'
  | 'pos_orders'
  | 'pos_order_items'
  | 'order_items'
  | 'repair_orders'
  | 'repair_images'
  | 'repair_status_history'
  | 'repair_locations'
  | 'expenses'
  | 'recurring_expenses'
  | 'work_sessions'
  | 'subscriptions'
  | 'permissions'
  | 'expense_categories'
  | 'pos_settings'
  | 'organization_settings'
  | 'organization_subscriptions'
  | 'subscription_plans'
  | 'suppliers'
  | 'supplier_contacts'
  | 'supplier_purchases'
  | 'supplier_purchase_items'
  | 'supplier_payments';

export interface WriteResult {
  success: boolean;
  id: string;
  error?: string;
}

class DeltaWriteServiceClass {
  // جداول لا تحتوي على organization_id أو updated_at في Supabase
  private readonly TABLES_WITHOUT_ORG_ID = new Set([
    'repair_status_history',
    'repair_images',
    'pos_order_items',
    'order_items',
    'invoice_items',
    'return_items',
    'loss_items'
  ]);

  // ⚡ حقول يجب استثناؤها دائماً من الكتابة في SQLite
  // هذه الحقول إما للأمان أو لا تنتمي للـ schema
  private readonly EXCLUDED_FIELDS = new Set([
    '_csrf',           // حقل CSRF للأمان - لا يُخزن في قاعدة البيانات
    '__proto__',       // حماية من prototype pollution
    'constructor',     // حماية من prototype pollution
  ]);

  // ⚡ حقول تحتوي على بيانات base64 كبيرة - يجب استثناؤها من الإرسال لـ Supabase
  // لكن يمكن تخزينها محلياً في SQLite
  private readonly BASE64_FIELDS = new Set([
    'thumbnail_base64',
    'thumbnailBase64',
    'images_base64',
    'imagesBase64',
    'base64_data',
    'base64Data',
    'product_images_base64',
  ]);

  /**
   * ⚡ ضغط صورة وتحويلها إلى WebP
   * تقليل الحجم بنسبة 50-80% مع الحفاظ على الجودة
   */
  private async compressImageToWebP(
    dataUrl: string,
    maxSize: number = 800,
    quality: number = 0.85
  ): Promise<string> {
    return new Promise((resolve) => {
      try {
        // استخراج البيانات من data URL
        const [header, base64Data] = dataUrl.split(',');
        const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';

        // تحويل base64 إلى Blob
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
        const originalSize = blob.size;

        // إنشاء Image element
        const img = new Image();
        const objectUrl = URL.createObjectURL(blob);

        img.onload = () => {
          URL.revokeObjectURL(objectUrl);

          // حساب الأبعاد الجديدة
          let { width, height } = img;
          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = Math.round((height / width) * maxSize);
              width = maxSize;
            } else {
              width = Math.round((width / height) * maxSize);
              height = maxSize;
            }
          }

          // إنشاء Canvas للضغط
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl); // إرجاع الأصلي في حالة الفشل
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // التحقق من دعم WebP
          const testCanvas = document.createElement('canvas');
          testCanvas.width = 1;
          testCanvas.height = 1;
          const supportsWebP = testCanvas.toDataURL('image/webp').startsWith('data:image/webp');

          // تحويل إلى WebP أو JPEG
          const outputMimeType = supportsWebP ? 'image/webp' : 'image/jpeg';
          const compressedDataUrl = canvas.toDataURL(outputMimeType, quality);

          // حساب نسبة الضغط
          const newSize = Math.round((compressedDataUrl.length - compressedDataUrl.indexOf(',') - 1) * 0.75);
          const reduction = Math.round((1 - newSize / originalSize) * 100);

          console.log(`[DeltaWrite] 📸 Compressed: ${Math.round(originalSize / 1024)}KB → ${Math.round(newSize / 1024)}KB (${reduction}% reduction) | ${outputMimeType}`);

          resolve(compressedDataUrl);
        };

        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(dataUrl); // إرجاع الأصلي في حالة الفشل
        };

        img.src = objectUrl;
      } catch (error) {
        console.warn('[DeltaWrite] Compression failed, using original:', error);
        resolve(dataUrl);
      }
    });
  }

  /**
   * ⚡ تنظيف البيانات من الحقول المحظورة مع ضغط الصور
   * يُستخدم قبل أي عملية كتابة
   */
  private async cleanDataForWriteAsync(data: Record<string, any>): Promise<Record<string, any>> {
    const cleanData: Record<string, any> = {};

    // 🔍 DEBUG: عرض جميع الحقول الواردة
    console.log('[DeltaWrite] 🔍 DEBUG cleanDataForWriteAsync - Input fields:', Object.keys(data));
    console.log('[DeltaWrite] 🔍 DEBUG - thumbnail_image exists?', 'thumbnail_image' in data, data.thumbnail_image ? `(${Math.round(String(data.thumbnail_image).length/1024)}KB)` : '(empty)');

    for (const [key, value] of Object.entries(data)) {
      // تخطي الحقول المحظورة
      if (this.EXCLUDED_FIELDS.has(key)) {
        console.log(`[DeltaWrite] 🚫 Excluding field: ${key}`);
        continue;
      }

      // ⚡ معالجة خاصة لحقول الصور مع data URLs
      if (typeof value === 'string' && value.startsWith('data:image/')) {
        console.log(`[DeltaWrite] 🔍 DEBUG - Found data:image in field: ${key} (${Math.round(value.length/1024)}KB)`);

        // ⚡ إذا كان الحقل هو thumbnail_base64 أو images_base64 - نحتفظ به كما هو (جاهز للاستخدام)
        if (key === 'thumbnail_base64' || key === 'images_base64') {
          console.log(`[DeltaWrite] ✅ Keeping ${key} as-is (already processed)`);
          cleanData[key] = value;
          continue;
        }

        // thumbnail_image أو image_thumbnail - ضغط ونقل إلى thumbnail_base64
        if (key === 'thumbnail_image' || key === 'image_thumbnail') {
          console.log(`[DeltaWrite] 📸 Compressing and moving ${key} to thumbnail_base64 (${Math.round(value.length / 1024)}KB)`);
          // ⚡ ضغط الصورة قبل الحفظ
          const compressed = await this.compressImageToWebP(value, 800, 0.85);
          cleanData['thumbnail_base64'] = compressed;
          console.log(`[DeltaWrite] ✅ thumbnail_base64 set (${Math.round(compressed.length/1024)}KB)`);
          cleanData[key] = null;
          continue;
        }

        // حقول الصور الأخرى التي يمكن تخزينها محلياً
        if (this.BASE64_FIELDS.has(key)) {
          // ⚡ ضغط حقول base64 المعروفة أيضاً
          const compressed = await this.compressImageToWebP(value, 1200, 0.85);
          cleanData[key] = compressed;
          continue;
        }

        // حقول أخرى مع data URLs - ضغط وحفظ
        if (value.length > 50000) {
          const compressed = await this.compressImageToWebP(value, 1200, 0.85);
          cleanData[key] = compressed;
        } else {
          cleanData[key] = value;
        }
        continue;
      }

      // ⚡ معالجة مصفوفات الصور (images, additional_images)
      if ((key === 'images' || key === 'additional_images') && Array.isArray(value)) {
        const hasBase64 = value.some((img: any) => typeof img === 'string' && img.startsWith('data:'));
        if (hasBase64) {
          console.log(`[DeltaWrite] 📸 Compressing and moving ${key} to images_base64`);
          // ⚡ ضغط كل صورة base64 في المصفوفة
          const compressedImages: string[] = [];
          for (const img of value) {
            if (typeof img === 'string' && img.startsWith('data:')) {
              const compressed = await this.compressImageToWebP(img, 1200, 0.85);
              compressedImages.push(compressed);
            } else if (typeof img === 'string') {
              compressedImages.push(img);
            }
          }
          cleanData['images_base64'] = JSON.stringify(compressedImages);
          // تصفية URLs فقط للحقل الأصلي
          const urlsOnly = value.filter((img: any) =>
            typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://'))
          );
          cleanData[key] = urlsOnly.length > 0 ? JSON.stringify(urlsOnly) : null;
          continue;
        }
      }

      cleanData[key] = value;
    }

    // 🔍 DEBUG: عرض النتيجة النهائية
    console.log('[DeltaWrite] 🔍 DEBUG cleanDataForWriteAsync - Output fields:', Object.keys(cleanData));
    console.log('[DeltaWrite] 🔍 DEBUG - thumbnail_base64 in output?', 'thumbnail_base64' in cleanData, cleanData.thumbnail_base64 ? `(${Math.round(String(cleanData.thumbnail_base64).length/1024)}KB)` : '(empty)');

    return cleanData;
  }

  /**
   * ⚡ تنظيف البيانات من الحقول المحظورة (نسخة متزامنة للتوافق)
   * يُستخدم قبل أي عملية كتابة
   */
  private cleanDataForWrite(data: Record<string, any>): Record<string, any> {
    const cleanData: Record<string, any> = {};

    // 🔍 DEBUG: عرض جميع الحقول الواردة
    console.log('[DeltaWrite] 🔍 DEBUG cleanDataForWrite (sync) - Input fields:', Object.keys(data));
    console.log('[DeltaWrite] 🔍 DEBUG - thumbnail_image exists?', 'thumbnail_image' in data, data.thumbnail_image ? `(${Math.round(String(data.thumbnail_image).length/1024)}KB)` : '(empty)');

    for (const [key, value] of Object.entries(data)) {
      // تخطي الحقول المحظورة
      if (this.EXCLUDED_FIELDS.has(key)) {
        console.log(`[DeltaWrite] 🚫 Excluding field: ${key}`);
        continue;
      }

      // ⚡ معالجة خاصة لحقول الصور مع data URLs
      if (typeof value === 'string' && value.startsWith('data:image/')) {
        console.log(`[DeltaWrite] 🔍 DEBUG - Found data:image in field: ${key} (${Math.round(value.length/1024)}KB)`);

        // ⚡ إذا كان الحقل هو thumbnail_base64 أو images_base64 - نحتفظ به كما هو (جاهز للاستخدام)
        if (key === 'thumbnail_base64' || key === 'images_base64') {
          console.log(`[DeltaWrite] ✅ Keeping ${key} as-is (already processed)`);
          cleanData[key] = value;
          continue;
        }

        // thumbnail_image أو image_thumbnail - نقل إلى thumbnail_base64
        if (key === 'thumbnail_image' || key === 'image_thumbnail') {
          console.log(`[DeltaWrite] 📸 Moving ${key} data URL to thumbnail_base64 (${Math.round(value.length / 1024)}KB)`);
          cleanData['thumbnail_base64'] = value;
          console.log(`[DeltaWrite] ✅ thumbnail_base64 set (${Math.round(value.length/1024)}KB)`);
          // نحتفظ بالحقل الأصلي فارغاً أو بقيمته إذا كان URL عادي
          cleanData[key] = null;
          continue;
        }

        // حقول الصور الأخرى التي يمكن تخزينها محلياً
        if (this.BASE64_FIELDS.has(key)) {
          // حقول base64 المعروفة - نحتفظ بها كما هي
          cleanData[key] = value;
          continue;
        }

        // حقول أخرى مع data URLs كبيرة - نتخطاها مع تحذير
        if (value.length > 100000) {
          console.log(`[DeltaWrite] ⚠️ Large data URL in unknown field: ${key} (${Math.round(value.length / 1024)}KB) - keeping it`);
        }
        cleanData[key] = value;
        continue;
      }

      // ⚡ معالجة مصفوفات الصور (images, additional_images)
      if ((key === 'images' || key === 'additional_images') && Array.isArray(value)) {
        const hasBase64 = value.some((img: any) => typeof img === 'string' && img.startsWith('data:'));
        if (hasBase64) {
          console.log(`[DeltaWrite] 📸 Moving ${key} with base64 data to images_base64`);
          cleanData['images_base64'] = JSON.stringify(value);
          // تصفية URLs فقط للحقل الأصلي
          const urlsOnly = value.filter((img: any) =>
            typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://'))
          );
          cleanData[key] = urlsOnly.length > 0 ? JSON.stringify(urlsOnly) : null;
          continue;
        }
      }

      cleanData[key] = value;
    }

    // 🔍 DEBUG: عرض النتيجة النهائية
    console.log('[DeltaWrite] 🔍 DEBUG cleanDataForWrite (sync) - Output fields:', Object.keys(cleanData));
    console.log('[DeltaWrite] 🔍 DEBUG - thumbnail_base64 in output?', 'thumbnail_base64' in cleanData, cleanData.thumbnail_base64 ? `(${Math.round(String(cleanData.thumbnail_base64).length/1024)}KB)` : '(empty)');

    return cleanData;
  }

  /**
   * ⚡ التحقق من وجود صور تحتاج للضغط في البيانات
   */
  private hasImagesToCompress(data: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' && value.startsWith('data:image/') && value.length > 50000) {
        console.log(`[DeltaWrite] 🔍 hasImagesToCompress: Found large image in ${key} (${Math.round(value.length/1024)}KB)`);
        return true;
      }
      if ((key === 'images' || key === 'additional_images') && Array.isArray(value)) {
        if (value.some((img: any) => typeof img === 'string' && img.startsWith('data:') && img.length > 50000)) {
          console.log(`[DeltaWrite] 🔍 hasImagesToCompress: Found large image in array ${key}`);
          return true;
        }
      }
    }
    console.log('[DeltaWrite] 🔍 hasImagesToCompress: No large images found');
    return false;
  }

  /**
   * إنشاء سجل جديد
   */
  async create<T extends Record<string, any>>(
    tableName: EntityType,
    data: T,
    organizationId: string
  ): Promise<WriteResult> {
    try {
      // 🔍 DEBUG: عرض البيانات الواردة للـ create
      console.log(`[DeltaWrite] 🔍 DEBUG create(${tableName}) - Input data keys:`, Object.keys(data));
      if (tableName === 'products') {
        console.log('[DeltaWrite] 🔍 DEBUG create - thumbnail_image:', data.thumbnail_image ? `exists (${Math.round(String(data.thumbnail_image).length/1024)}KB, starts with: ${String(data.thumbnail_image).substring(0,50)}...)` : 'NOT EXISTS');
      }

      // ⚡ تنظيف البيانات من الحقول المحظورة قبل الكتابة
      // استخدام النسخة الـ async للضغط إذا كانت هناك صور كبيرة (خاصة للمنتجات)
      let cleanData: Record<string, any>;
      if (tableName === 'products' && this.hasImagesToCompress(data)) {
        console.log(`[DeltaWrite] 📸 Compressing images for new product...`);
        cleanData = await this.cleanDataForWriteAsync(data);
      } else {
        console.log(`[DeltaWrite] 🔄 Using sync cleanDataForWrite (no large images or not products)`);
        cleanData = this.cleanDataForWrite(data);
      }

      const id = cleanData.id || uuidv4();
      const now = new Date().toISOString();

      const record: any = {
        ...cleanData,
        id,
        created_at: cleanData.created_at || now,
        synced: 0 // غير متزامن
      };

      // إضافة organization_id فقط للجداول التي تحتاجه
      if (!this.TABLES_WITHOUT_ORG_ID.has(tableName)) {
        record.organization_id = organizationId;
        record.updated_at = now;
      }

      // 🔍 DEBUG: عرض السجل النهائي قبل الحفظ
      if (tableName === 'products') {
        console.log('[DeltaWrite] 🔍 DEBUG Final record - thumbnail_base64:', record.thumbnail_base64 ? `exists (${Math.round(String(record.thumbnail_base64).length/1024)}KB)` : 'NOT EXISTS');
        console.log('[DeltaWrite] 🔍 DEBUG Final record - thumbnail_image:', record.thumbnail_image);
      }

      // كتابة محلية + إضافة للـ Outbox
      await deltaSyncEngine.localWrite(tableName, 'INSERT', id, record);

      console.log(`[DeltaWrite] ✅ Created ${tableName}:${id}`);

      // 🔍 DEBUG: التحقق من حفظ الصور بعد الكتابة
      if (tableName === 'products' && record.thumbnail_base64) {
        try {
          const savedProduct = await this.get<any>('products', id);
          if (savedProduct) {
            console.log(`[DeltaWrite] 🔍 VERIFY - Product ${id} saved with thumbnail_base64:`,
              savedProduct.thumbnail_base64 ? `exists (${Math.round(String(savedProduct.thumbnail_base64).length/1024)}KB)` : 'NOT FOUND IN DB!');
          } else {
            console.log(`[DeltaWrite] ⚠️ VERIFY - Product ${id} NOT FOUND after save!`);
          }
        } catch (verifyError) {
          console.warn(`[DeltaWrite] ⚠️ VERIFY failed:`, verifyError);
        }
      }

      return { success: true, id };
    } catch (error) {
      console.error(`[DeltaWrite] ❌ Create ${tableName} failed:`, error);
      return {
        success: false,
        id: data.id || '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * تحديث سجل موجود
   */
  async update<T extends Record<string, any>>(
    tableName: EntityType,
    recordId: string,
    updates: Partial<T>
  ): Promise<WriteResult> {
    try {
      // ⚡ تنظيف البيانات من الحقول المحظورة قبل التحديث
      // استخدام النسخة الـ async للضغط إذا كانت هناك صور كبيرة (خاصة للمنتجات)
      let cleanUpdates: Record<string, any>;
      if (tableName === 'products' && this.hasImagesToCompress(updates as Record<string, any>)) {
        console.log(`[DeltaWrite] 📸 Compressing images for product update...`);
        cleanUpdates = await this.cleanDataForWriteAsync(updates as Record<string, any>);
      } else {
        cleanUpdates = this.cleanDataForWrite(updates as Record<string, any>);
      }

      const now = new Date().toISOString();

      const data: any = {
        ...cleanUpdates,
        synced: 0
      };

      // إضافة updated_at فقط للجداول التي تحتاجه
      if (!this.TABLES_WITHOUT_ORG_ID.has(tableName)) {
        data.updated_at = now;
      }

      // إزالة id من التحديثات لتجنب التعارض
      delete data.id;

      await deltaSyncEngine.localWrite(tableName, 'UPDATE', recordId, data);

      console.log(`[DeltaWrite] ✅ Updated ${tableName}:${recordId}`);
      return { success: true, id: recordId };
    } catch (error) {
      console.error(`[DeltaWrite] ❌ Update ${tableName}:${recordId} failed:`, error);
      return {
        success: false,
        id: recordId,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * تحديث محلي فقط (بدون إضافة للـ Outbox)
   * ⚡ يُستخدم عند تحديث حالة المزامنة بعد نجاح الإرسال للسيرفر
   */
  async updateLocalOnly<T extends Record<string, any>>(
    tableName: EntityType,
    recordId: string,
    updates: Partial<T>
  ): Promise<WriteResult> {
    try {
      const now = new Date().toISOString();

      const data = {
        ...updates,
        updated_at: now
      };

      // إزالة id من التحديثات لتجنب التعارض
      delete data.id;

      // ⚡ استخدام localWriteOnly بدلاً من localWrite (لا يضيف للـ Outbox)
      await deltaSyncEngine.localWriteOnly(tableName, 'UPDATE', recordId, data);

      console.log(`[DeltaWrite] ✅ Updated locally ${tableName}:${recordId}`);
      return { success: true, id: recordId };
    } catch (error) {
      console.error(`[DeltaWrite] ❌ Local update ${tableName}:${recordId} failed:`, error);
      return {
        success: false,
        id: recordId,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * حذف سجل
   */
  async delete(tableName: EntityType, recordId: string): Promise<WriteResult> {
    try {
      await deltaSyncEngine.localWrite(tableName, 'DELETE', recordId, {});

      console.log(`[DeltaWrite] ✅ Deleted ${tableName}:${recordId}`);
      return { success: true, id: recordId };
    } catch (error) {
      console.error(`[DeltaWrite] ❌ Delete ${tableName}:${recordId} failed:`, error);
      return {
        success: false,
        id: recordId,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * تحديث رقمي (DELTA) - للمخزون والمبالغ
   */
  async deltaUpdate(
    tableName: EntityType,
    recordId: string,
    field: string,
    change: number
  ): Promise<WriteResult> {
    try {
      await deltaSyncEngine.stockDelta(tableName, recordId, field, change);

      console.log(`[DeltaWrite] ✅ Delta ${tableName}:${recordId}.${field} += ${change}`);
      return { success: true, id: recordId };
    } catch (error) {
      console.error(`[DeltaWrite] ❌ Delta ${tableName}:${recordId} failed:`, error);
      return {
        success: false,
        id: recordId,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * إنشاء متعدد (batch)
   */
  async bulkCreate<T extends Record<string, any>>(
    tableName: EntityType,
    items: T[],
    organizationId: string
  ): Promise<{ success: boolean; created: number; failed: number }> {
    let created = 0;
    let failed = 0;

    for (const item of items) {
      const result = await this.create(tableName, item, organizationId);
      if (result.success) {
        created++;
      } else {
        failed++;
      }
    }

    return { success: failed === 0, created, failed };
  }

  /**
   * قراءة سجل (من SQLite مباشرة)
   */
  async get<T>(tableName: EntityType, recordId: string): Promise<T | null> {
    try {
      const result = await sqliteWriteQueue.read<T[]>(
        `SELECT * FROM ${tableName} WHERE id = ?`,
        [recordId]
      );
      return result[0] || null;
    } catch (error) {
      console.error(`[DeltaWrite] ❌ Get ${tableName}:${recordId} failed:`, error);
      return null;
    }
  }

  /**
   * قراءة متعددة
   */
  async getAll<T>(
    tableName: EntityType,
    organizationId: string,
    options?: {
      where?: string;
      params?: any[];
      orderBy?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<T[]> {
    try {
      // ⚡ الجداول بدون organization_id لا نضيف فلتر المؤسسة
      const hasOrgId = !this.TABLES_WITHOUT_ORG_ID.has(tableName);
      let sql = hasOrgId 
        ? `SELECT * FROM ${tableName} WHERE organization_id = ?`
        : `SELECT * FROM ${tableName} WHERE 1=1`;
      const params: any[] = hasOrgId ? [organizationId] : [];

      if (options?.where) {
        sql += ` AND ${options.where}`;
        if (options.params) {
          params.push(...options.params);
        }
      }

      if (options?.orderBy) {
        sql += ` ORDER BY ${options.orderBy}`;
      }

      if (options?.limit) {
        sql += ` LIMIT ${options.limit}`;
      }

      if (options?.offset) {
        sql += ` OFFSET ${options.offset}`;
      }

      return await sqliteWriteQueue.read<T[]>(sql, params);
    } catch (error) {
      console.error(`[DeltaWrite] ❌ GetAll ${tableName} failed:`, error);
      return [];
    }
  }

  /**
   * ⚡ تنفيذ استعلام SQL مخصص (للقراءة فقط)
   * يُستخدم لجلب البيانات من جداول ليس لها organization_id مباشرة
   */
  async query<T>(
    _tableName: string,
    sql: string,
    params?: any[]
  ): Promise<T[]> {
    try {
      return await sqliteWriteQueue.read<T[]>(sql, params || []);
    } catch (error) {
      console.error(`[DeltaWrite] ❌ Query failed:`, error);
      return [];
    }
  }

  /**
   * عد السجلات
   */
  async count(
    tableName: EntityType,
    organizationId: string,
    where?: string,
    params?: any[]
  ): Promise<number> {
    try {
      let sql = `SELECT COUNT(*) as count FROM ${tableName} WHERE organization_id = ?`;
      const queryParams: any[] = [organizationId];

      if (where) {
        sql += ` AND ${where}`;
        if (params) {
          queryParams.push(...params);
        }
      }

      const result = await sqliteWriteQueue.read<{ count: number }[]>(sql, queryParams);
      return result[0]?.count || 0;
    } catch (error) {
      console.error(`[DeltaWrite] ❌ Count ${tableName} failed:`, error);
      return 0;
    }
  }

  /**
   * البحث
   */
  async search<T>(
    tableName: EntityType,
    organizationId: string,
    searchFields: string[],
    searchTerm: string,
    limit: number = 50
  ): Promise<T[]> {
    try {
      const conditions = searchFields.map(f => `${f} LIKE ?`).join(' OR ');
      const params = searchFields.map(() => `%${searchTerm}%`);

      const sql = `
        SELECT * FROM ${tableName}
        WHERE organization_id = ? AND (${conditions})
        LIMIT ?
      `;

      return await sqliteWriteQueue.read<T[]>(sql, [organizationId, ...params, limit]);
    } catch (error) {
      console.error(`[DeltaWrite] ❌ Search ${tableName} failed:`, error);
      return [];
    }
  }

  // =====================
  // دوال مخصصة للمنتجات
  // =====================

  /**
   * إنشاء منتج مع الألوان والمقاسات
   */
  async createProductWithVariants(
    organizationId: string,
    product: Record<string, any>,
    colors?: Array<{ name: string; code?: string; quantity?: number }>,
    sizes?: Array<{ name: string; colorId?: string; quantity?: number }>
  ): Promise<WriteResult> {
    const productId = product.id || uuidv4();

    // إنشاء المنتج
    const productResult = await this.create('products', { ...product, id: productId }, organizationId);
    if (!productResult.success) return productResult;

    // إنشاء الألوان
    if (colors && colors.length > 0) {
      for (const color of colors) {
        const colorId = uuidv4();
        await this.create('product_colors', {
          id: colorId,
          product_id: productId,
          name: color.name,
          color_code: color.code,
          quantity: color.quantity || 0
        }, organizationId);

        // إنشاء المقاسات لكل لون
        if (sizes) {
          for (const size of sizes.filter(s => !s.colorId || s.colorId === colorId)) {
            await this.create('product_sizes', {
              id: uuidv4(),
              product_id: productId,
              color_id: colorId,
              name: size.name,
              quantity: size.quantity || 0
            }, organizationId);
          }
        }
      }
    }

    return { success: true, id: productId };
  }

  /**
   * ⚡ إنشاء منتج كامل مع جميع البيانات المرتبطة
   * يُستخدم عند إنشاء منتج جديد أوفلاين مع:
   * - الألوان والمقاسات
   * - الإعدادات المتقدمة (advancedSettings)
   * - إعدادات التسويق (marketingSettings)
   * - أسعار الجملة (wholesaleTiers)
   */
  async createProductComplete(
    organizationId: string,
    product: Record<string, any>,
    options?: {
      colors?: Array<{ name: string; code?: string; quantity?: number; sizes?: Array<{ name: string; quantity?: number }> }>;
      advancedSettings?: Record<string, any>;
      marketingSettings?: Record<string, any>;
      wholesaleTiers?: Array<{ min_quantity: number; price_per_unit: number }>;
    }
  ): Promise<WriteResult> {
    const productId = product.id || uuidv4();
    const now = new Date().toISOString();

    // 1. إنشاء المنتج الأساسي (بدون الحقول المرتبطة)
    const { advancedSettings, marketingSettings, wholesale_tiers, colors, ...cleanProduct } = product;
    const productResult = await this.create('products', { ...cleanProduct, id: productId }, organizationId);
    if (!productResult.success) {
      console.error('[DeltaWrite] ❌ Failed to create product:', productResult.error);
      return productResult;
    }
    console.log(`[DeltaWrite] ✅ Created product ${productId}`);

    // 2. إنشاء الألوان والمقاسات
    if (options?.colors && options.colors.length > 0) {
      for (const color of options.colors) {
        const colorId = uuidv4();
        await this.create('product_colors', {
          id: colorId,
          product_id: productId,
          organization_id: organizationId,
          name: color.name,
          color_code: color.code || '#000000',
          quantity: color.quantity || 0,
          created_at: now,
          updated_at: now
        }, organizationId);

        // إنشاء المقاسات لهذا اللون
        if (color.sizes && color.sizes.length > 0) {
          for (const size of color.sizes) {
            await this.create('product_sizes', {
              id: uuidv4(),
              product_id: productId,
              color_id: colorId,
              size_name: size.name,
              quantity: size.quantity || 0,
              created_at: now,
              updated_at: now
            }, organizationId);
          }
        }
      }
      console.log(`[DeltaWrite] ✅ Created ${options.colors.length} colors`);
    }

    // 3. إنشاء الإعدادات المتقدمة
    if (options?.advancedSettings && Object.keys(options.advancedSettings).length > 0) {
      await this.create('product_advanced_settings', {
        product_id: productId,
        ...options.advancedSettings,
        created_at: now,
        updated_at: now
      }, organizationId);
      console.log(`[DeltaWrite] ✅ Created advanced settings for product ${productId}`);
    }

    // 4. إنشاء إعدادات التسويق
    if (options?.marketingSettings && Object.keys(options.marketingSettings).length > 0) {
      await this.create('product_marketing_settings', {
        id: uuidv4(),
        product_id: productId,
        organization_id: organizationId,
        ...options.marketingSettings,
        created_at: now,
        updated_at: now
      }, organizationId);
      console.log(`[DeltaWrite] ✅ Created marketing settings for product ${productId}`);
    }

    // 5. إنشاء أسعار الجملة
    if (options?.wholesaleTiers && options.wholesaleTiers.length > 0) {
      for (const tier of options.wholesaleTiers) {
        await this.create('product_wholesale_tiers', {
          id: uuidv4(),
          product_id: productId,
          min_quantity: tier.min_quantity,
          price_per_unit: tier.price_per_unit,
          created_at: now,
          updated_at: now
        }, organizationId);
      }
      console.log(`[DeltaWrite] ✅ Created ${options.wholesaleTiers.length} wholesale tiers`);
    }

    return { success: true, id: productId };
  }

  /**
   * تحديث مخزون منتج
   */
  async updateProductStock(
    productId: string,
    change: number,
    options?: { colorId?: string; sizeId?: string }
  ): Promise<WriteResult> {
    if (options?.sizeId) {
      return this.deltaUpdate('product_sizes', options.sizeId, 'quantity', change);
    } else if (options?.colorId) {
      return this.deltaUpdate('product_colors', options.colorId, 'quantity', change);
    } else {
      return this.deltaUpdate('products', productId, 'stock_quantity', change);
    }
  }

  // =====================
  // دوال مخصصة للعملاء
  // =====================

  /**
   * إنشاء عميل مع عناوين
   */
  async createCustomerWithAddresses(
    organizationId: string,
    customer: Record<string, any>,
    addresses?: Array<Record<string, any>>
  ): Promise<WriteResult> {
    const customerId = customer.id || uuidv4();

    // إنشاء العميل
    const customerResult = await this.create('customers', { ...customer, id: customerId }, organizationId);
    if (!customerResult.success) return customerResult;

    // إنشاء العناوين
    if (addresses && addresses.length > 0) {
      for (const address of addresses) {
        await this.create('customer_addresses', {
          ...address,
          id: uuidv4(),
          customer_id: customerId
        }, organizationId);
      }
    }

    return { success: true, id: customerId };
  }

  // =====================
  // دوال مخصصة للفواتير
  // =====================

  /**
   * إنشاء فاتورة مع عناصرها
   */
  async createInvoiceWithItems(
    organizationId: string,
    invoice: Record<string, any>,
    items: Array<Record<string, any>>
  ): Promise<WriteResult> {
    const invoiceId = invoice.id || uuidv4();

    // إنشاء الفاتورة
    const invoiceResult = await this.create('invoices', { ...invoice, id: invoiceId }, organizationId);
    if (!invoiceResult.success) return invoiceResult;

    // إنشاء العناصر
    for (const item of items) {
      await this.create('invoice_items', {
        ...item,
        id: uuidv4(),
        invoice_id: invoiceId
      }, organizationId);
    }

    return { success: true, id: invoiceId };
  }

  // =====================
  // دوال مخصصة للمديونيات
  // =====================

  /**
   * إضافة دفعة لدين
   */
  async addDebtPayment(
    organizationId: string,
    debtId: string,
    amount: number,
    method?: string,
    note?: string
  ): Promise<WriteResult> {
    // إنشاء سجل الدفعة
    const paymentId = uuidv4();
    await this.create('customer_debt_payments', {
      id: paymentId,
      debt_id: debtId,
      amount,
      method: method || 'cash',
      note,
      applied_at: new Date().toISOString()
    }, organizationId);

    // تحديث الدين باستخدام DELTA
    await this.deltaUpdate('customer_debts', debtId, 'paid_amount', amount);
    await this.deltaUpdate('customer_debts', debtId, 'remaining_amount', -amount);

    return { success: true, id: paymentId };
  }

  /**
   * تسجيل دفعة على دين (DELTA operation)
   */
  async recordDebtPayment(
    debtId: string,
    amount: number
  ): Promise<WriteResult> {
    try {
      // تحديث المبلغ المدفوع باستخدام DELTA
      await this.deltaUpdate('customer_debts', debtId, 'paid_amount', amount);
      return { success: true, id: debtId };
    } catch (error) {
      console.error(`[DeltaWrite] ❌ Record debt payment failed:`, error);
      return {
        success: false,
        id: debtId,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // =====================
  // دوال مخصصة للإرجاعات
  // =====================

  /**
   * إنشاء إرجاع مع استعادة المخزون
   */
  async createReturnWithInventory(
    organizationId: string,
    returnData: Record<string, any>,
    items: Array<{
      productId: string;
      quantity: number;
      colorId?: string;
      sizeId?: string;
      restoreStock?: boolean;
    } & Record<string, any>>
  ): Promise<WriteResult> {
    const returnId = returnData.id || uuidv4();

    // إنشاء الإرجاع
    const returnResult = await this.create('product_returns', { ...returnData, id: returnId }, organizationId);
    if (!returnResult.success) return returnResult;

    // إنشاء العناصر واستعادة المخزون
    for (const item of items) {
      await this.create('return_items', {
        ...item,
        id: uuidv4(),
        return_id: returnId,
        product_id: item.productId
      }, organizationId);

      // استعادة المخزون إذا طُلب
      if (item.restoreStock !== false) {
        await this.updateProductStock(item.productId, item.quantity, {
          colorId: item.colorId,
          sizeId: item.sizeId
        });
      }
    }

    return { success: true, id: returnId };
  }

  /**
   * إنشاء إرجاع مع عناصره وتحديث المخزون
   */
  async createReturnWithInventoryUpdate(
    organizationId: string,
    returnData: Record<string, any>,
    items: Array<Record<string, any>>
  ): Promise<WriteResult> {
    const returnId = returnData.id || uuidv4();

    // إنشاء الإرجاع
    const returnResult = await this.create('product_returns', { ...returnData, id: returnId }, organizationId);
    if (!returnResult.success) return returnResult;

    // إنشاء العناصر
    for (const item of items) {
      await this.create('return_items', {
        ...item,
        id: item.id || uuidv4(),
        return_id: returnId
      }, organizationId);

      // تحديث المخزون إذا كان العنصر قابل لإعادة البيع وتم طلب تحديث المخزون
      if (item.resellable && item.inventory_returned) {
        await this.updateProductStock(
          item.product_id,
          Math.abs(item.return_quantity), // موجب للزيادة
          { colorId: item.color_id, sizeId: item.size_id }
        );
      }
    }

    return { success: true, id: returnId };
  }

  // =====================
  // دوال مخصصة للخسائر
  // =====================

  /**
   * إنشاء إعلان خسارة مع خصم المخزون
   */
  async createLossWithInventory(
    organizationId: string,
    lossData: Record<string, any>,
    items: Array<{
      productId: string;
      quantity: number;
      colorId?: string;
      sizeId?: string;
    } & Record<string, any>>
  ): Promise<WriteResult> {
    const lossId = lossData.id || uuidv4();

    // إنشاء إعلان الخسارة
    const lossResult = await this.create('loss_declarations', { ...lossData, id: lossId }, organizationId);
    if (!lossResult.success) return lossResult;

    // إنشاء العناصر وخصم المخزون
    for (const item of items) {
      await this.create('loss_items', {
        ...item,
        id: uuidv4(),
        loss_id: lossId,
        product_id: item.productId
      }, organizationId);

      // خصم المخزون
      await this.updateProductStock(item.productId, -item.quantity, {
        colorId: item.colorId,
        sizeId: item.sizeId
      });
    }

    return { success: true, id: lossId };
  }

  /**
   * إنشاء خسارة مع عناصرها (بدون تحديث المخزون - يتم عند الموافقة)
   */
  async createLossWithItems(
    organizationId: string,
    lossData: Record<string, any>,
    items: Array<Record<string, any>>
  ): Promise<WriteResult> {
    const lossId = lossData.id || uuidv4();

    // إنشاء إعلان الخسارة
    const lossResult = await this.create('loss_declarations', { ...lossData, id: lossId }, organizationId);
    if (!lossResult.success) return lossResult;

    // إنشاء العناصر فقط (تحديث المخزون يتم عند الموافقة)
    for (const item of items) {
      await this.create('loss_items', {
        ...item,
        id: item.id || uuidv4(),
        loss_id: lossId
      }, organizationId);
    }

    return { success: true, id: lossId };
  }

  // =====================
  // دوال مخصصة للطلبيات
  // =====================

  /**
   * إنشاء طلبية POS مع عناصرها وتحديث المخزون
   */
  async createOrderWithItems(
    organizationId: string,
    orderData: Record<string, any>,
    items: Array<Record<string, any>>
  ): Promise<WriteResult> {
    const orderId = orderData.id || uuidv4();

    // إنشاء الطلبية
    const orderResult = await this.create('pos_orders', { ...orderData, id: orderId }, organizationId);
    if (!orderResult.success) return orderResult;

    // إنشاء العناصر وتحديث المخزون
    for (const item of items) {
      await this.create('pos_order_items', {
        ...item,
        id: item.id || uuidv4(),
        order_id: orderId
      }, organizationId);

      // خصم المخزون باستخدام DELTA operation
      const colorId = item.color_id || item.colorId || undefined;
      const sizeId = item.size_id || item.sizeId || undefined;
      const quantity = item.quantity || 1;

      try {
        await this.updateProductStock(item.product_id, -Math.abs(quantity), {
          colorId,
          sizeId
        });
      } catch {
        // تجاهل أخطاء تحديث المخزون لضمان إنشاء الطلب
        console.warn(`[DeltaWrite] ⚠️ Stock update failed for product ${item.product_id}`);
      }
    }

    return { success: true, id: orderId };
  }

  // =====================
  // دوال حفظ البيانات من السيرفر
  // =====================

  /**
   * حفظ بيانات من السيرفر (بدون إضافة للـ Outbox)
   */
  async saveFromServer<T extends Record<string, any>>(
    tableName: EntityType,
    data: T
  ): Promise<WriteResult> {
    try {
      const id = data.id;
      if (!id) {
        throw new Error('saveFromServer requires data.id');
      }

      // ⚡ تحويل synced إلى integer للـ SQLite
      const cleanedData: Record<string, any> = {};
      for (const [key, value] of Object.entries(data)) {
        if (key === 'synced') {
          cleanedData[key] = value ? 1 : 0;
        } else if (value === true) {
          cleanedData[key] = 1;
        } else if (value === false) {
          cleanedData[key] = 0;
        } else if (value === undefined) {
          // تجاهل القيم undefined
          continue;
        } else {
          cleanedData[key] = value;
        }
      }

      // كتابة مباشرة للـ SQLite بدون إضافة للـ Outbox
      await sqliteWriteQueue.write(
        `INSERT OR REPLACE INTO ${tableName} (${Object.keys(cleanedData).join(', ')})
         VALUES (${Object.keys(cleanedData).map(() => '?').join(', ')})`,
        Object.values(cleanedData)
      );

      return { success: true, id };
    } catch (error) {
      console.error(`[DeltaWrite] ❌ SaveFromServer ${tableName} failed:`, error);
      return {
        success: false,
        id: data.id || '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton
export const deltaWriteService = new DeltaWriteServiceClass();

// Export class for testing
export { DeltaWriteServiceClass as DeltaWriteService };
