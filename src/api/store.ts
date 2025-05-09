import { supabase } from '@/lib/supabase-client';
import { withCache, LONG_CACHE_TTL, SHORT_CACHE_TTL } from '@/lib/cache/storeCache';
import { getSupabaseClient } from '@/lib/supabase-client';

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
    const supabaseClient = await getSupabaseClient();
    const { data: organization, error: orgError } = await supabaseClient
      .from('organizations')
      .select('id')
      .eq('subdomain', subdomain)
      .single();
    
    if (orgError || !organization) return null;

    const { data: settings, error: settingsError } = await supabaseClient
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
    const supabaseClient = await getSupabaseClient();
    const { data: productsRaw, error } = await supabaseClient
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
      const { data: allProducts, error: allError } = await supabaseClient
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
    if (!organizationId) {
      console.error('معرف المؤسسة غير محدد في getAllProducts');
      return [];
    }
    
    // استخدام التخزين المؤقت للحد من الاستعلامات المتكررة
    return withCache<Product[]>(
      `products:${organizationId}`,
      async () => {
        // استخدام الدالة المخصصة لجلب المنتجات مع معلومات الفئات في استعلام واحد
        const { data, error } = await supabase
          .rpc('get_products_with_categories', { 
            org_id: organizationId,
            active_only: true
          });
        
        if (error) {
          console.error('Error in getAllProducts query:', error);
          
          // خطة بديلة في حالة فشل الاستعلام المخصص
          console.warn('فشل استخدام الاستعلام المخصص، استخدام الطريقة العادية');
          const { data: productsData, error: productsError } = await supabase
            .from('products')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('is_active', true)
            .limit(50);
            
          if (productsError || !productsData) {
            return [];
          }
          
          // تحويل البيانات إلى الشكل المطلوب
          return productsData.map(product => ({
            id: product.id,
            name: product.name,
            description: product.description || '',
            price: parseFloat(product.price || '0'),
            discount_price: product.compare_at_price ? parseFloat(product.compare_at_price) : undefined,
            imageUrl: product.thumbnail_image || '',
            category: product.category || 'عام',
            stock_quantity: product.stock_quantity || 0,
            slug: product.id,
            rating: 4.5, // قيمة افتراضية للتقييم
            is_new: product.is_new || false,
            is_featured: product.is_featured || false,
            colors: [],
            additional_images: [],
            has_variants: product.has_variants || false,
            use_sizes: product.use_sizes || false
          }));
        }
        
        if (!data || data.length === 0) {
          return [];
        }
        
        // تحويل البيانات إلى الشكل المطلوب
        return data.map((product: any) => ({
          id: product.id,
          name: product.name,
          description: product.description || '',
          price: parseFloat(product.price || '0'),
          discount_price: product.compare_at_price ? parseFloat(product.compare_at_price) : undefined,
          imageUrl: product.thumbnail_image || '',
          category: product.category ? product.category.name : 'عام',
          stock_quantity: product.stock_quantity || 0,
          slug: product.id,
          rating: 4.5, // قيمة افتراضية للتقييم
          is_new: product.is_new || false,
          is_featured: product.is_featured || false,
          colors: [],
          additional_images: [],
          has_variants: product.has_variants || false,
          use_sizes: product.use_sizes || false,
          // إضافة معلومات الفئة وتنسيقها بشكل صحيح
          category_data: product.category,
          subcategory_data: product.subcategory
        }));
      },
      SHORT_CACHE_TTL, // استخدام تخزين مؤقت قصير المدى للمنتجات لأنها قد تتغير
      true // استخدام التخزين المؤقت في الذاكرة
    );
  } catch (error) {
    console.error('Exception in getAllProducts:', error);
    return [];
  }
}

