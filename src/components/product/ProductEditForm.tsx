import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Form } from '@/components/ui/form';
import { updateProduct as updateOnlineProduct } from '@/lib/api/products';
import { updateProduct as updateOfflineProduct } from '@/lib/api/offlineProductsAdapter';
import { supabase } from '@/lib/supabase';
import { ImageUploaderRef } from '@/components/ui/ImageUploader';
import ProductEditTabs from './ProductEditTabs';
import { createProductColor, createProductImage, deleteProductColor, deleteProductImage, updateProductColor, getProductSizes, createProductSize, updateProductSize, deleteProductSize, getProductImages } from '@/lib/api/productVariants';
import { ProductFormValues, productSchema, ProductColor, WholesaleTier } from '@/types/product';
import type { ProductWithVariants as Product } from '@/types/product';
import ProductEditActions from './ProductEditActions';

interface ProductEditFormProps {
  product: Product;
  categories: any[];
  subcategories: any[];
  productColors: ProductColor[];
  originalProductColors: ProductColor[];
  additionalImages: string[];
  originalAdditionalImages: string[];
  wholesaleTiers: WholesaleTier[];
  useVariantPrices: boolean;
  organizationId: string;
  hasPermission: boolean;
  isSubmitting: boolean;
  useSizes: boolean;
  setIsSubmitting: (isSubmitting: boolean) => void;
  onProductUpdated: () => Promise<void>;
  onOpenChange: (open: boolean) => void;
  setProductColors: (colors: ProductColor[]) => void;
  setAdditionalImages: (urls: string[]) => void;
  onSubmit?: (values: ProductFormValues) => Promise<void>;
}

