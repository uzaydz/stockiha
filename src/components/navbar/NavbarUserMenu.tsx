import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { 
  User, 
  Settings, 
  LogOut, 
  ChevronDown, 
  Shield, 
  UserCircle, 
  Mail,
  ShoppingBag,
  Calendar,
  MessageSquare,
  HelpCircle,
  Briefcase,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

// دوال آمنة للـ hooks
const useAuthSafe = () => {
  try {
    return useAuth();
  } catch {
    return {
      user: null,
      userProfile: null,
      signOut: () => {},
      loading: false
    };
  }
};

const useTenantSafe = () => {
  try {
    return useTenant();
  } catch {
    return {
      currentOrganization: null,
      isLoading: false
    };
  }
};

interface NavbarUserMenuProps {
  isAdminPage?: boolean;
}

export function NavbarUserMenu({ isAdminPage = false }: NavbarUserMenuProps) {
  const { user, userProfile, signOut } = useAuthSafe();
  const { currentOrganization } = useTenantSafe();
  const [isOpen, setIsOpen] = useState(false);
  
  const isAdmin = userProfile?.role === 'admin';
  const isEmployee = userProfile?.role === 'employee';
  const isStaff = isAdmin || isEmployee;
  
  // دالة لتوليد رابط المتجر الصحيح
  const getStoreUrl = () => {
    if (!currentOrganization?.subdomain) {
      return '/';
    }
    
    // إذا كنا على localhost، استخدم النطاق الفرعي مع localhost
    if (window.location.hostname.includes('localhost')) {
      const port = window.location.port ? `:${window.location.port}` : '';
      return `http://${currentOrganization.subdomain}.localhost${port}`;
    }
    
    // إذا كنا على stockiha.com، استخدم النطاق الفرعي
    if (window.location.hostname.includes('stockiha.com')) {
      return `https://${currentOrganization.subdomain}.stockiha.com`;
    }
    
    // إذا كنا على stockiha.pages.dev، استخدم النطاق الفرعي مع stockiha.com
    if (window.location.hostname.includes('stockiha.pages.dev')) {
      return `https://${currentOrganization.subdomain}.stockiha.com`;
    }
    
    // إذا كنا على ktobi.online، استخدم النطاق الفرعي
    if (window.location.hostname.includes('ktobi.online')) {
      return `https://${currentOrganization.subdomain}.ktobi.online`;
    }
    
    // احتياطي: عودة إلى الصفحة الرئيسية
    return '/';
  };
  
  const handleLogout = async () => {
    await signOut();
    toast.success("تم تسجيل خروجك بنجاح");
  };
  
  const getAvatarInitial = (name?: string, email?: string) => {
    if (name && name.length > 0) return name.charAt(0).toUpperCase();
    if (email && email.length > 0) return email.charAt(0).toUpperCase();
    return 'م';
  };
  
  if (!user || !userProfile) {
    // إخفاء زر تسجيل الدخول من النافبار
    return null;
  }
  
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "flex items-center gap-2 px-2 py-1 h-auto",
            "bg-gradient-to-r from-background/60 to-background/80 backdrop-blur-sm",
            "border border-border/30 shadow-sm hover:shadow-lg",
            "rounded-full transition-all duration-300 group relative overflow-hidden",
            "hover:from-primary/10 hover:to-primary/5 hover:border-primary/30"
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <Avatar className={cn(
            "h-8 w-8 border-2 transition-all duration-300 relative z-10",
            "border-border/30 group-hover:border-primary/50 group-hover:scale-105"
          )}>
            <AvatarImage 
              src={userProfile.avatar_url || 'https://www.gravatar.com/avatar/?d=mp'} 
              alt={userProfile.name || user.email} 
            />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
              {getAvatarInitial(userProfile.name, user.email)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex items-center gap-1 relative z-10">
            <span className="hidden md:inline font-medium text-sm max-w-[120px] truncate group-hover:text-primary transition-colors duration-300">
              {userProfile.name || user.email}
            </span>
            <ChevronDown className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-all duration-300",
              "group-hover:text-primary",
              isOpen && "rotate-180"
            )} />
          </div>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className={cn(
          "w-72 p-4 rounded-2xl shadow-2xl border border-border/20",
          "bg-gradient-to-br from-background/95 to-background/90 backdrop-blur-xl"
        )}
      >
        {/* Header Section with Enhanced Design */}
        <div className="flex flex-col items-center mb-4 pb-4 border-b border-border/30 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-xl" />
          
          <Avatar className="h-20 w-20 mb-3 border-4 border-gradient-to-br from-primary/30 to-primary/10 shadow-lg relative z-10">
            <AvatarImage 
              src={userProfile.avatar_url || 'https://www.gravatar.com/avatar/?d=mp'} 
              alt={userProfile.name || user.email} 
            />
            <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/10 text-primary text-xl font-bold">
              {getAvatarInitial(userProfile.name, user.email)}
            </AvatarFallback>
          </Avatar>
          
          <span className="font-bold text-lg text-center relative z-10">
            {userProfile.name || user.email}
          </span>
          
          <div className="flex items-center gap-2 mt-1 relative z-10">
            <div className={cn(
              "px-3 py-1 rounded-full text-xs font-medium border",
              "bg-gradient-to-r shadow-sm",
              userProfile.role === 'admin' 
                ? "from-purple-100 to-purple-50 text-purple-700 border-purple-200 dark:from-purple-900/20 dark:to-purple-800/10 dark:text-purple-300 dark:border-purple-700/30"
                : userProfile.role === 'employee'
                  ? "from-blue-100 to-blue-50 text-blue-700 border-blue-200 dark:from-blue-900/20 dark:to-blue-800/10 dark:text-blue-300 dark:border-blue-700/30"
                  : "from-gray-100 to-gray-50 text-gray-700 border-gray-200 dark:from-gray-800/20 dark:to-gray-700/10 dark:text-gray-300 dark:border-gray-600/30"
            )}>
              <Shield className="h-3 w-3 inline ml-1" />
              {userProfile.role === 'admin' 
                ? 'مدير النظام' 
                : userProfile.role === 'employee' 
                  ? 'موظف' 
                  : 'مستخدم'
              }
            </div>
          </div>
        </div>
        
        {/* Menu Items with Enhanced Styling */}
        <DropdownMenuGroup className="space-y-1">
          <DropdownMenuItem asChild className={cn(
            "rounded-xl py-3 px-4 cursor-pointer transition-all duration-300 group",
            "hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary/5",
            "focus:bg-gradient-to-r focus:from-primary/10 focus:to-primary/5",
            "border border-transparent hover:border-primary/20"
          )}>
            <Link to={isAdmin ? '/dashboard/settings/profile' : '/user/profile'} className="flex items-center relative">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/20 dark:to-blue-800/10 ml-3 group-hover:scale-110 transition-transform duration-300">
                <UserCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="font-medium group-hover:text-primary transition-colors duration-300">الملف الشخصي</span>
            </Link>
          </DropdownMenuItem>
          
          {!isAdminPage && (
            <DropdownMenuItem asChild className={cn(
              "rounded-xl py-3 px-4 cursor-pointer transition-all duration-300 group",
              "hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary/5",
              "focus:bg-gradient-to-r focus:from-primary/10 focus:to-primary/5",
              "border border-transparent hover:border-primary/20"
            )}>
              <Link to="/user/orders" className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/20 dark:to-green-800/10 ml-3 group-hover:scale-110 transition-transform duration-300">
                  <ShoppingBag className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <span className="font-medium group-hover:text-primary transition-colors duration-300">طلباتي</span>
              </Link>
            </DropdownMenuItem>
          )}
          
          {!isAdminPage && (
            <DropdownMenuItem asChild className={cn(
              "rounded-xl py-3 px-4 cursor-pointer transition-all duration-300 group",
              "hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary/5",
              "focus:bg-gradient-to-r focus:from-primary/10 focus:to-primary/5",
              "border border-transparent hover:border-primary/20"
            )}>
              <Link to="/user/settings" className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800/20 dark:to-gray-700/10 ml-3 group-hover:scale-110 transition-transform duration-300">
                  <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
                <span className="font-medium group-hover:text-primary transition-colors duration-300">الإعدادات</span>
              </Link>
            </DropdownMenuItem>
          )}
          
          {isStaff && !isAdminPage && (
            <DropdownMenuItem asChild className={cn(
              "rounded-xl py-3 px-4 cursor-pointer transition-all duration-300 group",
              "hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary/5",
              "focus:bg-gradient-to-r focus:from-primary/10 focus:to-primary/5",
              "border border-transparent hover:border-primary/20"
            )}>
              <Link to="/dashboard" className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/20 dark:to-purple-800/10 ml-3 group-hover:scale-110 transition-transform duration-300">
                  <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="font-medium group-hover:text-primary transition-colors duration-300">لوحة التحكم</span>
              </Link>
            </DropdownMenuItem>
          )}
          
          {isStaff && isAdminPage && (
            <DropdownMenuItem asChild className={cn(
              "rounded-xl py-3 px-4 cursor-pointer transition-all duration-300 group",
              "hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary/5",
              "focus:bg-gradient-to-r focus:from-primary/10 focus:to-primary/5",
              "border border-transparent hover:border-primary/20"
            )}>
              <a href={getStoreUrl()} className="flex items-center" target="_blank" rel="noopener noreferrer">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-900/20 dark:to-indigo-800/10 ml-3 group-hover:scale-110 transition-transform duration-300">
                  <ShoppingBag className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <span className="font-medium group-hover:text-primary transition-colors duration-300">واجهة المتجر</span>
              </a>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator className="my-3 border-border/30" />
        
        {/* Logout Button with Enhanced Design */}
        <DropdownMenuItem 
          onClick={handleLogout} 
          className={cn(
            "rounded-xl py-3 px-4 cursor-pointer transition-all duration-300 group",
            "hover:bg-gradient-to-r hover:from-red-50 hover:to-red-25 dark:hover:from-red-950/20 dark:hover:to-red-900/10",
            "focus:bg-gradient-to-r focus:from-red-50 focus:to-red-25 dark:focus:from-red-950/20 dark:focus:to-red-900/10",
            "border border-transparent hover:border-red-200 dark:hover:border-red-800/30"
          )}
        >
          <div className="flex items-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-red-100 to-red-50 dark:from-red-900/20 dark:to-red-800/10 ml-3 group-hover:scale-110 transition-transform duration-300">
              <LogOut className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <span className="font-medium text-red-600 dark:text-red-400 group-hover:text-red-700 dark:group-hover:text-red-300 transition-colors duration-300">
              تسجيل الخروج
            </span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
