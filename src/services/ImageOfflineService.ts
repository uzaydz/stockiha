import { powerSyncService } from '@/lib/powersync/PowerSyncService';

/**
 * خدمة لإدارة الصور في وضع عدم الاتصال (v2.0)
 * ⚡ تم إصلاح: استخدام جدول local_image_cache المحلي بدلاً من products
 *
 * التحسينات:
 * - تخزين الصور في جدول منفصل (لا يؤثر على مزامنة المنتجات)
 * - جلب الصور من الكاش المحلي عند الحاجة
 * - تنظيف الصور القديمة تلقائياً
 */
export class ImageOfflineService {
    private static instance: ImageOfflineService;
    private processingQueue: string[] = [];
    private isProcessing = false;
    private MAX_CONCURRENT_DOWNLOADS = 3;
    private MAX_IMAGE_SIZE_KB = 300; // ⚡ تقليل الحد الأقصى للصورة من 500KB إلى 300KB
    private MAX_CACHED_IMAGES = 200; // ⚡ حد أقصى للصور المخزنة
    private AUTO_CLEANUP_DAYS = 7; // ⚡ تنظيف الصور أقدم من 7 أيام
    private cleanupIntervalId: NodeJS.Timeout | null = null;

    private constructor() {
        // ⚡ بدء التنظيف التلقائي
        this.startAutoCleanup();
    }

    /**
     * ⚡ بدء التنظيف التلقائي للصور
     */
    private startAutoCleanup(): void {
        // تنظيف كل 10 دقائق
        this.cleanupIntervalId = setInterval(async () => {
            await this.autoCleanup();
        }, 10 * 60 * 1000);

        // تنظيف أولي عند بدء التشغيل (بعد 30 ثانية)
        setTimeout(() => this.autoCleanup(), 30 * 1000);
    }

    /**
     * ⚡ تنظيف تلقائي شامل
     */
    private async autoCleanup(): Promise<void> {
        try {
            // 1. حذف الصور القديمة
            await this.cleanupOldImages(this.AUTO_CLEANUP_DAYS);

            // 2. التأكد من عدم تجاوز الحد الأقصى
            await this.enforceImageLimit();
        } catch (error) {
            console.warn('[ImageOfflineService] Auto cleanup error:', error);
        }
    }

    /**
     * ⚡ التأكد من عدم تجاوز الحد الأقصى للصور
     */
    private async enforceImageLimit(): Promise<void> {
        try {
            const stats = await this.getCacheStats();
            if (stats.count > this.MAX_CACHED_IMAGES) {
                const toDelete = stats.count - this.MAX_CACHED_IMAGES;
                await this.deleteOldestImages(toDelete);
            }
        } catch (error) {
            console.warn('[ImageOfflineService] Enforce limit error:', error);
        }
    }

    /**
     * ⚡ حذف أقدم الصور
     */
    private async deleteOldestImages(count: number): Promise<void> {
        if (!powerSyncService.db || count <= 0) return;

        try {
            await powerSyncService.db.execute(
                `DELETE FROM local_image_cache
                 WHERE id IN (
                     SELECT id FROM local_image_cache
                     ORDER BY created_at ASC
                     LIMIT ?
                 )`,
                [count]
            );
            console.log(`[ImageOfflineService] 🧹 Deleted ${count} oldest images to enforce limit`);
        } catch (error) {
            console.warn('[ImageOfflineService] Delete oldest images error:', error);
        }
    }

    public static getInstance(): ImageOfflineService {
        if (!ImageOfflineService.instance) {
            ImageOfflineService.instance = new ImageOfflineService();
        }
        return ImageOfflineService.instance;
    }

