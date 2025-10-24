import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Filter,
  ChevronDown,
  Loader2,
  Check,
  X,
  Layers,
  FolderOpen,
  Folder,
  Settings,
  Search
} from 'lucide-react';
import { useCategoriesCache } from '@/hooks/useCategoriesCache';
import { Category, Subcategory } from '@/lib/api/categories';
import { toast } from 'sonner';

interface AdvancedCategoriesFilterProps {
  selectedCategories: string[];
  selectedSubcategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  onSubcategoriesChange: (subcategories: string[]) => void;
  onClearFilters: () => void;
  className?: string;
}


const AdvancedCategoriesFilter: React.FC<AdvancedCategoriesFilterProps> = ({
  selectedCategories,
  selectedSubcategories,
  onCategoriesChange,
  onSubcategoriesChange,
  onClearFilters,
  className
}) => {
  const { categories, isLoading, error } = useCategoriesCache();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'categories' | 'subcategories'>('categories');
  const [simpleMode, setSimpleMode] = useState(true); // تبدأ بالوضع البسيط

  // عرض رسالة خطأ إذا حدث خطأ في جلب الفئات
  useEffect(() => {
    if (error) {
      toast.error('فشل في تحميل الفئات');
    }
  }, [error]);

  // تصفية الفئات حسب البحث
  const filteredCategories = useMemo(() => {
    if (!searchTerm) return categories;

    return categories.filter(category =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.subcategories?.some(sub =>
        sub.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [categories, searchTerm]);

  // الحصول على الفئات الفرعية المختارة
  const selectedSubcategoriesData = useMemo(() => {
    const result: { subcategory: Subcategory; categoryName: string }[] = [];

    selectedSubcategories.forEach(subId => {
      filteredCategories.forEach(category => {
        const subcategory = category.subcategories?.find(sub => sub.id === subId);
        if (subcategory) {
          result.push({
            subcategory,
            categoryName: category.name
          });
        }
      });
    });

    return result;
  }, [selectedSubcategories, filteredCategories]);

  // التحكم في اختيار الفئة
  const handleCategoryToggle = (categoryId: string, checked: boolean) => {
    if (checked) {
      onCategoriesChange([...selectedCategories, categoryId]);
      // عند اختيار فئة، اختر جميع فئاتها الفرعية
      const category = filteredCategories.find(c => c.id === categoryId);
      if (category?.subcategories) {
        const subcategoryIds = category.subcategories.map(sub => sub.id);
        const newSelectedSubs = [...new Set([...selectedSubcategories, ...subcategoryIds])];
        onSubcategoriesChange(newSelectedSubs);
      }
    } else {
      onCategoriesChange(selectedCategories.filter(id => id !== categoryId));
      // عند إلغاء اختيار فئة، أزل جميع فئاتها الفرعية
      const category = filteredCategories.find(c => c.id === categoryId);
      if (category?.subcategories) {
        const subcategoryIds = category.subcategories.map(sub => sub.id);
        onSubcategoriesChange(selectedSubcategories.filter(id => !subcategoryIds.includes(id)));
      }
    }
  };

  // التحكم في اختيار الفئة الفرعية
  const handleSubcategoryToggle = (subcategoryId: string, categoryId: string, checked: boolean) => {
    if (checked) {
      const newSelectedSubs = [...selectedSubcategories, subcategoryId];
      onSubcategoriesChange(newSelectedSubs);
      // تأكد من أن الفئة الأم مختارة
      if (!selectedCategories.includes(categoryId)) {
        onCategoriesChange([...selectedCategories, categoryId]);
      }
    } else {
      onSubcategoriesChange(selectedSubcategories.filter(id => id !== subcategoryId));
      // تحقق إذا كانت هناك فئات فرعية أخرى مختارة من نفس الفئة
      const category = filteredCategories.find(c => c.id === categoryId);
      if (category?.subcategories) {
        const hasOtherSelectedSubs = category.subcategories.some(sub =>
          sub.id !== subcategoryId && selectedSubcategories.includes(sub.id)
        );
        if (!hasOtherSelectedSubs) {
          onCategoriesChange(selectedCategories.filter(id => id !== categoryId));
        }
      }
    }
  };

  // حساب عدد العناصر المختارة
  const selectedCount = selectedCategories.length + selectedSubcategories.length;

  // إعادة تعيين جميع الفلاتر
  const handleClearAll = () => {
    onCategoriesChange([]);
    onSubcategoriesChange([]);
    setSearchTerm('');
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center p-4", className)}>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-sm text-muted-foreground">جاري تحميل الفئات...</span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* زر الفلتر الرئيسي */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-between h-10 bg-background border rounded-lg shadow-sm",
              selectedCount > 0 && "border-primary bg-primary/5"
            )}
          >
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              <span>تصفية الفئات</span>
              {selectedCount > 0 && (
                <Badge variant="secondary" className="mr-2">
                  {selectedCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  setSimpleMode(!simpleMode);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    setSimpleMode(!simpleMode);
                  }
                }}
                className="h-6 w-6 p-0 hover:bg-muted rounded flex items-center justify-center transition-colors cursor-pointer"
                title={simpleMode ? "الوضع المتقدم" : "الوضع البسيط"}
              >
                <Settings className="h-3 w-3" />
              </span>
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform duration-200",
                isOpen && "rotate-180"
              )} />
            </div>
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 p-4 bg-background border rounded-lg shadow-sm mt-2"
          >
            {/* شريط البحث - في الوضع المتقدم فقط */}
            {!simpleMode && (
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="البحث عن فئة..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-3 pr-10 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchTerm('')}
                    className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  >
                    <X className="h-3 w-3" />
                    <span className="sr-only">مسح البحث</span>
                  </Button>
                )}
              </div>
            )}

            {/* تبويبات الفئات - في الوضع المتقدم فقط */}
            {!simpleMode && (
              <div className="flex gap-2 p-1 bg-muted/30 rounded-lg">
                <Button
                  variant={viewMode === 'categories' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('categories')}
                  className="flex-1 h-8"
                >
                  الفئات الرئيسية
                </Button>
                <Button
                  variant={viewMode === 'subcategories' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('subcategories')}
                  className="flex-1 h-8"
                >
                  الفئات الفرعية
                </Button>
              </div>
            )}

            {/* قائمة الفئات */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredCategories.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">لا توجد فئات متاحة</p>
                </div>
              ) : simpleMode ? (
                // الوضع البسيط - عرض الفئات الرئيسية فقط
                filteredCategories.map((category) => {
                  const isCategorySelected = selectedCategories.includes(category.id);

                  return (
                    <div key={category.id} className="flex items-center space-x-3 space-x-reverse p-3 rounded-lg hover:bg-muted/50 transition-colors border border-border/50">
                      <Checkbox
                        id={`category-${category.id}`}
                        checked={isCategorySelected}
                        onCheckedChange={(checked) =>
                          handleCategoryToggle(category.id, checked as boolean)
                        }
                      />
                      <div className="flex items-center gap-3 flex-1">
                        {category.icon ? (
                          <span className="text-lg">{category.icon}</span>
                        ) : (
                          <Folder className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div className="flex-1">
                          <Label
                            htmlFor={`category-${category.id}`}
                            className="font-medium cursor-pointer text-sm"
                          >
                            {category.name}
                          </Label>
                          {category.subcategories && category.subcategories.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              ستشمل جميع الفئات الفرعية ({category.subcategories.length})
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : viewMode === 'categories' ? (
                // الوضع المتقدم - الفئات الرئيسية
                filteredCategories.map((category) => {
                  const isCategorySelected = selectedCategories.includes(category.id);
                  const selectedSubsCount = category.subcategories?.filter(sub =>
                    selectedSubcategories.includes(sub.id)
                  ).length || 0;

                  return (
                    <div key={category.id} className="flex items-center space-x-3 space-x-reverse p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <Checkbox
                        id={`category-${category.id}`}
                        checked={isCategorySelected}
                        onCheckedChange={(checked) =>
                          handleCategoryToggle(category.id, checked as boolean)
                        }
                      />
                      <div className="flex items-center gap-2 flex-1">
                        {category.icon ? (
                          <span className="text-lg">{category.icon}</span>
                        ) : (
                          <Folder className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div className="flex-1">
                          <Label
                            htmlFor={`category-${category.id}`}
                            className="font-medium cursor-pointer text-sm"
                          >
                            {category.name}
                          </Label>
                          {category.subcategories && category.subcategories.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {category.subcategories.length} فئة فرعية
                              {selectedSubsCount > 0 && (
                                <span className="text-primary"> • {selectedSubsCount} مختارة</span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                // الوضع المتقدم - الفئات الفرعية
                filteredCategories.flatMap((category) =>
                  category.subcategories?.map((subcategory) => {
                    const isSubSelected = selectedSubcategories.includes(subcategory.id);

                    return (
                      <div key={subcategory.id} className="flex items-center space-x-3 space-x-reverse p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <Checkbox
                          id={`subcategory-${subcategory.id}`}
                          checked={isSubSelected}
                          onCheckedChange={(checked) =>
                            handleSubcategoryToggle(subcategory.id, category.id, checked as boolean)
                          }
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <FolderOpen className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <Label
                              htmlFor={`subcategory-${subcategory.id}`}
                              className="font-medium cursor-pointer text-sm"
                            >
                              {subcategory.name}
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              {category.name}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }) || []
                )
              )}
            </div>

            {/* أزرار التحكم */}
            <div className="flex gap-2 pt-2 border-t border-border/50">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                disabled={selectedCount === 0}
                className="flex-1 h-8"
              >
                <X className="h-4 w-4 mr-2" />
                مسح الكل
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="flex-1 h-8"
              >
                <Check className="h-4 w-4 mr-2" />
                تطبيق ({selectedCount})
              </Button>
            </div>
          </motion.div>
        </CollapsibleContent>
      </Collapsible>

      {/* عرض الفلاتر النشطة */}
      {selectedCount > 0 && (
        <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">الفلاتر النشطة:</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="h-6 text-xs hover:bg-muted"
            >
              مسح الكل
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* الفئات الرئيسية المختارة */}
            {selectedCategories.map((categoryId) => {
              const category = categories.find(c => c.id === categoryId);
              if (!category) return null;

              return (
                <Badge key={categoryId} variant="secondary" className="gap-1 text-xs">
                  {category.icon && <span className="text-xs">{category.icon}</span>}
                  {category.name}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCategoryToggle(categoryId, false)}
                    className="h-3 w-3 p-0 hover:bg-transparent"
                  >
                    <X className="h-2 w-2" />
                  </Button>
                </Badge>
              );
            })}

            {/* الفئات الفرعية المختارة */}
            {selectedSubcategoriesData.map(({ subcategory, categoryName }) => (
              <Badge key={subcategory.id} variant="outline" className="gap-1 text-xs">
                <FolderOpen className="h-3 w-3" />
                {subcategory.name}
                <span className="text-muted-foreground">({categoryName})</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // ابحث عن الفئة الأم للحصول على categoryId
                    const parentCategory = categories.find(c =>
                      c.subcategories?.some(sub => sub.id === subcategory.id)
                    );
                    if (parentCategory) {
                      handleSubcategoryToggle(subcategory.id, parentCategory.id, false);
                    }
                  }}
                  className="h-3 w-3 p-0 hover:bg-transparent"
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(AdvancedCategoriesFilter);
