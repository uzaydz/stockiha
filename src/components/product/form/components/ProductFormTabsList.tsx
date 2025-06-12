import React, { memo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
  Monitor
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
    <Card className="p-4 mb-6 shadow-lg dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm border-border/50 transition-all duration-300">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
          <span className="hidden sm:inline">التبويب {currentTabIndex + 1} من {tabsData.length}</span>
          <span className="sm:hidden">{currentTabIndex + 1}/{tabsData.length}</span>
        </div>
        
        {/* Device View Toggle */}
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 dark:bg-muted/20 px-3 py-1.5 rounded-lg">
            <span>استخدم</span>
            <kbd className="px-2 py-1 bg-background dark:bg-background/80 border border-border/50 rounded text-xs shadow-sm">Ctrl</kbd>
            <span>+</span>
            <kbd className="px-2 py-1 bg-background dark:bg-background/80 border border-border/50 rounded text-xs shadow-sm">→</kbd>
            <span>للتنقل</span>
          </div>
          
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Smartphone className="w-3 h-3 sm:hidden" />
            <Monitor className="w-3 h-3 hidden sm:block lg:hidden" />
            <span className="text-xs font-medium">{tabsData.find(t => t.value === activeTab)?.shortLabel}</span>
          </div>
        </div>
      </div>
      
      {/* Tabs List - Responsive Grid */}
      <div className="mb-6">
        <TabsList 
          className="grid w-full h-auto bg-gradient-to-r from-muted/30 to-muted/10 dark:from-muted/20 dark:to-muted/5 p-2 gap-2 rounded-xl backdrop-blur-sm transition-all duration-300" 
          style={{
            gridTemplateColumns: `repeat(${Math.min(tabsData.length, 3)}, 1fr)`,
          }}
        >
          {tabsData.map((tab, index) => {
            const status = getTabStatus(tab.value);
            const isActive = activeTab === tab.value;
            const IconComponent = iconMap[tab.icon as keyof typeof iconMap];
            const colorClasses = getTabColorClasses(tab.color);

            return (
              <Tooltip key={tab.value}>
                <TooltipTrigger asChild>
                  <TabsTrigger 
                    value={tab.value}
                    onClick={() => onTabChange(tab.value)}
                    disabled={isTransitioning}
                    className={`
                      flex flex-col items-center gap-2 p-3 h-auto rounded-xl border transition-all duration-300 
                      relative overflow-hidden group min-h-[80px] sm:min-h-[100px]
                      ${isActive 
                        ? 'bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground border-primary/50 shadow-lg shadow-primary/25 scale-[1.02] z-10' 
                        : 'bg-background/80 dark:bg-background/60 hover:bg-gradient-to-br hover:from-muted/50 hover:to-muted/30 dark:hover:from-muted/30 dark:hover:to-muted/15 border-border/50 hover:border-primary/30 hover:shadow-md backdrop-blur-sm'
                      }
                      ${isTransitioning ? 'pointer-events-none opacity-70' : ''}
                    `}
                  >
                    {/* Tab Number Badge */}
                    <div className={`
                      absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 text-xs flex items-center justify-center 
                      font-medium transition-all duration-300 z-10
                      ${isActive 
                        ? 'bg-primary-foreground text-primary border-primary-foreground shadow-sm' 
                        : 'bg-muted text-muted-foreground border-border group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/30'
                      }
                    `}>
                      {index + 1}
                    </div>
                    
                    {/* Icon and Status */}
                    <div className="flex items-center gap-2">
                      {IconComponent && (
                        <IconComponent className={`w-4 h-4 transition-all duration-300 ${
                          isActive ? 'scale-110' : 'group-hover:scale-105'
                        }`} />
                      )}
                      {status !== 'empty' && status !== 'optional' && (
                        <StatusIcon status={status} />
                      )}
                    </div>
                    
                    {/* Label */}
                    <div className="text-center">
                      <div className="font-medium text-xs leading-tight">
                        <span className="hidden sm:inline">{tab.label}</span>
                        <span className="sm:hidden">{tab.shortLabel}</span>
                      </div>
                      {tab.required && (
                        <div className={`text-xs mt-1 transition-colors duration-300 ${
                          isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                        }`}>
                          مطلوب
                        </div>
                      )}
                    </div>
                    
                    {/* Hover Effect Overlay */}
                    <div className={`
                      absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 
                      transition-opacity duration-300 pointer-events-none rounded-xl 
                      ${!isActive ? 'group-hover:opacity-100' : ''}
                    `} />
                    
                    {/* Active Tab Glow */}
                    {isActive && (
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/20 via-transparent to-primary/20 animate-pulse" />
                    )}
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent 
                  className="bg-background/95 dark:bg-background/90 backdrop-blur-md border-border/60 shadow-xl max-w-xs"
                  side="bottom"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-foreground text-sm">{tab.label}</p>
                    <p className="text-xs text-muted-foreground">{tab.tooltip}</p>
                    {status !== 'optional' && (
                      <div className={`text-xs flex items-center gap-1 ${
                        status === 'complete' ? 'text-green-600' :
                        status === 'partial' ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        <StatusIcon status={status} />
                        {status === 'complete' ? 'مكتمل' :
                         status === 'partial' ? 'يحتاج إكمال' : 'مطلوب'}
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TabsList>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onPreviousTab}
          disabled={isFirstTab || isTransitioning}
          className="flex items-center gap-2 h-9 px-3 text-sm border-border/60 hover:bg-gradient-to-r hover:from-muted/50 hover:to-muted/30 dark:hover:from-muted/30 dark:hover:to-muted/15 hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-md disabled:opacity-50"
        >
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">السابق</span>
          <span className="sm:hidden">◄</span>
        </Button>
        
        {/* Current Tab Info */}
        <div className="flex items-center gap-2 text-center">
          <div className="text-xs text-muted-foreground">
            {tabsData.find(t => t.value === activeTab)?.description}
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onNextTab}
          disabled={isLastTab || isTransitioning}
          className="flex items-center gap-2 h-9 px-3 text-sm border-border/60 hover:bg-gradient-to-r hover:from-muted/50 hover:to-muted/30 dark:hover:from-muted/30 dark:hover:to-muted/15 hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-md disabled:opacity-50"
        >
          <span className="hidden sm:inline">التالي</span>
          <span className="sm:hidden">►</span>
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
      </div>
    </Card>
  );
});

ProductFormTabsList.displayName = 'ProductFormTabsList';

export default ProductFormTabsList; 