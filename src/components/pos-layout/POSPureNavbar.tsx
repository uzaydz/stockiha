import React, { memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/context/ThemeContext';
import { useTenant } from '@/context/TenantContext';
import { 
  Sun, 
  Moon, 
  RefreshCw,
  Zap,
  Activity,
  Store,
  Wifi,
  WifiOff,
  Loader2
} from 'lucide-react';

interface POSPureNavbarProps {
  className?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  executionTime?: number;
  connectionStatus?: 'connected' | 'disconnected' | 'reconnecting';
}

const POSPureNavbar: React.FC<POSPureNavbarProps> = memo(({ 
  className,
  onRefresh,
  isRefreshing = false,
  executionTime,
  connectionStatus = 'connected'
}) => {
  const { theme, setTheme } = useTheme();
  const { currentOrganization } = useTenant();

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="h-3.5 w-3.5 text-emerald-500" />;
      case 'disconnected':
        return <WifiOff className="h-3.5 w-3.5 text-red-500" />;
      case 'reconnecting':
        return <Loader2 className="h-3.5 w-3.5 text-amber-500 animate-spin" />;
      default:
        return <Wifi className="h-3.5 w-3.5 text-gray-500" />;
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'متصل';
      case 'disconnected':
        return 'غير متصل';
      case 'reconnecting':
        return 'إعادة الاتصال...';
      default:
        return 'غير معروف';
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-emerald-600 dark:text-emerald-400';
      case 'disconnected':
        return 'text-red-600 dark:text-red-400';
      case 'reconnecting':
        return 'text-amber-600 dark:text-amber-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <header className={cn(
      "sticky top-0 z-50 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl",
      "border-b border-slate-200/60 dark:border-slate-700/60 shadow-sm",
      "transition-all duration-300 ease-out",
      className
    )}>
      <div className="h-full flex items-center justify-between px-4 lg:px-6">
        {/* Right Side - Logo & Brand */}
        <div className="flex items-center gap-4">
          <Link 
            to="/dashboard/pos-advanced" 
            className="flex items-center gap-3 group transition-all duration-300 hover:scale-105"
          >
            {/* Enhanced Logo Container */}
            <div className="relative p-2.5 bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-600 rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
              <Store className="h-5 w-5 text-white drop-shadow-sm" />
              
              {/* Subtle glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-500/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Animated border */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -translate-x-full group-hover:translate-x-full" />
            </div>
            
            {/* Brand Text */}
            <div className="hidden lg:block">
              <h1 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                نظام نقطة البيع
              </h1>
              {currentOrganization?.name && (
                <p className="text-xs text-slate-600 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors duration-300">
                  {currentOrganization.name}
                </p>
              )}
            </div>
          </Link>
        </div>

        {/* Center - Status & Performance */}
        <div className="hidden md:flex items-center gap-3">
          {/* Enhanced Connection Status */}
          <div className={cn(
            "flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg",
            "border border-slate-200/50 dark:border-slate-700/50",
            "transition-all duration-300 hover:shadow-sm"
          )}>
            {getConnectionStatusIcon()}
            <span className={cn(
              "text-xs font-medium transition-colors duration-300",
              getConnectionStatusColor()
            )}>
              {getConnectionStatusText()}
            </span>
          </div>

          {/* Enhanced Performance Badge */}
          {executionTime && (
            <Badge 
              variant="outline" 
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5",
                "bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-sm",
                "border-slate-200/50 dark:border-slate-700/50",
                "text-slate-700 dark:text-slate-300",
                "transition-all duration-300 hover:shadow-sm"
              )}
            >
              <Activity className="h-3 w-3 text-blue-500" />
              <span className="text-xs font-medium">{executionTime}ms</span>
            </Badge>
          )}
        </div>

        {/* Left Side - Actions */}
        <div className="flex items-center gap-2">
          {/* Enhanced Refresh Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className={cn(
              "flex items-center gap-2 px-3 py-2 h-9",
              "text-slate-700 dark:text-slate-300",
              "hover:bg-slate-100 dark:hover:bg-slate-800",
              "hover:text-blue-600 dark:hover:text-blue-400",
              "transition-all duration-300 hover:scale-105",
              "rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            )}
          >
            <RefreshCw className={cn(
              "h-4 w-4 transition-all duration-300",
              isRefreshing && "animate-spin text-blue-500"
            )} />
            <span className="hidden md:inline text-sm font-medium">
              {isRefreshing ? 'جاري التحديث...' : 'تحديث'}
            </span>
          </Button>

          {/* Enhanced Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className={cn(
              "flex items-center gap-2 px-3 py-2 h-9",
              "text-slate-700 dark:text-slate-300",
              "hover:bg-slate-100 dark:hover:bg-slate-800",
              "hover:text-amber-600 dark:hover:text-amber-400",
              "transition-all duration-300 hover:scale-105",
              "rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            )}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="h-4 w-4" />
                <span className="hidden md:inline text-sm font-medium">النمط الفاتح</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4" />
                <span className="hidden md:inline text-sm font-medium">النمط الداكن</span>
              </>
            )}
          </Button>

          {/* Enhanced Quick POS Access */}
          <div className="hidden lg:block">
            <Button
              variant="default"
              size="sm"
              asChild
              className={cn(
                "flex items-center gap-2 px-4 py-2 h-9",
                "bg-gradient-to-r from-blue-500 via-purple-600 to-indigo-600",
                "hover:from-blue-600 hover:via-purple-700 hover:to-indigo-700",
                "text-white font-medium shadow-lg",
                "transition-all duration-300 hover:scale-105 hover:shadow-xl",
                "rounded-lg border-0"
              )}
            >
              <Link to="/dashboard/pos-advanced">
                <Zap className="h-4 w-4" />
                POS السريع
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
});

POSPureNavbar.displayName = 'POSPureNavbar';

export default POSPureNavbar;
