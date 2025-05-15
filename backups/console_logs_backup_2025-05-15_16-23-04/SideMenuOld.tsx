import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
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
  Calendar,
  ChevronLeft,
  User,
  Home,
  LogOut,
  ShieldCheck,
  LayoutList,
  Folder,
  Building,
  FileBarChart,
  CreditCard,
  HelpCircle,
  Layers,
  Filter,
  Receipt,
  Inbox,
  Phone,
  Euro,
  Wallet,
  BanknoteIcon,
  Server
} from 'lucide-react';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EmployeePermissions } from '@/types/employee';

// خريطة لتصحيح أسماء الصلاحيات
const permissionMapping: Record<string, string[]> = {
  'viewServices': ['viewServices', 'manageServices'],
  'viewProducts': ['viewProducts', 'manageProducts', 'editProducts'],
  'viewOrders': ['viewOrders', 'manageOrders'],
  'viewSalesReports': ['viewSalesReports', 'viewReports'],
  'viewFinancialReports': ['viewFinancialReports', 'viewReports'],
  'viewCustomers': ['viewCustomers', 'manageCustomers'],
  'viewDebts': ['viewDebts', 'manageCustomers', 'viewCustomers'],
  'viewEmployees': ['viewEmployees', 'manageEmployees'],
  'manageOrganizationSettings': ['manageOrganizationSettings', 'manageSettings'],
  'viewSettings': ['viewSettings', 'manageSettings'],
  'viewInventory': ['viewInventory', 'manageInventory'],
  'accessPOS': ['accessPOS'],
  'trackServices': ['trackServices', 'manageServices'],
  'viewSuppliers': ['viewSuppliers', 'manageSuppliers'],
  'managePurchases': ['managePurchases', 'manageSuppliers'],
  'viewReports': ['viewReports'],
  'manageFlexiAndDigitalCurrency': ['manageFlexi'],
  'sellFlexiAndDigitalCurrency': ['manageFlexi', 'processPayments'],
  'viewFlexiAndDigitalCurrencySales': ['manageFlexi', 'viewReports'],
  'manageProductCategories': ['manageProductCategories', 'manageProducts', 'editProducts'],
  'updateOrderStatus': ['updateOrderStatus', 'manageOrders'],
  'manageNotificationSettings': ['manageNotificationSettings', 'viewSettings', 'manageSettings'],
  'manageSettings': ['manageSettings', 'viewSettings'],
  'manageDatabase': ['manageDatabase', 'manageSettings']
};

// دالة للتحقق من صلاحية باستخدام خريطة التصحيح
const checkPermission = (
  permissionName: string | null,
  permissions: any
): boolean => {
  if (!permissionName) return true; // لا تتطلب صلاحية
  
  // البحث عن صلاحيات بديلة في خريطة التصحيح
  const mappedPermissions = permissionMapping[permissionName] || [permissionName];
  
  // التحقق من أي من الصلاحيات البديلة
  return mappedPermissions.some(mappedPerm => permissions[mappedPerm] === true);
};

// تحديد خصائص مكون SideMenu
interface SideMenuProps {
  userRole: string | null;
  userPermissions?: EmployeePermissions | null;
}

// المفتاح المستخدم للتخزين في localStorage
const ACTIVE_GROUP_STORAGE_KEY = 'bazaar_active_sidebar_group';

