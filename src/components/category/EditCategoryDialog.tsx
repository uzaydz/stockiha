import { useState, useEffect, useRef } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { updateCategory } from '@/lib/api/categories';
import type { Category } from '@/lib/api/categories';
import { useTenant } from '@/context/TenantContext';
import { updateLocalCategoryWithImage } from '@/api/localCategoryService';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
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
import { Loader2, CloudOff, Wifi } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import IconSelector from './IconSelector';
import ImageUploader from '@/components/ui/ImageUploader';
import { Badge } from '@/components/ui/badge';

// Form schema using zod
const categorySchema = z.object({
  name: z.string().min(2, { message: 'اسم الفئة مطلوب ويجب أن يكون أكثر من حرفين' }),
  description: z.string().optional(),
  icon: z.string().optional(),
  image_url: z.string().optional(),
  is_active: z.boolean().default(true),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface EditCategoryDialogProps {
  category: Category;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCategoryUpdated: () => Promise<void>;
}

const EditCategoryDialog = ({
  category,
  open,
  onOpenChange,
  onCategoryUpdated
}: EditCategoryDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currentOrganization } = useTenant();
  const { isOnline } = useNetworkStatus();

  // ⚡ حفظ ملف الصورة للاستخدام في الأوفلاين
  const selectedImageFileRef = useRef<File | null>(null);

  // ⚡ معالج اختيار ملف الصورة
  const handleImageFileSelected = (file: File | null) => {
    selectedImageFileRef.current = file;
  };
  
  // Initialize form with react-hook-form and zod validation
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category.name,
      description: category.description || '',
      icon: category.icon || 'FolderRoot',
      image_url: category.image_url || '',
      is_active: category.is_active,
    },
  });

  // Update form when category changes
  useEffect(() => {
    if (category) {
      form.reset({
        name: category.name,
        description: category.description || '',
        icon: category.icon || 'FolderRoot',
        image_url: category.image_url || '',
        is_active: category.is_active,
      });
    }
  }, [category, form]);

  const onSubmit = async (values: CategoryFormValues) => {

    if (!currentOrganization?.id) {
      toast.error('لم يتم العثور على معرف المؤسسة');
      return;
    }

    setIsSubmitting(true);
    try {
      // ⚡ Offline-First: إذا كان أوفلاين أو لدينا صورة محلية
      if (!isOnline || selectedImageFileRef.current) {
        console.log('[EditCategory] ⚡ Using Offline-First mode');

        // تحديث الفئة محلياً مع الصورة
        await updateLocalCategoryWithImage(
          category.id,
          {
            name: values.name,
            description: values.description || null,
            icon: values.icon || null,
            image_url: isOnline ? values.image_url : (category as any).image_url,
            is_active: values.is_active,
          },
          selectedImageFileRef.current || undefined
        );

        toast.success(isOnline ? 'تم تحديث الفئة بنجاح' : 'تم حفظ التغييرات محلياً (ستتم المزامنة عند الاتصال)');
      } else {
        // أونلاين بدون صورة محلية - استخدم الطريقة التقليدية
        const categoryData = {
          name: values.name,
          description: values.description,
          icon: values.icon,
          image_url: values.image_url,
          is_active: values.is_active,
        };

        await updateCategory(category.id, categoryData, currentOrganization.id);
        toast.success('تم تحديث الفئة بنجاح');
      }

      // مسح ملف الصورة المحفوظ
      selectedImageFileRef.current = null;
      onOpenChange(false);
      onCategoryUpdated();
    } catch (error) {

      // التحقق من خطأ تكرار اسم الفئة
      if (error instanceof Error && error.message.includes('duplicate key value violates unique constraint')) {
        toast.error('هذا الاسم موجود بالفعل في فئات مؤسستك، يرجى اختيار اسم آخر للفئة');
        form.setError('name', {
          type: 'manual',
          message: 'هذا الاسم موجود بالفعل في فئات مؤسستك'
        });
      } else {
        toast.error('حدث خطأ أثناء تحديث الفئة');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            تعديل الفئة: {category.name}
            {/* ⚡ مؤشر حالة الاتصال */}
            <Badge
              variant="outline"
              className={isOnline
                ? "bg-green-50 text-green-700 border-green-200 text-xs"
                : "bg-orange-50 text-orange-700 border-orange-200 text-xs"
              }
            >
              {isOnline ? (
                <>
                  <Wifi className="h-3 w-3 ml-1" />
                  متصل
                </>
              ) : (
                <>
                  <CloudOff className="h-3 w-3 ml-1" />
                  أوفلاين
                </>
              )}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Category Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم الفئة*</FormLabel>
                  <FormControl>
                    <Input placeholder="أدخل اسم الفئة" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>وصف الفئة</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="أدخل وصفاً للفئة (اختياري)"
                      rows={3} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* صورة الفئة */}
            <FormField
              control={form.control}
              name="image_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    صورة الفئة
                    {!isOnline && (
                      <span className="text-xs text-orange-600 mr-2">(سيتم حفظها محلياً)</span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <ImageUploader
                      imageUrl={field.value || (category as any).image_base64 || ''}
                      onImageUploaded={field.onChange}
                      onFileSelected={handleImageFileSelected}
                      offlineMode={!isOnline}
                      folder="categories"
                      aspectRatio="1:1"
                      maxSizeInMB={1}
                      label=""
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Icon Selector */}
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>أيقونة الفئة</FormLabel>
                  <FormControl>
                    <IconSelector value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Active Status */}
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>الحالة</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      {field.value ? 'الفئة نشطة ومرئية للمستخدمين' : 'الفئة غير نشطة وغير مرئية للمستخدمين'}
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
            
            {/* Slug (readonly) */}
            <div className="rounded-lg border p-3">
              <div className="font-medium mb-1">الرابط الدائم</div>
              <div className="text-sm text-muted-foreground" dir="ltr">{category.slug}</div>
              <div className="text-xs text-muted-foreground mt-1">
                يتم إنشاء الرابط الدائم تلقائياً من اسم الفئة ولا يمكن تعديله مباشرة.
              </div>
            </div>
            
            <DialogFooter>
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

export default EditCategoryDialog;
