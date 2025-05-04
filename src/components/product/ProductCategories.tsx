import { useState } from 'react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from "@/types/product";
import { type Category, type Subcategory, createCategory, createSubcategory } from '@/lib/api/categories';
import { toast } from 'sonner';

interface ProductCategoriesProps {
  form: UseFormReturn<ProductFormValues>;
  categories: Category[];
  subcategories: Subcategory[];
  onCategoryCreated: (category: Category) => void;
  onSubcategoryCreated: (subcategory: Subcategory) => void;
}

export default function ProductCategories({ 
  form, 
  categories, 
  subcategories, 
  onCategoryCreated,
  onSubcategoryCreated
}: ProductCategoriesProps) {
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  
  const [showNewSubcategoryInput, setShowNewSubcategoryInput] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [isCreatingSubcategory, setIsCreatingSubcategory] = useState(false);
  
  const watchCategoryId = form.watch('category_id');
  
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('يرجى إدخال اسم للفئة');
      return;
    }
    
    setIsCreatingCategory(true);
    try {
      const newCategory = await createCategory({
        name: newCategoryName,
        description: '',
      });
      
      onCategoryCreated(newCategory);
      form.setValue('category_id', newCategory.id);
      setNewCategoryName('');
      setShowNewCategoryInput(false);
      toast.success('تم إنشاء الفئة بنجاح');
    } catch (error) {
      console.error('خطأ في إنشاء الفئة:', error);
      toast.error('حدث خطأ أثناء إنشاء الفئة');
    } finally {
      setIsCreatingCategory(false);
    }
  };
  
  const handleCreateSubcategory = async () => {
    if (!watchCategoryId) {
      toast.error('يرجى اختيار فئة أولاً');
      return;
    }
    
    if (!newSubcategoryName.trim()) {
      toast.error('يرجى إدخال اسم للفئة الفرعية');
      return;
    }
    
    setIsCreatingSubcategory(true);
    try {
      const newSubcategory = await createSubcategory({
        name: newSubcategoryName,
        category_id: watchCategoryId,
      });
      
      onSubcategoryCreated(newSubcategory);
      form.setValue('subcategory_id', newSubcategory.id);
      setNewSubcategoryName('');
      setShowNewSubcategoryInput(false);
      toast.success('تم إنشاء الفئة الفرعية بنجاح');
    } catch (error) {
      console.error('خطأ في إنشاء الفئة الفرعية:', error);
      toast.error('حدث خطأ أثناء إنشاء الفئة الفرعية');
    } finally {
      setIsCreatingSubcategory(false);
    }
  };

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="category_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>الفئة*</FormLabel>
            <div className="flex gap-2">
              {showNewCategoryInput ? (
                <div className="flex-1 flex gap-2">
                  <Input
                    placeholder="اسم الفئة الجديدة"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                  />
                  <Button 
                    type="button"
                    onClick={handleCreateCategory}
                    disabled={isCreatingCategory}
                  >
                    {isCreatingCategory ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'إضافة'
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => {
                      setShowNewCategoryInput(false);
                      setNewCategoryName('');
                    }}
                  >
                    إلغاء
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex-1">
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر فئة" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => setShowNewCategoryInput(true)}
                  >
                    <Plus className="h-4 w-4 ml-1" />
                    فئة جديدة
                  </Button>
                </>
              )}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="subcategory_id"
        render={({ field }) => (
          <FormItem className="space-y-1">
            <FormLabel>الفئة الفرعية</FormLabel>
            <div className="flex gap-2">
              {showNewSubcategoryInput ? (
                <div className="flex-1 flex gap-2">
                  <Input
                    placeholder="اسم الفئة الفرعية الجديدة"
                    value={newSubcategoryName}
                    onChange={(e) => setNewSubcategoryName(e.target.value)}
                  />
                  <Button 
                    type="button"
                    onClick={handleCreateSubcategory}
                    disabled={isCreatingSubcategory || !watchCategoryId}
                  >
                    {isCreatingSubcategory ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'إضافة'
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => {
                      setShowNewSubcategoryInput(false);
                      setNewSubcategoryName('');
                    }}
                  >
                    إلغاء
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex-1">
                    <Select
                      value={field.value || ''}
                      onValueChange={field.onChange}
                      disabled={!watchCategoryId || subcategories.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={!watchCategoryId ? 'اختر فئة أولاً' : 'اختر فئة فرعية (اختياري)'} />
                      </SelectTrigger>
                      <SelectContent>
                        {subcategories.map((subcategory) => (
                          <SelectItem key={subcategory.id} value={subcategory.id}>
                            {subcategory.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => setShowNewSubcategoryInput(true)}
                    disabled={!watchCategoryId}
                  >
                    <Plus className="h-4 w-4 ml-1" />
                    فئة فرعية
                  </Button>
                </>
              )}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
} 