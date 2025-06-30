import { Link } from 'react-router-dom';
import { useState } from 'react';
import { 
  Bell, 
  ChevronDown, 
  LogOut, 
  Menu, 
  Moon, 
  Settings, 
  Sun, 
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SuperAdminNavbarProps {
  className?: string;
  toggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  isMobile?: boolean;
}

export default function SuperAdminNavbar({ 
  className, 
  toggleSidebar, 
  isSidebarOpen = true,
  isMobile = false
}: SuperAdminNavbarProps) {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [notifications] = useState(5); // Placeholder for notifications

  const handleLogout = () => {
    signOut();
    window.location.href = '/login';
  };

  return (
    <header className={cn(
      'py-2 px-4 flex items-center justify-between border-b', 
      className
    )}>
      {/* Logo and menu toggle */}
      <div className="flex items-center">
        {!isMobile && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleSidebar} 
            className="text-primary-foreground"
            aria-label={isSidebarOpen ? "إغلاق القائمة الجانبية" : "فتح القائمة الجانبية"}
          >
            <Menu className="h-6 w-6" />
          </Button>
        )}
        
        <Link to="/super-admin" className="flex items-center gap-2 mr-2">
          <div className="bg-primary rounded-lg p-1 shadow-sm">
            <ShieldIcon className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="font-bold text-primary text-lg">لوحة المسؤول الرئيسي</span>
        </Link>
      </div>

      {/* Right side items */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="text-muted-foreground rounded-full"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              className="relative rounded-full text-muted-foreground"
            >
              <Bell className="h-5 w-5" />
              {notifications > 0 && (
                <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-red-500 flex items-center justify-center text-[10px] text-white">
                  {notifications}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between p-2">
              <h2 className="font-semibold">الإشعارات</h2>
              <Button variant="ghost" size="sm" className="text-xs text-primary">
                تعيين الكل كمقروء
              </Button>
            </div>
            <DropdownMenuSeparator />
            {/* Placeholder notifications */}
            <div className="py-2 px-4 hover:bg-muted transition-colors">
              <p className="font-medium text-sm">مؤسسة جديدة تم إنشاؤها</p>
              <p className="text-muted-foreground text-xs mt-1">قبل 5 دقائق</p>
            </div>
            <DropdownMenuSeparator />
            <div className="py-2 px-4 hover:bg-muted transition-colors">
              <p className="font-medium text-sm">تم تحديث خطة اشتراك</p>
              <p className="text-muted-foreground text-xs mt-1">قبل ساعة واحدة</p>
            </div>
            <DropdownMenuSeparator />
            <div className="p-2 text-center">
              <Link to="/super-admin/notifications" className="text-xs text-primary hover:underline">
                عرض جميع الإشعارات
              </Link>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="relative h-10 flex items-center gap-2 px-2 rounded-full"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder-avatar.jpg" alt="Avatar" />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user?.email?.charAt(0).toUpperCase() || 'S'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start text-sm hidden sm:flex">
                <span className="font-medium">المسؤول الرئيسي</span>
                <span className="text-muted-foreground text-xs">{user?.email}</span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link to="/super-admin/profile" className="flex items-center gap-2 cursor-pointer">
                <User className="h-4 w-4" />
                <span>الملف الشخصي</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/super-admin/settings" className="flex items-center gap-2 cursor-pointer">
                <Settings className="h-4 w-4" />
                <span>الإعدادات</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleLogout}
              className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span>تسجيل الخروج</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

// Custom Shield Icon for super admin
function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M8 11l3 3 6-6" />
    </svg>
  );
}
