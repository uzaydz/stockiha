import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { checkUserPermissions } from '@/lib/api/permissions';
import DataReadyWrapper from '@/components/common/DataReadyWrapper';
import { useIsAppEnabled } from '@/context/SuperUnifiedDataContext';
import { 
  Store,
  Package,
  Database,
  Wrench,
  Calendar,
  Tag,
  DollarSign,
  ShoppingBag,
  FileText,
  Truck,
  Users,
  User,
  Receipt,
  FileBarChart,
  BarChart3,
  Phone,
  Settings,
  Building,
  ShoppingCart
} from 'lucide-react';

// بيانات ثابتة للروابط السريعة (لا تحتاج API calls)
const quickAccessPages = [
  {
    title: 'نقطة البيع',
    icon: Store,
    href: '/dashboard/pos-advanced',
    color: 'bg-blue-500',
    description: 'إدارة المبيعات والمدفوعات',
    appId: 'pos'
  },
  {
    title: 'المنتجات',
    icon: Package,
    href: '/dashboard/products',
    color: 'bg-purple-500',
    description: 'إدارة المنتجات والعروض'
  },
  {
    title: 'المخزون',
    icon: Database,
    href: '/dashboard/inventory',
    color: 'bg-yellow-500',
    description: 'متابعة المخزون والكميات',
    requiredPermission: 'viewInventory'
  },
  {
    title: 'الخدمات',
    icon: Wrench,
    href: '/dashboard/services',
    color: 'bg-green-500',
    description: 'إدارة خدمات الصيانة',
    appId: 'repair-services'
  },
  {
    title: 'متابعة الخدمات',
    icon: Calendar,
    href: '/dashboard/service-tracking',
    color: 'bg-teal-500',
    description: 'جدولة وتتبع الخدمات',
    appId: 'repair-services'
  },
  {
    title: 'الفئات',
    icon: Tag,
    href: '/dashboard/categories',
    color: 'bg-indigo-500',
    description: 'تصنيف المنتجات والخدمات'
  },
  {
    title: 'المبيعات',
    icon: DollarSign,
    href: '/dashboard/sales',
    color: 'bg-emerald-500',
    description: 'متابعة إحصائيات المبيعات'
  },
  {
    title: 'الطلبات',
    icon: ShoppingBag,
    href: '/dashboard/orders',
    color: 'bg-red-500',
    description: 'إدارة طلبات العملاء'
  },
  {
    title: 'الفواتير',
    icon: FileText,
    href: '/dashboard/invoices',
    color: 'bg-orange-500',
    description: 'عرض وطباعة الفواتير'
  },
  {
    title: 'الموردين',
    icon: Truck,
    href: '/dashboard/suppliers',
    color: 'bg-cyan-500',
    description: 'إدارة الموردين والمشتريات'
  },
  {
    title: 'العملاء',
    icon: Users,
    href: '/dashboard/customers',
    color: 'bg-pink-500',
    description: 'إدارة بيانات العملاء'
  },
  {
    title: 'الموظفين',
    icon: User,
    href: '/dashboard/employees',
    color: 'bg-amber-500',
    description: 'إدارة فريق العمل'
  },
  {
    title: 'المصروفات',
    icon: Receipt,
    href: '/dashboard/expenses',
    color: 'bg-lime-500',
    description: 'تسجيل وتتبع المصروفات'
  },

  {
    title: 'التحليلات',
    icon: BarChart3,
    href: '/dashboard/analytics',
    color: 'bg-violet-500',
    description: 'تحليل أداء المبيعات'
  },
  {
    title: 'الفليكسي',
    icon: Phone,
    href: '/dashboard/flexi-management',
    color: 'bg-fuchsia-500',
    description: 'إدارة بطاقات الفليكسي'
  },
  {
    title: 'الإعدادات',
    icon: Settings,
    href: '/dashboard/settings',
    color: 'bg-gray-500',
    description: 'إعدادات النظام'
  },
  {
            title: 'إعدادات المؤسسة (محذوفة)',
        icon: Building,
        href: '#',
    color: 'bg-blue-700',
    description: 'تخصيص بيانات المؤسسة'
  },
  {
    title: 'إعادة شحن الطلبيات',
    icon: ShoppingCart,
    href: '/dashboard/online-orders-recharge',
    color: 'bg-rose-500',
    description: 'إعادة شحن الطلبيات الإلكترونية'
  },
];

