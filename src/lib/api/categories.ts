import { getSupabaseClient } from '@/lib/supabase';
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
    console.error('خطأ في حفظ الفئات محليًا:', error);
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
    console.error('خطأ في حفظ الفئات الفرعية محليًا:', error);
    return false;
  }
};

// جلب جميع الفئات من التخزين المحلي
export const getLocalCategories = async (): Promise<Category[]> => {
  try {
    const categories = await categoriesStore.getItem<Category[]>('all');
    return categories || [];
  } catch (error) {
    console.error('خطأ في جلب الفئات من التخزين المحلي:', error);
    return [];
  }
};

// جلب فئة محددة من التخزين المحلي
export const getLocalCategoryById = async (id: string): Promise<Category | null> => {
  try {
    const category = await categoriesStore.getItem<Category>(id);
    return category;
  } catch (error) {
    console.error(`خطأ في جلب الفئة ${id} من التخزين المحلي:`, error);
    return null;
  }
};

// جلب جميع الفئات الفرعية من التخزين المحلي
export const getAllLocalSubcategories = async (): Promise<Subcategory[]> => {
  try {
    const subcategories = await subcategoriesStore.getItem<Subcategory[]>('all');
    return subcategories || [];
  } catch (error) {
    console.error('خطأ في جلب جميع الفئات الفرعية من التخزين المحلي:', error);
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
    console.error(`خطأ في جلب الفئات الفرعية للفئة ${categoryId} من التخزين المحلي:`, error);
    return [];
  }
};

// وظائف إدارة الفئات
export const getCategories = async (organizationId?: string): Promise<Category[]> => {
  try {
    // التحقق من حالة الاتصال
    if (!isOnline()) {
      
      return await getLocalCategories();
    }
    
    const supabaseClient = await getSupabaseClient();
    
    // إذا لم يتم تمرير معرف المؤسسة، حاول الحصول عليه من المستخدم الحالي
    let orgId = organizationId;
    
    if (!orgId) {
      // الحصول على معلومات المستخدم الحالي
      const userInfo = await supabaseClient.auth.getUser();
      const userId = userInfo.data.user?.id;
      
      if (!userId) {
        console.warn('المستخدم غير مسجل الدخول ولم يتم تحديد المؤسسة - تعذر جلب الفئات');
        return await getLocalCategories(); // استخدام التخزين المحلي كاحتياطي
      }
      
      // البحث عن معرف المؤسسة الخاصة بالمستخدم
      const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .select('organization_id')
        .eq('id', userId)
        .single();
        
      if (userError && userError.code !== 'PGRST116') {
        console.error('Error fetching user organization:', userError);
        return await getLocalCategories(); // استخدام التخزين المحلي في حالة الخطأ
      }
      
      // استخدام معرف المؤسسة لجلب الفئات الخاصة بها فقط
      orgId = userData?.organization_id;
    }
    
    // جلب الفئات مع تصفية حسب المؤسسة دائماً عندما يتوفر معرف المؤسسة
    let query = supabaseClient.from('product_categories').select('*');
    
    if (orgId) {
      query = query.eq('organization_id', orgId);
    } else {
      console.warn('لم يتم تحديد معرف المؤسسة، استخدام التخزين المحلي');
      return await getLocalCategories();
    }
    
    const { data, error } = await query.order('name');

    if (error) {
      console.error('Error fetching categories:', error);
      // في حالة الخطأ، استخدم التخزين المحلي
      return await getLocalCategories();
    }

    const categories = data as Category[];
    
    // حساب عدد المنتجات لكل فئة
    if (orgId && categories.length > 0) {
      try {
        
        
        // جلب جميع المنتجات مرة واحدة لتحسين الأداء
        const { data: products, error: productsError } = await supabaseClient
          .from('products')
          .select('id, category_id, category, is_active')
          .eq('organization_id', orgId)
          .eq('is_active', true);
        
        if (!productsError && products && products.length > 0) {
          
          
          // تأكد من أن المنتجات نشطة
          const activeProducts = products.filter(product => product.is_active === true);
          
          
          // إنشاء Map لتخزين معرفات المنتجات الفريدة لكل فئة
          const categoryProductsMap = new Map<string, Set<string>>();
          
          // تهيئة Set فارغة لكل فئة
          categories.forEach(category => {
            categoryProductsMap.set(category.id, new Set<string>());
          });
          
          // حساب عدد المنتجات لكل فئة بدون تكرار
          activeProducts.forEach(product => {
            // حالة 1: category_id يطابق معرف الفئة
            if (product.category_id) {
              const productSet = categoryProductsMap.get(product.category_id);
              if (productSet) productSet.add(product.id);
            }
            
            // حالة 2: حقل category يطابق معرف الفئة
            if (typeof product.category === 'string' && categoryProductsMap.has(product.category)) {
              const productSet = categoryProductsMap.get(product.category);
              if (productSet) productSet.add(product.id);
            }
            
            // حالة 3: حقل category يطابق اسم الفئة
            if (typeof product.category === 'string') {
              const categoryByName = categories.find(c => c.name === product.category);
              if (categoryByName) {
                const productSet = categoryProductsMap.get(categoryByName.id);
                if (productSet) productSet.add(product.id);
              }
            }
          });
          
          // تعيين عدد المنتجات الفريدة لكل فئة
          categories.forEach(category => {
            const productSet = categoryProductsMap.get(category.id);
            category.product_count = productSet ? productSet.size : 0;
            
            
          });
        } else {
          console.warn('لم يتم العثور على منتجات أو حدث خطأ أثناء جلب المنتجات', productsError);
        }
      } catch (countError) {
        console.error('خطأ أثناء حساب عدد المنتجات للفئات:', countError);
      }
    }

    // تخزين البيانات محليًا للاستخدام في وضع عدم الاتصال
    saveCategoriesToLocalStorage(categories);
    
    
    return categories;
  } catch (error) {
    console.error('حدث خطأ أثناء جلب الفئات:', error);
    // في حالة حدوث خطأ، استخدم التخزين المحلي
    return await getLocalCategories();
  }
};

