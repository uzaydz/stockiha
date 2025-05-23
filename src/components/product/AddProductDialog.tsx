import { useState, useEffect, useRef } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { createProduct, type InsertProduct, generateAutomaticSku, generateAutomaticBarcode } from '@/lib/api/products';
import { 
  getCategories, 
  getSubcategories,
  createCategory,
  type Category, 
  type Subcategory 
} from '@/lib/api/categories';
import { useTenant } from '@/context/TenantContext';
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
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from '@/components/ui/card';

import ProductImagesManager from './ProductImagesManager';
import ProductColorManager from './ProductColorManager';
import ProductVariants from './ProductVariants';
import ProductCategories from './ProductCategories';
import ProductInventory from './ProductInventory';
import ProductImages from './ProductImages';
import ProductPricing from './ProductPricing';
import BasicProductInfo from './BasicProductInfo';
import ProductSellingType from './ProductSellingType';
import ProductShippingAndTemplates from './ProductShippingAndTemplates';
import MarketingAndEngagementTabs from './form/MarketingAndEngagementTabs';
import { ProductFormValues, productSchema, ProductColor, InsertProductColor, InsertProductSize } from '@/types/product';
import { createProductColor, createProductImage } from '@/lib/api/productVariants';
import { ImageUploaderRef } from '@/components/ui/ImageUploader';
import { supabase } from '@/lib/supabase';
import { WholesaleTier } from '@/types/product';
import { createWholesaleTier } from '@/lib/api/products';
import { createProduct as createOnlineProduct } from '@/lib/api/products';
import { generateLocalSku, generateLocalEAN13 } from '@/lib/api/indexedDBProducts';
import { useAuth } from '@/context/AuthContext';
import { EmployeePermissions } from '@/types/employee';
import { checkUserPermissions, refreshUserData } from '@/lib/api/permissions';
import { syncProductImages } from '@/lib/api/productHelpers';
import { createProductSize } from '@/lib/api/productVariants';
import { Package, DollarSign, ShoppingCart, Palette, Camera, FolderTree, Truck, Megaphone } from 'lucide-react';

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductAdded: () => Promise<void>;
}

