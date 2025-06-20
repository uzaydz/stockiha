import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { getCategories } from '@/lib/api/categories';

interface CategorySelectorProps {
  selectedCategories: string[];
  onChange: (categories: string[]) => void;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ selectedCategories = [], onChange }) => {
  const [categories, setCategories] = useState<{ id: string, name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // جلب قائمة الفئات من قاعدة البيانات
  useEffect(() => {
    // إعادة تعيين التحميل عند تغيير الفئات المحددة
    setLoading(true);
    
    const fetchCategories = async () => {
      try {
        const data = await getCategories();
        
        // تصفية الفئات النشطة فقط
        const activeCategories = data.filter(cat => cat.is_active).map(cat => ({
          id: cat.id,
          name: cat.name
        }));
        
        setCategories(activeCategories);
        setError(null);
      } catch (err) {
        setError('حدث خطأ أثناء جلب الفئات. يرجى المحاولة مرة أخرى.');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [selectedCategories.length]); // إعادة جلب البيانات عند تغيير الفئات المحددة

  // التبديل بين تحديد وإلغاء تحديد فئة
  const toggleCategory = (categoryId: string) => {
    const isSelected = selectedCategories.includes(categoryId);
    
    if (isSelected) {
      // إزالة الفئة من القائمة المحددة
      onChange(selectedCategories.filter(id => id !== categoryId));
    } else {
      // إضافة الفئة إلى القائمة المحددة
      onChange([...selectedCategories, categoryId]);
    }
  };

  if (loading) {
    return (
      <div className="text-center p-4">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
        <p className="text-xs mt-2 text-muted-foreground">جاري تحميل الفئات...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-destructive/20 bg-destructive/10 rounded-md">
        <p className="text-xs text-destructive">{error}</p>
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-2 text-xs h-8 w-full"
          onClick={() => window.location.reload()}
        >
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label className="text-xs font-medium">اختر الفئات المطلوب عرضها</Label>
        <span className="text-xs text-muted-foreground">المحدد: {selectedCategories.length}</span>
      </div>
      
      {categories.length === 0 ? (
        <div className="text-center py-4 border border-dashed rounded-md">
          <p className="text-sm text-muted-foreground">لا توجد فئات متاحة</p>
        </div>
      ) : (
        <div className="max-h-[200px] overflow-y-auto space-y-1 border rounded-md p-2">
          {categories.map(category => (
            <div 
              key={category.id}
              className={`flex items-center px-3 py-2 rounded-md cursor-pointer hover:bg-muted transition-colors ${
                selectedCategories.includes(category.id) ? 'bg-primary/10' : ''
              }`}
              onClick={() => toggleCategory(category.id)}
            >
              <div className="flex-1">
                <span className="text-sm font-medium">{category.name}</span>
              </div>
              <div className="flex items-center justify-center h-5 w-5">
                {selectedCategories.includes(category.id) && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex gap-2 mt-2">
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-8 flex-1"
          onClick={() => onChange(categories.map(c => c.id))}
        >
          تحديد الكل
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-8 flex-1"
          onClick={() => onChange([])}
        >
          إلغاء تحديد الكل
        </Button>
      </div>
    </div>
  );
};

export default CategorySelector;
