import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, Copy, Grid, Palette, Package, MoveRight, Upload, Image, X, Barcode, Tag, Coins, ShoppingCart, AlertCircle } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ProductColor, ProductSize } from '@/types/product';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Form schema for color
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

// Form schema for size
const sizeFormSchema = z.object({
  size_name: z.string().min(1, { message: 'اسم المقاس مطلوب' }),
  quantity: z.coerce.number().min(0, { message: 'الكمية يجب أن تكون أكبر من أو تساوي صفر' }),
  price: z.coerce.number().min(0, { message: 'السعر يجب أن يكون أكبر من أو تساوي صفر' }),
  purchase_price: z.coerce.number().min(0, { message: 'سعر الشراء يجب أن يكون أكبر من أو تساوي صفر' }).optional(),
  barcode: z.string().optional().nullable(),
  image_url: z.string().optional(),
});

type ColorFormValues = z.infer<typeof colorFormSchema>;
type SizeFormData = z.infer<typeof sizeFormSchema>;

interface UnifiedColorSizeManagerProps {
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

const UnifiedColorSizeManager: React.FC<UnifiedColorSizeManagerProps> = ({
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingColor, setEditingColor] = useState<ProductColor | null>(null);
  const [tempSizes, setTempSizes] = useState<SizeFormData[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'color' | 'sizes'>('color');
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);

  // Initialize form
  const form = useForm<ColorFormValues>({
    resolver: zodResolver(colorFormSchema),
    defaultValues: {
      name: '',
      color_code: '',
      quantity: 0,
      price: basePrice,
      purchase_price: basePurchasePrice,
      image_url: '',
      barcode: '',
      is_default: colors.length === 0,
      has_sizes: false,
    },
  });

  // Watch form values
  const watchHasSizes = form.watch('has_sizes');
  const watchColorCode = form.watch('color_code');
  const watchName = form.watch('name');

  // Reset form when opening dialog
  useEffect(() => {
    if (isDialogOpen) {
      if (editingColor) {
        // Editing existing color
        form.reset({
          name: editingColor.name,
          color_code: editingColor.color_code,
          quantity: editingColor.quantity || 0,
          price: useVariantPrices ? editingColor.price || basePrice : basePrice,
          purchase_price: editingColor.purchase_price || basePurchasePrice,
          image_url: editingColor.image_url || '',
          barcode: editingColor.barcode || '',
          is_default: editingColor.is_default,
          has_sizes: editingColor.has_sizes || false,
        });
        setTempSizes(editingColor.sizes?.map(size => ({
          size_name: size.size_name,
          quantity: size.quantity,
          price: useVariantPrices ? size.price || basePrice : basePrice,
          purchase_price: size.purchase_price || basePurchasePrice,
          barcode: size.barcode || '',
          image_url: size.image_url || '',
        })) || []);
        setImagePreview(editingColor.image_url || null);
        setSelectedColorId(editingColor.id);
      } else {
        // Adding new color
        form.reset({
          name: '',
          color_code: '',
          quantity: 0,
          price: basePrice,
          purchase_price: basePurchasePrice,
          image_url: '',
          barcode: '',
          is_default: colors.length === 0,
          has_sizes: false,
        });
        setTempSizes([]);
        setImagePreview(null);
        setSelectedColorId(null);
      }
      setActiveTab('color');
    }
  }, [isDialogOpen, editingColor, useVariantPrices, basePrice, basePurchasePrice, colors.length]);

  const handleAddColor = () => {
    setEditingColor(null);
    setIsDialogOpen(true);
  };

  const handleEditColor = (color: ProductColor) => {
    setEditingColor(color);
    setIsDialogOpen(true);
  };

  const handleDeleteColor = (colorId: string) => {
    const colorToDelete = colors.find(c => c.id === colorId);
    if (!colorToDelete) return;

    if (!confirm(`هل أنت متأكد من حذف اللون "${colorToDelete.name}"؟`)) return;

    const newColors = colors.filter((c) => c.id !== colorId);
    
    // If we deleted the default color and there are others, make the first one default
    if (colorToDelete.is_default && newColors.length > 0) {
      newColors[0].is_default = true;
    }
    
    onChange(newColors);
    toast.success(`تم حذف اللون "${colorToDelete.name}" بنجاح`);
  };

  // Add a new size row
  const addSizeRow = () => {
    const newSizes = [...tempSizes, { 
      size_name: '', 
      quantity: 0, 
      price: form.getValues('price') || basePrice,
      purchase_price: form.getValues('purchase_price') || basePurchasePrice,
      barcode: '',
      image_url: ''
    }];
    setTempSizes(newSizes);
  };

  // Remove a size row
  const removeSizeRow = (index: number) => {
    if (tempSizes.length <= 1) {
      toast.error('يجب أن تحتوي اللون على مقاس واحد على الأقل');
      return;
    }
    
    const newSizes = tempSizes.filter((_, i) => i !== index);
    setTempSizes(newSizes);
  };

  // Update a size row
  const updateSizeRow = (index: number, field: keyof SizeFormData, value: any) => {
    const newSizes = [...tempSizes];
    newSizes[index] = { ...newSizes[index], [field]: value };
    setTempSizes(newSizes);
  };

  // Handle image upload (simulated)
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    // Simulate upload process
    setTimeout(() => {
      const imageUrl = URL.createObjectURL(file);
      setImagePreview(imageUrl);
      form.setValue('image_url', imageUrl);
      setIsUploading(false);
      toast.success('تم رفع الصورة بنجاح');
    }, 1000);
  };

