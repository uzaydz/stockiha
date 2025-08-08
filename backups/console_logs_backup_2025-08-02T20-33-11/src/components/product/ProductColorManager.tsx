import React, { useState, useEffect, useRef } from 'react';
import { z } from 'zod';
import { ProductColor, ProductSize } from '@/types/product';
import { getProductSizes, deleteProductSize, createProductSize } from '@/lib/api/productVariants';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ColorFormDialog from './ColorFormDialog';
import ColorVariantsTab from './ColorVariantsTab';
import SizesManagementTab from './SizesManagementTab';

// نموذج بيانات إدخال اللون
const colorFormSchema = z.object({
  name: z.string().min(1, { message: 'اسم اللون مطلوب' }),
  color_code: z.string().min(1, { message: 'كود اللون مطلوب' }),
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

const ProductColorManager: React.FC<ProductColorManagerProps> = ({
  colors,
  onChange,
  basePrice,
  basePurchasePrice,
  useVariantPrices,
  onUseVariantPricesChange,
  useSizes,
  onUseSizesChange,
  productId,
}) => {
  // الحالات الأساسية
  const [activeTab, setActiveTab] = useState<"variants" | "sizes">("variants");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingColor, setEditingColor] = useState<ProductColor | null>(null);
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);
  const [loadingSizes, setLoadingSizes] = useState<Record<string, boolean>>({});
  const [tempSizesForNewColor, setTempSizesForNewColor] = useState<ProductSize[]>([]);
  
  // مرجع لتتبع معرفات الألوان التي تم تحميل مقاساتها
  const loadedColorIds = useRef<Set<string>>(new Set());

  // إضافة لون جديد
  const handleAddColor = () => {
    setEditingColor(null);
    setTempSizesForNewColor([]); // إعادة تعيين المقاسات المؤقتة
    setIsDialogOpen(true);
  };

  // تعديل لون موجود
  const handleEditColor = (color: ProductColor) => {
    setEditingColor(color);
    setIsDialogOpen(true);
  };

  // حذف لون
  const handleDeleteColor = (colorId: string) => {
    const colorToDelete = colors.find(c => c.id === colorId);
    if (!colorToDelete) return;

    // تأكيد الحذف
    const confirmMessage = `هل أنت متأكد من حذف اللون "${colorToDelete.name}"؟`;
    if (!confirm(confirmMessage)) return;

    const newColors = colors.filter((c) => c.id !== colorId);
    
    // إذا تم حذف اللون الافتراضي وهناك ألوان أخرى، اجعل الأول افتراضياً
    if (colorToDelete.is_default && newColors.length > 0) {
      newColors[0].is_default = true;
    }
    
    // إذا كان اللون المحذوف محدداً في تبويبة المقاسات، قم بإلغاء التحديد
    if (selectedColorId === colorId) {
      setSelectedColorId(null);
    }
    
    onChange(newColors);
    toast.success(`تم حذف اللون "${colorToDelete.name}" بنجاح`);
  };

  // إدارة مقاسات لون معين
  const handleManageSizes = (colorId: string) => {
    setSelectedColorId(colorId);
    setActiveTab("sizes");
    
    // تحديث has_sizes للون المحدد إذا لم يكن مفعلاً
    const selectedColor = colors.find(c => c.id === colorId);
    if (selectedColor && !selectedColor.has_sizes) {
      const updatedColors = colors.map(c => 
        c.id === colorId ? { ...c, has_sizes: true } : c
      );
      onChange(updatedColors);
    }
  };

  // حفظ بيانات اللون
  const handleSubmitColor = async (values: ColorFormValues): Promise<void> => {
    try {
      // التحقق من صحة البيانات
      const validatedData = colorFormSchema.parse(values);

      if (editingColor) {
        // تحديث لون موجود
        const updatedColors = colors.map((color) =>
          color.id === editingColor.id ? { ...color, ...validatedData } : color
        );
         onChange(updatedColors);
        
        // إشعار بناءً على وجود المقاسات
        if (editingColor.sizes && editingColor.sizes.length > 0) {
          toast.success(`تم تحديث اللون مع ${editingColor.sizes.length} مقاس بنجاح`);
        } else {
        toast.success('تم تحديث اللون بنجاح');
        }
      } else {
        // إضافة لون جديد
        const newColor: ProductColor = {
          id: Date.now().toString(),
          ...validatedData,
          product_id: productId,
          // إضافة المقاسات المؤقتة إذا وجدت
          sizes: tempSizesForNewColor.length > 0 ? tempSizesForNewColor : undefined,
        };

        // إذا كان هذا أول لون، اجعله افتراضياً
        if (colors.length === 0) {
          newColor.is_default = true;
        }

        const newColors = [...colors, newColor];
        onChange(newColors);
        
        // إعادة تعيين المقاسات المؤقتة
        setTempSizesForNewColor([]);
        
        // إشعار بناءً على وجود المقاسات
        if (tempSizesForNewColor.length > 0) {
          toast.success(`تم إضافة اللون مع ${tempSizesForNewColor.length} مقاس بنجاح`);
        } else {
        toast.success('تم إضافة اللون بنجاح');
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          toast.error(`خطأ في ${err.path.join('.')}: ${err.message}`);
        });
      } else {
        toast.error('حدث خطأ أثناء حفظ اللون');
      }
      throw error; // إعادة إلقاء الخطأ ليتم التعامل معه في المكون الفرعي
    }
  };

  // تحديث مقاسات لون معين
  const handleSizesChange = (sizes: ProductSize[]) => {
    if (!selectedColorId) return;

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

  // إدارة مقاسات لون في ColorFormDialog
  const handleColorSizesChange = (colorId: string, sizes: ProductSize[]) => {
    // إذا كان معرف مؤقت (لون جديد)، نحفظ المقاسات في حالة مؤقتة
    if (colorId.startsWith('temp-')) {
      setTempSizesForNewColor(sizes);
      return;
    }
    
    const updatedColors = colors.map(color => {
      if (color.id === colorId) {
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
    
    // إشعار بتحديث الكمية
    const selectedColor = colors.find(c => c.id === colorId);
    if (selectedColor) {
      const oldQuantity = selectedColor.quantity || 0;
      const newQuantity = sizes.reduce((sum, size) => sum + size.quantity, 0);
      if (newQuantity !== oldQuantity) {
        toast.info(`تم تحديث كمية اللون من ${oldQuantity} إلى ${newQuantity}`);
      }
    }
  };

  // تحميل المقاسات عند تغيير اللون المحدد
  useEffect(() => {
    if (!selectedColorId || loadedColorIds.current.has(selectedColorId)) {
      return; // تجنب التحميل المكرر
    }
    
    const selectedColor = colors.find(c => c.id === selectedColorId);
    
    // التحقق من الشروط المطلوبة للتحميل
    if (!selectedColor || !selectedColor.has_sizes || selectedColorId.startsWith('temp-') || loadingSizes[selectedColorId]) {
      loadedColorIds.current.add(selectedColorId);
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
        loadedColorIds.current.add(selectedColorId);
      });
  }, [selectedColorId, colors, loadingSizes, onChange]);

  // تحميل جميع المقاسات دفعة واحدة عند تحميل المكون
  useEffect(() => {
    const loadAllSizes = async () => {
      const colorsWithSizes = colors.filter(c => c.has_sizes && !c.sizes?.length && !c.id.startsWith('temp-'));
      
      if (colorsWithSizes.length === 0) return;
      
      // تحميل المقاسات لجميع الألوان التي تحتاجها
      const sizePromises = colorsWithSizes.map(async (color) => {
        try {
          const sizes = await getProductSizes(color.id);
          return { colorId: color.id, sizes };
        } catch (error) {
          return { colorId: color.id, sizes: [] };
        }
      });
      
      const results = await Promise.all(sizePromises);
      
      // تحديث الألوان بالمقاسات المحملة
      const updatedColors = colors.map(color => {
        const result = results.find(r => r.colorId === color.id);
        if (result) {
          return { ...color, sizes: result.sizes };
        }
        return color;
      });
      
      onChange(updatedColors);
    };
    
    loadAllSizes();
  }, [colors.length]); // تشغيل مرة واحدة عند تحميل الألوان

  // إضافة الألوان المحملة مسبقاً إلى قائمة الألوان المحملة
  useEffect(() => {
    colors.forEach(color => {
      if (color.sizes && color.sizes.length > 0) {
        loadedColorIds.current.add(color.id);
      }
    });
  }, [colors]);

  // تحديد اللون الافتراضي عند تفعيل المقاسات أو تغيير التاب
  useEffect(() => {
    if (activeTab === "sizes" && useSizes && colors.length > 0 && !selectedColorId) {
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

  // التعامل مع تغيير استخدام المقاسات
  const handleUseSizesChange = (checked: boolean) => {
                    onUseSizesChange(checked);
                    if (checked && colors.length > 0) {
                      setActiveTab("sizes");
      if (!selectedColorId) {
                        setSelectedColorId(colors[0].id);
                      }
      toast.success("تم تفعيل المقاسات! يمكنك الآن إدارة مقاسات كل لون من تبويبة المقاسات");
                    } else if (!checked) {
                      toast.info("تم إلغاء تفعيل المقاسات");
                      setActiveTab("variants");
      setSelectedColorId(null);
    }
  };

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "variants" | "sizes")} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 h-12">
          <TabsTrigger 
            value="variants" 
            className="text-base font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            الألوان والمتغيرات
          </TabsTrigger>
          <TabsTrigger 
            value="sizes" 
            disabled={!useSizes || colors.length === 0}
            className={`text-base font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground ${
              !useSizes || colors.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            إدارة المقاسات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="variants" className="mt-0">
          <ColorVariantsTab
            colors={colors}
            onAddColor={handleAddColor}
            onEditColor={handleEditColor}
            onDeleteColor={handleDeleteColor}
            onManageSizes={handleManageSizes}
            useVariantPrices={useVariantPrices}
            onUseVariantPricesChange={onUseVariantPricesChange}
            useSizes={useSizes}
            onUseSizesChange={handleUseSizesChange}
            basePrice={basePrice}
            basePurchasePrice={basePurchasePrice}
          />
        </TabsContent>

        <TabsContent value="sizes" className="mt-0">
          <SizesManagementTab
            colors={colors}
            selectedColorId={selectedColorId}
            onSelectColor={setSelectedColorId}
            onSizesChange={handleSizesChange}
            onBackToVariants={() => setActiveTab("variants")}
            onAddColor={handleAddColor}
            onChange={onChange}
            useSizes={useSizes}
            basePrice={basePrice}
                      productId={productId}
                useVariantPrices={useVariantPrices}
            loadingSizes={loadingSizes}
              />
        </TabsContent>
      </Tabs>
      
      {/* نافذة إضافة/تعديل اللون */}
      <ColorFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingColor={editingColor}
        colors={colors}
        onSubmit={handleSubmitColor}
        basePrice={basePrice}
        basePurchasePrice={basePurchasePrice}
        useVariantPrices={useVariantPrices}
        useSizes={useSizes}
        productId={productId}
        onSizesChange={handleColorSizesChange}
        tempSizes={tempSizesForNewColor}
      />
    </div>
  );
};

export default ProductColorManager;
