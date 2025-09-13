import { useState, useEffect, useRef } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { updateProduct, getWholesaleTiers, updateWholesaleTier, deleteWholesaleTier, createWholesaleTier, type UpdateProduct, generateAutomaticSku, generateAutomaticBarcode } from '@/lib/api/products';
import {
  getCategories, 
  getSubcategories, 
  type Category, 
  type Subcategory 
} from '@/lib/api/categories';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, AlertCircle } from 'lucide-react';
import type { WholesaleTier } from '@/lib/api/products';
import type { ProductWithVariants as Product } from '@/types/product';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from '@/context/AuthContext';
import { EmployeePermissions } from '@/types/employee';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { hasPermissions } from '@/lib/api/userPermissionsUnified';

import ProductImagesManager from './ProductImagesManager';
import ProductColorManager from './ProductColorManager';
import { ProductFormValues, productSchema, ProductColor } from '@/types/product';
import { createProductColor, createProductImage, getProductColors, getProductImages, deleteProductColor, deleteProductImage, updateProductColor, getProductSizes, createProductSize, updateProductSize, deleteProductSize } from '@/lib/api/productVariants';
import { ImageUploaderRef } from '@/components/ui/ImageUploader';
import { supabase } from '@/lib/supabase';
import WholesaleTierManager from './WholesaleTierManager';
import { Checkbox } from "@/components/ui/checkbox";
import { updateProduct as updateOnlineProduct } from '@/lib/api/products';
import { updateProduct as updateOfflineProduct } from '@/lib/api/offlineProductsAdapter';
import { updateIndexDBProduct } from '@/lib/api/indexedDBProducts';
import { generateLocalSku, generateLocalEAN13 } from '@/lib/api/indexedDBProducts';
import { syncProductImages } from '@/lib/api/productHelpers';

// استيراد المكونات الفرعية
import BasicProductInfo from './BasicProductInfo';
import ProductCategories from './ProductCategories';
import ProductPricing from './ProductPricing';
import ProductInventory from './ProductInventory';
import ProductVariants from './ProductVariants';
import ProductImages from './ProductImages';
import ProductSellingType from './ProductSellingType';

// استيراد المكونات الجديدة
import ProductEditForm from './ProductEditForm';
import PermissionsAlert from './PermissionsAlert';

interface EditProductDialogProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductUpdated: () => Promise<void>;
}