  // Remove image
  const removeImage = () => {
    setImagePreview(null);
    form.setValue('image_url', '');
  };

  // Submit form
  const onSubmit = (data: ColorFormValues) => {
    try {
      if (editingColor) {
        // Update existing color
        const updatedColors = colors.map(color => {
          if (color.id === editingColor.id) {
            // Calculate total quantity from sizes if sizes exist
            const totalQuantity = data.has_sizes && tempSizes 
              ? tempSizes.reduce((sum, size) => sum + size.quantity, 0)
              : data.quantity;
              
            return {
              ...color,
              name: data.name,
              color_code: data.color_code,
              quantity: totalQuantity,
              price: useVariantPrices ? data.price : basePrice,
              purchase_price: data.purchase_price,
              image_url: data.image_url,
              barcode: data.barcode,
              is_default: data.is_default,
              has_sizes: data.has_sizes,
              sizes: data.has_sizes && tempSizes ? tempSizes.map((size, index) => ({
                id: color.sizes?.[index]?.id || `temp-${Date.now()}-${index}`,
                color_id: color.id,
                product_id: productId,
                size_name: size.size_name,
                quantity: size.quantity,
                price: useVariantPrices ? size.price : (data.price || basePrice),
                purchase_price: size.purchase_price,
                barcode: size.barcode || undefined,
                image_url: size.image_url || undefined,
              })) : undefined
            };
          }
          // If this color is not default, but we're setting a different color as default
          if (data.is_default && color.id !== editingColor.id) {
            return { ...color, is_default: false };
          }
          return color;
        });
        
        onChange(updatedColors);
        toast.success('تم تحديث اللون بنجاح');
      } else {
        // Add new color
        const totalQuantity = data.has_sizes && tempSizes 
          ? tempSizes.reduce((sum, size) => sum + size.quantity, 0)
          : data.quantity;
          
        const newColor: ProductColor = {
          id: `temp-${Date.now()}`,
          product_id: productId,
          name: data.name,
          color_code: data.color_code,
          quantity: totalQuantity,
          price: useVariantPrices ? data.price : basePrice,
          purchase_price: data.purchase_price,
          image_url: data.image_url,
          barcode: data.barcode,
          is_default: data.is_default,
          has_sizes: data.has_sizes,
          sizes: data.has_sizes && tempSizes ? tempSizes.map((size, index) => ({
            id: `temp-${Date.now()}-${index}`,
            color_id: `temp-${Date.now()}`,
            product_id: productId,
            size_name: size.size_name,
            quantity: size.quantity,
            price: useVariantPrices ? size.price : (data.price || basePrice),
            purchase_price: size.purchase_price,
            barcode: size.barcode || undefined,
            image_url: size.image_url || undefined,
          })) : undefined
        };

        // If we're setting this color as default, unset any existing default
        const updatedColors = data.is_default 
          ? colors.map(c => ({ ...c, is_default: false }))
          : [...colors];
          
        updatedColors.push(newColor);
        onChange(updatedColors);
        toast.success('تم إضافة اللون بنجاح');
      }
      
      setIsDialogOpen(false);
    } catch (error) {
      toast.error('حدث خطأ أثناء حفظ اللون');
      console.error(error);
    }
  };

  // Toggle default color
  const toggleDefaultColor = (colorId: string) => {
    const updatedColors = colors.map(color => ({
      ...color,
      is_default: color.id === colorId
    }));
    onChange(updatedColors);
  };

