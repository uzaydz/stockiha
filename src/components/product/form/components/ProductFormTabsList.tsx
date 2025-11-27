import React, { memo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle,
  AlertCircle,
  Clock,
  Info,
  Images,
  DollarSign,
  Palette,
  Settings,
  Smartphone,
  Monitor,
  Gift,
  Zap
} from 'lucide-react';
import { TabData, TabStatus } from '@/hooks/useProductFormTabs';

interface ProductFormTabsListProps {
  tabsData: TabData[];
  activeTab: string;
  currentTabIndex: number;
  isFirstTab: boolean;
  isLastTab: boolean;
  isTransitioning: boolean;
  onTabChange: (tab: string) => void;
  onPreviousTab: () => void;
  onNextTab: () => void;
  getTabStatus: (tabValue: string) => TabStatus;
}

// Icon mapping
const iconMap = {
  Info,
  Images,
  DollarSign,
  Palette,
  Settings,
  Gift,
  Zap,
} as const;

const StatusIcon = memo<{ status: TabStatus }>(({ status }) => {
  switch (status) {
    case 'complete':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'partial':
      return <Clock className="w-4 h-4 text-amber-500" />;
    case 'empty':
      return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    default:
      return null;
  }
});

StatusIcon.displayName = 'StatusIcon';

