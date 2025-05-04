import { supabase } from '@/lib/supabase';
import { withCache } from '@/lib/cache/storeCache';

// واجهات البيانات التي تتوافق مع قاعدة البيانات
export interface ProductColor {
  id: string;
  name: string;
  color_code: string;
  image_url: string;
  quantity: number;
  price?: number; // سعر خاص بهذا اللون (اختياري)
  is_default?: boolean;
  barcode?: string;
  has_sizes?: boolean; // هل اللون يدعم المقاسات المختلفة
  sizes?: ProductSize[];
}

export interface ProductSize {
  id: string;
  name: string;
  quantity: number;
  price?: number;
  barcode?: string;
  color_id: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  discount_price?: number;
  stock_quantity: number;
  imageUrl: string;
  category: string;
  is_new?: boolean;
  is_featured?: boolean;
  slug: string;
  rating?: number;
  colors?: ProductColor[];
  additional_images?: string[];
  show_price_on_landing?: boolean;
  has_variants?: boolean;
  use_sizes?: boolean;
  // إضافة الميزات الجديدة
  has_fast_shipping?: boolean;
  has_money_back?: boolean;
  has_quality_guarantee?: boolean;
  fast_shipping_text?: string;
  money_back_text?: string;
  quality_guarantee_text?: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon?: string;
  slug?: string;
  product_count: number;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  estimated_time?: string;
  is_price_dynamic?: boolean;
  category?: string;
  slug: string;
  badge?: string;
  badgeColor?: 'default' | 'success' | 'warning';
  features?: string[];
}

export interface OrganizationSettings {
  id: string;
  organization_id: string;
  theme_primary_color: string;
  theme_secondary_color?: string;
  theme_mode: 'light' | 'dark';
  site_name: string;
  logo_url?: string;
  favicon_url?: string;
  default_language: string;
}

// أنواع خاصة بمكونات المتجر
export interface StoreComponent {
  id: string;
  component_type: string;
  settings: any;
  is_active: boolean;
  order_index: number;
}

export interface StoreData {
  name: string;
  logoUrl?: string;
  description?: string;
  primaryColor?: string;
  categories?: Category[];
  products?: Product[];
  services?: Service[];
  components?: StoreComponent[]; // إضافة مكونات المتجر المخصصة
  contactInfo?: {
    address?: string;
    phone?: string;
    email?: string;
    hours?: string;
  };
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
  };
}

// استعلامات الـAPI

// جلب معلومات المتجر الأساسية
export async function getStoreInfoBySubdomain(subdomain: string): Promise<OrganizationSettings | null> {
  try {
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('subdomain', subdomain)
      .single();
    
    if (orgError || !organization) return null;

    const { data: settings, error: settingsError } = await supabase
      .from('organization_settings')
      .select('*')
      .eq('organization_id', organization.id)
      .single();
    
    if (settingsError) return null;
    
    return settings;
  } catch (error) {
    console.error('Error fetching store info:', error);
    return null;
  }
}

