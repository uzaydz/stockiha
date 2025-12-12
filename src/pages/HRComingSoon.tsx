/**
 * 👥 HR Coming Soon Page - صفحة قريباً للموارد البشرية
 * عرض جميع مميزات نظام الموارد البشرية القادمة
 * متوافق مع تصميم نقطة البيع
 */

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import { useTitle } from '@/hooks/useTitle';
import {
  Clock,
  CalendarDays,
  Wallet,
  TrendingUp,
  Users,
  FileText,
  Bell,
  Shield,
  BarChart3,
  Calendar,
  CreditCard,
  Target,
  Award,
  Briefcase,
  Building2,
  ClipboardCheck,
  Timer,
  Receipt,
  UserCheck,
  CalendarClock,
  Smartphone,
  MapPin,
  Fingerprint,
  FileSpreadsheet,
  Banknote,
  Calculator,
  TrendingDown,
  Star,
  Medal,
  CheckCircle2,
  Sparkles,
  Rocket,
  Zap,
  Lock,
} from 'lucide-react';

import { cn } from '@/lib/utils';

interface Feature {
  title: string;
  description: string;
  icon: React.ElementType;
}

interface FeatureCategory {
  id: string;
  title: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  features: Feature[];
}

const HR_FEATURES: FeatureCategory[] = [
  {
    id: 'attendance',
    title: 'الحضور والانصراف',
    icon: Clock,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500',
    features: [
      {
        title: 'تسجيل الحضور الذكي',
        description: 'تسجيل بنقرة واحدة مع تحديد الموقع',
        icon: Fingerprint,
      },
      {
        title: 'تتبع الموقع الجغرافي',
        description: 'التحقق من موقع الموظف الفعلي',
        icon: MapPin,
      },
      {
        title: 'إحصائيات شاملة',
        description: 'تقارير يومية وشهرية مفصلة',
        icon: BarChart3,
      },
      {
        title: 'تنبيهات فورية',
        description: 'إشعارات التأخير والغياب',
        icon: Bell,
      },
      {
        title: 'السجل اليدوي',
        description: 'تسجيل للحالات الاستثنائية',
        icon: ClipboardCheck,
      },
      {
        title: 'تطبيق الجوال',
        description: 'تسجيل من أي مكان',
        icon: Smartphone,
      },
    ],
  },
  {
    id: 'leave',
    title: 'الإجازات',
    icon: CalendarDays,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500',
    features: [
      {
        title: 'طلبات إلكترونية',
        description: 'تقديم ومتابعة الطلبات',
        icon: FileText,
      },
      {
        title: 'أرصدة الإجازات',
        description: 'عرض الرصيد المتبقي',
        icon: Calendar,
      },
      {
        title: 'موافقات متعددة',
        description: 'سير عمل للموافقات',
        icon: UserCheck,
      },
      {
        title: 'تقويم الإجازات',
        description: 'عرض شامل للإجازات',
        icon: CalendarClock,
      },
      {
        title: 'أنواع متعددة',
        description: 'سنوية، مرضية، طارئة',
        icon: ClipboardCheck,
      },
      {
        title: 'التقارير',
        description: 'تقارير تفصيلية',
        icon: FileSpreadsheet,
      },
    ],
  },
  {
    id: 'payroll',
    title: 'الرواتب',
    icon: Wallet,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-500',
    features: [
      {
        title: 'المسير الشهري',
        description: 'حساب الرواتب تلقائياً',
        icon: Calculator,
      },
      {
        title: 'هياكل الرواتب',
        description: 'بدلات وعلاوات مخصصة',
        icon: Banknote,
      },
      {
        title: 'إدارة السلف',
        description: 'طلب وجدولة الأقساط',
        icon: CreditCard,
      },
      {
        title: 'كشوف الرواتب',
        description: 'كشوف تفصيلية',
        icon: Receipt,
      },
      {
        title: 'الخصومات',
        description: 'خصومات ومكافآت',
        icon: TrendingDown,
      },
      {
        title: 'التأمينات',
        description: 'حساب تلقائي',
        icon: Shield,
      },
    ],
  },
  {
    id: 'performance',
    title: 'الأداء',
    icon: TrendingUp,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-500',
    features: [
      {
        title: 'التقييم الدوري',
        description: 'معايير قابلة للتخصيص',
        icon: Star,
      },
      {
        title: 'الأهداف الذكية',
        description: 'نظام SMART',
        icon: Target,
      },
      {
        title: 'تقييم 360°',
        description: 'تقييم شامل',
        icon: Users,
      },
      {
        title: 'خطط التطوير',
        description: 'تحسين الأداء',
        icon: TrendingUp,
      },
      {
        title: 'المكافآت',
        description: 'حوافز مرتبطة بالأداء',
        icon: Award,
      },
      {
        title: 'التقارير',
        description: 'تحليلات الأداء',
        icon: Medal,
      },
    ],
  },
  {
    id: 'employees',
    title: 'الموظفين',
    icon: Users,
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-500',
    features: [
      {
        title: 'ملفات الموظفين',
        description: 'قاعدة بيانات شاملة',
        icon: Briefcase,
      },
      {
        title: 'الهيكل التنظيمي',
        description: 'إدارة الأقسام',
        icon: Building2,
      },
      {
        title: 'الورديات',
        description: 'جدولة العمل',
        icon: Timer,
      },
      {
        title: 'الوثائق',
        description: 'عقود ومستندات',
        icon: FileText,
      },
      {
        title: 'التنبيهات',
        description: 'انتهاء الوثائق',
        icon: Bell,
      },
      {
        title: 'الخدمة الذاتية',
        description: 'بوابة الموظف',
        icon: UserCheck,
      },
    ],
  },
];

