import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ShoppingCart, 
  Package, 
  Users, 
  BarChart3,
  Settings,
  FileText,
  CreditCard,
  Archive
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAction {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

const QuickActions: React.FC = () => {
  const actions: QuickAction[] = [
    {
      title: 'نقطة البيع',
      description: 'بدء عملية بيع جديدة',
      icon: ShoppingCart,
      href: '/dashboard/pos-advanced',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'إدارة المنتجات',
      description: 'إضافة أو تعديل المنتجات',
      icon: Package,
      href: '/products',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'العملاء',
      description: 'إدارة بيانات العملاء',
      icon: Users,
      href: '/customers',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'التقارير',
      description: 'عرض التقارير والإحصائيات',
      icon: BarChart3,
      href: '/reports',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'المدفوعات',
      description: 'إدارة المدفوعات والمعاملات',
      icon: CreditCard,
      href: '/payments',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    {
      title: 'المخزون',
      description: 'إدارة المخزون والمستودعات',
      icon: Archive,
      href: '/inventory',
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: 'التقارير المالية',
      description: 'تقارير مالية مفصلة',
      icon: FileText,
      href: '/financial-reports',
      color: 'text-teal-600',
      bgColor: 'bg-teal-50'
    },
    {
      title: 'الإعدادات',
      description: 'إعدادات النظام العامة',
      icon: Settings,
      href: '/settings',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {actions.map((action, index) => (
        <Card 
          key={index} 
          className="hover:shadow-lg transition-all duration-200 cursor-pointer group hover:scale-105"
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn("p-3 rounded-lg", action.bgColor)}>
                <action.icon className={cn("h-6 w-6", action.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-gray-900 group-hover:text-gray-700">
                  {action.title}
                </h3>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                  {action.description}
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full mt-3 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
              فتح
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default QuickActions;
