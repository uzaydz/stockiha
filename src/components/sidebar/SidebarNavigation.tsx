import React, { useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Menu, Search, LogOut, RefreshCw, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useApps } from '@/context/AppsContext';
import { useTenant } from '@/context/TenantContext';
import { createNavigationData } from './navigationData';
import { checkPermission } from './utils';
import NavigationGroup from './NavigationGroup';
import NavigationGroupOptimized from './NavigationGroupOptimized';
import MerchantTypeToggle from './MerchantTypeToggle';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { MerchantType } from './types';

// Custom Hooks
import { useMerchantType } from '@/hooks/useMerchantType';
import { useSidebarSearch } from '@/hooks/useSidebarSearch';
import { useOrganizationSync } from '@/hooks/useOrganizationSync';
import { useSmartAnimation } from '@/hooks/useSmartAnimation';
import { usePerformanceOptimization, useOptimizedSearch, useSmartAnimationWithThrottling } from '@/hooks/usePerformanceOptimization';

interface SidebarNavigationProps {
  activeGroup: string | null;
  onToggleGroup: (group: string) => void;
  onSetActiveGroup: (group: string | null) => void;
  onLogout: () => void;
}

const SidebarNavigation: React.FC<SidebarNavigationProps> = ({
  activeGroup,
  onToggleGroup,
  onSetActiveGroup,
  onLogout
}) => {
  const location = useLocation();
  const { userProfile } = useAuth();
  const { currentOrganization } = useTenant();
  const { organizationApps } = useApps();
  const userRole = userProfile?.role || null;
  const isMobile = useMediaQuery('(max-width: 768px)');

  // استخدام Custom Hooks
  const { merchantType, updateMerchantType, isLoading: merchantTypeLoading } = useMerchantType(currentOrganization?.id);
  const { searchQuery, setSearchQuery, debouncedQuery, clearSearch, hasSearchQuery } = useSidebarSearch();
  const { isSyncing: organizationSyncing } = useOrganizationSync();
  const { shouldAnimate, animationConfig } = useSmartAnimation();

  // تحسينات الأداء
  const { optimizedFilter } = useOptimizedSearch();

  const userPermissions = (userProfile?.permissions || {}) as Record<string, boolean>;
  const permissions = userPermissions;
  const isAdmin = userRole === 'admin';


  // تحسين isAppEnabled مع memoization
  const enabledApps = useMemo(() => {
    return organizationApps.filter((app: any) => app.is_enabled).map((app: any) => app.app_id);
  }, [organizationApps]);

  const isAppEnabledMemo = useMemo(() => {
    return (appId: string): boolean => enabledApps.includes(appId);
  }, [enabledApps]);



  // إنشاء بيانات التنقل مع تمرير نوع التاجر
  const navItems = useMemo(() => {
    return createNavigationData(isAppEnabledMemo, merchantType);
  }, [isAppEnabledMemo, merchantType]);
  
  // تصفية المجموعات التي يملك المستخدم صلاحيات عرضها - محسنة
  const filteredNavItems = useMemo(() => {
    return navItems.filter(group => {
      // إذا كان المستخدم مدير، يظهر له كل شيء
      if (isAdmin) {
        return true;
      }

      // إذا لم تتطلب المجموعة صلاحية، تظهر للجميع
      if (!group.requiredPermission) {
        return true;
      }

      // التحقق من الصلاحية
      return checkPermission(group.requiredPermission, permissions);
    });
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
  useEffect(() => {
    if (!activeGroup && activeGroupByPath) {
      onSetActiveGroup(activeGroupByPath.group);
    }
  }, [activeGroup, activeGroupByPath, onSetActiveGroup]);

  // إزالة دالة عرض زر المجموعة المطوية - القائمة دائماً موسعة

        // تصفية العناصر بناءً على البحث مع تحسين الأداء التقدمي
  const filteredItems = useMemo(() => {
    if (!debouncedQuery.trim()) return filteredNavItems;

    // استخدام البحث المحسن للأداء الأفضل
    return optimizedFilter(filteredNavItems, debouncedQuery, []);
  }, [filteredNavItems, debouncedQuery, optimizedFilter]);

  // Hook للانيميشن الذكي مع throttling
  const { getAnimationDelay, getShouldAnimate, shouldThrottleAnimations: throttlingAnimations } = useSmartAnimationWithThrottling(filteredItems?.length || 0);

  // تحسينات الأداء التقدمية
  const { shouldUseMemo, shouldUseVirtualization, shouldThrottleAnimations } = usePerformanceOptimization(filteredItems?.length || 0, shouldAnimate);

  return (
    <nav
      id="sidebar-content"
      className={cn(
        "flex-1 transition-all duration-300 ease-in-out",
        // تحسين الارتفاع للهاتف المحمول
        isMobile
          ? "h-[calc(100vh-12rem)] px-2 py-3"
          : "h-[calc(100vh-14rem)] px-3 py-5",
        // تحسينات الأداء للقوائم الكبيرة
        shouldUseVirtualization && "overflow-hidden",
        shouldThrottleAnimations && "will-change-auto"
      )}
      style={{
        // تحسينات CSS للأداء
        contain: shouldUseVirtualization ? 'layout style paint' : 'none'
      }}
    >
      <div
        className={cn(
          "h-full overflow-y-auto sidebar-scrollbar",
          // تحسين التمرير للهاتف المحمول
          isMobile && "pb-20", // إضافة مساحة إضافية في الأسفل للهاتف
          // تحسينات الأداء للقوائم الكبيرة
          shouldUseVirtualization && "scroll-smooth"
        )}
        style={{
          // تحسينات CSS للأداء
          scrollBehavior: throttlingAnimations ? 'auto' : 'smooth',
          overscrollBehavior: 'contain'
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={shouldAnimate ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
            transition={{ duration: animationConfig.duration, ease: animationConfig.ease as any }}
            className={cn(
              "space-y-2",
              // تحسينات الأداء للقوائم الكبيرة
              throttlingAnimations && "transform-gpu"
            )}
            style={{
              // تحسينات CSS للأداء
              willChange: shouldAnimate ? 'transform, opacity' : 'auto'
            }}
          >
            {/* عنوان القسم الرئيسي */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={shouldAnimate ? { opacity: 1, x: 0 } : { opacity: 1, x: 0 }}
              transition={{ delay: shouldAnimate ? 0.2 : 0, duration: animationConfig.duration, ease: animationConfig.ease as any }}
              className={cn(
                "px-4 my-3",
                isMobile && "px-2 my-2" // تقليل المسافات للهاتف
              )}
            >
              <h2 className={cn(
                "text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2",
                isMobile && "text-[10px]" // تقليل حجم الخط للهاتف
              )}>
                <Menu className={cn(
                  "text-primary",
                  isMobile ? "w-2.5 h-2.5" : "w-3 h-3"
                )} />
                القائمة الرئيسية
              </h2>
            </motion.div>

            {/* شريط البحث */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={shouldAnimate ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: animationConfig.duration, ease: animationConfig.ease as any }}
              className={cn(
                "px-3",
                isMobile && "px-2" // تقليل المسافات للهاتف
              )}
            >
              <div className="relative">
                <Search className={cn(
                  "absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground",
                  isMobile ? "w-3.5 h-3.5" : "w-4 h-4"
                )} />
                <input
                  type="text"
                  placeholder="البحث في القائمة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    "w-full pl-10 pr-10 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
                    isMobile && "py-1.5 text-xs", // تقليل الحجم للهاتف
                    // تحسينات الأداء
                    "transition-colors duration-150"
                  )}
                  style={{
                    // تحسينات CSS للأداء
                    willChange: hasSearchQuery ? 'auto' : 'scroll-position'
                  }}
                />
                {hasSearchQuery && (
                  <button
                    onClick={clearSearch}
                    className={cn(
                      "absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors",
                      isMobile ? "w-3.5 h-3.5" : "w-4 h-4"
                    )}
                    aria-label="مسح البحث"
                  >
                    <X className="w-full h-full" />
                  </button>
                )}
              </div>
            </motion.div>

            {/* تبديل نوع التاجر */}
            <MerchantTypeToggle
              currentType={merchantType}
              onTypeChange={updateMerchantType}
            />

            {/* المجموعات */}
            {filteredItems.map((group, index) => (
              <NavigationGroupOptimized
                key={group.group}
                group={group}
                isAdmin={isAdmin}
                permissions={permissions}
                isGroupActive={activeGroup === group.group}
                hasActiveItem={group.items.some(item =>
                  currentPath === item.href ||
                  (currentPath.startsWith(item.href + '/') && item.href !== '/dashboard') ||
                  (item.href === '/dashboard' && currentPath === '/dashboard')
                )}
                currentPath={currentPath}
                toggleGroup={onToggleGroup}
                isCollapsed={false}
                isMobile={isMobile}
                index={index}
                shouldAnimate={getShouldAnimate(index)}
                animationDelay={getAnimationDelay(index)}
                animationConfig={animationConfig}
              />
            ))}

            {/* رسالة إذا لم توجد عناصر */}
            {filteredItems.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={shouldAnimate ? { opacity: 1 } : { opacity: 1 }}
                transition={{ duration: animationConfig.duration, ease: animationConfig.ease as any }}
                className={cn(
                  "text-center py-8 text-muted-foreground",
                  isMobile && "py-4" // تقليل المسافات للهاتف
                )}
              >
                <p className={isMobile ? "text-sm" : "text-base"}>
                  لا توجد عناصر متاحة
                </p>
                {hasSearchQuery && (
                  <div className="mt-4 space-y-2">
                    <p className={cn(
                      "text-sm",
                      isMobile && "text-xs" // تقليل الحجم للهاتف
                    )}>
                      جرب البحث بكلمات مختلفة أو
                    </p>
                    <button
                      onClick={clearSearch}
                      className={cn(
                        "px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors",
                        isMobile && "px-2 py-0.5 text-xs"
                      )}
                    >
                      مسح البحث
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* زر تسجيل الخروج */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={shouldAnimate ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
        transition={{ delay: shouldAnimate ? 0.8 : 0, duration: animationConfig.duration, ease: animationConfig.ease as any }}
        className={cn(
          "px-3 mt-4",
          isMobile && "px-2 mt-2" // تقليل المسافات للهاتف
        )}
      >
        <button
          onClick={onLogout}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent",
            isMobile && "py-1.5 text-xs" // تقليل الحجم للهاتف
          )}
        >
          <LogOut className={cn(
            "text-muted-foreground",
            isMobile ? "w-3.5 h-3.5" : "w-4 h-4"
          )} />
          تسجيل الخروج
        </button>
      </motion.div>
    </nav>
  );
};

export default SidebarNavigation;
