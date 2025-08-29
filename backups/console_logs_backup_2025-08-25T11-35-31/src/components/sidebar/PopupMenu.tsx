import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { X, ArrowLeftToLine } from 'lucide-react';
import { NavGroup } from './types';
import { checkPermission } from './utils';
import NavigationItem from './NavigationItem';

interface PopupMenuProps {
  group: NavGroup;
  isAdmin: boolean;
  permissions: Record<string, boolean>;
  currentPath: string;
  isInPOSPage: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
}

const PopupMenu = forwardRef<HTMLDivElement, PopupMenuProps>(({
  group,
  isAdmin,
  permissions,
  currentPath,
  isInPOSPage,
  onClose,
  onToggleCollapse
}, ref) => {
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95, x: 20 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95, x: 20 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 25,
        duration: 0.3
      }}
      className={cn(
        "fixed z-50 right-20 min-w-64 max-w-80",
        "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
        "rounded-xl shadow-2xl",
        "p-4"
      )}
      style={{
        top: `${Math.min(window.innerHeight - 400, Math.max(100, (window.innerHeight / 2) - 150))}px`,
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* مؤشر السهم */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="absolute right-[-8px] top-6 w-4 h-4 bg-white dark:bg-gray-800 border-r border-t border-gray-200 dark:border-gray-700 transform rotate-45 rounded-sm"
      />
      
      {/* هيدر القائمة */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200 dark:border-gray-600"
      >
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <motion.div 
            whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.15)' }}
            className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center"
          >
            <group.icon className="w-3.5 h-3.5 text-primary" />
          </motion.div>
          {group.group}
          {group.badge && (
            <motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary font-medium"
            >
              {group.badge}
            </motion.span>
          )}
        </h3>
        <motion.button 
          whileHover={{ backgroundColor: 'rgba(82, 196, 26, 0.2)', rotate: 90 }}
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 p-1.5 transition-colors"
        >
          <X className="w-4 h-4" />
        </motion.button>
      </motion.div>
      
      {/* قائمة العناصر */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-1 py-1 max-h-[calc(100vh-300px)] overflow-y-auto"
      >
        {group.items
          .filter(item => 
            isAdmin || 
            !item.requiredPermission || 
            checkPermission(item.requiredPermission, permissions)
          )
          .map((item, index) => {
            const isActive =
              currentPath === item.href ||
              (currentPath.startsWith(item.href + '/') && item.href !== '/dashboard') ||
              (item.href === '/dashboard' && currentPath === '/dashboard');
            
            return (
              <motion.div
                key={`popup-${item.href}-${item.title}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ 
                  delay: 0.3 + (index * 0.05),
                  type: "spring",
                  stiffness: 300,
                  damping: 25
                }}
              >
                <NavigationItem
                  item={item}
                  isActive={isActive}
                  isInPopup={true}
                  onClick={onClose}
                />
              </motion.div>
            );
          })}
      </motion.div>
      
      {/* زر العودة إلى وضع التوسيع */}
      {!isInPOSPage && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600"
        >
          <motion.button
            whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.15)' }}
            onClick={onToggleCollapse}
            className="w-full flex items-center justify-center gap-2 p-2.5 text-xs font-medium text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors"
          >
            <ArrowLeftToLine className="w-3.5 h-3.5" />
            توسيع القائمة
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
});

PopupMenu.displayName = 'PopupMenu';

export default PopupMenu;
