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
  const [showPreview, setShowPreview] = useState(false);
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

  // محرر المكون حسب النوع
  const renderEditor = () => {
    
    
    const editorProps = {
      settings: editableSettings,
      updateSetting,
      updateNestedSetting,
      addArrayItem,
      removeArrayItem,
      updateArrayItem
    };
    
    // استخدام الاسم المصغر للمقارنة
    const typeKey = type.toLowerCase();
    
    // التعامل مع المكونات حسب اسمها بغض النظر عن حالة الأحرف
    if (typeKey === 'hero') {
      return <HeroEditor {...editorProps} />;
    } 
    
    // التعامل مع مكونات الفئات
    if (typeKey === 'categorysection' || typeKey === 'productcategories' || typeKey === 'categories') {
      // تحديد النوع المناسب للمحرر
      const editorType = typeKey === 'categorysection' || typeKey === 'categories' 
        ? 'CategorySection' as const
        : 'ProductCategories' as const;
      
      return <CategorySectionEditor {...editorProps} type={editorType} />;
    }
    
    // التعامل مع المنتجات المميزة
    if (typeKey === 'featuredproducts' || typeKey === 'featured_products') {
      return <FeaturedProductsEditor {...editorProps} />;
    }
    
    // التعامل مع آراء العملاء
    if (typeKey === 'customertestimonials' || typeKey === 'testimonials') {
      return <TestimonialsEditor {...editorProps} />;
    }
    
    // التعامل مع صفحة عن المتجر
    if (typeKey === 'about') {
      return <AboutEditor {...editorProps} />;
    }
    
    // التعامل مع العروض المحدودة
    if (typeKey === 'countdownoffers' || typeKey === 'countdown_offers') {
      return <CountdownOffersEditor {...editorProps} />;
    }
    
    // إذا لم يتم التعرف على النوع، اعرض رسالة أن المحرر قيد التطوير
    return (
      <div className="text-center p-4 border border-dashed rounded-md">
        <p>محرر {type} قيد التطوير</p>
        <pre className="text-xs mt-2 text-muted-foreground overflow-auto max-h-[200px]">
          {JSON.stringify(editableSettings, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">
          {showPreview ? 'معاينة المكون' : 'تعديل الخصائص'}
        </h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowPreview(!showPreview)}
          className="h-8 px-3 text-xs flex items-center gap-1"
        >
          {showPreview ? (
            <>
              <div className="w-3.5 h-3.5">✏️</div>
              <span>تعديل</span>
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5" />
              <span>معاينة</span>
            </>
          )}
        </Button>
      </div>

      {showPreview ? (
        <div className="mt-2">
          <ComponentPreview type={type} settings={editableSettings} />
        </div>
      ) : (
        renderEditor()
      )}
    </div>
  );
};

export default ComponentEditor; 