import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';
import { inventoryDB } from '@/database/localDb';

export type Subcategory = Database['public']['Tables']['product_subcategories']['Row'];
export type InsertSubcategory = Database['public']['Tables']['product_subcategories']['Insert'];
export type UpdateSubcategory = Database['public']['Tables']['product_subcategories']['Update'];

export interface Category {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  // Now contains Lucide icon name (e.g., 'FolderRoot', 'Package', etc.)
  icon: string | null;
  image_url: string | null;
  is_active: boolean;
  type: 'product' | 'service'; // نوع الفئة: منتج أو خدمة
  organization_id: string;
  created_at: string;
  updated_at: string;
  product_count?: number; // عدد المنتجات في هذه الفئة
}

interface CreateCategoryData {
  name: string;
  description?: string | null;
  // Lucide icon name
  icon?: string | null;
  image_url?: string | null;
  is_active?: boolean;
  type: 'product' | 'service'; // نوع الفئة: منتج أو خدمة
}

interface UpdateCategoryData {
  name?: string;
  description?: string | null;
  // Lucide icon name
  icon?: string | null;
  image_url?: string | null;
  is_active?: boolean;
  type?: 'product' | 'service'; // نوع الفئة: منتج أو خدمة
}

// لا نستخدم localforage بعد الآن. التخزين المحلي يتم عبر SQLite.

// التحقق من حالة الاتصال
const isOnline = () => navigator.onLine;

// وظائف التخزين المحلي للفئات
export const saveCategoriesToLocalStorage = async (categories: Category[]) => {
  try {
    // احفظ كل فئة في جدول SQLite
    for (const category of categories) {
      await inventoryDB.productCategories.put(category as any);
    }
    return true;
  } catch (error) {
    return false;
  }
};

// وظائف التخزين المحلي للفئات الفرعية
export const saveSubcategoriesToLocalStorage = async (subcategories: Subcategory[], _categoryId?: string) => {
  try {
    for (const subcategory of subcategories) {
      await inventoryDB.productSubcategories.put(subcategory as any);
    }
    return true;
  } catch (error) {
    return false;
  }
};

// جلب جميع الفئات من التخزين المحلي
export const getLocalCategories = async (): Promise<Category[]> => {
  try {
    return await inventoryDB.productCategories.toArray() as any;
  } catch (error) {
    return [];
  }
};

// جلب فئة محددة من التخزين المحلي
export const getLocalCategoryById = async (id: string): Promise<Category | null> => {
  try {
    const category = await inventoryDB.productCategories.get(id);
    return (category as any) ?? null;
  } catch (error) {
    return null;
  }
};

// جلب جميع الفئات الفرعية من التخزين المحلي
export const getAllLocalSubcategories = async (): Promise<Subcategory[]> => {
  try {
    return await inventoryDB.productSubcategories.toArray() as any;
  } catch (error) {
    return [];
  }
};

// جلب الفئات الفرعية لفئة محددة من التخزين المحلي
export const getLocalSubcategoriesByCategoryId = async (categoryId: string): Promise<Subcategory[]> => {
  try {
    const subs = await inventoryDB.productSubcategories.where('category_id').equals(categoryId).toArray();
    return subs as any;
  } catch (error) {
    return [];
  }
};

// وظائف إدارة الفئات - تم إعادة توجيهها بالكامل للنظام الموحد
export const getCategories = async (organizationId?: string): Promise<Category[]> => {
  const { getCategories: unifiedGetCategories } = await import('@/lib/api/unified-api');
  return unifiedGetCategories(organizationId);
};

export const getCategoryById = async (categoryId: string): Promise<Category | null> => {
  const { getCategoryById: unifiedGetCategoryById } = await import('@/lib/api/unified-api');
  return unifiedGetCategoryById(categoryId);
};

