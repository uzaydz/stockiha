import { inventoryDB, LocalImage } from '@/database/localDb';
import { isSQLiteDatabase } from '@/database/localDb';

// واجهة لنتيجة تحميل الصورة
interface ImageDownloadResult {
    success: boolean;
    localPath?: string;
    error?: string;
}

export const imageSyncService = {
    /**
     * تنزيل صورة وحفظها محلياً
     * @param url رابط الصورة
     * @param entityType نوع الكيان (product, category, etc)
     * @param entityId معرف الكيان
     */
    async cacheImage(url: string, entityType: 'product' | 'category' | 'user' | 'organization', entityId: string): Promise<ImageDownloadResult> {
        if (!url || !isSQLiteDatabase()) {
            return { success: false, error: 'Invalid URL or SQLite not available' };
        }

        try {
            // التحقق مما إذا كانت الصورة موجودة بالفعل
            const existing = await this.getLocalImage(url);
            if (existing) {
                return { success: true, localPath: existing.local_path };
            }

            // استخدام IPC لطلب تنزيل الصورة من العملية الرئيسية (Electron)
            // هذا يتطلب أن يكون هناك handler في main process
            if (window.electronAPI && window.electronAPI.downloadImage) {
                const result = await window.electronAPI.downloadImage(url, entityType, entityId);

                if (result.success && result.localPath) {
                    // حفظ المعلومات في قاعدة البيانات
                    const localImage: LocalImage = {
                        id: url, // استخدام URL كمعرف لسهولة البحث
                        url,
                        local_path: result.localPath,
                        entity_type: entityType,
                        entity_id: entityId,
                        file_size: result.size || 0,
                        mime_type: result.mimeType || 'image/jpeg',
                        created_at: new Date().toISOString(),
                        last_accessed: new Date().toISOString()
                    };

                    const { sqliteDB } = await import('@/lib/db/sqliteAPI');
                    await sqliteDB.upsert('local_images', localImage);

                    return { success: true, localPath: result.localPath };
                }
                return { success: false, error: result.error };
            }

            return { success: false, error: 'Electron API not available' };
        } catch (error) {
            console.error('[ImageSync] Error caching image:', error);
            return { success: false, error: String(error) };
        }
    },

    /**
     * الحصول على المسار المحلي للصورة
     */
    async getLocalImage(url: string): Promise<LocalImage | null> {
        try {
            if (isSQLiteDatabase()) {
                const { sqliteDB } = await import('@/lib/db/sqliteAPI');
                const res = await sqliteDB.queryOne('SELECT * FROM local_images WHERE url = ?', [url]);
                if (res.success && res.data) {
                    return res.data as LocalImage;
                }
            }
            return null;
        } catch (error) {
            return null;
        }
    },

    /**
     * تحويل رابط الصورة إلى رابط محلي إذا توفرت
     */
    async getLocalUrl(url: string): Promise<string> {
        const localImage = await this.getLocalImage(url);
        if (localImage && localImage.local_path) {
            // في Electron، نستخدم بروتوكول file:// أو custom protocol
            return `file://${localImage.local_path}`;
        }
        return url;
    },

    /**
     * مزامنة صور المنتجات
     * @param organizationId معرف المؤسسة
     */
    async syncProductImages(organizationId: string): Promise<void> {
        try {
            // هذه الدالة يمكن أن تكون فارغة حالياً أو تحتوي على منطق بسيط
            // لأن مزامنة الصور تحدث في الخلفية عبر TauriSyncService
            console.log('[ImageSync] syncProductImages called for org:', organizationId);

            // يمكن إضافة منطق إضافي هنا في المستقبل إذا لزم الأمر
            // مثل: جلب قائمة المنتجات وتحميل صورها

        } catch (error) {
            console.error('[ImageSync] Error syncing product images:', error);
        }
    }
};
