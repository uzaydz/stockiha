/**
 * imageBase64Service - خدمة تخزين الصور كـ Base64 في SQLite
 * 
 * ⚡ تُستخدم للعمل Offline-First مع الصور
 * 
 * - تحويل URL إلى Base64 وتخزينها محلياً
 * - رفع الصور عند الاتصال بالإنترنت
 * - إدارة قائمة انتظار الصور للرفع
 */

import { deltaWriteService } from '@/services/DeltaWriteService';
import { supabase } from '@/lib/supabase';

// الحد الأقصى لحجم الصورة (5MB)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

// ⚡ إعدادات ضغط الصور
const IMAGE_COMPRESSION_CONFIG = {
  // الحد الأقصى للعرض/الارتفاع للـ thumbnail
  thumbnailMaxSize: 800,
  // الحد الأقصى للعرض/الارتفاع للصور الإضافية
  additionalMaxSize: 1200,
  // جودة WebP (0.0 - 1.0) - 0.85 توازن ممتاز بين الجودة والحجم
  webpQuality: 0.85,
  // جودة JPEG fallback
  jpegQuality: 0.85,
};

// Interface لنتيجة التحويل
interface ImageConversionResult {
  success: boolean;
  base64?: string;
  mimeType?: string;
  size?: number;
  originalSize?: number;
  compressionRatio?: number;
  error?: string;
}

// Interface للصورة المعلقة
export interface PendingImage {
  id: string;
  product_id: string;
  image_type: 'thumbnail' | 'additional';
  base64_data: string;
  mime_type: string;
  original_url?: string;
  file_name?: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'failed';
  retry_count: number;
  created_at: string;
  uploaded_at?: string;
  remote_url?: string;
  error?: string;
}

