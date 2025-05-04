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
    
    console.log('تم حفظ الفئات محليًا:', categories.length);
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
    
    console.log('تم حفظ الفئات الفرعية محليًا:', subcategories.length);
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
      console.log('جاري استخدام التخزين المحلي للفئات لأن المستخدم غير متصل');
      return await getLocalCategories();
    }
    
    // إذا لم يتم تمرير معرف المؤسسة، حاول الحصول عليه من المستخدم الحالي
    let orgId = organizationId;
    
    if (!orgId) {
      // الحصول على معلومات المستخدم الحالي
      const userInfo = await supabase.auth.getUser();
      const userId = userInfo.data.user?.id;
      
      if (!userId) {
        console.warn('المستخدم غير مسجل الدخول ولم يتم تحديد المؤسسة - تعذر جلب الفئات');
        return await getLocalCategories(); // استخدام التخزين المحلي كاحتياطي
      }
      
      // البحث عن معرف المؤسسة الخاصة بالمستخدم
      const { data: userData, error: userError } = await supabase
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
    let query = supabase.from('product_categories').select('*');
    
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
        console.log('حساب عدد المنتجات لكل فئة...');
        
        // جلب جميع المنتجات مرة واحدة لتحسين الأداء
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('id, category_id, category, is_active')
          .eq('organization_id', orgId)
          .eq('is_active', true);
        
        if (!productsError && products && products.length > 0) {
          console.log(`تم جلب ${products.length} منتج نشط لحساب الفئات`);
          
          // تأكد من أن المنتجات نشطة
          const activeProducts = products.filter(product => product.is_active === true);
          console.log(`عدد المنتجات النشطة: ${activeProducts.length}`);
          
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
            
            console.log(`الفئة ${category.name} تحتوي على ${category.product_count} منتج نشط (فريد)`);
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
    
    console.log(`تم جلب ${categories.length} فئة للمؤسسة: ${orgId}`);
    return categories;
  } catch (error) {
    console.error('حدث خطأ أثناء جلب الفئات:', error);
    // في حالة حدوث خطأ، استخدم التخزين المحلي
    return await getLocalCategories();
  }
};

export const getCategoryById = async (id: string): Promise<Category> => {
  try {
    // التحقق من حالة الاتصال
    if (!isOnline()) {
      console.log('جاري استخدام التخزين المحلي للفئة لأن المستخدم غير متصل');
      const localCategory = await getLocalCategoryById(id);
      if (localCategory) {
        return localCategory;
      }
      throw new Error('الفئة غير موجودة في التخزين المحلي');
    }
    
    // الحصول على معلومات المستخدم الحالي
    const userInfo = await supabase.auth.getUser();
    const userId = userInfo.data.user?.id;
    
    if (!userId) {
      console.warn('المستخدم غير مسجل الدخول - تعذر جلب الفئة');
      
      // محاولة استخدام التخزين المحلي
      const localCategory = await getLocalCategoryById(id);
      if (localCategory) {
        return localCategory;
      }
      
      throw new Error('المستخدم غير مسجل الدخول والفئة غير موجودة في التخزين المحلي');
    }
    
    // البحث عن معرف المؤسسة الخاصة بالمستخدم
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', userId)
      .single();
      
    if (userError && userError.code !== 'PGRST116') {
      console.error('Error fetching user organization:', userError);
      
      // محاولة استخدام التخزين المحلي
      const localCategory = await getLocalCategoryById(id);
      if (localCategory) {
        return localCategory;
      }
      
      throw userError;
    }
    
    // استخدام معرف المؤسسة لجلب الفئة الخاصة بها فقط
    const organizationId = userData?.organization_id;
    
    // جلب الفئة مع تصفية حسب المؤسسة إذا كان معرف المؤسسة متوفرًا
    let query = supabase.from('product_categories').select('*').eq('id', id);
    
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }
    
    const { data, error } = await query.single();

    if (error) {
      console.error('Error fetching category:', error);
      // في حالة الخطأ، استخدم التخزين المحلي
      const localCategory = await getLocalCategoryById(id);
      if (localCategory) {
        return localCategory;
      }
      throw new Error(error.message);
    }

    // تخزين الفئة محليًا
    categoriesStore.setItem(id, data as Category);
    
    return data as Category;
  } catch (error) {
    console.error(`حدث خطأ أثناء جلب الفئة ${id}:`, error);
    // محاولة أخيرة من التخزين المحلي
    const localCategory = await getLocalCategoryById(id);
    if (localCategory) {
      return localCategory;
    }
    throw error;
  }
};

