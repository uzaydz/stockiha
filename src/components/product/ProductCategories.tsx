import { useState } from 'react';
import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, FolderPlus, Folder, Tag, Tags, PlusCircle, FolderTree } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from "@/types/product";
import { type Category, type Subcategory, createCategory, createSubcategory } from '@/lib/api/categories';
import { toast } from 'sonner';
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ProductCategoriesProps {
  form: UseFormReturn<ProductFormValues>;
  categories: Category[];
  subcategories: Subcategory[];
  onCategoryCreated: (category: Category) => void;
  onSubcategoryCreated: (subcategory: Subcategory) => void;
  organizationId?: string;
}

export default function ProductCategories({ 
  form, 
  categories, 
  subcategories, 
  onCategoryCreated,
  onSubcategoryCreated,
  organizationId = ''
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
    
    if (!organizationId || organizationId.trim() === '') {
      toast.error('خطأ: لم يتم تحديد معرف المؤسسة. يرجى إعادة تحميل الصفحة والمحاولة مرة أخرى.');
      return;
    }
    
    setIsCreatingCategory(true);
    try {
      const newCategory = await createCategory({
        name: newCategoryName,
        description: '',
        type: 'product'
      }, organizationId);
      
      onCategoryCreated(newCategory);
      form.setValue('category_id', newCategory.id);
      setNewCategoryName('');
      setShowNewCategoryInput(false);
      toast.success('تم إنشاء الفئة بنجاح');
    } catch (error) {
      console.error('Error creating category:', error);
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
      toast.error('حدث خطأ أثناء إنشاء الفئة الفرعية');
    } finally {
      setIsCreatingSubcategory(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Category Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-full">
              <FolderTree className="h-4 w-4 text-primary" />
            </div>
            الفئة الرئيسية
            <Badge variant="destructive" className="text-xs">مطلوب</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="category_id"
            render={({ field }) => (
              <FormItem>
                {showNewCategoryInput ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <FolderPlus className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <FormControl>
                          <Input
                            placeholder="اسم الفئة الجديدة"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            className="pl-10 h-11 bg-background border-border"
                          />
                        </FormControl>
                      </div>
                      
                      <Button 
                        type="button"
                        size="sm"
                        onClick={handleCreateCategory}
                        disabled={isCreatingCategory}
                        className="h-11 px-4"
                      >
                        {isCreatingCategory ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <PlusCircle className="h-4 w-4 mr-1" />
                            إضافة
                          </>
                        )}
                      </Button>
                      
                      <Button 
                        type="button" 
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowNewCategoryInput(false);
                          setNewCategoryName('');
                        }}
                        className="h-11"
                      >
                        إلغاء
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      أدخل اسم الفئة الجديدة التي ترغب بإضافتها
                    </p>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="h-11 bg-background border-border">
                          <SelectValue placeholder="اختر فئة رئيسية" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              <div className="flex items-center gap-2">
                                <Folder className="h-4 w-4 text-amber-500" />
                                {category.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button 
                      type="button"
                      variant="outline"
                      className="h-11 gap-2"
                      onClick={() => setShowNewCategoryInput(true)}
                    >
                      <Plus className="h-4 w-4" />
                      فئة جديدة
                    </Button>
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Subcategory Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <div className="bg-blue-100 p-2 rounded-full">
              <Tag className="h-4 w-4 text-blue-600" />
            </div>
            الفئة الفرعية
            <Badge variant="outline" className="text-xs">اختياري</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="subcategory_id"
            render={({ field }) => (
              <FormItem>
                {showNewSubcategoryInput ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <FolderPlus className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <FormControl>
                          <Input
                            placeholder="اسم الفئة الفرعية الجديدة"
                            value={newSubcategoryName}
                            onChange={(e) => setNewSubcategoryName(e.target.value)}
                            className="pl-10 h-11 bg-background border-border"
                          />
                        </FormControl>
                      </div>
                      
                      <Button 
                        type="button"
                        size="sm"
                        onClick={handleCreateSubcategory}
                        disabled={isCreatingSubcategory || !watchCategoryId}
                        className="h-11 px-4"
                      >
                        {isCreatingSubcategory ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <PlusCircle className="h-4 w-4 mr-1" />
                            إضافة
                          </>
                        )}
                      </Button>
                      
                      <Button 
                        type="button" 
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowNewSubcategoryInput(false);
                          setNewSubcategoryName('');
                        }}
                        className="h-11"
                      >
                        إلغاء
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      أدخل اسم الفئة الفرعية التي سيظهر بها المنتج
                    </p>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Select
                        value={field.value || ''}
                        onValueChange={field.onChange}
                        disabled={!watchCategoryId}
                      >
                        <SelectTrigger className="h-11 bg-background border-border">
                          <SelectValue 
                            placeholder={
                              !watchCategoryId 
                                ? 'اختر فئة رئيسية أولاً' 
                                : subcategories.length === 0 
                                  ? 'لا توجد فئات فرعية' 
                                  : 'اختر فئة فرعية'
                            } 
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {subcategories.map((subcategory) => (
                            <SelectItem key={subcategory.id} value={subcategory.id}>
                              <div className="flex items-center gap-2">
                                <Tag className="h-4 w-4 text-blue-500" />
                                {subcategory.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button 
                      type="button"
                      variant="outline"
                      className="h-11 gap-2"
                      onClick={() => setShowNewSubcategoryInput(true)}
                      disabled={!watchCategoryId}
                    >
                      <Plus className="h-4 w-4" />
                      فئة فرعية جديدة
                    </Button>
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {!watchCategoryId && (
            <div className="text-center py-4 text-muted-foreground">
              <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">اختر فئة رئيسية أولاً لإضافة فئة فرعية</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 