// جلب المنتجات المميزة
export async function getFeaturedProducts(organizationId: string): Promise<Product[]> {
  try {
    console.log('Fetching featured products for organization:', organizationId);
    console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL); // سجل عنوان Supabase
    
    if (!organizationId) {
      console.error('معرف المؤسسة فارغ أو غير محدد في getFeaturedProducts!');
      return [];
    }
    
    console.log('Using supabase public client with anonymous credentials');
    
    // استعلام بسيط جداً للتأكد من عمله - إضافة شرط is_active = true
    const { data: productsRaw, error } = await supabase
      .from('products')
      .select('id, name, description, price, compare_at_price, thumbnail_image, stock_quantity')
      .eq('organization_id', organizationId)
      .eq('is_active', true) // إضافة شرط للتأكد من أن المنتج مفعل
      .limit(10);
    
    console.log('Raw query completed. Error:', error ? error.message : 'None');
    console.log('Products found:', productsRaw ? productsRaw.length : 0);
    
    if (error) {
      console.error('Error in getFeaturedProducts simple query:', error);
      console.error('Query details - organization_id:', organizationId);
      return [];
    }
    
    if (!productsRaw || productsRaw.length === 0) {
      console.log('No products found for organization. Returning empty array.');
      
      // لأغراض التصحيح - محاولة استعلام مباشر دون تحديد معرف المؤسسة
      const { data: allProducts, error: allError } = await supabase
        .from('products')
        .select('id, organization_id, is_active')
        .limit(5);
      
      console.log('Debug query - total products in DB:', allProducts ? allProducts.length : 0);
      if (allProducts && allProducts.length > 0) {
        console.log('Sample product IDs:', allProducts.map(p => p.id).join(', '));
        console.log('Sample org IDs:', allProducts.map(p => p.organization_id).join(', '));
        console.log('Sample is_active values:', allProducts.map(p => p.is_active).join(', '));
      }
      
      if (allError) {
        console.error('Debug query error:', allError);
      }
      
      return [];
    }
    
    // تحويل البيانات الأولية إلى منتجات
    const products = productsRaw.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description || '',
      price: parseFloat(product.price || '0'),
      discount_price: product.compare_at_price ? parseFloat(product.compare_at_price) : undefined,
      imageUrl: product.thumbnail_image || '',
      category: 'عام', // قيمة افتراضية
      is_new: false,
      is_featured: false,
      stock_quantity: product.stock_quantity || 0,
      slug: product.id,
      rating: 4.5, // قيمة افتراضية للتقييم
      colors: [],
      additional_images: []
    }));
    
    console.log('Returning simplified products:', products.length);
    return products;
  } catch (error) {
    console.error('Exception in getFeaturedProducts:', error);
    return [];
  }
}

// جلب جميع المنتجات
export async function getAllProducts(organizationId: string): Promise<Product[]> {
  try {
    console.log('Fetching all products for organization:', organizationId);
    // استعلام مبسط للتأكد من عمله
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true) // إضافة شرط للتأكد من أن المنتج مفعل
      .limit(50);
    
    if (error) {
      console.error('Error in getAllProducts query:', error);
      throw error;
    }
    
    console.log('Products retrieved:', data?.length || 0, 'Raw data:', data);
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // تحويل البيانات إلى الشكل المطلوب
    const products = data.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description || '',
      price: parseFloat(product.price),
      discount_price: product.compare_at_price ? parseFloat(product.compare_at_price) : undefined,
      imageUrl: product.thumbnail_image || '',
      category: product.category || 'عام',
      is_new: product.is_new || false,
      is_featured: product.is_featured || false,
      stock_quantity: product.stock_quantity ?? 0,
      slug: product.slug || product.id,
      rating: 4.5, // قيمة افتراضية للتقييم
    }));
    
    return products;
  } catch (error) {
    console.error('Error fetching all products:', error);
    return [];
  }
}