export const createCategory = async (categoryData: Partial<Category>): Promise<Category> => {
  try {
    // التحقق من حالة الاتصال
    if (!isOnline()) {
      console.log('إنشاء فئة جديدة في وضع عدم الاتصال');
      
      // إنشاء معرف مؤقت للفئة
      const tempId = `temp_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      
      // إنشاء سلاق فريد بناءً على الاسم والوقت
      const timestamp = new Date().getTime();
      const slug = `${categoryData.name?.toLowerCase().replace(/\s+/g, '-')}-${timestamp}`;
      
      // إنشاء كائن الفئة الجديدة
      const newCategory: Category = {
        id: tempId,
        name: categoryData.name || 'فئة جديدة',
        description: categoryData.description || null,
        slug: slug,
        icon: categoryData.icon || null,
        image_url: categoryData.image_url || null,
        is_active: categoryData.is_active !== undefined ? categoryData.is_active : true,
        type: categoryData.type || 'product',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // تخزين الفئة الجديدة محليًا
      await categoriesStore.setItem(tempId, newCategory);
      
      // تحديث قائمة جميع الفئات في التخزين المحلي
      const categories = await getLocalCategories();
      await saveCategoriesToLocalStorage([...categories, newCategory]);
      
      // إضافة الفئة إلى قائمة الفئات غير المتزامنة للمزامنة لاحقًا
      await addCategoryToSyncQueue(newCategory);
      
      console.log('تم إنشاء فئة جديدة محليًا:', newCategory);
      return newCategory;
    }
    
    // إذا كان المستخدم متصل، استخدم السلوك الطبيعي
    // الوقت الحالي
    const timestamp = new Date().getTime();
    
    // إنشاء سلاق فريد بناءً على الاسم والوقت
    const slug = `${categoryData.name?.toLowerCase().replace(/\s+/g, '-')}-${timestamp}`;
    
    const { data, error } = await supabase
      .from('product_categories')
      .insert({ ...categoryData, slug })
      .select()
      .single();

    if (error) {
      console.error('Error creating category:', error);
      throw new Error(error.message);
    }

    // تخزين الفئة الجديدة محليًا
    const newCategory = data as Category;
    await categoriesStore.setItem(newCategory.id, newCategory);
    
    // تحديث قائمة جميع الفئات في التخزين المحلي
    const categories = await getLocalCategories();
    await saveCategoriesToLocalStorage([...categories, newCategory]);
    
    return newCategory;
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
    
    console.log('تمت إضافة الفئة إلى قائمة المزامنة:', category.id);
  } catch (error) {
    console.error('خطأ في إضافة الفئة إلى قائمة المزامنة:', error);
  }
};

export const updateCategory = async (id: string, categoryData: UpdateCategoryData): Promise<Category> => {
  const { data, error } = await supabase
    .from('product_categories')
    .update({
      name: categoryData.name,
      description: categoryData.description,
      icon: categoryData.icon,
      image_url: categoryData.image_url,
      is_active: categoryData.is_active,
      type: categoryData.type,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating category:', error);
    throw new Error(error.message);
  }

  return data as Category;
};

export const deleteCategory = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('product_categories')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting category:', error);
    throw new Error(error.message);
  }
};

// وظائف إدارة الفئات الفرعية
export const getSubcategories = async (categoryId?: string): Promise<Subcategory[]> => {
  try {
    // التحقق من حالة الاتصال
    if (!isOnline()) {
      console.log('جاري استخدام التخزين المحلي للفئات الفرعية لأن المستخدم غير متصل');
      if (categoryId) {
        return await getLocalSubcategoriesByCategoryId(categoryId);
      } else {
        return await getAllLocalSubcategories();
      }
    }
    
    let query = supabase
      .from('product_subcategories')
      .select('*')
      .order('name');
      
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching subcategories:', error);
      // في حالة الخطأ، استخدم التخزين المحلي
      if (categoryId) {
        return await getLocalSubcategoriesByCategoryId(categoryId);
      } else {
        return await getAllLocalSubcategories();
      }
    }

    // تخزين البيانات محليًا للاستخدام في وضع عدم الاتصال
    if (categoryId) {
      saveSubcategoriesToLocalStorage(data, categoryId);
    } else {
      saveSubcategoriesToLocalStorage(data);
    }
    
    return data;
  } catch (error) {
    console.error('حدث خطأ أثناء جلب الفئات الفرعية:', error);
    // في حالة حدوث خطأ، استخدم التخزين المحلي
    if (categoryId) {
      return await getLocalSubcategoriesByCategoryId(categoryId);
    } else {
      return await getAllLocalSubcategories();
    }
  }
};

export const getSubcategoryById = async (id: string): Promise<Subcategory | null> => {
  try {
    // التحقق من حالة الاتصال
    if (!isOnline()) {
      console.log('جاري استخدام التخزين المحلي للفئة الفرعية لأن المستخدم غير متصل');
      return await subcategoriesStore.getItem(id);
    }
    
    const { data, error } = await supabase
      .from('product_subcategories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching subcategory with id ${id}:`, error);
      // في حالة الخطأ، استخدم التخزين المحلي
      return await subcategoriesStore.getItem(id);
    }

    // تخزين الفئة الفرعية محليًا
    subcategoriesStore.setItem(id, data);
    
    return data;
  } catch (error) {
    console.error(`حدث خطأ أثناء جلب الفئة الفرعية ${id}:`, error);
    // محاولة أخيرة من التخزين المحلي
    return await subcategoriesStore.getItem(id);
  }
};

