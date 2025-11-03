import { useState, useCallback } from 'react';
import { Product } from '@/types';
import { FilterState, Category, ViewMode, SortBy, SortOrder, StockFilter, ActiveTab } from '../types';

/**
 * Hook محسّن لإدارة حالة UI فقط - بدون تصفية مزدوجة
 * التصفية والترتيب والبحث يتم على مستوى الـ API
 * هذا الـ Hook مسؤول فقط عن:
 * 1. إدارة حالة واجهة المستخدم (viewMode, activeTab)
 * 2. استخراج الفئات المتاحة
 */

/**
 * استخراج الفئات بشكل محسّن
 * يعتمد على productCategories المُمرر من الـ API
 */
const extractCategories = (productCategories: any[]): Category[] => {
  if (!productCategories || productCategories.length === 0) {
    return [];
  }
  
  return productCategories.map((cat: any) => ({
    id: cat.id || cat.category_id,
    name: cat.name || cat.category_name || `فئة ${cat.id || cat.category_id}`
  }));
};

export const usePOSFilters = (productCategories: any[]) => {
  // حالات UI فقط - بدون تصفية
  const [filterState, setFilterState] = useState<FilterState>({
    searchQuery: '', // يُستخدم للعرض فقط، التصفية الفعلية على الـ API
    selectedCategory: 'all', // يُستخدم للعرض فقط
    viewMode: 'grid',
    sortBy: 'name', // يُستخدم للعرض فقط
    sortOrder: 'asc',
    stockFilter: 'all', // يُستخدم للعرض فقط
    activeTab: 'products'
  });

  // دالة تحديث حالة UI - بسيطة ومباشرة
  const updateFilterState = useCallback((updates: Partial<FilterState>) => {
    setFilterState(prev => {
      // تحسين بسيط: تجنب التحديث إذا لم تتغير القيم
      const hasChanges = Object.keys(updates).some(key => 
        prev[key as keyof FilterState] !== updates[key as keyof FilterState]
      );
      
      if (!hasChanges) return prev;
      
      return { ...prev, ...updates };
    });
  }, []);

  // دوال مساعدة لتحديث حالات محددة (اختيارية - للراحة)
  const setViewMode = useCallback((viewMode: ViewMode) => {
    updateFilterState({ viewMode });
  }, [updateFilterState]);

  const setActiveTab = useCallback((activeTab: ActiveTab) => {
    updateFilterState({ activeTab });
  }, [updateFilterState]);

  // استخراج الفئات من البيانات المُمررة من الـ API
  const availableCategories = extractCategories(productCategories);

  return {
    filterState,
    updateFilterState,
    setViewMode,
    setActiveTab,
    availableCategories
  };
};
