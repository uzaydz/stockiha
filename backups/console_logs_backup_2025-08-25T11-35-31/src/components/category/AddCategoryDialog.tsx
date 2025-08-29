import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import IconSelector from './IconSelector';
import ImageUploader from '@/components/ui/ImageUploader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTenant } from '@/context/TenantContext';

// Form schema using zod
const categorySchema = z.object({
  name: z.string().min(2, { message: 'اسم الفئة مطلوب ويجب أن يكون أكثر من حرفين' }),
  description: z.string().optional(),
  icon: z.string().optional(),
  image_url: z.string().optional(),
  is_active: z.boolean().default(true),
  type: z.enum(['product', 'service'], { 
    required_error: 'يرجى تحديد نوع الفئة' 
  }),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface AddCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCategoryAdded: () => Promise<void>;
}

const AddCategoryDialog = ({ open, onOpenChange, onCategoryAdded }: AddCategoryDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currentOrganization } = useTenant();
  
  // Initialize form with react-hook-form and zod validation
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      description: '',
      icon: 'FolderRoot',
      image_url: '',
      is_active: true,
      type: 'product',
    },
  });

  const onSubmit = async (values: CategoryFormValues) => {

    if (!currentOrganization?.id) {
      toast.error('لم يتم العثور على معرف المؤسسة');
      return;
    }

    setIsSubmitting(true);
    try {
      const categoryData = {
        name: values.name,
        description: values.description,
        icon: values.icon,
        image_url: values.image_url,
        is_active: values.is_active,
        type: values.type,
      };

      const createdCategory = await createCategory(categoryData, currentOrganization.id);

      toast.success('تم إضافة الفئة بنجاح');
      form.reset();
      onOpenChange(false);
      
      await onCategoryAdded();
      
    } catch (error) {
      
      // Check for duplicate category name error
      if (error instanceof Error && error.message.includes('duplicate key value violates unique constraint')) {
        toast.error('هذا الاسم موجود بالفعل في فئات مؤسستك، يرجى اختيار اسم آخر للفئة');
        form.setError('name', { 
          type: 'manual', 
          message: 'هذا الاسم موجود بالفعل في فئات مؤسستك' 
        });
      } else {
        toast.error('حدث خطأ أثناء إضافة الفئة');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="backdrop-blur-sm bg-background/95 rounded-xl">
        <DialogHeader className="border-b border-border/20 pb-4">
          <DialogTitle className="text-xl font-bold text-center">إضافة فئة جديدة</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-2">
            {/* Category Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">اسم الفئة*</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="أدخل اسم الفئة" 
                      {...field} 
                      className="focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            
            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">وصف الفئة</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="أدخل وصفاً للفئة (اختياري)"
                      rows={3} 
                      {...field} 
                      className="focus:ring-2 focus:ring-primary/20 resize-none transition-all"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            
            {/* صورة الفئة */}
            <FormField
              control={form.control}
              name="image_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">صورة الفئة</FormLabel>
                  <FormControl>
                    <ImageUploader
                      imageUrl={field.value || ''}
                      onImageUploaded={field.onChange}
                      folder="categories"
                      aspectRatio="1:1"
                      maxSizeInMB={1}
                      label=""
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            
            {/* Icon Selector */}
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">أيقونة الفئة</FormLabel>
                  <FormControl>
                    <IconSelector value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* نوع الفئة */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">نوع الفئة*</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="focus:ring-2 focus:ring-primary/20 transition-all">
                        <SelectValue placeholder="اختر نوع الفئة" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="product">فئة منتجات</SelectItem>
                      <SelectItem value="service">فئة خدمات</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* Active Status */}
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border/50 p-3 shadow-sm hover:shadow-md transition-all">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm font-medium">الحالة</FormLabel>
                    <div className="text-xs text-muted-foreground">
                      {field.value ? 'الفئة نشطة ومرئية للمستخدمين' : 'الفئة غير نشطة وغير مرئية للمستخدمين'}
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-primary"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <DialogFooter className="mt-6 pt-4 border-t border-border/20 flex flex-col sm:flex-row gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto order-2 sm:order-1 border-border/60 hover:bg-muted/20 transition-all"
              >
                إلغاء
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full sm:w-auto order-1 sm:order-2 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  'حفظ الفئة'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCategoryDialog;
