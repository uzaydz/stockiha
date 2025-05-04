import { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { createService, getServiceCategories } from '@/lib/api/services';
import { createCategory } from '@/lib/api/categories';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Clock } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTenant } from '@/context/TenantContext';

// Form schema using zod
const serviceSchema = z.object({
  name: z.string().min(2, { message: 'اسم الخدمة مطلوب ويجب أن يكون أكثر من حرفين' }),
  description: z.string().min(1, { message: 'وصف الخدمة مطلوب' }),
  price: z.coerce.number().min(0, { message: 'السعر يجب أن يكون عدداً موجباً' }),
  estimated_time: z.string().min(1, { message: 'الوقت التقديري للخدمة مطلوب' }),
  category: z.string().min(1, { message: 'فئة الخدمة مطلوبة' }),
  image: z.string().optional(),
  is_available: z.boolean().default(true),
  is_price_dynamic: z.boolean().default(false),
  newCategory: z.string().optional(),
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

interface AddServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onServiceAdded: () => Promise<void>;
}

const AddServiceDialog = ({ 
  open, 
  onOpenChange, 
  onServiceAdded,
}: AddServiceDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [newCategory, setNewCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [internalOpen, setInternalOpen] = useState(false);
  const { currentOrganization } = useTenant();
  
  // initialize form with react-hook-form and zod validation
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      estimated_time: '30 دقيقة',
      category: '',
      image: '',
      is_available: true,
      is_price_dynamic: false,
      newCategory: '',
    },
  });
  
  // Synchronize internal state with external open state
  useEffect(() => {
    // Only update internal state if we're opening the dialog
    // This prevents race conditions when closing
    if (open && !internalOpen) {
      setInternalOpen(open);
    }
  }, [open, internalOpen]);
  
  // Clean up when dialog closes
  const handleOpenChange = useCallback((newOpenState: boolean) => {
    // If we're closing, manage our internal state first
    if (!newOpenState) {
      // Don't allow closing while submitting
      if (isSubmitting) {
        return;
      }
      
      // Set internal state first
      setInternalOpen(false);
      // Then tell parent after a small delay
      setTimeout(() => {
        onOpenChange(false);
      }, 0);
    } else {
      setInternalOpen(true);
      onOpenChange(true);
    }
  }, [isSubmitting, onOpenChange]);
  
  // جلب فئات الخدمات عند فتح النافذة
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesData = await getServiceCategories();
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching service categories:', error);
        toast.error('حدث خطأ أثناء تحميل فئات الخدمات');
      }
    };
    
    if (internalOpen) {
      fetchCategories();
    }
  }, [internalOpen]);
  
  // Reset form and state when dialog is closed
  useEffect(() => {
    if (!internalOpen && !open) {
      // Reset form and state on complete closure
      setTimeout(() => {
        form.reset({
          name: '',
          description: '',
          price: 0,
          estimated_time: '30 دقيقة',
          category: '',
          image: '',
          is_available: true,
          is_price_dynamic: false,
          newCategory: '',
        });
        setActiveTab('basic');
        setNewCategory('');
      }, 100);
    }
  }, [internalOpen, open]);
  
  const onSubmit = async (values: ServiceFormValues) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      if (!currentOrganization) {
        toast.error('لم يتم العثور على المؤسسة');
        throw new Error('لم يتم العثور على المؤسسة');
      }
      
      // Handle category logic
      let categoryValue: string | undefined;
      if (values.category === 'new' && values.newCategory) {
        // Check if the new category already exists to avoid duplicates
        if (categories.includes(values.newCategory.trim())) {
          categoryValue = values.newCategory.trim();
        } else {
          categoryValue = values.newCategory.trim();
        }
      } else if (values.category === 'none') {
        categoryValue = undefined;
      } else {
        categoryValue = values.category;
      }
      
      // Generate a slug from the name
      let slug = values.name
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')  // Remove non-word chars
        .replace(/[\s_-]+/g, '-')  // Replace spaces and underscores with hyphens
        .replace(/^-+|-+$/g, '')   // Remove leading/trailing hyphens
        .normalize('NFD')          // Normalize accented characters
        .replace(/[\u0300-\u036f]/g, ''); // Remove diacritics
      
      // For Arabic text or other text that might be completely removed by the above filters,
      // we need to ensure a non-empty slug
      if (!slug || slug.length < 2) {
        // Create a unique slug based on timestamp and random string
        const timestamp = Date.now().toString(36);
        const randomStr = Math.random().toString(36).substring(2, 6);
        slug = `service-${timestamp}-${randomStr}`;
      }
      
      const serviceData = {
        name: values.name,
        description: values.description,
        price: values.price,
        estimated_time: values.estimated_time,
        category: categoryValue || '',
        image: values.image,
        is_available: values.is_available,
        is_price_dynamic: values.is_price_dynamic,
        organization_id: currentOrganization.id,
        slug: slug, // Use the generated slug
      };
      
      await createService(serviceData);
      
      toast.success('تم إضافة الخدمة بنجاح');
      
      // Close the dialog safely
      handleOpenChange(false);
      
      // Call onServiceAdded after a delay to ensure proper cleanup
      setTimeout(() => {
        onServiceAdded();
      }, 300);
    } catch (error) {
      console.error('Error creating service:', error);
      toast.error('حدث خطأ أثناء إضافة الخدمة');
    } finally {
      setIsSubmitting(false);
    }
  };

  // استمع إلى تغييرات الفئة لعرض حقل الفئة الجديدة عند اختيار "فئة جديدة"
  const watchCategory = form.watch('category');

  return (
    <Dialog 
      open={internalOpen} 
      onOpenChange={handleOpenChange}
    >
      <DialogContent className="max-w-lg" aria-describedby="service-dialog-description">
        <DialogHeader>
          <DialogTitle>إضافة خدمة جديدة</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" id="service-dialog-description">
            <Tabs 
              defaultValue="basic" 
              className="w-full" 
              value={activeTab}
              onValueChange={setActiveTab}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">معلومات أساسية</TabsTrigger>
                <TabsTrigger value="details">تفاصيل إضافية</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4 pt-4">
                {/* اسم الخدمة */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم الخدمة*</FormLabel>
                      <FormControl>
                        <Input placeholder="أدخل اسم الخدمة" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* السعر */}
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>سعر الخدمة*</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder="أدخل سعر الخدمة"
                            {...field}
                            disabled={form.watch('is_price_dynamic')}
                          />
                          <div className="absolute inset-y-0 left-0 flex items-center px-3 pointer-events-none text-muted-foreground">
                            دج
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* خيار السعر المفتوح */}
                <FormField
                  control={form.control}
                  name="is_price_dynamic"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>سعر مفتوح</FormLabel>
                        <FormDescription>
                          تمكين هذا الخيار سيسمح بتحديد سعر الخدمة عند إضافتها للطلب في نقطة البيع
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            if (checked) {
                              form.setValue('price', 0);
                            }
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                {/* مدة الخدمة */}
                <FormField
                  control={form.control}
                  name="estimated_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الوقت التقديري للخدمة*</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="text"
                            placeholder="مثال: 30 دقيقة"
                            {...field}
                          />
                          <div className="absolute inset-y-0 left-0 flex items-center px-3 pointer-events-none text-muted-foreground">
                            <Clock className="h-4 w-4 ml-1" />
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription>
                        الوقت التقديري لإكمال هذه الخدمة (مثال: 30 دقيقة، ساعة واحدة، ساعتين)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setActiveTab('details')}
                  >
                    التالي - تفاصيل إضافية
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="details" className="space-y-4 pt-4">
                {/* الوصف */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>وصف الخدمة</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="أدخل وصفاً للخدمة (اختياري)"
                          rows={3} 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* الفئة */}
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>فئة الخدمة</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر فئة الخدمة" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">بدون فئة</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                          <SelectItem value="new">+ فئة جديدة</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* حقل إدخال الفئة الجديدة إذا اختار المستخدم "فئة جديدة" */}
                {watchCategory === 'new' && (
                  <FormField
                    control={form.control}
                    name="newCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>اسم الفئة الجديدة*</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="أدخل اسم الفئة الجديدة" 
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {/* الحالة */}
                <FormField
                  control={form.control}
                  name="is_available"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>الحالة</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          {field.value ? 'الخدمة نشطة ومتاحة للحجز' : 'الخدمة غير نشطة ولا تظهر للعملاء'}
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <div className="pt-2 flex flex-row gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setActiveTab('basic')}
                  >
                    رجوع
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        جاري الحفظ...
                      </>
                    ) : (
                      'حفظ الخدمة'
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className={activeTab === 'details' ? 'hidden' : ''}>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  'حفظ الخدمة'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddServiceDialog; 