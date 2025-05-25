import React, { useState, useEffect } from 'react';
import { StoreComponent } from '@/types/store-editor';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

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
}

/**
 * محرر لمكونات المتجر، يعرض واجهة التحرير المناسبة حسب نوع المكون
 */
const ComponentEditor: React.FC<ComponentEditorProps> = ({ component, onUpdate }) => {
  const { type, settings } = component;
  const [editableSettings, setEditableSettings] = useState<any>({ ...settings });
  const { toast } = useToast();

  // تحديث الإعدادات عند تغيير المكون
  useEffect(() => {
    setEditableSettings({ ...settings });
  }, [component.id, settings]);

  // تحديث الإعدادات ونشر التغييرات
  const updateSettings = (newSettings: any) => {
    setEditableSettings(newSettings);
    onUpdate(newSettings);
  };

  // تحديث قيمة بمسار معين داخل الإعدادات
  const updateNestedSetting = (path: string[], value: any) => {
    const newSettings = { ...editableSettings };
    let current = newSettings;
    
    // إنشاء المسار بشكل كامل إذا لم يكن موجوداً
    for (let i = 0; i < path.length - 1; i++) {
      if (current[path[i]] === undefined) {
        current[path[i]] = {};
      }
      current = current[path[i]];
    }
    
    current[path[path.length - 1]] = value;
    
    updateSettings(newSettings);
  };

  // تحديث خاصية في المستوى الأعلى من الإعدادات
  const updateSetting = (key: string, value: any) => {
    updateSettings({ ...editableSettings, [key]: value });
  };

  // إضافة عنصر إلى مصفوفة داخل الإعدادات
  const addArrayItem = (key: string, item: any) => {
    const array = [...(editableSettings[key] || [])];
    array.push(item);
    updateSetting(key, array);
  };

  // حذف عنصر من مصفوفة داخل الإعدادات
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

  // محرر المكون حسب النوع
  const renderEditor = () => {
    const editorProps = {
      settings: editableSettings,
      updateSetting,
      updateNestedSetting,
      addArrayItem,
      removeArrayItem,
      updateArrayItem,
      updateMultipleSettings
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
    
    // إذا لم يتم التعرف على النوع، اعرض رسالة أن المحرر قيد التطوير
    return (
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
    );
  };

  return (
    <div className="space-y-4">
      {renderEditor()}
    </div>
  );
};

export default ComponentEditor; 