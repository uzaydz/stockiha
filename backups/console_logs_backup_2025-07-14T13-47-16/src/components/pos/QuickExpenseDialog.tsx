import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Receipt, 
  Plus, 
  DollarSign, 
  Calendar, 
  Tag, 
  StickyNote,
  Loader2,
  X
} from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';
import { ExpenseFormData } from '@/types/expenses';

const quickExpenseSchema = z.object({
  title: z.string().min(2, 'يجب أن يحتوي العنوان على حرفين على الأقل'),
  amount: z.coerce.number().positive('يجب أن يكون المبلغ أكبر من صفر'),
  category: z.string().min(1, 'يرجى اختيار فئة'),
  notes: z.string().optional(),
});

interface QuickExpenseDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const QuickExpenseDialog: React.FC<QuickExpenseDialogProps> = ({
  isOpen,
  onOpenChange,
}) => {
  const { 
    useExpenseCategoriesQuery, 
    useCreateExpenseMutation,
    useCreateExpenseCategoryMutation 
  } = useExpenses();
  
  const { data: categories, isLoading: categoriesLoading } = useExpenseCategoriesQuery();
  const createExpenseMutation = useCreateExpenseMutation();
  const createCategoryMutation = useCreateExpenseCategoryMutation();
  
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  const form = useForm<z.infer<typeof quickExpenseSchema>>({
    resolver: zodResolver(quickExpenseSchema),
    defaultValues: {
      title: '',
      amount: 0,
      category: '',
      notes: '',
    },
  });

  // إعادة تعيين النموذج عند فتح الحوار
  useEffect(() => {
    if (isOpen) {
      form.reset();
      setShowNewCategoryForm(false);
      setNewCategoryName('');
    }
  }, [isOpen, form]);

  const handleSubmit = async (values: z.infer<typeof quickExpenseSchema>) => {
    try {
      const expenseData: ExpenseFormData = {
        title: values.title,
        amount: values.amount,
        category: values.category,
        expense_date: new Date(), // التاريخ الحالي
        notes: values.notes || '',
        status: 'completed',
        is_recurring: false,
      };

      await createExpenseMutation.mutateAsync(expenseData);
      
      toast.success('تم إضافة المصروف بنجاح', {
        description: `تم إضافة مصروف "${values.title}" بقيمة ${values.amount} د.ج`,
      });
      
      onOpenChange(false);
    } catch (error) {
      toast.error('فشل في إضافة المصروف', {
        description: 'حدث خطأ أثناء إضافة المصروف. يرجى المحاولة مرة أخرى.',
      });
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('يرجى إدخال اسم الفئة');
      return;
    }

    setIsCreatingCategory(true);
    try {
      const newCategory = await createCategoryMutation.mutateAsync({
        name: newCategoryName.trim(),
        description: `فئة مصروفات ${newCategoryName.trim()}`,
      });

      // تحديث قيمة الفئة في النموذج
      form.setValue('category', newCategory.id);
      
      toast.success('تم إنشاء الفئة بنجاح', {
        description: `تم إنشاء فئة "${newCategoryName}" وتحديدها`,
      });
      
      setShowNewCategoryForm(false);
      setNewCategoryName('');
    } catch (error) {
      toast.error('فشل في إنشاء الفئة', {
        description: 'حدث خطأ أثناء إنشاء الفئة. يرجى المحاولة مرة أخرى.',
      });
    } finally {
      setIsCreatingCategory(false);
    }
  };



  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="bg-orange-100 p-2 rounded-lg">
              <Receipt className="h-5 w-5 text-orange-600" />
            </div>
            مصروف سريع
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            إضافة مصروف فوري مع التاريخ والوقت الحاليين
          </p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            
            {/* عنوان المصروف */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-sm font-medium">
                    <Tag className="h-4 w-4 text-primary" />
                    عنوان المصروف
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="مثال: أجرة توصيل البضاعة"
                      {...field}
                      className="text-right"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* المبلغ */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-sm font-medium">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    المبلغ (د.ج)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                      className="text-right"
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
                  <FormLabel className="flex items-center gap-2 text-sm font-medium">
                    <Tag className="h-4 w-4 text-blue-600" />
                    الفئة
                  </FormLabel>
                  <div className="space-y-2">
                    {!showNewCategoryForm ? (
                      <div className="space-y-2">
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={categoriesLoading}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="اختر الفئة أو أنشئ جديدة" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories?.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowNewCategoryForm(true)}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 ml-2" />
                          إضافة فئة جديدة
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">إنشاء فئة جديدة</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowNewCategoryForm(false);
                              setNewCategoryName('');
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <Input
                          placeholder="اسم الفئة الجديدة"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          className="text-right"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleCreateCategory}
                          disabled={isCreatingCategory || !newCategoryName.trim()}
                          className="w-full"
                        >
                          {isCreatingCategory ? (
                            <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4 ml-2" />
                          )}
                          إنشاء وتحديد
                        </Button>
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* الملاحظات */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-sm font-medium">
                    <StickyNote className="h-4 w-4 text-purple-600" />
                    ملاحظات (اختياري)
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="تفاصيل إضافية عن المصروف..."
                      rows={2}
                      {...field}
                      className="text-right resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* معلومات إضافية */}
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">التاريخ والوقت:</span>
                <span>{new Date().toLocaleDateString('ar-DZ')} - {new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            {/* أزرار الحفظ والإلغاء */}
            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={createExpenseMutation.isPending}
                className="flex-1"
              >
                {createExpenseMutation.isPending ? (
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                ) : (
                  <Receipt className="h-4 w-4 ml-2" />
                )}
                حفظ المصروف
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createExpenseMutation.isPending}
              >
                إلغاء
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default QuickExpenseDialog;