// جلب فئات المنتجات
export async function getProductCategories(organizationId: string): Promise<Category[]> {
  try {
    if (!organizationId) {
      console.error('معرف المؤسسة غير محدد في getProductCategories');
      return [];
    }
    
    // استخدام التخزين المؤقت للحد من الاستعلامات المتكررة
    return withCache<Category[]>(
      `categories:${organizationId}`,
      async () => {
        // استعلام مبسط لجدول product_categories
        const { data, error } = await supabase
          .from('product_categories')
          .select('*')
          .eq('organization_id', organizationId);
        
        if (error) {
          console.error('Error in getProductCategories query:', error);
          throw error;
        }
        
        // تحويل البيانات إلى الشكل المطلوب
        if (!data || data.length === 0) {
          return [];
        }
        
        const categories = data.map(category => ({
          id: category.id,
          name: category.name,
          description: category.description || '',
          icon: category.icon,
          slug: category.slug,
          product_count: 0  // سيتم تحديثه لاحقًا
        }));
        
        // تحسين: استعلام واحد لجميع المنتجات مع عدد حسب الفئة باستخدام GROUP BY
        try {
          // في Supabase يمكننا استخدام RPC لتنفيذ استعلام PostgreSQL مخصص
          const { data: productCounts, error: countError } = await supabase
            .rpc('get_product_counts_by_category', { org_id: organizationId });
            
          if (!countError && productCounts) {
            // تحديث عدد المنتجات لكل فئة
            productCounts.forEach((item: {category_id: string, count: number}) => {
              const category = categories.find(c => c.id === item.category_id);
              if (category) {
                category.product_count = item.count;
              }
            });
          } else {
            // خطة بديلة في حالة فشل الاستعلام المخصص
            console.warn('فشل استخدام الاستعلام المخصص، استخدام الطريقة البديلة');
            
            // أولاً: جلب جميع المنتجات مرة واحدة لتحسين الأداء
            const { data: allProducts, error: productsError } = await supabase
              .from('products')
              .select('id, category_id')
              .eq('organization_id', organizationId)
              .eq('is_active', true);
              
            if (!productsError && allProducts && allProducts.length > 0) {
              // إنشاء قاموس العد
              const categoryCounter: Record<string, number> = {};
              
              // عد المنتجات لكل فئة
              allProducts.forEach(product => {
                if (product.category_id) {
                  categoryCounter[product.category_id] = (categoryCounter[product.category_id] || 0) + 1;
                }
              });
              
              // تحديث عدد المنتجات لكل فئة
              categories.forEach(category => {
                category.product_count = categoryCounter[category.id] || 0;
              });
            }
          }
        } catch (countError) {
          console.error('خطأ أثناء حساب عدد المنتجات:', countError);
        }
        
        return categories;
      },
      LONG_CACHE_TTL, // استخدام تخزين مؤقت طويل المدى نسبيًا لفئات المنتجات
      true // استخدام التخزين المؤقت في الذاكرة
    );
  } catch (error) {
    console.error('Exception in getProductCategories:', error);
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
  try {
    console.log('Fetching full store data for subdomain:', subdomain);
    const startTime = Date.now();
    
    const supabaseClient = await getSupabaseClient();
    
    // 1. الحصول على معرف المؤسسة من اسم النطاق الفرعي
    const { data: organization, error: orgError } = await supabaseClient
      .from('organizations')
      .select('id, name, logo_url, description')
      .eq('subdomain', subdomain)
      .single();
    
    if (orgError || !organization) {
      console.error('Error fetching organization by subdomain:', orgError);
      return null;
    }
    
    console.log('Found organization:', organization.name);
    const organizationId = organization.id;
    
    // التحقق مما إذا كان المستخدم مسجل دخول
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const isLoggedIn = !!sessionData.session?.user;
    console.log("حالة تسجيل الدخول:", isLoggedIn ? "مسجل دخول" : "زائر");
    
    // 2. جلب إعدادات المؤسسة (التلوين والمظهر)
    let settings;
    
    if (isLoggedIn) {
      const { data: orgSettings, error: settingsError } = await supabaseClient
        .from('organization_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .single();
      
      if (settingsError) {
        console.error('Error fetching organization settings:', settingsError);
      } else {
        settings = orgSettings;
      }
    } else {
      // استخدام سياسة RLS العامة للزوار
      const { data: orgSettings, error: settingsError } = await supabaseClient
        .from('organization_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .single();
      
      if (settingsError) {
        console.error('Error fetching organization settings for public access:', settingsError);
      } else {
        settings = orgSettings;
      }
    }
    
    // 3. جلب مكونات المتجر
    let storeComponents: StoreComponent[] = [];
    
    if (isLoggedIn) {
      const { data: componentsData, error: componentsError } = await supabaseClient
        .rpc('get_store_settings', {
          p_organization_id: organizationId,
          p_public_access: false
        });
      
      if (componentsError) {
        console.error('Error fetching store components:', componentsError);
      } else if (componentsData) {
        storeComponents = componentsData.map(item => ({
          id: item.id,
          component_type: item.component_type,
          settings: item.settings,
          is_active: item.is_active,
          order_index: item.order_index
        }));
      }
    } else {
      // استخدام دالة get_store_settings مع معلمة p_public_access = true بدلاً من get_public_store_settings
      console.log("استخدام get_store_settings مع p_public_access = true للزائر");
      const { data: componentsData, error: componentsError } = await supabaseClient
        .rpc('get_store_settings', {
          p_organization_id: organizationId,
          p_public_access: true
        });
      
      if (componentsError) {
        console.error('Error fetching store components for public access:', componentsError);
      } else if (componentsData) {
        storeComponents = componentsData.map(item => ({
          id: item.id,
          component_type: item.component_type,
          settings: item.settings,
          is_active: item.is_active,
          order_index: item.order_index
        }));
      }
    }
    
    console.log(`Fetched ${storeComponents.length} store components`);
    
    // 4. جلب الفئات 
    let categories: Category[] = [];
    
    if (isLoggedIn) {
      const { data: categoriesData, error: categoriesError } = await supabaseClient
        .from('product_categories')
        .select('*')
        .eq('organization_id', organizationId);
      
      if (categoriesError) {
        console.error('Error fetching product categories:', categoriesError);
      } else if (categoriesData) {
        categories = await getProductCategories(organizationId);
      }
    } else {
      // استخدام استعلام بسيط بدلاً من RPC للفئات
      console.log("جلب الفئات للزائر");
      try {
        categories = await getProductCategories(organizationId);
      } catch (catError) {
        console.error('Error fetching categories for public access:', catError);
      }
    }
    
    // باقي الكود بدون تغيير...

    // 5. جمع البيانات في كائن واحد
    const storeData: StoreData = {
      name: organization.name,
      logoUrl: organization.logo_url || '',
      description: organization.description || '',
      primaryColor: settings?.theme_primary_color || '#6366f1',
      categories,
      products: [],
      services: [],
      components: storeComponents,
      contactInfo: {},
      socialLinks: {}
    };
    
    const endTime = Date.now();
    console.log(`Finished loading store data in ${(endTime - startTime) / 1000} seconds`);
    
    return storeData;
  } catch (err) {
    console.error('Error fetching full store data:', err);
    return null;
  }
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
      const supabaseClient = await getSupabaseClient();
      const { data: slugData, error: slugError } = await supabaseClient
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
        const supabaseClient = await getSupabaseClient();
        const { data: idData, error: idError } = await supabaseClient
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
    const supabaseClient = await getSupabaseClient();
    const { data: colorData, error: colorError } = await supabaseClient
      .from('product_colors')
      .select('*')
      .eq('product_id', data.id);
    
    // جلب الصور الإضافية للمنتج
    const { data: imageData, error: imageError } = await supabaseClient
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
    const { data: categoryData, error: categoryError } = await supabaseClient
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

// الحصول على اسم المنتج فقط حسب المعرف
export async function getProductNameById(productId: string): Promise<string> {
  try {
    if (!productId) {
      console.error('معرف المنتج فارغ أو غير محدد في getProductNameById!');
      return '';
    }
    
    const supabaseClient = await getSupabaseClient();
    const { data, error } = await supabaseClient
      .from('products')
      .select('name')
      .eq('id', productId)
      .single();
    
    if (error) {
      console.error('Error fetching product name:', error);
      return '';
    }
    
    return data?.name || '';
  } catch (error) {
    console.error('Error in getProductNameById:', error);
    return '';
  }
}

// Order Processing
export async function processOrder(
  organizationId: string,
  orderData: {
    fullName: string;
    phone: string;
    province: string;
    municipality: string;
    address: string;
    city?: string;
    deliveryCompany: string;
    deliveryOption: "home" | "office";
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
    formData?: Record<string, any>; // بيانات النموذج المخصص
  }
) {
  try {
    // تحقق من تعريف قيم المعلمات الأساسية
    if (!organizationId) {
      console.error("قيمة organizationId غير محددة!");
      throw new Error("معرف المؤسسة غير محدد.");
    }

    if (!orderData.productId) {
      console.error("قيمة productId غير محددة!");
      throw new Error("معرف المنتج غير محدد.");
    }

    // Log request data for debugging
    console.log("Calling process_online_order_new with:", {
      organizationId,
      ...orderData
    });

    // توسيع تسجيل الأخطاء لتتبع مشكلة تجمد الصفحة
    console.log("بدء محاولة الاتصال بوظيفة قاعدة البيانات...");
    
    // تحضير بيانات النموذج المخصص
    const formDataJson = orderData.formData ? JSON.stringify(orderData.formData) : null;
    console.log("بيانات النموذج المخصص:", formDataJson);
    
    // إعداد المعلمات مع التحقق من القيم NULL/undefined
    const params = {
      p_full_name: orderData.fullName,
      p_phone: orderData.phone,
      p_province: orderData.province,
      p_municipality: orderData.municipality || orderData.province, // استخدام الولاية كقيمة بديلة
      p_address: orderData.address || 'غير محدد',
      p_city: orderData.city || orderData.municipality || orderData.province, // استخدام البلدية أو الولاية كقيمة للمدينة
      p_delivery_company: orderData.deliveryCompany || '',
      p_delivery_option: orderData.deliveryOption || 'home',
      p_payment_method: orderData.paymentMethod || 'cod',
      p_notes: orderData.notes || '',
      p_product_id: orderData.productId,
      p_product_color_id: orderData.productColorId || null,
      p_product_size_id: orderData.productSizeId || null,
      p_size_name: orderData.sizeName || null,
      p_quantity: orderData.quantity || 1,
      p_unit_price: orderData.unitPrice || 0,
      p_total_price: orderData.totalPrice || 0,
      p_delivery_fee: orderData.deliveryFee || 0,
      p_organization_id: organizationId,
      p_form_data: formDataJson
    };
    
    console.log("المعلمات المستخدمة للاتصال:", params);
    
    // استخدام وظيفة معالجة الطلبات الجديدة بالبيانات المخصصة مع وقت انتظار أقصر
    console.log("محاولة استدعاء RPC: process_online_order_new");
    
    // وضع وقت انتظار قصير للطلب
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("تجاوز مهلة استدعاء RPC"));
      }, 20000); // زيادة وقت الانتظار إلى 20 ثانية
    });
    
    let rpcResponse;
    try {
      // استخدام Promise.race لتنفيذ وقت انتظار للطلب
      const rpcPromise = supabase.rpc('process_online_order_new', params);
      rpcResponse = await Promise.race([rpcPromise, timeoutPromise]);
      console.log("تم استدعاء RPC بنجاح، جاري تحليل الاستجابة...");
    } catch (rpcError) {
      console.error("حدث خطأ أثناء استدعاء RPC:", rpcError);
      throw new Error(`فشل الاتصال بقاعدة البيانات: ${rpcError instanceof Error ? rpcError.message : 'خطأ غير معروف'}`);
    }
    
    const { data, error } = rpcResponse;
    
    console.log("استجابة من Supabase RPC:", { 
      data: data ? 'موجود' : 'غير موجود', 
      error: error ? `${error.code}: ${error.message}` : 'لا يوجد خطأ' 
    });
    
    if (error) {
      console.error('Error processing order:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      
      // Try to determine the specific error from the error message
      let detailedError = error.message;
      
      // Check for common database errors
      if (error.message.includes("slug")) {
        detailedError = "مشكلة في حقل slug، يرجى الاتصال بالمسؤول.";
        console.error('مشكلة في حقل slug المحدد');
      } else if (error.message.includes("violates foreign key constraint")) {
        detailedError = "مشكلة في العلاقات بين الجداول، يرجى التحقق من المعرفات.";
        console.error('مشكلة في العلاقات الأجنبية بين الجداول');
      } else if (error.code === '20000') {
        detailedError = "حدث خطأ عند معالجة الطلب في قاعدة البيانات. يرجى التحقق من البيانات المدخلة وإعادة المحاولة.";
        console.error('خطأ عام في الوظيفة المخزنة');
      } else if (error.code === '42703') {
        detailedError = "مشكلة في تعريف الحقول. يرجى الاتصال بالمسؤول.";
        console.error('مشكلة في تعريف الحقول في قاعدة البيانات');
      } else if (error.code === '22P02') {
        detailedError = "خطأ في نوع البيانات المرسلة. يرجى التحقق من صحة البيانات المدخلة.";
        console.error('خطأ في نوع البيانات المرسلة');
      }
      
      throw new Error(detailedError);
    }
    
    if (!data) {
      console.error('تم استلام استجابة فارغة من الخادم');
      throw new Error('لم يتم استلام أي بيانات من الخادم. يرجى المحاولة مرة أخرى.');
    }

    // Log success for debugging
    console.log("Process order successful:", data);
    
    // إنشاء رقم طلب افتراضي إذا لم يكن موجودًا في الاستجابة
    if (!data.order_number) {
      console.warn("لم يتم تلقي رقم طلب من الخادم، سيتم استخدام قيمة افتراضية");
      data.order_number = Math.floor(Math.random() * 10000);
    }
    
    // Handle case where the stored procedure returned an error object
    if (data && data.status === 'error') {
      console.error('Function returned error:', data);
      throw new Error(`Error from database: ${data.error}`);
    }

    return data;
  } catch (error) {
    console.error('Error calling process_online_order_new:', error);
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
} 