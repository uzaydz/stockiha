import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { checkUserPermissions } from '@/lib/api/permissions';
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
  Building
} from 'lucide-react';

// بيانات ثابتة للروابط السريعة (لا تحتاج API calls)
const quickAccessPages = [
  {
    title: 'نقطة البيع',
    icon: Store,
    href: '/dashboard/pos',
    color: 'bg-blue-500',
    description: 'إدارة المبيعات والمدفوعات'
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
    description: 'إدارة خدمات الصيانة'
  },
  {
    title: 'متابعة الخدمات',
    icon: Calendar,
    href: '/dashboard/service-tracking',
    color: 'bg-teal-500',
    description: 'جدولة وتتبع الخدمات'
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
    title: 'التقارير المالية',
    icon: FileBarChart,
    href: '/dashboard/reports',
    color: 'bg-sky-500',
    description: 'تقارير الأرباح والخسائر'
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
    title: 'إعدادات المؤسسة',
    icon: Building,
    href: '/dashboard/organization',
    color: 'bg-blue-700',
    description: 'تخصيص بيانات المؤسسة'
  },
];

interface QuickAccessSectionProps {
  maxItems?: number;
}

const QuickAccessSection: React.FC<QuickAccessSectionProps> = ({ maxItems = 10 }) => {
  const { user } = useAuth();

  // تصفية الروابط حسب الصلاحيات دون API calls
  const filteredPages = quickAccessPages
    .filter(page => !page.requiredPermission || checkUserPermissions(user, page.requiredPermission as any))
    .slice(0, maxItems);

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
