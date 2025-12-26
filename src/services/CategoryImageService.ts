/**
 * CategoryImageService - خدمة صور الفئات الموحدة
 * ================================================
 *
 * ⚡ v1.0 - دعم Offline الكامل لصور الفئات
 *
 * المميزات:
 * - ضغط ذكي للصور (WebP/JPEG)
 * - تخزين محلي في SQLite
 * - مزامنة تلقائية مع Supabase Storage
 * - عرض الصور Offline
 * - تنظيف تلقائي للصور القديمة
 */

import { powerSyncService } from '@/lib/powersync/PowerSyncService';
import { supabase } from '@/lib/supabase';

// =====================================================
// إعدادات الضغط المحسّنة
// =====================================================

const IMAGE_CONFIG = {
  // ⚡ أبعاد صور الفئات (محسّنة للعرض على الشاشات المختلفة)
  categoryMaxSize: 320,        // 320x320 px للفئات لتقليل الحجم
  categoryIconSize: 96,        // 96x96 px للأيقونات

  // ⚡ جودة الضغط المحسّنة - تختلف حسب الصيغة
  webpQuality: 0.72,           // جودة WebP أقل لتقليل الحجم
  jpegQuality: 0.68,           // جودة JPEG البديل

  // ⚡ الحدود
  maxFileSizeKB: 400,          // 400KB كحد أقصى للصورة الأصلية
  maxBase64SizeKB: 90,         // 90KB كحد أقصى بعد الضغط (للتخزين المحلي)

  // ⚡ Storage bucket - استخدام bucket الموجود
  storageBucket: 'product-images',

  // ⚡ إعدادات الضغط المتقدمة
  enableAdaptiveQuality: true, // تعديل الجودة تلقائياً حسب الحجم
  minQuality: 0.4,             // الحد الأدنى للجودة
  targetSizeKB: 60,            // الحجم المستهدف
};

// =====================================================
// أنواع البيانات
// =====================================================

interface CompressionResult {
  success: boolean;
  base64?: string;
  dataUrl?: string;
  mimeType?: string;
  originalSize?: number;
  compressedSize?: number;
  compressionRatio?: number;
  error?: string;
}

interface CategoryImage {
  id: string;
  category_id: string;
  image_url?: string;
  image_base64?: string;
}

// =====================================================
// الخدمة الرئيسية
// =====================================================

class CategoryImageServiceClass {
  private webpSupported: boolean | null = null;

  /**
   * ⚡ التحقق من دعم WebP
   */
  isWebPSupported(): boolean {
    if (this.webpSupported !== null) return this.webpSupported;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      this.webpSupported = canvas.toDataURL('image/webp').startsWith('data:image/webp');
    } catch {
      this.webpSupported = false;
    }

