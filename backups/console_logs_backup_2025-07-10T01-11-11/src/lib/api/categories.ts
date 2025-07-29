import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';
import localforage from 'localforage';

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

// إنشاء مخازن للفئات والفئات الفرعية
const categoriesStore = localforage.createInstance({
  name: 'bazaar-db',
  storeName: 'categories'
});

const subcategoriesStore = localforage.createInstance({
  name: 'bazaar-db',
  storeName: 'subcategories'
});

// التحقق من حالة الاتصال
const isOnline = () => navigator.onLine;

// وظائف التخزين المحلي للفئات
export const saveCategoriesToLocalStorage = async (categories: Category[]) => {
  try {
    // حفظ الفئات كمفتاح "all" للوصول السريع إلى جميع الفئات
    await categoriesStore.setItem('all', categories);
    
    // حفظ كل فئة بشكل فردي أيضًا للوصول السريع
    for (const category of categories) {
      await categoriesStore.setItem(category.id, category);
    }

    return true;
  } catch (error) {
    return false;
  }
};

// وظائف التخزين المحلي للفئات الفرعية
export const saveSubcategoriesToLocalStorage = async (subcategories: Subcategory[], categoryId?: string) => {
  try {
    // إذا تم تحديد معرف فئة، احفظ الفئات الفرعية مرتبطة بهذه الفئة
    if (categoryId) {
      await subcategoriesStore.setItem(`category_${categoryId}`, subcategories);
    }
    
    // حفظ جميع الفئات الفرعية أيضًا
    const allSubcategories = categoryId 
      ? subcategories 
      : await getAllLocalSubcategories();
      
    // تحديث القائمة الكاملة إذا لم يكن هناك معرف فئة محدد
    if (!categoryId) {
      await subcategoriesStore.setItem('all', allSubcategories);
    }
    
    // حفظ كل فئة فرعية بشكل فردي للوصول السريع
    for (const subcategory of subcategories) {
      await subcategoriesStore.setItem(subcategory.id, subcategory);
    }

    return true;
  } catch (error) {
    return false;
  }
};

// جلب جميع الفئات من التخزين المحلي
export const getLocalCategories = async (): Promise<Category[]> => {
  try {
    const categories = await categoriesStore.getItem<Category[]>('all');
    return categories || [];
  } catch (error) {
    return [];
  }
};

// جلب فئة محددة من التخزين المحلي
export const getLocalCategoryById = async (id: string): Promise<Category | null> => {
  try {
    const category = await categoriesStore.getItem<Category>(id);
    return category;
  } catch (error) {
    return null;
  }
};

// جلب جميع الفئات الفرعية من التخزين المحلي
export const getAllLocalSubcategories = async (): Promise<Subcategory[]> => {
  try {
    const subcategories = await subcategoriesStore.getItem<Subcategory[]>('all');
    return subcategories || [];
  } catch (error) {
    return [];
  }
};

