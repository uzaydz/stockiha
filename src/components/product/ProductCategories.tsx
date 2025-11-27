import { useState } from 'react';
import { useWatch } from 'react-hook-form';
import { trackRender } from '@/utils/debugRenderLoop';
import { ChevronDown } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, FolderPlus, Folder, Tag, PlusCircle, FolderTree, AlertTriangle, HelpCircle } from "lucide-react";
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
  // 🔍 تتبع renders للتصحيح - معطل مؤقتًا
  // trackRender('ProductCategories', { categoriesCount: categories.length, subcategoriesCount: subcategories.length });
  
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  
  const [showNewSubcategoryInput, setShowNewSubcategoryInput] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [isCreatingSubcategory, setIsCreatingSubcategory] = useState(false);
  
  // ✅ استخدام useWatch بدلاً من form.watch لتجنب re-renders غير ضرورية
  const watchCategoryId = useWatch({ control: form.control, name: 'category_id' }) || '';
  const watchSubcategoryId = useWatch({ control: form.control, name: 'subcategory_id' }) || '';
  
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
        {/* تحذير عندما يكون معرف المؤسسة فارغًا */}
        {(!organizationId || organizationId.trim() === '') && (
          <Card className="border-amber-200/60 bg-gradient-to-r from-amber-50/80 to-orange-50/60 dark:from-amber-950/40 dark:to-orange-950/30 shadow-lg dark:shadow-2xl dark:shadow-black/20 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/60 dark:to-amber-800/60 p-2.5 rounded-xl shadow-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    تحذير: لم يتم تحديد معرف المؤسسة
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    لن تتمكن من إنشاء فئات جديدة حتى يتم تحميل بيانات المؤسسة. يرجى إعادة تحميل الصفحة إذا استمرت المشكلة.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Category Section */}
        <Card className="border-border/50 shadow-lg dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent dark:from-primary/10 dark:via-primary/5 dark:to-transparent rounded-t-lg border-b border-border/30">
            <CardTitle className="text-base font-semibold flex items-center gap-3">
              <div className="bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/15 p-2.5 rounded-xl shadow-sm">
                <FolderTree className="h-4 w-4 text-primary dark:text-primary-foreground" />
              </div>
              <div className="flex-1">
                <span className="text-foreground text-sm">الفئة الرئيسية</span>
                <Badge variant="destructive" className="text-xs mr-2 shadow-sm">مطلوب</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4 bg-gradient-to-b from-background/50 to-background">
            {/* استخدام Select بدون FormField لتجنب مشاكل refs مع React 19 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-foreground">
                  اختر الفئة الرئيسية
                  <span className="text-destructive ml-1">*</span>
                </label>
                <span
                  className="inline-flex items-center justify-center p-1 rounded-md hover:bg-muted/50 transition-colors"
                  title="اختر الفئة الرئيسية التي ينتمي إليها المنتج. هذا يساعد العملاء في العثور على المنتج بسهولة."
                >
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                </span>
              </div>
              {showNewCategoryInput ? (
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="relative flex-1 group">
                      <FolderPlus className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-all duration-300 group-focus-within:scale-110" />
                      <Input
                        placeholder="مثال: الإلكترونيات، الملابس، المنزل"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="pl-10 h-10 text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg backdrop-blur-sm"
                      />
                      <div className="absolute inset-0 rounded-md bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    </div>
                    
                    <Button 
                      type="button"
                      size="sm"
                      onClick={handleCreateCategory}
                      disabled={isCreatingCategory}
                      className="h-10 px-4 text-sm bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-md hover:shadow-lg transition-all duration-300"
                    >
                      {isCreatingCategory ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
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
                      className="h-10 px-3 text-sm border-border/60 hover:bg-muted/50 dark:hover:bg-muted/30 transition-all duration-300 shadow-sm hover:shadow-md"
                    >
                      إلغاء
                    </Button>
                  </div>
                  <div className="bg-gradient-to-r from-muted/40 to-muted/20 dark:from-muted/20 dark:to-muted/10 p-3 rounded-xl border border-border/50 backdrop-blur-sm">
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <FolderPlus className="w-3 h-3" />
                      أدخل اسم الفئة الجديدة التي ترغب بإضافتها
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <select
                      value={watchCategoryId || ''}
                      onChange={(e) => {
                        form.setValue('category_id', e.target.value);
                        // مسح الفئة الفرعية عند تغيير الفئة الرئيسية
                        form.setValue('subcategory_id', '');
                      }}
                      className="w-full h-10 px-3 pr-10 text-sm text-right appearance-none cursor-pointer bg-background/80 dark:bg-background/60 border border-border/60 rounded-md hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg backdrop-blur-sm"
                    >
                      <option value="" disabled className="text-muted-foreground">
                        اختر فئة رئيسية
                      </option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          📁 {category.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                  
                  <Button 
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 gap-1.5 px-3 text-sm border-border/60 hover:bg-gradient-to-r hover:from-primary/5 hover:to-primary/10 hover:border-primary/50 dark:hover:from-primary/10 dark:hover:to-primary/20 transition-all duration-300 shadow-sm hover:shadow-md"
                    onClick={() => setShowNewCategoryInput(true)}
                    disabled={!organizationId || organizationId.trim() === ''}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    فئة جديدة
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Subcategory Section */}
        <Card className="border-border/50 shadow-lg dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4 bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-transparent dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-transparent rounded-t-lg border-b border-border/30">
            <CardTitle className="text-base font-semibold flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 p-2.5 rounded-xl shadow-sm">
                <Tag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <span className="text-foreground text-sm">الفئة الفرعية</span>
                <Badge variant="outline" className="text-xs mr-2 shadow-sm">اختياري</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4 bg-gradient-to-b from-background/50 to-background">
            {/* استخدام Select بدون FormField لتجنب مشاكل refs مع React 19 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-foreground">
                  اختر الفئة الفرعية
                </label>
                <span
                  className="inline-flex items-center justify-center p-1 rounded-md hover:bg-muted/50 transition-colors"
                  title="الفئة الفرعية تساعد في تصنيف المنتج بشكل أكثر تفصيلاً داخل الفئة الرئيسية. هذا اختياري."
                >
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-blue-600 transition-colors cursor-help" />
                </span>
              </div>
              {showNewSubcategoryInput ? (
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="relative flex-1 group">
                      <FolderPlus className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-blue-600 transition-all duration-300 group-focus-within:scale-110" />
                      <Input
                        placeholder="مثال: هواتف ذكية، أجهزة لوحية، إكسسوارات"
                        value={newSubcategoryName}
                        onChange={(e) => setNewSubcategoryName(e.target.value)}
                        className="pl-10 h-10 text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-blue-500/60 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg backdrop-blur-sm"
                      />
                      <div className="absolute inset-0 rounded-md bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    </div>
                    
                    <Button 
                      type="button"
                      size="sm"
                      onClick={handleCreateSubcategory}
                      disabled={isCreatingSubcategory || !watchCategoryId}
                      className="h-10 px-4 text-sm bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 shadow-md hover:shadow-lg transition-all duration-300"
                    >
                      {isCreatingSubcategory ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
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
                      className="h-10 px-3 text-sm border-border/60 hover:bg-muted/50 dark:hover:bg-muted/30 transition-all duration-300 shadow-sm hover:shadow-md"
                    >
                      إلغاء
                    </Button>
                  </div>
                  <div className="bg-gradient-to-r from-blue-50/60 to-indigo-50/40 dark:from-blue-950/30 dark:to-indigo-950/20 p-3 rounded-xl border border-blue-200/50 dark:border-blue-800/30 backdrop-blur-sm">
                    <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
                      <Tag className="w-3 h-3" />
                      أدخل اسم الفئة الفرعية التي سيظهر بها المنتج
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <select
                      value={watchSubcategoryId || ''}
                      onChange={(e) => form.setValue('subcategory_id', e.target.value)}
                      disabled={!watchCategoryId}
                      className="w-full h-10 px-3 pr-10 text-sm text-right appearance-none cursor-pointer bg-background/80 dark:bg-background/60 border border-border/60 rounded-md hover:border-blue-500/60 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="" disabled className="text-muted-foreground">
                        {!watchCategoryId 
                          ? 'اختر فئة رئيسية أولاً' 
                          : subcategories.length === 0 
                            ? 'لا توجد فئات فرعية' 
                            : 'اختر فئة فرعية'}
                      </option>
                      {subcategories.map((subcategory) => (
                        <option key={subcategory.id} value={subcategory.id}>
                          🏷️ {subcategory.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                  
                  <Button 
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 gap-1.5 px-3 text-sm border-border/60 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/30 dark:hover:from-blue-950/20 dark:hover:to-indigo-950/10 hover:border-blue-300/50 dark:hover:border-blue-600/30 transition-all duration-300 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setShowNewSubcategoryInput(true)}
                    disabled={!watchCategoryId}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    فئة فرعية جديدة
                  </Button>
                </div>
              )}
            </div>

            {!watchCategoryId && (
              <div className="text-center py-8 bg-gradient-to-br from-muted/30 to-muted/10 dark:from-muted/20 dark:to-muted/5 rounded-xl border border-dashed border-border/60 backdrop-blur-sm">
                <div className="relative">
                  <Tag className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40 dark:text-muted-foreground/30" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 bg-gradient-to-br from-muted/20 to-muted/10 rounded-full" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground font-medium mb-1">اختر فئة رئيسية أولاً لإضافة فئة فرعية</p>
                <p className="text-xs text-muted-foreground/70">الفئة الفرعية تساعد في تنظيم المنتجات بشكل أفضل</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
