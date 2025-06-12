import { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Check, Loader2, Ruler } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ProductColor, ProductSize } from '@/types/product';
import { generateVariantBarcode } from '@/lib/api/products';
import { generateLocalVariantBarcode } from '@/lib/api/indexedDBProducts';
import { getProductSizes } from '@/lib/api/productVariants';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import ImageUploader from '@/components/ui/ImageUploader';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader } from '../ui/card';
import ColorPicker from './ColorPicker';
import ProductSizeManager from './ProductSizeManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// نموذج بيانات إدخال اللون
const colorFormSchema = z.object({
  name: z.string().min(1, { message: 'اسم اللون مطلوب' }),
  color_code: z.string(),
  quantity: z.coerce.number().nonnegative({ message: 'الكمية يجب أن تكون صفر أو أكثر' }),
  price: z.coerce.number().nonnegative({ message: 'السعر يجب أن يكون صفر أو أكثر' }),
  purchase_price: z.coerce.number().nonnegative({ message: 'سعر الشراء يجب أن يكون صفر أو أكثر' }),
  image_url: z.string(),
  barcode: z.string().optional(),
  is_default: z.boolean().default(false),
  has_sizes: z.boolean().default(false),
});

type ColorFormValues = z.infer<typeof colorFormSchema>;

interface ProductColorManagerProps {
  colors: ProductColor[];
  onChange: (colors: ProductColor[]) => void;
  basePrice: number;
  basePurchasePrice: number;
  useVariantPrices: boolean;
  onUseVariantPricesChange: (useVariantPrices: boolean) => void;
  useSizes: boolean;
  onUseSizesChange: (useSizes: boolean) => void;
  productId: string;
}

