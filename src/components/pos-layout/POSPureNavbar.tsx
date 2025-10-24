import React, { memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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

  return (
    <header className={cn(
      "sticky top-0 z-50 h-16 backdrop-blur-xl",
      "bg-white/90 dark:bg-slate-950/90 border-b border-slate-200/30 dark:border-slate-800/30",
      "shadow-lg",
      className
    )}>
      <div className="h-full flex items-center justify-between px-4 lg:px-6">
        <Link
          to="/dashboard/pos-advanced"
          className="flex items-center gap-3"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-xl">
            <Store className="h-6 w-6 text-white" />
          </div>
          <div className="hidden lg:block">
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Order Line
            </h1>
            {currentOrganization?.name && (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {currentOrganization.name}
              </p>
            )}
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 rounded-full border border-border/40 bg-card px-3 py-1.5">
            {getConnectionStatusIcon()}
            <span className="font-medium">{getConnectionStatusText()}</span>
          </div>
          {executionTime && (
            <div className="flex items-center gap-1 rounded-full border border-border/40 bg-card px-3 py-1.5 text-muted-foreground">
              <Activity className="h-3 w-3 text-primary" />
              <span>{executionTime}ms</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-10 px-4 text-muted-foreground hover:text-foreground rounded-xl"
          >
            <RefreshCw className={cn(
              "h-4 w-4",
              isRefreshing && "animate-spin text-primary"
            )} />
            <span className="hidden md:inline text-sm">
              {isRefreshing ? 'يتم التحديث' : 'تحديث'}
            </span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="h-10 px-4 text-muted-foreground hover:text-foreground rounded-xl"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          <div className="hidden lg:block">
            <Button
              variant="default"
              size="sm"
              asChild
              className="h-10 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white px-5 shadow-lg"
            >
              <Link to="/dashboard/pos-advanced" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                فتح POS
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
