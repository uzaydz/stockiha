import { useLocation } from 'react-router-dom';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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
  X,
  GraduationCap,
  BookOpen,
  SlidersHorizontal,
  Palette,
  Tv,
  RotateCcw,
  AlertTriangle,
  Grid3X3,
  Smartphone,
  CreditCard,
  Gamepad2,
  ShoppingCart,
  Activity,
  Zap
} from 'lucide-react';

// استيراد سياق التطبيقات
import { useApps } from '@/context/AppsContext';

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
      return 'الرئيسية';
    }
  };
  
  const [activeGroup, setActiveGroup] = useState<string | null>(getInitialActiveGroup());
  const [scrolled, setScrolled] = useState(false);
  const { signOut, user, userProfile } = useAuth();
  
  // استخدام سياق التطبيقات
  const { isAppEnabled, organizationApps, isLoading } = useApps();
  
  const permissions = userPermissions || {};
  const isAdmin = userRole === 'admin';

  // تحسين isAppEnabled مع memoization لتجنب استدعاءات متكررة
  const enabledApps = useMemo(() => {
    return organizationApps.filter(app => app.is_enabled).map(app => app.app_id);
  }, [organizationApps]);

  // تحسين isAppEnabled function مع cache
  const isAppEnabledMemo = useCallback((appId: string): boolean => {
    return enabledApps.includes(appId);
  }, [enabledApps]);

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

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && activePopup) {
        setActivePopup(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [activePopup]);

  // تبديل حالة القائمة المنبثقة مع إغلاق الأخرى
  const togglePopup = (groupName: string) => {
    
    // إذا كانت نفس المجموعة مفتوحة، أغلقها؛ وإلا افتح المجموعة وأغلق الأخرى
    setActivePopup(prev => {
      const newState = prev === groupName ? null : groupName;
      return newState;
    });
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
      }
    }
  }, [activeGroup]);

  // تتبع التمرير للتأثيرات البصرية - حذف هذه الوظيفة لأن القائمة الجانبية ثابتة الآن
  // إضافة استجابة للتمرير المطلوب في القائمة نفسها
  useEffect(() => {
    const sidebarContent = document.getElementById('sidebar-content');
    if (sidebarContent) {
      const handleScroll = () => {
        if (sidebarContent.scrollTop > 10) {
          setScrolled(true);
        } else {
          setScrolled(false);
        }
      };
      
      sidebarContent.addEventListener('scroll', handleScroll);
      return () => {
        sidebarContent.removeEventListener('scroll', handleScroll);
      };
    }
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
  
  // تعريف عناصر القائمة - محسن مع dependencies مناسبة وlogging محدود
  const navItems: NavGroup[] = useMemo(() => {
    // إزالة logging المفرط في production وإضافة throttling في dev
    if (import.meta.env.DEV) {
      // استخدام throttling للlogging لتجنب spam
      const now = Date.now();
      const lastLogKey = 'sideMenuLastLog';
      const lastLogTime = (window as any)[lastLogKey] || 0;
      
      // Log مرة واحدة كل 3 ثوان فقط
      if (now - lastLogTime > 3000) {
        (window as any)[lastLogKey] = now;
      }
    }
    
    return [
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
      ]
    },
    // إدارة التطبيقات - عنصر مستقل في موقع بارز
    {
      group: 'إدارة التطبيقات',
      icon: Grid3X3,
      requiredPermission: 'manageOrganizationSettings',
      items: [
        {
          title: 'إدارة التطبيقات',
          icon: Grid3X3,
          href: '/dashboard/apps',
          requiredPermission: 'manageOrganizationSettings',
          badge: 'جديد'
        },
      ]
    },
    // مجموعة نظام نقطة البيع - تظهر فقط إذا كان التطبيق مفعّل
    ...(isAppEnabledMemo('pos-system') ? [{
      group: 'نظام نقطة البيع',
      icon: Store,
      requiredPermission: 'accessPOS',
      items: [
        {
          title: 'نقطة البيع',
          icon: Store,
          href: '/dashboard/pos',
          requiredPermission: 'accessPOS',
          badge: null
        },
        {
          title: 'نقطة البيع المتقدمة',
          icon: Zap,
          href: '/dashboard/pos-advanced',
          requiredPermission: 'accessPOS',
          badge: 'جديد'
        },
        {
          title: 'طلبيات نقطة البيع',
          icon: Receipt,
          href: '/dashboard/pos-orders',
          requiredPermission: 'accessPOS',
          badge: null
        },
        {
          title: 'إدارة المديونيات',
          icon: BanknoteIcon,
          href: '/dashboard/customer-debts',
          requiredPermission: 'viewDebts',
          badge: null
        },
        {
          title: 'إرجاع المنتجات',
          icon: RotateCcw,
          href: '/dashboard/returns',
          requiredPermission: 'accessPOS',
          badge: null
        },
        {
          title: 'التصريح بالخسائر',
          icon: AlertTriangle,
          href: '/dashboard/losses',
          requiredPermission: 'accessPOS',
          badge: null
        },
      ]
    }] : []),
    {
      group: 'المنتجات والمخزون',
      icon: Package,
      requiredPermission: 'viewProducts',
      items: [
        {
          title: 'المنتجات',
          icon: Package,
          href: '/dashboard/products',
          requiredPermission: 'viewProducts',
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
        {
          title: 'تتبع المخزون المتقدم',
          icon: Activity,
          href: '/dashboard/inventory-tracking',
          requiredPermission: 'viewInventory',
          badge: 'جديد'
        },
      ]
    },
    // مجموعة الخدمات - تظهر فقط إذا كان هناك تطبيق واحد على الأقل مفعّل
    ...(isAppEnabledMemo('repair-services') || isAppEnabledMemo('subscription-services') ? [{
      group: 'الخدمات',
      icon: Wrench,
      requiredPermission: 'viewServices',
      items: [
        // خدمات التصليح - تظهر فقط إذا كان التطبيق مفعّل
        ...(isAppEnabledMemo('repair-services') ? [{
          title: 'خدمات التصليح',
          icon: SlidersHorizontal,
          href: '/dashboard/repair-services',
          requiredPermission: 'viewServices',
          badge: 'جديد'
        }] : []),
        // خدمات الاشتراكات - تظهر فقط إذا كان التطبيق مفعّل
        ...(isAppEnabledMemo('subscription-services') ? [
          {
            title: 'خدمات الاشتراكات',
            icon: Tv,
            href: '/dashboard/subscription-services',
            requiredPermission: 'viewServices',
            badge: 'جديد'
          }
        ] : []),
      ]
    }] : []),
    // مجموعة فليكسي وعملات رقمية - تظهر فقط إذا كان التطبيق مفعّل
    ...(isAppEnabledMemo('flexi-crypto') ? [{
      group: 'فليكسي وعملات رقمية',
      icon: Smartphone,
      requiredPermission: 'viewFlexiCrypto',
      items: [
        {
          title: 'إدارة الرصيد',
          icon: Wallet,
          href: '/dashboard/flexi-management',
          requiredPermission: 'manageFlexiBalance',
          badge: null
        },
        {
          title: 'بيع الفليكسي والعملات',
          icon: CreditCard,
          href: '/dashboard/flexi-sales',
          requiredPermission: 'sellFlexiCrypto',
          badge: null
        },
        {
          title: 'تحليلات المبيعات',
          icon: BarChart3,
          href: '/dashboard/flexi-analytics',
          requiredPermission: 'viewFlexiAnalytics',
          badge: null
        },
      ]
    }] : []),
    // مجموعة إدارة مركز الاتصال - تظهر فقط إذا كان التطبيق مفعّل
    ...(isAppEnabledMemo('call-center') ? [{
      group: 'إدارة مركز الاتصال',
      icon: Phone,
      requiredPermission: 'manageOrganizationSettings',
      items: [
        {
          title: 'إدارة الوكلاء',
          icon: Users,
          href: '/dashboard/call-center/agents',
          requiredPermission: 'manageOrganizationSettings',
          badge: 'جديد'
        },
        {
          title: 'إعدادات التوزيع',
          icon: SlidersHorizontal,
          href: '/dashboard/call-center/distribution',
          requiredPermission: 'manageOrganizationSettings',
          badge: 'جديد'
        },
        {
          title: 'التقارير',
          icon: FileBarChart,
          href: '/dashboard/call-center/reports',
          requiredPermission: 'manageOrganizationSettings',
          badge: 'جديد'
        },
        {
          title: 'المراقبة المباشرة',
          icon: BarChart3,
          href: '/dashboard/call-center/monitoring',
          requiredPermission: 'manageOrganizationSettings',
          badge: 'جديد'
        },
      ]
    }] : []),
    // مجموعة تطبيق تحميل الألعاب - تظهر فقط إذا كان التطبيق مفعّل
    ...(isAppEnabledMemo('game-downloads') ? [{
      group: 'تحميل الألعاب',
      icon: Gamepad2,
      requiredPermission: 'manageGameDownloads',
      items: [
        {
          title: 'إدارة تحميل الألعاب',
          icon: Gamepad2,
          href: '/dashboard/game-downloads',
          requiredPermission: 'manageGameDownloads',
          badge: 'جديد'
        },
      ]
    }] : []),
    {
      group: 'المبيعات والطلبات',
      icon: ShoppingBag,
      requiredPermission: 'viewOrders',
      items: [
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
          title: 'المبيعات',
          icon: DollarSign,
          href: '/dashboard/sales',
          requiredPermission: 'viewSalesReports',
          badge: null
        },
        {
          title: 'الفواتير',
          icon: FileText,
          href: '/dashboard/invoices',
          requiredPermission: 'viewOrders',
          badge: null
        },
      ]
    },
    {
      group: 'العملاء',
      icon: Users,
      requiredPermission: 'viewCustomers',
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
      ]
    },
    {
      group: 'التقارير والتحليلات',
      icon: BarChart3,
      requiredPermission: 'viewReports',
      items: [
        {
          title: 'التحليلات المالية الشاملة',
          icon: Activity,
          href: '/dashboard/financial-analytics',
          requiredPermission: 'viewFinancialReports',
          badge: 'جديد'
        },
        {
          title: 'التقارير المالية',
          icon: BarChart3,
          href: '/dashboard/reports',
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
        {
          title: 'المصروفات',
          icon: DollarSign,
          href: '/dashboard/expenses',
          requiredPermission: 'viewFinancialReports',
          badge: null
        },
        {
          title: 'تقارير الموردين',
          icon: FileBarChart,
          href: '/dashboard/suppliers/reports',
          requiredPermission: 'viewReports',
          badge: null
        },
      ]
    },
    {
      group: 'الموظفين والصلاحيات',
      icon: Users,
      requiredPermission: 'viewEmployees',
      items: [
        {
          title: 'الموظفين',
          icon: Users,
          href: '/dashboard/employees',
          requiredPermission: 'viewEmployees',
          badge: null
        },
        {
          title: 'تقسيم الطلبيات',
          icon: LayoutDashboard,
          href: '/dashboard/order-distribution',
          requiredPermission: 'manageEmployees',
          badge: 'جديد'
        },
      ]
    },
    {
      group: 'دورات سطوكيها',
      icon: GraduationCap,
      requiredPermission: null,
      badge: 'قريباً',
      items: [
        {
          title: 'دورة التسويق الإلكتروني',
          icon: BookOpen,
          href: '/dashboard/courses/digital-marketing',
          requiredPermission: null,
          badge: 'جديد'
        },
        {
          title: 'دورة التسويق عبر التيك توك',
          icon: BookOpen,
          href: '/dashboard/courses/tiktok-marketing',
          requiredPermission: null,
          badge: 'جديد'
        },
        {
          title: 'دورة صنع متجر إلكتروني',
          icon: BookOpen,
          href: '/dashboard/courses/e-commerce-store',
          requiredPermission: null,
          badge: 'جديد'
        },
        {
          title: 'دورة التجارة الإلكترونية',
          icon: BookOpen,
          href: '/dashboard/courses/e-commerce',
          requiredPermission: null,
          badge: 'جديد'
        },
      ]
    },
    {
      group: 'إعدادات المتجر',
      icon: Store,
      requiredPermission: 'manageOrganizationSettings',
      items: [
        {
          title: 'تخصيص المتجر',
          icon: Store,
          href: '/dashboard/store-editor',
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
          title: 'إدارة التوصيل',
          icon: Truck,
          href: '/dashboard/delivery',
          requiredPermission: 'manageOrganizationSettings',
          badge: 'جديد'
        },
      ]
    },
    {
      group: 'الإعدادات العامة',
      icon: Settings,
      requiredPermission: null,
      items: [
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
          title: 'النطاقات المخصصة',
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
    ];
  }, [enabledApps, isAppEnabledMemo]);
  
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
        onMouseDown={(e) => {
          e.preventDefault(); // منع أي تداخل
        }}
        className={cn(
          "w-14 h-14 flex items-center justify-center relative z-10 group",
          "rounded-xl transition-all duration-300 mx-auto mb-3",
          "border-2 shadow-sm cursor-pointer select-none",
          (isActive || hasActiveItem)
            ? "bg-primary/15 border-primary/40 text-primary shadow-primary/10"
            : isPopupActive
              ? "bg-primary/10 border-primary/30 text-primary/90 shadow-md scale-105"
              : "bg-card border-border text-muted-foreground hover:bg-primary/5 hover:border-primary/25 hover:text-primary/80 hover:shadow-md"
        )}
        aria-label={`قائمة ${group.group}`}
        aria-expanded={isPopupActive}
        type="button"
      >
        <group.icon className="w-5 h-5 transition-transform group-hover:scale-110 pointer-events-none" />
        
        {/* إشارة إلى القائمة النشطة */}
        {(isActive || hasActiveItem) && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-sidebar-background pointer-events-none" />
        )}
        
        {/* إشارة إلى وجود شارة */}
        {group.badge && (
          <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-sidebar-background animate-pulse pointer-events-none" />
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
          "h-full",
          "bg-sidebar-background text-sidebar-foreground",
          "flex flex-col",
          "transition-all duration-300",
          "shadow-md",
          isCollapsed 
            ? "w-20" 
            : "w-72"
        )}
        dir="rtl"
      >
        {/* هيدر القائمة - معلومات المستخدم والتبديل */}
        <div className={cn(
          "transition-all duration-300 relative sticky top-0 z-10",
          "bg-gradient-to-r from-primary/5 via-transparent to-primary/5",
          "border-b border-sidebar-border/30 backdrop-blur-sm",
          "before:absolute before:inset-0 before:bg-gradient-to-b before:from-transparent before:to-sidebar-background/20 before:pointer-events-none"
        )}>
          {!isCollapsed ? (
            <div className="flex flex-col relative z-10">
              {/* القسم العلوي مع اسم المتجر والشعار */}
              <div className="py-5 px-5 flex items-center justify-between border-b border-sidebar-border/20">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Store className="w-4 h-4 text-primary" />
                  </div>
                  <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent truncate">
                    {userProfile?.store_name || 'متجر بازار'}
                  </h1>
                </div>
                <button
                  onClick={toggleCollapse}
                  className={cn(
                    "p-2.5 rounded-xl transition-all duration-300 group",
                    "bg-primary/5 hover:bg-primary/10 border border-primary/10 hover:border-primary/20",
                    "text-primary hover:text-primary/80 hover:scale-105"
                  )}
                  aria-label="طي القائمة"
                >
                  <ArrowRightToLine className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
              
              {/* قسم معلومات المستخدم */}
              <div className="p-5 flex items-center gap-4">
                <div className="relative">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center overflow-hidden border-2 border-primary/20 shadow-sm">
                    {userProfile?.avatar_url ? (
                      <img 
                        src={userProfile.avatar_url} 
                        alt={userProfile?.full_name || 'المستخدم'} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-7 h-7 text-primary" />
                    )}
                  </div>
                  <span className="absolute -bottom-1 -left-1 w-5 h-5 bg-gradient-to-r from-green-400 to-green-500 border-2 border-sidebar-background rounded-full shadow-sm animate-pulse"></span>
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {userProfile?.full_name || user?.email || 'مستخدم المتجر'}
                  </p>
                  <span className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      userRole === 'admin' ? "bg-primary" : "bg-blue-500"
                    )}></div>
                    {userRole === 'admin' ? 'مدير المتجر' : 'موظف'}
                  </span>
                </div>
              </div>
              
              {/* شريط أدوات مع أيقونات الوضع المظلم والإعدادات */}
              <div className="px-5 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleDarkMode}
                    className={cn(
                      "p-2.5 rounded-xl transition-all duration-300 group",
                      "bg-muted/50 hover:bg-accent border border-muted hover:border-accent",
                      "text-muted-foreground hover:text-foreground hover:scale-105"
                    )}
                    aria-label={isDarkMode ? "وضع الضوء" : "وضع الظلام"}
                  >
                    {isDarkMode ? (
                      <Sun className="w-4 h-4 transition-transform group-hover:rotate-180" />
                    ) : (
                      <Moon className="w-4 h-4 transition-transform group-hover:-rotate-12" />
                    )}
                  </button>
                  
                  <button
                    onClick={() => window.location.href = '/dashboard/settings'}
                    className={cn(
                      "p-2.5 rounded-xl transition-all duration-300 group",
                      "bg-muted/50 hover:bg-accent border border-muted hover:border-accent",
                      "text-muted-foreground hover:text-foreground hover:scale-105"
                    )}
                    aria-label="الإعدادات"
                  >
                    <Settings className="w-4 h-4 transition-transform group-hover:rotate-90" />
                  </button>
                </div>
                
                <button
                  onClick={handleLogout}
                  className={cn(
                    "p-2.5 rounded-xl transition-all duration-300 group",
                    "bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30",
                    "border border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700",
                    "text-red-500 hover:text-red-600 hover:scale-105"
                  )}
                  aria-label="تسجيل الخروج"
                >
                  <LogOut className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 flex flex-col items-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shadow-sm border border-primary/20">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                >
                  {userProfile?.avatar_url ? (
                    <img 
                      src={userProfile.avatar_url} 
                      alt={userProfile?.full_name || 'المستخدم'} 
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6 text-primary" />
                  )}
                </motion.div>
              </div>
              
              <div className="flex flex-row justify-center space-x-2 space-x-reverse">
                <button
                  onClick={toggleDarkMode}
                  className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-300 group",
                    "bg-muted/50 hover:bg-accent border border-muted hover:border-accent",
                    "text-muted-foreground hover:text-foreground hover:scale-110"
                  )}
                  aria-label={isDarkMode ? "وضع الضوء" : "وضع الظلام"}
                >
                  {isDarkMode ? (
                    <Sun className="w-3.5 h-3.5 transition-transform group-hover:rotate-180" />
                  ) : (
                    <Moon className="w-3.5 h-3.5 transition-transform group-hover:-rotate-12" />
                  )}
                </button>
                
                <button
                  onClick={toggleCollapse}
                  className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-300 group",
                    "bg-primary/10 hover:bg-primary/15 border border-primary/20 hover:border-primary/30",
                    "text-primary hover:text-primary/80 hover:scale-110"
                  )}
                  aria-label="توسيع القائمة"
                >
                  <ArrowLeftToLine className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* إضافة حدود مرئية عند طي القائمة */}
        {isCollapsed && (
          <div className="absolute top-28 right-0 h-12 w-1 bg-primary/60 rounded-l opacity-80" />
        )}

        {/* القسم الرئيسي للقائمة */}
        <nav 
          id="sidebar-content"
          className={cn(
            "flex-1 transition-all duration-300 ease-in-out overflow-y-auto sidebar-scrollbar",
            "h-[calc(100vh-14rem)]", // ارتفاع مناسب بعد خصم الهيدر والفوتر
            isCollapsed ? "px-2 py-4" : "px-3 py-5"
          )}
        >
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="space-y-2"
            >
              {/* عنوان القسم الرئيسي */}
              {!isCollapsed && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="px-4 my-3"
                >
                  <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-4 flex items-center gap-2">
                    <Menu className="w-3 h-3 text-primary" />
                    القائمة الرئيسية
                  </h2>
                </motion.div>
              )}

              {/* عناصر القائمة */}
              <div className={cn(
                "transition-all duration-300",
                isCollapsed ? "space-y-2 mt-3" : "space-y-1.5"
              )}>
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
                        
                        {/* القائمة المنبثقة للعناصر الفرعية */}
                        <AnimatePresence>
                          {(() => {
                            const shouldShowPopup = activePopup === group.group;
                            
                            if (shouldShowPopup) {
                            }
                            
                            return shouldShowPopup ? (
                              <motion.div
                                ref={popupRef}
                                initial={{ opacity: 0, scale: 0.95, x: 20 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.95, x: 20 }}
                                transition={{
                                  type: "spring",
                                  stiffness: 300,
                                  damping: 25,
                                  duration: 0.3
                                }}
                                className={cn(
                                  "fixed z-[9999] right-20 min-w-64 max-w-80",
                                  "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
                                  "rounded-xl shadow-2xl",
                                  "p-4"
                                )}
                                style={{
                                  top: `${Math.min(window.innerHeight - 400, Math.max(100, (window.innerHeight / 2) - 150))}px`,
                                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* مؤشر السهم */}
                                <motion.div 
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: 0.1 }}
                                  className="absolute right-[-8px] top-6 w-4 h-4 bg-white dark:bg-gray-800 border-r border-t border-gray-200 dark:border-gray-700 transform rotate-45 rounded-sm"
                                />
                                
                                <motion.div 
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.1 }}
                                  className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200 dark:border-gray-600"
                                >
                                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <motion.div 
                                      whileHover={{ scale: 1.1, rotate: 5 }}
                                      className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center"
                                    >
                                      <group.icon className="w-3.5 h-3.5 text-primary" />
                                    </motion.div>
                                    {group.group}
                                    {group.badge && (
                                      <motion.span 
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.2, type: "spring" }}
                                        className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary font-medium"
                                      >
                                        {group.badge}
                                      </motion.span>
                                    )}
                                  </h3>
                                  <motion.button 
                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setActivePopup(null)}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 p-1.5 transition-colors"
                                  >
                                    <X className="w-4 h-4" />
                                  </motion.button>
                                </motion.div>
                                
                                <motion.div 
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: 0.2 }}
                                  className="space-y-1 py-1 max-h-[calc(100vh-300px)] overflow-y-auto"
                                >
                                  {group.items
                                    .filter(item => 
                                      isAdmin || 
                                      !item.requiredPermission || 
                                      checkPermission(item.requiredPermission, permissions)
                                    )
                                    .map((item, index) => {
                                      const isActive =
                                        currentPath === item.href ||
                                        (currentPath.startsWith(item.href + '/') && item.href !== '/dashboard') ||
                                        (item.href === '/dashboard' && currentPath === '/dashboard');
                                      
                                      return (
                                        <motion.div
                                          key={`popup-${item.href}-${item.title}`}
                                          initial={{ opacity: 0, x: -20 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          transition={{ 
                                            delay: 0.3 + (index * 0.05),
                                            type: "spring",
                                            stiffness: 300,
                                            damping: 25
                                          }}
                                        >
                                          <NavigationItem
                                            item={item}
                                            isActive={isActive}
                                            isInPopup={true}
                                          />
                                        </motion.div>
                                      );
                                    })}
                                </motion.div>
                                
                                {/* زر العودة إلى وضع التوسيع */}
                                <motion.div 
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.4 }}
                                  className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600"
                                >
                                  <motion.button
                                    whileHover={{ scale: 1.02, backgroundColor: "var(--primary)/15" }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={toggleCollapse}
                                    className="w-full flex items-center justify-center gap-2 p-2.5 text-xs font-medium text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors"
                                  >
                                    <ArrowLeftToLine className="w-3.5 h-3.5" />
                                    توسيع القائمة
                                  </motion.button>
                                </motion.div>
                              </motion.div>
                            ) : null;
                          })()}
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
            <div className="mx-5 border-t border-gradient-to-r from-transparent via-sidebar-border/60 to-transparent opacity-60" />
          </>
        )}
      </div>

      {/* مؤشر لعرض القائمة المطوية - خارج القائمة */}
      {isCollapsed && (
        <motion.button
          onClick={toggleCollapse}
          className={cn(
            "fixed top-1/2 right-[5.5rem] z-10 transform -translate-y-1/2",
            "h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-lg",
            "flex items-center justify-center",
            "hover:scale-110 hover:shadow-xl",
            "transition-all duration-300 ease-in-out"
          )}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          title="فتح القائمة"
        >
          <ArrowLeftToLine className="w-4 h-4" />
        </motion.button>
      )}

      {/* Overlay للقائمة المنبثقة */}
      {isCollapsed && activePopup && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/20 z-[9998]"
          onClick={() => setActivePopup(null)}
        />
      )}
    </>
  );
};

export default SideMenu;
