import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  FolderPlus, 
  Tag, 
  Edit3, 
  Trash2, 
  Loader2,
  X,
  Check,
  Palette
} from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';
import { ExpenseCategory, ExpenseCategoryFormData } from '@/types/expenses';

const categorySchema = z.object({
  name: z.string().min(2, 'يجب أن يحتوي اسم الفئة على حرفين على الأقل'),
  description: z.string().optional(),
  icon: z.string().optional(),
});

interface QuickCategoryManagerProps {
  onCategorySelect?: (categoryId: string) => void;
}

const QuickCategoryManager: React.FC<QuickCategoryManagerProps> = ({
  onCategorySelect,
}) => {
  const { 
    useExpenseCategoriesQuery, 
    useCreateExpenseCategoryMutation,
    useUpdateExpenseCategoryMutation,
    useDeleteExpenseCategoryMutation
  } = useExpenses();
  
  const { data: categories, isLoading } = useExpenseCategoriesQuery();
  const createCategoryMutation = useCreateExpenseCategoryMutation();
  const updateCategoryMutation = useUpdateExpenseCategoryMutation();
  const deleteCategoryMutation = useDeleteExpenseCategoryMutation();
  
  const [isOpen, setIsOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<string>('📁');

  const form = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      description: '',
      icon: '📁',
    },
  });

  // إعادة تعيين النموذج عند فتح الحوار أو عند التعديل
  React.useEffect(() => {
    if (editingCategory) {
      form.reset({
        name: editingCategory.name,
        description: editingCategory.description || '',
        icon: editingCategory.icon || '📁',
      });
      setSelectedIcon(editingCategory.icon || '📁');
    } else {
      form.reset({
        name: '',
        description: '',
        icon: '📁',
      });
      setSelectedIcon('📁');
    }
  }, [editingCategory, form]);

  const handleSubmit = async (values: z.infer<typeof categorySchema>) => {
    try {
      const categoryData: ExpenseCategoryFormData = {
        name: values.name,
        description: values.description || '',
        icon: selectedIcon,
      };

      if (editingCategory) {
        await updateCategoryMutation.mutateAsync({
          id: editingCategory.id,
          data: categoryData,
        });
        toast.success('تم تحديث الفئة بنجاح');
        setEditingCategory(null);
      } else {
        const newCategory = await createCategoryMutation.mutateAsync(categoryData);
        toast.success('تم إنشاء الفئة بنجاح');
        
        // تحديد الفئة الجديدة إذا كان هناك callback
        if (onCategorySelect) {
          onCategorySelect(newCategory.id);
        }
      }
      
      form.reset();
      setSelectedIcon('📁');
    } catch (error) {
      toast.error(editingCategory ? 'فشل في تحديث الفئة' : 'فشل في إنشاء الفئة');
    }
  };

  const handleDeleteCategory = async (category: ExpenseCategory) => {
    if (window.confirm(`هل أنت متأكد من حذف فئة "${category.name}"؟`)) {
      try {
        await deleteCategoryMutation.mutateAsync(category.id);
        toast.success('تم حذف الفئة بنجاح');
      } catch (error) {
        toast.error('فشل في حذف الفئة');
      }
    }
  };

  const availableIcons = [
    '📁', '💰', '🏪', '⚡', '📱', '🚗', '🍔', '📚', 
    '👥', '🔧', '📢', '🧽', '💡', '📦', '🏠', '🎯',
    '💳', '📊', '🛒', '🎨', '💻', '📞', '🌐', '🎁'
  ];

  const predefinedCategories = [
    { name: 'أجور الموظفين', icon: '👥', description: 'رواتب ومكافآت الموظفين' },
    { name: 'إيجار المحل', icon: '🏪', description: 'إيجار المتجر الشهري' },
    { name: 'فواتير الكهرباء', icon: '⚡', description: 'فواتير الطاقة والكهرباء' },
    { name: 'مصاريف التسويق', icon: '📢', description: 'إعلانات ومواد تسويقية' },
    { name: 'صيانة وإصلاح', icon: '🔧', description: 'صيانة المعدات والأجهزة' },
    { name: 'مواد التنظيف', icon: '🧽', description: 'مستلزمات التنظيف والنظافة' },
  ];

  const isSubmitting = createCategoryMutation.isPending || updateCategoryMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FolderPlus className="h-4 w-4" />
          إدارة الفئات
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-2xl max-h-[85vh]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="bg-blue-100 p-2 rounded-lg">
              <FolderPlus className="h-5 w-5 text-blue-600" />
            </div>
            إدارة فئات المصروفات
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            أضف أو عدل أو احذف فئات المصروفات
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* قائمة الفئات الحالية */}
          <div className="space-y-4">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Tag className="h-4 w-4" />
              الفئات الحالية ({categories?.length || 0})
            </h3>
            
            <ScrollArea className="h-[400px] border rounded-lg p-3">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="mr-2">جاري التحميل...</span>
                </div>
              ) : categories && categories.length > 0 ? (
                <div className="space-y-2">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{category.icon || '📁'}</span>
                        <div>
                          <h4 className="font-medium text-sm">{category.name}</h4>
                          {category.description && (
                            <p className="text-xs text-muted-foreground">
                              {category.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingCategory(category)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCategory(category)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <FolderPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>لا توجد فئات مصروفات حتى الآن</p>
                  <p className="text-xs">أضف فئة جديدة للبدء</p>
                </div>
              )}
            </ScrollArea>
          </div>

          {/* نموذج إضافة/تعديل فئة */}
          <div className="space-y-4">
            <h3 className="font-semibold text-base flex items-center gap-2">
              {editingCategory ? <Edit3 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingCategory ? 'تعديل الفئة' : 'إضافة فئة جديدة'}
            </h3>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                
                {/* اسم الفئة */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">اسم الفئة</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="مثال: أجور الموظفين"
                          {...field}
                          className="text-right"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* الرمز التعبيري */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">الرمز التعبيري</label>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{selectedIcon}</span>
                    <span className="text-sm text-muted-foreground">المحدد حالياً</span>
                  </div>
                  <div className="grid grid-cols-8 gap-1 max-h-24 overflow-y-auto border rounded p-2">
                    {availableIcons.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setSelectedIcon(icon)}
                        className={`text-lg p-1 rounded hover:bg-muted ${
                          selectedIcon === icon ? 'bg-primary/10 ring-2 ring-primary' : ''
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                {/* الوصف */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">الوصف (اختياري)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="وصف مختصر للفئة..."
                          rows={2}
                          {...field}
                          className="text-right resize-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* فئات مقترحة */}
                {!editingCategory && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">فئات مقترحة</label>
                    <div className="flex flex-wrap gap-1">
                      {predefinedCategories.map((cat) => (
                        <Badge
                          key={cat.name}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary/10 text-xs"
                          onClick={() => {
                            form.setValue('name', cat.name);
                            form.setValue('description', cat.description);
                            setSelectedIcon(cat.icon);
                          }}
                        >
                          {cat.icon} {cat.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* أزرار الحفظ والإلغاء */}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    ) : editingCategory ? (
                      <Check className="h-4 w-4 ml-2" />
                    ) : (
                      <Plus className="h-4 w-4 ml-2" />
                    )}
                    {editingCategory ? 'تحديث الفئة' : 'إضافة الفئة'}
                  </Button>
                  {editingCategory && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingCategory(null);
                        form.reset();
                        setSelectedIcon('📁');
                      }}
                    >
                      <X className="h-4 w-4 ml-2" />
                      إلغاء التعديل
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickCategoryManager;
