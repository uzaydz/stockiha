import { supabase } from '@/lib/supabase-client';
import { withCache, LONG_CACHE_TTL, SHORT_CACHE_TTL } from '@/lib/cache/storeCache';
import { getSupabaseClient } from '@/lib/supabase-client';
import UnifiedRequestManager from '@/lib/unifiedRequestManager';

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
  imageUrl?: string;
  thumbnail_image?: string;
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
    const supabaseClient = getSupabaseClient();
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
    
    // Explicitly cast theme_mode to the expected type
    return {
      ...settings,
      theme_mode: settings.theme_mode as ('light' | 'dark') 
    };
  } catch (error) {
    return null;
  }
}

// جلب المنتجات المميزة
export async function getFeaturedProducts(organizationId: string): Promise<Product[]> {
  try {
    if (!organizationId) {
      return [];
    }
    
    // استعلام بسيط جداً للتأكد من عمله - إضافة شرط is_active = true
    const supabaseClient = getSupabaseClient();
    const { data: productsRaw, error } = await supabaseClient
      .from('products')
      .select('id, name, description, price, compare_at_price, thumbnail_image, images, stock_quantity, created_at, is_featured, is_active, slug, is_new')
      .eq('organization_id', organizationId)
      .eq('is_active', true) // إضافة شرط للتأكد من أن المنتج مفعل
      .limit(20);
    
    if (error) {
      return [];
    }
    
    if (!productsRaw || productsRaw.length === 0) {
      
      // لأغراض التصحيح - محاولة استعلام مباشر دون تحديد معرف المؤسسة
      const { data: allProducts, error: allError } = await supabaseClient
        .from('products')
        .select('id, organization_id, is_active, thumbnail_image, thumbnail_url')
        .limit(5);
      
      if (allProducts && allProducts.length > 0) {
      }
      
      if (allError) {
      }
      
      return [];
    }
    
    // تحويل البيانات الأولية إلى منتجات
    const products = productsRaw.map(product => {
      // معالجة روابط الصور المصغرة للتأكد من صحتها
      let thumbnailImage = '';
      
      // استخدم thumbnail_image
      if (product.thumbnail_image) {
        thumbnailImage = product.thumbnail_image.trim();
      }
      
      // إضافة بروتوكول إذا كان مفقودًا
      if (thumbnailImage && !thumbnailImage.startsWith('http://') && !thumbnailImage.startsWith('https://')) {
        if (thumbnailImage.startsWith('//')) {
          thumbnailImage = `https:${thumbnailImage}`;
        } else if (thumbnailImage.startsWith('/')) {
          // روابط نسبية للخادم
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
          if (supabaseUrl) {
            thumbnailImage = `${supabaseUrl}${thumbnailImage}`;
          }
        } else if (thumbnailImage.startsWith('www.')) {
          thumbnailImage = `https://${thumbnailImage}`;
        } else if (thumbnailImage) {
          // روابط أخرى بدون بروتوكول
          thumbnailImage = `https://${thumbnailImage}`;
        }
      }
      
      // تنظيف المسافات داخل الرابط
      if (thumbnailImage) {
        thumbnailImage = thumbnailImage.replace(/\s+/g, '%20');
        
        // التحقق من صحة بنية الرابط
        try {
          new URL(thumbnailImage);
        } catch (e) {
          // استخدام صورة افتراضية في حالة الرابط غير الصالح
          thumbnailImage = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1470';
        }
      } else {
        // استخدام صورة افتراضية في حالة عدم وجود صورة مصغرة
        thumbnailImage = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1470';
      }
      
      // معالجة مصفوفة الصور الإضافية
      let additionalImages: string[] = [];
      
      if (product.images && Array.isArray(product.images)) {
        additionalImages = product.images
          .filter(imgUrl => imgUrl && typeof imgUrl === 'string')
          .map(imgUrl => {
            let processedUrl = imgUrl.trim();
            
            // نفس معالجة البروتوكول
            if (!processedUrl.startsWith('http://') && !processedUrl.startsWith('https://')) {
              if (processedUrl.startsWith('//')) {
                processedUrl = `https:${processedUrl}`;
              } else if (processedUrl.startsWith('/')) {
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
                if (supabaseUrl) {
                  processedUrl = `${supabaseUrl}${processedUrl}`;
                }
              } else {
                processedUrl = `https://${processedUrl}`;
              }
            }
            
            // تنظيف المسافات
            processedUrl = processedUrl.replace(/\s+/g, '%20');
            
            return processedUrl;
          });
      }
      
      // إذا لم تكن هناك صور إضافية، أضف الصورة المصغرة كصورة إضافية
      if (additionalImages.length === 0 && thumbnailImage) {
        additionalImages = [thumbnailImage];
      }
      
      return {
        id: product.id,
        name: product.name,
        description: product.description || '',
        price: parseFloat(product.price?.toString() || '0'), // Convert to string before parseFloat
        discount_price: product.compare_at_price ? parseFloat(product.compare_at_price.toString()) : undefined, // Convert to string
        imageUrl: thumbnailImage,
        category: 'عام', // قيمة افتراضية
        is_new: !!product.is_new,
        is_featured: !!product.is_featured,
        stock_quantity: product.stock_quantity || 0,
        slug: product.slug || product.id,
        rating: 4.5, // قيمة افتراضية للتقييم
        colors: [],
        additional_images: additionalImages
      };
    });
    
    return products;
  } catch (error) {
    return [];
  }
}