const SideMenu = ({ userRole, userPermissions }: SideMenuProps) => {
  const location = useLocation();
  const initialRenderRef = useRef(true);
  const menuIsVisibleRef = useRef(true);
  
  // استعادة المجموعة النشطة من التخزين المحلي أو استخدام 'الرئيسية' كقيمة افتراضية
  const getInitialActiveGroup = () => {
    try {
      const storedGroup = localStorage.getItem(ACTIVE_GROUP_STORAGE_KEY);
      return storedGroup || 'الرئيسية';
    } catch (e) {
      console.warn('فشل في استرجاع المجموعة النشطة من التخزين المحلي:', e);
      return 'الرئيسية';
    }
  };
  
  // تحديد المجموعة النشطة الافتراضية عند التحميل
  const [activeGroup, setActiveGroup] = useState<string | null>(getInitialActiveGroup());
  const [scrolled, setScrolled] = useState(false);
  const { signOut, user } = useAuth();
  
  const permissions = userPermissions || {};
  
  const isAdmin = userRole === 'admin';

  // تسجيل حالة القائمة
  useEffect(() => {
    // طباعة فقط عند التقديم الأولي لتجنب السجلات المتكررة
    if (initialRenderRef.current) {
      console.log('[SideMenu] تم تحميل القائمة الجانبية، المجموعة النشطة:', activeGroup);
      initialRenderRef.current = false;
    }

    // تكوين مراقب لرصد ظهور/اختفاء القائمة الجانبية
    if (typeof window !== 'undefined' && typeof MutationObserver !== 'undefined') {
      const sidebarElement = document.getElementById('sidebar-container');
      
      if (sidebarElement) {
        const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            if (mutation.type === 'attributes' && 
                (mutation.attributeName === 'style' || 
                 mutation.attributeName === 'class' || 
                 mutation.attributeName === 'hidden')) {
              const isVisible = sidebarElement.offsetParent !== null;
              if (menuIsVisibleRef.current !== isVisible) {
                menuIsVisibleRef.current = isVisible;
                console.log(`[SideMenu] تغيرت حالة القائمة الجانبية: ${isVisible ? 'ظاهرة' : 'مخفية'}`);
              }
            }
          }
        });
        
        observer.observe(sidebarElement, {
          attributes: true,
          attributeFilter: ['style', 'class', 'hidden']
        });
        
        return () => observer.disconnect();
      }
    }
  }, []);
  
  // حفظ المجموعة النشطة في التخزين المحلي عند تغييرها
  useEffect(() => {
    if (activeGroup) {
      try {
        localStorage.setItem(ACTIVE_GROUP_STORAGE_KEY, activeGroup);
      } catch (e) {
        console.warn('فشل في حفظ المجموعة النشطة في التخزين المحلي:', e);
      }
    }
  }, [activeGroup]);

  // تتبع التمرير للتأثيرات البصرية
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLDivElement;
      if (target.scrollTop > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    
    const sidebarElement = document.getElementById('sidebar-container');
    if (sidebarElement) {
      sidebarElement.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      if (sidebarElement) {
        sidebarElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);
  
  // استخدام useCallback لتحسين الأداء وتجنب إعادة إنشاء الدالة في كل تقديم
  const toggleGroup = useCallback((group: string) => {
    // تحديث الحالة فوراً باستخدام الحالة السابقة
    setActiveGroup(prevGroup => {
      const newState = prevGroup === group ? null : group;
      console.log('تبديل المجموعة:', group, 'الحالة الجديدة:', newState);
      return newState;
    });
  }, []);

  // منع اختفاء القائمة عند العودة من التبويب
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[SideMenu] العودة إلى التبويب، المجموعة النشطة:', activeGroup);
        
        // إعادة تأكيد رؤية القائمة الجانبية
        const sidebarElement = document.getElementById('sidebar-container');
        if (sidebarElement && window.getComputedStyle(sidebarElement).display === 'none') {
          console.log('[SideMenu] إعادة إظهار القائمة الجانبية بعد العودة للتبويب');
          sidebarElement.style.display = 'block';
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeGroup]);

  const handleLogout = () => {
    signOut();
    window.location.href = '/login';
  };
  
  const navItems = [
    {
      group: 'الرئيسية',
      icon: Home,
      requiredPermission: null,
      items: [
        {
          title: 'لوحة التحكم',
          icon: LayoutDashboard,
          href: '/dashboard',
          requiredPermission: null,
          badge: null
        },
        {
          title: 'نقطة البيع',
          icon: Store,
          href: '/dashboard/pos',
          requiredPermission: 'accessPOS',
          badge: null
        },
      ]
    },
    {
      group: 'المنتجات والخدمات',
      icon: Package,
      requiredPermission: 'viewProducts',
      items: [
        {
          title: 'المنتجات',
          icon: Package,
          href: '/dashboard/products',
          requiredPermission: 'viewProducts',
          badge: 'جديد'
        },
        {
          title: 'الخدمات',
          icon: Wrench,
          href: '/dashboard/services',
          requiredPermission: 'viewServices',
          badge: null
        },
        {
          title: 'متابعة الخدمات',
          icon: Calendar,
          href: '/dashboard/service-tracking',
          requiredPermission: 'trackServices',
          badge: null
        },
        {
          title: 'الفئات',
          icon: Tag,
          href: '/dashboard/categories',
          requiredPermission: 'manageProductCategories',
          badge: null
        },
        {
          title: 'المخزون',
          icon: Database,
          href: '/dashboard/inventory',
          requiredPermission: 'viewInventory',
          badge: '5'
        },
      ]
    },
    {
      group: 'الطلبات والمبيعات',
      icon: ShoppingBag,
      requiredPermission: 'viewOrders',
      items: [
        {
          title: 'المبيعات',
          icon: DollarSign,
          href: '/dashboard/sales',
          requiredPermission: 'viewSalesReports',
          badge: null
        },
        {
          title: 'الطلبات',
          icon: ShoppingBag,
          href: '/dashboard/orders',
          requiredPermission: 'viewOrders',
          badge: '12'
        },
        {
          title: 'الفواتير',
          icon: FileText,
          href: '/dashboard/invoices',
          requiredPermission: 'viewOrders',
          badge: null
        },
        {
          title: 'طلبات الصيانة',
          icon: Wrench,
          href: '/dashboard/repairs',
          requiredPermission: 'trackServices',
          badge: null
        },
        {
          title: 'الشحن',
          icon: Truck,
          href: '/dashboard/shipping',
          requiredPermission: 'updateOrderStatus',
          badge: null
        },
      ]
    },
    {
      group: 'الموردين والمشتريات',
      icon: Truck,
      requiredPermission: 'viewSuppliers',
      items: [
        {
          title: 'الموردين',
          icon: Users,
          href: '/dashboard/suppliers',
          requiredPermission: 'viewSuppliers',
          badge: 'جديد'
        },
        {
          title: 'المشتريات',
          icon: ShoppingBag,
          href: '/dashboard/suppliers/purchases',
          requiredPermission: 'managePurchases',
          badge: null
        },
        {
          title: 'المدفوعات',
          icon: Receipt,
          href: '/dashboard/suppliers/payments',
          requiredPermission: 'managePurchases',
          badge: null
        },
        {
          title: 'التقارير',
          icon: FileBarChart,
          href: '/dashboard/suppliers/reports',
          requiredPermission: 'viewReports',
          badge: null
        },
      ]
    },
    {
      group: 'العملاء والموظفين',
      icon: Users,
      requiredPermission: null,
      items: [
        {
          title: 'العملاء',
          icon: Users,
          href: '/dashboard/customers',
          requiredPermission: 'viewCustomers',
          badge: null
        },
        {
          title: 'إضافة عميل',
          icon: Users,
          href: '/dashboard/customers/add',
          requiredPermission: 'manageCustomers',
          badge: null
        },
        {
          title: 'إدارة الديون',
          icon: BanknoteIcon,
          href: '/dashboard/customer-debts',
          requiredPermission: 'viewDebts',
          badge: null
        },
        {
          title: 'الموظفين',
          icon: Users,
          href: '/dashboard/employees',
          requiredPermission: 'viewEmployees',
          badge: null
        },
      ]
    },
    {
      group: 'فليكسي وعملات رقمية',
      icon: Phone,
      requiredPermission: null,
      items: [
        {
          title: 'إدارة الرصيد',
          icon: Wallet,
          href: '/dashboard/flexi-management',
          requiredPermission: 'manageFlexiAndDigitalCurrency',
          badge: null
        },
        {
          title: 'بيع الفليكسي والعملات',
          icon: Phone,
          href: '/dashboard/flexi-sales',
          requiredPermission: 'sellFlexiAndDigitalCurrency',
          badge: null
        },
        {
          title: 'تحليلات المبيعات',
          icon: BarChart3,
          href: '/dashboard/flexi-analytics',
          requiredPermission: 'viewFlexiAndDigitalCurrencySales',
          badge: null
        },
      ]
    },
    {
      group: 'التقارير والتحليلات',
      icon: FileText,
      requiredPermission: 'viewReports',
      items: [
        {
          title: 'التقارير المالية',
          icon: BarChart3,
          href: '/dashboard/reports',
          requiredPermission: 'viewFinancialReports',
          badge: null
        },
        {
          title: 'المصروفات',
          icon: DollarSign,
          href: '/dashboard/expenses',
          requiredPermission: 'viewFinancialReports',
          badge: null
        },
        {
          title: 'تحليلات المبيعات',
          icon: BarChart3,
          href: '/dashboard/analytics',
          requiredPermission: 'viewSalesReports',
          badge: null
        },
      ]
    },
    {
      group: 'النظام',
      icon: Settings,
      requiredPermission: 'viewSettings',
      items: [
        {
          title: 'الإشعارات',
          icon: Bell,
          href: '/dashboard/notifications',
          requiredPermission: 'manageNotificationSettings',
          badge: '4'
        },
        {
          title: 'الدعم الفني',
          icon: MessageSquare,
          href: '/dashboard/support',
          requiredPermission: null,
          badge: null
        },
        {
          title: 'تخصيص المتجر',
          icon: Store,
          href: '/dashboard/store-editor',
          requiredPermission: 'manageOrganizationSettings',
          badge: 'جديد'
        },
        {
          title: 'الإعدادات',
          icon: Settings,
          href: '/dashboard/settings',
          requiredPermission: 'viewSettings',
          badge: null
        },
        {
          title: 'الاشتراكات',
          icon: Wallet,
          href: '/dashboard/subscription',
          requiredPermission: null,
          badge: null
        },
        {
          title: 'إعدادات المؤسسة',
          icon: Building,
          href: '/dashboard/organization',
          requiredPermission: 'manageOrganizationSettings',
          badge: null
        },
      ]
    },
    {
      group: 'الإعدادات',
      icon: Settings,
      requiredPermission: null,
      items: [
        {
          title: 'إعدادات النظام',
          icon: Settings,
          href: '/dashboard/system-settings',
          requiredPermission: isAdmin ? null : 'manageSettings',
          badge: null
        },
        {
          title: 'الموظفين',
          icon: Users,
          href: '/dashboard/manage-employees',
          requiredPermission: isAdmin ? null : 'manageEmployees',
          badge: null
        },
        {
          title: 'قاعدة البيانات',
          icon: Database,
          href: '/admin/database',
          requiredPermission: isAdmin ? null : 'manageDatabase',
          badge: 'جديد'
        },
        {
          title: 'أدوات قاعدة البيانات',
          icon: Server,
          href: '/dashboard/database-tools',
          requiredPermission: isAdmin ? null : 'manageDatabase',
          badge: 'جديد'
        },
      ]
    },
  ];
  
  // تحديد المجموعة النشطة استناداً إلى المسار الحالي
  const currentPath = location.pathname;
  let currentGroup = '';
  
  for (const group of navItems) {
    for (const item of group.items) {
      // تحسين منطق المطابقة لتحديد العنصر النشط بشكل أكثر دقة
      if (currentPath === item.href || 
          (currentPath.startsWith(item.href + '/') && item.href !== '/dashboard') || 
          (item.href === '/dashboard' && currentPath === '/dashboard')) {
        currentGroup = group.group;
        break;
      }
    }
    if (currentGroup) break;
  }
  
  // تلقائياً افتح المجموعة الحالية
  useEffect(() => {
    // تحديد المجموعة النشطة عند تغيير المسار
    if (currentGroup && currentGroup !== activeGroup) {
      console.log('تغيير المجموعة النشطة من التأثير:', currentGroup);
      setActiveGroup(currentGroup);
    }
  }, [currentPath]);
  
  // الارتباطات في القائمة الجانبية
  const links = [
    {
      title: "لوحة التحكم",
      href: "/dashboard",
      icon: <LayoutDashboard className="ml-2 h-4 w-4" />,
    },
    {
      title: "نقاط البيع",
      href: "/dashboard/pos",
      icon: <LayoutList className="ml-2 h-4 w-4" />,
    },
    {
      title: "المبيعات",
      href: "/dashboard/sales",
      icon: <DollarSign className="ml-2 h-4 w-4" />,
    },
    {
      title: "المنتجات",
      href: "/dashboard/products",
      icon: <ShoppingBag className="ml-2 h-4 w-4" />,
    },
    {
      title: "المخزون",
      href: "/dashboard/inventory",
      icon: <Package className="ml-2 h-4 w-4" />,
    },
    {
      title: "التصنيفات",
      href: "/dashboard/categories",
      icon: <Folder className="ml-2 h-4 w-4" />,
    },
    {
      title: "الخدمات",
      href: "/dashboard/services",
      icon: <Wrench className="ml-2 h-4 w-4" />,
    },
    {
      title: "متابعة الخدمات",
      href: "/dashboard/service-tracking",
      icon: <Calendar className="ml-2 h-4 w-4" />,
    },
  ];
  
  return (
    <div id="sidebar-container" className="w-64 h-full overflow-y-auto overflow-x-hidden bg-card/95 backdrop-blur-sm scrollbar-thin scrollbar-thumb-primary/10 scrollbar-track-transparent">
      {/* رأس القائمة الجانبية مع شعار وعنوان */}
      <div className={cn(
        "sticky top-0 z-20 pt-3 px-3 pb-2 transition-all duration-200",
        scrolled ? "bg-gradient-to-r from-primary/5 to-card/95 backdrop-blur-md shadow-sm" : "bg-gradient-to-r from-primary/10 to-transparent"
      )}>
        <div className="flex items-center justify-between mb-2 px-2">
          <div className="flex-1">
            <h2 className="text-lg font-bold bg-gradient-to-l from-primary/90 to-primary/70 bg-clip-text text-transparent">لوحة التحكم</h2>
            {isAdmin && <Badge variant="outline" className="bg-primary/5 text-xs border-primary/20 px-1.5 text-primary mt-1">مسؤول</Badge>}
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center shadow-sm">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
        </div>
      </div>
      
      {/* قسم المستخدم */}
      <div className="mx-3 mb-4 p-3 bg-muted/30 rounded-lg backdrop-blur-sm border border-border/30 hover:border-primary/20 transition-colors duration-200 cursor-pointer group">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border-2 border-primary/20 group-hover:border-primary/40 transition-all duration-200 shadow-sm">
            <AvatarImage src="/user-avatar.png" alt="صورة المستخدم" />
            <AvatarFallback className="bg-primary/10 text-primary">
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {isAdmin ? 'المسؤول' : 'المستخدم'}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="bg-primary/5 text-xs border-primary/20 px-1.5 group-hover:bg-primary/10 transition-colors duration-200">
                  {isAdmin ? 'مسؤول' : 'مستخدم'}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>الصلاحيات: {isAdmin ? 'كاملة' : 'مستخدم عادي'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {/* القائمة والمجموعات */}
      <div className="space-y-0.5 px-2">
        {/* تصفية المجموعات باستخدام دالة فحص الصلاحيات المحسنة */}
        {navItems
          .filter(group => 
              isAdmin || // إظهار المجموعة للمسؤول
              !group.requiredPermission || 
              checkPermission(group.requiredPermission, permissions)
          )
          .map((group, groupIndex) => {

          // تصفية العناصر داخل المجموعة باستخدام دالة فحص الصلاحيات المحسنة
          const filteredItems = group.items.filter(item => 
              isAdmin || // إظهار العنصر للمسؤول
              !item.requiredPermission || 
              checkPermission(item.requiredPermission, permissions)
          );

          // تخطي عرض المجموعة بأكملها إذا لم تكن هناك عناصر مرئية بعد فحص الصلاحيات
          if (filteredItems.length === 0) {
            return null;
          }

          const isGroupActive = activeGroup === group.group;
          
          // تحسين منطق تحديد وجود عنصر نشط داخل المجموعة
          const hasActiveItem = filteredItems.some(item => 
            currentPath === item.href || 
            (currentPath.startsWith(item.href + '/') && item.href !== '/dashboard') || 
            (item.href === '/dashboard' && currentPath === '/dashboard')
          );

          return (
            <div key={groupIndex} className={cn(
              "rounded-md overflow-hidden transition-all duration-300 my-1",
              isGroupActive ? "bg-muted/50 shadow-sm" : "",
              hasActiveItem && !isGroupActive ? "bg-muted/20" : ""
            )}>
              {/* عنوان المجموعة */}
              <button
                type="button"
                onClick={() => toggleGroup(group.group)}
                className={cn(
                  "w-full flex items-center justify-between p-2.5 rounded-md transition-all",
                  isGroupActive 
                    ? "bg-muted/80 hover:bg-muted/90 shadow-sm" 
                    : "hover:bg-muted/30"
                )}
                aria-expanded={isGroupActive}
              >
                <span className={cn(
                  "text-sm font-medium flex items-center",
                  isGroupActive || hasActiveItem ? "text-primary" : "text-muted-foreground"
                )}>
                  <group.icon className={cn(
                    "h-4 w-4 ml-2",
                    isGroupActive || hasActiveItem ? "text-primary" : "text-muted-foreground"
                  )} />
                  {group.group}
                </span>
                <ChevronLeft className={cn(
                  "h-4 w-4 transition-transform duration-300",
                  isGroupActive ? "rotate-90 text-primary" : "text-muted-foreground"
                )} />
              </button>
              
              {/* عناصر المجموعة */}
              <div className={cn(
                "overflow-hidden transition-all duration-300 ease-in-out",
                isGroupActive ? "max-h-96" : "max-h-0"
              )} style={{ visibility: isGroupActive ? 'visible' : 'hidden' }}>
                <div className="p-1 space-y-0.5">
                  {filteredItems.map((item) => {
                    // تحسين منطق المقارنة لتحديد العنصر النشط بشكل أكثر دقة
                    const isActive = 
                      currentPath === item.href || 
                      (currentPath.startsWith(item.href + '/') && item.href !== '/dashboard') || 
                      (item.href === '/dashboard' && currentPath === '/dashboard');
                    
                    return (
                      <Link
                        key={`${item.href}${item.title}`}
                        to={item.href}
                        className={cn(
                          "flex items-center justify-between px-3 py-2 text-sm rounded-md transition-all duration-200",
                          isActive 
                            ? "bg-primary/10 text-primary font-medium border-r-2 border-primary shadow-sm" 
                            : "hover:bg-muted text-foreground hover:border-r hover:border-primary/30"
                        )}
                      >
                        <div className="flex items-center">
                          <div className={cn(
                            "h-6 w-6 rounded-md flex items-center justify-center mr-2 transition-colors duration-200",
                            isActive ? "bg-primary/20 text-primary" : "text-muted-foreground group-hover:bg-muted-foreground/10"
                          )}>
                            <item.icon className="h-3.5 w-3.5" />
                          </div>
                          <span>{item.title}</span>
                        </div>
                        
                        {item.badge && (
                          <Badge className={cn(
                            "text-[10px] px-1.5 min-h-5 min-w-5 flex items-center justify-center",
                            isActive ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20 text-muted-foreground"
                          )}>
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* تذييل القائمة مع إحصائيات سريعة */}
      <div className="mx-3 mt-4 p-3 bg-muted/20 rounded-lg border border-border/30 hover:border-primary/20 transition-all duration-200">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xs font-medium text-muted-foreground">ملخص اليوم</h3>
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="grid grid-cols-2 gap-2 text-center mb-3">
          <div className="bg-primary/5 hover:bg-primary/10 rounded p-1.5 transition-colors duration-200 cursor-pointer">
            <p className="text-xs text-muted-foreground">المبيعات</p>
            <p className="text-sm font-bold text-primary">12,450 د.ج</p>
          </div>
          <div className="bg-primary/5 hover:bg-primary/10 rounded p-1.5 transition-colors duration-200 cursor-pointer">
            <p className="text-xs text-muted-foreground">الطلبات</p>
            <p className="text-sm font-bold text-primary">24</p>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">هذا الشهر</p>
          <p className="text-sm font-bold text-primary">12,450 د.ج</p>
        </div>
        
        {/* زر تسجيل الخروج */}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full flex items-center justify-center gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-all duration-200"
          onClick={handleLogout}
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="text-xs">تسجيل الخروج</span>
        </Button>
      </div>
      
      {/* شريط الإصدار والمعلومات */}
      <div className="text-center py-3 px-3 text-xs text-muted-foreground mt-2">
        <p>stockiha v1.0</p>
        <p>© {new Date().getFullYear()} جميع الحقوق محفوظة</p>
      </div>
    </div>
  );
};

export default SideMenu;
