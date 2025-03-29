
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useShop } from '@/context/ShopContext';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  Users, 
  Settings, 
  BarChart3, 
  DollarSign, 
  Wrench, 
  Store
} from 'lucide-react';

const SideMenu = () => {
  const location = useLocation();
  const { currentUser } = useShop();
  
  const isAdmin = currentUser?.role === 'admin';
  const isEmployee = currentUser?.role === 'employee';
  
  const navItems = [
    {
      title: 'لوحة التحكم',
      icon: LayoutDashboard,
      href: '/dashboard',
      adminOnly: false,
    },
    {
      title: 'نقطة البيع',
      icon: Store,
      href: '/pos',
      adminOnly: false,
    },
    {
      title: 'المنتجات',
      icon: Package,
      href: '/dashboard/products',
      adminOnly: isAdmin ? false : !isEmployee || !currentUser?.permissions?.manageProducts,
    },
    {
      title: 'الخدمات',
      icon: Wrench,
      href: '/dashboard/services',
      adminOnly: isAdmin ? false : !isEmployee || !currentUser?.permissions?.manageServices,
    },
    {
      title: 'الطلبات',
      icon: ShoppingBag,
      href: '/dashboard/orders',
      adminOnly: isAdmin ? false : !isEmployee || !currentUser?.permissions?.manageOrders,
    },
    {
      title: 'العملاء',
      icon: Users,
      href: '/dashboard/customers',
      adminOnly: isAdmin ? false : !isEmployee || !currentUser?.permissions?.manageUsers,
    },
    {
      title: 'الموظفين',
      icon: Users,
      href: '/dashboard/employees',
      adminOnly: true,
    },
    {
      title: 'التقارير المالية',
      icon: BarChart3,
      href: '/dashboard/reports',
      adminOnly: isAdmin ? false : !isEmployee || !currentUser?.permissions?.viewReports,
    },
    {
      title: 'المصروفات',
      icon: DollarSign,
      href: '/dashboard/expenses',
      adminOnly: true,
    },
    {
      title: 'الإعدادات',
      icon: Settings,
      href: '/dashboard/settings',
      adminOnly: true,
    },
  ];
  
  // Filter items based on user role
  const filteredNavItems = navItems.filter(item => 
    !item.adminOnly || (item.adminOnly && isAdmin)
  );

  return (
    <aside className="bg-sidebar text-sidebar-foreground w-64 border-l border-sidebar-border hidden md:block overflow-y-auto">
      <div className="px-4 py-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-sidebar-primary-foreground">لوحة التحكم</h2>
          <p className="text-sidebar-foreground/60 text-sm">
            {isAdmin ? 'مدير النظام' : 'موظف'}
          </p>
        </div>
        
        <nav className="space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link to={item.href} key={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    'w-full justify-start text-right',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90'
                      : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5 ml-2 rtl:mr-2 rtl:ml-0" />
                  {item.title}
                </Button>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};

export default SideMenu;
