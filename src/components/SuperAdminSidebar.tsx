import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Building, 
  Users, 
  Settings, 
  BarChart3, 
  CreditCard, 
  ShieldAlert,
  FileText,
  Bell,
  Database,
  ChevronLeft,
  Globe,
  Landmark,
  LineChart,
  Clock,
  Layers,
  Lock,
  Cog,
  CircleDollarSign
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
// استيراد روابط القائمة الجانبية
import { SuperAdminSidebarLinks } from '@/data/SuperAdminSidebarLinks';

export default function SuperAdminSidebar() {
  const location = useLocation();
  const [activeGroup, setActiveGroup] = useState<string | null>('الرئيسية');
  const { user } = useAuth();
  
  const toggleGroup = (group: string) => {
    setActiveGroup(prevGroup => prevGroup === group ? null : group);
  };

  // Navigation groups for super admin
  const navGroups = [
    {
      group: 'الرئيسية',
      icon: LayoutDashboard,
      items: [
        {
          title: 'لوحة التحكم',
          icon: LayoutDashboard,
          href: '/super-admin',
          badge: null
        },
        {
          title: 'الإحصائيات',
          icon: BarChart3,
          href: '/super-admin/analytics',
          badge: null
        },
      ]
    },
    {
      group: 'إدارة المؤسسات',
      icon: Building,
      items: [
        {
          title: 'جميع المؤسسات',
          icon: Building,
          href: '/super-admin/organizations',
          badge: null
        },
        {
          title: 'طلبات الإنضمام',
          icon: Clock,
          href: '/super-admin/organizations/requests',
          badge: '3'
        },
        {
          title: 'خطط الاشتراكات',
          icon: CreditCard,
          href: '/super-admin/subscriptions',
          badge: null
        },
        {
          title: 'المدفوعات',
          icon: Landmark,
          href: '/super-admin/payments',
          badge: null
        }
      ]
    },
    {
      group: 'إدارة المستخدمين',
      icon: Users,
      items: [
        {
          title: 'المستخدمين',
          icon: Users,
          href: '/super-admin/users',
          badge: null
        },
        {
          title: 'المشرفين',
          icon: ShieldAlert,
          href: '/super-admin/admins',
          badge: null
        },
        {
          title: 'الصلاحيات',
          icon: Lock,
          href: '/super-admin/permissions',
          badge: null
        }
      ]
    },
    {
      group: 'النظام',
      icon: Cog,
      items: [
        {
          title: 'الإعدادات',
          icon: Settings,
          href: '/super-admin/settings',
          badge: null
        },
        {
          title: 'سجلات النظام',
          icon: FileText,
          href: '/super-admin/logs',
          badge: null
        },
        {
          title: 'الإشعارات',
          icon: Bell,
          href: '/super-admin/notifications',
          badge: '5'
        },
        {
          title: 'قاعدة البيانات',
          icon: Database,
          href: '/super-admin/database',
          badge: null
        },
        {
          title: 'النسخ الاحتياطي',
          icon: Layers,
          href: '/super-admin/backups',
          badge: null
        },
        {
          title: 'طرق الدفع',
          icon: CircleDollarSign,
          href: '/super-admin/payment-methods',
          badge: null
        },
        {
          title: 'المتصفح العام',
          icon: Globe,
          href: '/',
          badge: null
        }
      ]
    }
  ];

  return (
    <div 
      id="sidebar-container"
      className="h-full w-64 overflow-y-auto pb-10 bg-card/40 border-l"
    >
      {/* User profile section */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-12 w-12 border-2 border-primary">
            <AvatarImage src="/placeholder-avatar.jpg" alt="Avatar" />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {user?.email?.charAt(0).toUpperCase() || 'S'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">المسؤول الرئيسي</h3>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Link to="/super-admin/profile" className="text-xs text-center py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors">
            الملف الشخصي
          </Link>
          <Link to="/super-admin/settings" className="text-xs text-center py-1 bg-muted hover:bg-muted/80 rounded transition-colors">
            الإعدادات
          </Link>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-2">
        {navGroups.map((group) => (
          <div key={group.group} className="mb-2">
            {/* Group header */}
            <button
              onClick={() => toggleGroup(group.group)}
              className={cn(
                "w-full flex items-center justify-between p-2 rounded-md transition-colors text-sm",
                activeGroup === group.group 
                  ? "bg-primary/10 text-primary" 
                  : "hover:bg-muted"
              )}
            >
              <div className="flex items-center gap-2">
                <group.icon className="h-4 w-4" />
                <span>{group.group}</span>
              </div>
              <ChevronLeft className={cn(
                "h-4 w-4 transition-transform",
                activeGroup === group.group && "transform rotate-90"
              )} />
            </button>
            
            {/* Group items */}
            {activeGroup === group.group && (
              <div className="mt-1 mr-3 border-r pr-2 border-primary/20">
                {group.items.map((item) => {
                  const isActive = location.pathname === item.href;
                  
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={cn(
                        "flex items-center justify-between py-2 px-3 rounded-md text-sm my-1 transition-colors",
                        isActive 
                          ? "bg-primary text-primary-foreground" 
                          : "hover:bg-muted"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </div>
                      {item.badge && (
                        <Badge variant={isActive ? "outline" : "default"} className={isActive ? "bg-primary-foreground text-primary" : ""}>
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {/* قائمة روابط إضافية */}
        <div className="mt-6 border-t pt-4">
          <h4 className="text-xs font-semibold text-muted-foreground px-2 mb-2">روابط سريعة</h4>
          <div className="space-y-1">
            {SuperAdminSidebarLinks.map((link) => {
              const isActive = location.pathname === link.href;
              
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    "flex items-center py-2 px-3 rounded-md text-sm transition-colors",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {link.icon}
                    <span>{link.name}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
      
      {/* System status */}
      <div className="px-4 py-3 mt-auto border-t absolute bottom-0 w-full bg-muted/50">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500"></span>
            <span>النظام يعمل</span>
          </div>
          <span>v1.0.0</span>
        </div>
      </div>
    </div>
  );
}