  // Toggle sizes usage
  const toggleUseSizes = (checked: boolean) => {
    onUseSizesChange(checked);
    if (checked) {
      toast.success('تم تفعيل المقاسات! يمكنك الآن إضافة مقاسات للون');
    } else {
      toast.info('تم إلغاء تفعيل المقاسات');
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            إدارة الألوان والمقاسات
          </h3>
          <p className="text-sm text-muted-foreground">
            أضف ألوان المنتج وحدد مقاساته إن وجدت
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center justify-between sm:justify-start gap-4">
            <Label htmlFor="use-sizes" className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              استخدام المقاسات
            </Label>
            <Switch
              id="use-sizes"
              checked={useSizes}
              onCheckedChange={toggleUseSizes}
            />
          </div>
          
          <Button onClick={handleAddColor} className="whitespace-nowrap">
            <Plus className="h-4 w-4 ml-2" />
            إضافة لون
          </Button>
        </div>
      </div>

      {/* Colors List */}
      {colors.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg bg-gradient-to-br from-muted/30 to-muted/10">
          <Palette className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">لا توجد ألوان مضافة</h3>
          <p className="mt-1 text-muted-foreground">
            ابدأ بإضافة لون جديد للمنتج
          </p>
          <Button onClick={handleAddColor} className="mt-4">
            <Plus className="h-4 w-4 ml-2" />
            إضافة لون
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {colors.map((color) => (
            <Card key={color.id} className="overflow-hidden group hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-3 pt-4 relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center"
                      style={{ backgroundColor: color.color_code }}
                    >
                      {color.name && (
                        <span className="text-xs font-bold text-white drop-shadow">
                          {color.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-base">{color.name}</CardTitle>
                  </div>
                  {color.is_default && (
                    <Badge variant="secondary" className="absolute -top-2 -left-2">
                      <Check className="h-3 w-3 ml-1" />
                      افتراضي
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {color.image_url && (
                  <div className="mb-3 rounded-md overflow-hidden">
                    <img 
                      src={color.image_url} 
                      alt={color.name} 
                      className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="text-center p-2 bg-muted/50 rounded-md">
                    <div className="text-xs text-muted-foreground">الكمية</div>
                    <div className="font-bold">{color.quantity}</div>
                  </div>
                  
                  {useVariantPrices && (
                    <div className="text-center p-2 bg-muted/50 rounded-md">
                      <div className="text-xs text-muted-foreground">السعر</div>
                      <div className="font-bold">{color.price || basePrice} دج</div>
                    </div>
                  )}
                  
                  {color.has_sizes && color.sizes && (
                    <div className="col-span-2 text-center p-2 bg-primary/10 rounded-md">
                      <div className="text-xs text-primary/70">المقاسات</div>
                      <div className="font-bold text-primary">{color.sizes.length} مقاس</div>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteColor(color.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditColor(color)}
                  >
                    <Edit2 className="h-4 w-4 ml-2" />
                    تعديل
                  </Button>
                  {!color.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleDefaultColor(color.id)}
                    >
                      <Check className="h-4 w-4 ml-2" />
                      افتراضي
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Color Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              {editingColor ? 'تعديل اللون' : 'إضافة لون جديد'}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'color' | 'sizes')} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="color" className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    تفاصيل اللون
                  </TabsTrigger>
                  {useSizes && (
                    <TabsTrigger 
                      value="sizes" 
                      className="flex items-center gap-2"
                      disabled={!watchHasSizes}
                    >
                      <Package className="h-4 w-4" />
                      المقاسات
                    </TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="color" className="mt-0 space-y-6">
                  {/* Color Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>اسم اللون*</FormLabel>
                            <FormControl>
                              <Input placeholder="مثال: أحمر، أزرق" {...field} />
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
                            <div className="flex gap-2">
                              <FormControl>
                                <Input 
                                  placeholder="#FF0000" 
                                  {...field} 
                                  className="flex-1"
                                />
                              </FormControl>
                              <div 
                                className="w-10 h-10 rounded-md border border-gray-300 flex items-center justify-center"
                                style={{ backgroundColor: field.value || '#cccccc' }}
                              >
                                {watchName && (
                                  <span className="text-xs font-bold text-white drop-shadow">
                                    {watchName.charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="space-y-4">
                      {/* Image Upload */}
                      <div className="space-y-2">
                        <FormLabel>صورة اللون (اختياري)</FormLabel>
                        <div className="flex items-center gap-4">
                          {imagePreview ? (
                            <div className="relative">
                              <img 
                                src={imagePreview} 
                                alt="معاينة اللون" 
                                className="w-20 h-20 object-cover rounded-md border"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute -top-2 -right-2 w-5 h-5 rounded-full"
                                onClick={removeImage}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="w-20 h-20 border-2 border-dashed rounded-md flex items-center justify-center">
                              <Image className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                          
                          <div className="flex-1">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              disabled={isUploading}
                              className="hidden"
                              id="color-image-upload"
                            />
                            <Label 
                              htmlFor="color-image-upload"
                              className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
                            >
                              <Upload className="w-4 h-4" />
                              {isUploading ? 'جاري الرفع...' : 'رفع صورة'}
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              حجم الصورة الموصى به: 400x400 بكسل
                            </p>
                          </div>
                        </div>
                        <input type="hidden" {...form.register('image_url')} />
                      </div>
                      
                      {/* Barcode */}
                      <FormField
                        control={form.control}
                        name="barcode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>الباركود (للون)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input placeholder="باركود للون" {...field} />
                                <Barcode className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  {/* Pricing and Quantity */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الكمية*</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {useVariantPrices && (
                      <>
                        <FormField
                          control={form.control}
                          name="price"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>السعر*</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" step="0.01" {...field} />
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
                              <FormLabel>سعر الشراء</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" step="0.01" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                  </div>
                  
                  {/* Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="is_default"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-x-reverse space-y-0 rounded-lg border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>تعيين كلون افتراضي</FormLabel>
                            <FormDescription>
                              سيتم عرض هذا اللون افتراضياً عند عرض المنتج
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    {useSizes && (
                      <FormField
                        control={form.control}
                        name="has_sizes"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-x-reverse space-y-0 rounded-lg border p-4">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>له مقاسات</FormLabel>
                              <FormDescription>
                                يحتوي هذا اللون على مقاسات مختلفة
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </TabsContent>

                {useSizes && (
                  <TabsContent value="sizes" className="mt-0 space-y-6">
                    {watchHasSizes ? (
                      <>
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-medium">إدارة المقاسات</h3>
                          <Button type="button" variant="outline" onClick={addSizeRow}>
                            <Plus className="h-4 w-4 ml-2" />
                            إضافة مقاس
                          </Button>
                        </div>
                        
                        {tempSizes.length === 0 ? (
                          <div className="text-center py-8 border border-dashed rounded-lg">
                            <Package className="h-12 w-12 mx-auto text-muted-foreground" />
                            <h4 className="mt-4 text-lg font-medium">لا توجد مقاسات مضافة</h4>
                            <p className="mt-1 text-muted-foreground">
                              ابدأ بإضافة مقاس جديد للون
                            </p>
                            <Button onClick={addSizeRow} className="mt-4">
                              <Plus className="h-4 w-4 ml-2" />
                              إضافة مقاس
                            </Button>
                          </div>
                        ) : (
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>الاسم</TableHead>
                                  <TableHead>الكمية</TableHead>
                                  {useVariantPrices && (
                                    <>
                                      <TableHead>السعر</TableHead>
                                      <TableHead>سعر الشراء</TableHead>
                                    </>
                                  )}
                                  <TableHead>الباركود</TableHead>
                                  <TableHead className="w-[100px]">إجراءات</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {tempSizes.map((size, index) => (
                                  <TableRow key={index}>
                                    <TableCell>
                                      <Input
                                        placeholder="مثال: S, M, L"
                                        value={size.size_name}
                                        onChange={(e) => updateSizeRow(index, 'size_name', e.target.value)}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        type="number"
                                        min="0"
                                        value={size.quantity}
                                        onChange={(e) => updateSizeRow(index, 'quantity', parseInt(e.target.value) || 0)}
                                      />
                                    </TableCell>
                                    {useVariantPrices && (
                                      <>
                                        <TableCell>
                                          <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={size.price}
                                            onChange={(e) => updateSizeRow(index, 'price', parseFloat(e.target.value) || 0)}
                                          />
                                        </TableCell>
                                        <TableCell>
                                          <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={size.purchase_price || ''}
                                            onChange={(e) => updateSizeRow(index, 'purchase_price', parseFloat(e.target.value) || 0)}
                                            placeholder="سعر الشراء"
                                          />
                                        </TableCell>
                                      </>
                                    )}
                                    <TableCell>
                                      <Input
                                        placeholder="باركود للمقاس"
                                        value={size.barcode || ''}
                                        onChange={(e) => updateSizeRow(index, 'barcode', e.target.value)}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeSizeRow(index)}
                                        disabled={tempSizes.length <= 1}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
                        <h4 className="mt-4 text-lg font-medium">المقاسات غير مفعلة</h4>
                        <p className="mt-1 text-muted-foreground">
                          قم بتفعيل خيار "له مقاسات" في تبويبة "تفاصيل اللون"
                        </p>
                      </div>
                    )}
                  </TabsContent>
                )}
              </Tabs>
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  إلغاء
                </Button>
                <Button type="submit">
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

export default UnifiedColorSizeManager;