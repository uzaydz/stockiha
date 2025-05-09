import { useState, useEffect } from 'react';

const STORAGE_KEY = 'recent-landing-page-components';
const MAX_RECENT_ITEMS = 5;

export const useRecentComponents = () => {
  const [recentComponents, setRecentComponents] = useState<string[]>([]);
  
  // استرجاع قائمة المكونات المستخدمة حديثًا من التخزين المحلي
  useEffect(() => {
    const storedRecent = localStorage.getItem(STORAGE_KEY);
    if (storedRecent) {
      try {
        setRecentComponents(JSON.parse(storedRecent));
      } catch (e) {
        console.error('Error parsing recent components:', e);
        setRecentComponents([]);
      }
    }
  }, []);
  
  // إضافة مكون إلى قائمة المستخدمة حديثًا
  const addToRecent = (componentType: string) => {
    setRecentComponents(prev => {
      // إزالة المكون إذا كان موجودًا بالفعل لتجنب التكرار
      const withoutCurrent = prev.filter(type => type !== componentType);
      
      // إضافة المكون إلى بداية القائمة والاحتفاظ بالحد الأقصى للعناصر
      const newRecent = [componentType, ...withoutCurrent].slice(0, MAX_RECENT_ITEMS);
      
      // حفظ في التخزين المحلي
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newRecent));
      
      return newRecent;
    });
  };
  
  // مسح قائمة المكونات المستخدمة حديثًا
  const clearRecentComponents = () => {
    localStorage.removeItem(STORAGE_KEY);
    setRecentComponents([]);
  };
  
  return {
    recentComponents,
    addToRecent,
    clearRecentComponents
  };
}; 