interface QuickAccessSectionProps {
  maxItems?: number;
}

// مكون محسن بدون تعقيدات إضافية
const QuickAccessSection: React.FC<QuickAccessSectionProps> = ({ maxItems = 10 }) => {
  return (
    <DataReadyWrapper
      requireUserProfile={true}
      fallback={
        <div className="grid grid-cols-5 sm:grid-cols-5 lg:grid-cols-10 gap-3">
          {Array.from({ length: Math.min(maxItems, 8) }).map((_, index) => (
            <div
              key={index}
              className="flex flex-col items-center p-3 rounded-lg border border-gray-200 animate-pulse"
            >
              <div className="w-8 h-8 bg-gray-300 rounded mb-2"></div>
              <div className="w-16 h-3 bg-gray-300 rounded"></div>
            </div>
          ))}
        </div>
      }
    >
      <QuickAccessContent maxItems={maxItems} />
    </DataReadyWrapper>
  );
};

// مكون المحتوى الفعلي منفصل ومبسط
const QuickAccessContent: React.FC<{ maxItems: number }> = ({ maxItems }) => {
  const { user, userProfile } = useAuth();
  
  // التحقق من تفعيل التطبيقات
  const isPOSEnabled = useIsAppEnabled('pos');
  const isRepairServicesEnabled = useIsAppEnabled('repair-services');

  // تصفية الروابط حسب الصلاحيات والتطبيقات المفعلة
  const filteredPages = React.useMemo(() => {
    if (!user || !userProfile) return [];
    
    return quickAccessPages
      .filter(page => {
        // التحقق من التطبيقات المفعلة أولاً
        if (page.appId === 'pos' && !isPOSEnabled) return false;
        if (page.appId === 'repair-services' && !isRepairServicesEnabled) return false;
        
        // التحقق من الصلاحيات
        if (!page.requiredPermission) return true;
        
        // استخدام userProfile مباشرة
        const userRole = userProfile.role || userProfile.user_metadata?.role;
        const isAdmin = userRole === 'admin' || userRole === 'owner';
        const isOrgAdmin = userProfile.user_metadata?.is_org_admin === true || 
                          ('is_org_admin' in userProfile && userProfile.is_org_admin === true);
        
        // المدراء لديهم صلاحية كاملة
        if (isAdmin || isOrgAdmin) return true;
        
        // فحص الصلاحيات المحددة
        const permissions = ('permissions' in userProfile ? userProfile.permissions : null) || 
                          userProfile.user_metadata?.permissions || {};
        return permissions[page.requiredPermission] === true;
      })
      .slice(0, maxItems);
  }, [user?.id, userProfile?.id, maxItems, isPOSEnabled, isRepairServicesEnabled]);

  return (
    <div className="grid grid-cols-5 sm:grid-cols-5 lg:grid-cols-10 gap-3">
      {filteredPages.map((page, index) => (
        <Link 
          key={index} 
          to={page.href}
          className="group flex flex-col items-center p-2 rounded-lg bg-background/80 border border-border/30 hover:border-primary/20 hover:shadow-sm transition-all duration-200 hover:scale-[1.01] text-center"
          title={page.description}
        >
          <div className={`w-8 h-8 rounded-md ${page.color} text-white flex items-center justify-center mb-1.5 transition-transform duration-200 group-hover:scale-110`}>
            <page.icon className="h-4 w-4" />
          </div>
          <h3 className="text-xs text-muted-foreground group-hover:text-foreground transition-colors truncate w-full">
            {page.title}
          </h3>
        </Link>
      ))}
    </div>
  );
};

export default QuickAccessSection;