// جلب فئات المنتجات
export async function getProductCategories(organizationId: string): Promise<Category[]> {
  try {
    console.log('Fetching product categories for organization:', organizationId);
    
    // استعلام مبسط لجدول product_categories
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .eq('organization_id', organizationId);
    
    if (error) {
      console.error('Error in getProductCategories query:', error);
      throw error;
    }
    
    console.log('Categories retrieved:', data?.length || 0, 'Raw data:', data);
    
    // تحويل البيانات إلى الشكل المطلوب
    if (data && data.length > 0) {
      const categories = data.map(category => ({
        id: category.id,
        name: category.name,
        description: category.description || '',
        icon: category.icon,
        slug: category.slug,
        product_count: 0  // سيتم تحديثه لاحقًا
      }));
      
      // أولاً: جلب جميع المنتجات مرة واحدة لتحسين الأداء
      const { data: allProducts, error: productsError } = await supabase
        .from('products')
        .select('id, category, category_id')
        .eq('organization_id', organizationId)
        .eq('is_active', true);
      
      if (!productsError && allProducts && allProducts.length > 0) {
        console.log(`Retrieved ${allProducts.length} total products for counting`);
        
        // حساب المنتجات لكل فئة
        categories.forEach(category => {
          // البحث عن المنتجات التي تنتمي إلى هذه الفئة (بأي من الطريقتين)
          const matchingProducts = allProducts.filter(product => 
            // طريقة 1: البحث بمعرف الفئة
            product.category_id === category.id || 
            // طريقة 2: البحث باسم الفئة
            product.category === category.name ||
            // طريقة 3: البحث بمعرف الفئة المخزن كنص في حقل category
            product.category === category.id
          );
          
          category.product_count = matchingProducts.length;
          console.log(`Category ${category.name} (${category.id}) has ${category.product_count} products`);
        });
      } else {
        console.warn('Could not fetch products for counting, using individual queries as fallback');
        
        // خطة بديلة: استعلامات فردية لكل فئة
        await Promise.all(categories.map(async (category) => {
          try {
            // استعلام باستخدام category_id
            const { count: count1, error: error1 } = await supabase
              .from('products')
              .select('*', { count: 'exact', head: true })
              .eq('organization_id', organizationId)
              .eq('category_id', category.id)
              .eq('is_active', true);
            
            // استعلام باستخدام حقل category (اسم الفئة)
            const { count: count2, error: error2 } = await supabase
              .from('products')
              .select('*', { count: 'exact', head: true })
              .eq('organization_id', organizationId)
              .eq('category', category.name)
              .eq('is_active', true);
            
            // استعلام باستخدام حقل category (معرف الفئة)
            const { count: count3, error: error3 } = await supabase
              .from('products')
              .select('*', { count: 'exact', head: true })
              .eq('organization_id', organizationId)
              .eq('category', category.id)
              .eq('is_active', true);
            
            // جمع النتائج
            const totalCount = (count1 || 0) + (count2 || 0) + (count3 || 0);
            category.product_count = totalCount;
            
            console.log(`Category ${category.name} has ${totalCount} products (${count1 || 0} by ID, ${count2 || 0} by name, ${count3 || 0} by category=id)`);
          } catch (countError) {
            console.error(`Exception counting products for category ${category.id}:`, countError);
          }
        }));
      }
      
      return categories;
    }
    
    // في حالة عدم وجود فئات، نرجع مصفوفة فارغة بدلاً من الفئة الافتراضية
    return [];
  } catch (error) {
    console.error('Error fetching product categories:', error);
    // في حالة الخطأ نرجع مصفوفة فارغة بدلاً من الفئة الافتراضية
    return [];
  }
}

// جلب الخدمات
export async function getServices(organizationId: string): Promise<Service[]> {
  try {
    console.log('Fetching services for organization:', organizationId);
    // استعلام مبسط لجدول الخدمات
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('organization_id', organizationId);
    
    if (error) {
      console.error('Error in getServices query:', error);
      throw error;
    }
    
    console.log('Services retrieved:', data?.length || 0, 'Raw data:', data);
    
    if (!data || data.length === 0) {
      console.log('No services found for the organization');
      // إرجاع مصفوفة فارغة بدلاً من الخدمة الافتراضية
      return [];
    }
    
    // تحويل البيانات إلى الشكل المطلوب
    const services = data.map((service, index) => ({
      id: service.id,
      name: service.name,
      description: service.description || '',
      price: parseFloat(service.price || '0'),
      image: service.image || '',
      estimated_time: service.estimated_time || '',
      is_price_dynamic: service.is_price_dynamic || false,
      category: service.category || '',
      slug: service.slug || service.id,
      badge: index === 0 ? 'الأكثر طلباً' : (index === 1 ? 'جديد' : undefined),
      badgeColor: index === 0 ? 'success' : (index === 1 ? 'default' : 'default') as 'default' | 'success' | 'warning',
      features: service.features || []
    }));
    
    return services;
  } catch (error) {
    console.error('Error fetching services:', error);
    // إرجاع مصفوفة فارغة في حالة حدوث خطأ
    return [];
  }
}