// جلب الفئات الفرعية لفئة محددة من التخزين المحلي
export const getLocalSubcategoriesByCategoryId = async (categoryId: string): Promise<Subcategory[]> => {
  try {
    // أولا، حاول الحصول على الفئات الفرعية المخزنة لهذه الفئة تحديدًا
    const subcategories = await subcategoriesStore.getItem<Subcategory[]>(`category_${categoryId}`);
    
    // إذا وجدت، قم بإرجاعها
    if (subcategories) {
      return subcategories;
    }
    
    // إذا لم توجد، حاول تصفية جميع الفئات الفرعية المخزنة
    const allSubcategories = await getAllLocalSubcategories();
    return allSubcategories.filter(sub => sub.category_id === categoryId);
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

      // إنشاء معرف مؤقت للفئة
      const tempId = `temp_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      
      // إنشاء كائن الفئة الجديدة
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

      // تخزين الفئة الجديدة محليًا
      await categoriesStore.setItem(newCategory.id, newCategory);
      
      // تحديث قائمة الفئات في التخزين المحلي
      const categories = await getLocalCategories();
      await saveCategoriesToLocalStorage([...categories, newCategory]);
      
      // إضافة الفئة إلى قائمة المزامنة للمزامنة لاحقًا
      await addCategoryToSyncQueue(newCategory);

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

    await categoriesStore.setItem(resultCategory.id, resultCategory);
    const categories = await getLocalCategories();
    await saveCategoriesToLocalStorage([...categories, resultCategory]);

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
    // الحصول على قائمة الفئات غير المتزامنة الحالية
    const unsyncedCategories = await localforage.getItem<Category[]>('unsynced_categories') || [];
    
    // إضافة الفئة الجديدة إلى القائمة
    unsyncedCategories.push(category);
    
    // حفظ القائمة المحدثة
    await localforage.setItem('unsynced_categories', unsyncedCategories);

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
    await categoriesStore.setItem(id, resultCategory);
    
    // تحديث قائمة الفئات المحلية
    const categories = await getLocalCategories();
    const updatedCategories = categories.map(cat => cat.id === id ? resultCategory : cat);
    await saveCategoriesToLocalStorage(updatedCategories);

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
    
    // 🔍 أولاً: التحقق من وجود فئات فرعية
    const { data: subcategories, error: subcategoriesError } = await supabaseClient
      .from('product_subcategories')
      .select('id')
      .eq('category_id', id)
      .limit(1);
    
    if (subcategoriesError) {
      throw new Error(`خطأ في التحقق من الفئات الفرعية: ${subcategoriesError.message}`);
    }
    
    if (subcategories && subcategories.length > 0) {
      throw new Error('لا يمكن حذف هذه الفئة لأنها تحتوي على فئات فرعية. يرجى حذف الفئات الفرعية أولاً.');
    }
    
    // 🔍 ثانياً: التحقق من وجود منتجات مرتبطة
    const { data: products, error: productsError } = await supabaseClient
      .from('products')
      .select('id')
      .eq('category_id', id)
      .limit(1);
    
    if (productsError) {
      throw new Error(`خطأ في التحقق من المنتجات المرتبطة: ${productsError.message}`);
    }
    
    if (products && products.length > 0) {
      throw new Error('لا يمكن حذف هذه الفئة لأنها تحتوي على منتجات. يرجى نقل المنتجات إلى فئة أخرى أو حذفها أولاً.');
    }
    
    // 🗑️ الآن يمكن حذف الفئة بأمان
    const { error: deleteError } = await supabaseClient
      .from('product_categories')
      .delete()
      .eq('id', id);

    if (deleteError) {
      // معالجة أخطاء محددة
      if (deleteError.code === '23503') {
        throw new Error('لا يمكن حذف الفئة لأنها مرتبطة ببيانات أخرى في النظام. تحقق من المنتجات والفئات الفرعية.');
      } else if (deleteError.code === '42501') {
        throw new Error('ليس لديك صلاحية لحذف هذه الفئة.');
      } else {
        throw new Error(`فشل حذف الفئة: ${deleteError.message}`);
      }
    }

    // 🧹 تنظيف التخزين المحلي
    await categoriesStore.removeItem(id);
    
    // 🔄 تحديث قائمة الفئات المحلية بدون إجبار إعادة تحميل
    const categories = await getLocalCategories();
    const updatedCategories = categories.filter(cat => cat.id !== id);
    await saveCategoriesToLocalStorage(updatedCategories);

    // 🎯 استخدام النظام الموحد للتحديث التلقائي
    const { refreshAfterCategoryOperation } = await import('@/lib/data-refresh-helpers');
    refreshAfterCategoryOperation('delete', { organizationId: organizationId || 'unknown' });

  } catch (error) {
    // إعادة رمي الخطأ مع رسالة واضحة
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('حدث خطأ غير متوقع أثناء حذف الفئة');
    }
  }
};

// وظائف إدارة الفئات الفرعية - تم إعادة توجيهها بالكامل للنظام الموحد
export const getSubcategories = async (categoryId?: string, organizationId?: string): Promise<Subcategory[]> => {
  const { getSubcategories: unifiedGetSubcategories } = await import('@/lib/api/unified-api');
  return unifiedGetSubcategories(categoryId, organizationId);
};

export const getSubcategoryById = async (id: string): Promise<Subcategory | null> => {
  try {
    // التحقق من حالة الاتصال
    if (!isOnline()) {
      return subcategoriesStore.getItem<Subcategory>(id);
    }
    
    const supabaseClient = supabase;
    
    const { data, error } = await supabaseClient
      .from('product_subcategories')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      return subcategoriesStore.getItem<Subcategory>(id);
    }
    
    return data;
  } catch (error) {
    return subcategoriesStore.getItem<Subcategory>(id);
  }
};

export const createSubcategory = async (subcategory: { category_id: string; name: string; description?: string; organization_id?: string }): Promise<Subcategory> => {
  try {
    // التحقق من حالة الاتصال
    if (!isOnline()) {

      // إنشاء معرف مؤقت للفئة الفرعية
      const tempId = `temp_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      
      // Generate a unique slug by appending timestamp
      const timestamp = new Date().getTime();
      const baseSlug = subcategory.name.toLowerCase().replace(/\s+/g, '-');
      const uniqueSlug = `${baseSlug}-${timestamp}`;
      
      // إنشاء كائن الفئة الفرعية الجديدة
      const newSubcategory: Subcategory = {
        id: tempId,
        category_id: subcategory.category_id,
        name: subcategory.name,
        description: subcategory.description || null,
        slug: uniqueSlug,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // تخزين الفئة الفرعية الجديدة محليًا
      await subcategoriesStore.setItem(newSubcategory.id, newSubcategory);
      
      // تحديث قائمة الفئات الفرعية في التخزين المحلي
      const categorySubcategories = await getLocalSubcategoriesByCategoryId(subcategory.category_id);
      await saveSubcategoriesToLocalStorage([...categorySubcategories, newSubcategory], subcategory.category_id);
      
      // تحديث القائمة الكاملة للفئات الفرعية
      const allSubcategories = await getAllLocalSubcategories();
      await saveSubcategoriesToLocalStorage([...allSubcategories, newSubcategory]);
      
      // إضافة الفئة الفرعية إلى قائمة المزامنة للمزامنة لاحقًا
      await addSubcategoryToSyncQueue(newSubcategory);

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
    const newSubcategory = data;
    await subcategoriesStore.setItem(newSubcategory.id, newSubcategory);
    
    // تحديث قائمة الفئات الفرعية في التخزين المحلي
    const categorySubcategories = await getLocalSubcategoriesByCategoryId(subcategory.category_id);
    await saveSubcategoriesToLocalStorage([...categorySubcategories, newSubcategory], subcategory.category_id);
    
    // تحديث القائمة الكاملة للفئات الفرعية
    const allSubcategories = await getAllLocalSubcategories();
    await saveSubcategoriesToLocalStorage([...allSubcategories, newSubcategory]);

    return data;
  } catch (error) {
    throw error;
  }
};

// إضافة فئة فرعية إلى قائمة المزامنة
export const addSubcategoryToSyncQueue = async (subcategory: Subcategory): Promise<void> => {
  try {
    // الحصول على قائمة الفئات الفرعية غير المتزامنة الحالية
    const unsyncedSubcategories = await localforage.getItem<Subcategory[]>('unsynced_subcategories') || [];
    
    // إضافة الفئة الفرعية الجديدة إلى القائمة
    unsyncedSubcategories.push(subcategory);
    
    // حفظ القائمة المحدثة
    await localforage.setItem('unsynced_subcategories', unsyncedSubcategories);

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

    // تحديث الفئة الفرعية في التخزين المحلي
    await subcategoriesStore.setItem(id, data);
    
    // تحديث القوائم المحلية
    const allSubcategories = await getAllLocalSubcategories();
    const updatedSubcategories = allSubcategories.map(sub => sub.id === id ? data : sub);
    await saveSubcategoriesToLocalStorage(updatedSubcategories);
    
    // تحديث قائمة الفئة الأم
    if (data.category_id) {
      const categorySubcategories = await getLocalSubcategoriesByCategoryId(data.category_id);
      const updatedCategorySubcategories = categorySubcategories.map(sub => sub.id === id ? data : sub);
      await saveSubcategoriesToLocalStorage(updatedCategorySubcategories, data.category_id);
    }

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

    // حذف الفئة الفرعية من التخزين المحلي
    await subcategoriesStore.removeItem(id);
    
    // تحديث القوائم المحلية
    const allSubcategories = await getAllLocalSubcategories();
    const updatedSubcategories = allSubcategories.filter(sub => sub.id !== id);
    await saveSubcategoriesToLocalStorage(updatedSubcategories);
    
    // تحديث القوائم حسب الفئة الأم (سيتم تنفيذه لجميع الفئات لتغطية جميع الحالات)
    const categories = await getLocalCategories();
    for (const category of categories) {
      const categorySubcategories = await getLocalSubcategoriesByCategoryId(category.id);
      const updatedCategorySubcategories = categorySubcategories.filter(sub => sub.id !== id);
      await saveSubcategoriesToLocalStorage(updatedCategorySubcategories, category.id);
    }
  } catch (error) {
    throw error;
  }
};

// مزامنة بيانات الفئات والفئات الفرعية عند بدء التطبيق
export const syncCategoriesDataOnStartup = async (): Promise<boolean> => {
  try {
    // تحقق مما إذا كان المستخدم متصلاً بالإنترنت
    if (!isOnline()) {
      
      return false;
    }
    
    // استخدام getSupabaseClient() للحصول على مثيل صالح
    const supabaseClient = supabase;
    
    // جلب الفئات من Supabase
    const { data: categories, error: categoriesError } = await supabaseClient
      .from('product_categories')
      .select('*')
      .order('name');
      
    if (categoriesError) {
      return false;
    }
    
    // حفظ الفئات محلياً
    await saveCategoriesToLocalStorage(categories as Category[]);
    
    // جلب جميع الفئات الفرعية
    const { data: subcategories, error: subcategoriesError } = await supabaseClient
      .from('product_subcategories')
      .select('*')
      .order('name');
      
    if (subcategoriesError) {
      return false;
    }
    
    // حفظ الفئات الفرعية محلياً
    await saveSubcategoriesToLocalStorage(subcategories);
    
    // تنظيم الفئات الفرعية حسب الفئة الأم
    const subcategoriesByCategory = subcategories.reduce<Record<string, Subcategory[]>>((acc, subcategory) => {
      if (!subcategory.category_id) return acc;
      
      if (!acc[subcategory.category_id]) {
        acc[subcategory.category_id] = [];
      }
      
      acc[subcategory.category_id].push(subcategory);
      return acc;
    }, {});
    
    // حفظ الفئات الفرعية لكل فئة
    for (const categoryId in subcategoriesByCategory) {
      await saveSubcategoriesToLocalStorage(subcategoriesByCategory[categoryId], categoryId);
    }

    return true;
  } catch (error) {
    return false;
  }
};

// استدعاء المزامنة عند استيراد الملف (لملء التخزين المحلي عند بدء التطبيق)
// تأخير المزامنة لمدة ثانيتين للتأكد من أن التطبيق قد تم تحميله بالكامل
// setTimeout(syncCategoriesDataOnStartup, 2000);
