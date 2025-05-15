import React, { lazy, Suspense, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider } from 'react-hook-form';
import { toast } from 'sonner';
import { Package, Eye, Loader2, ArrowLeft, Save } from 'lucide-react';

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
import { productSchema, ProductFormValues, ProductColor, WholesaleTier } from '@/types/product';
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
const ProductSKUBarcode = lazy(() => import('@/components/product/ProductSKUBarcode'));
const ProductSellingType = lazy(() => import('@/components/product/ProductSellingType'));
const ProductImagesManager = lazy(() => import('@/components/product/ProductImagesManager'));
const ProductColorManager = lazy(() => import('@/components/product/ProductColorManager'));
const WholesaleTierManager = lazy(() => import('@/components/product/WholesaleTierManager'));

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

const InventorySection = React.memo(({ form, organizationId, hasVariants }: InventorySectionProps) => (
  <Suspense fallback={<SectionLoader />}>
    <div className="space-y-6">
      <ProductSKUBarcode 
        form={form} 
        productId="" 
        organizationId={organizationId}
      />
      <ProductInventory 
        form={form} 
        organizationId={organizationId}
        hasVariants={hasVariants}
      />
    </div>
  </Suspense>
));

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

export default function ProductForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentOrganization } = useTenant();
  const { user } = useAuth();
  const isEditMode = !!id;
  
  // State for product data
  const [product, setProduct] = useState(null);
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
  
  // Refs
  const thumbnailImageRef = useRef<ImageUploaderRef>(null);
  
  // Get organization ID
  const organizationId = useMemo(() => {
    return currentOrganization?.id || '';
  }, [currentOrganization]);
  
  // Initialize form with react-hook-form and zod validation
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      purchase_price: 0,
      compare_at_price: undefined,
      wholesale_price: undefined,
      partial_wholesale_price: undefined,
      min_wholesale_quantity: undefined,
      min_partial_wholesale_quantity: undefined,
      allow_retail: true,
      allow_wholesale: false,
      allow_partial_wholesale: false,
      sku: '',
      barcode: '',
      category_id: '',
      subcategory_id: '',
      brand: '',
      stock_quantity: 0,
      thumbnail_image: '',
      has_variants: false,
      use_sizes: false,
      show_price_on_landing: true,
      is_featured: false,
      is_new: true,
      is_sold_by_unit: true,
      unit_type: 'kg',
      use_variant_prices: false,
      unit_purchase_price: 0,
      unit_sale_price: 0,
      colors: [],
      additional_images: [],
    },
  });
  
  // Watch form values
  const watchCategoryId = form.watch('category_id');
  const watchHasVariants = form.watch('has_variants');
  const watchPrice = form.watch('price');
  const watchPurchasePrice = form.watch('purchase_price');
  const watchThumbnailImage = form.watch('thumbnail_image');
  
  // Load product data if in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      const loadProduct = async () => {
        try {
          setIsLoading(true);
          const productData = await getProductById(id);
          
          if (productData) {
            setProduct(productData);
            
            // Load form values
            form.reset({
              name: productData.name || '',
              description: productData.description || '',
              price: productData.price || 0,
              purchase_price: productData.purchase_price || 0,
              compare_at_price: productData.compare_at_price || undefined,
              wholesale_price: productData.wholesale_price || undefined,
              partial_wholesale_price: productData.partial_wholesale_price || undefined,
              min_wholesale_quantity: productData.min_wholesale_quantity || undefined,
              min_partial_wholesale_quantity: productData.min_partial_wholesale_quantity || undefined,
              allow_retail: productData.allow_retail !== false,
              allow_wholesale: productData.allow_wholesale || false,
              allow_partial_wholesale: productData.allow_partial_wholesale || false,
              sku: productData.sku || '',
              barcode: productData.barcode || '',
              category_id: productData.category_id || '',
              subcategory_id: productData.subcategory_id || '',
              brand: productData.brand || '',
              stock_quantity: productData.stock_quantity || 0,
              thumbnail_image: productData.thumbnail_image || '',
              has_variants: Boolean(productData.has_variants),
              show_price_on_landing: productData.show_price_on_landing !== false,
              is_featured: Boolean(productData.is_featured),
              is_new: Boolean(productData.is_new),
              use_sizes: Boolean(productData.use_sizes),
              is_sold_by_unit: productData.is_sold_by_unit !== false,
              unit_type: productData.unit_type || 'kg',
              use_variant_prices: Boolean(productData.use_variant_prices),
              unit_purchase_price: productData.unit_purchase_price || 0,
              unit_sale_price: productData.unit_sale_price || 0,
              colors: [],
              additional_images: [],
            });
            
            // Load variants and images
            const colors = await getProductColors(id);
            setProductColors(colors);
            setUseVariantPrices(Boolean(productData.use_variant_prices));
            setUseSizes(Boolean(productData.use_sizes));
            
            // Load wholesale tiers
            const tiers = await getWholesaleTiers(id);
            setWholesaleTiers(tiers);
            
            // Load additional images
            if (Array.isArray(productData.images)) {
              setAdditionalImages(productData.images.filter(img => img !== productData.thumbnail_image));
            }
          } else {
            toast.error('لم يتم العثور على المنتج');
            navigate('/products');
          }
        } catch (error) {
          console.error('Error loading product:', error);
          toast.error('حدث خطأ أثناء تحميل بيانات المنتج');
          navigate('/products');
        } finally {
          setIsLoading(false);
        }
      };
      
      loadProduct();
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
        console.error('Error fetching categories:', error);
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
          console.error('Error fetching subcategories:', error);
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
        console.error('Error checking permissions:', error);
        
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
  const onSubmit = useCallback(async (values: ProductFormValues) => {
    if (!organizationId) {
      toast.error('معرف المؤسسة غير متوفر');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // جمع كل الصور (الرئيسية والإضافية)
      const allImages = [values.thumbnail_image];
      if (additionalImages && additionalImages.length > 0) {
        allImages.push(...additionalImages.filter(img => img && img !== values.thumbnail_image));
      }
      
      if (isEditMode && id) {
        // تحديث منتج موجود
        const updateData = {
          name: values.name,
          description: values.description,
          price: values.price,
          purchase_price: values.purchase_price,
          compare_at_price: values.compare_at_price || null,
          wholesale_price: values.wholesale_price || null,
          partial_wholesale_price: values.partial_wholesale_price || null,
          min_wholesale_quantity: values.min_wholesale_quantity || null,
          min_partial_wholesale_quantity: values.min_partial_wholesale_quantity || null,
          allow_retail: values.allow_retail,
          allow_wholesale: values.allow_wholesale,
          allow_partial_wholesale: values.allow_partial_wholesale,
          sku: values.sku,
          barcode: values.barcode || null,
          category_id: values.category_id,
          subcategory_id: values.subcategory_id || null,
          brand: values.brand || null,
          stock_quantity: values.stock_quantity,
          thumbnail_image: values.thumbnail_image,
          images: allImages,
          is_featured: values.is_featured,
          is_new: values.is_new,
          has_variants: values.has_variants,
          show_price_on_landing: values.show_price_on_landing,
          use_sizes: values.use_sizes,
          is_sold_by_unit: values.is_sold_by_unit,
          unit_type: values.unit_type,
          use_variant_prices: values.use_variant_prices,
          unit_purchase_price: values.unit_purchase_price,
          unit_sale_price: values.unit_sale_price,
          updated_at: new Date().toISOString(),
        };
        
        await updateProduct(id, updateData);
        toast.success('تم تحديث المنتج بنجاح');
      } else {
        // إنشاء منتج جديد
        const productData: InsertProduct = {
          name: values.name,
          description: values.description || '',
          price: Number(values.price),
          purchase_price: Number(values.purchase_price),
          compare_at_price: values.compare_at_price ? Number(values.compare_at_price) : undefined,
          wholesale_price: values.allow_wholesale && values.wholesale_price ? Number(values.wholesale_price) : null,
          partial_wholesale_price: values.allow_partial_wholesale && values.partial_wholesale_price ? Number(values.partial_wholesale_price) : null,
          min_wholesale_quantity: values.allow_wholesale && values.min_wholesale_quantity ? Number(values.min_wholesale_quantity) : null,
          min_partial_wholesale_quantity: values.allow_partial_wholesale && values.min_partial_wholesale_quantity ? Number(values.min_partial_wholesale_quantity) : null,
          allow_retail: values.allow_retail,
          allow_wholesale: values.allow_wholesale,
          allow_partial_wholesale: values.allow_partial_wholesale,
          sku: values.sku,
          barcode: values.barcode || undefined,
          category_id: values.category_id,
          subcategory_id: values.subcategory_id || undefined,
          brand: values.brand || undefined,
          stock_quantity: values.stock_quantity,
          thumbnail_image: values.thumbnail_image,
          images: allImages,
          is_digital: false,
          is_new: values.is_new,
          is_featured: values.is_featured,
          has_variants: values.has_variants,
          show_price_on_landing: values.show_price_on_landing,
          features: [],
          specifications: {},
          organization_id: organizationId,
          slug: `${values.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`
        };
        
        const newProduct = await createProduct(productData);
        
        if (newProduct) {
          toast.success('تم إنشاء المنتج بنجاح');
          navigate('/products');
        } else {
          toast.error('حدث خطأ أثناء إنشاء المنتج');
        }
      }
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('حدث خطأ أثناء حفظ المنتج');
    } finally {
      setIsSubmitting(false);
    }
  }, [isEditMode, id, organizationId, additionalImages, navigate]);
  
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
              onClick={() => navigate('/products')}
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
                    <TabsList className="mb-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 bg-muted/50 p-1 rounded-lg">
                      <TabsTrigger value="basic" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <Package className="h-4 w-4 ml-2" />
                        أساسي
                      </TabsTrigger>
                      <TabsTrigger value="images" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 ml-2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                        الصور
                      </TabsTrigger>
                      <TabsTrigger value="pricing" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 ml-2"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>
                        التسعير
                      </TabsTrigger>
                      <TabsTrigger value="inventory" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 ml-2"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 21v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg>
                        المخزون
                      </TabsTrigger>
                      <TabsTrigger value="categories" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 ml-2"><path d="M3 6h18"/><path d="M7 12h10"/><path d="M11 18h6"/></svg>
                        الفئات
                      </TabsTrigger>
                      <TabsTrigger value="selling" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 ml-2"><path d="M21 5H3v14h18V5Z"/><path d="M3 9h18"/><path d="M3 5v4"/><path d="M21 5v4"/><path d="M3 14h4"/><path d="M3 19v-5"/><path d="M7 19v-5"/></svg>
                        طريقة البيع
                      </TabsTrigger>
                      <TabsTrigger value="variants" disabled={!watchHasVariants} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 ml-2"><rect width="6" height="14" x="4" y="5" rx="2"/><rect width="6" height="10" x="14" y="7" rx="2"/><path d="M17 22v-5"/><path d="M17 7V2"/><path d="M7 22v-3"/><path d="M7 5V2"/></svg>
                        المتغيرات
                      </TabsTrigger>
                      <TabsTrigger value="wholesale" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 ml-2"><rect width="16" height="16" x="4" y="4" rx="2"/><path d="M9 9h6"/><path d="M9 12h6"/><path d="M9 15h6"/></svg>
                        الجملة
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
                      
                      <TabsContent value="selling" className="space-y-4 focus:outline-none mt-4">
                        <SellingTypeSection 
                          form={form}
                          onHasVariantsChange={handleHasVariantsChange}
                        />
                      </TabsContent>
                      
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
                      
                      <TabsContent value="wholesale" className="space-y-4 focus:outline-none mt-4">
                        <WholesaleSection 
                          wholesaleTiers={wholesaleTiers}
                          onChange={handleWholesaleTiersChange}
                          productId={id || ''}
                          organizationId={organizationId}
                        />
                      </TabsContent>
                    </div>
                  </Tabs>
                  
                  <div className="mt-6 flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate('/products')}
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