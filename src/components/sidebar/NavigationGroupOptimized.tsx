import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import NavigationGroup from './NavigationGroup';

interface NavigationGroupOptimizedProps {
  group: any;
  isAdmin: boolean;
  permissions: Record<string, boolean>;
  isGroupActive: boolean;
  hasActiveItem: boolean;
  currentPath: string;
  toggleGroup: (group: string) => void;
  isCollapsed: boolean;
  isMobile: boolean;
  index: number;
  shouldAnimate: boolean;
  animationDelay: number;
  animationConfig: {
    duration: number;
    ease: string;
  };
}

const NavigationGroupOptimized: React.FC<NavigationGroupOptimizedProps> = React.memo(({
  group,
  isAdmin,
  permissions,
  isGroupActive,
  hasActiveItem,
  currentPath,
  toggleGroup,
  isCollapsed,
  isMobile,
  index,
  shouldAnimate,
  animationDelay,
  animationConfig
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={shouldAnimate ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
      transition={{
        delay: shouldAnimate ? animationDelay : 0,
        duration: animationConfig.duration,
        ease: animationConfig.ease as any
      }}
      className={cn(
        "transition-all duration-200",
        // إضافة تحسينات الأداء للقوائم الكبيرة
        "will-change-transform",
        shouldAnimate && "transform-gpu"
      )}
    >
      <NavigationGroup
        group={group}
        isAdmin={isAdmin}
        permissions={permissions}
        isGroupActive={isGroupActive}
        hasActiveItem={hasActiveItem}
        currentPath={currentPath}
        toggleGroup={toggleGroup}
        isCollapsed={isCollapsed}
        isMobile={isMobile}
      />
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // مقارنة مخصصة لتجنب إعادة الرندر غير الضرورية
  return (
    prevProps.group.group === nextProps.group.group &&
    prevProps.isAdmin === nextProps.isAdmin &&
    prevProps.isGroupActive === nextProps.isGroupActive &&
    prevProps.hasActiveItem === nextProps.hasActiveItem &&
    prevProps.currentPath === nextProps.currentPath &&
    prevProps.isCollapsed === nextProps.isCollapsed &&
    prevProps.isMobile === nextProps.isMobile &&
    prevProps.shouldAnimate === nextProps.shouldAnimate &&
    prevProps.index === nextProps.index
  );
});

NavigationGroupOptimized.displayName = 'NavigationGroupOptimized';

export default NavigationGroupOptimized;