const AddProductDialog = ({ open, onOpenChange, onProductAdded }: AddProductDialogProps) => {
  const { currentOrganization } = useTenant();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);
  const [productColors, setProductColors] = useState<ProductColor[]>([]);
  const [useVariantPrices, setUseVariantPrices] = useState(false);
  const [organizationId, setOrganizationId] = useState<string>('');
  const [sessionChecked, setSessionChecked] = useState(false);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [showNewSubcategoryInput, setShowNewSubcategoryInput] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [isCreatingSubcategory, setIsCreatingSubcategory] = useState(false);
  const [generatingSku, setGeneratingSku] = useState(false);
  const [generatingBarcode, setGeneratingBarcode] = useState(false);
  const [useSizes, setUseSizes] = useState(false);
  
  // إضافة متغيرات حالة للتحقق من الصلاحيات
  const [hasPermission, setHasPermission] = useState(false);
  const [showPermissionAlert, setShowPermissionAlert] = useState(false);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);
  
  // استدعاء معلومات المستخدم من سياق المصادقة
  const { user } = useAuth();
  
  // إضافة مراجع للمكونات
  const thumbnailImageRef = useRef<any>(null);
  const additionalImagesRef = useRef<any>(null);
  
  // التحقق من صلاحيات المستخدم
  useEffect(() => {
    if (!open) return;
    
    const checkPermissions = async () => {
      setIsCheckingPermissions(true);
      
      if (!user) {
        setHasPermission(false);
        setShowPermissionAlert(true);
        setIsCheckingPermissions(false);
        return;
      }
      
      try {
        // تحديث بيانات المستخدم من قاعدة البيانات
        const userData = await refreshUserData(user.id);
        
        // دمج بيانات المستخدم المحدثة مع البيانات الحالية
        const mergedUserData = {
          ...user,
          permissions: userData?.permissions || user.user_metadata?.permissions,
          is_org_admin: userData?.is_org_admin || user.user_metadata?.is_org_admin,
          is_super_admin: userData?.is_super_admin || user.user_metadata?.is_super_admin,
          role: userData?.role || user.user_metadata?.role,
        };
        
        
        
        // التحقق من صلاحية إضافة المنتجات فقط
        let canAddProducts = false;
        try {
          canAddProducts = await checkUserPermissions(mergedUserData, 'addProducts');
          
        } catch (permError) {
          console.error('AddProductDialog: خطأ في التحقق من الصلاحية:', permError);
          // في حالة حدوث خطأ، نستخدم الطريقة البديلة
          canAddProducts = false;
        }
        
        // التأكد من أن النتيجة هي قيمة منطقية
        const hasAddPermission = Boolean(canAddProducts);
        
        setHasPermission(hasAddPermission);
        setShowPermissionAlert(!hasAddPermission);
      } catch (error) {
        console.error('AddProductDialog: خطأ في التحقق من الصلاحيات:', error);
        
        // في حالة الخطأ، تحقق مباشرة من البيانات الخام
        const isAdmin = 
          user.user_metadata?.role === 'admin' || 
          user.user_metadata?.role === 'owner' || 
          user.user_metadata?.is_org_admin === true ||
          user.user_metadata?.is_super_admin === true;
        
        // التحقق من صلاحية إضافة المنتجات في بيانات المستخدم
        const permissions = user.user_metadata?.permissions || {};
        const hasExplicitPermission = Boolean(permissions.addProducts);
        
        // النتيجة النهائية: إما أن يكون مسؤولاً أو لديه الصلاحية المحددة
        const fallbackPermission = isAdmin || hasExplicitPermission;
        
        
        
        setHasPermission(fallbackPermission);
        setShowPermissionAlert(!fallbackPermission);
      } finally {
        setIsCheckingPermissions(false);
      }
    };
    
    checkPermissions();
  }, [user, open]);
  
  // Verificar si un string es un UUID válido
  const isValidUUID = (uuid: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };
  
  // Obtener el ID de la organización directamente de la base de datos si es necesario
  const fetchOrganizationIdFromDB = async () => {
    try {
      // First try to get the current user's organization ID
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Get the user's organization_id from the users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('organization_id')
          .eq('id', user.id)
          .single();
        
        if (!userError && userData?.organization_id && isValidUUID(userData.organization_id)) {
          
          setOrganizationId(userData.organization_id);
          localStorage.setItem('bazaar_organization_id', userData.organization_id);
          return;
        }
      }
      
      // Buscar usuarios que tenga una organización válida para usar como fallback
      const { data: usersList, error: usersError } = await supabase
        .from('users')
        .select('id, organization_id')
        .neq('organization_id', null)
        .limit(5);
      
      if (usersError) {
        console.error('Error al buscar usuarios con organizaciones:', usersError);
      } else if (usersList && usersList.length > 0) {
        // Usar el primer organization_id válido que encontremos
        for (const user of usersList) {
          if (user.organization_id && isValidUUID(user.organization_id)) {
            
            setOrganizationId(user.organization_id);
            // Guardar en localStorage para futuras referencias
            localStorage.setItem('bazaar_organization_id', user.organization_id);
            return;
          }
        }
      }
      
      // Si aún no tenemos un ID, intentemos obtenerlo directamente de la tabla de organizaciones
      const { data: orgList, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .limit(1);
      
      if (orgError) {
        console.error('Error al buscar organizaciones:', orgError);
      } else if (orgList && orgList.length > 0) {
        const orgId = orgList[0].id;
        
        setOrganizationId(orgId);
        localStorage.setItem('bazaar_organization_id', orgId);
        return;
      }
      
      // Solución temporal: usar un ID hardcodeado
      const hardcodedId = '7519afc0-d068-4235-a0f2-f92935772e0c'; // Reemplazar con un ID válido conocido
      
      setOrganizationId(hardcodedId);
      localStorage.setItem('bazaar_organization_id', hardcodedId);
      
    } catch (error) {
      console.error('Error al obtener organización de la BD:', error);
    }
  };

  // Get user's organization ID directly from user record
  const getUserOrganization = async () => {
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        
        return null;
      }
      
      // Get the user's organization from the users table
      const { data, error } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single();
        
      if (error) {
        console.error('Error fetching user organization:', error);
        return null;
      }
      
      if (data?.organization_id && isValidUUID(data.organization_id)) {
        
        return data.organization_id;
      }
      
      return null;
    } catch (error) {
      console.error('Error in getUserOrganization:', error);
      return null;
    }
  };

  // Call getUserOrganization when component mounts
  useEffect(() => {
    // Obtener el ID de la organización si no está disponible en el contexto
    const getOrganizationId = () => {
      
      
      // Intentar obtener el ID desde el contexto
      if (currentOrganization?.id && isValidUUID(currentOrganization.id)) {
        
        setOrganizationId(currentOrganization.id);
        return;
      }
      
      // Intentar obtener ID desde localStorage (probar múltiples claves)
      const keysToTry = [
        'bazaar_organization_id',
        'currentOrganizationId',
        'selected_organization_id',
        'organization_id'
      ];
      
      for (const key of keysToTry) {
        const storedId = localStorage.getItem(key);
        
        
        if (storedId && isValidUUID(storedId)) {
          
          setOrganizationId(storedId);
          return;
        }
      }
      
      // Intentar obtener desde sessionStorage
      for (const key of keysToTry) {
        const sessionId = sessionStorage.getItem(key);
        
        
        if (sessionId && isValidUUID(sessionId)) {
          
          setOrganizationId(sessionId);
          return;
        }
      }
      
      // No se encontró un ID válido, intentar obtenerlo de la base de datos
      fetchOrganizationIdFromDB();
    };

    const initOrganization = async () => {
      // Try to get organization directly from user record
      const userOrgId = await getUserOrganization();
      if (userOrgId) {
        setOrganizationId(userOrgId);
        localStorage.setItem('bazaar_organization_id', userOrgId);
      } else {
        // Fall back to existing methods
        getOrganizationId();
      }
    };
    
    initOrganization();
  }, []);

  // Obtener el ID de la organización si no está disponible en el contexto
  useEffect(() => {
    // Not calling getOrganizationId directly here anymore as it's called by initOrganization
  }, [currentOrganization]);
  
  // Verificación adicional de que tenemos un ID válido
  useEffect(() => {
    
    
  }, [organizationId]);
  
  // استرجاع الفئات
  useEffect(() => {
    // تحميل الفئات عند فتح النافذة
    const fetchCategories = async () => {
      try {
        const categoriesData = await getCategories(organizationId);
        setCategories(categoriesData || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
        toast.error('حدث خطأ أثناء تحميل الفئات');
        // في حالة الخطأ، تأكد من أن categories هي مصفوفة فارغة على الأقل
        setCategories([]);
      }
    };
    
    const fetchUserSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSessionChecked(true);
        
        if (session?.user?.id) {
          const { data } = await supabase
            .from('users')
            .select('organization_id')
            .eq('id', session.user.id)
            .single();
          
          if (data?.organization_id) {
            setOrganizationId(data.organization_id);
          }
        }
      } catch (error) {
        console.error('Error fetching session:', error);
        setSessionChecked(true);
      }
    };
    
    if (open) {
      fetchCategories();
      fetchUserSession();
    }
  }, [open]);
  
  // Initialize form with react-hook-form and zod validation
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      name_for_shipping: '',
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
      subcategory_id: undefined,
      brand: '',
      stock_quantity: 0,
      thumbnail_image: '',
      has_variants: false,
      show_price_on_landing: true,
      is_featured: false,
      is_new: true,
      is_sold_by_unit: true,
      unit_type: 'unit',
      use_variant_prices: false,
      unit_purchase_price: undefined,
      unit_sale_price: undefined,
      colors: [],
      additional_images: [],
      wholesale_tiers: [],
      use_sizes: false,
    },
  });
  
  // استرجاع الفئات الفرعية عند تغيير الفئة
  const watchCategoryId = form.watch('category_id');
  const watchHasVariants = form.watch('has_variants');
  const watchPrice = form.watch('price');
  const watchUseSizes = form.watch('use_sizes');
  
  useEffect(() => {
    const fetchSubcategories = async () => {
      if (watchCategoryId) {
        try {
          const subcategoriesData = await getSubcategories(watchCategoryId);
          setSubcategories(subcategoriesData || []);
        } catch (error) {
          console.error('Error fetching subcategories:', error);
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
      // فحص ما إذا كانت هناك حاجة فعلية لتحديث الألوان
      const needsUpdate = productColors.some(color => color.price !== watchPrice);
      
      // فقط قم بالتحديث إذا كانت هناك حاجة لذلك
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
      console.error('AddProductDialog: تم استلام قيمة غير صالحة للصور الإضافية:', urls);
      return;
    }
    
    setAdditionalImages(urls);
    // تحديث الصور في النموذج أيضاً
    form.setValue('additional_images', urls);
  };

  const handleProductColorsChange = (colors: ProductColor[]) => {
    setProductColors(colors);
    form.setValue('colors', colors);
    
    if (watchHasVariants && colors.length > 0) {
      const totalQuantity = colors.reduce((total, color) => total + color.quantity, 0);
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
        has_sizes: useSizes, // تأكد من تعيين قيمة has_sizes مطابقة لحالة useSizes
        sizes: useSizes ? [] : undefined
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

  const onSubmit = async (values: ProductFormValues) => {
    setIsSubmitting(true);
    
    
    
    
    try {
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
      
      // التحقق من وجود مقاسات - معالجة تلقائية للتعارض
      const hasSizesInColors = productColors.some(color => color.has_sizes || (color.sizes && color.sizes.length > 0));
      
      // إذا كان هناك ألوان بمقاسات لكن use_sizes غير مفعل، نقوم بتفعيله
      if (hasSizesInColors && !values.use_sizes) {
        
        values.use_sizes = true;
      }
      
      // إذا كان use_sizes مفعل، نتأكد من أن جميع الألوان لديها has_sizes=true
      if (values.use_sizes && values.has_variants) {
        const updatedColors = productColors.map(color => ({
          ...color,
          has_sizes: true
        }));
        setProductColors(updatedColors);
      }
      
      // جمع كل الصور (الرئيسية والإضافية)
      const allImages = [values.thumbnail_image];
      if (additionalImages.length > 0) {
        allImages.push(...additionalImages);
      }
      
      // تحضير بيانات الإدخال
      const productData: InsertProduct = {
        name: values.name,
        name_for_shipping: values.name_for_shipping || undefined,
        description: values.description || '',
        price: Number(values.price),
        purchase_price: Number(values.purchase_price),
        compare_at_price: values.compare_at_price ? Number(values.compare_at_price) : undefined,
        // تحديث معالجة أسعار الجملة
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
      
      
      
        
      // إنشاء المنتج
      const product = await createProduct(productData);
          
      if (product) {
        
        
        // إضافة الألوان والمقاسات إذا كان المنتج يدعم المتغيرات
        if (values.has_variants && productColors.length > 0) {
          
            
          for (const color of productColors) {
            try {
              
              
              // تحديث حالة has_sizes
              const colorHasSize = values.use_sizes && (color.has_sizes || (color.sizes && color.sizes.length > 0));
              
              // إنشاء اللون
              const colorData: InsertProductColor = {
                product_id: product.id,
                name: color.name,
                color_code: color.color_code,
                image_url: color.image_url || null,
                quantity: color.quantity,
                price: useVariantPrices ? color.price : values.price,
                is_default: color.is_default,
                barcode: color.barcode || null,
                has_sizes: colorHasSize
              };
              
              
              const createdColor = await createProductColor(colorData);
              const colorId = createdColor.id; // استخراج معرف اللون من الكائن المسترجع
              
              
              // إضافة المقاسات إذا كان اللون يدعم المقاسات
              if (values.use_sizes && colorHasSize && color.sizes && color.sizes.length > 0) {
                
                
                for (const size of color.sizes) {
                  try {
                    // استخدام معرف اللون النصي المرجع من createProductColor
                    const sizeData: InsertProductSize = {
                      color_id: colorId,
                      product_id: product.id,
                      size_name: size.size_name,
                      quantity: size.quantity,
                      price: useVariantPrices ? size.price : values.price,
                      barcode: size.barcode || null,
                      is_default: size.is_default
                    };
                    
                    
                    const sizeId = await createProductSize(sizeData);
                    
                  } catch (sizeError) {
                    console.error('خطأ في إنشاء المقاس:', sizeError);
                  }
                }
              }
            } catch (colorError) {
              console.error('خطأ في إنشاء اللون:', colorError);
            }
          }
        }
            
        // إضافة الصور الإضافية
        if (additionalImages.length > 0) {
          
            
          for (let i = 0; i < additionalImages.length; i++) {
            try {
              const imageData = {
                product_id: product.id,
                image_url: additionalImages[i],
                sort_order: i
              };
                
              
              await createProductImage(imageData);
            } catch (imageError) {
              console.error(`خطأ في إضافة الصورة ${i+1}:`, imageError);
            }
          }
        }
            
        // إضافة مراحل أسعار الجملة
        if (values.wholesale_tiers && values.wholesale_tiers.length > 0) { 
          if (currentOrganization && currentOrganization.id) {
            for (const tier of values.wholesale_tiers) {
              if (tier.min_quantity && tier.min_quantity > 0 && tier.price_per_unit !== undefined && tier.price_per_unit !== null && tier.price_per_unit >= 0) {
                try {
                  const tierData = {
                    product_id: product.id,
                    min_quantity: tier.min_quantity,
                    price_per_unit: tier.price_per_unit,
                    organization_id: currentOrganization.id,
                  };
                  await createWholesaleTier(tierData);
                } catch (tierError) {
                  console.error('خطأ في إضافة مرحلة سعرية:', tierError);
                  toast.error(`خطأ عند إضافة خطة لكمية ${tier.min_quantity}`);
                }
              } else {
                console.warn('تخطي خطة أسعار جملة غير صالحة أو غير مكتملة:', tier);
              }
            }
          } else {
            console.warn("Organization ID is missing from context, cannot create wholesale tiers.");
            toast.warning("معرف المؤسسة (من السياق) مفقود، لا يمكن إنشاء خطط أسعار الجملة.");
          }
        }
            
        toast.success('تم إضافة المنتج بنجاح');
        onProductAdded();
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error('حدث خطأ أثناء إضافة المنتج');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    form.reset();
    setAdditionalImages([]);
    setProductColors([]);
    setUseVariantPrices(false);
  };

  // Check for active session
  const checkAuthSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No active session found');
        toast.error('يرجى تسجيل الدخول مرة أخرى لإضافة منتجات');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking auth session:', error);
      return false;
    } finally {
      setSessionChecked(true);
    }
  };
  
  // Check auth session when dialog opens
  useEffect(() => {
    if (open) {
      checkAuthSession();
    }
  }, [open]);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('يرجى إدخال اسم الفئة');
      return;
    }

    setIsCreatingCategory(true);
    try {
      const newCategory = await createCategory({
        name: newCategoryName,
        type: 'product'
      }, organizationId);
      
      // تحديث قائمة الفئات
      setCategories(prev => [...prev, newCategory]);
      
      // تحديث قيمة الفئة في النموذج
      form.setValue('category_id', newCategory.id);
      
      // إعادة تعيين حالة إضافة الفئة الجديدة
      setNewCategoryName('');
      setShowNewCategoryInput(false);
      
      toast.success('تم إنشاء الفئة بنجاح');
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('حدث خطأ أثناء إنشاء الفئة');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleCreateSubcategory = async () => {
    if (!form.getValues('category_id')) {
      toast.error('يرجى اختيار الفئة الرئيسية أولاً');
      return;
    }

    if (!newSubcategoryName.trim()) {
      toast.error('يرجى إدخال اسم الفئة الفرعية');
      return;
    }

    setIsCreatingSubcategory(true);
    try {
      const { data: newSubcategory, error } = await supabase
        .from('product_subcategories')
        .insert({
          name: newSubcategoryName,
          category_id: form.getValues('category_id'),
          slug: `${newSubcategoryName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`
        })
        .select()
        .single();

      if (error) throw error;
      
      // تحديث قائمة الفئات الفرعية
      setSubcategories(prev => [...prev, newSubcategory]);
      
      // تحديث قيمة الفئة الفرعية في النموذج
      form.setValue('subcategory_id', newSubcategory.id);
      
      // إعادة تعيين حالة إضافة الفئة الفرعية الجديدة
      setNewSubcategoryName('');
      setShowNewSubcategoryInput(false);
      
      toast.success('تم إنشاء الفئة الفرعية بنجاح');
    } catch (error) {
      console.error('Error creating subcategory:', error);
      toast.error('حدث خطأ أثناء إنشاء الفئة الفرعية');
    } finally {
      setIsCreatingSubcategory(false);
    }
  };

  // دالة لتوليد رمز SKU تلقائياً
  const handleGenerateSku = async () => {
    try {
      setGeneratingSku(true);
      
      // جلب البيانات اللازمة لإنشاء SKU
      const categoryId = form.getValues('category_id');
      const brand = form.getValues('brand') || '';
      
      if (!categoryId) {
        toast.error('يرجى اختيار فئة المنتج أولاً');
        return;
      }
      
      // الحصول على رمز الفئة المختصر (أول حرفين)
      const category = categories.find(cat => cat.id === categoryId);
      const categoryShortName = category ? category.name.substring(0, 2).toUpperCase() : 'PR';
      
      // الحصول على رمز الماركة المختصر (أول حرفين)
      const brandShortName = brand ? brand.substring(0, 2) : '';
      
      let generatedSku;
      
      // التحقق من اتصال الإنترنت
      if (navigator.onLine) {
        // استدعاء واجهة توليد الرمز عبر الإنترنت
        generatedSku = await generateAutomaticSku(categoryShortName, brandShortName, organizationId);
      } else {
        // استخدام الوظيفة المحلية لتوليد SKU عند عدم الاتصال
        
        generatedSku = generateLocalSku(categoryShortName, brandShortName);
      }
      
      // تحديث قيمة حقل SKU في النموذج
      if (generatedSku) {
        form.setValue('sku', generatedSku);
        toast.success('تم توليد رمز المنتج بنجاح');
      } else {
        toast.error('فشل في توليد رمز المنتج');
      }
    } catch (error) {
      console.error('Error generating SKU:', error);
      toast.error('حدث خطأ أثناء توليد رمز المنتج');
    } finally {
      setGeneratingSku(false);
    }
  };
  
  // دالة لتوليد الباركود تلقائياً
  const handleGenerateBarcode = async () => {
    try {
      setGeneratingBarcode(true);
      
      let generatedBarcode;
      
      // التحقق من اتصال الإنترنت
      if (navigator.onLine) {
        // استدعاء واجهة توليد الباركود عبر الإنترنت
        generatedBarcode = await generateAutomaticBarcode();
      } else {
        // استخدام الوظيفة المحلية لتوليد الباركود عند عدم الاتصال
        
        generatedBarcode = generateLocalEAN13();
      }
      
      // تحديث قيمة حقل الباركود في النموذج
      if (generatedBarcode) {
        form.setValue('barcode', generatedBarcode);
        toast.success('تم توليد الباركود بنجاح');
      } else {
        toast.error('فشل في توليد الباركود');
      }
    } catch (error) {
      console.error('Error generating barcode:', error);
      toast.error('حدث خطأ أثناء توليد الباركود');
    } finally {
      setGeneratingBarcode(false);
    }
  };

  // عرض مؤشر التحميل أثناء التحقق من الصلاحيات
  if (isCheckingPermissions) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="sr-only">التحقق من الصلاحيات</DialogTitle>
            <DialogDescription className="sr-only">
              الرجاء الانتظار بينما نتحقق من صلاحياتك
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-center text-sm text-muted-foreground">
              جاري التحقق من الصلاحيات...
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  // إضافة وظيفة لإغلاق نافذة تنبيه الصلاحيات
  const handlePermissionAlertClose = () => {
    setShowPermissionAlert(false);
    onOpenChange(false); // إغلاق النافذة الرئيسية أيضًا
  };
  
  // إذا كان المستخدم لا يملك الصلاحية، أظهر نافذة تنبيه
  if (showPermissionAlert) {
    return (
      <AlertDialog open={showPermissionAlert} onOpenChange={setShowPermissionAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>صلاحيات غير كافية</AlertDialogTitle>
            <AlertDialogDescription>
              عذراً، ليس لديك الصلاحيات الكافية لإضافة منتجات جديدة. يرجى التواصل مع مسؤول النظام للحصول على الصلاحيات المناسبة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handlePermissionAlertClose}>إغلاق</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // عند تغيير حالة استخدام المقاسات
  const handleUseSizesChange = (newValue: boolean) => {
    setUseSizes(newValue);
    form.setValue('use_sizes', newValue);
    
    // تحديث الألوان الموجودة لتفعيل/تعطيل المقاسات
    if (productColors.length > 0) {
      const updatedColors = productColors.map(color => ({
        ...color,
        has_sizes: newValue,
        sizes: newValue && !color.sizes ? [] : color.sizes
      }));
      setProductColors(updatedColors);
      form.setValue('colors', updatedColors);
    }
  };

  // منطقة عرض واجهة المستخدم - استبدال المنطقة الرئيسية بالمكونات الفرعية الجديدة
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl" onPointerDownOutside={(e) => {
        // منع إغلاق مربع الحوار عند النقر خارجه أثناء التحميل
        if (isSubmitting) {
          e.preventDefault();
        }
      }}>
        {isCheckingPermissions ? (
          <div className="h-[50vh] flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-2 text-primary" />
              <p>جاري التحقق من الصلاحيات...</p>
            </div>
          </div>
        ) : showPermissionAlert ? (
          <AlertDialog open={showPermissionAlert} onOpenChange={handlePermissionAlertClose}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>لا توجد صلاحية كافية</AlertDialogTitle>
                <AlertDialogDescription>
                  ليس لديك الصلاحية اللازمة لإضافة منتجات. يرجى التواصل مع مدير النظام للحصول على الصلاحيات المطلوبة.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <Button onClick={handlePermissionAlertClose}>حسناً</Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : !sessionChecked ? (
          <div className="h-[50vh] flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-2 text-primary" />
              <p>جاري التحقق من الجلسة...</p>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>إضافة منتج جديد</DialogTitle>
              <DialogDescription>
                أدخل معلومات المنتج الجديد. الحقول المميزة بعلامة * إلزامية.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Tabs defaultValue="basic" className="w-full">
                  {/* Modern Tab Design matching site theme */}
                  <div className="mb-6">
                    <TabsList className="w-full bg-muted/50 p-2 rounded-xl grid grid-cols-2 md:grid-cols-3 lg:grid-cols-9 h-auto gap-1">
                      <TabsTrigger 
                        value="basic" 
                        className="flex flex-col md:flex-row items-center gap-1 md:gap-2 px-2 md:px-3 py-2 md:py-2.5 text-xs md:text-sm font-medium rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-muted/80 transition-all"
                      >
                        <div className="bg-current/20 p-1 md:p-1.5 rounded-full">
                          <Package className="w-3 md:w-3.5 h-3 md:h-3.5" />
                        </div>
                        <span className="text-center leading-tight">المعلومات الأساسية</span>
                      </TabsTrigger>

                      <TabsTrigger 
                        value="pricing" 
                        className="flex flex-col md:flex-row items-center gap-1 md:gap-2 px-2 md:px-3 py-2 md:py-2.5 text-xs md:text-sm font-medium rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-muted/80 transition-all"
                      >
                        <div className="bg-current/20 p-1 md:p-1.5 rounded-full">
                          <DollarSign className="w-3 md:w-3.5 h-3 md:h-3.5" />
                        </div>
                        <span className="text-center leading-tight">التسعير</span>
                      </TabsTrigger>

                      <TabsTrigger 
                        value="selling_type" 
                        className="flex flex-col md:flex-row items-center gap-1 md:gap-2 px-2 md:px-3 py-2 md:py-2.5 text-xs md:text-sm font-medium rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-muted/80 transition-all"
                      >
                        <div className="bg-current/20 p-1 md:p-1.5 rounded-full">
                          <ShoppingCart className="w-3 md:w-3.5 h-3 md:h-3.5" />
                        </div>
                        <span className="text-center leading-tight">طريقة البيع</span>
                      </TabsTrigger>

                      <TabsTrigger 
                        value="inventory" 
                        className="flex flex-col md:flex-row items-center gap-1 md:gap-2 px-2 md:px-3 py-2 md:py-2.5 text-xs md:text-sm font-medium rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-muted/80 transition-all"
                      >
                        <div className="bg-current/20 p-1 md:p-1.5 rounded-full">
                          <Package className="w-3 md:w-3.5 h-3 md:h-3.5" />
                        </div>
                        <span className="text-center leading-tight">المخزون</span>
                      </TabsTrigger>

                      <TabsTrigger 
                        value="variants" 
                        className="flex flex-col md:flex-row items-center gap-1 md:gap-2 px-2 md:px-3 py-2 md:py-2.5 text-xs md:text-sm font-medium rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-muted/80 transition-all"
                      >
                        <div className="bg-current/20 p-1 md:p-1.5 rounded-full">
                          <Palette className="w-3 md:w-3.5 h-3 md:h-3.5" />
                        </div>
                        <span className="text-center leading-tight">المتغيرات</span>
                      </TabsTrigger>

                      <TabsTrigger 
                        value="images" 
                        className="flex flex-col md:flex-row items-center gap-1 md:gap-2 px-2 md:px-3 py-2 md:py-2.5 text-xs md:text-sm font-medium rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-muted/80 transition-all"
                      >
                        <div className="bg-current/20 p-1 md:p-1.5 rounded-full">
                          <Camera className="w-3 md:w-3.5 h-3 md:h-3.5" />
                        </div>
                        <span className="text-center leading-tight">الصور</span>
                      </TabsTrigger>

                      <TabsTrigger 
                        value="categories" 
                        className="flex flex-col md:flex-row items-center gap-1 md:gap-2 px-2 md:px-3 py-2 md:py-2.5 text-xs md:text-sm font-medium rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-muted/80 transition-all"
                      >
                        <div className="bg-current/20 p-1 md:p-1.5 rounded-full">
                          <FolderTree className="w-3 md:w-3.5 h-3 md:h-3.5" />
                        </div>
                        <span className="text-center leading-tight">التصنيف</span>
                      </TabsTrigger>

                      <TabsTrigger 
                        value="shipping_templates" 
                        className="flex flex-col md:flex-row items-center gap-1 md:gap-2 px-2 md:px-3 py-2 md:py-2.5 text-xs md:text-sm font-medium rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-muted/80 transition-all"
                      >
                        <div className="bg-current/20 p-1 md:p-1.5 rounded-full">
                          <Truck className="w-3 md:w-3.5 h-3 md:h-3.5" />
                        </div>
                        <span className="text-center leading-tight">التوصيل والنماذج</span>
                      </TabsTrigger>

                      <TabsTrigger 
                        value="marketing_engagement" 
                        className="flex flex-col md:flex-row items-center gap-1 md:gap-2 px-2 md:px-3 py-2 md:py-2.5 text-xs md:text-sm font-medium rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-muted/80 transition-all"
                      >
                        <div className="bg-current/20 p-1 md:p-1.5 rounded-full">
                          <Megaphone className="w-3 md:w-3.5 h-3 md:h-3.5" />
                        </div>
                        <span className="text-center leading-tight">التسويق والمشاركة</span>
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="basic" className="mt-6">
                    <Card className="border-0 shadow-none">
                      <CardContent className="p-0">
                        <BasicProductInfo form={form} />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="pricing" className="mt-6">
                    <Card className="border-0 shadow-none">
                      <CardContent className="p-0">
                        <ProductPricing form={form} />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="selling_type" className="mt-6">
                    <Card className="border-0 shadow-none">
                      <CardContent className="p-0">
                        <ProductSellingType form={form} />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="inventory" className="mt-6">
                    <Card className="border-0 shadow-none">
                      <CardContent className="p-0">
                        <ProductInventory 
                          form={form}
                          organizationId={currentOrganization.id}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="variants" className="mt-6">
                    <Card className="border-0 shadow-none">
                      <CardContent className="p-0">
                        <ProductVariants 
                          form={form}
                          productColors={productColors}
                          onProductColorsChange={handleProductColorsChange}
                          mainImageUrl={form.watch('thumbnail_image')}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="images" className="mt-6">
                    <Card className="border-0 shadow-none">
                      <CardContent className="p-0">
                        <ProductImages
                          form={form}
                          mainImage={form.watch('thumbnail_image')}
                          additionalImages={additionalImages}
                          onMainImageChange={handleMainImageChange}
                          onAdditionalImagesChange={handleAdditionalImagesChange}
                          thumbnailImageRef={thumbnailImageRef}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="categories" className="mt-6">
                    <Card className="border-0 shadow-none">
                      <CardContent className="p-0">
                        <ProductCategories
                          form={form}
                          categories={categories}
                          subcategories={subcategories}
                          organizationId={organizationId}
                          onCategoryCreated={(category) => {
                            setCategories([...categories, category]);
                          }}
                          onSubcategoryCreated={(subcategory) => {
                            setSubcategories([...subcategories, subcategory]);
                          }}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="shipping_templates" className="mt-6">
                    <Card className="border-0 shadow-none">
                      <CardContent className="p-0">
                        <ProductShippingAndTemplates 
                          form={form}
                          organizationId={organizationId}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="marketing_engagement" className="mt-6">
                    <Card className="border-0 shadow-none">
                      <CardContent className="p-0">
                        <MarketingAndEngagementTabs 
                          form={form}
                          organizationId={organizationId}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                    إلغاء
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        جاري الحفظ...
                      </>
                    ) : (
                      'إضافة المنتج'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddProductDialog; 