const ProductEditForm: React.FC<ProductEditFormProps> = ({
  product,
  categories,
  subcategories,
  productColors,
  originalProductColors,
  additionalImages,
  originalAdditionalImages,
  wholesaleTiers,
  useVariantPrices,
  organizationId,
  hasPermission,
  isSubmitting,
  useSizes,
  setIsSubmitting,
  onProductUpdated,
  onOpenChange,
  setProductColors,
  setAdditionalImages,
  onSubmit: externalOnSubmit
}) => {
  const [localWholesaleTiers, setLocalWholesaleTiers] = useState<WholesaleTier[]>(wholesaleTiers);
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
        stock_quantity: product?.stock_quantity ?? 0, // استخدام ?? بدلاً من ||
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
        colors: [],
        additional_images: [],
      };
      
      console.log('🏗️ ProductEditForm - Form defaultValues:', {
        productId: product?.id,
        originalStock: product?.stock_quantity,
        defaultStock: defaults.stock_quantity,
        hasVariants: defaults.has_variants
      });
      
      return defaults;
    })()
  });

  // تعيين الصورة الرئيسية والصور الإضافية في النموذج
  useEffect(() => {
    console.log('🖼️ ProductEditForm - Setting images in form:', {
      productId: product?.id,
      thumbnailImage: product.thumbnail_image,
      additionalImagesCount: additionalImages.length,
      currentStockQuantity: form.getValues('stock_quantity')
    });
    
    form.setValue('thumbnail_image', product.thumbnail_image || '');
    form.setValue('additional_images', additionalImages);
  }, [product, additionalImages, form]);

  const handleAdditionalImagesChange = (urls: string[]) => {
    // تأكد من عدم وجود قيم فارغة
    const filteredUrls = urls.filter(url => url && url.trim() !== '');
    setAdditionalImages(filteredUrls);
    form.setValue('additional_images', filteredUrls);
  };

  const handleProductColorsChange = (colors: ProductColor[]) => {
    console.log('🎨 ProductEditForm - handleProductColorsChange:', {
      hasVariants: form.watch('has_variants'),
      newColorsLength: colors.length,
      currentStock: form.getValues('stock_quantity'),
      originalProductColorsLength: originalProductColors.length
    });
    
    // تأكد من حفظ مقاسات كل لون إذا كان له مقاسات
    const updatedColors = colors.map(color => {
      const existingColor = productColors.find(c => c.id === color.id);
      if (existingColor && existingColor.sizes && existingColor.sizes.length > 0) {
        return { ...color, sizes: existingColor.sizes };
      }
      return color;
    });
    
    setProductColors(updatedColors);
    form.setValue('colors', updatedColors);
    
    // تحديث كمية المخزون فقط إذا كان المنتج يستخدم المتغيرات ولديه ألوان فعلاً
    if (form.watch('has_variants') && updatedColors.length > 0) {
      const totalQuantity = updatedColors.reduce((total, color) => total + color.quantity, 0);
      console.log('🚨 ProductEditForm - Setting stock_quantity to:', totalQuantity, 'from colors');
      form.setValue('stock_quantity', totalQuantity);
    } else if (!form.watch('has_variants')) {
      // إذا لم يكن يستخدم المتغيرات، احتفظ بالكمية الأصلية من المنتج
      console.log('ℹ️ ProductEditForm - No variants, keeping original stock');
    }
  };

  const handleHasVariantsChange = (hasVariants: boolean) => {
    form.setValue('has_variants', hasVariants);
    
    // إذا تم تفعيل المتغيرات وليس هناك ألوان، إضافة لون افتراضي
    if (hasVariants && productColors.length === 0) {
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
        has_sizes: useSizes,
        sizes: useSizes ? [] : undefined
      };
      setProductColors([defaultColor]);
      form.setValue('colors', [defaultColor]);
    }
  };

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

  const handleMainImageChange = (url: string) => {
    form.setValue('thumbnail_image', url);
    updateColorWithMainImage(url);
  };

  const handleWholesaleTiersChange = (tiers: WholesaleTier[]) => {
    setLocalWholesaleTiers(tiers);
  };

  const onSubmit = async (values: ProductFormValues) => {
    setIsSubmitting(true);
    
    try {
      // إذا كان هناك دالة onSubmit خارجية، استخدمها
      if (externalOnSubmit) {
        await externalOnSubmit(values);
        return;
      }
      
      // التحقق من الصلاحيات - لكن لا نمنع الحفظ تماماً
      if (!hasPermission) {
        // نعرض تحذير لكن نسمح بالمتابعة
        toast.warning('تحذير: قد لا تملك الصلاحية الكاملة لتعديل المنتجات');
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
          setIsSubmitting(false);
          return;
        }
      }
      
      // تحديث المنتج استنادًا إلى حالة الاتصال
      if (!navigator.onLine) {
        // استخدام وظيفة التخزين المحلي في حالة عدم الاتصال
        const updatedProduct = await updateOfflineProduct(product.id, updateData);
        
        if (updatedProduct) {
          toast.success('تم تحديث المنتج بنجاح (تخزين محلي)');
          await updateProductVariants(values);
          onProductUpdated();
          onOpenChange(false);
        } else {
          toast.error('حدث خطأ أثناء تحديث المنتج محلياً');
        }
      } else {
        // محاولة التحديث من خلال الخادم في حالة الاتصال
        try {
          const updatedProduct = await updateOnlineProduct(product.id, updateData);
          
          if (updatedProduct) {
            toast.success('تم تحديث المنتج بنجاح');
            await updateProductVariants(values);
            onProductUpdated();
            onOpenChange(false);
          }
        } catch (error) {
          
          // في حالة فشل التحديث عبر الإنترنت، نستخدم التخزين المحلي كاحتياطي
          const updatedProduct = await updateOfflineProduct(product.id, updateData);
          
          if (updatedProduct) {
            toast.success('تم تحديث المنتج بنجاح (تخزين محلي)');
            await updateProductVariants(values);
            onProductUpdated();
            onOpenChange(false);
          } else {
            toast.error('حدث خطأ أثناء تحديث المنتج');
          }
        }
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء حفظ المنتج');
    } finally {
      setIsSubmitting(false);
    }
  };

  // دالة مساعدة لتحديث متغيرات المنتج (الألوان والمقاسات والصور)
  const updateProductVariants = async (values: ProductFormValues) => {
    try {
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
            const colorData = await createProductColor({
              product_id: product.id,
              name: color.name,
              color_code: color.color_code,
              quantity: color.quantity,
              price: useVariantPrices ? color.price : values.price,
              image_url: color.image_url || null,
              is_default: color.is_default,
              has_sizes: color.has_sizes || false
            });
            
            // التأكد من أن colorId هو نص (string)
            const colorId = typeof colorData === 'string' ? colorData : colorData.id;
            
            // إضافة المقاسات للون الجديد إذا كان لديه مقاسات
            if (values.use_sizes && color.has_sizes && color.sizes && color.sizes.length > 0) {
              for (const size of color.sizes) {
                await createProductSize({
                  color_id: String(color.id),
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
                    color_id: String(color.id),
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
        for (const img of existingImages) {
          if (!additionalImages.includes(img.image_url)) {
            await deleteProductImage(img.id);
          }
        }
        
        // ثالثاً: أضف الصور الجديدة
        for (let i = 0; i < additionalImages.length; i++) {
          const imageUrl = additionalImages[i];
          const existingImg = existingImages.find(img => img.image_url === imageUrl);
          
          if (!existingImg) {
            await createProductImage({
              product_id: product.id,
              image_url: imageUrl,
              sort_order: i
            });
          }
        }
      } catch (error) {
      }
    } catch (error) {
      throw error;
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <ProductEditTabs
          form={form}
          categories={categories}
          subcategories={subcategories}
          productColors={productColors}
          additionalImages={additionalImages}
          wholesaleTiers={localWholesaleTiers}
          useVariantPrices={useVariantPrices}
          productId={product.id}
          organizationId={organizationId}
          useSizes={useSizes}
          thumbnailImageRef={thumbnailImageRef}
          onProductColorsChange={handleProductColorsChange}
          onAdditionalImagesChange={handleAdditionalImagesChange}
          onHasVariantsChange={handleHasVariantsChange}
          onMainImageChange={handleMainImageChange}
          onWholesaleTiersChange={handleWholesaleTiersChange}
        />
        
        <ProductEditActions
          isSubmitting={isSubmitting}
          onCancel={() => onOpenChange(false)}
          hasPermission={hasPermission}
        />
      </form>
    </Form>
  );
};

export default ProductEditForm;
