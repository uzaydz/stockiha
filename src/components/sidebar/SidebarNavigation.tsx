import React, { useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Menu } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAppsData } from '@/context/SuperUnifiedDataContext';
import { createNavigationData } from './navigationData';
import { checkPermission } from './utils';
import NavigationGroup from './NavigationGroup';
import PopupMenu from './PopupMenu';

interface SidebarNavigationProps {
  isCollapsed: boolean;
  activePopup: string | null;
  activeGroup: string | null;
  onTogglePopup: (groupName: string) => void;
  onToggleGroup: (group: string) => void;
  onToggleCollapse: () => void;
  onSetActivePopup: (popup: string | null) => void;
  onSetActiveGroup: (group: string | null) => void;
  isInPOSPage: boolean;
}

const SidebarNavigation: React.FC<SidebarNavigationProps> = ({
  isCollapsed,
  activePopup,
  activeGroup,
  onTogglePopup,
  onToggleGroup,
  onToggleCollapse,
  onSetActivePopup,
  onSetActiveGroup,
  isInPOSPage
}) => {
  const location = useLocation();
  const { userProfile } = useAuth();
  const userRole = userProfile?.role || null;
  const userPermissions = (userProfile?.permissions || {}) as Record<string, boolean>;
  const { organizationApps } = useAppsData();
  const popupRef = useRef<HTMLDivElement>(null);
  
  const permissions = userPermissions;
  const isAdmin = userRole === 'admin';

  // تحسين isAppEnabled مع memoization
  const enabledApps = useMemo(() => {
    return organizationApps.filter((app: any) => app.is_enabled).map((app: any) => app.app_id);
  }, [organizationApps]);

  const isAppEnabledMemo = useMemo(() => {
    return (appId: string): boolean => enabledApps.includes(appId);
  }, [enabledApps]);

  // إضافة console.log للتشخيص

  // إنشاء بيانات التنقل
  const navItems = useMemo(() => {
    return createNavigationData(isAppEnabledMemo);
  }, [isAppEnabledMemo]);
  
  // تصفية المجموعات التي يملك المستخدم صلاحيات عرضها
  const filteredNavItems = useMemo(() => {
    return navItems.filter(group => 
      isAdmin || 
      !group.requiredPermission || 
      checkPermission(group.requiredPermission, permissions)
    );
  }, [navItems, isAdmin, permissions]);
  
  // تحديد المجموعة التي تحتوي على العنصر النشط
  const currentPath = location.pathname;
  const activeGroupByPath = useMemo(() => {
    return filteredNavItems.find(group => 
      group.items.some(item => 
        currentPath === item.href || 
        (currentPath.startsWith(item.href + '/') && item.href !== '/dashboard') || 
        (item.href === '/dashboard' && currentPath === '/dashboard')
      )
    );
  }, [filteredNavItems, currentPath]);

  // تحديث المجموعة النشطة عند تغيير المسار
  React.useEffect(() => {
    if (!activeGroup && activeGroupByPath) {
      onSetActiveGroup(activeGroupByPath.group);
    }
  }, [activeGroup, activeGroupByPath, onSetActiveGroup]);

  // دالة عرض زر المجموعة المطوية
  const renderCollapsedGroupButton = (group: any, isActive: boolean, hasActiveItem: boolean) => {
    const isPopupActive = activePopup === group.group;
    
    return (
      <motion.button
        data-group-button={group.group}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onTogglePopup(group.group);
        }}
        onMouseDown={(e) => {
          e.preventDefault();
        }}
        className={cn(
          "w-14 h-14 flex items-center justify-center relative z-10 group",
          "rounded-xl transition-all duration-300 mx-auto mb-3",
          "border-2 shadow-sm cursor-pointer select-none",
          (isActive || hasActiveItem)
            ? "bg-primary/15 border-primary/40 text-primary shadow-primary/10"
            : isPopupActive
              ? "bg-primary/10 border-primary/30 text-primary shadow-md scale-105"
              : "bg-card border-border text-muted-foreground hover:bg-primary/5 hover:border-primary/25 hover:text-primary hover:shadow-md"
        )}
        aria-label={`قائمة ${group.group}`}
        aria-expanded={isPopupActive}
        type="button"
      >
        <group.icon className="w-5 h-5 transition-transform group-hover:scale-110 pointer-events-none" />
        
        {/* إشارة إلى القائمة النشطة */}
        {(isActive || hasActiveItem) && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-sidebar-background pointer-events-none" />
        )}
        
        {/* إشارة إلى وجود شارة */}
        {group.badge && (
          <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-sidebar-background animate-pulse pointer-events-none" />
        )}
      </motion.button>
    );
  };

  return (
    <nav 
      id="sidebar-content"
      className={cn(
        "flex-1 transition-all duration-300 ease-in-out overflow-y-auto sidebar-scrollbar",
        "h-[calc(100vh-14rem)]",
        isCollapsed ? "px-2 py-4" : "px-3 py-5"
      )}
    >
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="space-y-2"
        >
          {/* عنوان القسم الرئيسي */}
          {!isCollapsed && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="px-4 my-3"
            >
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-4 flex items-center gap-2">
                <Menu className="w-3 h-3 text-primary" />
                القائمة الرئيسية
              </h2>
            </motion.div>
          )}

          {/* عناصر القائمة */}
          <div className={cn(
            "transition-all duration-300",
            isCollapsed ? "space-y-2 mt-3" : "space-y-1.5"
          )}>
            {filteredNavItems.map((group) => {
              const isGroupActive = activeGroup === group.group;
              const hasActiveItem = group.items.some(item => 
                currentPath === item.href || 
                (currentPath.startsWith(item.href + '/') && item.href !== '/dashboard') || 
                (item.href === '/dashboard' && currentPath === '/dashboard')
              );

              // عرض أزرار المجموعات في حالة الطي
              if (isCollapsed) {
                return (
                  <div key={group.group} className="relative mb-3">
                    {renderCollapsedGroupButton(group, isGroupActive, hasActiveItem)}
                    
                    {/* القائمة المنبثقة للعناصر الفرعية */}
                    <AnimatePresence>
                      {activePopup === group.group && (
                        <PopupMenu
                          ref={popupRef}
                          group={group}
                          isAdmin={isAdmin}
                          permissions={permissions}
                          currentPath={currentPath}
                          isInPOSPage={isInPOSPage}
                          onClose={() => onSetActivePopup(null)}
                          onToggleCollapse={onToggleCollapse}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                );
              }

              // عرض المجموعات في الوضع العادي
              return (
                <NavigationGroup
                  key={group.group}
                  group={group}
                  isAdmin={isAdmin}
                  permissions={permissions}
                  isGroupActive={isGroupActive}
                  hasActiveItem={hasActiveItem}
                  currentPath={currentPath}
                  toggleGroup={onToggleGroup}
                  isCollapsed={isCollapsed}
                />
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Overlay للقائمة المنبثقة */}
      {isCollapsed && activePopup && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => onSetActivePopup(null)}
        />
      )}
    </nav>
  );
};

export default SidebarNavigation;