// جلب كل بيانات المتجر مرة واحدة
export async function getFullStoreData(subdomain: string): Promise<StoreData | null> {
  // استخدام التخزين المؤقت للمتجر بناءً على النطاق الفرعي
  return withCache<StoreData | null>(`store_data:${subdomain}`, async () => {
    try {
      console.log('getFullStoreData called for subdomain:', subdomain);
      
      if (!subdomain) {
        console.error('النطاق الفرعي غير محدد في getFullStoreData');
        return null;
      }
      
      // التعامل مع www كنطاق رئيسي وليس كنطاق فرعي
      const isMainDomain = subdomain === 'www';
      let organizationId = null;
      let organization = null;
      
      if (isMainDomain) {
        // محاولة استخدام معرف المؤسسة من التخزين المحلي للنطاق الرئيسي
        organizationId = localStorage.getItem('bazaar_organization_id');
        
        // إذا لم يكن هناك معرف مخزن، استخدم المعرف الافتراضي
        if (!organizationId) {
          // تعيين معرف المؤسسة الافتراضي
          organizationId = 'aacf0931-91aa-4da3-94e6-eef5d8956443';
          console.log('استخدام معرف المؤسسة الافتراضي للنطاق الرئيسي:', organizationId);
        } else {
          console.log('استخدام معرف المؤسسة من التخزين المحلي للنطاق الرئيسي:', organizationId);
        }
        
        // جلب معلومات المؤسسة بواسطة المعرف
        if (organizationId) {
          const { data: orgData, error: orgIdError } = await supabase
            .from('organizations')
            .select('id, name, description, settings, logo_url')
            .eq('id', organizationId)
            .single();
            
          if (orgIdError || !orgData) {
            console.error('خطأ في جلب بيانات المؤسسة باستخدام المعرف:', orgIdError?.message || 'المؤسسة غير موجودة');
            return null;
          }
          
          organization = orgData;
          console.log('تم العثور على المؤسسة للنطاق الرئيسي:', { id: organization.id, name: organization.name });
        } else {
          console.error('لم يتم العثور على معرف مؤسسة للنطاق الرئيسي');
          return null;
        }
      } else {
        // جلب معلومات المتجر باستخدام النطاق الفرعي (للنطاقات الفرعية الحقيقية)
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('id, name, description, settings, logo_url')
          .eq('subdomain', subdomain)
          .single();
        
        if (orgError) {
          console.error('Error fetching organization data:', orgError.message);
          return null;
        }
        
        if (!orgData) {
          console.error('No organization found for subdomain:', subdomain);
          return null;
        }
        
        organization = orgData;
        organizationId = organization.id;
        console.log('تم العثور على المؤسسة للنطاق الفرعي:', { id: organization.id, name: organization.name });
      }
      
      // حفظ معرف المؤسسة في التخزين المحلي للاستخدام في المستقبل
      localStorage.setItem('bazaar_organization_id', organization.id);
      
      // جلب البيانات بشكل متوازي لتحسين الأداء
      const [
        settingsResult, 
        componentsResult, 
        productsResult, 
        categoriesResult, 
        servicesResult
      ] = await Promise.all([
        // 1. جلب إعدادات المتجر
        supabase
          .from('organization_settings')
          .select('*')
          .eq('organization_id', organization.id)
          .single(),
          
        // 2. جلب مكونات المتجر
        supabase
          .rpc('get_store_settings', {
            p_organization_id: organization.id
          }),
          
        // 3. جلب المنتجات المميزة (مع حد أقصى للمنتجات)
        supabase
          .from('products')
          .select('id, name, description, price, compare_at_price, thumbnail_image, stock_quantity, category, category_id')
          .eq('organization_id', organization.id)
          .eq('is_active', true)
          .limit(12),
          
        // 4. جلب فئات المنتجات
        supabase
          .from('product_categories')
          .select('*')
          .eq('organization_id', organization.id),
          
        // 5. جلب الخدمات
        supabase
          .from('services')
          .select('*')
          .eq('organization_id', organization.id)
      ]);
      
      // 1. إعدادات المتجر
      const settings = settingsResult.error ? null : settingsResult.data;
      
      // 2. مكونات المتجر
      const storeComponents = componentsResult.error ? [] : componentsResult.data;
      
      // 3. المنتجات
      const productsRaw = productsResult.error ? [] : productsResult.data;
      const products = productsRaw.map(product => ({
        id: product.id,
        name: product.name,
        description: product.description || '',
        price: parseFloat(product.price || '0'),
        discount_price: product.compare_at_price ? parseFloat(product.compare_at_price) : undefined,
        imageUrl: product.thumbnail_image || '',
        category: product.category || 'عام',
        is_new: false,
        stock_quantity: product.stock_quantity || 0,
        slug: product.id,
        rating: 4.5, // قيمة افتراضية للتقييم
      }));
      
      // 4. الفئات
      const categoriesRaw = categoriesResult.error ? [] : categoriesResult.data;
      const categories = categoriesRaw.map(category => ({
        id: category.id,
        name: category.name,
        description: category.description || '',
        icon: category.icon,
        slug: category.slug,
        product_count: 0  // سيتم تحديثه لاحقاً
      }));
      
      // حساب عدد المنتجات لكل فئة بطريقة محسنة
      if (categories.length > 0 && productsRaw.length > 0) {
        // إنشاء Map للعد السريع
        const categoryCounts = new Map<string, number>();
        
        // عد المنتجات لكل فئة
        productsRaw.forEach(product => {
          const categoryId = product.category_id;
          const categoryName = product.category;
          
          // عد بواسطة معرف الفئة
          if (categoryId) {
            const count = categoryCounts.get(categoryId) || 0;
            categoryCounts.set(categoryId, count + 1);
          }
          
          // عد بواسطة اسم الفئة إذا كان متاحاً
          if (categoryName && typeof categoryName === 'string') {
            categories.forEach(cat => {
              if (cat.name === categoryName) {
                const count = categoryCounts.get(cat.id) || 0;
                categoryCounts.set(cat.id, count + 1);
              }
            });
          }
        });
        
        // تطبيق العد على الفئات
        categories.forEach(category => {
          category.product_count = categoryCounts.get(category.id) || 0;
        });
      }
      
      // 5. الخدمات
      const servicesRaw = servicesResult.error ? [] : servicesResult.data;
      const services = servicesRaw.map((service, index) => ({
        id: service.id,
        name: service.name,
        description: service.description || '',
        price: parseFloat(service.price || '0'),
        image: service.image || '',
        estimated_time: service.estimated_time || '',
        is_price_dynamic: service.is_price_dynamic || false,
        category: service.category || '',
        slug: service.slug || service.id,
        badge: index === 0 ? 'الأكثر طلباً' : (index === 1 ? 'جديد' : undefined),
        badgeColor: index === 0 ? 'success' : (index === 1 ? 'default' : 'default') as 'default' | 'success' | 'warning',
        features: service.features || []
      }));
      
      // تجميع البيانات
      const storeData = {
        name: settings?.site_name || organization.name,
        logoUrl: settings?.logo_url || organization.logo_url,
        description: organization.description,
        primaryColor: settings?.theme_primary_color,
        categories,
        products,
        services,
        components: storeComponents || [],
        contactInfo: {
          address: 'شارع الملك فهد، الرياض، المملكة العربية السعودية',
          phone: '+966 123 456 789',
          email: 'info@' + subdomain + '.com',
          hours: 'يومياً من 9 صباحاً حتى 10 مساءً'
        },
        socialLinks: {
          facebook: 'https://facebook.com',
          twitter: 'https://twitter.com',
          instagram: 'https://instagram.com',
          youtube: 'https://youtube.com'
        }
      };
      
      console.log('Store data prepared:', {
        name: storeData.name,
        productsCount: products.length,
        categoriesCount: categories.length,
        servicesCount: services.length,
        componentsCount: storeComponents ? storeComponents.length : 0
      });
      
      return storeData;
    } catch (error) {
      console.error('Error fetching full store data:', error);
      return null;
    }
  }, 15 * 60 * 1000); // تخزين مؤقت لمدة 15 دقيقة
}

