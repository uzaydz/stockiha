import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NavigationGroupProps } from './types';
import NavigationItem from './NavigationItem';
import { checkPermission } from './utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';

const NavigationGroup = ({
  group,
  isAdmin,
  permissions,
  isGroupActive,
  hasActiveItem,
  currentPath,
  toggleGroup,
  isCollapsed
}: NavigationGroupProps) => {
  const [showPopup, setShowPopup] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const filteredItems = group.items.filter(item =>
    isAdmin ||
    !item.requiredPermission ||
    checkPermission(item.requiredPermission, permissions)
  );

  if (filteredItems.length === 0) {
    return null;
  }

  // إغلاق القائمة المنبثقة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current && 
        buttonRef.current && 
        !popupRef.current.contains(event.target as Node) && 
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowPopup(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // إغلاق القائمة المنبثقة عند تغيير وضع الطي
  useEffect(() => {
    setShowPopup(false);
  }, [isCollapsed]);

  // عند النقر على المجموعة عندما تكون القائمة مطوية
  const handleCollapsedClick = (e: React.MouseEvent) => {
    if (isCollapsed) {
      e.preventDefault();
      e.stopPropagation();
      setShowPopup(prev => !prev); // تبديل حالة القائمة المنبثقة
    } else {
      toggleGroup(group.group);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative mb-2",
        isGroupActive && !isCollapsed && "mb-4"
      )}
    >
      {/* خط عمودي للمجموعة النشطة */}
      {isGroupActive && !isCollapsed && (
        <motion.div
          layoutId="activeGroupLine"
          className="absolute right-0 top-0 w-1 h-full bg-gradient-to-b from-primary/50 via-primary to-primary/50 rounded-full"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: '100%' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* زر المجموعة */}
      <motion.button
        ref={buttonRef}
        whileHover={{ x: isCollapsed ? 0 : 3 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleCollapsedClick}
        className={cn(
          "w-full flex items-center gap-3 transition-all duration-300 relative overflow-hidden",
          isCollapsed 
            ? "justify-center p-2.5"
            : "p-2.5 px-3 rounded-lg",
          (isGroupActive || hasActiveItem)
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground"
        )}
        aria-expanded={isGroupActive}
        aria-label={`مجموعة ${group.group}`}
      >
        {/* خلفية متحركة */}
        {!isCollapsed && (
          <motion.div
            className={cn(
              "absolute inset-0 opacity-0 transition-opacity duration-300",
              "bg-gradient-to-l from-primary/10 to-transparent rounded-lg",
              isGroupActive && "opacity-100"
            )}
            initial={false}
            animate={{
              opacity: isGroupActive ? 1 : 0
            }}
          />
        )}

        {/* أيقونة المجموعة */}
        <motion.div
          whileHover={{ rotate: isCollapsed ? 0 : 10 }}
          className={cn(
            "relative rounded-lg transition-colors duration-300",
            isCollapsed 
              ? "p-2"
              : "p-1.5",
            (isGroupActive || hasActiveItem)
              ? "bg-primary/10"
              : "bg-muted/50 hover:bg-muted/80"
          )}
        >
          <group.icon className={cn("text-current", isCollapsed ? "w-5 h-5" : "w-4 h-4")} />
          
          {/* تأثير ضوئي عند النشاط */}
          {(isGroupActive || hasActiveItem) && (
            <motion.div 
              className="absolute inset-0 rounded-lg bg-primary/20 mix-blend-overlay" 
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.7, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatType: "loop" }}
            />
          )}
        </motion.div>

        {/* عنوان المجموعة والشارة - فقط في وضع التوسيع */}
        {!isCollapsed && (
          <>
            <span className="flex-1 text-sm font-medium flex items-center gap-2">
              {group.group}
              {group.badge && (
                <motion.span
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="mr-1 px-2 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary"
                >
                  {group.badge}
                </motion.span>
              )}
            </span>

            {/* سهم التوسيع */}
            <motion.div
              animate={{ rotate: isGroupActive ? 90 : 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              <ChevronLeft className="w-4 h-4 opacity-50 hover:opacity-100" />
            </motion.div>
          </>
        )}
      </motion.button>

      {/* القائمة المنبثقة للصفحات الفرعية في حالة الطي */}
      {isCollapsed && (
        <AnimatePresence>
          {showPopup && (
            <motion.div
              ref={popupRef}
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className={cn(
                "absolute z-50 right-full top-0 mr-4",
                "bg-card rounded-xl shadow-lg border border-sidebar-border",
                "p-3 min-w-60 origin-right overflow-hidden",
                "backdrop-blur-sm"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-2.5 pb-2 border-b border-sidebar-border">
                <h3 className="text-sm font-medium text-card-foreground px-1 mb-1 flex items-center gap-1.5">
                  <group.icon className="w-3.5 h-3.5 ml-1 text-primary" />
                  {group.group}
                  {group.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-normal">
                      {group.badge}
                    </span>
                  )}
                </h3>
              </div>
              <div className="space-y-1 py-1 max-h-[calc(100vh-200px)] overflow-y-auto">
                {filteredItems.map((item) => {
                  const isActive =
                    currentPath === item.href ||
                    (currentPath.startsWith(item.href + '/') && item.href !== '/dashboard') ||
                    (item.href === '/dashboard' && currentPath === '/dashboard');

                  return (
                    <NavigationItem
                      key={`popup-${item.href}-${item.title}`}
                      item={item}
                      isActive={isActive}
                      isInPopup={true}
                    />
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* قائمة العناصر - تظهر فقط في وضع التوسيع عندما تكون المجموعة نشطة */}
      {!isCollapsed && (
        <AnimatePresence mode="wait">
          {isGroupActive && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ 
                opacity: 1, 
                height: "auto",
                transition: {
                  height: {
                    type: "spring",
                    stiffness: 300,
                    damping: 30
                  }
                }
              }}
              exit={{ 
                opacity: 0, 
                height: 0,
                transition: {
                  height: {
                    type: "spring",
                    stiffness: 300,
                    damping: 30
                  }
                }
              }}
              className="overflow-hidden"
            >
              <motion.div
                initial="closed"
                animate="open"
                exit="closed"
                variants={{
                  open: {
                    transition: {
                      staggerChildren: 0.05
                    }
                  },
                  closed: {
                    transition: {
                      staggerChildren: 0.05,
                      staggerDirection: -1
                    }
                  }
                }}
              >
                <div className="pr-3.5 mr-1 mt-1 space-y-1 border-r border-primary/10">
                  {filteredItems.map((item) => {
                    const isActive =
                      currentPath === item.href ||
                      (currentPath.startsWith(item.href + '/') && item.href !== '/dashboard') ||
                      (item.href === '/dashboard' && currentPath === '/dashboard');

                    return (
                      <NavigationItem
                        key={`${item.href}-${item.title}`}
                        item={item}
                        isActive={isActive}
                      />
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
};

export default NavigationGroup;