    return this.webpSupported;
  }

  /**
   * ⚡ جلب صورة عبر Canvas (يتجاوز CORS للصور التي تسمح بذلك)
   * هذه الطريقة تعمل مع Supabase Storage لأنها تسمح بـ crossOrigin
   */
  private fetchImageViaCanvas(url: string): Promise<Blob | null> {
    return new Promise((resolve) => {
      const img = new Image();

      // ⚡ محاولة أولى: مع crossOrigin
      img.crossOrigin = 'anonymous';

      const timeout = setTimeout(() => {
        img.src = '';
        resolve(null);
      }, 15000); // 15 ثانية timeout

      img.onload = () => {
        clearTimeout(timeout);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || 400;
          canvas.height = img.naturalHeight || 400;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }

          ctx.drawImage(img, 0, 0);

          // تحويل إلى blob
          canvas.toBlob((blob) => {
            resolve(blob);
          }, 'image/jpeg', 0.9);
        } catch (e) {
          // ⚡ إذا فشل بسبب tainted canvas، نحاول بدون crossOrigin
          console.warn('[CategoryImage] Canvas tainted, trying without crossOrigin');
          this.fetchImageWithoutCors(url).then(resolve);
        }
      };

      img.onerror = () => {
        clearTimeout(timeout);
        // ⚡ محاولة ثانية: بدون crossOrigin
        console.warn('[CategoryImage] Image load failed with crossOrigin, trying without');
        this.fetchImageWithoutCors(url).then(resolve);
      };

      // إضافة timestamp لتجاوز cache المتصفح
      const separator = url.includes('?') ? '&' : '?';
      img.src = `${url}${separator}_t=${Date.now()}`;
    });
  }

  /**
   * ⚡ جلب صورة بدون CORS (للصور من نفس المصدر أو التي تسمح بذلك)
   */
  private fetchImageWithoutCors(url: string): Promise<Blob | null> {
    return new Promise((resolve) => {
      const img = new Image();
      // بدون crossOrigin - يعمل مع الصور من نفس المصدر

      const timeout = setTimeout(() => {
        img.src = '';
        resolve(null);
      }, 10000);

      img.onload = () => {
        clearTimeout(timeout);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || 400;
          canvas.height = img.naturalHeight || 400;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }

          ctx.drawImage(img, 0, 0);

          canvas.toBlob((blob) => {
            resolve(blob);
          }, 'image/jpeg', 0.85);
        } catch (e) {
          console.warn('[CategoryImage] All canvas methods failed:', e);
          resolve(null);
        }
      };

      img.onerror = () => {
        clearTimeout(timeout);
        resolve(null);
      };

      img.src = url;
    });
  }

  /**
   * ⚡ ضغط صورة الفئة
   * - تصغير الأبعاد
   * - تحويل إلى WebP (أو JPEG)
   * - ضغط الجودة
   */
  async compressImage(
    source: string | File | Blob,
    options?: { maxSize?: number; quality?: number; isIcon?: boolean }
  ): Promise<CompressionResult> {
    const maxSize = options?.isIcon
      ? IMAGE_CONFIG.categoryIconSize
      : (options?.maxSize || IMAGE_CONFIG.categoryMaxSize);
    const quality = options?.quality || IMAGE_CONFIG.webpQuality;
    const useWebP = this.isWebPSupported();

    return new Promise(async (resolve) => {
      try {
        // تحويل المصدر إلى Blob
        let blob: Blob;
        let originalSize: number;

        if (typeof source === 'string') {
          if (source.startsWith('data:')) {
            // Data URL → Blob
            const [header, base64Data] = source.split(',');
            const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            blob = new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
            originalSize = blob.size;
          } else {
            // URL → fetch → Blob
            // ⚡ تحسين: محاولات متعددة مع استراتيجيات مختلفة
            let fetchSuccess = false;

            // ⚡ محاولات متعددة بترتيب الأفضلية
            const fetchMethods = [
              // المحاولة 1: fetch مع CORS (الأسرع)
              async (): Promise<Blob | null> => {
                try {
                  const response = await fetch(source, {
                    mode: 'cors',
                    credentials: 'omit',
                    cache: 'default'
                  });
                  if (response.ok) return response.blob();
                } catch { /* تجاهل */ }
                return null;
              },
              // المحاولة 2: fetch بدون mode محدد (للصور من Supabase)
              async (): Promise<Blob | null> => {
                try {
                  const response = await fetch(source, { credentials: 'omit' });
                  if (response.ok) return response.blob();
                } catch { /* تجاهل */ }
                return null;
              },
              // المحاولة 3: Image element مع crossOrigin
              async (): Promise<Blob | null> => {
                return this.fetchImageViaCanvas(source);
              },
              // المحاولة 4: Image element بدون crossOrigin
              async (): Promise<Blob | null> => {
                return this.fetchImageWithoutCors(source);
              }
            ];

            for (const method of fetchMethods) {
              try {
                const result = await method();
                if (result && result.size > 0) {
                  blob = result;
                  originalSize = blob.size;
                  fetchSuccess = true;
                  break;
                }
              } catch { /* تجاهل */ }
            }

            if (!fetchSuccess) {
              // ⚡ تسجيل مختصر للفشل
              console.warn('[CategoryImage] ⚠️ Could not fetch image:', source.substring(0, 60) + '...');
              return resolve({ success: false, error: 'Failed to load image' });
            }
          }
        } else {
          blob = source;
          originalSize = blob.size;
        }

        // التحقق من الحجم
        if (originalSize > IMAGE_CONFIG.maxFileSizeKB * 1024) {
          console.warn(`[CategoryImage] Image too large: ${Math.round(originalSize / 1024)}KB`);
        }

        // إنشاء Image element
        const img = new Image();
        img.crossOrigin = 'anonymous';
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

          // إنشاء Canvas
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve({ success: false, error: 'Canvas context not available' });
          }

          // ⚡ تحسينات الرسم
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // ⚡ خلفية بيضاء للصور الشفافة (تقليل الحجم)
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);

          // رسم الصورة
          ctx.drawImage(img, 0, 0, width, height);

          // ⚡ ضغط تكيفي - يقلل الجودة تلقائياً إذا كان الحجم كبيراً
          const outputMimeType = useWebP ? 'image/webp' : 'image/jpeg';
          let currentQuality = quality;
          let dataUrl = canvas.toDataURL(outputMimeType, currentQuality);
          let base64 = dataUrl.split(',')[1];
          let compressedSize = Math.round((base64.length * 3) / 4);

          // ⚡ ضغط تكيفي: إذا كان الحجم أكبر من المستهدف، نقلل الجودة تدريجياً
          if (IMAGE_CONFIG.enableAdaptiveQuality) {
            const targetSize = IMAGE_CONFIG.targetSizeKB * 1024;
            let attempts = 0;
            const maxAttempts = 5;

            while (compressedSize > targetSize && currentQuality > IMAGE_CONFIG.minQuality && attempts < maxAttempts) {
              currentQuality -= 0.1;
              dataUrl = canvas.toDataURL(outputMimeType, currentQuality);
              base64 = dataUrl.split(',')[1];
              compressedSize = Math.round((base64.length * 3) / 4);
              attempts++;
            }
          }

          // ⚡ إن كان الحجم مازال كبيراً جداً، نصغر الأبعاد تدريجياً
          const maxBase64Size = IMAGE_CONFIG.maxBase64SizeKB * 1024;
          let resizeAttempts = 0;
          while (compressedSize > maxBase64Size && resizeAttempts < 4 && width > 120 && height > 120) {
            width = Math.max(120, Math.round(width * 0.85));
            height = Math.max(120, Math.round(height * 0.85));
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            currentQuality = Math.max(IMAGE_CONFIG.minQuality, currentQuality - 0.05);
            dataUrl = canvas.toDataURL(outputMimeType, currentQuality);
            base64 = dataUrl.split(',')[1];
            compressedSize = Math.round((base64.length * 3) / 4);
            resizeAttempts++;
          }

          // استخراج header و base64
          const [header] = dataUrl.split(',');
          const finalMimeType = header.match(/data:([^;]+)/)?.[1] || outputMimeType;

          // حساب نسبة الضغط
          const compressionRatio = originalSize > 0
            ? Math.round((1 - compressedSize / originalSize) * 100)
            : 0;

          // ⚡ تسجيل فقط إذا كان هناك ضغط فعلي
          if (compressionRatio > 0) {
            console.log(`[CategoryImage] ✅ Compressed: ${Math.round(originalSize / 1024)}KB → ${Math.round(compressedSize / 1024)}KB (${compressionRatio}% reduction, quality: ${(currentQuality * 100).toFixed(0)}%)`);
          }

          resolve({
            success: true,
            base64,
            dataUrl,
            mimeType: finalMimeType,
            originalSize,
            compressedSize,
            compressionRatio
          });
        };

        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          resolve({ success: false, error: 'Failed to load image' });
        };

        img.src = objectUrl;
      } catch (error) {
        console.error('[CategoryImage] Compression error:', error);
        resolve({ success: false, error: String(error) });
      }
    });
  }

  /**
   * ⚡ حفظ صورة الفئة محلياً
   */
  async saveCategoryImageLocally(
    categoryId: string,
    imageSource: string | File
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // ضغط الصورة
      const result = await this.compressImage(imageSource);

      if (!result.success || !result.dataUrl) {
        console.warn('[CategoryImage] Compression failed:', result.error);
        return { success: false, error: result.error };
      }

      // حفظ في قاعدة البيانات
      await powerSyncService.transaction(async (tx) => {
        await tx.execute(
          `UPDATE product_categories SET image_base64 = ?, updated_at = ? WHERE id = ?`,
          [result.dataUrl, new Date().toISOString(), categoryId]
        );
      });

      console.log(`[CategoryImage] ✅ Saved image for category ${categoryId} (${result.compressionRatio}% compression)`);
      return { success: true };
    } catch (error) {
      console.error('[CategoryImage] Save error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * ⚡ جلب صورة الفئة (cache محلي أولاً ثم قاعدة البيانات ثم URL)
   */
  getCategoryImage(category: any): string | null {
    // أولاً: الـ cache المحلي (الأسرع - بدون رفع للسيرفر)
    this.loadLocalCache();
    const cachedImage = this.localImageCache.get(category.id);
    if (cachedImage) {
      return cachedImage;
    }

    // ثانياً: الصورة في قاعدة البيانات (للـ Offline)
    if (category.image_base64) {
      return category.image_base64;
    }

    // ثالثاً: رابط الصورة (Online)
    if (category.image_url) {
      return category.image_url;
    }

    return null;
  }

  // ⚡ Cache محلي للصور المخزنة (لتجنب إعادة التخزين)
  private localImageCache: Map<string, string> = new Map();
  private cacheInitialized = false;

  /**
   * ⚡ تحميل الصور المخزنة من localStorage عند البدء
   */
  private loadLocalCache(): void {
    if (this.cacheInitialized) return;
    try {
      const cached = localStorage.getItem('category_images_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        Object.entries(parsed).forEach(([id, data]) => {
          this.localImageCache.set(id, data as string);
        });
      }
      this.cacheInitialized = true;
    } catch {
      this.cacheInitialized = true;
    }
  }

  /**
   * ⚡ حفظ الـ cache في localStorage
   */
  private saveLocalCache(): void {
    try {
      const obj: Record<string, string> = {};
      this.localImageCache.forEach((value, key) => {
        obj[key] = value;
      });
      localStorage.setItem('category_images_cache', JSON.stringify(obj));
    } catch {
      // تجاهل - ربما localStorage ممتلئ
    }
  }

  /**
   * ⚡ الحصول على صورة من الـ cache المحلي
   */
  getLocalCachedImage(categoryId: string): string | null {
    this.loadLocalCache();
    return this.localImageCache.get(categoryId) || null;
  }

  /**
   * ⚡ تحميل صور الفئات من URLs وتخزينها في cache محلي (بدون PowerSync)
   * ⚠️ مهم: لا نحفظ في قاعدة البيانات لتجنب الرفع المتكرر إلى السيرفر
   */
  async cacheAllCategoryImages(organizationId: string): Promise<{
    cached: number;
    failed: number;
    skipped: number;
  }> {
    this.loadLocalCache();
    let cached = 0;
    let failed = 0;
    let skipped = 0;

    try {
      // جلب الفئات التي لها صور URL صالحة (ليست فارغة)
      const categories = await powerSyncService.query<any>({
        sql: `SELECT id, image_url, image_base64 FROM product_categories
              WHERE organization_id = ?
              AND image_url IS NOT NULL
              AND image_url != ''
              AND image_url LIKE 'http%'`,
        params: [organizationId]
      });

      console.log(`[CategoryImage] 📥 Caching images for ${categories.length} categories...`);

      for (const category of categories) {
        // تخطي إذا كانت الصورة موجودة في الـ cache المحلي أو في قاعدة البيانات
        if (this.localImageCache.has(category.id) || category.image_base64) {
          skipped++;
          continue;
        }

        // ⚡ تحقق من صلاحية الرابط أولاً
        if (!category.image_url || !category.image_url.startsWith('http')) {
          failed++;
          console.warn(`[CategoryImage] ⚠️ Invalid URL for ${category.id}:`, category.image_url?.substring(0, 50) || 'empty');
          continue;
        }

        // تحميل وضغط الصورة
        const result = await this.compressImage(category.image_url);

        if (result.success && result.dataUrl) {
          // ⚡ حفظ في الـ cache المحلي فقط (بدون قاعدة البيانات)
          this.localImageCache.set(category.id, result.dataUrl);
          cached++;
        } else {
          failed++;
          // ⚡ تسجيل الرابط الذي فشل للتشخيص
          console.warn(`[CategoryImage] ⚠️ Failed: ${category.id}`, {
            url: category.image_url?.substring(0, 80) + '...',
            error: result.error
          });
        }

        // تأخير صغير لتجنب الضغط على الشبكة
        await new Promise(r => setTimeout(r, 50));
      }

      // حفظ الـ cache في localStorage
      if (cached > 0) {
        this.saveLocalCache();
      }

      console.log(`[CategoryImage] ✅ Cache complete: ${cached} cached, ${failed} failed, ${skipped} skipped`);
      return { cached, failed, skipped };
    } catch (error) {
      console.error('[CategoryImage] Cache all error:', error);
      return { cached, failed, skipped };
    }
  }

  /**
   * ⚡ رفع صورة إلى Supabase Storage
   */
  async uploadToStorage(
    base64Data: string,
    organizationId: string,
    categoryId: string
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // تحويل base64 إلى Blob
      let dataToProcess = base64Data;
      let mimeType = 'image/jpeg';

      if (base64Data.startsWith('data:')) {
        const [header, data] = base64Data.split(',');
        mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
        dataToProcess = data;
      }

      const byteCharacters = atob(dataToProcess);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });

      // مسار الملف
      const ext = mimeType.split('/')[1] || 'jpg';
      const fileName = `${categoryId}.${ext}`;
      const filePath = `${organizationId}/categories/${fileName}`;

      // رفع الصورة
      const { error } = await supabase.storage
        .from(IMAGE_CONFIG.storageBucket)
        .upload(filePath, blob, {
          contentType: mimeType,
          upsert: true
        });

      if (error) {
        // تجاهل خطأ عدم وجود الـ bucket
        if (error.message?.includes('Bucket not found')) {
          console.warn('[CategoryImage] ⚠️ Storage bucket not found. Using local image.');
          return { success: false, error: 'Storage bucket not configured' };
        }
        return { success: false, error: error.message };
      }

      // الحصول على URL العام
      const { data: publicUrl } = supabase.storage
        .from(IMAGE_CONFIG.storageBucket)
        .getPublicUrl(filePath);

      console.log(`[CategoryImage] ✅ Uploaded image for category ${categoryId}`);
      return { success: true, url: publicUrl.publicUrl };
    } catch (error) {
      console.error('[CategoryImage] Upload error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * ⚡ مزامنة صورة فئة واحدة
   */
  async syncCategoryImage(
    categoryId: string,
    organizationId: string
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // جلب الفئة
      const category = await powerSyncService.queryOne<any>({
        sql: 'SELECT id, image_base64, image_url FROM product_categories WHERE id = ?',
        params: [categoryId]
      });

      if (!category) {
        return { success: false, error: 'Category not found' };
      }

      // التحقق من وجود صورة محلية
      if (!category.image_base64) {
        return { success: false, error: 'No local image to sync' };
      }

      // رفع الصورة
      const result = await this.uploadToStorage(
        category.image_base64,
        organizationId,
        categoryId
      );

      if (!result.success || !result.url) {
        return result;
      }

      // تحديث الفئة: URL الجديد + مسح base64
      await powerSyncService.transaction(async (tx) => {
        await tx.execute(
          `UPDATE product_categories SET image_url = ?, image_base64 = NULL, updated_at = ? WHERE id = ?`,
          [result.url, new Date().toISOString(), categoryId]
        );
      });

      // تحديث Supabase مباشرة
      try {
        await supabase
          .from('product_categories')
          .update({ image_url: result.url })
          .eq('id', categoryId);
      } catch (e) {
        console.warn('[CategoryImage] Supabase update failed:', e);
      }

      return { success: true, url: result.url };
    } catch (error) {
      console.error('[CategoryImage] Sync error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * ⚡ مزامنة جميع صور الفئات المعلقة
   */
  async syncAllPendingImages(organizationId: string): Promise<{
    synced: number;
    failed: number;
  }> {
    let synced = 0;
    let failed = 0;

    try {
      // جلب الفئات التي لها صور محلية غير مرفوعة
      const categories = await powerSyncService.query<any>({
        sql: `SELECT id FROM product_categories
              WHERE organization_id = ?
              AND image_base64 IS NOT NULL
              AND (image_url IS NULL OR image_url = '')`,
        params: [organizationId]
      });

      console.log(`[CategoryImage] 📤 Syncing ${categories.length} category images...`);

      for (const category of categories) {
        const result = await this.syncCategoryImage(category.id, organizationId);
        if (result.success) {
          synced++;
        } else {
          failed++;
        }
      }

      console.log(`[CategoryImage] ✅ Sync complete: ${synced} synced, ${failed} failed`);
      return { synced, failed };
    } catch (error) {
      console.error('[CategoryImage] Sync all error:', error);
      return { synced, failed };
    }
  }

  /**
   * ⚡ تنظيف الصور المحلية القديمة (للفئات التي لها URL)
   */
  async cleanupLocalImages(organizationId: string): Promise<number> {
    try {
      // حذف base64 للفئات التي لها URL صالح
      const result = await powerSyncService.transaction(async (tx) => {
        await tx.execute(
          `UPDATE product_categories
           SET image_base64 = NULL
           WHERE organization_id = ?
           AND image_url IS NOT NULL
           AND image_url LIKE 'http%'
           AND image_base64 IS NOT NULL`,
          [organizationId]
        );
      });

      console.log('[CategoryImage] ✅ Cleanup completed');
      return 0;
    } catch (error) {
      console.error('[CategoryImage] Cleanup error:', error);
      return 0;
    }
  }
}

// =====================================================
// تصدير المثيل الوحيد
// =====================================================

export const categoryImageService = new CategoryImageServiceClass();
export default categoryImageService;

// =====================================================
// ⚡ الاستماع لتغيرات الاتصال - مزامنة الصور تلقائياً
// =====================================================

if (typeof window !== 'undefined') {
  // عند الاتصال بالإنترنت - مزامنة الصور المعلقة
  window.addEventListener('online', async () => {
    try {
      const organizationId = localStorage.getItem('currentOrganizationId') ||
                             localStorage.getItem('bazaar_organization_id');
      if (organizationId) {
        console.log('[CategoryImage] 🔄 Online detected - syncing pending images...');
        const result = await categoryImageService.syncAllPendingImages(organizationId);
        if (result.synced > 0) {
          console.log(`[CategoryImage] ✅ Synced ${result.synced} images after coming online`);
        }
      }
    } catch (error) {
      console.warn('[CategoryImage] ⚠️ Auto-sync on online failed:', error);
    }
  });

  // الاستماع لـ connection-state-change (Tauri)
  window.addEventListener('connection-state-change', async (e: any) => {
    if (e.detail?.isOnline) {
      try {
        const organizationId = localStorage.getItem('currentOrganizationId') ||
                               localStorage.getItem('bazaar_organization_id');
        if (organizationId) {
          console.log('[CategoryImage] 🔄 Connection restored - syncing pending images...');
          // تأخير صغير للتأكد من استقرار الاتصال
          setTimeout(async () => {
            const result = await categoryImageService.syncAllPendingImages(organizationId);
            if (result.synced > 0) {
              console.log(`[CategoryImage] ✅ Synced ${result.synced} images after connection restored`);
            }
          }, 1000);
        }
      } catch (error) {
        console.warn('[CategoryImage] ⚠️ Auto-sync on connection restored failed:', error);
      }
    }
  });
}
