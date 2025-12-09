/**
 * ⚡ localCategoryService - Adapter للخدمة الموحدة
 * 
 * هذا الملف يُعيد التصدير من UnifiedProductService للحصول على التصنيفات
 * 
 * تم استبدال التنفيذ القديم بـ UnifiedProductService للعمل Offline-First
 */

import { unifiedProductService } from '@/services/UnifiedProductService';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';

// إعادة تصدير التصنيفات من الخدمة الموحدة
export { unifiedProductService };
export type { ProductCategory, ProductSubcategory } from '@/services/UnifiedProductService';

// دوال مساعدة للتوافق
export const getCategories = () => unifiedProductService.getCategories();
export const getSubcategories = (categoryId?: string) => unifiedProductService.getSubcategories(categoryId);

// إعادة تصدير كـ default
export default unifiedProductService;

// ========================================
// Additional Category Functions
// ========================================

export interface LocalCategory {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  image_url?: string;
  image_base64?: string;
  is_active: boolean;
  type: 'product' | 'service' | 'physical' | 'digital' | 'mixed';
  parent_id?: string;
  display_order?: number;
  created_at?: string;
  updated_at?: string;
  // ⚡ v3.0: PowerSync يدير المزامنة تلقائياً - لا حاجة لحقول synced
}

/**
 * Convert File to base64 for offline storage
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

/**
 * Upload image to Supabase Storage
 */
const uploadImageToStorage = async (file: File, folder: string): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file);

    if (uploadError) {
      console.error('[localCategoryService] Upload error:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error('[localCategoryService] Error uploading image:', error);
    return null;
  }
};

export const createLocalCategoryWithImage = async (
  organizationId: string,
  categoryData: {
    name: string;
    slug: string;
    description?: string | null;
    icon?: string | null;
    image_url?: string | null;
    is_active: boolean;
    type: 'physical' | 'digital' | 'service' | 'mixed' | 'product';
    organization_id: string;
  },
  imageFile?: File
): Promise<LocalCategory> => {
  const categoryId = uuidv4();
  const now = new Date().toISOString();
  
  let imageUrl = categoryData.image_url || null;
  let imageBase64: string | null = null;
  
  // Handle image upload
  if (imageFile) {
    // Try to upload to storage if online
    const isOnline = typeof navigator !== 'undefined' && navigator.onLine;
    if (isOnline) {
      const uploadedUrl = await uploadImageToStorage(imageFile, 'categories');
      if (uploadedUrl) {
        imageUrl = uploadedUrl;
      } else {
        // Fallback to base64 if upload fails
        imageBase64 = await fileToBase64(imageFile);
      }
    } else {
      // Store as base64 for offline
      imageBase64 = await fileToBase64(imageFile);
    }
  }
  
  const newCategory: LocalCategory = {
    id: categoryId,
    organization_id: organizationId,
    name: categoryData.name,
    slug: categoryData.slug,
    description: categoryData.description || null,
    icon: categoryData.icon || null,
    image_url: imageUrl,
    image_base64: imageBase64,
    is_active: categoryData.is_active,
    type: categoryData.type === 'service' ? 'service' : 'product',
    created_at: now,
    updated_at: now,
    // ⚡ v3.0: PowerSync يدير المزامنة تلقائياً - لا حاجة لحقول synced
  };
  
  await powerSyncService.transaction(async (tx) => {
    const cols = Object.keys(newCategory).filter(k => newCategory[k as keyof LocalCategory] !== undefined);
    const placeholders = cols.map(() => '?').join(', ');
    const values = cols.map(col => {
      const val = (newCategory as any)[col];
      // Convert boolean to integer for SQLite
      if (typeof val === 'boolean') return val ? 1 : 0;
      return val;
    });
    
    await tx.execute(
      `INSERT INTO product_categories (${cols.join(', ')}) VALUES (${placeholders})`,
      values
    );
  });
  
  return newCategory;
};

