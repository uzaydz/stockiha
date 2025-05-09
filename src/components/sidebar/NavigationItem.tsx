import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { NavItem } from './types';
import { motion } from 'framer-motion';

interface NavigationItemProps {
  item: NavItem;
  isActive: boolean;
}

const NavigationItem = ({ item, isActive }: NavigationItemProps) => {
  return (
    <Link
      to={item.href}
      className={cn(
        "group flex items-center justify-between px-3 py-2.5 text-sm rounded-lg transition-all duration-300",
        isActive 
          ? "bg-primary/15 text-primary font-medium border-r-2 border-primary shadow-sm" 
          : "hover:bg-muted/60 text-muted-foreground hover:text-foreground hover:border-r hover:border-primary/30"
      )}
    >
      <div className="flex items-center">
        <div className={cn(
          "h-7 w-7 rounded-md flex items-center justify-center mr-2.5 transition-all duration-300",
          isActive 
            ? "bg-primary/20 text-primary shadow-sm" 
            : "text-muted-foreground bg-muted/30 group-hover:bg-primary/5 group-hover:text-primary/80"
        )}>
          <item.icon className={cn(
            "transition-all duration-300",
            isActive ? "h-4 w-4" : "h-3.5 w-3.5 group-hover:h-4 group-hover:w-4"
          )} />
        </div>
        <span className={cn(
          "transition-all duration-300",
          isActive && "translate-x-0.5"
        )}>
          {item.title}
        </span>
      </div>
      
      {item.badge && (
        <Badge className={cn(
          "text-[10px] px-1.5 min-h-5 min-w-5 flex items-center justify-center transition-all duration-300 font-medium",
          isActive 
            ? "bg-primary text-primary-foreground shadow-inner" 
            : "bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"
        )}>
          {item.badge}
        </Badge>
      )}
    </Link>
  );
};

export default NavigationItem; 