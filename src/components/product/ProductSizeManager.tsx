import { useState } from 'react';
import { Plus, Edit2, Trash2, Check, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ProductSize } from '@/types/product';
import { generateLocalVariantBarcode } from '@/lib/api/indexedDBProducts';
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
import { Switch } from '@/components/ui/switch';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader } from '../ui/card';

// Form schema for adding/editing a product size
const sizeFormSchema = z.object({
  size_name: z.string().min(1, { message: 'اسم المقاس مطلوب' }),
  quantity: z.coerce.number().min(0, { message: 'الكمية يجب أن تكون أكبر من أو تساوي صفر' }),
  price: z.coerce.number().min(0, { message: 'السعر يجب أن يكون أكبر من أو تساوي صفر' }),
  barcode: z.string().optional().nullable(),
  is_default: z.boolean().default(false),
});

type SizeFormValues = z.infer<typeof sizeFormSchema>;

interface ProductSizeManagerProps {
  sizes: ProductSize[];
  onChange: (sizes: ProductSize[]) => void;
  basePrice: number;
  colorId: string;
  productId: string;
  useVariantPrices: boolean;
}

const ProductSizeManager = ({
  sizes,
  onChange,
  basePrice,
  colorId,
  productId,
  useVariantPrices,
}: ProductSizeManagerProps) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSize, setEditingSize] = useState<ProductSize | null>(null);
  const [generatingBarcode, setGeneratingBarcode] = useState(false);

  const form = useForm<SizeFormValues>({
    resolver: zodResolver(sizeFormSchema),
    defaultValues: {
      size_name: '',
      quantity: 0,
      price: basePrice,
      barcode: '',
      is_default: false,
    },
  });

  const onAddSizeClick = () => {
    form.reset({
      size_name: '',
      quantity: 0,
      price: basePrice,
      barcode: '',
      is_default: sizes.length === 0, // Make first size default if none exists
    });
    setEditingSize(null);
    setIsAddDialogOpen(true);
  };

  const onEditSizeClick = (size: ProductSize) => {
    form.reset({
      size_name: size.size_name,
      quantity: size.quantity,
      price: size.price || basePrice,
      barcode: size.barcode || '',
      is_default: size.is_default,
    });
    setEditingSize(size);
    setIsAddDialogOpen(true);
  };

  const onDeleteSizeClick = (sizeId: string) => {
    const newSizes = sizes.filter((s) => s.id !== sizeId);
    
    // If we deleted the default size and there are other sizes, make the first one default
    if (sizes.find((s) => s.id === sizeId)?.is_default && newSizes.length > 0) {
      newSizes[0].is_default = true;
    }
    
    onChange(newSizes);
  };

  const handleGenerateBarcode = async () => {
    try {
      setGeneratingBarcode(true);
      
      // توليد باركود فريد للمقاس
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const generatedBarcode = `SIZE-${timestamp}-${random}`;
      
      // تحديث قيمة حقل الباركود في النموذج
      form.setValue('barcode', generatedBarcode);
      toast.success('تم توليد الباركود بنجاح');
    } catch (error) {
      console.error('Error generating barcode:', error);
      toast.error('حدث خطأ أثناء توليد الباركود');
    } finally {
      setGeneratingBarcode(false);
    }
  };

  const onSubmit = (values: SizeFormValues) => {
    let updatedSizes: ProductSize[] = [...sizes];
    
    if (editingSize) {
      // Update existing size
      updatedSizes = updatedSizes.map((s) => {
        if (s.id === editingSize.id) {
          return {
            ...s,
            size_name: values.size_name,
            quantity: values.quantity,
            price: useVariantPrices ? values.price : basePrice,
            barcode: values.barcode || undefined,
            is_default: values.is_default,
          };
        }
        // If this size is not default, but we're setting a different size as default
        if (values.is_default && s.id !== editingSize.id) {
          return { ...s, is_default: false };
        }
        return s;
      });
    } else {
      // Add new size
      const newSize: ProductSize = {
        id: `temp-${Date.now()}`, // Temporary ID until saved to database
        color_id: colorId,
        product_id: productId,
        size_name: values.size_name,
        quantity: values.quantity,
        price: useVariantPrices ? values.price : basePrice,
        is_default: values.is_default,
      };

      // إضافة الباركود إذا تم توفيره
      if (values.barcode) {
        newSize.barcode = values.barcode;
      }
      
      // If we're setting this size as default, unset any existing default
      if (values.is_default) {
        updatedSizes = updatedSizes.map((s) => ({
          ...s,
          is_default: false,
        }));
      }
      
      updatedSizes.push(newSize);
    }
    
    // If no size is default, make the first one default
    if (!updatedSizes.some((s) => s.is_default) && updatedSizes.length > 0) {
      updatedSizes[0].is_default = true;
    }
    
    // تحديث المقاسات في الذاكرة فقط، بدون حفظ تلقائي
    onChange(updatedSizes);
    
    // إغلاق مربع الحوار بعد الإضافة/التعديل
    setIsAddDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">مقاسات اللون</h3>
        <Button 
          type="button"
          variant="outline" 
          size="sm" 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAddSizeClick();
          }}
        >
          <Plus className="h-4 w-4 ml-2" />
          إضافة مقاس
        </Button>
      </div>
      
      {sizes.length === 0 ? (
        <div className="text-center p-8 border border-dashed rounded-lg">
          <p className="text-muted-foreground">لا توجد مقاسات مضافة لهذا اللون</p>
          <Button 
            type="button"
            variant="outline" 
            className="mt-2" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddSizeClick();
            }}
          >
            <Plus className="h-4 w-4 ml-2" />
            إضافة مقاس
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sizes.map((size) => (
            <Card key={size.id} className="overflow-hidden">
              <CardHeader className="pb-1 pt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <h3 className="font-medium">{size.size_name}</h3>
                    {size.is_default && (
                      <Badge variant="secondary" className="mr-2">
                        <Check className="h-3 w-3 ml-1" />
                        افتراضي
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-2">
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div>
                    <span className="text-muted-foreground">السعر:</span>{' '}
                    <span className="font-medium">{size.price || basePrice} ر.س</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">الكمية:</span>{' '}
                    <span className="font-medium">{size.quantity}</span>
                  </div>
                  {size.barcode && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">الباركود:</span>{' '}
                      <span className="font-mono text-xs">{size.barcode}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end mt-3 gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDeleteSizeClick(size.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onEditSizeClick(size);
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
      
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent onPointerDownOutside={(e) => {
          // منع إغلاق مربع الحوار عند النقر خارجه عند تقديم النموذج
          e.preventDefault();
        }}>
          <DialogHeader>
            <DialogTitle>{editingSize ? 'تعديل المقاس' : 'إضافة مقاس جديد'}</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={(e) => {
              // منع السلوك الافتراضي لتقديم النموذج
              e.preventDefault();
              e.stopPropagation();
            }} className="space-y-4">
              <FormField
                control={form.control}
                name="size_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم المقاس*</FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: XL أو 42" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الكمية المتاحة*</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>سعر المقاس*</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01"
                          disabled={!useVariantPrices}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="barcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الباركود (للمقاس)</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input placeholder="باركود للمقاس" {...field} />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleGenerateBarcode();
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
              
              <FormField
                control={form.control}
                name="is_default"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-x-reverse space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={sizes.length === 0}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>المقاس الافتراضي</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        هذا المقاس سيظهر افتراضياً عند عرض اللون
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
                  {editingSize ? 'تحديث المقاس' : 'إضافة المقاس'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductSizeManager; 