const ProductFormTabsList = memo<ProductFormTabsListProps>(({
  tabsData,
  activeTab,
  currentTabIndex,
  isFirstTab,
  isLastTab,
  isTransitioning,
  onTabChange,
  onPreviousTab,
  onNextTab,
  getTabStatus
}) => {

  const getTabColorClasses = (color?: string) => {
    switch (color) {
      case 'blue':
        return {
          bg: 'from-blue-50/60 via-indigo-50/40 to-transparent dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-transparent',
          border: 'border-blue-200/50 dark:border-blue-800/30',
          icon: 'from-blue-100 to-indigo-100 dark:from-blue-900/60 dark:to-indigo-900/60',
          iconColor: 'text-blue-600 dark:text-blue-400'
        };
      case 'green':
        return {
          bg: 'from-green-50/60 via-emerald-50/40 to-transparent dark:from-green-950/30 dark:via-emerald-950/20 dark:to-transparent',
          border: 'border-green-200/50 dark:border-green-800/30',
          icon: 'from-green-100 to-emerald-100 dark:from-green-900/60 dark:to-emerald-900/60',
          iconColor: 'text-green-600 dark:text-green-400'
        };
      case 'purple':
        return {
          bg: 'from-purple-50/60 via-indigo-50/40 to-transparent dark:from-purple-950/30 dark:via-indigo-950/20 dark:to-transparent',
          border: 'border-purple-200/50 dark:border-purple-800/30',
          icon: 'from-purple-100 to-indigo-100 dark:from-purple-900/60 dark:to-indigo-900/60',
          iconColor: 'text-purple-600 dark:text-purple-400'
        };
      case 'amber':
        return {
          bg: 'from-amber-50/60 via-orange-50/40 to-transparent dark:from-amber-950/30 dark:via-orange-950/20 dark:to-transparent',
          border: 'border-amber-200/50 dark:border-amber-800/30',
          icon: 'from-amber-100 to-orange-100 dark:from-amber-900/60 dark:to-orange-900/60',
          iconColor: 'text-amber-600 dark:text-amber-400'
        };
      default:
        return {
          bg: 'from-primary/5 via-primary/3 to-transparent dark:from-primary/10 dark:via-primary/5 dark:to-transparent',
          border: 'border-primary/20 dark:border-primary/30',
          icon: 'from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/15',
          iconColor: 'text-primary dark:text-primary-foreground'
        };
    }
  };

  return (
    <Card className="p-3 sm:p-4 mb-4 sm:mb-6 shadow-md sm:shadow-lg dark:shadow-xl sm:dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm border-border/50 transition-all duration-300">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full animate-pulse"></div>
          <span className="hidden sm:inline">التبويب {currentTabIndex + 1} من {tabsData.length}</span>
          <span className="sm:hidden text-xs">{currentTabIndex + 1}/{tabsData.length}</span>
        </div>
        
        {/* Device View Toggle */}
        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 dark:bg-muted/20 px-2.5 py-1 rounded-lg">
            <span className="text-[10px] sm:text-xs">استخدم</span>
            <kbd className="px-1.5 py-0.5 bg-background dark:bg-background/80 border border-border/50 rounded text-[10px] shadow-sm">Ctrl</kbd>
            <span className="text-[10px] sm:text-xs">+</span>
            <kbd className="px-1.5 py-0.5 bg-background dark:bg-background/80 border border-border/50 rounded text-[10px] shadow-sm">→</kbd>
            <span className="text-[10px] sm:text-xs">للتنقل</span>
          </div>
          
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Smartphone className="w-3 h-3 sm:hidden" />
            <Monitor className="w-3 h-3 hidden sm:block lg:hidden" />
            <span className="text-[10px] sm:text-xs font-medium truncate max-w-[120px] sm:max-w-none">
              {tabsData.find(t => t.value === activeTab)?.shortLabel}
            </span>
          </div>
        </div>
      </div>
      
      {/* Tabs List - Responsive Grid */}
      <div className="mb-4 sm:mb-6">
        <TabsList 
          className="grid w-full h-auto bg-gradient-to-r from-muted/30 to-muted/10 dark:from-muted/20 dark:to-muted/5 p-1.5 sm:p-2 gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl backdrop-blur-sm transition-all duration-300" 
          style={{
            gridTemplateColumns: `repeat(${Math.min(tabsData.length, 2)}, 1fr)`,
          }}
        >
          {tabsData.map((tab, index) => {
            const status = getTabStatus(tab.value);
            const isActive = activeTab === tab.value;
            const IconComponent = iconMap[tab.icon as keyof typeof iconMap];
            const colorClasses = getTabColorClasses(tab.color);

            return (
              <TabsTrigger 
                key={tab.value}
                value={tab.value}
                onClick={() => onTabChange(tab.value)}
                disabled={isTransitioning}
                title={tab.tooltip}
                className={`
                      flex flex-col items-center gap-1.5 sm:gap-2 p-2 sm:p-3 h-auto rounded-lg sm:rounded-xl border transition-all duration-300 
                      relative overflow-hidden group min-h-[70px] sm:min-h-[85px] lg:min-h-[100px]
                      ${isActive 
                        ? 'bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground border-primary/50 shadow-md sm:shadow-lg shadow-primary/20 sm:shadow-primary/25 scale-[1.01] sm:scale-[1.02] z-10' 
                        : 'bg-background/80 dark:bg-background/60 hover:bg-gradient-to-br hover:from-muted/50 hover:to-muted/30 dark:hover:from-muted/30 dark:hover:to-muted/15 border-border/50 hover:border-primary/30 hover:shadow-sm sm:hover:shadow-md backdrop-blur-sm'
                      }
                      ${isTransitioning ? 'pointer-events-none opacity-70' : ''}
                    `}
              >
                    {/* Tab Number Badge */}
                    <div className={`
                      absolute -top-0.5 sm:-top-1 -right-0.5 sm:-right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 text-[10px] sm:text-xs flex items-center justify-center 
                      font-medium transition-all duration-300 z-10
                      ${isActive 
                        ? 'bg-primary-foreground text-primary border-primary-foreground shadow-sm' 
                        : 'bg-muted text-muted-foreground border-border group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary/30'
                      }
                    `}>
                      {index + 1}
                    </div>
                    
                    {/* Icon and Status */}
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      {IconComponent && (
                        <IconComponent className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-all duration-300 ${
                          isActive ? 'scale-110' : 'group-hover:scale-105'
                        }`} />
                      )}
                      {status !== 'empty' && status !== 'optional' && (
                        <div className="hidden sm:block">
                          <StatusIcon status={status} />
                        </div>
                      )}
                    </div>
                    
                    {/* Label */}
                    <div className="text-center w-full px-1">
                      <div className="font-medium text-[10px] sm:text-xs leading-tight truncate">
                        <span className="hidden md:inline">{tab.label}</span>
                        <span className="md:hidden">{tab.shortLabel}</span>
                      </div>
                      {tab.required && (
                        <div className={`text-[9px] sm:text-xs mt-0.5 sm:mt-1 transition-colors duration-300 ${
                          isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                        }`}>
                          مطلوب
                        </div>
                      )}
                    </div>
                    
                    {/* Hover Effect Overlay */}
                    <div className={`
                      absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 
                      transition-opacity duration-300 pointer-events-none rounded-lg sm:rounded-xl 
                      ${!isActive ? 'group-hover:opacity-100' : ''}
                    `} />
                    
                    {/* Active Tab Glow */}
                    {isActive && (
                      <div className="absolute inset-0 rounded-lg sm:rounded-xl bg-gradient-to-r from-primary/20 via-transparent to-primary/20 animate-pulse" />
                    )}
                  </TabsTrigger>
            );
          })}
        </TabsList>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center gap-2 sm:gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onPreviousTab}
          disabled={isFirstTab || isTransitioning}
          className="flex items-center gap-1.5 sm:gap-2 h-8 sm:h-9 px-2.5 sm:px-3 text-xs sm:text-sm border-border/60 hover:bg-gradient-to-r hover:from-muted/50 hover:to-muted/30 dark:hover:from-muted/30 dark:hover:to-muted/15 hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-md disabled:opacity-50 min-w-[60px] sm:min-w-[80px]"
        >
          <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span className="hidden sm:inline">السابق</span>
          <span className="sm:hidden text-xs">◄</span>
        </Button>
        
        {/* Current Tab Info */}
        <div className="flex-1 flex items-center justify-center px-2 sm:px-4">
          <div className="text-[10px] sm:text-xs text-muted-foreground text-center line-clamp-2">
            {tabsData.find(t => t.value === activeTab)?.description}
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onNextTab}
          disabled={isLastTab || isTransitioning}
          className="flex items-center gap-1.5 sm:gap-2 h-8 sm:h-9 px-2.5 sm:px-3 text-xs sm:text-sm border-border/60 hover:bg-gradient-to-r hover:from-muted/50 hover:to-muted/30 dark:hover:from-muted/30 dark:hover:to-muted/15 hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-md disabled:opacity-50 min-w-[60px] sm:min-w-[80px]"
        >
          <span className="hidden sm:inline">التالي</span>
          <span className="sm:hidden text-xs">►</span>
          <ChevronLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </Button>
      </div>
    </Card>
  );
});

ProductFormTabsList.displayName = 'ProductFormTabsList';

export default ProductFormTabsList;