export const createSubcategory = async (subcategory: { category_id: string; name: string; description?: string }): Promise<Subcategory> => {
  try {
    // التحقق من حالة الاتصال
    if (!isOnline()) {
      console.log('إنشاء فئة فرعية جديدة في وضع عدم الاتصال');
      
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
      
      console.log('تم إنشاء فئة فرعية جديدة محليًا:', newSubcategory);
      return newSubcategory;
    }
    
    // إذا كان المستخدم متصل، استخدم السلوك الطبيعي
    // Generate a unique slug by appending timestamp
    const timestamp = new Date().getTime();
    const baseSlug = subcategory.name.toLowerCase().replace(/\s+/g, '-');
    const uniqueSlug = `${baseSlug}-${timestamp}`;

    const { data, error } = await supabase
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
    
    console.log('تمت إضافة الفئة الفرعية إلى قائمة المزامنة:', subcategory.id);
  } catch (error) {
    console.error('خطأ في إضافة الفئة الفرعية إلى قائمة المزامنة:', error);
  }
};

export const updateSubcategory = async (id: string, updates: UpdateSubcategory): Promise<Subcategory> => {
  const { data, error } = await supabase
    .from('product_subcategories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Error updating subcategory ${id}:`, error);
    throw error;
  }

  return data;
};

export const deleteSubcategory = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('product_subcategories')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting subcategory ${id}:`, error);
    throw error;
  }
};

// مزامنة بيانات الفئات والفئات الفرعية عند بدء التطبيق
export const syncCategoriesDataOnStartup = async (): Promise<boolean> => {
  try {
    // تحقق مما إذا كان المستخدم متصلاً بالإنترنت
    if (!isOnline()) {
      console.log('المستخدم غير متصل، سيتم استخدام البيانات المحلية فقط');
      return false;
    }
    
    // جلب الفئات من Supabase
    const { data: categories, error: categoriesError } = await supabase
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
    const { data: subcategories, error: subcategoriesError } = await supabase
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
    
    console.log('تمت مزامنة بيانات الفئات والفئات الفرعية بنجاح');
    return true;
  } catch (error) {
    console.error('خطأ في مزامنة بيانات الفئات والفئات الفرعية:', error);
    return false;
  }
};

// استدعاء المزامنة عند استيراد الملف (لملء التخزين المحلي عند بدء التطبيق)
// تأخير المزامنة لمدة ثانيتين للتأكد من أن التطبيق قد تم تحميله بالكامل
setTimeout(syncCategoriesDataOnStartup, 2000); 