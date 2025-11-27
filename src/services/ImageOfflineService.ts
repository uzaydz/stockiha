import { sqliteDB } from '@/lib/db/sqliteAPI';

/**
 * خدمة لإدارة الصور في وضع عدم الاتصال
 * تقوم بتحميل الصور وتحويلها إلى Base64 وحفظها في SQLite
 */
export class ImageOfflineService {
    private static instance: ImageOfflineService;
    private processingQueue: string[] = [];
    private isProcessing = false;
    private MAX_CONCURRENT_DOWNLOADS = 3;

    private constructor() { }

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
        const batchSize = 5;
        for (let i = 0; i < products.length; i += batchSize) {
            const batch = products.slice(i, i + batchSize);
            await Promise.all(batch.map(product => this.cacheProductImage(product)));
        }
    }

    /**
     * تحميل وحفظ صورة منتج واحد
     */
    public async cacheProductImage(product: any): Promise<void> {
        // تخطي إذا كان المنتج لديه صورة محلية بالفعل
        if (product.thumbnail_base64) return;

        // تخطي إذا لم يكن هناك رابط صورة
        const imageUrl = product.thumbnail_image || product.image_thumbnail;
        if (!imageUrl) return;

        try {
            // التحقق مما إذا كانت الصورة موجودة بالفعل في SQLite لتجنب إعادة التحميل
            // (يمكن تحسين هذا لاحقاً بفحص timestamp)

            const base64 = await this.urlToBase64(imageUrl);
            if (base64) {
                // تحديث المنتج في SQLite فقط بحقل الصورة
                await sqliteDB.upsert('products', {
                    id: product.id,
                    thumbnail_base64: base64,
                    // نحتفظ بـ organization_id لأنه مطلوب غالباً
                    organization_id: product.organization_id
                });
                console.log(`[ImageOfflineService] Cached image for product: ${product.name}`);
            }
        } catch (error) {
            console.error(`[ImageOfflineService] Error caching image for product ${product.id}:`, error);
        }
    }
}

export const imageOfflineService = ImageOfflineService.getInstance();