// جلب جميع المنتجات
export async function getAllProducts(organizationId: string): Promise<Product[]> {
  try {
    if (!organizationId) {
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
          
          // خطة بديلة في حالة فشل الاستعلام المخصص
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
            price: parseFloat(product.price?.toString() || '0'), // Convert to string before parseFloat
            discount_price: product.compare_at_price ? parseFloat(product.compare_at_price.toString()) : undefined, // Convert to string
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
        
        // Check if data is an array before accessing length
        if (!data || !Array.isArray(data) || data.length === 0) {
          return [];
        }
        
        // تحويل البيانات إلى الشكل المطلوب - Check if data is an array before mapping
        return Array.isArray(data) ? data.map((product: any) => ({
          id: product.id,
          name: product.name,
          description: product.description || '',
          price: parseFloat(product.price?.toString() || '0'), // Convert to string before parseFloat
          discount_price: product.compare_at_price ? parseFloat(product.compare_at_price.toString()) : undefined, // Convert to string
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
        })) : [];
      },
      SHORT_CACHE_TTL, // استخدام تخزين مؤقت قصير المدى للمنتجات لأنها قد تتغير
      true // استخدام التخزين المؤقت في الذاكرة
    );
  } catch (error) {
    return [];
  }
}

// جلب فئات المنتجات - محسن مع UnifiedRequestManager
export async function getProductCategories(organizationId: string): Promise<Category[]> {
  try {
    if (!organizationId) {
      return [];
    }
    
    // استخدام UnifiedRequestManager للحد من الطلبات المكررة
    const categoriesData = await UnifiedRequestManager.getProductCategories(organizationId);
    
    if (!categoriesData || categoriesData.length === 0) {
      return [];
    }
    
    const categories = categoriesData.map(category => ({
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
      if (import.meta.env.DEV) {
      }
    }
    
    return categories;
  } catch (error) {
    if (import.meta.env.DEV) {
    }
    return [];
  }
}

// جلب الخدمات
export async function getServices(organizationId: string): Promise<Service[]> {
  try {
    
    // استعلام مبسط لجدول الخدمات
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('organization_id', organizationId);
    
    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      
      // إرجاع مصفوفة فارغة بدلاً من الخدمة الافتراضية
      return [];
    }
    
    // تحويل البيانات إلى الشكل المطلوب
    const services = data.map((service, index) => ({
      id: service.id,
      name: service.name,
      description: service.description || '',
      price: parseFloat(service.price?.toString() || '0'), // Convert to string before parseFloat
      image: service.image || '',
      estimated_time: service.estimated_time || '',
      is_price_dynamic: service.is_price_dynamic || false,
      category: service.category || '',
      slug: service.slug || service.id,
      badge: index === 0 ? 'الأكثر طلباً' : (index === 1 ? 'جديد' : undefined),
      badgeColor: index === 0 ? 'success' : (index === 1 ? 'default' : 'default') as 'default' | 'success' | 'warning',
      // Check if features property exists before accessing it
      features: ('features' in service && Array.isArray(service.features)) ? service.features : [] 
    }));
    
    return services;
  } catch (error) {
    // إرجاع مصفوفة فارغة في حالة حدوث خطأ
    return [];
  }
}

// جلب كل بيانات المتجر مرة واحدة
export async function getFullStoreData(subdomain: string): Promise<StoreData | null> {
  try {
    
    const startTime = Date.now();
    
    const supabaseClient = getSupabaseClient();
    
    // 1. الحصول على معرف المؤسسة من اسم النطاق الفرعي
    const { data: organization, error: orgError } = await supabaseClient
      .from('organizations')
      .select('id, name, logo_url, description')
      .eq('subdomain', subdomain)
      .single();
    
    if (orgError || !organization) {
      return null;
    }

    const organizationId = organization.id;
    
    // التحقق مما إذا كان المستخدم مسجل دخول
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const isLoggedIn = !!sessionData.session?.user;

    // 2. جلب إعدادات المؤسسة (التلوين والمظهر)
    let settings;
    
    if (isLoggedIn) {
      const { data: orgSettings, error: settingsError } = await supabaseClient
        .from('organization_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .single();
      
      if (settingsError) {
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
      
      const { data: componentsData, error: componentsError } = await supabaseClient
        .rpc('get_store_settings', {
          p_organization_id: organizationId,
          p_public_access: true
        });
      
      if (componentsError) {
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

    // 4. جلب الفئات 
    let categories: Category[] = [];
    
    try {

      // استخدام استعلام مباشر بدلاً من وظيفة getProductCategories لتحديد أين المشكلة
      const { data: categoriesData, error: categoriesError } = await supabaseClient
        .from('product_categories')
        .select('*')
        .eq('organization_id', organizationId);
        
      if (categoriesError) {
      } else if (categoriesData && categoriesData.length > 0) {
        
        // تحويل البيانات إلى الشكل المطلوب
        categories = categoriesData.map(category => ({
          id: category.id,
          name: category.name,
          description: category.description || '',
          icon: category.icon,
          slug: category.slug,
          product_count: 0  // سيتم تحديثه لاحقًا
        }));
      }
      
      // استخدام getProductCategories كخطة بديلة
      if (categories.length === 0) {
        
        const productCategories = await getProductCategories(organizationId);
        if (productCategories && productCategories.length > 0) {
          
          categories = productCategories;
        }
      }
    } catch (catError) {
      // محاولة أخيرة
      try {
        categories = await getProductCategories(organizationId);
      } catch (e) {
      }
    }
    
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

    return storeData;
  } catch (err) {
    return null;
  }
}

// جلب منتج محدد بواسطة الـslug
export async function getProductBySlug(organizationId: string, slug: string): Promise<Product | null> {
  try {

    // تحقق مما إذا كان الـ slug يمثل UUID (يحتوي على شرطات)
    const isUuid = slug.includes('-');
    
    // استراتيجية البحث: جرب البحث بعة طرق حتى تجد المنتج
    let data = null;
    
    // البحث 1: محاولة البحث بواسطة slug (الطريقة الافتراضية)
    let slugSearchSuccess = false;
    try {
      const supabaseClient = getSupabaseClient();
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
        
      }
    } catch (slugSearchError) {
    }
    
    // البحث 2: إذا فشل البحث الأول وكان الـ slug يبدو كـ UUID، جرب البحث باستخدام id
    if (!slugSearchSuccess && isUuid) {
      try {
        const supabaseClient = getSupabaseClient();
        const { data: idData, error: idError } = await supabaseClient
          .from('products')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('id', slug)
          .eq('is_active', true)
          .single();
        
        if (!idError && idData) {
          data = idData;
          
        }
      } catch (idSearchError) {
      }
    }
    
    // البحث 3: استخدام طلب HTTP مباشر كحل أخير
    if (!data && isUuid) {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        if (supabaseUrl && supabaseAnonKey) {

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
              
            }
          } else {
          }
        }
      } catch (fetchError) {
      }
    }
    
    // إذا لم يتم العثور على المنتج بعد كل المحاولات
    if (!data) {
      return null;
    }
    
    // جلب بيانات الألوان المتاحة للمنتج
    const supabaseClient = getSupabaseClient();
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
    return null;
  }
}

// الحصول على اسم المنتج فقط حسب المعرف
export async function getProductNameById(productId: string): Promise<string> {
  try {
    if (!productId) {
      return '';
    }
    
    const supabaseClient = getSupabaseClient();
    const { data, error } = await supabaseClient
      .from('products')
      .select('name')
      .eq('id', productId)
      .single();
    
    if (error) {
      return '';
    }
    
    return data?.name || '';
  } catch (error) {
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
    deliveryOption: "home" | "office" | "desk";
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
    metadata?: Record<string, any> | null; // إضافة بيانات التعريف هنا
    stop_desk_id?: string | null; // إضافة معرف مكتب الاستلام
  }
) {

  // التحقق من وجود معرف المؤسسة
  if (!organizationId) {
    return { error: "معرف المؤسسة مفقود" };
  }
  
  const { 
    fullName,
    phone,
    province,
    municipality,
    address,
    city,
    deliveryCompany,
    deliveryOption,
    paymentMethod,
    notes,
    productId,
    productColorId,
    productSizeId,
    sizeName,
    quantity,
    unitPrice,
    totalPrice,
    deliveryFee,
    formData,
    metadata,
    stop_desk_id
  } = orderData;

  try {
    const supabaseClient = getSupabaseClient();
    
    // 🚨 CONSOLE LOG: بيانات الطلبية قبل الإرسال لقاعدة البيانات
    console.log('🏪 processOrder - بيانات الطلبية المرسلة لقاعدة البيانات:', {
      organizationId,
      productId,
      productColorId,
      productSizeId,
      quantity,
      unitPrice,
      totalPrice,
      deliveryFee,
      fullOrderData: orderData,
      timestamp: new Date().toISOString()
    });
    
    // استخدام دالة process_online_order_new المحدثة مع جميع المعاملات
    const params = {
      p_full_name: fullName,
      p_phone: phone,
      p_province: province,
      p_municipality: municipality,
      p_address: address,
      p_city: city || '',
      p_delivery_company: deliveryCompany,
      p_delivery_option: deliveryOption,
      p_payment_method: paymentMethod,
      p_notes: notes || '',
      p_product_id: productId,
      p_product_color_id: productColorId || null,
      p_product_size_id: productSizeId || null,
      p_size_name: sizeName || '',
      p_quantity: quantity,
      p_unit_price: unitPrice,
      p_total_price: totalPrice,
      p_delivery_fee: deliveryFee,
      p_organization_id: organizationId,
      p_form_data: formData || null,
      p_metadata: metadata || null,
      p_stop_desk_id: stop_desk_id || null
    };

    // 🚨 CONSOLE LOG: معاملات الدالة المرسلة لـ Supabase
    console.log('📡 processOrder - معاملات process_online_order_new:', {
      params,
      timestamp: new Date().toISOString()
    });

    // استخدام "as any" لتجاوز تدقيق النوع في TypeScript
    const { data, error } = await supabaseClient.rpc('process_online_order_new', params as any);

      // 🚨 CONSOLE LOG: نتيجة استدعاء قاعدة البيانات
  console.log('📊 processOrder - نتيجة process_online_order_new:', {
    data,
    error,
    success: !error,
    timestamp: new Date().toISOString()
  });

  // 🚨 CONSOLE LOG: فحص كمية المخزون بعد الطلبية
  if (!error && data) {
    try {
      const supabaseClient = getSupabaseClient();
      
      // فحص كمية المنتج الرئيسي
      const { data: productAfter } = await supabaseClient
        .from('products')
        .select('stock_quantity')
        .eq('id', productId)
        .single();
      
      console.log('📦 كمية المنتج الرئيسي بعد الطلبية:', productAfter?.stock_quantity);
      
      // فحص كمية اللون إذا كان موجود
      if (productColorId) {
        const { data: colorAfter } = await supabaseClient
          .from('product_colors')
          .select('quantity, name')
          .eq('id', productColorId)
          .single();
        
              console.log('🎨 كمية اللون بعد الطلبية:', {
        colorName: colorAfter?.name,
        quantity: colorAfter?.quantity,
        colorId: productColorId
      });
      
      // 🧪 CONSOLE LOG: اختبار خصم المخزون مباشرة باستخدام UPDATE
      try {
        console.log('🧪 محاولة خصم المخزون مباشرة...');
        
        const { data: updateResult, error: updateError } = await supabaseClient
          .from('product_colors')
          .update({ quantity: colorAfter?.quantity - 1 })
          .eq('id', productColorId)
          .select('quantity, name');
        
        if (updateError) {
          console.error('❌ خطأ في تحديث المخزون:', updateError);
        } else {
          console.log('✅ نجح تحديث المخزون مباشرة:', updateResult);
          
          // إعادة الكمية كما كانت
          await supabaseClient
            .from('product_colors')
            .update({ quantity: colorAfter?.quantity })
            .eq('id', productColorId);
          
          console.log('🔄 تم إعادة الكمية كما كانت');
        }
      } catch (testError) {
        console.error('❌ خطأ في اختبار خصم المخزون:', testError);
      }
      }
      
      // فحص كمية المقاس إذا كان موجود
      if (productSizeId) {
        const { data: sizeAfter } = await supabaseClient
          .from('product_sizes')
          .select('quantity')
          .eq('id', productSizeId)
          .single();
        
        console.log('📏 كمية المقاس بعد الطلبية:', {
          quantity: sizeAfter?.quantity,
          sizeId: productSizeId
        });
      }
    } catch (checkError) {
      console.error('❌ خطأ في فحص المخزون بعد الطلبية:', checkError);
    }
  }

    if (error) {
      // 🚨 CONSOLE LOG: خطأ في قاعدة البيانات
      console.error('❌ processOrder - خطأ في process_online_order_new:', {
        error,
        errorCode: error.code,
        errorMessage: error.message,
        params,
        timestamp: new Date().toISOString()
      });
      
      // إضافة تشخيص مفصل للخطأ
      
      // Try to determine the specific error from the error message
      let detailedError = error.message;
      
      // Check for common database errors
      if (error.message.includes("slug")) {
        detailedError = "مشكلة في حقل slug، يرجى الاتصال بالمسؤول.";
      } else if (error.message.includes("violates foreign key constraint")) {
        detailedError = "مشكلة في العلاقات بين الجداول، يرجى التحقق من المعرفات.";
      } else if (error.code === '20000') {
        detailedError = "حدث خطأ عند معالجة الطلب في قاعدة البيانات. يرجى التحقق من البيانات المدخلة وإعادة المحاولة.";
      } else if (error.code === '42703') {
        detailedError = "مشكلة في تعريف الحقول. يرجى الاتصال بالمسؤول.";
      } else if (error.code === '22P02') {
        detailedError = "خطأ في نوع البيانات المرسلة. يرجى التحقق من صحة البيانات المدخلة.";
      }
      
      throw new Error(detailedError);
    }
    
    // Cast data to 'any' before accessing properties not known by the generic Json type
    const responseData = data as any;

    if (!responseData) {
      throw new Error('لم يتم استلام أي بيانات من الخادم. يرجى المحاولة مرة أخرى.');
    }

    // Log success for debugging

    // إنشاء رقم طلب افتراضي إذا لم يكن موجودًا في الاستجابة
    if (!responseData.order_number) {
      responseData.order_number = Math.floor(Math.random() * 10000);
    }
    
    // Handle case where the stored procedure returned an error object
    if (responseData && responseData.status === 'error') {
      throw new Error(`Error from database: ${responseData.error}`);
    }

    return responseData; // Return the casted data
  } catch (error) {
    if (error instanceof Error) {
    }
    throw error;
  }
}
