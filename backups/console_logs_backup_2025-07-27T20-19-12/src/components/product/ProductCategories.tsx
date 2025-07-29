import { useState } from 'react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, FolderPlus, Folder, Tag, Tags, PlusCircle, FolderTree, AlertTriangle, HelpCircle, Upload, X, Image as ImageIcon } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from "@/types/product";
import { type Category, type Subcategory, createCategory, createSubcategory } from '@/lib/api/categories';
import { toast } from 'sonner';
import { clearSubcategoriesCache } from '@/lib/cache-utils';
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import ImageUploader from "@/components/ui/ImageUploader";

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
  
  // حالة النافذة المنبثقة للفئة الجديدة
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [newCategoryData, setNewCategoryData] = useState({
    name: '',
    description: '',
    icon: '',
    image_url: '',
    type: 'product' as 'product' | 'service'
  });
  
  const watchCategoryId = form.watch('category_id');
  
  // الأيقونات المتاحة للفئات
  const availableIcons = [
    { name: 'FolderTree', icon: FolderTree, label: 'مجلد شجري' },
    { name: 'Folder', icon: Folder, label: 'مجلد' },
    { name: 'Tag', icon: Tag, label: 'علامة' },
    { name: 'Tags', icon: Tags, label: 'علامات' },
    { name: 'Package', icon: PlusCircle, label: 'حزمة' },
  ];
  
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('يرجى إدخال اسم للفئة');
      return;
    }
    
    if (!organizationId || organizationId.trim() === '') {
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

  const handleCreateCategoryFromDialog = async () => {
    if (!newCategoryData.name.trim()) {
      toast.error('يرجى إدخال اسم للفئة');
      return;
    }
    
    if (!organizationId || organizationId.trim() === '') {
      toast.error('معرف المؤسسة مطلوب');
      return;
    }
    
    setIsCreatingCategory(true);
    try {
      const newCategory = await createCategory({
        name: newCategoryData.name,
        description: newCategoryData.description || null,
        icon: newCategoryData.icon || null,
        image_url: newCategoryData.image_url || null,
        type: newCategoryData.type
      }, organizationId);
      
      onCategoryCreated(newCategory);
      form.setValue('category_id', newCategory.id);
      
      // إعادة تعيين البيانات
      setNewCategoryData({
        name: '',
        description: '',
        icon: '',
        image_url: '',
        type: 'product'
      });
      
      setShowCategoryDialog(false);
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
        organization_id: organizationId
      });
      
      onSubcategoryCreated(newSubcategory);
      form.setValue('subcategory_id', newSubcategory.id);
      setNewSubcategoryName('');
      setShowNewSubcategoryInput(false);
      
      clearSubcategoriesCache(organizationId);
      
      toast.success('تم إنشاء الفئة الفرعية بنجاح');
    } catch (error) {
      toast.error('حدث خطأ أثناء إنشاء الفئة الفرعية');
    } finally {
      setIsCreatingSubcategory(false);
    }
  };

  const handleImageUpload = (imageUrl: string) => {
    setNewCategoryData(prev => ({ ...prev, image_url: imageUrl }));
  };

  return (
    <TooltipProvider>
      <div className="space-y-4 sm:space-y-6">
        {/* تحذير عندما يكون معرف المؤسسة فارغًا */}
        {(!organizationId || organizationId.trim() === '') && (
          <Card className="border-amber-200/60 bg-gradient-to-r from-amber-50/80 to-orange-50/60 dark:from-amber-950/40 dark:to-orange-950/30 shadow-lg dark:shadow-2xl dark:shadow-black/20 backdrop-blur-sm">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/60 dark:to-amber-800/60 p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl shadow-sm shrink-0">
                  <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-amber-800 dark:text-amber-200">
                    تحذير: لم يتم تحديد معرف المؤسسة
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5 sm:mt-1">
                    جاري تحميل بيانات المؤسسة...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Category Section */}
        <Card className="border-border/50 shadow-lg dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3 sm:pb-4 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent dark:from-primary/10 dark:via-primary/5 dark:to-transparent rounded-t-lg border-b border-border/30">
            <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2 sm:gap-3">
              <div className="bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/15 p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl shadow-sm shrink-0">
                <FolderTree className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary dark:text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-foreground text-xs sm:text-sm">الفئة الرئيسية</span>
                <Badge variant="destructive" className="text-xs mr-1 sm:mr-2 shadow-sm shrink-0">مطلوب</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 bg-gradient-to-b from-background/50 to-background">
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-xs sm:text-sm font-medium text-foreground flex items-center gap-1 sm:gap-2">
                    اختر الفئة الرئيسية
                    <span className="text-destructive">*</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center p-1 rounded-md min-h-[44px] sm:min-h-auto"
                          onClick={(e) => e.preventDefault()}
                        >
                          <HelpCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent 
                        className="max-w-xs z-50 bg-popover border border-border shadow-lg"
                        side="top"
                        sideOffset={5}
                      >
                        <p className="text-xs">اختر الفئة الرئيسية التي ينتمي إليها المنتج. هذا يساعد العملاء في العثور على المنتج بسهولة.</p>
                      </TooltipContent>
                    </Tooltip>
                  </FormLabel>
                  {showNewCategoryInput ? (
                    <div className="space-y-3">
                      <div className="space-y-2 sm:space-y-0 sm:flex sm:gap-2">
                        <div className="relative flex-1 group">
                          <FolderPlus className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground group-focus-within:text-primary transition-all duration-300 group-focus-within:scale-110" />
                          <FormControl>
                            <Input
                              placeholder="مثال: الإلكترونيات، الملابس، المنزل"
                              value={newCategoryName}
                              onChange={(e) => setNewCategoryName(e.target.value)}
                              className="pl-8 sm:pl-10 h-11 sm:h-10 text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg backdrop-blur-sm"
                            />
                          </FormControl>
                          <div className="absolute inset-0 rounded-md bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
                        </div>
                        
                        <div className="flex gap-2 sm:gap-0 sm:block sm:space-y-0">
                          <Button 
                            type="button"
                            size="sm"
                            onClick={handleCreateCategory}
                            disabled={isCreatingCategory}
                            className="flex-1 sm:flex-none h-11 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-md hover:shadow-lg transition-all duration-300 min-h-[44px] sm:min-h-auto"
                          >
                            {isCreatingCategory ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <>
                                <PlusCircle className="h-3.5 w-3.5 sm:mr-1.5" />
                                <span className="hidden sm:inline">إضافة</span>
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
                            className="flex-1 sm:flex-none h-11 sm:h-10 px-3 text-xs sm:text-sm border-border/60 hover:bg-muted/50 dark:hover:bg-muted/30 transition-all duration-300 shadow-sm hover:shadow-md min-h-[44px] sm:min-h-auto"
                          >
                            إلغاء
                          </Button>
                        </div>
                      </div>
                      <div className="bg-gradient-to-r from-muted/40 to-muted/20 dark:from-muted/20 dark:to-muted/10 p-2.5 sm:p-3 rounded-lg sm:rounded-xl border border-border/50 backdrop-blur-sm">
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 sm:gap-2">
                          <FolderPlus className="w-3 h-3" />
                          أدخل اسم الفئة الجديدة التي ترغب بإضافتها
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex-1">
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="h-11 sm:h-10 text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg backdrop-blur-sm">
                            <SelectValue placeholder="اختر فئة رئيسية" />
                          </SelectTrigger>
                          <SelectContent className="bg-background/95 dark:bg-background/90 backdrop-blur-md border-border/60 shadow-xl">
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id} className="hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors text-sm">
                                <div className="flex items-center gap-2">
                                  <Folder className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                                  <span className="text-foreground">{category.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Mobile: Stack buttons vertically, Desktop: Horizontal */}
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <Button 
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-11 sm:h-10 gap-1.5 px-3 text-xs sm:text-sm border-border/60 hover:bg-gradient-to-r hover:from-primary/5 hover:to-primary/10 hover:border-primary/50 dark:hover:from-primary/10 dark:hover:to-primary/20 transition-all duration-300 shadow-sm hover:shadow-md min-h-[44px] sm:min-h-auto"
                          onClick={() => setShowNewCategoryInput(true)}
                          disabled={!organizationId || organizationId.trim() === ''}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span className="text-xs sm:text-sm">فئة جديدة</span>
                        </Button>

                        {/* زر النافذة المنبثقة المحسنة */}
                        <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
                          <DialogTrigger asChild>
                            <Button 
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-11 sm:h-10 gap-1.5 px-3 text-xs sm:text-sm border-primary/60 bg-gradient-to-r from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/20 hover:border-primary/80 dark:hover:from-primary/15 dark:hover:to-primary/25 transition-all duration-300 shadow-sm hover:shadow-md min-h-[44px] sm:min-h-auto"
                              disabled={!organizationId || organizationId.trim() === ''}
                            >
                              <FolderPlus className="h-3.5 w-3.5" />
                              <span className="text-xs sm:text-sm">فئة محسنة</span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="w-[95vw] max-w-[500px] bg-background/95 backdrop-blur-md border-border/60 shadow-2xl">
                            <DialogHeader>
                              <DialogTitle className="text-base sm:text-lg font-semibold text-right flex items-center gap-2">
                                <FolderPlus className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                                إضافة فئة جديدة
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3 sm:space-y-4 py-4">
                              {/* اسم الفئة */}
                              <div className="space-y-2">
                                <Label htmlFor="category-name" className="text-xs sm:text-sm font-medium">
                                  اسم الفئة <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                  id="category-name"
                                  placeholder="مثال: الإلكترونيات، الملابس، المنزل"
                                  value={newCategoryData.name}
                                  onChange={(e) => setNewCategoryData(prev => ({ ...prev, name: e.target.value }))}
                                  className="h-11 sm:h-10 text-sm"
                                />
                              </div>

                              {/* وصف الفئة */}
                              <div className="space-y-2">
                                <Label htmlFor="category-description" className="text-xs sm:text-sm font-medium">
                                  وصف الفئة (اختياري)
                                </Label>
                                <Textarea
                                  id="category-description"
                                  placeholder="وصف مختصر للفئة..."
                                  value={newCategoryData.description}
                                  onChange={(e) => setNewCategoryData(prev => ({ ...prev, description: e.target.value }))}
                                  className="min-h-[60px] sm:min-h-[80px] text-sm resize-none"
                                />
                              </div>

                              {/* نوع الفئة */}
                              <div className="space-y-2">
                                <Label className="text-xs sm:text-sm font-medium">نوع الفئة</Label>
                                <Select
                                  value={newCategoryData.type}
                                  onValueChange={(value: 'product' | 'service') => 
                                    setNewCategoryData(prev => ({ ...prev, type: value }))
                                  }
                                >
                                  <SelectTrigger className="h-11 sm:h-10 text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="product">منتجات</SelectItem>
                                    <SelectItem value="service">خدمات</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* اختيار الأيقونة */}
                              <div className="space-y-2">
                                <Label className="text-xs sm:text-sm font-medium">الأيقونة (اختياري)</Label>
                                <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                                  {availableIcons.map((iconData) => {
                                    const IconComponent = iconData.icon;
                                    return (
                                      <Tooltip key={iconData.name}>
                                        <TooltipTrigger asChild>
                                          <button
                                            type="button"
                                            onClick={() => setNewCategoryData(prev => ({ 
                                              ...prev, 
                                              icon: prev.icon === iconData.name ? '' : iconData.name 
                                            }))}
                                            className={`p-2.5 sm:p-3 rounded-lg border-2 transition-all duration-200 min-h-[44px] sm:min-h-auto ${
                                              newCategoryData.icon === iconData.name
                                                ? 'border-primary bg-primary/10 text-primary'
                                                : 'border-border/60 hover:border-primary/60 hover:bg-muted/50'
                                            }`}
                                          >
                                            <IconComponent className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="text-xs">{iconData.label}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* رفع صورة */}
                              <div className="space-y-2">
                                <Label className="text-xs sm:text-sm font-medium">صورة الفئة (اختياري)</Label>
                                <ImageUploader
                                  imageUrl={newCategoryData.image_url}
                                  onImageUploaded={handleImageUpload}
                                  folder="categories"
                                  aspectRatio="1:1"
                                  maxSizeInMB={2}
                                  label=""
                                  compact={true}
                                />
                              </div>

                              {/* رابط إدارة الفئات */}
                              <div className="bg-gradient-to-r from-blue-50/60 to-indigo-50/40 dark:from-blue-950/30 dark:to-indigo-950/20 p-2.5 sm:p-3 rounded-lg sm:rounded-xl border border-blue-200/50 dark:border-blue-800/30 backdrop-blur-sm">
                                <p className="text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
                                  <FolderTree className="w-3 h-3 mt-0.5 shrink-0" />
                                  <span>
                                    لإدارة الفئات بشكل متقدم، يمكنك زيارة 
                                    <a 
                                      href="/categories" 
                                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 font-medium underline transition-colors mr-1"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      صفحة الفئات
                                    </a>
                                  </span>
                                </p>
                              </div>

                              {/* أزرار الإجراءات */}
                              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setShowCategoryDialog(false)}
                                  className="h-11 sm:h-10 px-4 min-h-[44px] sm:min-h-auto"
                                >
                                  إلغاء
                                </Button>
                                <Button
                                  type="button"
                                  onClick={handleCreateCategoryFromDialog}
                                  disabled={isCreatingCategory || !newCategoryData.name.trim()}
                                  className="h-11 sm:h-10 px-4 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 min-h-[44px] sm:min-h-auto"
                                >
                                  {isCreatingCategory ? (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                      جاري الإنشاء...
                                    </>
                                  ) : (
                                    <>
                                      <PlusCircle className="h-4 w-4 mr-2" />
                                      إنشاء الفئة
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  )}
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Subcategory Section */}
        <Card className="border-border/50 shadow-lg dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3 sm:pb-4 bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-transparent dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-transparent rounded-t-lg border-b border-border/30">
            <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2 sm:gap-3">
              <div className="bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl shadow-sm shrink-0">
                <Tag className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-foreground text-xs sm:text-sm">الفئة الفرعية</span>
                <Badge variant="outline" className="text-xs mr-1 sm:mr-2 shadow-sm shrink-0">اختياري</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 bg-gradient-to-b from-background/50 to-background">
            <FormField
              control={form.control}
              name="subcategory_id"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-xs sm:text-sm font-medium text-foreground flex items-center gap-1 sm:gap-2">
                    اختر الفئة الفرعية
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center p-1 rounded-md min-h-[44px] sm:min-h-auto"
                          onClick={(e) => e.preventDefault()}
                        >
                          <HelpCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground hover:text-blue-600 transition-colors cursor-help" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent 
                        className="max-w-xs z-50 bg-popover border border-border shadow-lg"
                        side="top"
                        sideOffset={5}
                      >
                        <p className="text-xs">الفئة الفرعية تساعد في تصنيف المنتج بشكل أكثر تفصيلاً داخل الفئة الرئيسية. هذا اختياري.</p>
                      </TooltipContent>
                    </Tooltip>
                  </FormLabel>
                  {showNewSubcategoryInput ? (
                    <div className="space-y-3">
                      <div className="space-y-2 sm:space-y-0 sm:flex sm:gap-2">
                        <div className="relative flex-1 group">
                          <FolderPlus className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground group-focus-within:text-blue-600 transition-all duration-300 group-focus-within:scale-110" />
                          <FormControl>
                            <Input
                              placeholder="مثال: هواتف ذكية، أجهزة لوحية، إكسسوارات"
                              value={newSubcategoryName}
                              onChange={(e) => setNewSubcategoryName(e.target.value)}
                              className="pl-8 sm:pl-10 h-11 sm:h-10 text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-blue-500/60 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg backdrop-blur-sm"
                            />
                          </FormControl>
                          <div className="absolute inset-0 rounded-md bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
                        </div>
                        
                        <div className="flex gap-2 sm:gap-0 sm:block sm:space-y-0">
                          <Button 
                            type="button"
                            size="sm"
                            onClick={handleCreateSubcategory}
                            disabled={isCreatingSubcategory || !watchCategoryId}
                            className="flex-1 sm:flex-none h-11 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 shadow-md hover:shadow-lg transition-all duration-300 min-h-[44px] sm:min-h-auto"
                          >
                            {isCreatingSubcategory ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <>
                                <PlusCircle className="h-3.5 w-3.5 sm:mr-1.5" />
                                <span className="hidden sm:inline">إضافة</span>
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
                            className="flex-1 sm:flex-none h-11 sm:h-10 px-3 text-xs sm:text-sm border-border/60 hover:bg-muted/50 dark:hover:bg-muted/30 transition-all duration-300 shadow-sm hover:shadow-md min-h-[44px] sm:min-h-auto"
                          >
                            إلغاء
                          </Button>
                        </div>
                      </div>
                      <div className="bg-gradient-to-r from-blue-50/60 to-indigo-50/40 dark:from-blue-950/30 dark:to-indigo-950/20 p-2.5 sm:p-3 rounded-lg sm:rounded-xl border border-blue-200/50 dark:border-blue-800/30 backdrop-blur-sm">
                        <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1.5 sm:gap-2">
                          <Tag className="w-3 h-3" />
                          أدخل اسم الفئة الفرعية التي سيظهر بها المنتج
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex-1">
                        <Select
                          value={field.value || ''}
                          onValueChange={field.onChange}
                          disabled={!watchCategoryId}
                        >
                          <SelectTrigger className="h-11 sm:h-10 text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-blue-500/60 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed">
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
                          <SelectContent className="bg-background/95 dark:bg-background/90 backdrop-blur-md border-border/60 shadow-xl">
                            {subcategories.map((subcategory) => (
                              <SelectItem key={subcategory.id} value={subcategory.id} className="hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors text-sm">
                                <div className="flex items-center gap-2">
                                  <Tag className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                                  <span className="text-foreground">{subcategory.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <Button 
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto h-11 sm:h-10 gap-1.5 px-3 text-xs sm:text-sm border-border/60 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/30 dark:hover:from-blue-950/20 dark:hover:to-indigo-950/10 hover:border-blue-300/50 dark:hover:border-blue-600/30 transition-all duration-300 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] sm:min-h-auto"
                        onClick={() => setShowNewSubcategoryInput(true)}
                        disabled={!watchCategoryId}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span className="text-xs sm:text-sm">فئة فرعية جديدة</span>
                      </Button>
                    </div>
                  )}
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {!watchCategoryId && (
              <div className="text-center py-6 sm:py-8 bg-gradient-to-br from-muted/30 to-muted/10 dark:from-muted/20 dark:to-muted/5 rounded-lg sm:rounded-xl border border-dashed border-border/60 backdrop-blur-sm">
                <div className="relative">
                  <Tag className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 text-muted-foreground/40 dark:text-muted-foreground/30" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-muted/20 to-muted/10 rounded-full" />
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium mb-1">اختر فئة رئيسية أولاً لإضافة فئة فرعية</p>
                <p className="text-xs text-muted-foreground/70">الفئة الفرعية تساعد في تنظيم المنتجات بشكل أفضل</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
