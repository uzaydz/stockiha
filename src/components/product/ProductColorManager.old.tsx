import { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Check, Loader2, Ruler, Palette, Eye, Save, AlertCircle, Sparkles, Copy, RefreshCw, ChevronRight, ChevronLeft, X } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ProductColor, ProductSize } from '@/types/product';
import { generateVariantBarcode } from '@/lib/api/products';
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";

// نموذج بيانات إدخال اللون
const colorFormSchema = z.object({
  name: z.string().min(1, { message: 'اسم اللون مطلوب' }),
  color_code: z.string().optional().default('#000000'),
  quantity: z.coerce.number().nonnegative({ message: 'الكمية يجب أن تكون صفر أو أكثر' }).default(0),
  price: z.coerce.number().nonnegative({ message: 'السعر يجب أن يكون صفر أو أكثر' }).optional(),
  purchase_price: z.coerce.number().nonnegative({ message: 'سعر الشراء يجب أن يكون صفر أو أكثر' }).optional(),
  image_url: z.string().optional(),
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
  // تسجيل البيانات المُستلمة للتحقق (فقط عند التغيير الفعلي)
  const prevColorsRef = useRef<ProductColor[]>([]);
  const prevProductIdRef = useRef<string>('');

  if (JSON.stringify(prevColorsRef.current) !== JSON.stringify(colors)) {
    prevColorsRef.current = colors;
  }
  
  if (prevProductIdRef.current !== productId) {
    prevProductIdRef.current = productId || '';
  }
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingColor, setEditingColor] = useState<ProductColor | null>(null);
  const [generatingBarcode, setGeneratingBarcode] = useState(false);
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("variants"); // "variants" or "sizes"
  const [loadingSizes, setLoadingSizes] = useState<Record<string, boolean>>({});
  
  // حالات جديدة لتحسين تجربة المستخدم
  const [previewMode, setPreviewMode] = useState(false);
  const [autoSave, setAutoSave] = useState(false);
  const [formProgress, setFormProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [dialogStep, setDialogStep] = useState(1); // 1: معلومات أساسية، 2: صورة وتفاصيل، 3: مراجعة نهائية
  const [suggestedColors, setSuggestedColors] = useState<string[]>([]);
  const [duplicateCheck, setDuplicateCheck] = useState<{hasError: boolean, message: string}>({hasError: false, message: ''});
  
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
    setEditingColor(null);
    setDialogStep(1);
    setPreviewMode(false);
    setUnsavedChanges(false);
    form.reset({
      name: '',
      color_code: '#000000',
      quantity: 0,
      price: useVariantPrices ? 0 : basePrice,
      purchase_price: basePurchasePrice,
      image_url: '',
      barcode: '',
      is_default: colors.length === 0,
      has_sizes: false,
    });
    setIsAddDialogOpen(true);
    generateSuggestedColors();
  };

  // توليد ألوان مقترحة بناءً على الألوان الموجودة
  const generateSuggestedColors = () => {
    const colorPalettes = [
      ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57'],
      ['#A8E6CF', '#88D8C0', '#7FCDCD', '#95B8D1', '#B8A9C9'],
      ['#FFF3E0', '#FFE0B2', '#FFCC80', '#FFB74D', '#FF9800'],
      ['#E1F5FE', '#B3E5FC', '#81D4FA', '#4FC3F7', '#29B6F6'],
      ['#F3E5F5', '#E1BEE7', '#CE93D8', '#BA68C8', '#9C27B0']
    ];
    
    // اختيار لوحة ألوان عشوائية
    const randomPalette = colorPalettes[Math.floor(Math.random() * colorPalettes.length)];
    
    // فلترة الألوان المستخدمة بالفعل
    const usedColors = colors.map(c => c.color_code.toUpperCase());
    const availableColors = randomPalette.filter(color => !usedColors.includes(color.toUpperCase()));
    
    setSuggestedColors(availableColors.slice(0, 5));
  };

  // فحص الألوان المكررة
  const checkDuplicateColor = (colorName: string, colorCode: string) => {
    const isDuplicateName = colors.some(c => 
      c.name.toLowerCase() === colorName.toLowerCase() && 
      c.id !== editingColor?.id
    );
    
    const isDuplicateCode = colors.some(c => 
      c.color_code.toUpperCase() === colorCode.toUpperCase() && 
      c.id !== editingColor?.id
    );
    
    if (isDuplicateName) {
      setDuplicateCheck({hasError: true, message: 'اسم اللون موجود بالفعل'});
    } else if (isDuplicateCode) {
      setDuplicateCheck({hasError: true, message: 'كود اللون موجود بالفعل'});
    } else {
      setDuplicateCheck({hasError: false, message: ''});
    }
  };

  // حساب تقدم النموذج
  const calculateFormProgress = () => {
    const values = form.getValues();
    let progress = 0;
    
    if (values.name?.trim()) progress += 20;
    if (values.color_code) progress += 20;
    if (values.quantity >= 0) progress += 15;
    if (values.price > 0) progress += 15;
    if (values.purchase_price > 0) progress += 15;
    if (values.image_url) progress += 15;
    
    setFormProgress(progress);
    return progress;
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
    setDialogStep(1);
    setFormProgress(calculateFormProgress());
    setUnsavedChanges(false);
    setDuplicateCheck({hasError: false, message: ''});
    generateSuggestedColors();
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

  const onSubmit = async (values: ColorFormValues) => {

    if (duplicateCheck.hasError) {
      toast.error(duplicateCheck.message);
      return;
    }

    setIsSaving(true);
    
    try {
      // Validate the form data against the schema
      const validatedData = colorFormSchema.parse(values);

      if (editingColor) {
        // تحديث لون موجود
        
        const updatedColors = colors.map((color) =>
          color.id === editingColor.id ? { ...color, ...validatedData } : color
        );
        
         onChange(updatedColors);
      } else {
        // إضافة لون جديد
        const newColor: ProductColor = {
          id: Date.now().toString(),
          ...validatedData,
          product_id: productId,
        };

        const newColors = [...colors, newColor];
        onChange(newColors);
      }

      setIsAddDialogOpen(false);
      setEditingColor(null);
      setUnsavedChanges(false);
      form.reset();
      
      toast.success(editingColor ? 'تم تحديث اللون بنجاح' : 'تم إضافة اللون بنجاح');
    } catch (error) {
      
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          toast.error(`خطأ في ${err.path.join('.')}: ${err.message}`);
        });
      } else {
        toast.error('حدث خطأ أثناء حفظ اللون');
      }
    } finally {
      setIsSaving(false);
    }
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

  // استخدام useEffect لتحميل المقاسات عند تغيير اللون المحدد (محسن)
  useEffect(() => {
    if (!selectedColorId || loadedColorIds.current.has(selectedColorId)) {
      return; // تجنب التحميل المكرر
    }
    
    const selectedColor = colors.find(c => c.id === selectedColorId);
    
    // التحقق من الشروط المطلوبة للتحميل
    if (!selectedColor || !selectedColor.has_sizes || selectedColorId.startsWith('temp-') || loadingSizes[selectedColorId]) {
      loadedColorIds.current.add(selectedColorId); // منع إعادة المحاولة
      return;
    }
    
    // إذا كان اللون لديه مقاسات محملة مسبقاً، لا نحتاج لتحميلها مرة أخرى
    if (selectedColor.sizes && selectedColor.sizes.length > 0) {
      loadedColorIds.current.add(selectedColorId);
      return;
    }
    
    // تحميل المقاسات من الخادم
    setLoadingSizes(prev => ({ ...prev, [selectedColorId]: true }));
    
    getProductSizes(selectedColorId)
      .then(sizes => {
        loadedColorIds.current.add(selectedColorId);
        
        if (sizes.length > 0) {
          const updatedColors = colors.map(c => {
            if (c.id === selectedColorId) {
              return { ...c, sizes: [...sizes] };
            }
            return c;
          });
          onChange([...updatedColors]);
        }
        
        setLoadingSizes(prev => ({ ...prev, [selectedColorId]: false }));
      })
      .catch(error => {
        setLoadingSizes(prev => ({ ...prev, [selectedColorId]: false }));
        loadedColorIds.current.add(selectedColorId); // منع إعادة المحاولة
      });
  }, [selectedColorId, colors, loadingSizes, onChange]); // احذف colors و onChange من مصفوفة التبعيات

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

  // مراقبة تغييرات النموذج لتحديث التقدم والحالة
  useEffect(() => {
    if (isAddDialogOpen) {
      const subscription = form.watch(() => {
        calculateFormProgress();
      });
      return () => subscription.unsubscribe();
    }
  }, [isAddDialogOpen, form]);

  // تحديث التقدم عند فتح النافذة
  useEffect(() => {
    if (isAddDialogOpen) {
      setTimeout(() => {
        calculateFormProgress();
      }, 100);
    }
  }, [isAddDialogOpen]);

  // مراقبة تغييرات الألوان المُستلمة من المكون الأب (محسن لتقليل التكرار)
  useEffect(() => {
    const colorsString = JSON.stringify(colors.map(c => ({ id: c.id, name: c.name, has_sizes: c.has_sizes })));
    const prevColorsString = JSON.stringify(prevColorsRef.current.map(c => ({ id: c.id, name: c.name, has_sizes: c.has_sizes })));
    
    if (colorsString !== prevColorsString) {
      if (colors.length > 0) {
      }
    }
  }, [colors]);

  // تحديد اللون الافتراضي عند تفعيل المقاسات أو تغيير التاب
  useEffect(() => {
    if (activeTab === "sizes" && useSizes && colors.length > 0 && !selectedColorId) {
      // اختيار اللون الافتراضي أو أول لون متاح
      const defaultColor = colors.find(c => c.is_default) || colors[0];
      setSelectedColorId(defaultColor.id);
      
      // تفعيل has_sizes للون المحدد إذا لم يكن مفعلاً
      if (!defaultColor.has_sizes) {
        const updatedColors = colors.map(c => 
          c.id === defaultColor.id ? { ...c, has_sizes: true } : c
        );
        onChange(updatedColors);
      }
    }
  }, [activeTab, useSizes, colors, selectedColorId, onChange]);

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="variants">الألوان والمتغيرات</TabsTrigger>
          <TabsTrigger 
            value="sizes" 
            disabled={!useSizes || colors.length === 0}
            className={!useSizes || colors.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}
          >
            المقاسات
          </TabsTrigger>
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
                  onCheckedChange={(checked) => {
                    onUseSizesChange(checked);
                    // إذا تم تفعيل المقاسات وهناك ألوان، انتقل لتاب المقاسات
                    if (checked && colors.length > 0) {
                      setActiveTab("sizes");
                      // تحديد أول لون تلقائياً
                      if (!selectedColorId && colors.length > 0) {
                        setSelectedColorId(colors[0].id);
                      }
                      // إظهار رسالة توضيحية
                      toast.success("تم تفعيل المقاسات! يمكنك الآن إدارة مقاسات كل لون من تاب المقاسات");
                    } else if (!checked) {
                      // إظهار رسالة عند إلغاء تفعيل المقاسات
                      toast.info("تم إلغاء تفعيل المقاسات");
                      setActiveTab("variants");
                    }
                  }}
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
              <p className="text-xs text-muted-foreground mt-1">
                يبدو أن الألوان لم يتم تحميلها بعد أو لم يتم إضافتها
              </p>
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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {colors.map((color) => (
                <Card key={color.id} className="overflow-hidden group hover:shadow-lg transition-all duration-200 border-border/50 hover:border-primary/30 dark:hover:border-primary/40">
                  <div className="relative">
                    {color.image_url ? (
                      <img 
                        src={color.image_url} 
                        alt={color.name} 
                        className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <div 
                        className="w-full h-40 flex items-center justify-center group-hover:scale-105 transition-transform duration-200"
                        style={{ backgroundColor: color.color_code }}
                      >
                        <span className="text-white text-lg font-bold drop-shadow-md">{color.name}</span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex flex-col gap-1">
                      {color.is_default && (
                        <Badge variant="secondary" className="bg-white/90 dark:bg-gray-900/90 text-primary border-primary/20 backdrop-blur-sm">
                          <Check className="h-3 w-3 ml-1" />
                          افتراضي
                        </Badge>
                      )}
                      {color.has_sizes && (
                        <Badge variant="outline" className="bg-white/90 dark:bg-gray-900/90 text-primary border-primary/20 backdrop-blur-sm">
                          <Ruler className="h-3 w-3 ml-1" />
                          مقاسات
                        </Badge>
                      )}
                    </div>
                    {/* Gradient overlay for better text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                  </div>
                  
                  <CardHeader className="pb-0 pt-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-foreground">{color.name}</h3>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-700 shadow-sm"
                          style={{ backgroundColor: color.color_code }}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-2 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">السعر:</span>
                          <span className="font-semibold text-primary">{color.price} دج</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">الكمية:</span>
                          <span className="font-medium">{color.quantity}</span>
                        </div>
                        {color.purchase_price && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-xs">سعر الشراء:</span>
                            <span className="text-xs font-medium">{color.purchase_price} دج</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        {color.barcode && (
                          <div className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded">
                            {color.barcode}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onEditColorClick(color);
                        }}
                        className="flex-1 min-w-0 bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary hover:text-primary"
                      >
                        <Edit2 className="h-4 w-4 ml-2" />
                        تعديل
                      </Button>
                      
                      {useSizes && color.has_sizes && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onManageSizesClick(color.id);
                          }}
                          className="bg-secondary/10 hover:bg-secondary/20 border-secondary/30 text-secondary-foreground"
                        >
                          <Ruler className="h-4 w-4 ml-1" />
                          المقاسات
                        </Button>
                      )}
                      
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onDeleteColorClick(color.id);
                        }}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sizes" className="space-y-4">
          {!useSizes ? (
            <div className="text-center p-8 border border-dashed rounded-lg">
              <Ruler className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">المقاسات غير مفعلة</h3>
              <p className="text-muted-foreground mb-4">
                يجب تفعيل استخدام المقاسات أولاً من تاب الألوان والمتغيرات
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setActiveTab("variants");
                }}
              >
                العودة للألوان
              </Button>
            </div>
          ) : colors.length === 0 ? (
            <div className="text-center p-8 border border-dashed rounded-lg">
              <Palette className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">لا توجد ألوان</h3>
              <p className="text-muted-foreground mb-4">
                يجب إضافة لون واحد على الأقل قبل إدارة المقاسات
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setActiveTab("variants");
                  onAddColorClick();
                }}
              >
                <Plus className="h-4 w-4 ml-2" />
                إضافة لون
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* اختيار اللون */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    اختر اللون لإدارة مقاساته
                  </h3>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {colors.map((color) => (
                      <button
                        key={color.id}
                        type="button"
                        className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                          selectedColorId === color.id
                            ? 'border-primary bg-primary/10 dark:bg-primary/20 shadow-md ring-2 ring-primary/20'
                            : 'border-border hover:border-primary/50 hover:shadow-sm hover:bg-card/50 dark:hover:bg-card/30'
                        }`}
                        onClick={() => {
                          setSelectedColorId(color.id);
                          // تحديث has_sizes للون المحدد إذا لم يكن مفعلاً
                          if (!color.has_sizes) {
                            const updatedColors = colors.map(c => 
                              c.id === color.id ? { ...c, has_sizes: true } : c
                            );
                            onChange(updatedColors);
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            {color.image_url ? (
                              <div className="relative w-10 h-10">
                                <img 
                                  src={color.image_url} 
                                  alt={color.name} 
                                  className="w-full h-full object-cover rounded-lg border-2 border-white dark:border-gray-700 shadow-sm"
                                />
                                <div 
                                  className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-700"
                                  style={{ backgroundColor: color.color_code }}
                                />
                              </div>
                            ) : (
                              <div 
                                className="w-10 h-10 rounded-lg border-2 border-white dark:border-gray-700 shadow-sm flex items-center justify-center text-white text-xs font-bold"
                                style={{ backgroundColor: color.color_code }}
                              >
                                {color.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 text-right">
                            <div className="font-medium text-sm text-foreground">{color.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {color.has_sizes ? (
                                <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                                  <Check className="h-3 w-3" />
                                  مقاسات مفعلة
                                </span>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400">بدون مقاسات</span>
                              )}
                            </div>
                          </div>
                          {selectedColorId === color.id && (
                            <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                              <Check className="h-3 w-3 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* إدارة المقاسات للون المحدد */}
          {selectedColorId && (
                <Card>
                  <CardHeader>
              <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium flex items-center gap-2">
                        <Ruler className="h-5 w-5" />
                  مقاسات {getSelectedColor()?.name}
                </h3>
                      <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                          onClick={() => setSelectedColorId(null)}
                        >
                          إلغاء التحديد
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveTab("variants")}
                >
                  العودة للألوان
                </Button>
              </div>
                    </div>
                  </CardHeader>
                  <CardContent>
              <ProductSizeManager
                sizes={getSelectedColorSizes()}
                onChange={handleSizesChange}
                basePrice={getSelectedColor()?.price || basePrice}
                colorId={typeof selectedColorId === 'string' ? selectedColorId : ''}
                      productId={productId}
                useVariantPrices={useVariantPrices}
              />
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        if (!open && unsavedChanges) {
          // تحذير من فقدان التغييرات غير المحفوظة
          if (confirm('لديك تغييرات غير محفوظة. هل تريد المتابعة وفقدان هذه التغييرات؟')) {
            setIsAddDialogOpen(false);
            setUnsavedChanges(false);
          }
        } else {
          setIsAddDialogOpen(open);
        }
      }}>
        <DialogContent 
          className="max-w-4xl w-[95vw] h-[95vh] max-h-[800px] flex flex-col overflow-hidden"
          onPointerDownOutside={(e) => {
            // منع إغلاق مربع الحوار عند النقر خارجه عند وجود تغييرات غير محفوظة
            if (unsavedChanges) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader className="flex-shrink-0 border-b pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Palette className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-xl">
                    {editingColor ? 'تعديل اللون' : 'إضافة لون جديد'}
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {editingColor ? 'قم بتعديل معلومات اللون' : 'أضف لوناً جديداً لمنتجك'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* مفتاح المعاينة المباشرة */}
                <div className="hidden md:flex items-center gap-2 bg-muted/30 p-2 rounded-lg">
                  <Eye className="h-4 w-4" />
                  <Switch
                    checked={previewMode}
                    onCheckedChange={setPreviewMode}
                  />
                  <Label className="text-xs">معاينة</Label>
                </div>
                
                {/* مؤشر التقدم */}
                <div className="hidden sm:flex items-center gap-2 min-w-[100px]">
                  <Progress value={formProgress} className="h-2" />
                  <span className="text-xs text-muted-foreground">{formProgress}%</span>
                </div>
              </div>
            </div>
            
            {/* شريط الخطوات - محسن للموبايل */}
            <div className="flex items-center justify-center gap-1 sm:gap-2 mt-4">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-colors ${
                    dialogStep === step 
                      ? 'bg-primary text-primary-foreground' 
                      : dialogStep > step 
                        ? 'bg-primary/20 text-primary' 
                        : 'bg-muted text-muted-foreground'
                  }`}>
                    {dialogStep > step ? <Check className="h-3 w-3 sm:h-4 sm:w-4" /> : step}
                  </div>
                  {step < 3 && (
                    <div className={`w-8 sm:w-12 h-0.5 mx-1 sm:mx-2 ${
                      dialogStep > step ? 'bg-primary' : 'bg-muted'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            
            <div className="hidden sm:flex justify-between text-xs sm:text-sm text-muted-foreground mt-2">
              <span>المعلومات الأساسية</span>
              <span>الصور والتفاصيل</span>
              <span>المراجعة النهائية</span>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden min-h-0">
            <ScrollArea className="h-full">
              <div className="p-4 sm:p-6">
                <Form {...form}>
                  <form onSubmit={(e) => {
                    // منع السلوك الافتراضي لتقديم النموذج
                    e.preventDefault();
                    e.stopPropagation();
                  }} className="space-y-4 sm:space-y-6">
                    
                    {/* معاينة اللون المباشرة - محسنة للموبايل */}
                    {previewMode && (
                      <Card className="border-2 border-dashed border-primary/30 dark:border-primary/40 bg-gradient-to-br from-primary/5 to-secondary/5 dark:from-primary/10 dark:to-secondary/10 backdrop-blur-sm">
                        <CardContent className="p-4 sm:p-6">
                          <div className="flex flex-col sm:flex-row items-center gap-4">
                            <div className="relative">
                              {form.watch('image_url') ? (
                                <div className="relative w-16 h-16 sm:w-20 sm:h-20">
                                  <img 
                                    src={form.watch('image_url')} 
                                    alt="معاينة اللون" 
                                    className="w-full h-full object-cover rounded-xl border-2 border-white dark:border-gray-700 shadow-lg"
                                  />
                                  <div 
                                    className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full border-2 border-white dark:border-gray-700 shadow-sm"
                                    style={{ backgroundColor: form.watch('color_code') || '#000000' }}
                                  />
                                </div>
                              ) : (
                                <div 
                                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl border-2 border-white dark:border-gray-700 shadow-lg flex items-center justify-center text-white font-bold text-sm sm:text-lg"
                                  style={{ backgroundColor: form.watch('color_code') || '#000000' }}
                                >
                                  {form.watch('name')?.charAt(0)?.toUpperCase() || '؟'}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 text-center sm:text-right">
                              <h3 className="font-bold text-base sm:text-lg text-foreground">{form.watch('name') || 'اسم اللون'}</h3>
                              <p className="text-sm text-muted-foreground font-mono">{form.watch('color_code') || '#000000'}</p>
                              <div className="flex justify-center sm:justify-start gap-4 mt-2 text-sm">
                                <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 dark:bg-primary/20 rounded-md">
                                  <span className="text-xs text-muted-foreground">السعر:</span>
                                  <span className="text-sm font-semibold text-primary">{form.watch('price') || 0} دج</span>
                                </div>
                                <div className="flex items-center gap-1 px-2 py-1 bg-secondary/50 dark:bg-secondary/30 rounded-md">
                                  <span className="text-xs text-muted-foreground">الكمية:</span>
                                  <span className="text-sm font-semibold">{form.watch('quantity') || 0}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              {form.watch('image_url') && (
                                <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20 text-xs">
                                  <Check className="h-3 w-3 ml-1" />
                                  صورة مرفقة
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                <Eye className="h-3 w-3 ml-1" />
                                معاينة مباشرة
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* تحذير من الألوان المكررة */}
                    {duplicateCheck.hasError && (
                      <Alert className="border-destructive/50 bg-destructive/5">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <AlertDescription className="text-destructive">
                          {duplicateCheck.message}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* الخطوة الأولى: المعلومات الأساسية */}
                    {dialogStep === 1 && (
                      <div className="space-y-4 sm:space-y-6">
                        <Card className="border-primary/20">
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-5 w-5 text-primary" />
                              <h3 className="font-semibold">المعلومات الأساسية</h3>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>اسم اللون*</FormLabel>
                        <FormControl>
                                      <Input 
                                        placeholder="مثال: أحمر" 
                                        {...field} 
                                        onChange={(e) => {
                                          field.onChange(e);
                                          setUnsavedChanges(true);
                                          checkDuplicateColor(e.target.value, form.getValues('color_code'));
                                          calculateFormProgress();
                                        }}
                                        className="text-base sm:text-lg font-medium"
                                      />
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
                                      <div className="space-y-3">
                        <ColorPicker 
                          value={field.value} 
                                        onChange={(color) => {
                                          field.onChange(color);
                                          setUnsavedChanges(true);
                                          checkDuplicateColor(form.getValues('name'), color);
                                          calculateFormProgress();
                                        }}
                                      />
                                      
                                      {/* الألوان المقترحة */}
                                      {suggestedColors.length > 0 && (
                                        <div className="space-y-2">
                                          <Label className="text-sm text-muted-foreground">ألوان مقترحة:</Label>
                                          <div className="flex gap-2 flex-wrap">
                                            {suggestedColors.map((color, index) => (
                                              <button
                                                key={index}
                                                type="button"
                                                className="group relative w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-white dark:border-gray-700 shadow-md hover:scale-110 hover:shadow-lg transition-all duration-200 ring-2 ring-transparent hover:ring-primary/30"
                                                style={{ backgroundColor: color }}
                                                onClick={() => {
                                                  field.onChange(color);
                                                  setUnsavedChanges(true);
                                                  checkDuplicateColor(form.getValues('name'), color);
                                                  calculateFormProgress();
                                                }}
                                                title={`استخدام اللون ${color}`}
                                              >
                                                <div className="absolute inset-0 rounded-full bg-white/20 dark:bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                                                {field.value === color && (
                                                  <div className="absolute inset-0 flex items-center justify-center">
                                                    <Check className="h-3 w-3 sm:h-4 sm:w-4 text-white drop-shadow-md" />
                                                  </div>
                                                )}
                                              </button>
                                            ))}
                                          </div>
                                          <p className="text-xs text-muted-foreground">اضغط على أي لون لاستخدامه</p>
                                        </div>
                                      )}
                                    </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                            </div>
                          </CardContent>
                        </Card>

                        {/* الأسعار والكميات */}
                        <Card>
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="p-1">
                                <span className="text-xs">أسعار</span>
                              </Badge>
                              <h3 className="font-semibold">التسعير والكميات</h3>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  
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
                                        onChange={(e) => {
                                          field.onChange(e);
                                          setUnsavedChanges(true);
                                          calculateFormProgress();
                                        }}
                                        className="text-center font-medium"
                          />
                        </FormControl>
                        {useSizes && form.getValues('has_sizes') && (
                                      <FormDescription className="text-center">
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
                                    <FormLabel className="flex items-center gap-2">
                                      سعر البيع*
                                      {!useVariantPrices && (
                                        <Badge variant="secondary" className="text-xs">
                                          من السعر الأساسي
                                        </Badge>
                                      )}
                                    </FormLabel>
                        <FormControl>
                                      <div className="relative">
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01"
                          disabled={!useVariantPrices}
                          {...field} 
                          value={field.value === null ? '' : field.value}
                                        onChange={(e) => {
                                          field.onChange(e);
                                          setUnsavedChanges(true);
                                          calculateFormProgress();
                                        }}
                                        className="text-center font-medium pr-8"
                                      />
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                        دج
                                      </span>
                                    </div>
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
                                    <FormLabel className="flex items-center gap-2">
                                      سعر الشراء*
                                      {!useVariantPrices && (
                                        <Badge variant="secondary" className="text-xs">
                                          من السعر الأساسي
                                        </Badge>
                                      )}
                                    </FormLabel>
                        <FormControl>
                                      <div className="relative">
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01"
                          disabled={!useVariantPrices}
                          {...field} 
                          value={field.value === null ? '' : field.value}
                                        onChange={(e) => {
                                          field.onChange(e);
                                          setUnsavedChanges(true);
                                          calculateFormProgress();
                                        }}
                                        className="text-center font-medium pr-8"
                                      />
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                        دج
                                      </span>
                                    </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                            {/* عرض هامش الربح */}
                            {useVariantPrices && form.watch('price') > 0 && form.watch('purchase_price') > 0 && (
                              <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-muted-foreground">هامش الربح:</span>
                                  <div className="text-right">
                                    <span className="font-medium">
                                      {((form.watch('price') - form.watch('purchase_price')) / form.watch('price') * 100).toFixed(1)}%
                                    </span>
                                    <span className="text-muted-foreground block">
                                      ({form.watch('price') - form.watch('purchase_price')} دج)
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* الخطوة الثانية: الصور والتفاصيل */}
                    {dialogStep === 2 && (
                      <div className="space-y-4 sm:space-y-6">
                        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent dark:from-primary/10 dark:to-transparent">
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                              <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-lg">
                                <Eye className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <h3 className="font-semibold">الصور والمظهر</h3>
                                <p className="text-xs text-muted-foreground">أضف صورة عالية الجودة للون</p>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <FormField
                              control={form.control}
                              name="image_url"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center gap-2">
                                    <span>صورة اللون</span>
                                    <Badge variant="outline" className="text-xs">مستحسن</Badge>
                                  </FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <ImageUploader
                                        imageUrl={field.value}
                                        onImageUploaded={(url) => {
                                          field.onChange(url);
                                          setUnsavedChanges(true);
                                          calculateFormProgress();
                                        }}
                                        className="h-48 sm:h-56 border-2 border-dashed border-primary/30 dark:border-primary/40 bg-primary/5 dark:bg-primary/10 hover:border-primary/50 dark:hover:border-primary/60 transition-colors"
                                      />
                                      {field.value && (
                                        <div className="absolute top-2 right-2 flex gap-2">
                                          <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20">
                                            <Check className="h-3 w-3 ml-1" />
                                            تم التحميل
                                          </Badge>
                                        </div>
                                      )}
                                    </div>
                                  </FormControl>
                                  <FormDescription className="flex items-start gap-2">
                                    <div className="w-1 h-4 bg-primary/50 rounded-full mt-0.5 flex-shrink-0"></div>
                                    <div className="text-xs text-muted-foreground">
                                      <p>• يُفضل استخدام صور بجودة عالية (1080x1080 بكسل أو أكثر)</p>
                                      <p>• الصيغ المدعومة: JPG, PNG, WebP</p>
                                      <p>• إذا لم تقم بتحميل صورة، سيتم استخدام لون خالص</p>
                                    </div>
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </CardContent>
                        </Card>

                        <Card className="border-secondary/20 dark:border-secondary/30">
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="p-1">
                                <span className="text-xs">إضافي</span>
                              </Badge>
                              <h3 className="font-semibold">الإعدادات المتقدمة</h3>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="barcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الباركود (المتغير)</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                                      <Input 
                                        placeholder="باركود متغير المنتج" 
                                        {...field} 
                                        value={field.value || ''} 
                                        onChange={(e) => {
                                          field.onChange(e);
                                          setUnsavedChanges(true);
                                        }}
                                      />
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
                                  <FormItem className="flex flex-row items-start space-x-3 space-x-reverse space-y-0 p-4 border rounded-lg">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                                        onCheckedChange={(checked) => {
                                          field.onChange(checked);
                                          setUnsavedChanges(true);
                                        }}
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
                
                <FormField
                  control={form.control}
                  name="is_default"
                  render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-x-reverse space-y-0 p-4 border rounded-lg">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                                      onCheckedChange={(checked) => {
                                        field.onChange(checked);
                                        setUnsavedChanges(true);
                                      }}
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
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* الخطوة الثالثة: المراجعة النهائية */}
                    {dialogStep === 3 && (
                      <div className="space-y-4 sm:space-y-6">
                        <Card className="border-primary/30 bg-primary/5 dark:bg-primary/10">
                          <CardHeader>
                            <div className="flex items-center gap-2">
                              <Check className="h-5 w-5 text-primary" />
                              <h3 className="font-semibold">مراجعة المعلومات</h3>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* معاينة اللون الرئيسية */}
                            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-background/50 dark:bg-card/50 rounded-lg border border-border/50 backdrop-blur-sm">
                              <div className="relative">
                                {form.watch('image_url') ? (
                                  <div className="relative w-16 h-16 sm:w-20 sm:h-20">
                                    <img 
                                      src={form.watch('image_url')} 
                                      alt="معاينة اللون" 
                                      className="w-full h-full object-cover rounded-xl border-2 border-white dark:border-gray-700 shadow-lg"
                                    />
                                    <div 
                                      className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full border-2 border-white dark:border-gray-700 shadow-sm"
                                      style={{ backgroundColor: form.watch('color_code') }}
                                    />
                                  </div>
                                ) : (
                                  <div 
                                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl border-2 border-white dark:border-gray-700 shadow-lg flex items-center justify-center text-white font-bold text-sm sm:text-lg"
                                    style={{ backgroundColor: form.watch('color_code') }}
                                  >
                                    {form.watch('name')?.charAt(0)?.toUpperCase() || '؟'}
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex-1 text-center sm:text-right">
                                <h3 className="font-bold text-lg sm:text-xl text-foreground">{form.watch('name')}</h3>
                                <p className="text-sm text-muted-foreground font-mono">{form.watch('color_code')}</p>
                                <div className="flex justify-center sm:justify-start gap-4 mt-3">
                                  <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 dark:bg-primary/20 rounded-md">
                                    <span className="text-xs text-muted-foreground">السعر:</span>
                                    <span className="text-sm font-semibold text-primary">{form.watch('price')} دج</span>
                                  </div>
                                  <div className="flex items-center gap-1 px-2 py-1 bg-secondary/50 dark:bg-secondary/30 rounded-md">
                                    <span className="text-xs text-muted-foreground">الكمية:</span>
                                    <span className="text-sm font-semibold">{form.watch('quantity')}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* تفاصيل إضافية */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="p-4 bg-card/50 dark:bg-card/30 rounded-lg border border-border/50">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                                  <span className="text-sm font-medium text-muted-foreground">معلومات المنتج</span>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-muted-foreground">الباركود:</span>
                                    <span className="text-xs font-mono bg-muted/50 px-2 py-1 rounded">
                                      {form.watch('barcode') || 'سيتم توليده تلقائياً'}
                                    </span>
                                  </div>
                                  {form.watch('purchase_price') && (
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs text-muted-foreground">سعر الشراء:</span>
                                      <span className="text-xs font-semibold">{form.watch('purchase_price')} دج</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="p-4 bg-card/50 dark:bg-card/30 rounded-lg border border-border/50">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-2 h-2 bg-secondary rounded-full"></div>
                                  <span className="text-sm font-medium text-muted-foreground">الحالة والخصائص</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {form.watch('is_default') && (
                                    <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                                      <Check className="h-3 w-3 ml-1" />
                                      افتراضي
                                    </Badge>
                                  )}
                                  {form.watch('has_sizes') && (
                                    <Badge variant="outline" className="text-xs border-secondary/50 text-secondary-foreground">
                                      <Ruler className="h-3 w-3 ml-1" />
                                      مقاسات متعددة
                                    </Badge>
                                  )}
                                  {!form.watch('is_default') && !form.watch('has_sizes') && (
                                    <span className="text-xs text-muted-foreground italic">لا توجد خصائص إضافية</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* ملخص سريع */}
                            <div className="p-3 bg-gradient-to-r from-primary/5 to-secondary/5 dark:from-primary/10 dark:to-secondary/10 rounded-lg border border-primary/10 dark:border-primary/20">
                              <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium">ملخص سريع</span>
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                سيتم إضافة اللون <strong className="text-foreground">{form.watch('name')}</strong> بسعر <strong className="text-primary">{form.watch('price')} دج</strong> وكمية <strong>{form.watch('quantity')}</strong> قطعة.
                                {form.watch('is_default') && ' هذا اللون سيكون الافتراضي للمنتج.'}
                                {form.watch('has_sizes') && ' يمكن إضافة مقاسات متعددة لهذا اللون لاحقاً.'}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </form>
                </Form>
              </div>
            </ScrollArea>
          </div>

          <DialogFooter className="flex-shrink-0 border-t pt-4 bg-background">
            <div className="flex flex-col sm:flex-row justify-between items-center w-full gap-3 sm:gap-0">
              <div className="flex gap-2 order-2 sm:order-1">
                {dialogStep > 1 && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setDialogStep(dialogStep - 1)}
                    size="sm"
                    className="min-w-[80px]"
                  >
                    <ChevronLeft className="h-4 w-4 ml-1" />
                    السابق
                  </Button>
                )}
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (unsavedChanges) {
                      if (confirm('لديك تغييرات غير محفوظة. هل تريد المتابعة وفقدان هذه التغييرات؟')) {
                        setIsAddDialogOpen(false);
                        setUnsavedChanges(false);
                      }
                    } else {
                      setIsAddDialogOpen(false);
                    }
                  }}
                  className="min-w-[80px]"
                >
                  <X className="h-4 w-4 ml-1" />
                  إلغاء
                </Button>
              </div>
              
              <div className="flex gap-2 order-1 sm:order-2">
                {dialogStep < 3 ? (
                  <Button 
                    type="button" 
                    onClick={() => {
                      const progress = calculateFormProgress();
                      if (dialogStep === 1 && progress >= 40) { // تأكد من ملء المعلومات الأساسية
                        setDialogStep(2);
                      } else if (dialogStep === 2) {
                        setDialogStep(3);
                      } else if (dialogStep === 1) {
                        toast.error('يرجى ملء المعلومات الأساسية أولاً');
                      }
                    }}
                    disabled={duplicateCheck.hasError}
                    className="min-w-[100px]"
                  >
                    التالي
                    <ChevronRight className="h-4 w-4 mr-1" />
                  </Button>
                ) : (
                  <Button 
                    type="button" 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsSaving(true);
                      
                      form.handleSubmit((values) => {
                        onSubmit(values);
                        setIsSaving(false);
                      })();
                    }}
                    disabled={isSaving || duplicateCheck.hasError}
                    className="min-w-[120px]"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin ml-2" />
                        جاري الحفظ...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 ml-2" />
                        {editingColor ? 'تحديث اللون' : 'إضافة اللون'}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductColorManager;
