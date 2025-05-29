import React, { lazy, Suspense, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider } from 'react-hook-form';
import { toast } from 'sonner';
import { Package, Eye, Loader2, ArrowLeft, Save, Truck } from 'lucide-react';

// Custom hooks
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';

// UI Components
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { ImageUploaderRef } from '@/components/ui/ImageUploader';

// Types
import { productSchema, ProductFormValues, ProductColor, WholesaleTier, ProductWithVariants } from '@/types/product';
import { Category, Subcategory } from '@/lib/api/categories';

// API
import { 
  getProductById, 
  createProduct, 
  updateProduct,
  getWholesaleTiers,
  InsertProduct
} from '@/lib/api/products';
import { 
  getCategories, 
  getSubcategories 
} from '@/lib/api/categories';
import { 
  getProductColors,
  getProductImages
} from '@/lib/api/productVariants';
import { checkUserPermissions, refreshUserData } from '@/lib/api/permissions';

// Layout
import Layout from '@/components/Layout';

// Lazy-loaded components
const BasicProductInfo = lazy(() => import('@/components/product/BasicProductInfo'));
const ProductCategories = lazy(() => import('@/components/product/ProductCategories'));
const ProductPricing = lazy(() => import('@/components/product/ProductPricing'));
const ProductInventory = lazy(() => import('@/components/product/ProductInventory'));
const ProductSellingType = lazy(() => import('@/components/product/ProductSellingType'));
const ProductImagesManager = lazy(() => import('@/components/product/ProductImagesManager'));
const ProductColorManager = lazy(() => import('@/components/product/ProductColorManager'));
const WholesaleTierManager = lazy(() => import('@/components/product/WholesaleTierManager'));
const ProductShippingAndTemplates = lazy(() => import('@/components/product/ProductShippingAndTemplates'));

// Helper component for Suspense fallback
const SectionLoader = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Form sections with memo for performance
interface BasicInfoSectionProps {
  form: any;
}

const BasicInfoSection = React.memo(({ form }: BasicInfoSectionProps) => (
  <Suspense fallback={<SectionLoader />}>
    <div className="space-y-6">
      <BasicProductInfo form={form} />
    </div>
  </Suspense>
));

interface CategoriesSectionProps {
  form: any;
  categories: Category[];
  subcategories: Subcategory[];
  onCategoryCreated: (category: Category) => void;
  onSubcategoryCreated: (subcategory: Subcategory) => void;
}

const CategoriesSection = React.memo(({ form, categories, subcategories, onCategoryCreated, onSubcategoryCreated }: CategoriesSectionProps) => (
  <Suspense fallback={<SectionLoader />}>
    <div className="space-y-6">
      <ProductCategories 
        form={form} 
        categories={categories} 
        subcategories={subcategories}
        onCategoryCreated={onCategoryCreated}
        onSubcategoryCreated={onSubcategoryCreated}
      />
    </div>
  </Suspense>
));

interface PricingSectionProps {
  form: any;
}

const PricingSection = React.memo(({ form }: PricingSectionProps) => (
  <Suspense fallback={<SectionLoader />}>
    <div className="space-y-6">
      <ProductPricing form={form} />
    </div>
  </Suspense>
));

interface InventorySectionProps {
  form: any;
  organizationId: string;
  hasVariants: boolean;
}

const InventorySection: React.FC<InventorySectionProps> = ({ form, organizationId, hasVariants }) => {
  return (
    <Suspense fallback={<SectionLoader />}>
      <div className="space-y-6">
        <ProductInventory 
          form={form} 
          organizationId={organizationId}
          hasVariants={hasVariants}
          productId={form.getValues('id') || ''} 
        />
      </div>
    </Suspense>
  );
};

interface ImagesSectionProps {
  mainImage: string;
  additionalImages: string[];
  onMainImageChange: (url: string) => void;
  onAdditionalImagesChange: (urls: string[]) => void;
  thumbnailImageRef: React.RefObject<ImageUploaderRef>;
}

