import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sun, Moon, Search, Wifi, Battery, LogOut, Shield, User } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { NavbarSyncIndicator } from '@/components/navbar/NavbarSyncIndicator';
import ProfileMenu from '@/components/desktop/ProfileMenu';
import UpdateButton from '@/components/desktop/UpdateButton';
import { SubscriptionButton } from '@/components/desktop/SubscriptionButton';
import { useStaffSession } from '@/context/StaffSessionContext';

const routeToAppName = (pathname: string) => {
  if (pathname === '/' || pathname === '/desktop') return 'Finder';
  if (pathname.startsWith('/pos')) return 'POS';
  if (pathname.startsWith('/call-center')) return 'Call Center';
  if (pathname.startsWith('/dashboard/products')) return 'Products';
  if (pathname.startsWith('/dashboard/customers')) return 'Customers';
  if (pathname.startsWith('/dashboard/orders')) return 'Orders';
  if (pathname.startsWith('/dashboard/analytics')) return 'Analytics';
  if (pathname.startsWith('/dashboard/settings')) return 'Settings';
  if (pathname.startsWith('/dashboard')) return 'Dashboard';
  return 'Stockiha';
};

const MacMenuTitlebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, fastThemeController } = useTheme();
  const { currentStaff, isAdminMode, clearSession } = useStaffSession();
  const [now] = useState(new Date());

  const isElectron = typeof window !== 'undefined' && Boolean((window as any).electronAPI);
  const appName = useMemo(() => routeToAppName(location.pathname), [location.pathname]);
  const staffDisplayName = useMemo(() => {
    if (isAdminMode) return 'مدير';
    if (currentStaff) return currentStaff.staff_name;
    return null;
  }, [isAdminMode, currentStaff]);

  const onAppleMenu = () => navigate('/desktop');

  return (
    <div className="macos-menubar fixed top-0 inset-x-0 z-[1200] h-[28px]">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-md border-b border-white/10" />
      <div className="relative h-full w-full flex items-center justify-between px-3 text-[12px] text-white/95 select-none">
        {/* Left: Apple and current app name */}
        <div className="flex items-center gap-3">
          <button onClick={onAppleMenu} className="font-[600] leading-none"></button>
          <div className="font-[600] tracking-tight">{appName}</div>
          {/* Minimal menus as placeholders to mimic macOS layout */}
          <div className="hidden sm:flex items-center gap-3 opacity-90">
            <span className="hover:opacity-100 transition">File</span>
            <span className="hover:opacity-100 transition">Edit</span>
            <span className="hover:opacity-100 transition">View</span>
            <span className="hover:opacity-100 transition">Window</span>
            <span className="hover:opacity-100 transition">Help</span>
          </div>
        </div>

        {/* Right: status + actions from our titlebar */}
        <div className="flex items-center gap-2">
          {/* Sync indicator */}
          <div className="scale-90">
            <NavbarSyncIndicator />
          </div>

          {/* Theme toggle */}
          <button
            className="h-5 w-5 grid place-items-center rounded-md hover:bg-white/15"
            onClick={fastThemeController.toggleFast}
            title="Theme"
          >
            {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>

          {/* Subscription (compact) */}
          <div className="hidden md:block scale-[0.85] origin-right">
            <SubscriptionButton />
          </div>

          {/* Electron updates */}
          {isElectron && (
            <div className="hidden md:block scale-90">
              <UpdateButton />
            </div>
          )}

          {/* Spotlight-like search icon */}
          <Search className="h-3.5 w-3.5 opacity-90" />
          <Wifi className="h-3.5 w-3.5 opacity-90" />
          <div className="flex items-center gap-1">
            <Battery className="h-3.5 w-3.5 opacity-90" />
            <span className="opacity-90">100%</span>
          </div>

          {/* Staff/User quick hint (icon only) */}
          {staffDisplayName && (
            <div className="hidden sm:flex items-center gap-1 text-xs text-white/80">
              {isAdminMode ? <Shield className="h-3 w-3 text-yellow-400" /> : <User className="h-3 w-3 text-blue-400" />}
            </div>
          )}

          {/* Profile menu */}
          <div className="scale-90">
            <ProfileMenu />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MacMenuTitlebar;

