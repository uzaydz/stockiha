import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
// إزالة أيقونات الطي
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/hooks/useSidebar';
import { SideMenuProps } from './types';
import SidebarHeader from './SidebarHeader';
import SidebarNavigation from './SidebarNavigation';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const SideMenu: React.FC<SideMenuProps> = ({ userRole, userPermissions }) => {
  const { user, userProfile, signOut } = useAuth();
  // إزالة المتغيرات غير المستخدمة بعد إزالة الطي
  
  const {
    isDarkMode,
    activeGroup,
    toggleDarkMode,
    toggleGroup,
    setActiveGroup
  } = useSidebar();
  
  // القائمة دائماً مفتوحة
  const isCollapsed = false;
  
  // إزالة منطق الطي التلقائي - القائمة دائماً مفتوحة

  const handleLogout = () => {
    signOut();
    try {
      const isElectron = typeof window !== 'undefined' && window.navigator?.userAgent?.includes('Electron');
      if (isElectron) {
        window.location.hash = '#/login';
      } else {
        window.location.href = '/login';
      }
    } catch {
      window.location.href = '/login';
    }
  };

  // إزالة معالجة القوائم المنبثقة - لا حاجة لها بعد إزالة الطي

  return (
    <>
      <div 
        id="sidebar-container" 
        className={cn(
          "h-full w-72",
          "bg-sidebar-background text-sidebar-foreground",
          "flex flex-col",
          "transition-all duration-300 ease-in-out",
          "shadow-xl border-r border-sidebar-border/20"
        )}
        dir="rtl"
      >
        {/* هيدر القائمة الجانبية */}
        <SidebarHeader
          isDarkMode={isDarkMode}
          userProfile={userProfile}
          user={user}
          userRole={userRole}
          onToggleDarkMode={toggleDarkMode}
          onLogout={handleLogout}
        />

        {/* إزالة الحدود المرئية - القائمة دائماً مفتوحة */}

        {/* القسم الرئيسي للتنقل */}
        <SidebarNavigation
          activeGroup={activeGroup}
          onToggleGroup={toggleGroup}
          onSetActiveGroup={setActiveGroup}
          onLogout={handleLogout}
        />

        {/* خط فاصل قبل الفوتر */}
        <motion.div 
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.3 }}
          className="mx-5 border-t border-gradient-to-r from-transparent via-sidebar-border/40 to-transparent"
        />
      </div>

      {/* إزالة زر التوسيع - القائمة دائماً مفتوحة */}
      
      {/* إزالة طبقة التعتيم - القائمة دائماً مفتوحة */}
    </>
  );
};

export default SideMenu;