const ImagesSection = React.memo(({ mainImage, additionalImages, onMainImageChange, onAdditionalImagesChange, thumbnailImageRef }: ImagesSectionProps) => (
  <Suspense fallback={<SectionLoader />}>
    <div className="space-y-6">
      <ProductImagesManager
        mainImage={mainImage}
        additionalImages={additionalImages}
        onMainImageChange={onMainImageChange}
        onAdditionalImagesChange={onAdditionalImagesChange}
        thumbnailImageRef={thumbnailImageRef}
      />
    </div>
  </Suspense>
));

interface SellingTypeSectionProps {
  form: any;
  onHasVariantsChange: (hasVariants: boolean) => void;
}

const SellingTypeSection = React.memo(({ form, onHasVariantsChange }: SellingTypeSectionProps) => (
  <Suspense fallback={<SectionLoader />}>
    <div className="space-y-6">
      <ProductSellingType 
        form={form} 
        onHasVariantsChange={onHasVariantsChange}
      />
    </div>
  </Suspense>
));

interface VariantsSectionProps {
  productColors: ProductColor[];
  onChange: (colors: ProductColor[]) => void;
  basePrice: number;
  basePurchasePrice: number;
  useVariantPrices: boolean;
  onUseVariantPricesChange: (useVariantPrices: boolean) => void;
  useSizes: boolean;
  onUseSizesChange: (useSizes: boolean) => void;
  productId: string;
}

const VariantsSection = React.memo(({ 
  productColors, 
  onChange, 
  basePrice, 
  basePurchasePrice, 
  useVariantPrices, 
  onUseVariantPricesChange, 
  useSizes, 
  onUseSizesChange, 
  productId 
}: VariantsSectionProps) => (
  <Suspense fallback={<SectionLoader />}>
    <div className="space-y-6">
      <ProductColorManager 
        colors={productColors}
        onChange={onChange}
        basePrice={basePrice}
        basePurchasePrice={basePurchasePrice}
        useVariantPrices={useVariantPrices}
        onUseVariantPricesChange={onUseVariantPricesChange}
        useSizes={useSizes}
        onUseSizesChange={onUseSizesChange}
        productId={productId}
      />
    </div>
  </Suspense>
));

interface WholesaleSectionProps {
  wholesaleTiers: WholesaleTier[];
  onChange: (tiers: WholesaleTier[]) => void;
  productId: string;
  organizationId: string;
}

const WholesaleSection = React.memo(({ wholesaleTiers, onChange, productId, organizationId }: WholesaleSectionProps) => (
  <Suspense fallback={<SectionLoader />}>
    <div className="space-y-6">
      <WholesaleTierManager
        productId={productId}
        organizationId={organizationId || ""}
        onChange={onChange}
      />
    </div>
  </Suspense>
));

interface ShippingAndTemplatesSectionProps {
  form: any;
  organizationId: string;
  productId?: string;
}

const ShippingAndTemplatesSection = React.memo(({ form, organizationId, productId }: ShippingAndTemplatesSectionProps) => (
  <Suspense fallback={<SectionLoader />}>
    <div className="space-y-6">
      <ProductShippingAndTemplates
        form={form}
        organizationId={organizationId}
        productId={productId}
      />
    </div>
  </Suspense>
));

