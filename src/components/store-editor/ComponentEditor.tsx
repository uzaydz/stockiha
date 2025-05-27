import React, { useState, useEffect } from 'react';
import { StoreComponent } from '@/types/store-editor';
import { Button } from '@/components/ui/button';
import { Eye, Save } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// استيراد محررات المكونات
import HeroEditor from './editors/HeroEditor';
import CategorySectionEditor from './editors/CategorySectionEditor';
import FeaturedProductsEditor from './editors/FeaturedProductsEditor';
import TestimonialsEditor from './editors/TestimonialsEditor';
import AboutEditor from './editors/AboutEditor';
import CountdownOffersEditor from './editors/CountdownOffersEditor';
import FooterEditor from './editors/FooterEditor';

// استيراد مكون المعاينة
import ComponentPreview from './preview/ComponentPreview';

interface ComponentEditorProps {
  component: StoreComponent;
  onUpdate: (settings: any) => void;
  onSave?: () => Promise<void>;
}

/**
 * محرر لمكونات المتجر، يعرض واجهة التحرير المناسبة حسب نوع المكون
 */
const ComponentEditor: React.FC<ComponentEditorProps> = ({ component, onUpdate, onSave }) => {
  const [editableSettings, setEditableSettings] = useState(component.settings || {});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  
  const { type } = component;

  // تحديث الإعدادات المحلية عند تغيير المكون
  useEffect(() => {
    setEditableSettings(component.settings || {});
    setHasUnsavedChanges(false);
  }, [component.settings]);

  // دالة تحديث الإعدادات
  const updateSettings = (newSettings: any) => {
    setEditableSettings(newSettings);
    setHasUnsavedChanges(true);
    onUpdate(newSettings);
  };

  // تحديث إعداد واحد
  const updateSetting = (key: string, value: any) => {
    const newSettings = { ...editableSettings, [key]: value };
    updateSettings(newSettings);
  };

  // تحديث إعداد متداخل
  const updateNestedSetting = (path: string[], value: any) => {
    const newSettings = { ...editableSettings };
    let current = newSettings;
    
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) {
        current[path[i]] = {};
      }
      current = current[path[i]];
    }
    
    current[path[path.length - 1]] = value;
    updateSettings(newSettings);
  };

  // إضافة عنصر إلى مصفوفة
  const addArrayItem = (key: string, item: any) => {
    const array = [...(editableSettings[key] || [])];
    array.push(item);
    updateSetting(key, array);
  };

  // حذف عنصر من مصفوفة
  const removeArrayItem = (key: string, index: number) => {
    const array = [...(editableSettings[key] || [])];
    array.splice(index, 1);
    updateSetting(key, array);
  };

  // تحديث عنصر في مصفوفة داخل الإعدادات
  const updateArrayItem = (key: string, index: number, value: any) => {
    const array = [...(editableSettings[key] || [])];
    array[index] = value;
    updateSetting(key, array);
  };

  // تحديث عدة إعدادات معاً (للحفظ المُجمع)
  const updateMultipleSettings = (updates: Record<string, any>) => {
    const newSettings = { ...editableSettings, ...updates };
    updateSettings(newSettings);
  };

  // حفظ التغييرات
  const handleSave = async () => {
    if (!onSave) {
      console.warn('ComponentEditor: onSave function not provided');
      return;
    }
    
    setIsSaving(true);
    try {
      await onSave();
      setHasUnsavedChanges(false);
      toast({
        title: "تم الحفظ بنجاح",
        description: `تم حفظ إعدادات ${getComponentDisplayName(type)} بنجاح`,
      });
    } catch (error) {
      console.error('ComponentEditor: Save error:', error);
      toast({
        title: "خطأ في الحفظ",
        description: "حدث خطأ أثناء حفظ التغييرات",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // الحصول على اسم المكون للعرض
  const getComponentDisplayName = (type: string) => {
    const typeKey = type.toLowerCase();
    switch (typeKey) {
      case 'hero': return 'القسم الرئيسي';
      case 'category_section':
      case 'categorysection':
      case 'product_categories':
      case 'categories': return 'قسم الفئات';
      case 'featured_products':
      case 'featuredproducts': return 'المنتجات المميزة';
      case 'testimonials':
      case 'customertestimonials': return 'آراء العملاء';
      case 'about': return 'عن المتجر';
      case 'countdownoffers': return 'العروض المحدودة';
      case 'footer': return 'الفوتر';
      default: return type;
    }
  };

  // محرر المكون حسب النوع
  const renderEditor = () => {
    const editorProps = {
      settings: editableSettings,
      updateSetting,
      updateNestedSetting,
      addArrayItem,
      removeArrayItem,
      updateArrayItem,
      updateMultipleSettings,
      onSave: onSave
    };
    
    // استخدام الاسم المصغر للمقارنة
    const typeKey = type.toLowerCase();
    
    // التعامل مع المكونات حسب اسمها بغض النظر عن حالة الأحرف
    if (typeKey === 'hero') {
      return <HeroEditor {...editorProps} />;
    } 
    
    // التعامل مع مكونات الفئات - إضافة "categories" للتوافق مع قاعدة البيانات
    if (typeKey === 'category_section' || typeKey === 'categorysection' || typeKey === 'product_categories' || typeKey === 'categories') {
      // تحديد النوع المناسب للمحرر
      const editorType = (typeKey === 'category_section' || typeKey === 'categorysection')
        ? 'CategorySection' as const
        : 'ProductCategories' as const;
      
      return <CategorySectionEditor {...editorProps} type={editorType} />;
    }
    
    // التعامل مع المنتجات المميزة - إضافة "featuredproducts" للتوافق
    if (typeKey === 'featured_products' || typeKey === 'featuredproducts') {
      return <FeaturedProductsEditor {...editorProps} />;
    }
    
    // التعامل مع آراء العملاء - إضافة "customertestimonials" للتوافق
    if (typeKey === 'testimonials' || typeKey === 'customertestimonials') {
      return <TestimonialsEditor {...editorProps} />;
    }
    
    // التعامل مع صفحة عن المتجر
    if (typeKey === 'about') {
      return <AboutEditor {...editorProps} />;
    }
    
    // التعامل مع العروض المحدودة
    if (typeKey === 'countdownoffers') {
      return <CountdownOffersEditor {...editorProps} />;
    }
    
    // التعامل مع الفوتر
    if (typeKey === 'footer') {
      return <FooterEditor {...editorProps} />;
    }
    
    // إذا لم يتم التعرف على النوع، اعرض محرر عام مع زر حفظ
    return (
      <div className="space-y-6">
        {/* Header with Save Button */}
        <Card className="border-border/50 shadow-lg dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4 bg-gradient-to-r from-muted/40 to-muted/20 dark:from-muted/20 dark:to-muted/10 rounded-t-lg border-b border-border/30">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-foreground">تحرير {getComponentDisplayName(type)}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">محرر {type} قيد التطوير</p>
              </div>
              {onSave && (
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !hasUnsavedChanges}
                  className="flex items-center gap-2 h-9 px-4 text-sm bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </Button>
              )}
            </div>
          </CardHeader>
        </Card>

        <Card className="border-border/50 shadow-lg dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="text-center p-6 border border-dashed rounded-md bg-muted/20">
              <p className="text-muted-foreground mb-3">محرر {type} قيد التطوير</p>
              <details className="text-left">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                  عرض الإعدادات الحالية
                </summary>
                <pre className="text-xs mt-2 text-muted-foreground overflow-auto max-h-[200px] bg-background/50 p-3 rounded border">
                  {JSON.stringify(editableSettings, null, 2)}
                </pre>
              </details>
            </div>
          </CardContent>
        </Card>

        {/* Bottom Save Button */}
        {onSave && (
          <Card className="border-border/50 shadow-lg dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {hasUnsavedChanges ? 'لديك تغييرات غير محفوظة' : 'جميع التغييرات محفوظة'}
                </div>
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !hasUnsavedChanges}
                  className="flex items-center gap-2 px-6 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'جاري الحفظ...' : 'حفظ جميع التغييرات'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {renderEditor()}
    </div>
  );
};

export default ComponentEditor;