    /**
     * تحويل رابط صورة إلى Base64
     */
    public async urlToBase64(url: string): Promise<string | null> {
        try {
            const response = await fetch(url, { mode: 'cors' });
            if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);

            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64 = reader.result as string;
                    resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.warn(`[ImageOfflineService] Failed to convert URL to Base64: ${url}`, error);
            return null;
        }
    }

    /**
     * معالجة قائمة منتجات وحفظ صورها محلياً
     */
    public async processProductsImages(products: any[]) {
        if (!products || products.length === 0) return;

        console.log(`[ImageOfflineService] Processing images for ${products.length} products...`);

        // معالجة المنتجات على دفعات لتجنب تجميد المتصفح
        const batchSize = 3; // تقليل حجم الدفعة للصور
        for (let i = 0; i < products.length; i += batchSize) {
            const batch = products.slice(i, i + batchSize);
            await Promise.allSettled(batch.map(product => this.cacheProductImage(product)));
            
            // انتظار قصير بين الدفعات
            if (i + batchSize < products.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    }

    /**
     * ⚡ تحميل وحفظ صورة منتج واحد (v2.0)
     * يستخدم جدول local_image_cache المحلي
     */
    public async cacheProductImage(product: any): Promise<void> {
        // تخطي إذا لم يكن هناك رابط صورة
        const imageUrl = product.thumbnail_image || product.image_thumbnail;
        if (!imageUrl) return;

        try {
            // التأكد من أن PowerSync جاهز
            if (!powerSyncService.db) {
                try {
                    await powerSyncService.initialize();
                } catch (e) {
                    console.warn('[ImageOfflineService] PowerSync not ready, skipping image cache');
                    return;
                }
            }

            if (!powerSyncService.db) return;

            // تخطي إذا كانت الصورة موجودة في الكاش
            const existing = await powerSyncService.queryOne<any>({
                sql: 'SELECT id FROM local_image_cache WHERE product_id = ?',
                params: [product.id]
            });
            if (existing) return;

            const base64 = await this.urlToBase64(imageUrl);
            if (base64) {
                // التحقق من حجم الصورة
                const sizeKB = (base64.length * 0.75) / 1024;
                if (sizeKB > this.MAX_IMAGE_SIZE_KB) {
                    console.warn(`[ImageOfflineService] ⚠️ Image too large (${sizeKB.toFixed(0)}KB), skipping: ${product.name}`);
                    return;
                }

                // ⚡ حفظ في جدول local_image_cache المحلي
                const now = new Date().toISOString();
                await powerSyncService.db.execute(
                    `INSERT OR REPLACE INTO local_image_cache
                     (id, product_id, organization_id, base64_data, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        `img_${product.id}`,
                        product.id,
                        product.organization_id,
                        base64,
                        now,
                        now
                    ]
                );
                console.log(`[ImageOfflineService] ⚡ Cached image for: ${product.name} (${sizeKB.toFixed(0)}KB)`);
            }
        } catch (error) {
            console.error(`[ImageOfflineService] Error caching image for ${product.id}:`, error);
        }
    }

    /**
     * ⚡ جلب صورة منتج من الكاش المحلي
     */
    public async getCachedImage(productId: string): Promise<string | null> {
        try {
            if (!powerSyncService.db) return null;

            const cached = await powerSyncService.queryOne<{ base64_data: string }>({
                sql: 'SELECT base64_data FROM local_image_cache WHERE product_id = ?',
                params: [productId]
            });

            return cached?.base64_data || null;
        } catch (error) {
            console.warn(`[ImageOfflineService] Error getting cached image:`, error);
            return null;
        }
    }

    /**
     * ⚡ حذف صورة من الكاش
     */
    public async removeCachedImage(productId: string): Promise<void> {
        try {
            if (!powerSyncService.db) return;

            await powerSyncService.db.execute(
                'DELETE FROM local_image_cache WHERE product_id = ?',
                [productId]
            );
        } catch (error) {
            console.warn(`[ImageOfflineService] Error removing cached image:`, error);
        }
    }

    /**
     * ⚡ تنظيف الصور القديمة (أكثر من 7 أيام)
     */
    public async cleanupOldImages(daysOld: number = 7): Promise<number> {
        try {
            if (!powerSyncService.db) return 0;

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);

            const result = await powerSyncService.db.execute(
                'DELETE FROM local_image_cache WHERE created_at < ?',
                [cutoffDate.toISOString()]
            );

            const deletedCount = result.rowsAffected || 0;
            if (deletedCount > 0) {
                console.log(`[ImageOfflineService] 🧹 Cleaned up ${deletedCount} old images`);
            }
            return deletedCount;
        } catch (error) {
            console.warn(`[ImageOfflineService] Error cleaning up old images:`, error);
            return 0;
        }
    }

    /**
     * ⚡ الحصول على إحصائيات الكاش
     */
    public async getCacheStats(): Promise<{ count: number; sizeEstimateMB: number }> {
        try {
            if (!powerSyncService.db) return { count: 0, sizeEstimateMB: 0 };

            const result = await powerSyncService.queryOne<{ cnt: number; total_size: number }>({
                sql: 'SELECT COUNT(*) as cnt, SUM(LENGTH(base64_data)) as total_size FROM local_image_cache',
                params: []
            });

            return {
                count: result?.cnt || 0,
                sizeEstimateMB: ((result?.total_size || 0) * 0.75) / (1024 * 1024)
            };
        } catch (error) {
            return { count: 0, sizeEstimateMB: 0 };
        }
    }
}

export const imageOfflineService = ImageOfflineService.getInstance();
