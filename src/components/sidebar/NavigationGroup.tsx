import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NavGroup } from './types';
import NavigationItem from './NavigationItem';
import { checkPermission } from './utils';

interface NavigationGroupProps {
  group: NavGroup;
  isAdmin: boolean;
  permissions: any;
  isGroupActive: boolean;
  hasActiveItem: boolean;
  currentPath: string;
  toggleGroup: (group: string) => void;
}

const NavigationGroup = ({ 
  group, 
  isAdmin, 
  permissions, 
  isGroupActive, 
  hasActiveItem, 
  currentPath, 
  toggleGroup 
}: NavigationGroupProps) => {
  
  // تصفية العناصر داخل المجموعة باستخدام دالة فحص الصلاحيات
  const filteredItems = group.items.filter(item => 
    isAdmin || // إظهار العنصر للمسؤول
    !item.requiredPermission || 
    checkPermission(item.requiredPermission, permissions)
  );

  // تخطي عرض المجموعة بأكملها إذا لم تكن هناك عناصر مرئية بعد فحص الصلاحيات
  if (filteredItems.length === 0) {
    return null;
  }

  return (
    <div className={cn(
      "rounded-xl overflow-hidden transition-all duration-300 my-2 backdrop-blur-sm hover:backdrop-blur-md",
      isGroupActive 
        ? "bg-muted/70 shadow-sm border border-primary/10" 
        : "bg-transparent hover:bg-muted/20 border border-transparent",
      hasActiveItem && !isGroupActive 
        ? "bg-muted/30 border-primary/5" 
        : ""
    )}>
      {/* عنوان المجموعة */}
      <button
        type="button"
        onClick={() => toggleGroup(group.group)}
        className={cn(
          "w-full flex items-center justify-between p-2.5 rounded-t-xl transition-all duration-300",
          isGroupActive 
            ? "bg-gradient-to-l from-primary/10 to-transparent hover:from-primary/20 shadow-sm" 
            : "hover:bg-muted/30",
          hasActiveItem && !isGroupActive
            ? "bg-gradient-to-r from-primary/5 to-transparent"
            : ""
        )}
        aria-expanded={isGroupActive}
      >
        <span className={cn(
          "text-sm font-medium flex items-center transition-colors duration-300",
          isGroupActive || hasActiveItem ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
        )}>
          <group.icon className={cn(
            "h-5 w-5 ml-2.5 transition-transform duration-300",
            isGroupActive || hasActiveItem 
              ? "text-primary" 
              : "text-muted-foreground group-hover:text-foreground"
          )} />
          {group.group}
        </span>
        <ChevronLeft className={cn(
          "h-4 w-4 transition-all duration-300 ease-spring",
          isGroupActive 
            ? "rotate-90 text-primary" 
            : "text-muted-foreground"
        )} />
      </button>
      
      {/* عناصر المجموعة */}
      <div 
        className={cn(
          "overflow-hidden transition-all duration-300 transform-gpu ease-in-out",
          isGroupActive ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0 scale-y-95"
        )} 
        style={{ 
          transformOrigin: 'top', 
          visibility: isGroupActive ? 'visible' : 'hidden' 
        }}
      >
        <div className={cn(
          "p-2 space-y-1 border-r border-r-primary/10 mr-2.5 my-1",
          isGroupActive && "animate-fadeIn"
        )}>
          {filteredItems.map((item) => {
            // تحسين منطق المقارنة لتحديد العنصر النشط بشكل أكثر دقة
            const isActive = 
              currentPath === item.href || 
              (currentPath.startsWith(item.href + '/') && item.href !== '/dashboard') || 
              (item.href === '/dashboard' && currentPath === '/dashboard');
            
            return (
              <NavigationItem 
                key={`${item.href}${item.title}`} 
                item={item} 
                isActive={isActive} 
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default NavigationGroup; 