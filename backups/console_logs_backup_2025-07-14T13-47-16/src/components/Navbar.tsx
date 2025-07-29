import React, { useEffect, useRef, useMemo } from 'react';
import type { Category } from '@/api/store';
import { NavbarMain } from './navbar/NavbarMain';

export interface NavbarProps {
  className?: string;
  toggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  categories?: Category[];
  isMobile?: boolean;
}

const Navbar = ({ 
  className, 
  toggleSidebar, 
  isSidebarOpen, 
  categories, 
  isMobile 
}: NavbarProps) => {
  // تتبع عدد التحديثات
  const renderCount = useRef(0);
  renderCount.current += 1;

  // تتبع التغييرات في البيانات
  const previousData = useRef<any>({});
  
  // تحسين: استخدام useMemo للبيانات المستقرة
  const memoizedProps = useMemo(() => {
    console.log(`🔄 [Navbar] Props memoization - categories: ${categories?.length || 0}`);
    return {
      className,
      toggleSidebar,
      isSidebarOpen,
      isMobile
    };
  }, [className, toggleSidebar, isSidebarOpen, isMobile]);
  
  useEffect(() => {
    console.log(`🔄 [Navbar] Render #${renderCount.current} - تحديث Navbar`);
    
    // تتبع التغييرات في البيانات
    const currentData = {
      categoriesCount: categories?.length || 0,
      isSidebarOpen,
      isMobile,
      hasClassName: !!className,
      hasToggleSidebar: !!toggleSidebar
    };

    const prev = previousData.current;
    
    if (prev.categoriesCount !== currentData.categoriesCount) {
      console.log(`📊 [Navbar] Categories changed: ${prev.categoriesCount} → ${currentData.categoriesCount}`);
    }
    
    if (prev.isSidebarOpen !== currentData.isSidebarOpen) {
      console.log(`📱 [Navbar] Sidebar state changed: ${prev.isSidebarOpen} → ${currentData.isSidebarOpen}`);
    }
    
    if (prev.isMobile !== currentData.isMobile) {
      console.log(`📱 [Navbar] Mobile state changed: ${prev.isMobile} → ${currentData.isMobile}`);
    }
    
    previousData.current = currentData;
    
    // تسجيل stack trace عند التحديث المتكرر
    if (renderCount.current > 3) {
      console.warn(`⚠️ [Navbar] تحديث متكرر (#${renderCount.current}) - Stack trace:`);
      console.trace();
    }
  });

  // تسجيل البيانات الحالية
  console.log(`📋 [Navbar] Current props:`, {
    categoriesCount: categories?.length || 0,
    isSidebarOpen,
    isMobile,
    hasClassName: !!className,
    hasToggleSidebar: !!toggleSidebar,
    renderCount: renderCount.current
  });

  return (
    <NavbarMain
      {...memoizedProps}
    />
  );
};

export default React.memo(Navbar);