// جلب منتج محدد بواسطة الـslug
export async function getProductBySlug(organizationId: string, slug: string): Promise<Product | null> {
  try {
    console.log('Fetching product by slug:', slug, 'for organization:', organizationId);
    
    // تحقق مما إذا كان الـ slug يمثل UUID (يحتوي على شرطات)
    const isUuid = slug.includes('-');
    
    // استراتيجية البحث: جرب البحث بعة طرق حتى تجد المنتج
    let data = null;
    
    // البحث 1: محاولة البحث بواسطة slug (الطريقة الافتراضية)
    let slugSearchSuccess = false;
    try {
      const { data: slugData, error: slugError } = await supabase
        .from('products')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('slug', slug)
        .eq('is_active', true)
        .single();
      
      if (!slugError && slugData) {
        data = slugData;
        slugSearchSuccess = true;
        console.log('Found product by slug:', slug);
      }
    } catch (slugSearchError) {
      console.warn('Product not found by slug search');
    }
    
    // البحث 2: إذا فشل البحث الأول وكان الـ slug يبدو كـ UUID، جرب البحث باستخدام id
    if (!slugSearchSuccess && isUuid) {
      try {
        const { data: idData, error: idError } = await supabase
          .from('products')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('id', slug)
          .eq('is_active', true)
          .single();
        
        if (!idError && idData) {
          data = idData;
          console.log('Found product by ID:', slug);
        }
      } catch (idSearchError) {
        console.warn('Product not found by ID search');
      }
    }
    
    // البحث 3: استخدام طلب HTTP مباشر كحل أخير
    if (!data && isUuid) {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        if (supabaseUrl && supabaseAnonKey) {
          console.log('Trying direct HTTP request for UUID:', slug);
          
          const response = await fetch(
            `${supabaseUrl}/rest/v1/products?select=*&organization_id=eq.${organizationId}&id=eq.${slug}&is_active=eq.true&limit=1`,
            {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`
              }
            }
          );
          
          if (response.ok) {
            const results = await response.json();
            if (results && results.length > 0) {
              data = results[0];
              console.log('Found product via direct HTTP request:', slug);
            }
          } else {
            console.warn('HTTP request failed with status:', response.status);
          }
        }
      } catch (fetchError) {
        console.warn('Error with direct HTTP request:', fetchError);
      }
    }
    
    // إذا لم يتم العثور على المنتج بعد كل المحاولات
    if (!data) {
      console.warn('Product not found for slug/id after all attempts:', slug);
      return null;
    }
    
    // جلب بيانات الألوان المتاحة للمنتج
    const { data: colorData, error: colorError } = await supabase
      .from('product_colors')
      .select('*')
      .eq('product_id', data.id);
    
    // جلب الصور الإضافية للمنتج
    const { data: imageData, error: imageError } = await supabase
      .from('product_images')
      .select('image_url')
      .eq('product_id', data.id);
    
    const colors = colorError ? [] : colorData.map(color => ({
      id: color.id,
      name: color.name,
      color_code: color.color_code,
      image_url: color.image_url,
      quantity: color.quantity || 0,
      price: color.price,
      is_default: color.is_default,
      barcode: color.barcode || null,
      has_sizes: color.has_sizes || false
    }));
    
    const additional_images = imageError ? [] : imageData.map(img => img.image_url);
    
    // جلب اسم الفئة
    const { data: categoryData, error: categoryError } = await supabase
      .from('product_categories')
      .select('name')
      .eq('id', data.category_id)
      .single();
    
    const categoryName = categoryError ? 'أخرى' : categoryData.name;
    
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      price: parseFloat(data.price),
      discount_price: data.compare_at_price ? parseFloat(data.compare_at_price) : undefined,
      imageUrl: data.thumbnail_image,
      category: categoryName,
      is_new: data.is_new,
      is_featured: data.is_featured,
      stock_quantity: data.stock_quantity,
      slug: data.slug,
      rating: parseFloat((3 + Math.random() * 2).toFixed(1)), // قيمة افتراضية للتقييم
      colors,
      additional_images,
      show_price_on_landing: data.show_price_on_landing !== false,
      has_variants: data.has_variants || false,
      use_sizes: data.use_sizes || false,
      // إضافة الميزات الإضافية
      has_fast_shipping: data.has_fast_shipping || false,
      has_money_back: data.has_money_back || false,
      has_quality_guarantee: data.has_quality_guarantee || false,
      fast_shipping_text: data.fast_shipping_text || 'شحن سريع لجميع الولايات (1-3 أيام)',
      money_back_text: data.money_back_text || 'ضمان استرداد المال خلال 14 يوم',
      quality_guarantee_text: data.quality_guarantee_text || 'ضمان جودة المنتج'
    };
  } catch (error) {
    console.error('Error fetching product by slug:', error);
    return null;
  }
}

// Order Processing
export async function processOrder(
  organizationId: string,
  orderData: {
    fullName: string;
    phone: string;
    province: string;
    address: string;
    deliveryCompany: string;
    paymentMethod: string;
    notes: string;
    productId: string;
    productColorId?: string | null;
    productSizeId?: string | null;
    sizeName?: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    deliveryFee: number;
  }
) {
  try {
    // Log request data for debugging
    console.log("Calling process_online_order_new with:", {
      organizationId,
      ...orderData
    });

    // استخدام وظيفة معالجة الطلبات الجديدة بشكل صحيح
    const { data, error } = await supabase.rpc('process_online_order_new', {
      p_full_name: orderData.fullName,
      p_phone: orderData.phone,
      p_province: orderData.province,
      p_address: orderData.address,
      p_delivery_company: orderData.deliveryCompany,
      p_payment_method: orderData.paymentMethod,
      p_notes: orderData.notes || '',
      p_product_id: orderData.productId,
      p_product_color_id: orderData.productColorId || null,
      p_product_size_id: orderData.productSizeId || null,
      p_size_name: orderData.sizeName || null,
      p_quantity: orderData.quantity,
      p_unit_price: orderData.unitPrice,
      p_total_price: orderData.totalPrice,
      p_delivery_fee: orderData.deliveryFee,
      p_organization_id: organizationId
    });

    if (error) {
      console.error('Error processing order:', error);
      
      // Try to determine the specific error from the error message
      let detailedError = error.message;
      
      // Check for common database errors
      if (error.message.includes("slug")) {
        detailedError = "مشكلة في حقل slug، يرجى الاتصال بالمسؤول.";
      } else if (error.message.includes("violates foreign key constraint")) {
        detailedError = "مشكلة في العلاقات بين الجداول، يرجى التحقق من المعرفات.";
      }
      
      throw new Error(detailedError);
    }

    // Log success for debugging
    console.log("Process order successful:", data);
    
    // Handle case where the stored procedure returned an error object
    if (data && data.status === 'error') {
      console.error('Function returned error:', data);
      throw new Error(`Error from database: ${data.error}`);
    }

    return data;
  } catch (error) {
    console.error('Error calling process_online_order_new:', error);
    throw error;
  }
} 