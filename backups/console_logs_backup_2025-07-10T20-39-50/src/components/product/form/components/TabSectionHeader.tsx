import React, { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle, LucideIcon } from 'lucide-react';

interface TabSectionHeaderProps {
  icon: LucideIcon;
  title: string;
  color?: 'primary' | 'blue' | 'green' | 'purple' | 'amber';
  required?: boolean;
  tooltip?: string;
  description?: string;
}

const TabSectionHeader = memo<TabSectionHeaderProps>(({
  icon: Icon,
  title,
  color = 'primary',
  required = false,
  tooltip,
  description
}) => {
  const getColorClasses = () => {
    switch (color) {
      case 'blue':
        return {
          bg: 'from-blue-50/60 via-indigo-50/40 to-transparent dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-transparent',
          border: 'border-blue-200/50 dark:border-blue-800/30',
          icon: 'from-blue-100 to-indigo-100 dark:from-blue-900/60 dark:to-indigo-900/60',
          iconColor: 'text-blue-600 dark:text-blue-400',
          hoverColor: 'hover:text-blue-600 dark:hover:text-blue-400'
        };
      case 'green':
        return {
          bg: 'from-green-50/60 via-emerald-50/40 to-transparent dark:from-green-950/30 dark:via-emerald-950/20 dark:to-transparent',
          border: 'border-green-200/50 dark:border-green-800/30',
          icon: 'from-green-100 to-emerald-100 dark:from-green-900/60 dark:to-emerald-900/60',
          iconColor: 'text-green-600 dark:text-green-400',
          hoverColor: 'hover:text-green-600 dark:hover:text-green-400'
        };
      case 'purple':
        return {
          bg: 'from-purple-50/60 via-indigo-50/40 to-transparent dark:from-purple-950/30 dark:via-indigo-950/20 dark:to-transparent',
          border: 'border-purple-200/50 dark:border-purple-800/30',
          icon: 'from-purple-100 to-indigo-100 dark:from-purple-900/60 dark:to-indigo-900/60',
          iconColor: 'text-purple-600 dark:text-purple-400',
          hoverColor: 'hover:text-purple-600 dark:hover:text-purple-400'
        };
      case 'amber':
        return {
          bg: 'from-amber-50/60 via-orange-50/40 to-transparent dark:from-amber-950/30 dark:via-orange-950/20 dark:to-transparent',
          border: 'border-amber-200/50 dark:border-amber-800/30',
          icon: 'from-amber-100 to-orange-100 dark:from-amber-900/60 dark:to-orange-900/60',
          iconColor: 'text-amber-600 dark:text-amber-400',
          hoverColor: 'hover:text-amber-600 dark:hover:text-amber-400'
        };
      default:
        return {
          bg: 'from-primary/5 via-primary/3 to-transparent dark:from-primary/10 dark:via-primary/5 dark:to-transparent',
          border: 'border-primary/20 dark:border-primary/30',
          icon: 'from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/15',
          iconColor: 'text-primary dark:text-primary-foreground',
          hoverColor: 'hover:text-primary'
        };
    }
  };

  const colorClasses = getColorClasses();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`flex items-center gap-3 p-4 bg-gradient-to-r ${colorClasses.bg} rounded-xl border ${colorClasses.border} transition-all duration-300 hover:shadow-sm`}>
        <div className={`bg-gradient-to-br ${colorClasses.icon} p-2 rounded-lg shadow-sm ring-1 ring-black/5 dark:ring-white/10`}>
          <Icon className={`w-4 h-4 ${colorClasses.iconColor}`} />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-base text-foreground">{title}</h3>
            
            {required && (
              <Badge variant="destructive" className="text-xs shadow-sm">
                مطلوب
              </Badge>
            )}
            
            {!required && (
              <Badge variant="secondary" className="text-xs shadow-sm">
                اختياري
              </Badge>
            )}
          </div>
          
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center p-1 rounded-md transition-colors"
                onClick={(e) => e.preventDefault()}
              >
                <HelpCircle className={`w-4 h-4 text-muted-foreground ${colorClasses.hoverColor} transition-colors cursor-help`} />
              </button>
            </TooltipTrigger>
            <TooltipContent 
              className="bg-background/95 dark:bg-background/90 backdrop-blur-md border-border/60 shadow-xl z-50 max-w-xs"
              side="top"
              sideOffset={5}
            >
              <p className="text-sm leading-relaxed">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      
      {/* Separator */}
      <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
});

TabSectionHeader.displayName = 'TabSectionHeader';

export default TabSectionHeader;
