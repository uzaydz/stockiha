import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TrustBadgesProps } from './types';
import { getIconComponent } from './utils';

/**
 * مكون شارات الثقة
 * يعرض أيقونات الثقة مع النصوص المصاحبة
 */
const TrustBadges = React.memo<TrustBadgesProps>(({ badges, isRTL = false }) => {
  // انيميشن للعناصر
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.5, 
        ease: "easeOut"
      } 
    }
  };

  if (!badges || badges.length === 0) {
    return null;
  }

  return (
    <motion.div 
      variants={itemVariants} 
      className={cn(
        "flex flex-wrap gap-6 lg:gap-8",
        isRTL ? "justify-center lg:justify-start" : "justify-center lg:justify-end"
      )}
    >
      {badges.map((badge, index) => {
        const IconComponent = getIconComponent(badge.icon);
        return (
          <div 
            key={`${badge.text}-${index}`}
            className="flex items-center gap-3 text-sm text-muted-foreground group cursor-default"
          >
            <IconComponent className="h-5 w-5 text-primary transition-transform group-hover:scale-110" />
            <span className="font-medium whitespace-nowrap">{badge.text}</span>
          </div>
        );
      })}
    </motion.div>
  );
});

TrustBadges.displayName = 'TrustBadges';

export default TrustBadges; 