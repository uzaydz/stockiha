import { useLocation } from 'react-router-dom';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// استيراد الأنواع والدوال المساعدة
import { SideMenuProps, NavGroup, ACTIVE_GROUP_STORAGE_KEY } from './types';
import { checkPermission } from './utils';

// استيراد المكونات الفرعية
import NavigationGroup from './NavigationGroup';
import NavigationItem from './NavigationItem';

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
  Globe,
  ChevronRight,
  Menu,
  User,
  LogOut,
  Moon,
  Sun,
  ChevronLeft,
  ArrowRightToLine,
  ArrowLeftToLine,
  X
} from 'lucide-react';

const SideMenu = ({ userRole, userPermissions }: SideMenuProps) => {
  const location = useLocation();
  const initialRenderRef = useRef(true);
  const menuIsVisibleRef = useRef(true);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(
    typeof window !== 'undefined' ? localStorage.getItem('darkMode') === 'true' : false
  );
  const [isCollapsed, setIsCollapsed] = useState<boolean>(
    typeof window !== 'undefined' ? localStorage.getItem('sidebarCollapsed') === 'true' : false
  );
  
  // إضافة متغير لحفظ أي قائمة منبثقة مفتوحة حالياً
  const [activePopup, setActivePopup] = useState<string | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  
  // استعادة المجموعة النشطة من التخزين المحلي
  const getInitialActiveGroup = () => {
    try {
      const storedGroup = localStorage.getItem(ACTIVE_GROUP_STORAGE_KEY);
      return storedGroup || 'الرئيسية';
    } catch (e) {
      console.warn('فشل في استرجاع المجموعة النشطة من التخزين المحلي:', e);
      return 'الرئيسية';
    }
  };
  
  const [activeGroup, setActiveGroup] = useState<string | null>(getInitialActiveGroup());
  const [scrolled, setScrolled] = useState(false);
  const { signOut, user, userProfile } = useAuth();
  
  const permissions = userPermissions || {};
  const isAdmin = userRole === 'admin';

  // تبديل وضع الظلام/الضوء
  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('darkMode', String(newMode));
    document.documentElement.classList.toggle('dark', newMode);
  };

  // تبديل حالة طي القائمة الجانبية
  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    
    // تخزين الحالة في localStorage
    localStorage.setItem('sidebarCollapsed', String(newState));
    console.log("SideMenu - تغيير حالة القائمة:", newState ? "مطوية" : "موسعة");
    
    // إغلاق أي قائمة منبثقة مفتوحة عند تغيير حالة الطي
    setActivePopup(null);
  };

  // إغلاق القائمة المنبثقة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        // تحقق من أن النقرة لم تكن على زر المجموعة
        const target = event.target as HTMLElement;
        if (!target.closest('[data-group-button]')) {
          setActivePopup(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // تبديل حالة القائمة المنبثقة مع إغلاق الأخرى
  const togglePopup = (groupName: string) => {
    console.log("تم النقر على المجموعة:", groupName); // سجل للتأكد من أن الوظيفة تعمل
    
    // إذا كانت نفس المجموعة مفتوحة، أغلقها؛ وإلا افتح المجموعة وأغلق الأخرى
    setActivePopup(prev => prev === groupName ? null : groupName);
  };

  // تسجيل حالة القائمة
  useEffect(() => {
    if (initialRenderRef.current) {
      initialRenderRef.current = false;
    }

    // تعيين وضع الظلام إذا كان مخزنًا
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
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
  }, [isDarkMode]);
  
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
  
  // تصفية المجموعات التي يملك المستخدم صلاحيات عرضها
  const filteredNavItems = navItems.filter(group => 
    isAdmin || 
    !group.requiredPermission || 
    checkPermission(group.requiredPermission, permissions)
  );
  
  // تحديد المجموعة التي تحتوي على العنصر النشط
  const currentPath = location.pathname;
  const activeGroupByPath = filteredNavItems.find(group => 
    group.items.some(item => 
      currentPath === item.href || 
          (currentPath.startsWith(item.href + '/') && item.href !== '/dashboard') || 
      (item.href === '/dashboard' && currentPath === '/dashboard')
    )
  );
  
  // إذا لم تكن هناك مجموعة نشطة ولكن هناك مجموعة تحتوي على الصفحة الحالية، قم بتعيينها كمجموعة نشطة
  useEffect(() => {
    if (!activeGroup && activeGroupByPath) {
      setActiveGroup(activeGroupByPath.group);
    }
  }, [activeGroup, activeGroupByPath]);

  // تكوين زر خاص بمجموعة عندما تكون القائمة مطوية
  const renderCollapsedGroupButton = (group: NavGroup, isActive: boolean, hasActiveItem: boolean) => {
    const isPopupActive = activePopup === group.group;
    
    return (
      <motion.button
        data-group-button={group.group}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          togglePopup(group.group);
        }}
        className={cn(
          "w-14 h-14 flex items-center justify-center relative z-10",
          "rounded-lg transition-all duration-300 mx-auto mb-3",
          (isActive || hasActiveItem)
            ? "bg-primary/15 text-primary shadow-sm"
            : isPopupActive
              ? "bg-primary/10 text-foreground"
              : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
        )}
        aria-label={`قائمة ${group.group}`}
        aria-expanded={isPopupActive}
      >
        <group.icon className="w-5 h-5" />
        
        {/* تأثير الضوء عند النقر */}
        {isPopupActive && (
          <motion.div 
            className="absolute inset-0 bg-primary/5 rounded-lg" 
            layoutId="activePopupHighlight"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
        )}
        
        {/* إشارة إلى القائمة النشطة */}
        {(isActive || hasActiveItem) && (
          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full" />
        )}
        
        {/* إشارة إلى وجود شارة */}
        {group.badge && (
          <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-primary/60 rounded-full" />
        )}
      </motion.button>
    );
  };
  
  // استماع للتغييرات في localStorage (مثل التغييرات من الشريط العلوي)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sidebarCollapsed') {
        const newCollapsedState = e.newValue === 'true';
        setIsCollapsed(newCollapsedState);
        console.log('SideMenu - تم اكتشاف تغيير من مكون آخر:', newCollapsedState ? 'مطوية' : 'موسعة');
      }
    };
    
    // للتغييرات من نوافذ أخرى
    window.addEventListener('storage', handleStorageChange);
    
    // استمع أيضًا للتغييرات في نفس النافذة
    const handleInternalChange = () => {
      const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
      setIsCollapsed(isCollapsed);
    };
    
    // استماع لأحداث مخصصة من Layout
    window.addEventListener('sidebar-toggled', handleInternalChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('sidebar-toggled', handleInternalChange);
    };
  }, []);
  
  return (
    <>
      <div 
        id="sidebar-container"
        className={cn(
          "h-screen fixed top-0 right-0 z-20",
          "flex flex-col transition-all duration-300 ease-in-out",
          "bg-sidebar-background overflow-y-auto overflow-x-hidden",
          "shadow-lg border-l border-sidebar-border",
          "sidebar-scrollbar",
          isCollapsed ? "w-20" : "w-72",
          scrolled ? "shadow-md" : ""
        )}
        dir="rtl"
        style={{ width: isCollapsed ? '5rem' : '18rem' }}
      >
        {/* هيدر القائمة - معلومات المستخدم والتبديل */}
        <div className={cn(
          "sticky top-0 z-30 transition-all duration-300",
          "bg-sidebar-background",
          "border-b border-sidebar-border",
          scrolled ? "shadow-sm" : ""
        )}>
          {!isCollapsed ? (
            <div className="flex flex-col">
              {/* القسم العلوي مع اسم المتجر والشعار */}
              <div className="py-4 px-4 flex items-center justify-between border-b border-sidebar-border">
                <h1 className="text-lg font-bold text-primary truncate">
                  {userProfile?.store_name || 'متجر بازار'}
                </h1>
                <button
                  onClick={toggleCollapse}
                  className={cn(
                    "p-2 rounded-lg transition-all duration-300",
                    "bg-primary/5 hover:bg-primary/10 text-primary"
                  )}
                  aria-label="طي القائمة"
                >
                  <ArrowRightToLine className="w-4 h-4" />
                </button>
              </div>
              
              {/* قسم معلومات المستخدم */}
              <div className="p-4 flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-primary/20">
                    {userProfile?.avatar_url ? (
                      <img 
                        src={userProfile.avatar_url} 
                        alt={userProfile?.full_name || 'المستخدم'} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <span className="absolute -bottom-1 -left-1 w-4 h-4 bg-green-500 border-2 border-sidebar-background rounded-full"></span>
                </div>
                <div className="flex flex-col">
                  <p className="text-sm font-medium text-foreground truncate max-w-[170px]">
                    {userProfile?.full_name || user?.email || 'مستخدم المتجر'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate max-w-[170px]">
                    {userRole === 'admin' ? 'مدير المتجر' : 'موظف'}
                  </p>
                </div>
              </div>
              
              {/* شريط أدوات مع أيقونات الوضع المظلم والإعدادات */}
              <div className="px-4 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleDarkMode}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground bg-muted hover:bg-accent transition-colors"
                    aria-label={isDarkMode ? "وضع الضوء" : "وضع الظلام"}
                  >
                    {isDarkMode ? (
                      <Sun className="w-4 h-4" />
                    ) : (
                      <Moon className="w-4 h-4" />
                    )}
                  </button>
                  
                  <button
                    onClick={() => window.location.href = '/dashboard/settings'}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground bg-muted hover:bg-accent transition-colors"
                    aria-label="الإعدادات"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => window.location.href = '/dashboard/notifications'}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground bg-muted hover:bg-accent transition-colors relative"
                    aria-label="الإشعارات"
                  >
                    <Bell className="w-4 h-4" />
                    <span className="absolute -top-1 -left-1 w-3 h-3 bg-red-500 text-[8px] text-white rounded-full flex items-center justify-center">
                      4
                    </span>
                  </button>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-red-500 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                  aria-label="تسجيل الخروج"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 flex flex-col items-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {userProfile?.avatar_url ? (
                    <img 
                      src={userProfile.avatar_url} 
                      alt={userProfile?.full_name || 'المستخدم'} 
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5 text-primary" />
                  )}
                </motion.div>
              </div>
              
              <div className="flex flex-row justify-center space-x-1 space-x-reverse">
                <button
                  onClick={toggleDarkMode}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground bg-muted hover:bg-accent transition-colors"
                  aria-label={isDarkMode ? "وضع الضوء" : "وضع الظلام"}
                >
                  {isDarkMode ? (
                    <Sun className="w-3.5 h-3.5" />
                  ) : (
                    <Moon className="w-3.5 h-3.5" />
                  )}
                </button>
                
                <button
                  onClick={toggleCollapse}
                  className="w-7 h-7 flex items-center justify-center rounded-md bg-primary/5 hover:bg-primary/10 text-primary transition-colors"
                  aria-label="توسيع القائمة"
                >
                  <ArrowLeftToLine className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* شريط جانبي للإشارة عندما تكون القائمة مطوية */}
        {isCollapsed && (
          <div className="absolute top-20 right-0 h-12 w-1 bg-gradient-to-b from-primary/30 via-primary to-primary/30 rounded-l opacity-70" />
        )}

        {/* القسم الرئيسي للقائمة */}
        <nav className={cn(
          "flex-1 transition-all duration-300 ease-in-out",
          isCollapsed ? "px-1 py-3" : "px-2 py-4"
        )}>
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-1"
            >
              {/* عنوان القسم الرئيسي */}
              {!isCollapsed && (
                <div className="px-3 my-2">
                  <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3 flex items-center gap-1">
                    <Menu className="w-3 h-3" />
                    القائمة الرئيسية
                  </h2>
                </div>
              )}

              {/* عناصر القائمة */}
              <div className={isCollapsed ? "space-y-1 mt-2" : "space-y-1"}>
                {filteredNavItems.map((group) => {
            const isGroupActive = activeGroup === group.group;
            const hasActiveItem = group.items.some(item => 
              currentPath === item.href || 
              (currentPath.startsWith(item.href + '/') && item.href !== '/dashboard') || 
              (item.href === '/dashboard' && currentPath === '/dashboard')
            );

                  // عرض أزرار المجموعات في حالة الطي
                  if (isCollapsed) {
                    return (
                      <div key={group.group} className="relative mb-3">
                        {renderCollapsedGroupButton(group, isGroupActive, hasActiveItem)}
                        
                        {/* القائمة المنبثقة للعناصر الفرعية - تظهر عند تفعيلها فقط */}
                        <AnimatePresence>
                          {activePopup === group.group && (
                            <motion.div
                              ref={popupRef}
                              initial={{ opacity: 0, x: -20, scale: 0.95 }}
                              animate={{ opacity: 1, x: 0, scale: 1 }}
                              exit={{ opacity: 0, x: -20, scale: 0.95 }}
                              transition={{ type: "spring", stiffness: 300, damping: 25 }}
                              className={cn(
                                "fixed z-50 right-20 top-auto",
                                "transform -translate-y-1/2",
                                "bg-card rounded-xl",
                                "shadow-xl border border-sidebar-border",
                                "p-3 min-w-64 origin-right",
                                "backdrop-blur-sm"
                              )}
                              style={{
                                // وضع القائمة بجانب الزر مباشرة
                                top: `${(document.querySelector(`[data-group-button="${group.group}"]`) as HTMLElement)?.getBoundingClientRect().top}px`
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-sidebar-border">
                                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                                  <group.icon className="w-4 h-4 ml-1 text-primary" />
                                  {group.group}
                                  {group.badge && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-normal">
                                      {group.badge}
                                    </span>
                                  )}
                                </h3>
                                <button 
                                  onClick={() => setActivePopup(null)}
                                  className="text-muted-foreground hover:text-foreground rounded-full hover:bg-muted p-1"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="space-y-1 py-1 max-h-[calc(100vh-200px)] overflow-y-auto">
                                {group.items
                                  .filter(item => 
                                    isAdmin || 
                                    !item.requiredPermission || 
                                    checkPermission(item.requiredPermission, permissions)
                                  )
                                  .map((item) => {
                                    const isActive =
                                      currentPath === item.href ||
                                      (currentPath.startsWith(item.href + '/') && item.href !== '/dashboard') ||
                                      (item.href === '/dashboard' && currentPath === '/dashboard');
                                    
                                    return (
                                      <NavigationItem
                                        key={`popup-${item.href}-${item.title}`}
                                        item={item}
                                        isActive={isActive}
                                        isInPopup={true}
                                      />
                                    );
                                  })}
                              </div>
                              
                              {/* زر العودة إلى وضع التوسيع */}
                              <div className="mt-3 pt-2 border-t border-sidebar-border">
                                <button
                                  onClick={toggleCollapse}
                                  className="w-full flex items-center justify-center gap-2 p-2 text-xs font-medium text-primary bg-primary/5 hover:bg-primary/10 rounded-md transition-colors"
                                >
                                  <ArrowLeftToLine className="w-3 h-3" />
                                  توسيع القائمة
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  }

                  // عرض المجموعات في الوضع العادي
            return (
              <NavigationGroup
                      key={group.group}
                group={group}
                isAdmin={isAdmin}
                permissions={permissions}
                isGroupActive={isGroupActive}
                hasActiveItem={hasActiveItem}
                currentPath={currentPath}
                toggleGroup={toggleGroup}
                      isCollapsed={isCollapsed}
              />
            );
          })}
      </div>
            </motion.div>
          </AnimatePresence>
        </nav>

        {/* قسم الإعدادات والخروج - يظهر فقط في وضع التوسيع */}
        {!isCollapsed && (
          <>
            {/* خط فاصل قبل قسم الإعدادات */}
            <div className={cn(
              "mx-auto w-full opacity-40",
              "border-t border-sidebar-border",
              "w-[90%]"
            )} />

            {/* قسم الإعدادات والخروج */}
            <div className={cn(
              "border-t border-sidebar-border",
              "bg-muted/50",
              "p-4"
            )}>
              <div className="flex justify-between mb-3">
                <h3 className="text-xs text-muted-foreground font-medium">
                  الاختصارات السريعة
                </h3>
              </div>
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => window.location.href = '/dashboard/pos'}
                  className="flex-1 flex flex-col items-center justify-center gap-1 p-2 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                >
                  <Store className="w-4 h-4" />
                  <span className="text-[10px]">نقطة البيع</span>
                </button>
                
                <button
                  onClick={() => window.location.href = '/dashboard/products/add'}
                  className="flex-1 flex flex-col items-center justify-center gap-1 p-2 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                >
                  <Package className="w-4 h-4" />
                  <span className="text-[10px]">منتج جديد</span>
                </button>
                
                <button
                  onClick={() => window.location.href = '/dashboard/orders/new'}
                  className="flex-1 flex flex-col items-center justify-center gap-1 p-2 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span className="text-[10px]">طلب جديد</span>
                </button>
              </div>
            </div>
          </>
        )}
    </div>

      {/* مؤشر لعرض القائمة المطوية - خارج القائمة */}
      {isCollapsed && (
        <motion.button
          onClick={toggleCollapse}
          className={cn(
            "fixed top-1/2 right-16 z-10 transform -translate-y-1/2",
            "h-9 w-9 rounded-full bg-primary text-primary-foreground shadow-lg",
            "flex items-center justify-center",
            "hover:scale-110 hover:shadow-md",
            "transition-all duration-300 ease-in-out"
          )}
          whileHover={{ scale: 1.1, boxShadow: "0 8px 16px rgba(0, 0, 0, 0.12)" }}
          whileTap={{ scale: 0.95 }}
          title="فتح القائمة"
        >
          <ArrowLeftToLine className="w-3.5 h-3.5" />
        </motion.button>
      )}
    </>
  );
};

export default SideMenu; 