export const createCategory = async (categoryData: Partial<Category>, organizationId: string): Promise<Category> => {

  try {
    // التحقق من صحة organizationId
    if (!organizationId || organizationId.trim() === '') {
      throw new Error('معرف المؤسسة مطلوب ولا يمكن أن يكون فارغًا');
    }
    
    // التحقق من أن organizationId هو UUID صالح
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(organizationId)) {
      throw new Error('معرف المؤسسة غير صالح - يجب أن يكون UUID صحيح');
    }

    // التحقق من حالة الاتصال
    if (!isOnline()) {
      const tempId = `temp_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      const newCategory: Category = {
        id: tempId,
        name: categoryData.name || 'فئة جديدة',
        description: categoryData.description || null,
        slug: categoryData.name?.toLowerCase().replace(/\s+/g, '-') || 'new-category',
        icon: categoryData.icon || null,
        image_url: categoryData.image_url || null,
        is_active: categoryData.is_active !== undefined ? categoryData.is_active : true,
        type: categoryData.type === 'service' ? 'service' : 'product',
        organization_id: organizationId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      await inventoryDB.productCategories.put(newCategory as any);
      try {
        await inventoryDB.syncQueue.put({
          id: `sync_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
          object_type: 'product_category',
          object_id: newCategory.id,
          operation: 'create',
          data: newCategory,
          priority: 2,
          attempts: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as any);
      } catch {}
      return newCategory;
    }

    // Generate a unique slug by appending timestamp
    const timestamp = new Date().getTime();
    const baseSlug = categoryData.name?.toLowerCase().replace(/\s+/g, '-') || 'new-category';
    const uniqueSlug = `${baseSlug}-${timestamp}`;

    // إذا كان المستخدم متصل، استخدم السلوك الطبيعي
    const supabaseClient = supabase;
    
    const insertData = {
      name: categoryData.name!,
      description: categoryData.description,
      slug: uniqueSlug,
      icon: categoryData.icon,
      image_url: categoryData.image_url,
      is_active: categoryData.is_active !== undefined ? categoryData.is_active : true,
      type: categoryData.type === 'service' ? 'service' : 'product',
      organization_id: organizationId
    };

    const { data, error } = await supabaseClient
      .from('product_categories')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    const resultCategory = {
      ...data,
      id: data.id!,
      name: data.name!,
      slug: data.slug!,
      type: data.type === 'service' ? 'service' : 'product',
      organization_id: data.organization_id!,
      is_active: data.is_active === null ? true : data.is_active,
      created_at: data.created_at!,
      updated_at: data.updated_at!
    } as Category;

    await inventoryDB.productCategories.put(resultCategory as any);

    // استخدام النظام الموحد - سطر واحد فقط! 🎉
    const { refreshAfterCategoryOperation } = await import('@/lib/data-refresh-helpers');
    refreshAfterCategoryOperation('create', { organizationId });

    return resultCategory;
  } catch (error) {
    throw error;
  }
};

