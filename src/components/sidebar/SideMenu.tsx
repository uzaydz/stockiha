import { useLocation } from 'react-router-dom';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

// استيراد الأنواع والدوال المساعدة
import { SideMenuProps, NavGroup, ACTIVE_GROUP_STORAGE_KEY } from './types';
import { checkPermission } from './utils';

// استيراد المكونات الفرعية
import SideMenuHeader from './SideMenuHeader';
import UserProfileCard from './UserProfileCard';
import NavigationGroup from './NavigationGroup';
import SideMenuFooter from './SideMenuFooter';
import VersionInfo from './VersionInfo';

// استيراد الأيقونات
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
  Home,
  Building,
  FileBarChart,
  Receipt,
  Phone,
  Wallet,
  BanknoteIcon,
  Server,
  Layout,
  Globe
} from 'lucide-react';

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
      
      return newState;
    });
  }, []);

  // منع اختفاء القائمة عند العودة من التبويب
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        
        
        // إعادة تأكيد رؤية القائمة الجانبية
        const sidebarElement = document.getElementById('sidebar-container');
        if (sidebarElement && window.getComputedStyle(sidebarElement).display === 'none') {
          
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
  
  // تعريف عناصر القائمة
  const navItems: NavGroup[] = [
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
          title: 'الطلبات المتروكة',
          icon: ShoppingBag,
          href: '/dashboard/abandoned-orders',
          requiredPermission: 'viewOrders',
          badge: 'جديد'
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
      group: 'النطاقات المخصصة',
      icon: Globe,
      requiredPermission: 'manageOrganizationSettings',
      items: [
        {
          title: 'إعداد النطاقات',
          icon: Globe,
          href: '/dashboard/custom-domains',
          requiredPermission: 'manageOrganizationSettings',
          badge: 'جديد'
        },
        {
          title: 'دليل النطاقات',
          icon: FileText,
          href: '/docs/custom-domains',
          requiredPermission: 'manageOrganizationSettings',
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
          title: 'خدمات التوصيل',
          icon: Truck,
          href: '/dashboard/shipping-settings',
          requiredPermission: 'manageOrganizationSettings',
          badge: 'جديد'
        },
        {
          title: 'إعدادات النماذج',
          icon: FileText,
          href: '/dashboard/form-settings',
          requiredPermission: 'manageOrganizationSettings',
          badge: 'جديد'
        },
        {
          title: 'إعدادات صفحة الشكر',
          icon: FileText,
          href: '/dashboard/thank-you-editor',
          requiredPermission: 'manageOrganizationSettings',
          badge: 'جديد'
        },
        {
          title: 'صفحات الهبوط',
          icon: Layout,
          href: '/dashboard/landing-pages',
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
      
      setActiveGroup(currentGroup);
    }
  }, [currentPath]);
  
  return (
    <div id="sidebar-container" className="w-64 h-full overflow-y-auto overflow-x-hidden bg-card/95 backdrop-blur-sm transition-all duration-300 border-l border-border/10 shadow-xl scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
      {/* رأس القائمة الجانبية */}
      <SideMenuHeader isAdmin={isAdmin} scrolled={scrolled} />
      
      {/* قسم المستخدم */}
      <UserProfileCard isAdmin={isAdmin} email={user?.email} />
      
      {/* القائمة والمجموعات */}
      <div className="space-y-1 px-3 pt-1 pb-4">
        {navItems
          .filter(group => 
              isAdmin || // إظهار المجموعة للمسؤول
              !group.requiredPermission || 
              checkPermission(group.requiredPermission, permissions)
          )
          .map((group, groupIndex) => {
            // تحسين منطق تحديد وجود عنصر نشط داخل المجموعة
            const isGroupActive = activeGroup === group.group;
            const hasActiveItem = group.items.some(item => 
              currentPath === item.href || 
              (currentPath.startsWith(item.href + '/') && item.href !== '/dashboard') || 
              (item.href === '/dashboard' && currentPath === '/dashboard')
            );

            return (
              <NavigationGroup
                key={groupIndex}
                group={group}
                isAdmin={isAdmin}
                permissions={permissions}
                isGroupActive={isGroupActive}
                hasActiveItem={hasActiveItem}
                currentPath={currentPath}
                toggleGroup={toggleGroup}
              />
            );
          })}
      </div>
      
      {/* تذييل القائمة */}
      <SideMenuFooter handleLogout={handleLogout} />
      
      {/* شريط الإصدار والمعلومات */}
      <div className="text-center py-4 px-3 mt-1">
        <VersionInfo version="1.0" />
      </div>
    </div>
  );
};

export default SideMenu; 