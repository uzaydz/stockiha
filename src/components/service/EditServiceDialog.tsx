import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { updateService } from '@/lib/api/services';
import type { Service } from '@/lib/api/services';
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
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

interface EditServiceDialogProps {
  service: Service;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onServiceUpdated: () => Promise<void>;
  categories: string[];
}

const EditServiceDialog = ({ 
  service, 
  open, 
  onOpenChange, 
  onServiceUpdated,
  categories 
}: EditServiceDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [newCategory, setNewCategory] = useState('');
  
  // initialize form with react-hook-form and zod validation
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: service.name,
      description: service.description || '',
      price: service.price,
      estimated_time: service.estimated_time || '',
      category: service.category || '',
      image: service.image || '',
      is_available: service.is_available,
      is_price_dynamic: service.is_price_dynamic || false,
    },
  });

  // تحديث النموذج عند تغيير الخدمة
  useEffect(() => {
    if (service) {
      form.reset({
        name: service.name,
        description: service.description || '',
        price: service.price,
        estimated_time: service.estimated_time || '',
        category: service.category || '',
        image: service.image || '',
        is_available: service.is_available,
        is_price_dynamic: service.is_price_dynamic || false,
      });
    }
  }, [service, form]);

  const onSubmit = async (values: ServiceFormValues) => {
    setIsSubmitting(true);
    try {
      // إذا تم إدخال فئة جديدة، استخدمها
      const categoryValue = values.category === 'new' ? newCategory : values.category;
      
      await updateService(service.id, {
        name: values.name,
        description: values.description,
        price: values.price,
        estimated_time: values.estimated_time,
        category: categoryValue || undefined,
        image: values.image || undefined,
        is_available: values.is_available,
        is_price_dynamic: values.is_price_dynamic,
      });
      
      toast.success('تم تحديث الخدمة بنجاح');
      onOpenChange(false);
      onServiceUpdated();
    } catch (error) {
      console.error('Error updating service:', error);
      toast.error('حدث خطأ أثناء تحديث الخدمة');
    } finally {
      setIsSubmitting(false);
    }
  };

  // استمع إلى تغييرات الفئة لعرض حقل الفئة الجديدة عند اختيار "فئة جديدة"
  const watchCategory = form.watch('category');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>تعديل الخدمة: {service.name}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                
                {/* الوقت التقديري للخدمة */}
                <FormField
                  control={form.control}
                  name="estimated_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الوقت التقديري للخدمة*</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="أدخل الوقت التقديري للخدمة"
                          {...field}
                        />
                      </FormControl>
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
                          <SelectItem value="">بدون فئة</SelectItem>
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
                  <FormItem>
                    <FormLabel>اسم الفئة الجديدة*</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="أدخل اسم الفئة الجديدة" 
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                      />
                    </FormControl>
                  </FormItem>
                )}
                
                {/* الصورة */}
                <FormField
                  control={form.control}
                  name="image"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الصورة</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="أدخل رابط الصورة"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
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
                      'حفظ التغييرات'
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className={activeTab === 'details' ? 'hidden' : ''}>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
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
                  'حفظ التغييرات'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditServiceDialog; 