const EditProductDialog = ({ product, open, onOpenChange, onProductUpdated }: EditProductDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);
  const [productColors, setProductColors] = useState<ProductColor[]>([]);
  const [useVariantPrices, setUseVariantPrices] = useState(false);
  const [originalProductColors, setOriginalProductColors] = useState<ProductColor[]>([]);
  const [originalAdditionalImages, setOriginalAdditionalImages] = useState<string[]>([]);
  const [wholesaleTiers, setWholesaleTiers] = useState<WholesaleTier[]>([]);
  const [originalWholesaleTiers, setOriginalWholesaleTiers] = useState<WholesaleTier[]>([]);
  const [organizationId, setOrganizationId] = useState<string>(import.meta.env.VITE_DEFAULT_ORGANIZATION_ID || '');
  const [generatingSku, setGeneratingSku] = useState(false);
  const [generatingBarcode, setGeneratingBarcode] = useState(false);
  const [hasPermission, setHasPermission] = useState(true);
  const [showPermissionAlert, setShowPermissionAlert] = useState(false);
  const [useSizes, setUseSizes] = useState(false);
  
  // استدعاء معلومات المستخدم من سياق المصادقة
  const { user } = useAuth();

  // التحقق من صلاحيات التعديل
  useEffect(() => {
    if (!user) return;
    
    // وظيفة مساعدة لتحقق من الصلاحيات باستخدام الدالة الموحدة
    const checkUserPermissionsLocally = async () => {
      try {
        // استخدام الدالة الموحدة للتحقق من صلاحية تعديل المنتجات
        const permissionsResult = await hasPermissions(['editProducts'], user.id);
        const canEdit = permissionsResult.editProducts || false;

        // تحديث حالة الصلاحية
        setHasPermission(canEdit);
        
        // إذا كان المستخدم لا يملك الصلاحية، أغلق النافذة ونبه المستخدم
        if (!canEdit && open) {
          setShowPermissionAlert(true);
        }
      } catch (error) {
        
        // في حالة الخطأ، تحقق مباشرة من البيانات الخام كما في ProductsList
        const permissions = user.user_metadata?.permissions || {};
        const isAdmin = 
          user.user_metadata?.role === 'admin' || 
          user.user_metadata?.role === 'owner' || 
          user.user_metadata?.is_org_admin === true ||
          user.user_metadata?.is_super_admin === true;
          
        const canEditFallback = isAdmin || Boolean(permissions.editProducts) || Boolean(permissions.manageProducts);
        
        // في حالة الشك، نسمح بالتعديل (أفضل من منع المستخدم من العمل)
        const finalPermission = canEditFallback !== false;
        setHasPermission(finalPermission);
        
        if (!finalPermission && open) {
          setShowPermissionAlert(true);
        }
      }
    };
    
    // تنفيذ الفحص
    checkUserPermissionsLocally();
  }, [user, open]);
  
  // إضافة مرجع للصورة الرئيسية
  const thumbnailImageRef = useRef<ImageUploaderRef>(null);
  
  // Initialize form with react-hook-form and zod validation
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: (() => {
      const defaults = {
        name: product?.name || '',
        description: product?.description || '',
        price: product?.price || 0,
        purchase_price: product?.purchase_price || 0,
        compare_at_price: product?.compare_at_price || undefined,
        wholesale_price: product?.wholesale_price || undefined,
        partial_wholesale_price: product?.partial_wholesale_price || undefined,
        min_wholesale_quantity: product?.min_wholesale_quantity || undefined,
        min_partial_wholesale_quantity: product?.min_partial_wholesale_quantity || undefined,
        allow_retail: product?.allow_retail !== false,
        allow_wholesale: product?.allow_wholesale || false,
        allow_partial_wholesale: product?.allow_partial_wholesale || false,
        sku: product?.sku || '',
        barcode: product?.barcode || '',
        category_id: product?.category_id || '',
        subcategory_id: product?.subcategory_id || '',
        brand: product?.brand || '',
        stock_quantity: product?.stock_quantity || 0,
        thumbnail_image: product?.thumbnail_image || '',
        has_variants: Boolean((product as any)?.has_variants),
        show_price_on_landing: (product as any)?.show_price_on_landing !== false,
        is_featured: Boolean(product?.is_featured),
        is_new: Boolean(product?.is_new),
        use_sizes: Boolean((product as any)?.use_sizes),
        is_sold_by_unit: (product as any)?.is_sold_by_unit !== false,
        unit_type: (product as any)?.unit_type || 'kg',
        use_variant_prices: Boolean((product as any)?.use_variant_prices),
        unit_purchase_price: (product as any)?.unit_purchase_price || 0,
        unit_sale_price: (product as any)?.unit_sale_price || 0,
        form_template_id: (product as any)?.form_template_id || null,
        shipping_provider_id: (product as any)?.shipping_provider_id || null,
        shipping_method_type: (product as any)?.shipping_method_type || 'default',
        colors: [],
        additional_images: [],
      };

      return defaults;
    })()
  });
  
  // استرجاع الفئات
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesData = await getCategories(product?.organization_id);
        // تصفية الفئات لإظهار فئات المنتجات فقط
        const productCategories = categoriesData.filter(
          (category) => category.type === 'product'
        );
        setCategories(productCategories);
      } catch (error) {
        toast.error('حدث خطأ أثناء تحميل الفئات');
      }
    };
    
    if (open) {
      fetchCategories();
    }
  }, [open, product?.organization_id]);
  
  // استرجاع بيانات المنتج عند الفتح
  useEffect(() => {
    
    if (product && open) {
      // تعيين الصورة الرئيسية مباشرة من معلومات المنتج
      form.setValue('thumbnail_image', product.thumbnail_image || '');
      
      // عرض قيم الشحن في المنتج
      
      // تعيين إعدادات الشحن
      form.setValue('shipping_method_type', (product as any)?.shipping_method_type || 'default');
      form.setValue('shipping_provider_id', (product as any)?.shipping_provider_id || null);
      
      const loadProductDetails = async () => {
        try {
          
          // تحميل الألوان
          const colors = await getProductColors(product.id);
          
          setProductColors(colors);
          setOriginalProductColors(colors);

          // تعيين حالة استخدام المقاسات بناءً على بيانات المنتج فقط
          const productUseSizes = Boolean((product as any)?.use_sizes);
          setUseSizes(productUseSizes);
          form.setValue('use_sizes', productUseSizes);

          // فحص المقاسات لكل لون
          if (productUseSizes) {

            // نستخدم مصفوفة من الوعود لتحميل مقاسات جميع الألوان في نفس الوقت
            const loadPromises = colors.map(async (color) => {
              try {
                if (color.has_sizes) {
                  // المقاسات للألوان التي تم تعيين has_sizes = true
                  const sizes = await getProductSizes(color.id);
                  
                  return { colorId: color.id, sizes, found: sizes.length > 0 };
                } else {
                  // فحص ما إذا كان هناك مقاسات للألوان التي تم تعيين has_sizes = false
                  const sizes = await getProductSizes(color.id);
                  if (sizes.length > 0) {
                    
                    return { colorId: color.id, sizes, found: true };
                  }
                }
              } catch (error) {
              }
              return { colorId: color.id, sizes: [], found: false };
            });
            
            // انتظار تحميل جميع المقاسات
            const results = await Promise.all(loadPromises);
            
            // تحديث الألوان بناءً على نتائج تحميل المقاسات
            let hasUpdates = false;
            const updatedColors = [...colors];
            
            for (const result of results) {
              if (result.found) {
                const colorIndex = updatedColors.findIndex(c => c.id === result.colorId);
                if (colorIndex !== -1) {
                  // تحديث اللون بالمقاسات المحملة
                  updatedColors[colorIndex] = {
                    ...updatedColors[colorIndex],
                    has_sizes: true,
                    sizes: result.sizes
                  };
                  hasUpdates = true;
                }
              }
            }
            
            // تحديث الحالة فقط إذا كانت هناك تغييرات
            if (hasUpdates) {
              
              setProductColors(updatedColors);
              setOriginalProductColors([...updatedColors]);
            }
          }
          
          // تحميل الصور الإضافية من جدول product_images
          const productImages = await getProductImages(product.id);
          if (productImages && productImages.length > 0) {
            // ترتيب الصور حسب sort_order
            const sortedImages = productImages.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
            const additionalImageUrls = sortedImages.map(img => img.image_url);
            
            setAdditionalImages(additionalImageUrls);
            setOriginalAdditionalImages(additionalImageUrls);
            
            // تعيين الصور في النموذج أيضاً
            form.setValue('additional_images', additionalImageUrls);
          } 
          // إذا لم توجد صور في الجدول، تحميلها من حقل images في المنتج
          else if (product.images && Array.isArray(product.images)) {
            // استبعاد الصورة الرئيسية من الصور الإضافية
            const additionalImageUrls = product.images.filter(img => img !== product.thumbnail_image);
            
            setAdditionalImages(additionalImageUrls);
            setOriginalAdditionalImages(additionalImageUrls);
            
            // تعيين الصور في النموذج أيضاً
            form.setValue('additional_images', additionalImageUrls);
          }
          
          // تحميل الفئات الفرعية إذا كان هناك معرف فئة
          if (product.category_id) {
            const subcategoriesData = await getSubcategories(product.category_id);
            setSubcategories(subcategoriesData);
          }
          
          // تعيين UseVariantPrices بناءً على الألوان
          setUseVariantPrices(colors.some(color => color.price !== product.price));

          // تأكد من تعيين organization_id
          if (product.organization_id) {
            
            setOrganizationId(product.organization_id);
          }

          // تحميل مراحل أسعار الجملة
          try {
            
            const tiersData = await getWholesaleTiers(product.id);
            
            setWholesaleTiers(tiersData);
          } catch (tierError) {
            toast.error('حدث خطأ أثناء تحميل مراحل أسعار الجملة');
          }
          
        } catch (error) {
          toast.error('حدث خطأ أثناء تحميل تفاصيل المنتج');
        }
      };
      
      loadProductDetails();
    }
  }, [product, open, form]);
  
  // استرجاع الفئات الفرعية عند تغيير الفئة
  const watchCategoryId = form.watch('category_id');
  const watchHasVariants = form.watch('has_variants');
  const watchPrice = form.watch('price');
  const watchPurchasePrice = form.watch('purchase_price');
  const watchUseSizes = form.watch('use_sizes');
  const watchUseVariantPrices = form.watch('use_variant_prices');
  
  useEffect(() => {
    const fetchSubcategories = async () => {
      if (watchCategoryId) {
        try {
          const subcategoriesData = await getSubcategories(watchCategoryId);
          setSubcategories(subcategoriesData || []);
        } catch (error) {
          toast.error('حدث خطأ أثناء تحميل الفئات الفرعية');
          // في حالة الخطأ، تأكد من أن subcategories هي مصفوفة فارغة على الأقل
          setSubcategories([]);
        }
      } else {
        setSubcategories([]);
      }
    };
    
    fetchSubcategories();
  }, [watchCategoryId]);

  // تحديث كمية المخزون بناءً على كميات الألوان عند استخدام المتغيرات
  useEffect(() => {
    
    if (watchHasVariants && productColors.length > 0) {
      const totalQuantity = productColors.reduce((total, color) => total + color.quantity, 0);
      form.setValue('stock_quantity', totalQuantity);
    }
  }, [productColors, watchHasVariants, form]);

  // تحديث السعر في الألوان عند تغيير السعر الأساسي وعدم استخدام أسعار متغيرة
  useEffect(() => {
    
    if (!useVariantPrices && productColors.length > 0) {
      // Only update if at least one color has a different price than watchPrice
      const needsUpdate = productColors.some(color => color.price !== watchPrice);
      if (needsUpdate) {
        const updatedColors = productColors.map(color => ({
          ...color,
          price: watchPrice
        }));
        setProductColors(updatedColors);
      }
    }
  }, [watchPrice, useVariantPrices, productColors]);

  const handleAdditionalImagesChange = (urls: string[]) => {
    
    // تأكد من أن urls ليست فارغة وهي مصفوفة
    if (!Array.isArray(urls)) {
      return;
    }
    
    // تأكد من عدم وجود قيم فارغة
    const filteredUrls = urls.filter(url => url && url.trim() !== '');

    setAdditionalImages(filteredUrls);
    // تحديث الصور في النموذج أيضاً
    form.setValue('additional_images', filteredUrls);
  };

  const handleProductColorsChange = (colors: ProductColor[]) => {

    // تأكد من حفظ مقاسات كل لون إذا كان له مقاسات
    const updatedColors = colors.map(color => {
      // إذا كان اللون موجوداً سابقاً ولديه مقاسات، احتفظ بها
      const existingColor = productColors.find(c => c.id === color.id);
      if (existingColor && existingColor.sizes && existingColor.sizes.length > 0) {
        return {
          ...color,
          sizes: existingColor.sizes
        };
      }
      return color;
    });
    
    setProductColors(updatedColors);
    // نقوم بتعيين الألوان في النموذج ولكن دون حفظ تلقائي للمنتج
    form.setValue('colors', updatedColors);
    
    if (watchHasVariants && updatedColors.length > 0) {
      const totalQuantity = updatedColors.reduce((total, color) => total + color.quantity, 0);
      form.setValue('stock_quantity', totalQuantity);
    }
  };

  const handleHasVariantsChange = (hasVariants: boolean) => {
    form.setValue('has_variants', hasVariants);
    
    // إذا تم تفعيل المتغيرات وليس هناك ألوان، إضافة لون افتراضي
    if (hasVariants && productColors.length === 0) {
      // استخدام الصورة من المرجع إن وجدت، وإلا استخدام القيمة من النموذج
      const thumbnailImage = thumbnailImageRef.current?.getUploadedImageUrl() || form.getValues('thumbnail_image');
      
      const defaultColor: ProductColor = {
        id: Date.now().toString(),
        name: 'اللون الافتراضي',
        color_code: '#000000',
        quantity: form.getValues('stock_quantity'),
        price: form.getValues('price'),
        is_default: true,
        image_url: thumbnailImage,
        product_id: product.id,
        has_sizes: useSizes, // إضافة خاصية has_sizes بناءً على حالة تفعيل المقاسات
        sizes: useSizes ? [] : undefined // إضافة مصفوفة المقاسات فارغة إذا كان المنتج يدعم المقاسات
      };
      setProductColors([defaultColor]);
      form.setValue('colors', [defaultColor]);
    }
  };

  // إضافة مراقب للتغييرات في الصورة الرئيسية
  const updateColorWithMainImage = (mainImageUrl: string) => {
    if (form.getValues('has_variants') && productColors.length > 0) {
      // تحديث اللون الافتراضي بالصورة الجديدة
      const updatedColors = productColors.map(color => {
        if (color.is_default) {
          return { ...color, image_url: mainImageUrl };
        }
        return color;
      });
      setProductColors(updatedColors);
      form.setValue('colors', updatedColors);
    }
  };

  // تعديل دالة التعامل مع تغيير الصورة الرئيسية
  const handleMainImageChange = (url: string) => {
    
  };

  const handleWholesaleTiersChange = (tiers: WholesaleTier[]) => {
    
    setWholesaleTiers(tiers);
  };

  // Add useEffect to set the organizationId from the product's organization_id
  useEffect(() => {
    if (product?.organization_id) {
      
      setOrganizationId(product.organization_id);
    } else {
      // Try to get organization ID from environment variable
      const defaultOrgId = import.meta.env.VITE_DEFAULT_ORGANIZATION_ID;
      if (defaultOrgId) {
        
        setOrganizationId(defaultOrgId);
      }
    }
  }, [product]);

  const onSubmit = async (values: ProductFormValues) => {
    
    setIsSubmitting(true);

    try {
      // التحقق من الصلاحيات
      if (!hasPermission) {
        toast.error('ليس لديك صلاحية لتعديل المنتجات');
        setShowPermissionAlert(true);
        setIsSubmitting(false);
        return;
      }
      
      // التأكد من وجود صورة رئيسية
      if (!values.thumbnail_image) {
        toast.error('الصورة الرئيسية مطلوبة');
        setIsSubmitting(false);
        return;
      }

      // إذا كان المنتج له متغيرات ولكن لا توجد ألوان، أظهر تنبيهًا
      if (values.has_variants && productColors.length === 0) {
        toast.error('يجب إضافة لون واحد على الأقل عند استخدام المتغيرات');
        setIsSubmitting(false);
        return;
      }
      
      // جمع كل الصور (الرئيسية والإضافية)
      const allImages = [values.thumbnail_image];
      if (additionalImages.length > 0) {
        allImages.push(...additionalImages);
      }
      
      // تحضير بيانات التحديث
      const updateData: any = {
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
        updated_at: new Date().toISOString(),
      };

      // إذا تم تغيير SKU، تحقق من عدم وجود تكرار
      if (values.sku !== product.sku) {
        
        const { data: existingSku } = await supabase
          .from('products')
          .select('id')
          .eq('sku', values.sku)
          .neq('id', product.id)
          .single();

        if (existingSku) {
          toast.error('رمز المنتج (SKU) مستخدم بالفعل في منتج آخر');
          return;
        }

        // إضافة SKU فقط إذا تم تغييره وكان فريداً
        const updateDataWithSku = {
          ...updateData,
          sku: values.sku
        };

        // التحقق من حالة الاتصال
        if (!navigator.onLine) {
          // استخدام وظيفة التخزين المحلي في حالة عدم الاتصال

          // استخدام وظيفة تحديث المنتج من واجهة Offline-First
          const updatedProduct = await updateOfflineProduct(product.id, updateDataWithSku);
          
          if (updatedProduct) {
            toast.success('تم تحديث المنتج بنجاح (تخزين محلي)');
            onProductUpdated(); // تحديث القائمة
            onOpenChange(false);
          } else {
            toast.error('حدث خطأ أثناء تحديث المنتج محلياً');
          }
          return;
        }
        
        // محاولة التحديث من خلال الخادم في حالة الاتصال
        try {
          const updatedProduct = await updateOnlineProduct(product.id, updateDataWithSku);
          
          if (updatedProduct) {

            toast.success('تم تحديث المنتج بنجاح');
            onProductUpdated();
            onOpenChange(false);
          }
        } catch (error) {
          
          // في حالة فشل التحديث عبر الإنترنت، نستخدم التخزين المحلي كاحتياطي
          
          const updatedProduct = await updateOfflineProduct(product.id, updateDataWithSku);
          
          if (updatedProduct) {
            toast.success('تم تحديث المنتج بنجاح (تخزين محلي)');
            onProductUpdated();
            onOpenChange(false);
          } else {
            toast.error('حدث خطأ أثناء تحديث المنتج');
          }
        }
      } else {
        // تحديث بدون تغيير SKU

        // التحقق من حالة الاتصال
        if (!navigator.onLine) {
          // استخدام وظيفة التخزين المحلي في حالة عدم الاتصال

          // استخدام وظيفة تحديث المنتج من واجهة Offline-First
          const updatedProduct = await updateOfflineProduct(product.id, updateData);
          
          if (updatedProduct) {
            toast.success('تم تحديث المنتج بنجاح (تخزين محلي)');
            onProductUpdated(); // تحديث القائمة
            onOpenChange(false);
          } else {
            toast.error('حدث خطأ أثناء تحديث المنتج محلياً');
          }
          return;
        }
        
        // محاولة التحديث من خلال الخادم في حالة الاتصال
        try {
          const updatedProduct = await updateOnlineProduct(product.id, updateData);
          
          if (updatedProduct) {

            toast.success('تم تحديث المنتج بنجاح');
            onProductUpdated();
            onOpenChange(false);
          }
        } catch (error) {
          
          // في حالة فشل التحديث عبر الإنترنت، نستخدم التخزين المحلي كاحتياطي
          
          const updatedProduct = await updateOfflineProduct(product.id, updateData);
          
          if (updatedProduct) {
            toast.success('تم تحديث المنتج بنجاح (تخزين محلي)');
            onProductUpdated();
            onOpenChange(false);
          } else {
            toast.error('حدث خطأ أثناء تحديث المنتج');
          }
        }
      }

      // تحديث الألوان
      if (values.has_variants) {
        // حذف الألوان القديمة
        for (const color of originalProductColors) {
          if (!productColors.find(c => c.id === color.id)) {
            await deleteProductColor(color.id);
          }
        }

        // إضافة/تحديث الألوان الجديدة
        for (const color of productColors) {
          if (color.id.startsWith('temp-')) {
            // إضافة لون جديد
            const createdColor = await createProductColor({
              product_id: product.id,
              name: color.name,
              color_code: color.color_code,
              quantity: color.quantity,
              price: useVariantPrices ? color.price : values.price,
              image_url: color.image_url || null,
              is_default: color.is_default,
              has_sizes: color.has_sizes || false
            });
            
            // إضافة المقاسات للون الجديد إذا كان لديه مقاسات
            if (values.use_sizes && color.has_sizes && color.sizes && color.sizes.length > 0) {
              for (const size of color.sizes) {
                await createProductSize({
                  color_id: createdColor.id,
                  product_id: product.id,
                  size_name: size.size_name,
                  quantity: size.quantity,
                  price: useVariantPrices ? size.price : values.price,
                  barcode: size.barcode || null,
                  is_default: size.is_default
                });
              }
            }
          } else {
            // تحديث لون موجود
            await updateProductColor(color.id, {
              name: color.name,
              color_code: color.color_code,
              quantity: color.quantity,
              price: useVariantPrices ? color.price : values.price,
              image_url: color.image_url || null,
              is_default: color.is_default,
              has_sizes: color.has_sizes || false
            });
            
            // تحديث المقاسات للون
            if (values.use_sizes && color.has_sizes && color.sizes) {
              // الحصول على المقاسات الحالية للون
              const currentSizes = await getProductSizes(color.id);
              
              // حذف المقاسات القديمة
              for (const currentSize of currentSizes) {
                if (!color.sizes.find(s => s.id === currentSize.id)) {
                  await deleteProductSize(currentSize.id);
                }
              }
              
              // إضافة/تحديث المقاسات الجديدة
              for (const size of color.sizes) {
                if (size.id.startsWith('temp-')) {
                  // إضافة مقاس جديد
                  await createProductSize({
                    color_id: color.id,
                    product_id: product.id,
                    size_name: size.size_name,
                    quantity: size.quantity,
                    price: useVariantPrices ? size.price : values.price,
                    barcode: size.barcode || null,
                    is_default: size.is_default
                  });
                } else {
                  // تحديث مقاس موجود
                  await updateProductSize(size.id, {
                    size_name: size.size_name,
                    quantity: size.quantity,
                    price: useVariantPrices ? size.price : values.price,
                    barcode: size.barcode || null,
                    is_default: size.is_default
                  });
                }
              }
            }
          }
        }
      } else {
        // إذا تم تعطيل المتغيرات، احذف كل الألوان
        for (const color of originalProductColors) {
          await deleteProductColor(color.id);
        }
      }

      // تحديث الصور الإضافية في جدول product_images
      try {
        // أولاً: احصل على الصور الحالية
        const existingImages = await getProductImages(product.id);

        // ثانياً: احذف الصور التي لم تعد موجودة
        let deletionErrors = 0;
        let deletionPromises = [];
        for (const img of existingImages) {
          if (!additionalImages.includes(img.image_url)) {
            
            try {
              const deletePromise = deleteProductImage(img.id)
                .catch(error => {
                  deletionErrors++;
                });
              deletionPromises.push(deletePromise);
            } catch (error) {
              deletionErrors++;
            }
          }
        }
        
        // انتظار اكتمال جميع عمليات الحذف
        await Promise.allSettled(deletionPromises);

        // ثالثاً: أضف الصور الجديدة
        if (additionalImages && additionalImages.length > 0) {
          
          const existingUrls = existingImages.map(img => img.image_url);
          let additionErrors = 0;
          let additionPromises = [];
          
          for (let i = 0; i < additionalImages.length; i++) {
            const imageUrl = additionalImages[i];
            // تجاهل الصورة إذا كانت هي نفسها الصورة الرئيسية
            if (!existingUrls.includes(imageUrl)) {
              
              try {
                const addPromise = createProductImage({
                  product_id: product.id,
                  image_url: imageUrl,
                  sort_order: i
                })
                .then(response => {
                  
                })
                .catch(error => {
                  additionErrors++;
                });
                
                additionPromises.push(addPromise);
              } catch (error) {
                additionErrors++;
              }
            } else {
              
            }
          }
          
          // انتظار اكتمال جميع عمليات إضافة الصور
          await Promise.allSettled(additionPromises);
        }
      } catch (error) {
        toast.error('حدث خطأ أثناء تحديث الصور');
      }

      toast.success('تم تحديث المنتج بنجاح');
      onProductUpdated();
      onOpenChange(false);
    } catch (error) {
      toast.error('حدث خطأ أثناء تحديث المنتج');
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!isSubmitting) {
          onOpenChange(newOpen);
        }
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">تعديل المنتج</DialogTitle>
          <DialogDescription>
            قم بتعديل معلومات المنتج وتفاصيله
          </DialogDescription>
        </DialogHeader>

        {/* عرض تنبيه الصلاحيات إذا كان المستخدم لا يملك الصلاحية */}
        <PermissionsAlert 
          show={showPermissionAlert} 
          title="لا تملك صلاحية التعديل" 
          description="ليس لديك الصلاحية اللازمة لتعديل المنتجات. يرجى التواصل مع مدير النظام."
        />

        {/* نموذج تعديل المنتج */}
        <ProductEditForm 
          product={product}
          categories={categories}
          subcategories={subcategories}
          productColors={productColors}
          originalProductColors={originalProductColors}
          additionalImages={additionalImages}
          originalAdditionalImages={originalAdditionalImages}
          wholesaleTiers={wholesaleTiers}
          useVariantPrices={useVariantPrices}
          organizationId={organizationId}
          hasPermission={hasPermission}
          isSubmitting={isSubmitting}
          useSizes={useSizes}
          setIsSubmitting={setIsSubmitting}
          onProductUpdated={onProductUpdated}
          onOpenChange={onOpenChange}
          setProductColors={setProductColors}
          setAdditionalImages={setAdditionalImages}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  );
};

export default EditProductDialog;