export default function ProductForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentOrganization } = useTenant();
  const { user } = useAuth();
  const isEditMode = !!id;
  const organizationId = currentOrganization?.id || '';
  
  // State for product data
  const [product, setProduct] = useState<ProductFormValues | null>(null);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);
  const [productColors, setProductColors] = useState<ProductColor[]>([]);
  const [useVariantPrices, setUseVariantPrices] = useState(false);
  const [wholesaleTiers, setWholesaleTiers] = useState<WholesaleTier[]>([]);
  const [useSizes, setUseSizes] = useState(false);
  const [hasPermission, setHasPermission] = useState(true);
  const [hasVariantsState, setHasVariantsState] = useState(false);
  
  // Refs
  const thumbnailImageRef = useRef<ImageUploaderRef>(null);
  
  // Initialize form with react-hook-form and zod validation
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      name_for_shipping: '',
      description: '',
      price: 0,
      purchase_price: 0,
      allow_retail: true,
      allow_wholesale: false,
      allow_partial_wholesale: false,
      sku: '',
      category_id: '',
      stock_quantity: 0,
      thumbnail_image: '',
      has_variants: false,
      show_price_on_landing: true,
      is_featured: false,
      is_new: true,
      use_sizes: false,
      is_sold_by_unit: true,
      use_variant_prices: false,
      form_template_id: null,
      shipping_provider_id: null,
      use_shipping_clone: false,
      shipping_clone_id: null,
      is_digital: false,
      colors: [],
      wholesale_tiers: [],
      additional_images: [],
    },
  });
  
  // Watch form values
  const watchCategoryId = form.watch('category_id');
  const watchHasVariants = form.watch('has_variants', false);
  const watchPrice = form.watch('price');
  const watchPurchasePrice = form.watch('purchase_price');
  const watchThumbnailImage = form.watch('thumbnail_image');
  
  // Load product data if in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      const loadProductData = async () => {
        setIsLoading(true);
        try {
          // Assume getProductById returns a type compatible with ProductWithVariants
          const fetchedProduct = await getProductById(id) as ProductWithVariants;
          if (fetchedProduct) {
            setProduct(fetchedProduct); // Store the fetched product, which might have more fields than the form

            // Prepare defaultValues strictly according to ProductFormValues
            const defaultValues: Partial<ProductFormValues> = {
              id: fetchedProduct.id, // Make sure id is part of ProductFormValues if needed by form
              name: fetchedProduct.name || '',
              name_for_shipping: fetchedProduct.name_for_shipping || '',
              description: fetchedProduct.description || '',
              price: fetchedProduct.price || 0,
              purchase_price: fetchedProduct.purchase_price || 0,
              compare_at_price: fetchedProduct.compare_at_price === null ? undefined : fetchedProduct.compare_at_price,
              wholesale_price: fetchedProduct.wholesale_price === null ? undefined : fetchedProduct.wholesale_price,
              partial_wholesale_price: fetchedProduct.partial_wholesale_price === null ? undefined : fetchedProduct.partial_wholesale_price,
              min_wholesale_quantity: fetchedProduct.min_wholesale_quantity === null ? undefined : fetchedProduct.min_wholesale_quantity,
              min_partial_wholesale_quantity: fetchedProduct.min_partial_wholesale_quantity === null ? undefined : fetchedProduct.min_partial_wholesale_quantity,
              allow_retail: fetchedProduct.allow_retail !== false,
              allow_wholesale: fetchedProduct.allow_wholesale === true,
              allow_partial_wholesale: fetchedProduct.allow_partial_wholesale === true,
              sku: fetchedProduct.sku || '',
              barcode: fetchedProduct.barcode || '',
              category_id: fetchedProduct.category_id || '',
              subcategory_id: fetchedProduct.subcategory_id === null ? undefined : fetchedProduct.subcategory_id,
              brand: fetchedProduct.brand || '',
              stock_quantity: fetchedProduct.stock_quantity || 0,
              thumbnail_image: fetchedProduct.thumbnail_image || '',
              has_variants: fetchedProduct.has_variants === true,
              show_price_on_landing: fetchedProduct.show_price_on_landing !== false,
              is_featured: fetchedProduct.is_featured === true,
              is_new: fetchedProduct.is_new !== false,
              slug: fetchedProduct.slug || '',
              is_digital: fetchedProduct.is_digital === true,

              // Fields potentially in ProductWithVariants but part of ProductFormValues structure
              use_sizes: fetchedProduct.use_sizes === true,
              is_sold_by_unit: fetchedProduct.is_sold_by_unit !== false,
              unit_type: fetchedProduct.unit_type || '',
              use_variant_prices: fetchedProduct.use_variant_prices === true,
              unit_purchase_price: fetchedProduct.unit_purchase_price === null ? undefined : fetchedProduct.unit_purchase_price,
              unit_sale_price: fetchedProduct.unit_sale_price === null ? undefined : fetchedProduct.unit_sale_price,

              // New shipping and template fields
              form_template_id: fetchedProduct.form_template_id || null,
              shipping_provider_id: fetchedProduct.shipping_provider_id || null,
              use_shipping_clone: fetchedProduct.use_shipping_clone === true,
              shipping_clone_id: fetchedProduct.shipping_clone_id || null,
              
              // Array fields for the form, mapped from fetchedProduct
              additional_images: fetchedProduct.images || [], // Map from fetchedProduct.images
              colors: fetchedProduct.colors || [],
              wholesale_tiers: fetchedProduct.wholesale_tiers || [],
            };
            form.reset(defaultValues);

            // Update separate states for managers/complex UI elements
            setAdditionalImages(fetchedProduct.images || []); // This state is used by ProductImagesManager
            setProductColors(fetchedProduct.colors || []); // This state is used by ProductColorManager
            setWholesaleTiers(fetchedProduct.wholesale_tiers || []); // This state is used by WholesaleTierManager
            
            setUseVariantPrices(fetchedProduct.use_variant_prices || false);
            setUseSizes(fetchedProduct.use_sizes || false);
            setHasVariantsState(fetchedProduct.has_variants || false); // Sync hasVariantsState

          } else {
            toast.error('لم يتم العثور على المنتج.');
            navigate('/products');
          }
        } catch (error) {
          toast.error('حدث خطأ أثناء تحميل بيانات المنتج للتعديل.');
        } finally {
          setIsLoading(false);
        }
      };
      loadProductData();
    } else if (!isEditMode) {
      // For new products, form is reset by useForm's defaultValues.
      // Ensure any separate states are also reset.
      setAdditionalImages([]);
      setProductColors([]);
      setWholesaleTiers([]);
      setUseVariantPrices(false);
      setUseSizes(false);
      setHasVariantsState(false);
      form.reset(); // Explicitly call reset to ensure RHF defaultValues are applied if component re-renders
    }
  }, [id, isEditMode, navigate, form]);
  
  // Load categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesData = await getCategories(organizationId);
        // تصفية الفئات لإظهار فئات المنتجات فقط
        const productCategories = categoriesData.filter(cat => cat.type === 'product');
        setCategories(productCategories);
      } catch (error) {
        toast.error('حدث خطأ أثناء تحميل الفئات');
      }
    };
    
    fetchCategories();
  }, [organizationId]);
  
  // Load subcategories when category changes
  useEffect(() => {
    if (watchCategoryId) {
      const fetchSubcategories = async () => {
        try {
          const subcategoriesData = await getSubcategories(watchCategoryId);
          setSubcategories(subcategoriesData);
        } catch (error) {
          toast.error('حدث خطأ أثناء تحميل الفئات الفرعية');
        }
      };
      
      fetchSubcategories();
    } else {
      setSubcategories([]);
    }
  }, [watchCategoryId]);
  
  // Check user permissions
  useEffect(() => {
    if (!user) return;
    
    const checkPermission = async () => {
      try {
        // تحديث بيانات المستخدم من قاعدة البيانات
        const userData = await refreshUserData(user.id);
        
        // دمج البيانات المحدثة مع بيانات المستخدم
        const mergedUserData = {
          ...user,
          permissions: userData?.permissions || user.user_metadata?.permissions,
          is_org_admin: userData?.is_org_admin || user.user_metadata?.is_org_admin,
          is_super_admin: userData?.is_super_admin || user.user_metadata?.is_super_admin,
          role: userData?.role || user.user_metadata?.role,
        };
        
        // التحقق من صلاحية إضافة/تعديل المنتجات
        const permission = isEditMode ? 'editProducts' : 'addProducts';
        const hasRequiredPermission = await checkUserPermissions(mergedUserData, permission);
        
        setHasPermission(hasRequiredPermission);
        
        if (!hasRequiredPermission) {
          toast.error(`ليس لديك صلاحية ${isEditMode ? 'تعديل' : 'إضافة'} المنتجات`);
          navigate('/products');
        }
      } catch (error) {
        
        // Fallback permission check
        const permissions = user.user_metadata?.permissions || {};
        const isAdmin = 
          user.user_metadata?.role === 'admin' || 
          user.user_metadata?.role === 'owner' || 
          user.user_metadata?.is_org_admin === true ||
          user.user_metadata?.is_super_admin === true;
        
        const requiredPermission = isEditMode ? 'editProducts' : 'addProducts';
        const hasExplicitPermission = Boolean(permissions[requiredPermission]);
        
        const fallbackPermission = isAdmin || hasExplicitPermission;
        setHasPermission(fallbackPermission);
        
        if (!fallbackPermission) {
          toast.error(`ليس لديك صلاحية ${isEditMode ? 'تعديل' : 'إضافة'} المنتجات`);
          navigate('/products');
        }
      }
    };
    
    checkPermission();
  }, [user, isEditMode, navigate]);
  
  // Handle form submission
  const onSubmit = async (data: ProductFormValues) => {
    if (!organizationId) {
      toast.error('معرف المؤسسة غير متوفر');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // ضمان أن الحقول الأساسية المطلوبة في InsertProduct موجودة وصحيحة
      // Zod يضمن أن data يحتوي على هذه القيم إذا تم التحقق بنجاح
      const submissionData: InsertProduct = {
        name: data.name, // مطلوب
        description: data.description, // مطلوب
        price: data.price, // مطلوب
        purchase_price: data.purchase_price, // مطلوب
        sku: data.sku, // مطلوب
        category_id: data.category_id, // مطلوب
        stock_quantity: data.stock_quantity, // مطلوب
        thumbnail_image: data.thumbnail_image, // مطلوب
        
        // بقية الخصائص من data (بما في ذلك الاختيارية والمشتقة)
        ...data, 
        
        // الخصائص التي يجب تجاوزها أو إضافتها
        organization_id: organizationId,
        images: additionalImages, // استخدم additionalImages من الـ state
        
        // القيم الافتراضية أو المعالجة الخاصة للحقول
        is_digital: data.is_digital || false,
        is_featured: data.is_featured || false,
        is_new: data.is_new || false,
        has_variants: data.has_variants || false,
        show_price_on_landing: data.show_price_on_landing || false,
        allow_retail: data.allow_retail !== undefined ? data.allow_retail : true, // القيمة الافتراضية true
        allow_wholesale: data.allow_wholesale || false,
        allow_partial_wholesale: data.allow_partial_wholesale || false,
        use_sizes: data.use_sizes || false,
        use_shipping_clone: data.use_shipping_clone || false,
        
        compare_at_price: data.compare_at_price || null,
        wholesale_price: data.wholesale_price || null,
        partial_wholesale_price: data.partial_wholesale_price || null,
        min_wholesale_quantity: data.min_wholesale_quantity || null,
        min_partial_wholesale_quantity: data.min_partial_wholesale_quantity || null,
        
        subcategory_id: data.subcategory_id || null,
        brand: data.brand || null,
        barcode: data.barcode || null,
        name_for_shipping: data.name_for_shipping || null,
        
        unit_type: data.unit_type || null,
        unit_purchase_price: data.unit_purchase_price || null,
        unit_sale_price: data.unit_sale_price || null,
        
        form_template_id: data.form_template_id || null,
        shipping_provider_id: data.shipping_provider_id || null,
        shipping_clone_id: data.shipping_clone_id || null,
        
        features: data.features || [], 
        specifications: data.specifications || {},
        slug: data.slug || `${data.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
        
        // تأكد من عدم وجود خصائص غير متوقعة هنا
        // إذا كانت InsertProduct لا تحتوي على created_by_user_id و updated_by_user_id، قم بإزالتها
        // created_by_user_id: data.created_by_user_id, // تحقق من تعريف InsertProduct
        // updated_by_user_id: data.updated_by_user_id, // تحقق من تعريف InsertProduct
      };

      // إزالة الخصائص التي قد تكون موجودة في data ولكن ليست جزءًا من InsertProduct
      // على سبيل المثال، productSchema قد يحتوي على id, colors, wholesale_tiers, additional_images
      // وهذه ليست بالضرورة جزءًا مباشرًا من InsertProduct (مثل images بدلاً من additional_images)
      delete (submissionData as any).id;
      delete (submissionData as any).colors; 
      delete (submissionData as any).wholesale_tiers;
      delete (submissionData as any).additional_images; // نستخدم images بدلاً منها
      // أي حقول أخرى من ProductFormValues غير موجودة في InsertProduct يجب حذفها
      delete (submissionData as any).is_sold_by_unit; // إذا لم تكن موجودة في InsertProduct
      delete (submissionData as any).use_variant_prices; // إذا لم تكن موجودة في InsertProduct

      let result;
      if (isEditMode && id) {
        result = await updateProduct(id, submissionData as any); 
      } else {
        //  بالنسبة لـ createProduct، تأكد من أن InsertProduct لا تتوقع `id`
        result = await createProduct(submissionData);
      }

      if (result) {
        toast.success(isEditMode ? 'تم تحديث المنتج بنجاح' : 'تم إنشاء المنتج بنجاح');
        if (!isEditMode) {
          navigate('/dashboard/products');
        }
      } else {
        toast.error(isEditMode ? 'فشل تحديث المنتج' : 'فشل إنشاء المنتج');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء حفظ المنتج');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Callback handlers
  const handleMainImageChange = useCallback((url: string) => {
    form.setValue('thumbnail_image', url);
  }, [form]);
  
  const handleAdditionalImagesChange = useCallback((urls: string[]) => {
    setAdditionalImages(urls);
  }, []);
  
  const handleProductColorsChange = useCallback((colors: ProductColor[]) => {
    setProductColors(colors);
  }, []);
  
  const handleHasVariantsChange = useCallback((hasVariants: boolean) => {
    form.setValue('has_variants', hasVariants);
    if (!hasVariants) {
      // إذا تم إلغاء المتغيرات، قم بإعادة تعيين الألوان
      setProductColors([]);
      form.setValue('use_variant_prices', false);
      setUseVariantPrices(false);
    }
  }, [form]);
  
  const handleUseVariantPricesChange = useCallback((useVariantPrices: boolean) => {
    form.setValue('use_variant_prices', useVariantPrices);
    setUseVariantPrices(useVariantPrices);
  }, [form]);
  
  const handleUseSizesChange = useCallback((useSizes: boolean) => {
    form.setValue('use_sizes', useSizes);
    setUseSizes(useSizes);
  }, [form]);
  
  const handleWholesaleTiersChange = useCallback((tiers: WholesaleTier[]) => {
    setWholesaleTiers(tiers);
  }, []);
  
  const handleCategoryCreated = useCallback((category: Category) => {
    setCategories(prev => [...prev, category]);
  }, []);
  
  const handleSubcategoryCreated = useCallback((subcategory: Subcategory) => {
    setSubcategories(prev => [...prev, subcategory]);
  }, []);
  
  // If loading, show spinner
  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-8">
        {/* Breadcrumb and page header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/dashboard">الرئيسية</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="/products">المنتجات</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink>
                    {isEditMode ? 'تعديل منتج' : 'إضافة منتج جديد'}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-3xl font-bold mt-2">
              {isEditMode ? `تعديل: ${product?.name}` : 'إضافة منتج جديد'}
            </h1>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard/products')}
            >
              <ArrowLeft className="ml-2 h-4 w-4" />
              العودة
            </Button>
            
            <Button
              type="button"
              variant="default"
              disabled={isSubmitting}
              onClick={form.handleSubmit(onSubmit)}
            >
              {isSubmitting ? (
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="ml-2 h-4 w-4" />
              )}
              {isEditMode ? 'حفظ التغييرات' : 'إنشاء المنتج'}
            </Button>
          </div>
        </div>
        
        {/* Main content */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left sidebar - Quick info panel */}
          <div className="md:col-span-3 space-y-6">
            <Card className="p-4">
              <h2 className="text-lg font-medium mb-3">معلومات سريعة</h2>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm text-muted-foreground">اسم المنتج</dt>
                  <dd className="font-medium">{form.watch('name') || 'غير محدد'}</dd>
                </div>
                <Separator className="my-2" />
                <div>
                  <dt className="text-sm text-muted-foreground">السعر</dt>
                  <dd className="font-medium">{form.watch('price') || 0} دج</dd>
                </div>
                <Separator className="my-2" />
                <div>
                  <dt className="text-sm text-muted-foreground">الكمية المتوفرة</dt>
                  <dd className="font-medium">{form.watch('stock_quantity') || 0} وحدة</dd>
                </div>
                <Separator className="my-2" />
                <div>
                  <dt className="text-sm text-muted-foreground">رمز المنتج (SKU)</dt>
                  <dd className="font-medium">{form.watch('sku') || 'غير محدد'}</dd>
                </div>
              </dl>
            </Card>
            
            {watchThumbnailImage && (
              <Card className="p-4">
                <h2 className="text-lg font-medium mb-3">معاينة المنتج</h2>
                <div className="aspect-square relative rounded-md overflow-hidden bg-gray-100">
                  <img 
                    src={watchThumbnailImage} 
                    alt="معاينة المنتج" 
                    className="object-cover w-full h-full"
                  />
                </div>
              </Card>
            )}
            
            {isEditMode && (
              <Card className="p-4">
                <h2 className="text-lg font-medium mb-3">خيارات أخرى</h2>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => window.open(`/product/${id}`, '_blank')}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    عرض المنتج في المتجر
                  </Button>
                </div>
              </Card>
            )}
          </div>
          
          {/* Main form area */}
          <div className="md:col-span-9">
            <Card className="p-6 border-2 shadow-sm hover:shadow-md transition-shadow">
              <FormProvider {...form}>
                <form>
                  <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                      <TabsTrigger value="basic">
                        <Package className="w-4 h-4 md:mr-2" />
                        <span className="hidden md:inline">المعلومات الأساسية</span>
                      </TabsTrigger>
                      <TabsTrigger value="categories">
                        <Package className="w-4 h-4 md:mr-2" />
                        <span className="hidden md:inline">التصنيفات</span>
                      </TabsTrigger>
                      <TabsTrigger value="images">
                        <Eye className="w-4 h-4 md:mr-2" />
                        <span className="hidden md:inline">الصور</span>
                      </TabsTrigger>
                      <TabsTrigger value="selling_type">
                        <Package className="w-4 h-4 md:mr-2" />
                        <span className="hidden md:inline">نوع البيع</span>
                      </TabsTrigger>
                      {watchHasVariants && (
                        <TabsTrigger value="variants">
                          <Package className="w-4 h-4 md:mr-2" />
                          <span className="hidden md:inline">النماذج</span>
                        </TabsTrigger>
                      )}
                      <TabsTrigger value="pricing">
                        <Package className="w-4 h-4 md:mr-2" />
                        <span className="hidden md:inline">الأسعار</span>
                      </TabsTrigger>
                      <TabsTrigger value="inventory">
                        <Package className="w-4 h-4 md:mr-2" />
                        <span className="hidden md:inline">المخزون</span>
                      </TabsTrigger>
                      <TabsTrigger value="wholesale">
                        <Package className="w-4 h-4 md:mr-2" />
                        <span className="hidden md:inline">أسعار الجملة</span>
                      </TabsTrigger>
                      <TabsTrigger value="shipping_templates">
                        <Truck className="w-4 h-4 md:mr-2" />
                        <span className="hidden md:inline">التوصيل والنماذج</span>
                      </TabsTrigger>
                    </TabsList>
                    
                    <div className="p-4 bg-background border rounded-lg">
                      <TabsContent value="basic" className="space-y-4 focus:outline-none mt-4">
                        <BasicInfoSection form={form} />
                      </TabsContent>
                      
                      <TabsContent value="images" className="space-y-4 focus:outline-none mt-4">
                        <ImagesSection 
                          mainImage={watchThumbnailImage}
                          additionalImages={additionalImages}
                          onMainImageChange={handleMainImageChange}
                          onAdditionalImagesChange={handleAdditionalImagesChange}
                          thumbnailImageRef={thumbnailImageRef}
                        />
                      </TabsContent>
                      
                      <TabsContent value="pricing" className="space-y-4 focus:outline-none mt-4">
                        <PricingSection form={form} />
                      </TabsContent>
                      
                      <TabsContent value="inventory" className="space-y-4 focus:outline-none mt-4">
                        <InventorySection 
                          form={form} 
                          organizationId={organizationId}
                          hasVariants={watchHasVariants}
                        />
                      </TabsContent>
                      
                      <TabsContent value="categories" className="space-y-4 focus:outline-none mt-4">
                        <CategoriesSection 
                          form={form} 
                          categories={categories}
                          subcategories={subcategories}
                          onCategoryCreated={handleCategoryCreated}
                          onSubcategoryCreated={handleSubcategoryCreated}
                        />
                      </TabsContent>
                      
                      <TabsContent value="selling_type" className="space-y-4 focus:outline-none mt-4">
                        <SellingTypeSection 
                          form={form}
                          onHasVariantsChange={handleHasVariantsChange}
                        />
                      </TabsContent>
                      
                      {watchHasVariants && (
                        <TabsContent value="variants" className="space-y-4 focus:outline-none mt-4">
                          <VariantsSection 
                            productColors={productColors}
                            onChange={handleProductColorsChange}
                            basePrice={watchPrice}
                            basePurchasePrice={watchPurchasePrice}
                            useVariantPrices={useVariantPrices}
                            onUseVariantPricesChange={handleUseVariantPricesChange}
                            useSizes={useSizes}
                            onUseSizesChange={handleUseSizesChange}
                            productId={id || ''}
                          />
                        </TabsContent>
                      )}
                      
                      <TabsContent value="wholesale" className="space-y-4 focus:outline-none mt-4">
                        <WholesaleSection 
                          wholesaleTiers={wholesaleTiers}
                          onChange={handleWholesaleTiersChange}
                          productId={id || ''}
                          organizationId={organizationId}
                        />
                      </TabsContent>
                      
                      <TabsContent value="shipping_templates" className="space-y-4 focus:outline-none mt-4">
                        <ShippingAndTemplatesSection
                          form={form}
                          organizationId={organizationId}
                          productId={id}
                        />
                      </TabsContent>
                    </div>
                  </Tabs>
                  
                  <div className="mt-6 flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate('/dashboard/products')}
                      className="ml-3"
                    >
                      <ArrowLeft className="ml-2 h-4 w-4" />
                      إلغاء
                    </Button>
                    
                    <Button
                      type="button"
                      variant="default"
                      disabled={isSubmitting}
                      onClick={form.handleSubmit(onSubmit)}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {isSubmitting ? (
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="ml-2 h-4 w-4" />
                      )}
                      {isEditMode ? 'حفظ التغييرات' : 'إنشاء المنتج'}
                    </Button>
                  </div>
                </form>
              </FormProvider>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
