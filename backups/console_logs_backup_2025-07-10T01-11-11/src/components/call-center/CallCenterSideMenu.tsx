import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { isCallCenterSupervisor } from '@/lib/api/permissions';
import { 
  LayoutDashboard, 
  Phone, 
  PhoneCall, 
  CheckCircle, 
  Clock, 
  BarChart3, 
  User, 
  Users, 
  Settings, 
  Monitor,
  FileText,
  Bell,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  path: string;
  badge?: number;
  requireSupervisor?: boolean;
}

const CallCenterSideMenu: React.FC = () => {
  const { userProfile, signOut } = useAuth();
  const location = useLocation();
  const isSupervisor = isCallCenterSupervisor(userProfile);

  // قائمة العناصر الرئيسية
  const mainMenuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'لوحة التحكم',
      icon: LayoutDashboard,
      path: '/call-center/dashboard',
    },
    {
      id: 'orders-assigned',
      label: 'الطلبيات المخصصة',
      icon: Phone,
      path: '/call-center/orders/assigned',
      badge: 12, // سيتم جلبها من API لاحقاً
    },
    {
      id: 'orders-pending',
      label: 'الطلبيات المعلقة',
      icon: Clock,
      path: '/call-center/orders/pending',
      badge: 5,
    },
    {
      id: 'orders-completed',
      label: 'الطلبيات المكتملة',
      icon: CheckCircle,
      path: '/call-center/orders/completed',
    },
    {
      id: 'performance',
      label: 'إحصائياتي',
      icon: BarChart3,
      path: '/call-center/performance',
    },
  ];

  // قائمة عناصر المشرف
  const supervisorMenuItems: MenuItem[] = [
    {
      id: 'management',
      label: 'إدارة الموظفين',
      icon: Users,
      path: '/call-center/management',
      requireSupervisor: true,
    },
    {
      id: 'reports',
      label: 'التقارير',
      icon: FileText,
      path: '/call-center/reports',
      requireSupervisor: true,
    },
    {
      id: 'monitoring',
      label: 'المراقبة المباشرة',
      icon: Monitor,
      path: '/call-center/monitoring',
      requireSupervisor: true,
    },
    {
      id: 'settings',
      label: 'الإعدادات',
      icon: Settings,
      path: '/call-center/settings',
      requireSupervisor: true,
    },
  ];

  // دالة للتحقق من النشاط
  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // دالة تسجيل الخروج
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
    }
  };

  return (
    <div className="h-full call-center-glass border-r border-call-center-border flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-call-center-border">
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="call-center-gradient p-2 rounded-lg">
            <PhoneCall className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-call-center-foreground">مركز الاتصال</h2>
            <p className="text-sm text-call-center-foreground-muted">
              {isSupervisor ? 'مشرف' : 'موظف'}
            </p>
          </div>
        </div>
      </div>

      {/* معلومات المستخدم */}
      <div className="p-4 border-b border-call-center-border/50">
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="call-center-glass p-2 rounded-full border border-call-center-border">
            <User className="h-5 w-5 text-call-center-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-call-center-foreground truncate">
              {userProfile?.name || 'موظف مركز الاتصال'}
            </p>
            <p className="text-xs text-call-center-foreground-muted truncate">
              {userProfile?.email}
            </p>
          </div>
          <div className="flex-shrink-0">
            <div className="w-2 h-2 bg-call-center-success rounded-full call-center-pulse"></div>
          </div>
        </div>
      </div>

      {/* القائمة الرئيسية */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <div className="space-y-1">
          {mainMenuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <Link
                key={item.id}
                to={item.path}
                className={cn(
                  'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                  active
                    ? 'call-center-gradient text-white shadow-lg border-r-2 border-call-center-accent'
                    : 'text-call-center-foreground call-center-hover border border-transparent'
                )}
              >
                <Icon
                  className={cn(
                    'ml-3 h-5 w-5 flex-shrink-0 transition-colors',
                    active ? 'text-white' : 'text-call-center-primary group-hover:text-call-center-secondary'
                  )}
                />
                <span className="flex-1">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full",
                    active 
                      ? "bg-white/20 text-white" 
                      : "bg-call-center-error/10 text-call-center-error border border-call-center-error/20"
                  )}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* قسم المشرف */}
        {isSupervisor && (
          <div className="pt-6">
            <div className="px-3 mb-2">
              <h3 className="text-xs font-semibold text-call-center-foreground-muted uppercase tracking-wider">
                إدارة المشرف
              </h3>
            </div>
            <div className="space-y-1">
              {supervisorMenuItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    className={cn(
                      'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                      active
                        ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg border-r-2 border-purple-300'
                        : 'text-call-center-foreground call-center-hover border border-transparent'
                    )}
                  >
                    <Icon
                      className={cn(
                        'ml-3 h-5 w-5 flex-shrink-0 transition-colors',
                        active ? 'text-white' : 'text-purple-500 group-hover:text-purple-600'
                      )}
                    />
                    <span className="flex-1">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* الإشعارات */}
      <div className="p-4 border-t border-call-center-border/50">
        <button className="w-full flex items-center px-3 py-2 text-sm font-medium text-call-center-foreground rounded-lg call-center-hover transition-all duration-200 border border-call-center-border">
          <Bell className="ml-3 h-5 w-5 text-call-center-primary" />
          <span className="flex-1 text-right">الإشعارات</span>
          <span className="bg-call-center-error/10 text-call-center-error text-xs font-medium px-2 py-0.5 rounded-full border border-call-center-error/20">
            3
          </span>
        </button>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-call-center-border">
        <div className="space-y-2">
          <Link
            to="/call-center/profile"
            className="w-full flex items-center px-3 py-2 text-sm font-medium text-call-center-foreground rounded-lg call-center-hover transition-all duration-200 border border-call-center-border"
          >
            <User className="ml-3 h-5 w-5 text-call-center-primary" />
            <span>الملف الشخصي</span>
          </Link>
          
          <button
            onClick={handleSignOut}
            className="w-full flex items-center px-3 py-2 text-sm font-medium text-call-center-error rounded-lg hover:bg-call-center-error/10 transition-all duration-200 border border-call-center-error/20"
          >
            <LogOut className="ml-3 h-5 w-5 text-call-center-error" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallCenterSideMenu;
