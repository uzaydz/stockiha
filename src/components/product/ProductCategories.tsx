import { useState } from 'react';
import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, FolderPlus, Folder, Tag, Tags, PlusCircle } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from "@/types/product";
import { type Category, type Subcategory, createCategory, createSubcategory } from '@/lib/api/categories';
import { toast } from 'sonner';
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
      <Card className="border-2 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3 pt-4 px-5 bg-muted/20 flex flex-row items-center space-y-0 gap-2">
          <Tags className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">تصنيف المنتج</h3>
        </CardHeader>
        <CardContent className="p-5 space-y-6">
          {/* فئة المنتج الرئيسية */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-medium">
              <Folder className="h-5 w-5 text-amber-500" />
              <span>الفئة الرئيسية*</span>
            </div>
            
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <div className="relative">
                    {showNewCategoryInput ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              <FolderPlus size={18} />
                            </span>
                            <FormControl>
                              <Input
                                placeholder="اسم الفئة الجديدة"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                className="pl-10 bg-background border-2 h-12 focus:border-primary transition-colors"
                              />
                            </FormControl>
                          </div>
                          
                          <Button 
                            type="button"
                            size="sm"
                            onClick={handleCreateCategory}
                            disabled={isCreatingCategory}
                            className="h-12 min-w-[80px]"
                          >
                            {isCreatingCategory ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <span className="flex items-center gap-1">
                                <PlusCircle className="h-4 w-4" />
                                إضافة
                              </span>
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
                            className="h-12"
                          >
                            إلغاء
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          ادخل اسم الفئة الجديدة التي ترغب بإضافتها
                        </p>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="bg-background border-2 h-12 focus:border-primary transition-colors">
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
                          className="h-12"
                          onClick={() => setShowNewCategoryInput(true)}
                        >
                          <Plus className="h-4 w-4 ml-1" />
                          فئة جديدة
                        </Button>
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* فئة المنتج الفرعية */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-medium">
              <Tag className="h-5 w-5 text-blue-500" />
              <span>الفئة الفرعية (اختياري)</span>
            </div>
            
            <FormField
              control={form.control}
              name="subcategory_id"
              render={({ field }) => (
                <FormItem>
                  <div className="relative">
                    {showNewSubcategoryInput ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              <FolderPlus size={18} />
                            </span>
                            <FormControl>
                              <Input
                                placeholder="اسم الفئة الفرعية الجديدة"
                                value={newSubcategoryName}
                                onChange={(e) => setNewSubcategoryName(e.target.value)}
                                className="pl-10 bg-background border-2 h-12 focus:border-primary transition-colors"
                              />
                            </FormControl>
                          </div>
                          
                          <Button 
                            type="button"
                            size="sm"
                            onClick={handleCreateSubcategory}
                            disabled={isCreatingSubcategory || !watchCategoryId}
                            className="h-12 min-w-[80px]"
                          >
                            {isCreatingSubcategory ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <span className="flex items-center gap-1">
                                <PlusCircle className="h-4 w-4" />
                                إضافة
                              </span>
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
                            className="h-12"
                          >
                            إلغاء
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          ادخل اسم الفئة الفرعية التي سيظهر بها المنتج ضمن الفئة الرئيسية
                        </p>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Select
                            value={field.value || ''}
                            onValueChange={field.onChange}
                            disabled={!watchCategoryId || subcategories.length === 0}
                          >
                            <SelectTrigger className="bg-background border-2 h-12 focus:border-primary transition-colors">
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
                          className="h-12"
                          onClick={() => setShowNewSubcategoryInput(true)}
                          disabled={!watchCategoryId}
                        >
                          <Plus className="h-4 w-4 ml-1" />
                          فئة فرعية
                        </Button>
                      </div>
                    )}
                  </div>
                  {!watchCategoryId && (
                    <div className="mt-2">
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        يجب اختيار فئة رئيسية قبل إضافة فئة فرعية
                      </Badge>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 