const ProductColorManager = ({
  colors,
  onChange,
  basePrice,
  basePurchasePrice,
  useVariantPrices,
  onUseVariantPricesChange,
  useSizes,
  onUseSizesChange,
  productId,
}: ProductColorManagerProps) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingColor, setEditingColor] = useState<ProductColor | null>(null);
  const [generatingBarcode, setGeneratingBarcode] = useState(false);
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("variants"); // "variants" or "sizes"
  const [loadingSizes, setLoadingSizes] = useState<Record<string, boolean>>({});
  
  // إضافة مرجع لتتبع معرفات الألوان التي تم تحميل مقاساتها
  const loadedColorIds = useRef<Set<string>>(new Set());

  const form = useForm<ColorFormValues>({
    resolver: zodResolver(colorFormSchema),
    defaultValues: {
      name: '',
      color_code: '#000000',
      quantity: 0,
      price: basePrice,
      purchase_price: basePurchasePrice,
      image_url: '',
      is_default: false,
      barcode: '',
      has_sizes: false,
    },
  });

  const onAddColorClick = () => {
    form.reset({
      name: '',
      color_code: '#000000',
      quantity: 0,
      price: basePrice,
      purchase_price: basePurchasePrice,
      image_url: '',
      is_default: colors.length === 0, // Make first color default if none exists
      has_sizes: useSizes,
    });
    setEditingColor(null);
    setIsAddDialogOpen(true);
  };

  const onEditColorClick = (color: ProductColor) => {
    form.reset({
      name: color.name,
      color_code: color.color_code,
      quantity: color.quantity,
      price: color.price,
      purchase_price: color.purchase_price,
      image_url: color.image_url,
      is_default: color.is_default,
      barcode: color.barcode || '',
      has_sizes: color.has_sizes || false,
    });
    setEditingColor(color);
    setIsAddDialogOpen(true);
  };

  const onDeleteColorClick = (colorId: string) => {
    const newColors = colors.filter((c) => c.id !== colorId);
    
    // If we deleted the default color and there are other colors, make the first one default
    if (colors.find((c) => c.id === colorId)?.is_default && newColors.length > 0) {
      newColors[0].is_default = true;
    }
    
    onChange(newColors);
  };

  const onManageSizesClick = (colorId: string) => {

    const selectedColor = colors.find(c => c.id === colorId);

    if (selectedColor && selectedColor.sizes) {
      
    } else {
      
    }
    
    setSelectedColorId(colorId);
    setActiveTab("sizes");
  };

  const handleGenerateBarcode = async (productId?: string) => {
    try {
      setGeneratingBarcode(true);
      
      let generatedBarcode;
      
      // التحقق من اتصال الإنترنت
      if (navigator.onLine) {
        // استخدام واجهة توليد الباركود للمتغير عبر الإنترنت
        if (editingColor && editingColor.product_id && editingColor.id) {
          // إذا كان المتغير موجودًا
          generatedBarcode = await generateVariantBarcode(editingColor.product_id, editingColor.id);
        } else {
          // إذا كان هذا متغيرًا جديدًا أو المنتج جديدًا
          // استخدم آلية احتياطية لتوليد باركود موقت
          const timestamp = Date.now();
          const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
          generatedBarcode = `TEMP-${timestamp}-${random}`;
        }
      } else {

        // في وضع عدم الاتصال، استخدم الوظيفة المحلية لتوليد باركود للمتغير
        // قد نستخدم الباركود الحالي للمتغير الذي نقوم بتعديله كأساس
        const baseBarcode = editingColor?.barcode || '';
        generatedBarcode = generateLocalVariantBarcode(baseBarcode);
      }
      
      // تحديث قيمة حقل الباركود في النموذج
      if (generatedBarcode) {
        form.setValue('barcode', generatedBarcode);
        toast.success('تم توليد الباركود بنجاح');
      } else {
        toast.error('فشل في توليد الباركود');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء توليد الباركود');
    } finally {
      setGeneratingBarcode(false);
    }
  };

  const onSubmit = (values: ColorFormValues) => {
    let updatedColors: ProductColor[] = [...colors];
    
    if (editingColor) {
      // Update existing color
      updatedColors = updatedColors.map((c) => {
        if (c.id === editingColor.id) {
          return {
            ...c,
            name: values.name,
            color_code: values.color_code,
            quantity: values.quantity,
            price: values.price,
            purchase_price: values.purchase_price,
            image_url: values.image_url,
            is_default: values.is_default,
            barcode: values.barcode || undefined,
            has_sizes: values.has_sizes,
          };
        }
        // If this color is not default, but we're setting a different color as default
        if (values.is_default && c.id !== editingColor.id) {
          return { ...c, is_default: false };
        }
        return c;
      });
    } else {
      // Add new color
      const newColor: ProductColor = {
        id: `temp-${Date.now()}`, // Temporary ID until saved to database
        name: values.name,
        color_code: values.color_code,
        quantity: values.quantity,
        price: values.price,
        purchase_price: values.purchase_price,
        image_url: values.image_url,
        is_default: values.is_default,
        product_id: productId, // تحديث معرف المنتج مباشرة
        has_sizes: values.has_sizes,
        sizes: editingColor?.sizes || []
      };

      // إضافة الباركود إذا تم توفيره
      if (values.barcode) {
        newColor.barcode = values.barcode;
      }
      
      // إضافة مصفوفة المقاسات فارغة إذا تم تفعيل المقاسات
      if (values.has_sizes) {
        newColor.sizes = [];
      }
      
      // If we're setting this color as default, unset any existing default
      if (values.is_default) {
        updatedColors = updatedColors.map((c) => ({
          ...c,
          is_default: false,
        }));
      }
      
      updatedColors.push(newColor);
    }
    
    // If no color is default, make the first one default
    if (!updatedColors.some((c) => c.is_default) && updatedColors.length > 0) {
      updatedColors[0].is_default = true;
    }
    
    // تحديث الألوان في الذاكرة فقط، بدون حفظ تلقائي
    onChange(updatedColors);
    
    // إغلاق مربع الحوار بعد الإضافة/التعديل
    setIsAddDialogOpen(false);
  };

  const handleSizesChange = (sizes: ProductSize[]) => {
    if (!selectedColorId) return;

    // التحقق من أن المنتج محفوظ بالفعل
    if (productId && productId !== '') {
      // تحديث المقاسات للون المحدد في قاعدة البيانات
      // سيتم استدعاء هذا فقط عند تعديل منتج موجود بالفعل
      
    }

    // تحديث المقاسات للون المحدد في الذاكرة فقط
    const updatedColors = colors.map(color => {
      if (color.id === selectedColorId) {
        // حساب مجموع الكمية من المقاسات
        const totalQuantity = sizes.reduce((sum, size) => sum + size.quantity, 0);
        
        return {
          ...color,
          sizes,
          quantity: totalQuantity, // تحديث كمية اللون بمجموع كميات المقاسات
        };
      }
      return color;
    });

    onChange(updatedColors);
  };

  // استخدام useEffect لتحميل المقاسات عند تغيير اللون المحدد
  useEffect(() => {
    // تحميل المقاسات للون المحدد فقط عند تغييره وإذا لم يتم تحميله من قبل
    if (selectedColorId && !loadedColorIds.current.has(selectedColorId)) {
      const selectedColor = colors.find(c => c.id === selectedColorId);
      
      // فقط إذا كان اللون يدعم المقاسات وليس معرفاً مؤقتاً
      if (
        selectedColor && 
        selectedColor.has_sizes && 
        !selectedColorId.startsWith('temp-') && 
        selectedColorId.includes('-') &&
        !loadingSizes[selectedColorId]
      ) {
        // وضع علامة التحميل
        setLoadingSizes(prev => ({ ...prev, [selectedColorId]: true }));

        // إجراء عملية التحميل
        getProductSizes(selectedColorId)
          .then(sizes => {

            // إضافة معرف اللون إلى قائمة الألوان التي تم تحميلها
            loadedColorIds.current.add(selectedColorId);
            
            // تحديث مصفوفة الألوان بالمقاسات الجديدة
            if (sizes.length > 0 || !selectedColor.sizes) {
              const updatedColors = colors.map(c => {
                if (c.id === selectedColorId) {
                  return { ...c, sizes: [...sizes] };
                }
                return c;
              });
              
              // تحديث حالة الألوان
              onChange([...updatedColors]);
            }
            
            // إعادة تعيين حالة التحميل
            setLoadingSizes(prev => ({ ...prev, [selectedColorId]: false }));
          })
          .catch(error => {
            // إعادة تعيين حالة التحميل في حالة الخطأ أيضًا
            setLoadingSizes(prev => ({ ...prev, [selectedColorId]: false }));
            // إضافة معرف اللون إلى قائمة الألوان التي تم تحميلها لتجنب إعادة المحاولة
            loadedColorIds.current.add(selectedColorId);
          });
      } else if (selectedColor && selectedColor.id.startsWith('temp-')) {
        
        loadedColorIds.current.add(selectedColorId); // تجنب إعادة المحاولة
      } else if (selectedColor && selectedColor.sizes && selectedColor.sizes.length > 0) {
        
        loadedColorIds.current.add(selectedColorId); // تجنب إعادة المحاولة
      }
    }
  }, [selectedColorId]); // احذف colors و onChange من مصفوفة التبعيات

  // إضافة useEffect جديد للتحديث عند تغيير الألوان من الخارج
  useEffect(() => {
    // عند استلام ألوان جديدة، تحقق من أي ألوان لها مقاسات وأضفها إلى قائمة الألوان المحملة
    colors.forEach(color => {
      if (color.sizes && color.sizes.length > 0) {
        loadedColorIds.current.add(color.id);
      }
    });
  }, [colors]);
  
  // الحصول على المقاسات للون المحدد - الآن بدون لوجيك التحميل
  const getSelectedColorSizes = (): ProductSize[] => {
    if (!selectedColorId) return [];
    const selectedColor = colors.find(c => c.id === selectedColorId);
    
    // فقط إرجاع المقاسات المخزنة
    return selectedColor?.sizes || [];
  };

  // الحصول على اللون المحدد
  const getSelectedColor = (): ProductColor | undefined => {
    return colors.find(c => c.id === selectedColorId);
  };

  // تحديث نموذج اللون
  useEffect(() => {
    if (isAddDialogOpen && editingColor === null) {
      form.reset({
        name: '',
        color_code: '#000000',
        quantity: 0,
        price: basePrice,
        purchase_price: basePurchasePrice, // إضافة سعر الشراء الأساسي
        image_url: '',
        is_default: colors.length === 0,
        barcode: '',
        has_sizes: useSizes,
      });
    }
  }, [isAddDialogOpen, editingColor, basePrice, basePurchasePrice, colors.length, useSizes, form]);

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="variants">الألوان والمتغيرات</TabsTrigger>
          <TabsTrigger value="sizes" disabled={!selectedColorId}>المقاسات</TabsTrigger>
        </TabsList>

        <TabsContent value="variants" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">ألوان ومتغيرات المنتج</h3>
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Switch
                  checked={useVariantPrices}
                  onCheckedChange={onUseVariantPricesChange}
                  id="use-variant-prices"
                />
                <Label htmlFor="use-variant-prices">استخدام أسعار مختلفة للألوان</Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse mr-4">
                <Switch
                  checked={useSizes}
                  onCheckedChange={onUseSizesChange}
                  id="use-sizes"
                />
                <Label htmlFor="use-sizes">استخدام المقاسات</Label>
              </div>
              <Button 
                type="button"
                variant="outline" 
                className="mt-2" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAddColorClick();
                }}
              >
                <Plus className="h-4 w-4 ml-2" />
                إضافة لون
              </Button>
            </div>
          </div>
          
          {colors.length === 0 ? (
            <div className="text-center p-8 border border-dashed rounded-lg">
              <p className="text-muted-foreground">لا توجد ألوان أو متغيرات مضافة</p>
              <Button 
                variant="outline" 
                className="mt-2" 
                onClick={onAddColorClick}
              >
                <Plus className="h-4 w-4 ml-2" />
                إضافة لون
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {colors.map((color) => (
                <Card key={color.id} className="overflow-hidden">
                  <div className="relative">
                    {color.image_url ? (
                      <img 
                        src={color.image_url} 
                        alt={color.name} 
                        className="w-full h-40 object-cover"
                      />
                    ) : (
                      <div 
                        className="w-full h-40 flex items-center justify-center"
                        style={{ backgroundColor: color.color_code }}
                      >
                        <span className="text-white text-lg font-bold">{color.name}</span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex space-x-1 space-x-reverse">
                      {color.is_default && (
                        <Badge variant="secondary" className="bg-white/80 text-primary">
                          <Check className="h-3 w-3 ml-1" />
                          افتراضي
                        </Badge>
                      )}
                      {color.has_sizes && (
                        <Badge variant="outline" className="bg-white/80 text-primary">
                          <Ruler className="h-3 w-3 ml-1" />
                          مقاسات
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <CardHeader className="pb-0 pt-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{color.name}</h3>
                      <div 
                        className="w-6 h-6 rounded-full border"
                        style={{ backgroundColor: color.color_code }}
                      />
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">السعر:</span>{' '}
                                                      <span className="font-medium">{color.price} دج</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">الكمية:</span>{' '}
                        <span className="font-medium">{color.quantity}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-end mt-3 gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onDeleteColorClick(color.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {useSizes && color.has_sizes && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onManageSizesClick(color.id);
                          }}
                        >
                          <Ruler className="h-4 w-4 ml-1" />
                          المقاسات
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onEditColorClick(color);
                        }}
                      >
                        <Edit2 className="h-4 w-4 ml-2" />
                        تعديل
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sizes" className="space-y-4">
          {selectedColorId && (
            <>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">
                  مقاسات {getSelectedColor()?.name}
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveTab("variants");
                  }}
                >
                  العودة للألوان
                </Button>
              </div>

              <ProductSizeManager
                sizes={getSelectedColorSizes()}
                onChange={handleSizesChange}
                basePrice={getSelectedColor()?.price || basePrice}
                colorId={typeof selectedColorId === 'string' ? selectedColorId : ''}
                productId={productId || ''}
                useVariantPrices={useVariantPrices}
              />
            </>
          )}
        </TabsContent>
      </Tabs>
      
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent onPointerDownOutside={(e) => {
          // منع إغلاق مربع الحوار عند النقر خارجه عند تقديم النموذج
          e.preventDefault();
        }}>
          <DialogHeader>
            <DialogTitle>{editingColor ? 'تعديل اللون' : 'إضافة لون جديد'}</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={(e) => {
              // منع السلوك الافتراضي لتقديم النموذج
              e.preventDefault();
              e.stopPropagation();
            }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم اللون*</FormLabel>
                      <FormControl>
                        <Input placeholder="مثال: أحمر" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="color_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>كود اللون*</FormLabel>
                      <FormControl>
                        <ColorPicker 
                          value={field.value} 
                          onChange={field.onChange} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الكمية المتاحة*</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          {...field} 
                          value={field.value === null ? '' : field.value}
                          disabled={useSizes && form.getValues('has_sizes')}
                        />
                      </FormControl>
                      {useSizes && form.getValues('has_sizes') && (
                        <FormDescription>
                          سيتم حساب الكمية تلقائياً من مجموع كميات المقاسات
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>سعر البيع*</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01"
                          disabled={!useVariantPrices}
                          {...field} 
                          value={field.value === null ? '' : field.value}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="purchase_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>سعر الشراء*</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01"
                          disabled={!useVariantPrices}
                          {...field} 
                          value={field.value === null ? '' : field.value}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="image_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>صورة اللون*</FormLabel>
                    <FormControl>
                      <ImageUploader
                        imageUrl={field.value}
                        onImageUploaded={field.onChange}
                        className="h-48"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="barcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الباركود (المتغير)</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input placeholder="باركود متغير المنتج" {...field} value={field.value || ''} />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleGenerateBarcode(editingColor?.product_id);
                        }}
                        disabled={generatingBarcode}
                      >
                        {generatingBarcode ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'توليد'
                        )}
                      </Button>
                    </div>
                    <FormDescription>
                      يمكنك ترك هذا الحقل فارغًا وسيتم توليد باركود تلقائيًا عند حفظ المنتج
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {useSizes && (
                <FormField
                  control={form.control}
                  name="has_sizes"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-x-reverse space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>هذا اللون يحتوي على مقاسات متعددة</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          تفعيل هذا الخيار سيسمح بإضافة مقاسات مختلفة لهذا اللون
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              )}
              
              <Separator />
              
              <FormField
                control={form.control}
                name="is_default"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-x-reverse space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={colors.length === 0}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>اللون الافتراضي</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        هذا اللون سيظهر افتراضياً عند عرض المنتج
                      </p>
                    </div>
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsAddDialogOpen(false);
                }}>
                  إلغاء
                </Button>
                <Button type="button" onClick={(e) => {
                  // إيقاف انتشار الحدث لمنع تقديم النموذج الرئيسي
                  e.preventDefault();
                  e.stopPropagation();
                  
                  // تطبيق النموذج يدوياً
                  form.handleSubmit((values) => {
                    onSubmit(values);
                  })();
                }}>
                  {editingColor ? 'تحديث اللون' : 'إضافة اللون'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductColorManager;
