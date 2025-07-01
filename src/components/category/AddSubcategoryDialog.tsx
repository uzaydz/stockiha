import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { createSubcategory } from '@/lib/api/categories';
import type { Category } from '@/lib/api/categories';
import { clearSubcategoriesCache } from '@/lib/cache-utils';
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

// Form schema using zod
const subcategorySchema = z.object({
  name: z.string().min(2, { message: 'اسم الفئة الفرعية مطلوب ويجب أن يكون أكثر من حرفين' }),
  description: z.string().optional(),
});

type SubcategoryFormValues = z.infer<typeof subcategorySchema>;

interface AddSubcategoryDialogProps {
  parentCategory: Category;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubcategoryAdded: () => Promise<void>;
}

const AddSubcategoryDialog = ({ parentCategory, open, onOpenChange, onSubcategoryAdded }: AddSubcategoryDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Initialize form with react-hook-form and zod validation
  const form = useForm<SubcategoryFormValues>({
    resolver: zodResolver(subcategorySchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const onSubmit = async (values: SubcategoryFormValues) => {
    setIsSubmitting(true);
    try {
      const subcategoryData = {
        category_id: parentCategory.id,
        name: values.name,
        description: values.description,
        organization_id: parentCategory.organization_id,
      };
      
      await createSubcategory(subcategoryData);
      
      // تنظيف cache الفئات الفرعية
      clearSubcategoriesCache(parentCategory.organization_id);
      
      toast.success('تم إضافة الفئة الفرعية بنجاح');
      form.reset();
      onOpenChange(false);
      onSubcategoryAdded();
    } catch (error) {
      // Check for duplicate subcategory name error
      if (error instanceof Error && error.message.includes('duplicate key value violates unique constraint')) {
        toast.error('هذا الاسم موجود بالفعل، يرجى اختيار اسم آخر للفئة الفرعية');
        form.setError('name', { 
          type: 'manual', 
          message: 'هذا الاسم موجود بالفعل' 
        });
      } else {
        toast.error('حدث خطأ أثناء إضافة الفئة الفرعية');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>إضافة فئة فرعية لـ: {parentCategory.name}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Subcategory Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم الفئة الفرعية*</FormLabel>
                  <FormControl>
                    <Input placeholder="أدخل اسم الفئة الفرعية" {...field} />
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
                  <FormLabel>وصف الفئة الفرعية</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="أدخل وصفاً للفئة الفرعية (اختياري)"
                      rows={3} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
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
                  'حفظ الفئة الفرعية'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddSubcategoryDialog;
