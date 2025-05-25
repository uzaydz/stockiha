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
}

const NavigationItem = ({ item, isActive, isInPopup = false, onClick }: NavigationItemProps) => {
  return (
    <motion.div
      whileHover={{ scale: isInPopup ? 1.01 : 1.02, x: isInPopup ? 0 : 2 }}
      whileTap={{ scale: 0.98 }}
      className={isInPopup ? "mx-2" : ""}
      initial={{ opacity: 0, x: -5 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 5 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <Link
        to={item.href}
        className={cn(
          "flex items-center justify-between w-full rounded-lg transition-all duration-300 group relative",
          isInPopup ? "px-3 py-2" : "p-2.5",
          isActive
            ? "bg-primary/10 text-primary shadow-sm font-medium"
            : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
        )}
        aria-current={isActive ? "page" : undefined}
        onClick={onClick}
      >
        <span className="flex items-center gap-2.5">
          <motion.div
            whileHover={{ rotate: 5 }}
            className={cn(
              "rounded-lg transition-colors duration-300 relative",
              isInPopup ? "p-1.5" : "p-1.5",
              isActive
                ? "bg-primary/15"
                : "bg-transparent group-hover:bg-muted/50"
            )}
          >
            <item.icon className={cn(
              "transition-colors duration-300 relative z-10",
              isInPopup ? "h-4 w-4" : "h-4 w-4",
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
            className={cn(
              "px-2 py-0.5 text-xs rounded-full transition-colors duration-300",
              isActive
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
              "absolute bottom-0 left-0 h-0.5 bg-primary rounded-full",
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
            className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/50 via-primary to-primary/50 rounded-full"
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