export const updateLocalCategoryWithImage = async (
  categoryId: string,
  categoryData: {
    name?: string;
    description?: string | null;
    icon?: string | null;
    image_url?: string | null;
    is_active?: boolean;
  },
  imageFile?: File
): Promise<LocalCategory | null> => {
  try {
    const existing = await powerSyncService.queryOne<LocalCategory>({
      sql: 'SELECT * FROM product_categories WHERE id = ?',
      params: [categoryId]
    });
    
    if (!existing) return null;
    
  let imageUrl = categoryData.image_url !== undefined ? categoryData.image_url : existing.image_url;
  let imageBase64: string | null = existing.image_base64 || null;
  
  // Handle image upload
  if (imageFile) {
    // Try to upload to storage if online
    const isOnline = typeof navigator !== 'undefined' && navigator.onLine;
    if (isOnline) {
      const uploadedUrl = await uploadImageToStorage(imageFile, 'categories');
      if (uploadedUrl) {
        imageUrl = uploadedUrl;
        imageBase64 = null; // Clear base64 if we have URL
      } else {
        // Fallback to base64 if upload fails
        imageBase64 = await fileToBase64(imageFile);
      }
    } else {
      // Store as base64 for offline
      imageBase64 = await fileToBase64(imageFile);
    }
  }
  
    const updatedCategory: LocalCategory = {
      ...existing,
      ...categoryData,
      image_url: imageUrl,
      image_base64: imageBase64,
      updated_at: new Date().toISOString(),
      // ⚡ v3.0: PowerSync يدير المزامنة تلقائياً - لا حاجة لحقول synced
    };
    
    await powerSyncService.transaction(async (tx) => {
      const updateKeys = Object.keys(categoryData).filter(k => k !== 'id' && k !== 'organization_id' && k !== 'created_at');
      if (imageUrl !== existing.image_url || imageBase64 !== existing.image_base64) {
        updateKeys.push('image_url', 'image_base64');
      }
      updateKeys.push('updated_at');
      // ⚡ v3.0: PowerSync يدير المزامنة تلقائياً - لا حاجة لحقول synced

      if (updateKeys.length > 0) {
        const setClause = updateKeys.map(k => `${k} = ?`).join(', ');
        const values = [
          ...updateKeys.slice(0, -1).map(k => {
            const val = (categoryData as any)[k];
            if (typeof val === 'boolean') return val ? 1 : 0;
            return val;
          }),
          imageUrl,
          imageBase64,
          updatedCategory.updated_at,
          categoryId
        ];
        
        await tx.execute(
          `UPDATE product_categories SET ${setClause} WHERE id = ?`,
          values
        );
      }
    });
    
    return updatedCategory;
  } catch (error) {
    console.error('[localCategoryService] Error updating category:', error);
    return null;
  }
};

export const getAllLocalCategories = async (organizationId: string): Promise<LocalCategory[]> => {
  try {
    if (!powerSyncService.db) {
      console.warn('[localCategoryService] PowerSync DB not initialized');
      return [];
    }
    const categories = await powerSyncService.query<LocalCategory>({
      sql: 'SELECT * FROM product_categories WHERE organization_id = ? ORDER BY name ASC',
      params: [organizationId]
    });
    
    // Convert boolean fields from integer
    return categories.map(cat => ({
      ...cat,
      is_active: Boolean(cat.is_active)
    }));
  } catch (error) {
    console.error('[localCategoryService] Error getting categories:', error);
    return [];
  }
};

export const fetchCategoriesFromServer = async (organizationId: string): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name');
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      await powerSyncService.transaction(async (tx) => {
        for (const category of data) {
          // Check if exists
          const existing = await powerSyncService.queryOne<LocalCategory>({
            sql: 'SELECT id FROM product_categories WHERE id = ?',
            params: [category.id]
          });
          
          if (existing) {
            // Update
            const cols = Object.keys(category).filter(k => k !== 'id');
            const setClause = cols.map(k => `${k} = ?`).join(', ');
            const values = [
              ...cols.map(col => {
                const val = (category as any)[col];
                if (typeof val === 'boolean') return val ? 1 : 0;
                return val;
              }),
              category.id
            ];
            
            await tx.execute(
              `UPDATE product_categories SET ${setClause} WHERE id = ?`,
              values
            );
          } else {
            // Insert
            const cols = Object.keys(category);
            const placeholders = cols.map(() => '?').join(', ');
            const values = cols.map(col => {
              const val = (category as any)[col];
              if (typeof val === 'boolean') return val ? 1 : 0;
              return val;
            });
            
            await tx.execute(
              `INSERT INTO product_categories (${cols.join(', ')}) VALUES (${placeholders})`,
              values
            );
          }
        }
      });
    }
  } catch (error) {
    console.error('[localCategoryService] Error fetching from server:', error);
    throw error;
  }
};

// Export type for use in other files
export type { LocalCategory };
