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
      <div className="space-y-6 p-6" dir="rtl">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl blur-lg opacity-40" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl">
                <Users className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">نظام الموارد البشرية</h1>
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 gap-1">
                  <Sparkles className="h-3 w-3" />
                  قريباً
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1">
                نظام متكامل لإدارة الحضور، الإجازات، الرواتب، والأداء
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30 border-blue-200/50 dark:border-blue-800/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 shadow-lg shadow-blue-500/30">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{HR_FEATURES.length}</div>
                  <div className="text-xs text-muted-foreground">وحدات رئيسية</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/50 dark:to-emerald-900/30 border-emerald-200/50 dark:border-emerald-800/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 shadow-lg shadow-emerald-500/30">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalFeatures}+</div>
                  <div className="text-xs text-muted-foreground">ميزة متقدمة</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/50 dark:to-purple-900/30 border-purple-200/50 dark:border-purple-800/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500 shadow-lg shadow-purple-500/30">
                  <Rocket className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">100%</div>
                  <div className="text-xs text-muted-foreground">أتمتة كاملة</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/50 dark:to-orange-900/30 border-orange-200/50 dark:border-orange-800/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 shadow-lg shadow-orange-500/30">
                  <Lock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">آمن</div>
                  <div className="text-xs text-muted-foreground">حماية البيانات</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Category Tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
          <TabsList className="w-full h-auto flex-wrap gap-2 bg-muted/50 p-2 rounded-xl">
            <TabsTrigger
              value="all"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-4"
            >
              <BarChart3 className="h-4 w-4 ml-2" />
              جميع الوحدات
            </TabsTrigger>
            {HR_FEATURES.map((category) => {
              const Icon = category.icon;
              return (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-4"
                >
                  <Icon className="h-4 w-4 ml-2" />
                  {category.title}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {/* Features Content */}
        <ScrollArea className="h-[calc(100vh-420px)]">
          <div className="space-y-8 pb-6">
            {filteredCategories.map((category) => {
              const CategoryIcon = category.icon;
              return (
                <div key={category.id} className="space-y-4">
                  {/* Category Header */}
                  <div className="flex items-center gap-3 sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10">
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

        {/* Bottom CTA */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 border-0">
          <div className="absolute inset-0 bg-grid-white/5" />
          <div className="absolute top-0 left-0 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl" />
          <CardContent className="relative p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-white">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
                <Rocket className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold">نعمل على إطلاق النظام قريباً</h3>
                <p className="text-sm text-white/70">سيتم إشعارك فور إطلاق نظام إدارة الموارد البشرية</p>
              </div>
            </div>
            <Button
              size="lg"
              className="bg-white text-slate-900 hover:bg-white/90 shadow-xl gap-2 whitespace-nowrap"
            >
              <Bell className="h-4 w-4" />
              تفعيل الإشعارات
            </Button>
          </CardContent>
        </Card>
      </div>
    </POSPureLayout>
  );
};

export default HRComingSoonPage;
