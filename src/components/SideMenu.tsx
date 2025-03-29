
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
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
  Store,
  FileText,
  Bell,
  MessageSquare,
  Database,
  Tag,
  Truck,
  Calendar
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar';

const SideMenu = () => {
  const location = useLocation();
  const { currentUser } = useShop();
  
  const isAdmin = currentUser?.role === 'admin';
  const isEmployee = currentUser?.role === 'employee';
  
  const navItems = [
    {
      group: 'الرئيسية',
      items: [
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
      ]
    },
    {
      group: 'المنتجات والخدمات',
      items: [
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
          title: 'الفئات',
          icon: Tag,
          href: '/dashboard/categories',
          adminOnly: isAdmin ? false : !isEmployee || !currentUser?.permissions?.manageProducts,
        },
        {
          title: 'المخزون',
          icon: Database,
          href: '/dashboard/inventory',
          adminOnly: isAdmin ? false : !isEmployee || !currentUser?.permissions?.manageProducts,
        },
      ]
    },
    {
      group: 'الطلبات والمبيعات',
      items: [
        {
          title: 'الطلبات',
          icon: ShoppingBag,
          href: '/dashboard/orders',
          adminOnly: isAdmin ? false : !isEmployee || !currentUser?.permissions?.manageOrders,
        },
        {
          title: 'طلبات الصيانة',
          icon: Wrench,
          href: '/dashboard/repairs',
          adminOnly: isAdmin ? false : !isEmployee || !currentUser?.permissions?.manageServices,
        },
        {
          title: 'الشحن',
          icon: Truck,
          href: '/dashboard/shipping',
          adminOnly: isAdmin ? false : !isEmployee || !currentUser?.permissions?.manageOrders,
        },
      ]
    },
    {
      group: 'العملاء والموظفين',
      items: [
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
      ]
    },
    {
      group: 'التقارير والتحليلات',
      items: [
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
          title: 'تحليلات المبيعات',
          icon: BarChart3,
          href: '/dashboard/analytics',
          adminOnly: true,
        },
      ]
    },
    {
      group: 'النظام',
      items: [
        {
          title: 'الإشعارات',
          icon: Bell,
          href: '/dashboard/notifications',
          adminOnly: false,
        },
        {
          title: 'الدعم الفني',
          icon: MessageSquare,
          href: '/dashboard/support',
          adminOnly: false,
        },
        {
          title: 'الإعدادات',
          icon: Settings,
          href: '/dashboard/settings',
          adminOnly: true,
        },
      ]
    },
  ];
  
  return (
    <Sidebar className="border-0">
      <SidebarContent>
        {navItems.map((group, groupIndex) => {
          // Filter items based on user role
          const filteredItems = group.items.filter(item => 
            !item.adminOnly || (item.adminOnly && isAdmin)
          );

          // Skip rendering the entire group if no items are visible
          if (filteredItems.length === 0) {
            return null;
          }

          return (
            <SidebarGroup key={groupIndex}>
              <SidebarGroupLabel>{group.group}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {filteredItems.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.title}
                        >
                          <Link
                            to={item.href}
                            className={cn(
                              "flex items-center gap-2",
                              isActive && "font-medium"
                            )}
                          >
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
};

export default SideMenu;