export const imageBase64Service = {
  /**
   * ⚡ التحقق من دعم المتصفح لـ WebP
   */
  isWebPSupported(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').startsWith('data:image/webp');
  },

  /**
   * ⚡ ضغط وتحويل الصورة إلى WebP
   * - تقليل الأبعاد إذا كانت كبيرة
   * - تحويل إلى WebP (أو JPEG كـ fallback)
   * - ضغط مع الحفاظ على الجودة
   */
  async compressImage(
    imageSource: string | File | Blob,
    options?: {
      maxSize?: number;
      quality?: number;
      forceWebP?: boolean;
    }
  ): Promise<ImageConversionResult> {
    const maxSize = options?.maxSize || IMAGE_COMPRESSION_CONFIG.thumbnailMaxSize;
    const quality = options?.quality || IMAGE_COMPRESSION_CONFIG.webpQuality;
    const useWebP = options?.forceWebP !== false && this.isWebPSupported();

    return new Promise(async (resolve) => {
      try {
        // تحويل المصدر إلى Blob
        let blob: Blob;
        let originalSize: number;

        if (typeof imageSource === 'string') {
          if (imageSource.startsWith('data:')) {
            // Data URL → Blob
            const [header, base64Data] = imageSource.split(',');
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
            const response = await fetch(imageSource);
            if (!response.ok) {
              return resolve({ success: false, error: `HTTP ${response.status}` });
            }
            blob = await response.blob();
            originalSize = blob.size;
          }
        } else {
          blob = imageSource;
          originalSize = blob.size;
        }

        // إنشاء Image element
        const img = new Image();
        const objectUrl = URL.createObjectURL(blob);

        img.onload = () => {
          URL.revokeObjectURL(objectUrl);

          // حساب الأبعاد الجديدة مع الحفاظ على النسبة
          let { width, height } = img;
          const originalWidth = width;
          const originalHeight = height;

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
            return resolve({ success: false, error: 'Canvas context not available' });
          }

          // رسم الصورة المصغرة
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // تحويل إلى WebP أو JPEG
          const outputMimeType = useWebP ? 'image/webp' : 'image/jpeg';
          const dataUrl = canvas.toDataURL(outputMimeType, quality);

          // استخراج base64 من data URL
          const [header, base64] = dataUrl.split(',');
          const finalMimeType = header.match(/data:([^;]+)/)?.[1] || outputMimeType;

          // حساب الحجم الجديد
          const newSize = Math.round((base64.length * 3) / 4); // تقريب حجم base64 إلى bytes

          const compressionRatio = originalSize > 0 ? Math.round((1 - newSize / originalSize) * 100) : 0;

          console.log(`[ImageBase64] 📸 Compressed: ${Math.round(originalSize / 1024)}KB → ${Math.round(newSize / 1024)}KB (${compressionRatio}% reduction) | ${originalWidth}x${originalHeight} → ${width}x${height} | ${finalMimeType}`);

          resolve({
            success: true,
            base64,
            mimeType: finalMimeType,
            size: newSize,
            originalSize,
            compressionRatio
          });
        };

        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          resolve({ success: false, error: 'Failed to load image' });
        };

        img.src = objectUrl;
      } catch (error) {
        console.error('[ImageBase64] Compression error:', error);
        resolve({ success: false, error: String(error) });
      }
    });
  },

  /**
   * ⚡ ضغط صورة Thumbnail (أصغر حجم)
   */
  async compressThumbnail(imageSource: string | File | Blob): Promise<ImageConversionResult> {
    return this.compressImage(imageSource, {
      maxSize: IMAGE_COMPRESSION_CONFIG.thumbnailMaxSize,
      quality: IMAGE_COMPRESSION_CONFIG.webpQuality
    });
  },

  /**
   * ⚡ ضغط صورة إضافية (حجم أكبر قليلاً)
   */
  async compressAdditionalImage(imageSource: string | File | Blob): Promise<ImageConversionResult> {
    return this.compressImage(imageSource, {
      maxSize: IMAGE_COMPRESSION_CONFIG.additionalMaxSize,
      quality: IMAGE_COMPRESSION_CONFIG.webpQuality
    });
  },

  /**
   * تحويل صورة من URL إلى Base64
   */
  async urlToBase64(url: string): Promise<ImageConversionResult> {
    if (!url) {
      return { success: false, error: 'URL is empty' };
    }

    // إذا كانت الصورة بالفعل base64
    if (url.startsWith('data:')) {
      const [header, data] = url.split(',');
      const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
      return {
        success: true,
        base64: data,
        mimeType,
        size: data.length
      };
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}` };
      }

      const blob = await response.blob();
      
      if (blob.size > MAX_IMAGE_SIZE) {
        return { success: false, error: 'Image too large (max 5MB)' };
      }

      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const [header, base64] = result.split(',');
          resolve({
            success: true,
            base64,
            mimeType: blob.type || 'image/jpeg',
            size: blob.size
          });
        };
        reader.onerror = () => {
          resolve({ success: false, error: 'Failed to read blob' });
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('[ImageBase64] Error converting URL to base64:', error);
      return { success: false, error: String(error) };
    }
  },

  /**
   * تحويل File إلى Base64
   */
  async fileToBase64(file: File): Promise<ImageConversionResult> {
    if (!file) {
      return { success: false, error: 'File is empty' };
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return { success: false, error: 'Image too large (max 5MB)' };
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const [header, base64] = result.split(',');
        resolve({
          success: true,
          base64,
          mimeType: file.type || 'image/jpeg',
          size: file.size
        });
      };
      reader.onerror = () => {
        resolve({ success: false, error: 'Failed to read file' });
      };
      reader.readAsDataURL(file);
    });
  },

  /**
   * تخزين صورة المنتج الرئيسية محلياً
   * ⚡ مع ضغط وتحويل إلى WebP
   */
  async saveThumbnailLocally(productId: string, imageSource: string | File): Promise<boolean> {
    try {
      // ⚡ ضغط الصورة وتحويلها إلى WebP
      const result = await this.compressThumbnail(imageSource);

      if (!result.success || !result.base64) {
        console.warn('[ImageBase64] Failed to compress thumbnail:', result.error);
        // Fallback: محاولة بدون ضغط
        let base64Data: string;
        let mimeType: string;

        if (typeof imageSource === 'string') {
          const fallbackResult = await this.urlToBase64(imageSource);
          if (!fallbackResult.success || !fallbackResult.base64) {
            return false;
          }
          base64Data = fallbackResult.base64;
          mimeType = fallbackResult.mimeType || 'image/jpeg';
        } else {
          const fallbackResult = await this.fileToBase64(imageSource);
          if (!fallbackResult.success || !fallbackResult.base64) {
            return false;
          }
          base64Data = fallbackResult.base64;
          mimeType = fallbackResult.mimeType || 'image/jpeg';
        }

        await deltaWriteService.update('products', productId, {
          thumbnail_base64: `data:${mimeType};base64,${base64Data}`
        });
        return true;
      }

      // تحديث المنتج بالصورة المضغوطة
      await deltaWriteService.update('products', productId, {
        thumbnail_base64: `data:${result.mimeType};base64,${result.base64}`
      });

      console.log(`[ImageBase64] ✅ Saved compressed thumbnail for product ${productId} (${result.compressionRatio}% smaller)`);
      return true;
    } catch (error) {
      console.error('[ImageBase64] Error saving thumbnail:', error);
      return false;
    }
  },

  /**
   * تخزين الصور الإضافية محلياً
   * ⚡ مع ضغط وتحويل إلى WebP
   */
  async saveAdditionalImagesLocally(productId: string, images: (string | File)[]): Promise<boolean> {
    try {
      const base64Images: string[] = [];
      let totalOriginalSize = 0;
      let totalCompressedSize = 0;

      for (const image of images) {
        // ⚡ ضغط كل صورة وتحويلها إلى WebP
        const result = await this.compressAdditionalImage(image);

        if (result.success && result.base64) {
          base64Images.push(`data:${result.mimeType};base64,${result.base64}`);
          totalOriginalSize += result.originalSize || 0;
          totalCompressedSize += result.size || 0;
        } else {
          // Fallback: محاولة بدون ضغط
          if (typeof image === 'string') {
            if (image.startsWith('data:')) {
              base64Images.push(image);
            } else if (image.startsWith('http')) {
              // URL عادي - نحتفظ به كما هو
              base64Images.push(image);
            } else {
              const fallbackResult = await this.urlToBase64(image);
              if (fallbackResult.success && fallbackResult.base64) {
                base64Images.push(`data:${fallbackResult.mimeType};base64,${fallbackResult.base64}`);
              }
            }
          } else {
            const fallbackResult = await this.fileToBase64(image);
            if (fallbackResult.success && fallbackResult.base64) {
              base64Images.push(`data:${fallbackResult.mimeType};base64,${fallbackResult.base64}`);
            }
          }
        }
      }

      // تحديث المنتج بالصور المحلية
      await deltaWriteService.update('products', productId, {
        images_base64: JSON.stringify(base64Images)
      });

      const overallReduction = totalOriginalSize > 0
        ? Math.round((1 - totalCompressedSize / totalOriginalSize) * 100)
        : 0;

      console.log(`[ImageBase64] ✅ Saved ${base64Images.length} compressed images for product ${productId} (${overallReduction}% total reduction)`);
      return true;
    } catch (error) {
      console.error('[ImageBase64] Error saving additional images:', error);
      return false;
    }
  },

  /**
   * جلب صورة المنتج (محلية أو remote)
   */
  async getProductThumbnail(product: any): Promise<string | null> {
    // أولاً: التحقق من الصورة المحلية
    if (product.thumbnail_base64) {
      return product.thumbnail_base64;
    }

    // ثانياً: التحقق من URL الصورة
    if (product.thumbnail_image) {
      return product.thumbnail_image;
    }

    if (product.image_thumbnail) {
      return product.image_thumbnail;
    }

    return null;
  },

  /**
   * جلب الصور الإضافية للمنتج (محلية أو remote)
   */
  async getProductImages(product: any): Promise<string[]> {
    // أولاً: التحقق من الصور المحلية
    if (product.images_base64) {
      try {
        const parsed = JSON.parse(product.images_base64);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {}
    }

    // ثانياً: التحقق من URLs الصور
    if (product.images) {
      try {
        const parsed = typeof product.images === 'string' 
          ? JSON.parse(product.images) 
          : product.images;
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {}
    }

    return [];
  },

  /**
   * رفع صورة إلى Supabase Storage
   */
  async uploadToStorage(
    base64Data: string, 
    organizationId: string,
    productId: string,
    imageType: 'thumbnail' | 'additional',
    index?: number
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

      // تحديد المسار واسم الملف
      const ext = mimeType.split('/')[1] || 'jpg';
      const fileName = imageType === 'thumbnail' 
        ? `${productId}_thumb.${ext}`
        : `${productId}_${index || Date.now()}.${ext}`;
      const filePath = `${organizationId}/products/${fileName}`;

      // رفع الصورة
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(filePath, blob, {
          contentType: mimeType,
          upsert: true
        });

      if (error) {
        // ⚡ تجاهل خطأ عدم وجود الـ bucket - الصور المحلية ستعمل بشكل طبيعي
        if (error.message?.includes('Bucket not found')) {
          console.warn('[ImageBase64] ⚠️ Storage bucket "product-images" not found. Images will work locally via thumbnail_base64.');
          return { success: false, error: 'Storage bucket not configured' };
        }
        console.error('[ImageBase64] Upload error:', error);
        return { success: false, error: error.message };
      }

      // الحصول على URL العام
      const { data: publicUrl } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      console.log(`[ImageBase64] ✅ Uploaded ${imageType} for product ${productId}`);
      return { success: true, url: publicUrl.publicUrl };
    } catch (error) {
      console.error('[ImageBase64] Upload error:', error);
      return { success: false, error: String(error) };
    }
  },

  /**
   * مزامنة صور المنتج المحلية مع الخادم
   * ⚡ يرفع الصور للـ Storage ويحدث URLs ويمسح base64 المحلي
   */
  async syncProductImages(productId: string, organizationId: string): Promise<{
    thumbnailUrl?: string;
    additionalUrls?: string[];
    errors: string[];
  }> {
    const errors: string[] = [];
    let thumbnailUrl: string | undefined;
    const additionalUrls: string[] = [];
    let thumbnailSynced = false;
    let additionalSynced = false;

    try {
      // جلب المنتج
      const product = await deltaWriteService.get<any>('products', productId);
      if (!product) {
        return { errors: ['Product not found'] };
      }

      console.log(`[ImageBase64] 🔍 Checking product ${productId.slice(0, 8)} for images to sync...`);
      console.log(`[ImageBase64] 🔍 thumbnail_base64: ${product.thumbnail_base64 ? `exists (${Math.round(product.thumbnail_base64.length / 1024)}KB)` : 'none'}`);
      console.log(`[ImageBase64] 🔍 thumbnail_image: ${product.thumbnail_image || 'none'}`);
      console.log(`[ImageBase64] 🔍 images_base64: ${product.images_base64 ? `exists (${Math.round(product.images_base64.length / 1024)}KB)` : 'none'}`);

      // رفع الصورة الرئيسية
      if (product.thumbnail_base64 && (!product.thumbnail_image || !product.thumbnail_image.includes('supabase'))) {
        console.log(`[ImageBase64] 📤 Uploading thumbnail for product ${productId.slice(0, 8)}...`);
        const result = await this.uploadToStorage(
          product.thumbnail_base64,
          organizationId,
          productId,
          'thumbnail'
        );

        if (result.success && result.url) {
          thumbnailUrl = result.url;
          thumbnailSynced = true;
          console.log(`[ImageBase64] ✅ Thumbnail uploaded: ${result.url}`);
        } else if (result.error) {
          errors.push(`Thumbnail: ${result.error}`);
          console.warn(`[ImageBase64] ⚠️ Thumbnail upload failed: ${result.error}`);
        }
      }

      // رفع الصور الإضافية
      if (product.images_base64) {
        try {
          const localImages = JSON.parse(product.images_base64);
          if (Array.isArray(localImages) && localImages.length > 0) {
            console.log(`[ImageBase64] 📤 Uploading ${localImages.length} additional images for product ${productId.slice(0, 8)}...`);

            for (let i = 0; i < localImages.length; i++) {
              const img = localImages[i];
              if (typeof img === 'string' && img.startsWith('data:')) {
                const result = await this.uploadToStorage(
                  img,
                  organizationId,
                  productId,
                  'additional',
                  i
                );

                if (result.success && result.url) {
                  additionalUrls.push(result.url);
                } else if (result.error) {
                  errors.push(`Image ${i}: ${result.error}`);
                }
              } else if (typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://'))) {
                // URL موجود بالفعل - نحتفظ به
                additionalUrls.push(img);
              }
            }

            additionalSynced = additionalUrls.length > 0;
          }
        } catch (parseError) {
          console.warn(`[ImageBase64] ⚠️ Failed to parse images_base64:`, parseError);
        }
      }

      // ⚡ تحديث المنتج: URLs الجديدة + مسح base64 المحلي
      if (thumbnailSynced || additionalSynced) {
        const updateData: Record<string, any> = {};

        if (thumbnailSynced && thumbnailUrl) {
          updateData.thumbnail_image = thumbnailUrl;
          updateData.thumbnail_base64 = null;  // ⚡ مسح base64 بعد الرفع الناجح
        }

        if (additionalSynced && additionalUrls.length > 0) {
          updateData.images = JSON.stringify(additionalUrls);
          updateData.images_base64 = null;  // ⚡ مسح base64 بعد الرفع الناجح
        }

        // ⚡ استخدام updateLocalOnly لتجنب إضافة عملية جديدة للـ Outbox
        await deltaWriteService.updateLocalOnly('products', productId, updateData);

        console.log(`[ImageBase64] ✅ Product ${productId.slice(0, 8)} updated with new URLs and base64 cleared`);

        // ⚡ تحديث Supabase أيضاً مباشرة
        try {
          const { error: supabaseError } = await supabase
            .from('products')
            .update({
              thumbnail_image: thumbnailUrl || product.thumbnail_image,
              images: additionalUrls.length > 0 ? additionalUrls : (product.images || null)
            })
            .eq('id', productId);

          if (supabaseError) {
            console.warn(`[ImageBase64] ⚠️ Failed to update Supabase product:`, supabaseError);
          } else {
            console.log(`[ImageBase64] ✅ Supabase product ${productId.slice(0, 8)} updated with image URLs`);
          }
        } catch (supabaseErr) {
          console.warn(`[ImageBase64] ⚠️ Exception updating Supabase:`, supabaseErr);
        }
      }

      console.log(`[ImageBase64] ✅ Synced images for product ${productId.slice(0, 8)} (thumbnail: ${thumbnailSynced ? 'yes' : 'no'}, additional: ${additionalUrls.length})`);
      return { thumbnailUrl, additionalUrls, errors };
    } catch (error) {
      console.error('[ImageBase64] Sync error:', error);
      return { errors: [String(error)] };
    }
  },

  /**
   * مزامنة جميع صور المنتجات المعلقة
   */
  async syncAllPendingImages(organizationId: string): Promise<{
    synced: number;
    failed: number;
  }> {
    let synced = 0;
    let failed = 0;

    try {
      // جلب المنتجات غير المتزامنة أو التي لها صور محلية
      const products = await deltaWriteService.getAll<any>('products', organizationId);
      
      for (const product of products) {
        // التحقق من وجود صور محلية تحتاج للرفع
        const needsSync = 
          (product.thumbnail_base64 && !product.thumbnail_image?.includes('supabase')) ||
          (product.images_base64 && product.images_base64.includes('data:'));

        if (needsSync) {
          const result = await this.syncProductImages(product.id, organizationId);
          if (result.errors.length === 0) {
            synced++;
          } else {
            failed++;
          }
        }
      }

      console.log(`[ImageBase64] ✅ Sync complete: ${synced} synced, ${failed} failed`);
      return { synced, failed };
    } catch (error) {
      console.error('[ImageBase64] Sync all error:', error);
      return { synced, failed };
    }
  }
};
