import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ArrowLeftToLine } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/hooks/useSidebar';
import { SideMenuProps } from './types';
import SidebarHeader from './SidebarHeader';
import SidebarNavigation from './SidebarNavigation';

const SideMenu: React.FC<SideMenuProps> = ({ userRole, userPermissions }) => {
  const { user, userProfile, signOut } = useAuth();
  const popupRef = useRef<HTMLDivElement>(null);
  
  const {
    isCollapsed,
    activePopup,
    isDarkMode,
    activeGroup,
    isInPOSPage,
    toggleCollapse,
    toggleDarkMode,
    togglePopup,
    toggleGroup,
    setActivePopup,
    setActiveGroup
  } = useSidebar();

  const handleLogout = () => {
    signOut();
    window.location.href = '/login';
  };

  // إغلاق القائمة المنبثقة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (!target.closest('[data-group-button]')) {
          setActivePopup(null);
        }
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && activePopup) {
        setActivePopup(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [activePopup, setActivePopup]);

  return (
    <>
      <div 
        id="sidebar-container" 
        className={cn(
          "h-full",
          "bg-sidebar-background text-sidebar-foreground",
          "flex flex-col",
          "transition-all duration-300",
          "shadow-lg border-r border-sidebar-border/20",
          isCollapsed ? "w-20" : "w-72"
        )}
        dir="rtl"
      >
        {/* هيدر القائمة الجانبية */}
        <SidebarHeader
          isCollapsed={isCollapsed}
          isDarkMode={isDarkMode}
          isInPOSPage={isInPOSPage}
          userProfile={userProfile}
          user={user}
          userRole={userRole}
          onToggleCollapse={toggleCollapse}
          onToggleDarkMode={toggleDarkMode}
          onLogout={handleLogout}
        />

        {/* إضافة حدود مرئية عند طي القائمة */}
        {isCollapsed && (
          <motion.div 
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            className="absolute top-32 right-0 h-16 w-1 bg-gradient-to-b from-primary/60 to-primary/20 rounded-l-full"
          />
        )}

        {/* القسم الرئيسي للتنقل */}
        <SidebarNavigation
          isCollapsed={isCollapsed}
          activePopup={activePopup}
          activeGroup={activeGroup}
          onTogglePopup={togglePopup}
          onToggleGroup={toggleGroup}
          onToggleCollapse={toggleCollapse}
          onSetActivePopup={setActivePopup}
          onSetActiveGroup={setActiveGroup}
          isInPOSPage={isInPOSPage}
        />

        {/* خط فاصل قبل الفوتر */}
        {!isCollapsed && (
          <motion.div 
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.3 }}
            className="mx-5 border-t border-gradient-to-r from-transparent via-sidebar-border/40 to-transparent"
          />
        )}
      </div>

      {/* زر توسيع القائمة العائم */}
      {isCollapsed && !isInPOSPage && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleCollapse}
          className={cn(
            "fixed top-1/2 right-[5.5rem] z-10 transform -translate-y-1/2",
            "h-12 w-12 rounded-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-xl",
            "flex items-center justify-center",
            "hover:shadow-2xl hover:from-primary/90 hover:to-primary/70",
            "transition-all duration-300 ease-in-out",
            "border-2 border-primary/20"
          )}
          title="توسيع القائمة"
        >
          <ArrowLeftToLine className="w-5 h-5" />
        </motion.button>
      )}
    </>
  );
};

export default SideMenu; 