import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { NavItem } from './types';
import { motion } from 'framer-motion';

interface NavigationItemProps {
  item: NavItem;
  isActive: boolean;
  isInPopup?: boolean;
  onClick?: () => void;
  isMobile?: boolean; // إضافة خاصية الهاتف المحمول
}

const NavigationItem = ({ 
  item, 
  isActive, 
  isInPopup = false, 
  onClick, 
  isMobile = false 
}: NavigationItemProps) => {
  return (
    <motion.div
      whileHover={{ x: isInPopup ? 0 : 2 }}
      className={isInPopup ? "mx-2" : ""}
      initial={{ opacity: 0, x: -5 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 5 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <Link
        to={item.href}
        className={cn(
          "flex items-center justify-between w-full rounded-lg transition-all duration-300 group relative overflow-hidden",
          isInPopup 
            ? cn(
                "px-3 py-2",
                // تحسين الحجم للهاتف المحمول
                isMobile && "px-2.5 py-1.5"
              )
            : cn(
                "p-2.5",
                // تحسين الحجم للهاتف المحمول
                isMobile && "p-2"
              ),
          isActive
            ? "bg-primary/10 text-primary shadow-sm font-medium"
            : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
        )}
        aria-current={isActive ? "page" : undefined}
        onClick={onClick}
      >
        {/* خلفية متحركة عند التحويم */}
        <motion.div
          initial={{ opacity: 0, x: '100%' }}
          whileHover={{ opacity: 0.1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 bg-gradient-to-l from-primary/20 via-primary/10 to-transparent pointer-events-none"
        />
        <span className="flex items-center gap-2.5">
          <motion.div
            whileHover={{ rotate: 5 }}
            className={cn(
              "rounded-lg transition-colors duration-300 relative",
              isInPopup 
                ? cn(
                    "p-1.5",
                    // تحسين الحجم للهاتف المحمول
                    isMobile && "p-1"
                  )
                : cn(
                    "p-1.5",
                    // تحسين الحجم للهاتف المحمول
                    isMobile && "p-1"
                  ),
              isActive
                ? "bg-primary/15 shadow-sm"
                : "bg-transparent group-hover:bg-muted/50"
            )}
          >
            <item.icon className={cn(
              "transition-colors duration-300 relative z-10",
              isInPopup 
                ? cn(
                    "h-4 w-4",
                    // تحسين الحجم للهاتف المحمول
                    isMobile && "h-3.5 w-3.5"
                  )
                : cn(
                    "h-4 w-4",
                    // تحسين الحجم للهاتف المحمول
                    isMobile && "h-3.5 w-3.5"
                  ),
              isActive
                ? "text-primary"
                : "text-muted-foreground group-hover:text-foreground"
            )} />
            
            {/* تأثير وهج عند النشاط */}
            {isActive && (
              <motion.div 
                className="absolute inset-0 bg-primary/20 rounded-lg"
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: [0.2, 0.5, 0.2],
                  scale: [0.95, 1.05, 0.95]
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  repeatType: "loop"
                }}
              />
            )}
          </motion.div>
          
          <span className={cn(
            "text-sm transition-colors duration-300",
            // تحسين حجم الخط للهاتف المحمول
            isMobile && "text-xs",
            isActive
              ? "font-medium text-primary"
              : "text-muted-foreground group-hover:text-foreground"
          )}>
            {item.title}
          </span>
        </span>

        {item.badge && (
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.25)' }}
            className={cn(
              "px-2 py-0.5 text-xs rounded-full transition-colors duration-300 shadow-sm",
              // تحسين الحجم للهاتف المحمول
              isMobile && "px-1.5 py-0.5 text-[10px]",
              item.badge === 'جديد' || item.badge === 'تجريبي'
                ? "bg-green-500/20 text-green-600 dark:text-green-400"
                : item.badge === 'قريباً'
                  ? "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                  : isActive
                    ? "bg-primary/20 text-primary"
                    : "bg-muted/80 text-muted-foreground group-hover:bg-muted/70"
            )}
          >
            {item.badge}
          </motion.span>
        )}

        {/* خط مضيء عند التحويم - لا يظهر في القائمة المنبثقة */}
        {!isInPopup && (
          <motion.div
            layoutId={`activeIndicator-${item.href}`}
            className={cn(
              "absolute bottom-0 left-0 h-1 bg-gradient-to-r from-primary/30 via-primary to-primary/30 rounded-full",
              // تحسين الحجم للهاتف المحمول
              isMobile && "h-0.5",
              isActive ? "w-full" : "w-0"
            )}
            animate={{
              width: isActive ? "100%" : "0%"
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30
            }}
          />
        )}
        
        {/* مؤشر للعناصر النشطة في القائمة المنبثقة */}
        {isInPopup && isActive && (
          <motion.div
            layoutId={`popupIndicator-${item.href}`}
            className={cn(
              "absolute right-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-primary/50 via-primary to-primary/50 rounded-full shadow-[0_0_8px_rgba(var(--primary),0.5)]",
              // تحسين الحجم للهاتف المحمول
              isMobile && "w-1"
            )}
            initial={{ height: 0 }}
            animate={{ height: '100%' }}
            exit={{ height: 0 }}
          />
        )}
      </Link>
    </motion.div>
  );
};

export default NavigationItem;
