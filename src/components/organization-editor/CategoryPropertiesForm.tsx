import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Layers, 
  Tag, 
  CheckCircle, 
  XCircle, 
  Plus, 
  X, 
  Search, 
  Grid3X3, 
  List, 
  Loader2, 
  AlertCircle, 
  Image,
  Eye,
  Filter,
  GripVertical
} from 'lucide-react';
import { CategoryEditorProps, Category } from './types';
import { useTenant } from '@/context/TenantContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

// مكون SortableCategory للفئات المحددة
interface SortableCategoryProps {
  category: Category;
  index: number;
  onRemove: (categoryId: string) => void;
}

const SortableCategory: React.FC<SortableCategoryProps> = ({ category, index, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: category.id,
    disabled: false
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-2 bg-background rounded-lg border hover:shadow-sm transition-all ${
        isDragging ? 'shadow-lg scale-105 opacity-90' : ''
      }`}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="text-sm font-medium w-6 text-center">{index + 1}</span>
        <div className="w-1 h-6 bg-primary/30 rounded-full"></div>
      </div>
      
      {/* مقبض السحب */}
      <div
        {...attributes}
        {...listeners}
        className="p-1 cursor-grab active:cursor-grabbing hover:bg-muted/50 rounded"
        title="اسحب لترتيب الفئات"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {category.image_url ? (
            <img
              src={category.image_url}
              alt={category.name}
              className="w-8 h-8 rounded object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
              {category.icon ? (
                <span className="text-sm">{category.icon}</span>
              ) : (
                <Image className="w-4 h-4 text-primary" />
              )}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{category.name}</p>
            {category.product_count !== undefined && (
              <p className="text-xs text-muted-foreground">{category.product_count} منتج</p>
            )}
          </div>
        </div>
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRemove(category.id)}
        className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
        title="إزالة الفئة"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

const CategoryPropertiesForm: React.FC<CategoryEditorProps> = ({
  settings,
  onChange,
  isMobile,
  isTablet,
  isDesktop
}) => {
  const { currentOrganization } = useTenant();
  const { toast } = useToast();
  
  // States
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [categoryPickerView, setCategoryPickerView] = useState<'grid' | 'list'>('grid');
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);

  // إعداد مستشعرات السحب والإفلات
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // جلب الفئات من قاعدة البيانات
  const loadCategories = useCallback(async () => {
    if (!currentOrganization?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true);

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('خطأ في جلب الفئات:', error);
      toast({
        title: "خطأ في التحميل",
        description: "حدث خطأ أثناء جلب الفئات",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentOrganization?.id, toast]);

  // تحميل الفئات عند تحميل المكون
  useEffect(() => {
    if (currentOrganization?.id) {
      loadCategories();
    }
  }, [currentOrganization?.id, loadCategories]);

  // تحديث الفئات المحددة عند تغيير الإعدادات
  useEffect(() => {
    if (settings.selectedCategories && Array.isArray(settings.selectedCategories)) {
      const categoriesFromSettings = settings.selectedCategories
        .map(categoryId => categories.find(category => category.id === categoryId))
        .filter(category => category !== undefined) as Category[];
      
      
      setSelectedCategories(categoriesFromSettings);
    }
  }, [settings.selectedCategories, categories]);

  // تصفية الفئات حسب البحث
  const filteredCategories = useMemo(() => {
    if (!categorySearchQuery) return categories;
    
    return categories.filter(category =>
      category.name.toLowerCase().includes(categorySearchQuery.toLowerCase()) ||
      category.description?.toLowerCase().includes(categorySearchQuery.toLowerCase())
    );
  }, [categories, categorySearchQuery]);

  // إضافة فئة للاختيار
  const addCategoryToSelection = useCallback((category: Category) => {
    if (!selectedCategories.find(c => c.id === category.id)) {
      const newSelection = [...selectedCategories, category];
      setSelectedCategories(newSelection);
      const categoryIds = newSelection.map(c => c.id);
      onChange({ selectedCategories: categoryIds });
    }
  }, [selectedCategories, onChange]);

  // إزالة فئة من الاختيار
  const removeCategoryFromSelection = useCallback((categoryId: string) => {
    const newSelection = selectedCategories.filter(c => c.id !== categoryId);
    setSelectedCategories(newSelection);
    onChange({ selectedCategories: newSelection.map(c => c.id) });
  }, [selectedCategories, onChange]);

  // إعادة ترتيب الفئات المحددة
  const reorderSelectedCategories = useCallback((fromIndex: number, toIndex: number) => {
    const newSelection = [...selectedCategories];
    const [moved] = newSelection.splice(fromIndex, 1);
    newSelection.splice(toIndex, 0, moved);
    setSelectedCategories(newSelection);
    onChange({ selectedCategories: newSelection.map(c => c.id) });
  }, [selectedCategories, onChange]);

  // معالجة السحب والإفلات
  const handleDragEnd = useCallback((event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = selectedCategories.findIndex(category => category.id === active.id);
      const newIndex = selectedCategories.findIndex(category => category.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newSelection = arrayMove(selectedCategories, oldIndex, newIndex);
        
        // تحديث الحالة المحلية أولاً
        setSelectedCategories(newSelection);
        
        // حفظ الترتيب الجديد في الإعدادات
        const categoryIds = newSelection.map(c => c.id);
        onChange({ selectedCategories: categoryIds });
      }
    }
  }, [selectedCategories, onChange]);

  // ترتيب الفئات حسب المبيعات
  const bestsellingCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      return (b.order_count || 0) - (a.order_count || 0);
    });
  }, [categories]);

  // الحصول على قائمة الفئات المناسبة للعرض حسب طريقة الاختيار
  const getCategoriesToDisplay = useCallback(() => {
    if (settings.selectionMethod === 'bestselling') {
      return bestsellingCategories;
    } else if (settings.selectionMethod === 'manual') {
      return selectedCategories;
    } else {
      return [...categories].sort(() => Math.random() - 0.5);
    }
  }, [settings.selectionMethod, bestsellingCategories, categories, selectedCategories]);

  // رندر بطاقة فئة صغيرة
  const renderCategoryCard = (category: Category, isSelected: boolean = false, compact: boolean = false) => {
    const hasImage = category.image_url && category.image_url.trim() !== '';
    
    return (
      <Card className={`overflow-hidden transition-all duration-200 ${
        isSelected ? 'ring-2 ring-primary border-primary' : 'hover:shadow-md border-border'
      } ${compact ? 'h-20' : 'h-32'}`}>
        <CardContent className="p-0 h-full">
          <div className={`flex ${compact ? 'flex-row' : 'flex-col'} h-full`}>
            <div className={`relative ${compact ? 'w-20 h-20' : 'w-full h-20'} bg-gradient-to-br from-primary/10 to-primary/20 flex-shrink-0`}>
              {hasImage ? (
                <img
                  src={category.image_url}
                  alt={category.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      const iconDiv = parent.querySelector('.fallback-icon') as HTMLElement;
                      if (iconDiv) iconDiv.style.display = 'flex';
                    }
                  }}
                />
              ) : null}
              
              <div 
                className={`fallback-icon absolute inset-0 flex flex-col items-center justify-center text-primary ${hasImage ? 'hidden' : 'flex'}`}
                style={{ display: hasImage ? 'none' : 'flex' }}
              >
                {category.icon ? (
                  <span className="text-2xl mb-1">{category.icon}</span>
                ) : (
                  <>
                    <Image className="w-6 h-6 mb-1" />
                    {!compact && <span className="text-xs opacity-75">لا توجد صورة</span>}
                  </>
                )}
              </div>
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>
              {category.product_count !== undefined && (
                <Badge className="absolute bottom-1 right-1 text-xs bg-primary/90 text-primary-foreground">
                  {category.product_count || 0} منتج
                </Badge>
              )}
            </div>
            <div className={`p-2 flex-1 flex flex-col justify-between ${compact ? 'min-w-0' : ''}`}>
              <div>
                <h4 className={`font-medium text-foreground truncate ${compact ? 'text-xs' : 'text-sm'}`}>
                  {category.name}
                </h4>
                {!compact && category.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                    {category.description}
                  </p>
                )}
              </div>
              <div className={`flex items-center justify-between mt-1 ${compact ? 'text-xs' : 'text-sm'}`}>
                <span className="text-xs text-muted-foreground">
                  {category.slug}
                </span>
                {!compact && (
                  <Badge variant={category.is_active ? 'default' : 'secondary'} className="text-xs">
                    {category.is_active ? 'نشط' : 'غير نشط'}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Basic Info Section */}
      <section className="space-y-3 sm:space-y-4">
        <div>
          <Label htmlFor="category-title" className="text-xs sm:text-sm">عنوان القسم</Label>
          <Input
            id="category-title"
            value={settings.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="تصفح فئات منتجاتنا"
            className="mt-1 text-xs sm:text-sm"
          />
        </div>
        <div>
          <Label htmlFor="category-description" className="text-xs sm:text-sm">وصف القسم</Label>
          <Textarea
            id="category-description"
            value={settings.description}
            onChange={(e) => onChange({ description: e.target.value })}
            rows={3}
            placeholder="أفضل الفئات المختارة لتلبية احتياجاتك"
            className="mt-1 text-xs sm:text-sm"
          />
        </div>
      </section>

      <Separator />

      {/* Display Settings Section */}
      <section className="space-y-3 sm:space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Label className="text-xs sm:text-sm">إعدادات العرض</Label>
            <p className="text-[10px] text-muted-foreground sm:text-xs">
              تخصيص طريقة عرض الفئات في المتجر.
            </p>
          </div>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 sm:text-[10px] sm:px-2 sm:py-1 w-fit">
            {settings.displayStyle}
          </Badge>
        </div>

        <div className={cn(
          "grid gap-3",
          isMobile && "grid-cols-1",
          isTablet && "grid-cols-2 gap-4",
          isDesktop && "grid-cols-2 gap-4"
        )}>
          <div className="space-y-3">
            <div>
              <Label className="text-xs sm:text-sm">عدد الفئات المعروضة</Label>
              <div className="mt-2">
                <Slider
                  value={[settings.displayCount || settings.maxCategories || 6]}
                  onValueChange={(value) => onChange({ displayCount: value[0] })}
                  max={50}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>1</span>
                  <span className="font-medium">{settings.displayCount || settings.maxCategories || 6} فئة</span>
                  <span>50</span>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs sm:text-sm">طريقة العرض</Label>
              <Select
                value={settings.displayStyle}
                onValueChange={(value) => onChange({ displayStyle: value as any })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="اختر طريقة العرض" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cards">بطاقات</SelectItem>
                  <SelectItem value="grid">شبكة</SelectItem>
                  <SelectItem value="list">قائمة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-xs sm:text-sm">لون الخلفية</Label>
              <Select
                value={settings.backgroundStyle}
                onValueChange={(value) => onChange({ backgroundStyle: value as any })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="اختر لون الخلفية" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">فاتح</SelectItem>
                  <SelectItem value="dark">داكن</SelectItem>
                  <SelectItem value="muted">هادئ</SelectItem>
                  <SelectItem value="gradient">متدرج</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs sm:text-sm">إظهار زر "عرض الكل"</Label>
              <Switch
                checked={settings.showViewAllButton ?? settings.enableViewAll ?? true}
                onCheckedChange={(checked) => onChange({ showViewAllButton: checked, enableViewAll: checked })}
                className="scale-90 sm:scale-100"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Advanced Display Options */}
        <div className="space-y-3">
          <Label className="text-xs sm:text-sm">خيارات العرض المتقدمة</Label>
          <div className={cn(
            "grid gap-3",
            isMobile && "grid-cols-1",
            isTablet && "grid-cols-2 gap-4",
            isDesktop && "grid-cols-2 gap-4"
          )}>
            <div className="flex items-center justify-between">
              <Label className="text-xs sm:text-sm">إظهار وصف الفئات</Label>
              <Switch
                checked={settings.showDescription}
                onCheckedChange={(checked) => onChange({ showDescription: checked })}
                className="scale-90 sm:scale-100"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs sm:text-sm">إظهار عدد المنتجات</Label>
              <Switch
                checked={settings.showProductCount}
                onCheckedChange={(checked) => onChange({ showProductCount: checked })}
                className="scale-90 sm:scale-100"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs sm:text-sm">إظهار صور الفئات</Label>
              <Switch
                checked={settings.showImages ?? true}
                onCheckedChange={(checked) => onChange({ showImages: checked })}
                className="scale-90 sm:scale-100"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs sm:text-sm">تفعيل تأثيرات الحوم</Label>
              <Switch
                checked={settings.enableHoverEffects ?? true}
                onCheckedChange={(checked) => onChange({ enableHoverEffects: checked })}
                className="scale-90 sm:scale-100"
              />
            </div>
          </div>
        </div>
      </section>

      <Separator />

      {/* Selection Method Section */}
      <section className="space-y-3 sm:space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Label className="text-xs sm:text-sm">طريقة اختيار الفئات</Label>
            <p className="text-[10px] text-muted-foreground sm:text-xs">
              اختر كيفية تحديد الفئات المعروضة.
            </p>
          </div>
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0.5 sm:text-[10px] sm:px-2 sm:py-1 w-fit">
            {settings.selectionMethod}
          </Badge>
        </div>

        <div>
          <Select
            value={settings.selectionMethod}
            onValueChange={(value) => onChange({ selectionMethod: value as any })}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر طريقة الاختيار" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="automatic">تلقائي</SelectItem>
              <SelectItem value="manual">يدوي</SelectItem>
              <SelectItem value="popular">الأكثر شعبية</SelectItem>
              <SelectItem value="newest">الأحدث</SelectItem>
              <SelectItem value="bestselling">الأكثر مبيعاً</SelectItem>
              <SelectItem value="random">عشوائي</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {settings.selectionMethod === 'automatic' && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              سيتم اختيار الفئات تلقائياً بناءً على النشاط والشعبية
            </AlertDescription>
          </Alert>
        )}

        {settings.selectionMethod === 'manual' && (
          <div className="space-y-4">
            {/* عرض الفئات المحددة مع السحب والإفلات */}
            {selectedCategories.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs sm:text-sm font-medium">الفئات المحددة</Label>
                    <Badge variant="secondary" className="text-xs">
                      {selectedCategories.length} فئة
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedCategories([]);
                      onChange({ selectedCategories: [] });
                    }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    مسح الكل
                  </Button>
                </div>
                <ScrollArea className="h-48 border rounded-lg p-3 bg-muted/20">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={selectedCategories.map(c => c.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3">
                        {selectedCategories.map((category, index) => (
                          <SortableCategory
                            key={category.id}
                            category={category}
                            index={index}
                            onRemove={removeCategoryFromSelection}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </ScrollArea>
                <div className="mt-2 text-xs text-muted-foreground">
                  💡 اسحب الفئات لترتيبها أو استخدم الأسهم للتحكم الدقيق
                </div>
              </div>
            )}

            {/* زر إضافة فئات */}
            <Dialog open={showCategoryPicker} onOpenChange={setShowCategoryPicker}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full text-xs"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-3 h-3 mr-2" />
                  )}
                  {isLoading ? 'جاري التحميل...' : 'اختيار فئات'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>اختيار الفئات</DialogTitle>
                  <DialogDescription>
                    اختر الفئات التي تريد عرضها في قسم فئات المنتجات
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {/* شريط البحث */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="البحث في الفئات..."
                        value={categorySearchQuery}
                        onChange={(e) => setCategorySearchQuery(e.target.value)}
                        className="pr-10"
                      />
                    </div>
                    <div className="flex items-center gap-1 border rounded-lg p-1">
                      <Button
                        variant={categoryPickerView === 'grid' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setCategoryPickerView('grid')}
                        className="h-8 w-8 p-0"
                      >
                        <Grid3X3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={categoryPickerView === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setCategoryPickerView('list')}
                        className="h-8 w-8 p-0"
                      >
                        <List className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* قائمة الفئات */}
                  <ScrollArea className="h-96">
                    {filteredCategories.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Layers className="w-8 h-8 mx-auto mb-4 text-primary" />
                        <p className="text-sm font-medium mb-2">
                          {categories.length === 0 ? 'لا توجد فئات في المتجر' : 'لم يتم العثور على فئات مطابقة'}
                        </p>
                      </div>
                    ) : (
                      <div className={`gap-3 ${
                        categoryPickerView === 'grid' 
                          ? 'grid grid-cols-2 md:grid-cols-3' 
                          : 'space-y-2'
                      }`}>
                            {filteredCategories.map(category => {
                              const isSelected = selectedCategories.some(c => c.id === category.id);
                          return (
                            <TooltipProvider key={category.id}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className={`relative cursor-pointer transition-all duration-200 ${
                                      isSelected ? 'opacity-50' : 'hover:scale-105'
                                    }`}
                                        onClick={() => {
                                          if (!isSelected) {
                                            addCategoryToSelection(category);
                                          }
                                        }}
                                  >
                                    {renderCategoryCard(category, isSelected, categoryPickerView === 'list')}
                                    {isSelected && (
                                      <div className="absolute inset-0 flex items-center justify-center bg-green-500/20 rounded-lg z-10">
                                        <CheckCircle className="w-6 h-6 text-green-600" />
                                      </div>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{isSelected ? 'فئة محددة مسبقاً' : 'انقر للإضافة'}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>

                  {/* معلومات إضافية */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-4">
                    <span>تم اختيار {selectedCategories.length} فئة</span>
                    <div className="flex items-center gap-2">
                      <span>متاح {filteredCategories.length} فئة</span>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setShowCategoryPicker(false)}
                        className="h-8"
                      >
                        تم
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* حالة فارغة */}
            {selectedCategories.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  لم يتم اختيار أي فئات. انقر على "اختيار فئات" لبدء الاختيار.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {(settings.selectionMethod === 'popular' || settings.selectionMethod === 'newest' || settings.selectionMethod === 'bestselling') && (
          <Alert>
            <Eye className="h-4 w-4" />
            <AlertDescription>
              {settings.selectionMethod === 'popular' 
                ? 'سيتم عرض الفئات الأكثر شعبية (بناءً على عدد المنتجات والمشاهدات)'
                : settings.selectionMethod === 'newest'
                ? 'سيتم عرض أحدث الفئات المضافة'
                : 'سيتم عرض الفئات الأكثر مبيعاً'
              }
            </AlertDescription>
          </Alert>
        )}
      </section>

      <Separator />

      {/* Preview Section */}
      <section className="space-y-3 sm:space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Label className="text-xs sm:text-sm">معاينة الفئات</Label>
            <p className="text-[10px] text-muted-foreground sm:text-xs">
              معاينة مبسطة لكيفية ظهور الفئات.
            </p>
          </div>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 sm:text-[10px] sm:px-2 sm:py-1 w-fit">
            {getCategoriesToDisplay().length} فئة
          </Badge>
        </div>

        <div className="border rounded-md p-4">
          <h3 className="text-sm font-semibold mb-2">{settings.title}</h3>
          <p className="text-xs text-muted-foreground mb-4">{settings.description}</p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {getCategoriesToDisplay().slice(0, settings.displayCount || settings.maxCategories || 6).map((category) => (
              <div key={category.id} className="border rounded-md p-3 text-center">
                <div className="font-medium text-xs">{category.name}</div>
                {settings.showDescription && category.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{category.description}</p>
                )}
                {settings.showProductCount && (
                  <div className="text-xs mt-2">
                    <Badge variant="secondary">{category.product_count || 0} منتج</Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {settings.showViewAllButton && (
            <div className="mt-4 text-center">
              <Button variant="outline" size="sm" className="text-xs">
                عرض كل الفئات
              </Button>
            </div>
          )}
        </div>
        
        <div className="text-xs text-muted-foreground">
          هذه معاينة مبسطة، وقد يختلف الشكل النهائي بناءً على تصميم متجرك.
        </div>
      </section>
    </div>
  );
};

export default React.memo(CategoryPropertiesForm);