// إضافة فئة إلى قائمة المزامنة
export const addCategoryToSyncQueue = async (category: Category): Promise<void> => {
  try {
    await inventoryDB.syncQueue.put({
      id: `sync_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
      object_type: 'product_category',
      object_id: category.id,
      operation: 'create',
      data: category,
      priority: 2,
      attempts: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as any);

  } catch (error) {
  }
};

export const updateCategory = async (id: string, categoryData: UpdateCategoryData, organizationId?: string): Promise<Category> => {
  try {

    const supabaseClient = supabase;
    
    // Prepare the update object, ensuring type safety for 'type'
    const updatePayload: any = { ...categoryData };
    if (categoryData.type) {
      updatePayload.type = categoryData.type === 'service' ? 'service' : 'product';
    }
    if (organizationId) { // Include organization_id if provided, e.g. for RLS or specific checks
        updatePayload.organization_id = organizationId;
    }

    const { data, error } = await supabaseClient
      .from('product_categories')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    const resultCategory = {
      ...data,
      id: data.id!,
      name: data.name!,
      slug: data.slug!,
      type: data.type === 'service' ? 'service' : 'product',
      organization_id: data.organization_id!,
      is_active: data.is_active === null ? true : data.is_active,
      created_at: data.created_at!,
      updated_at: data.updated_at!
    } as Category;

    // تحديث بيانات الفئة محليًا
    await inventoryDB.productCategories.put(resultCategory as any);

    // 🎯 استخدام النظام الموحد للتحديث التلقائي - مثل deleteCategory
    const { refreshAfterCategoryOperation } = await import('@/lib/data-refresh-helpers');
    refreshAfterCategoryOperation('update', { organizationId: organizationId || resultCategory.organization_id });

    return resultCategory;
  } catch (error) {
    throw error;
  }
};

export const deleteCategory = async (id: string, organizationId?: string): Promise<void> => {

  try {
    
    const supabaseClient = supabase;
    const { error } = await supabaseClient
      .from('product_categories')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    // حذف الفئة من التخزين المحلي (SQLite)
    await inventoryDB.productCategories.delete(id);

    // استخدام النظام الموحد - سطر واحد فقط! 🎉
    const { refreshAfterCategoryOperation } = await import('@/lib/data-refresh-helpers');
    refreshAfterCategoryOperation('delete', { organizationId: organizationId || 'unknown' });

  } catch (error) {
    throw error;
  }
};

// وظائف إدارة الفئات الفرعية - تم إعادة توجيهها بالكامل للنظام الموحد
export const getSubcategories = async (categoryId?: string, organizationId?: string): Promise<Subcategory[]> => {
  const { getSubcategories: unifiedGetSubcategories } = await import('@/lib/api/unified-api');
  return unifiedGetSubcategories(categoryId, organizationId);
};

/**
 * دالة محسنة لجلب الفئات والفئات الفرعية في طلب واحد
 * تقلل عدد الطلبات من N+1 إلى 1
 */
export async function getCategoriesWithSubcategories(organizationId: string): Promise<{
  categories: Category[];
  subcategories: Subcategory[];
}> {
  try {
    // محاولة القراءة من قاعدة البيانات المحلية (SQLite)
    const localCats = await inventoryDB.productCategories
      .where({ organization_id: organizationId })
      .toArray();
    const activeLocalCats = (localCats as any[]).filter((c) => c.is_active !== false);
    const localSubs = await inventoryDB.productSubcategories
      .where({ organization_id: organizationId })
      .toArray();
    const activeLocalSubs = (localSubs as any[]).filter((s) => s.is_active !== false);

    if (activeLocalCats.length || activeLocalSubs.length) {
      return {
        categories: activeLocalCats as any,
        subcategories: activeLocalSubs as any
      };
    }

    // جلب الفئات والفئات الفرعية من الخادم وحفظها محلياً
    const [categoriesData, subcategoriesData] = await Promise.all([
      supabase
        .from('product_categories')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('product_subcategories')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name')
    ]);

    if (categoriesData.error) {
      throw categoriesData.error;
    }
    if (subcategoriesData.error) {
      throw subcategoriesData.error;
    }

    const cats = (categoriesData.data || []).map((c: any) => ({
      ...c,
      type: c.type === 'service' ? 'service' : 'product'
    })) as Category[];
    const subs = (subcategoriesData.data || []) as Subcategory[];

    await saveCategoriesToLocalStorage(cats);
    await saveSubcategoriesToLocalStorage(subs as any);

    return { categories: cats, subcategories: subs };
  } catch (error) {
    throw error;
  }
}

export const getSubcategoryById = async (id: string): Promise<Subcategory | null> => {
  try {
    // التحقق من حالة الاتصال
    if (!isOnline()) {
      return (await inventoryDB.productSubcategories.get(id)) as any;
    }
    
    const supabaseClient = supabase;
    
    const { data, error } = await supabaseClient
      .from('product_subcategories')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      return (await inventoryDB.productSubcategories.get(id)) as any;
    }
    
    return data;
  } catch (error) {
    return (await inventoryDB.productSubcategories.get(id)) as any;
  }
};

export const createSubcategory = async (subcategory: { category_id: string; name: string; description?: string; organization_id?: string }): Promise<Subcategory> => {
  try {
    // التحقق من حالة الاتصال
    if (!isOnline()) {
      const tempId = `temp_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      const timestamp = new Date().getTime();
      const baseSlug = subcategory.name.toLowerCase().replace(/\s+/g, '-');
      const uniqueSlug = `${baseSlug}-${timestamp}`;
      const newSubcategory: Subcategory = {
        id: tempId,
        category_id: subcategory.category_id,
        name: subcategory.name,
        description: subcategory.description || null,
        slug: uniqueSlug,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as any;
      await inventoryDB.productSubcategories.put(newSubcategory as any);
      try {
        await inventoryDB.syncQueue.put({
          id: `sync_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
          object_type: 'product_subcategory',
          object_id: newSubcategory.id,
          operation: 'create',
          data: newSubcategory,
          priority: 2,
          attempts: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as any);
      } catch {}
      return newSubcategory;
    }
    
    // إذا كان المستخدم متصل، استخدم السلوك الطبيعي
    // Generate a unique slug by appending timestamp
    const timestamp = new Date().getTime();
    const baseSlug = subcategory.name.toLowerCase().replace(/\s+/g, '-');
    const uniqueSlug = `${baseSlug}-${timestamp}`;

    const supabaseClient = supabase;
    
    // الحصول على organization_id من الفئة الأم إذا لم يتم تمريره
    let organizationId = subcategory.organization_id;
    if (!organizationId) {
      const { data: parentCategory } = await supabaseClient
        .from('product_categories')
        .select('organization_id')
        .eq('id', subcategory.category_id)
        .single();
      
      organizationId = parentCategory?.organization_id;
    }
    
    const { data, error } = await supabaseClient
      .from('product_subcategories')
      .insert({
        category_id: subcategory.category_id,
        name: subcategory.name,
        description: subcategory.description || null,
        slug: uniqueSlug,
        organization_id: organizationId
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // تخزين الفئة الفرعية الجديدة محليًا
    const newSubcategory = data as any;
    await inventoryDB.productSubcategories.put(newSubcategory);

    return data;
  } catch (error) {
    throw error;
  }
};

// إضافة فئة فرعية إلى قائمة المزامنة
export const addSubcategoryToSyncQueue = async (subcategory: Subcategory): Promise<void> => {
  try {
    await inventoryDB.syncQueue.put({
      id: `sync_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
      object_type: 'product_subcategory',
      object_id: subcategory.id,
      operation: 'create',
      data: subcategory,
      priority: 2,
      attempts: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as any);

  } catch (error) {
  }
};

export const updateSubcategory = async (id: string, updates: UpdateSubcategory): Promise<Subcategory> => {
  try {
    const supabaseClient = supabase;
    const { data, error } = await supabaseClient
      .from('product_subcategories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    await inventoryDB.productSubcategories.put(data as any);

    return data;
  } catch (error) {
    throw error;
  }
};

export const deleteSubcategory = async (id: string): Promise<void> => {
  try {
    const supabaseClient = supabase;
    const { error } = await supabaseClient
      .from('product_subcategories')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    await inventoryDB.productSubcategories.delete(id);
  } catch (error) {
    throw error;
  }
};

// مزامنة بيانات الفئات والفئات الفرعية عند بدء التطبيق
export const syncCategoriesDataOnStartup = async (): Promise<{
  categories: Category[];
  subcategories: Subcategory[];
} | null> => {
  try {
    // تحقق مما إذا كان المستخدم متصلاً بالإنترنت
    if (!isOnline()) {
      // حاول قراءة البيانات المخزنة محلياً من SQLite
      try {
        const localCats = await getLocalCategories();
        const localSubs = await getAllLocalSubcategories();
        if (localCats.length || localSubs.length) {
          return { categories: localCats, subcategories: localSubs };
        }
      } catch {}
      return null;
    }
    
    // استخدام getSupabaseClient() للحصول على مثيل صالح
    const supabaseClient = supabase;
    
    // جلب الفئات من Supabase
    const { data: categories, error: categoriesError } = await supabaseClient
      .from('product_categories')
      .select('*')
      .order('name');
      
    if (categoriesError) {
      return null;
    }
    
    // حفظ الفئات محلياً إلى SQLite
    await saveCategoriesToLocalStorage(categories as Category[]);
    
    // جلب جميع الفئات الفرعية
    const { data: subcategories, error: subcategoriesError } = await supabaseClient
      .from('product_subcategories')
      .select('*')
      .order('name');
      
    if (subcategoriesError) {
      return null;
    }
    
    // حفظ الفئات الفرعية محلياً إلى SQLite
    await saveSubcategoriesToLocalStorage(subcategories as any);
    
    // تنظيم الفئات الفرعية حسب الفئة الأم
    const subcategoriesByCategory = subcategories.reduce<Record<string, Subcategory[]>>((acc, subcategory) => {
      if (!subcategory.category_id) return acc;
      
      if (!acc[subcategory.category_id]) {
        acc[subcategory.category_id] = [];
      }
      
      acc[subcategory.category_id].push(subcategory);
      return acc;
    }, {});
    
    // لا حاجة لحفظ لكل فئة بشكل منفصل في SQLite

    return {
      categories: categories as Category[],
      subcategories: subcategories as Subcategory[]
    };
  } catch (error) {
    return null;
  }
};

// استدعاء المزامنة عند استيراد الملف (لملء التخزين المحلي عند بدء التطبيق)
// تأخير المزامنة لمدة ثانيتين للتأكد من أن التطبيق قد تم تحميله بالكامل
// setTimeout(syncCategoriesDataOnStartup, 2000);
