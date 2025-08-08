import React, { useEffect, useRef, useMemo } from 'react';
import type { Category } from '@/api/store';
import { SmartNavbar } from './navbar/SmartNavbar';

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
    return {
      className,
      toggleSidebar,
      isSidebarOpen,
      isMobile
    };
  }, [className, toggleSidebar, isSidebarOpen, isMobile]);
  
  useEffect(() => {
    
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
    }
    
    if (prev.isSidebarOpen !== currentData.isSidebarOpen) {
    }
    
    if (prev.isMobile !== currentData.isMobile) {
    }
    
    previousData.current = currentData;
    
    // تسجيل stack trace عند التحديث المتكرر
    if (renderCount.current > 3) {
    }
  });

  // تسجيل البيانات الحالية

  return (
    <SmartNavbar
      {...memoizedProps}
    />
  );
};

export default React.memo(Navbar);