const HRComingSoonPage: React.FC = () => {
  useTitle('الموارد البشرية - قريباً');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filteredCategories = activeCategory === 'all'
    ? HR_FEATURES
    : HR_FEATURES.filter(c => c.id === activeCategory);

  const totalFeatures = HR_FEATURES.reduce((acc, cat) => acc + cat.features.length, 0);

  return (
    <POSPureLayout
      connectionStatus="connected"
      isRefreshing={false}
    >
      <div className="min-h-full bg-zinc-50 dark:bg-zinc-950" dir="rtl">
        <header className="bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
          <div className="px-4 sm:px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-zinc-900 dark:text-white">نظام الموارد البشرية</h1>
                  <Badge className="bg-orange-500 text-white border-0 gap-1">
                    <Sparkles className="h-3 w-3" />
                    قريباً
                  </Badge>
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                  نظام متكامل لإدارة الحضور، الإجازات، الرواتب، والأداء
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-500/10 rounded-xl">
                  <Users className="h-4 w-4 text-orange-500" />
                  <span className="text-xs font-medium text-orange-600 dark:text-orange-400 hidden sm:inline">
                    {HR_FEATURES.length} وحدات
                  </span>
                </div>

                <Button
                  size="sm"
                  className="gap-2"
                >
                  <Bell className="h-4 w-4" />
                  <span className="hidden sm:inline">تفعيل الإشعارات</span>
                </Button>
              </div>
            </div>
          </div>

          <div className="px-4 sm:px-6 pb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
                    <Zap className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-zinc-900 dark:text-white">{HR_FEATURES.length}</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">وحدات رئيسية</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
                    <CheckCircle2 className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-zinc-900 dark:text-white">{totalFeatures}+</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">ميزة متقدمة</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
                    <Rocket className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-zinc-900 dark:text-white">100%</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">أتمتة كاملة</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
                    <Lock className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-zinc-900 dark:text-white">آمن</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">حماية البيانات</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="px-4 sm:px-6">
            <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
              <TabsList className="w-full h-auto p-0 bg-transparent">
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide border-t border-zinc-100 dark:border-zinc-800 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-3 pb-3">
                  <TabsTrigger
                    value="all"
                    className={cn(
                      'relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
                      activeCategory === 'all'
                        ? 'bg-orange-500 text-white'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
                    )}
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span>جميع الوحدات</span>
                  </TabsTrigger>
                  {HR_FEATURES.map((category) => {
                    const Icon = category.icon;
                    const isActive = activeCategory === category.id;
                    return (
                      <TabsTrigger
                        key={category.id}
                        value={category.id}
                        className={cn(
                          'relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
                          isActive
                            ? 'bg-orange-500 text-white'
                            : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{category.title}</span>
                      </TabsTrigger>
                    );
                  })}
                </div>
              </TabsList>
            </Tabs>
          </div>
        </header>

        <main className="p-4 sm:p-6">
          <ScrollArea className="h-[calc(100vh-420px)]">
            <div className="space-y-8 pb-6">
            {filteredCategories.map((category) => {
              const CategoryIcon = category.icon;
              return (
                <div key={category.id} className="space-y-4">
                  {/* Category Header */}
                  <div className="flex items-center gap-3 sticky top-0 bg-zinc-50/95 dark:bg-zinc-950/95 backdrop-blur-sm py-2 z-10">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${category.bgColor} shadow-lg`}>
                      <CategoryIcon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold">{category.title}</h3>
                      <p className="text-sm text-muted-foreground">{category.features.length} ميزة</p>
                    </div>
                    <Badge variant="outline" className={category.color}>
                      قيد التطوير
                    </Badge>
                  </div>

                  {/* Features Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {category.features.map((feature, index) => {
                      const FeatureIcon = feature.icon;
                      return (
                        <Card
                          key={index}
                          className="group relative overflow-hidden hover:shadow-md transition-all duration-300 border-border/50 hover:border-primary/30"
                        >
                          <div className={`absolute top-0 right-0 w-20 h-20 ${category.bgColor} opacity-5 rounded-full -translate-y-1/2 translate-x-1/2`} />
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${category.bgColor} shadow-md`}>
                                <FeatureIcon className="h-4 w-4 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">
                                  {feature.title}
                                </h4>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                  {feature.description}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            </div>
          </ScrollArea>

          <Card className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 mt-6">
            <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                  <Rocket className="h-6 w-6 text-zinc-700 dark:text-zinc-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">نعمل على إطلاق النظام قريباً</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">سيتم إشعارك فور إطلاق نظام إدارة الموارد البشرية</p>
                </div>
              </div>
              <Button
                size="lg"
                className="gap-2 whitespace-nowrap"
              >
                <Bell className="h-4 w-4" />
                تفعيل الإشعارات
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    </POSPureLayout>
  );
};

export default HRComingSoonPage;