export const getCategoryById = async (id: string, organizationId?: string): Promise<Category | null> => {
  try {
    // التحقق من حالة الاتصال
    if (!isOnline()) {
      return getLocalCategoryById(id);
    }
    
    const supabaseClient = await getSupabaseClient();
    
    // جلب الفئة مع تصفية حسب المؤسسة إذا كان معرف المؤسسة متوفرًا
    let query = supabaseClient.from('product_categories').select('*').eq('id', id);
    
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }
    
    const { data, error } = await query.single();
    
    if (error) {
      console.error(`Error fetching category with ID ${id}:`, error);
      return getLocalCategoryById(id);
    }
    
    return data;
  } catch (error) {
    console.error(`Error in getCategoryById (${id}):`, error);
    return getLocalCategoryById(id);
  }
};

export const createCategory = async (categoryData: Partial<Category>): Promise<Category> => {
  try {
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
        type: categoryData.type || 'product',
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
    const supabaseClient = await getSupabaseClient();
    const { data, error } = await supabaseClient
      .from('product_categories')
      .insert({
        name: categoryData.name,
        description: categoryData.description,
        slug: uniqueSlug,
        icon: categoryData.icon,
        image_url: categoryData.image_url,
        is_active: categoryData.is_active !== undefined ? categoryData.is_active : true,
        type: categoryData.type || 'product'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating category:', error);
      throw error;
    }

    // تخزين الفئة الجديدة محليًا
    await categoriesStore.setItem(data.id, data);
    
    // تحديث قائمة الفئات في التخزين المحلي
    const categories = await getLocalCategories();
    await saveCategoriesToLocalStorage([...categories, data]);

    return data;
  } catch (error) {
    console.error('حدث خطأ أثناء إنشاء فئة جديدة:', error);
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
    console.error('خطأ في إضافة الفئة إلى قائمة المزامنة:', error);
  }
};

export const updateCategory = async (id: string, categoryData: UpdateCategoryData): Promise<Category> => {
  try {
    const supabaseClient = await getSupabaseClient();
    const { data, error } = await supabaseClient
      .from('product_categories')
      .update(categoryData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating category ${id}:`, error);
      throw error;
    }

    // تحديث بيانات الفئة محليًا
    await categoriesStore.setItem(id, data);
    
    // تحديث قائمة الفئات المحلية
    const categories = await getLocalCategories();
    const updatedCategories = categories.map(cat => cat.id === id ? data : cat);
    await saveCategoriesToLocalStorage(updatedCategories);

    return data;
  } catch (error) {
    console.error('حدث خطأ أثناء تحديث الفئة:', error);
    throw error;
  }
};

export const deleteCategory = async (id: string): Promise<void> => {
  try {
    const supabaseClient = await getSupabaseClient();
    const { error } = await supabaseClient
      .from('product_categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting category ${id}:`, error);
      throw error;
    }

    // حذف الفئة من التخزين المحلي
    await categoriesStore.removeItem(id);
    
    // تحديث قائمة الفئات المحلية
    const categories = await getLocalCategories();
    const updatedCategories = categories.filter(cat => cat.id !== id);
    await saveCategoriesToLocalStorage(updatedCategories);
  } catch (error) {
    console.error('حدث خطأ أثناء حذف الفئة:', error);
    throw error;
  }
};

