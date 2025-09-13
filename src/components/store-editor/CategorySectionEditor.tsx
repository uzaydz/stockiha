import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Layers, Tag, XCircle } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTenant } from '@/context/TenantContext';
import { useToast } from '@/components/ui/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getSupabaseClient } from '@/lib/supabase';
import { useStoreEditorData } from '@/context/StoreEditorDataContext';

// واجهة الإعدادات الخاصة بقسم الفئات
interface CategorySectionSettings {
  title: string;
  description: string;
  selectionMethod: 'random' | 'bestselling' | 'manual';
  maxCategories: number;
  showProductCount: boolean;
  showDescription: boolean;
  selectedCategories: string[];
  displayStyle: 'cards' | 'grid' | 'list';
  enableViewAll: boolean;
  backgroundStyle: 'light' | 'dark' | 'brand';
}

// واجهة الفئة
interface Category {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  icon?: string;
  order_count?: number;
  product_count?: number;
}

interface CategorySectionEditorProps {
  settings: CategorySectionSettings;
  onUpdate: (newSettings: CategorySectionSettings) => void;
}

const CategorySectionEditor: React.FC<CategorySectionEditorProps> = ({ 
  settings, 
  onUpdate 
}) => {
  const { currentOrganization } = useTenant();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // استخدام الإعدادات المستلمة أو الإعدادات الافتراضية
  const [localSettings, setLocalSettings] = useState<CategorySectionSettings>(settings || {
    title: "تصفح فئات منتجاتنا",
    description: "أفضل الفئات المختارة لتلبية احتياجاتك",
    selectionMethod: "random",
    maxCategories: 6,
    showProductCount: true,
    showDescription: true,
    selectedCategories: [],
    displayStyle: "cards",
    enableViewAll: true,
    backgroundStyle: "light"
  });
  
  // جلب الفئات من Provider أو قاعدة البيانات
  useEffect(() => {
    const fetchCategories = async () => {
      if (!currentOrganization?.id) return;
      
      setIsLoading(true);
      try {
        // محاولة استخدام بيانات Provider لتفادي الاستعلام
        let providerCategories: any[] | null = null;
        try {
          const ctx = useStoreEditorData();
          providerCategories = (ctx?.data?.categories as any[]) || null;
        } catch {}

        if (providerCategories && providerCategories.length > 0) {
          setCategories(providerCategories as any[]);
          return;
        }

        // fallback: الاستعلام المباشر عند عدم توفر بيانات جاهزة
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('product_categories')
          .select('*')
          .eq('organization_id', currentOrganization.id)
          .eq('is_active', true);
        if (error) throw error;
        setCategories(data || []);
      } catch (error) {
        toast({
          title: "خطأ",
          description: "فشل في تحميل الفئات، يرجى المحاولة مرة أخرى",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCategories();
  }, [currentOrganization?.id, toast]);
  
  // تحديث الإعدادات المحلية وإرسالها للأعلى
  const updateSettings = (newPartialSettings: Partial<CategorySectionSettings>) => {
    const updatedSettings = { ...localSettings, ...newPartialSettings };
    setLocalSettings(updatedSettings);
    onUpdate(updatedSettings);
  };
  
  // إضافة أو إزالة فئة من القائمة المختارة
  const toggleCategory = (categoryId: string) => {
    let newSelectedCategories: string[];
    
    if (localSettings.selectedCategories.includes(categoryId)) {
      // إزالة الفئة إذا كانت موجودة
      newSelectedCategories = localSettings.selectedCategories.filter(id => id !== categoryId);
    } else {
      // إضافة الفئة إذا لم تكن موجودة
      newSelectedCategories = [...localSettings.selectedCategories, categoryId];
    }
    
    updateSettings({ selectedCategories: newSelectedCategories });
  };
  
  // ترتيب الفئات حسب المبيعات
  const bestsellingCategories = [...categories].sort((a, b) => {
    return (b.order_count || 0) - (a.order_count || 0);
  });
  
  // الحصول على قائمة الفئات المناسبة للعرض حسب طريقة الاختيار
  const getCategoriesToDisplay = () => {
    if (localSettings.selectionMethod === 'bestselling') {
      return bestsellingCategories;
    } else if (localSettings.selectionMethod === 'manual') {
      // الفئات المختارة يدويًا
      return categories.filter(cat => localSettings.selectedCategories.includes(cat.id));
    } else {
      // random - العشوائية هي الخيار الافتراضي
      return [...categories].sort(() => Math.random() - 0.5);
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Layers className="h-5 w-5" />
          <span>إعدادات قسم الفئات</span>
        </CardTitle>
        <CardDescription>
          قم بتخصيص كيفية عرض فئات المنتجات في متجرك
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="general">عام</TabsTrigger>
            <TabsTrigger value="selection">اختيار الفئات</TabsTrigger>
            <TabsTrigger value="display">خيارات العرض</TabsTrigger>
            <TabsTrigger value="preview">معاينة</TabsTrigger>
          </TabsList>
          
          {/* علامة التبويب العامة */}
          <TabsContent value="general" className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="title">عنوان القسم</Label>
                <Input
                  id="title"
                  value={localSettings.title}
                  onChange={(e) => updateSettings({ title: e.target.value })}
                  placeholder="أدخل عنوان القسم"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="description">وصف القسم</Label>
                <Textarea
                  id="description"
                  value={localSettings.description}
                  onChange={(e) => updateSettings({ description: e.target.value })}
                  placeholder="أدخل وصفًا قصيرًا للقسم"
                  rows={3}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="maxCategories">الحد الأقصى لعدد الفئات ({localSettings.maxCategories})</Label>
                <Slider
                  id="maxCategories"
                  min={1}
                  max={12}
                  step={1}
                  value={[localSettings.maxCategories]}
                  onValueChange={(value) => updateSettings({ maxCategories: value[0] })}
                />
              </div>
              
              <Separator className="my-4" />
              
              <div className="grid gap-2">
                <Label htmlFor="backgroundStyle">خلفية القسم</Label>
                <Select 
                  value={localSettings.backgroundStyle} 
                  onValueChange={(value) => updateSettings({ backgroundStyle: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نمط الخلفية" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">فاتحة</SelectItem>
                    <SelectItem value="dark">داكنة</SelectItem>
                    <SelectItem value="brand">لون العلامة التجارية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>
          
          {/* علامة تبويب اختيار الفئات */}
          <TabsContent value="selection" className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="selectionMethod">طريقة اختيار الفئات</Label>
                <Select 
                  value={localSettings.selectionMethod} 
                  onValueChange={(value) => updateSettings({ selectionMethod: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر طريقة عرض الفئات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="random">عشوائي</SelectItem>
                    <SelectItem value="bestselling">الأكثر مبيعًا</SelectItem>
                    <SelectItem value="manual">اختيار يدوي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {localSettings.selectionMethod === 'manual' && (
                <div className="border rounded-md p-4">
                  <Label className="mb-2 block">اختر الفئات التي تريد عرضها</Label>
                  
                  {isLoading ? (
                    <div className="text-center py-4">جاري تحميل الفئات...</div>
                  ) : categories.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      لم يتم العثور على فئات. أضف فئات جديدة أولاً.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                      {categories.map((category) => (
                        <div 
                          key={category.id}
                          className={`flex items-center justify-between p-3 rounded-md border cursor-pointer transition-all ${
                            localSettings.selectedCategories.includes(category.id)
                              ? 'bg-primary/10 border-primary'
                              : 'bg-card hover:bg-muted/50'
                          }`}
                          onClick={() => toggleCategory(category.id)}
                        >
                          <div className="flex items-center gap-2">
                            {category.icon ? (
                              <span className="text-muted-foreground">{category.icon}</span>
                            ) : (
                              <Tag className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span>{category.name}</span>
                          </div>
                          {localSettings.selectedCategories.includes(category.id) ? (
                            <CheckCircle className="h-5 w-5 text-primary" />
                          ) : (
                            <XCircle className="h-5 w-5 text-muted-foreground opacity-30" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="mt-4 text-muted-foreground text-sm">
                    الفئات المختارة: {localSettings.selectedCategories.length}
                  </div>
                </div>
              )}
              
              {localSettings.selectionMethod === 'bestselling' && (
                <div className="border rounded-md p-4">
                  <div className="text-sm text-muted-foreground mb-2">
                    قائمة الفئات الأكثر مبيعًا (سيتم عرض {localSettings.maxCategories} فئات فقط)
                  </div>
                  
                  {bestsellingCategories.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      لا توجد بيانات مبيعات للفئات حتى الآن.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {bestsellingCategories.slice(0, localSettings.maxCategories).map((category, index) => (
                        <div key={category.id} className="flex items-center justify-between p-2 border rounded-md">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{index + 1}</Badge>
                            <span>{category.name}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {category.order_count || 0} طلب
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* علامة تبويب خيارات العرض */}
          <TabsContent value="display" className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="displayStyle">نمط عرض الفئات</Label>
                <Select 
                  value={localSettings.displayStyle} 
                  onValueChange={(value) => updateSettings({ displayStyle: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نمط عرض الفئات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cards">بطاقات كبيرة</SelectItem>
                    <SelectItem value="grid">شبكة مربعات</SelectItem>
                    <SelectItem value="list">قائمة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="showDescription" className="cursor-pointer">
                  إظهار وصف الفئات
                </Label>
                <Switch
                  id="showDescription"
                  checked={localSettings.showDescription}
                  onCheckedChange={(checked) => updateSettings({ showDescription: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="showProductCount" className="cursor-pointer">
                  إظهار عدد المنتجات
                </Label>
                <Switch
                  id="showProductCount"
                  checked={localSettings.showProductCount}
                  onCheckedChange={(checked) => updateSettings({ showProductCount: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="enableViewAll" className="cursor-pointer">
                  إظهار زر "عرض الكل"
                </Label>
                <Switch
                  id="enableViewAll"
                  checked={localSettings.enableViewAll}
                  onCheckedChange={(checked) => updateSettings({ enableViewAll: checked })}
                />
              </div>
            </div>
          </TabsContent>
          
          {/* علامة تبويب المعاينة */}
          <TabsContent value="preview" className="space-y-4">
            <div className="border rounded-md p-4">
              <h3 className="text-lg font-semibold mb-4">{localSettings.title}</h3>
              <p className="text-sm text-muted-foreground mb-6">{localSettings.description}</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {getCategoriesToDisplay().slice(0, localSettings.maxCategories).map((category) => (
                  <div key={category.id} className="border rounded-md p-3 text-center">
                    <div className="font-medium">{category.name}</div>
                    {localSettings.showDescription && category.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{category.description}</p>
                    )}
                    {localSettings.showProductCount && (
                      <div className="text-xs mt-2">
                        <Badge variant="secondary">{category.product_count || 0} منتج</Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {localSettings.enableViewAll && (
                <div className="mt-4 text-center">
                  <Button variant="outline" size="sm">
                    عرض كل الفئات
                  </Button>
                </div>
              )}
            </div>
            
            <div className="text-sm text-muted-foreground mt-2">
              هذه معاينة مبسطة، وقد يختلف الشكل النهائي بناءً على تصميم متجرك.
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CategorySectionEditor;