// وظائف إدارة الفئات الفرعية
export const getSubcategories = async (categoryId?: string): Promise<Subcategory[]> => {
  try {
    // التحقق من حالة الاتصال
    if (!isOnline()) {
      
      return categoryId 
        ? await getLocalSubcategoriesByCategoryId(categoryId)
        : await getAllLocalSubcategories();
    }
    
    const supabaseClient = await getSupabaseClient();
    
    // إنشاء استعلام قاعدة بيانات للفئات الفرعية
    let query = supabaseClient
      .from('product_subcategories')
      .select('*');
    
    // إذا تم تحديد معرف الفئة، تصفية النتائج
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }
    
    const { data, error } = await query.order('name');
    
    if (error) {
      console.error('Error fetching subcategories:', error);
      return categoryId 
        ? await getLocalSubcategoriesByCategoryId(categoryId)
        : await getAllLocalSubcategories();
    }
    
    return data;
  } catch (error) {
    console.error('Error in getSubcategories:', error);
    return categoryId 
      ? await getLocalSubcategoriesByCategoryId(categoryId)
      : await getAllLocalSubcategories();
  }
};

export const getSubcategoryById = async (id: string): Promise<Subcategory | null> => {
  try {
    // التحقق من حالة الاتصال
    if (!isOnline()) {
      return subcategoriesStore.getItem<Subcategory>(id);
    }
    
    const supabaseClient = await getSupabaseClient();
    
    const { data, error } = await supabaseClient
      .from('product_subcategories')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Error fetching subcategory with ID ${id}:`, error);
      return subcategoriesStore.getItem<Subcategory>(id);
    }
    
    return data;
  } catch (error) {
    console.error(`Error in getSubcategoryById (${id}):`, error);
    return subcategoriesStore.getItem<Subcategory>(id);
  }
};

export const createSubcategory = async (subcategory: { category_id: string; name: string; description?: string }): Promise<Subcategory> => {
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

    const supabaseClient = await getSupabaseClient();
    const { data, error } = await supabaseClient
      .from('product_subcategories')
      .insert({
        category_id: subcategory.category_id,
        name: subcategory.name,
        description: subcategory.description || null,
        slug: uniqueSlug
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating subcategory:', error);
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
    console.error('حدث خطأ أثناء إنشاء فئة فرعية جديدة:', error);
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
    console.error('خطأ في إضافة الفئة الفرعية إلى قائمة المزامنة:', error);
  }
};

export const updateSubcategory = async (id: string, updates: UpdateSubcategory): Promise<Subcategory> => {
  try {
    const supabaseClient = await getSupabaseClient();
    const { data, error } = await supabaseClient
      .from('product_subcategories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating subcategory ${id}:`, error);
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
    console.error(`حدث خطأ أثناء تحديث الفئة الفرعية ${id}:`, error);
    throw error;
  }
};

export const deleteSubcategory = async (id: string): Promise<void> => {
  try {
    const supabaseClient = await getSupabaseClient();
    const { error } = await supabaseClient
      .from('product_subcategories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting subcategory ${id}:`, error);
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
    console.error(`حدث خطأ أثناء حذف الفئة الفرعية ${id}:`, error);
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
    const supabaseClient = await getSupabaseClient();
    
    // جلب الفئات من Supabase
    const { data: categories, error: categoriesError } = await supabaseClient
      .from('product_categories')
      .select('*')
      .order('name');
      
    if (categoriesError) {
      console.error('خطأ في جلب الفئات للمزامنة:', categoriesError);
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
      console.error('خطأ في جلب الفئات الفرعية للمزامنة:', subcategoriesError);
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
    console.error('خطأ في مزامنة بيانات الفئات والفئات الفرعية:', error);
    return false;
  }
};

// استدعاء المزامنة عند استيراد الملف (لملء التخزين المحلي عند بدء التطبيق)
// تأخير المزامنة لمدة ثانيتين للتأكد من أن التطبيق قد تم تحميله بالكامل
setTimeout(syncCategoriesDataOnStartup, 2000); 