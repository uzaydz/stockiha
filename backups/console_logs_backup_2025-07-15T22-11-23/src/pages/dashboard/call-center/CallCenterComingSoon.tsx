import React from 'react';
import { motion } from 'framer-motion';
import { 
  Phone, 
  Users, 
  BarChart3, 
  Clock, 
  Headphones, 
  MessageSquare, 
  Settings, 
  Target,
  Zap,
  Shield,
  Calendar,
  FileText,
  Bell,
  Sparkles,
  ArrowRight,
  CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Layout from '@/components/Layout';
import { Helmet } from 'react-helmet-async';

const CallCenterComingSoon: React.FC = () => {
  const features = [
    {
      icon: Phone,
      title: 'إدارة المكالمات الذكية',
      description: 'نظام توزيع تلقائي للمكالمات حسب التخصص والحمولة',
      color: 'from-blue-500 to-cyan-500',
      benefits: ['توزيع ذكي للمكالمات', 'تسجيل تلقائي للمحادثات', 'تتبع أوقات الاستجابة']
    },
    {
      icon: Users,
      title: 'تقسيم الطلبات المتقدم',
      description: 'نظام ذكي لتوزيع الطلبات تلقائياً حسب معايير متعددة لضمان أفضل أداء وخدمة',
      color: 'from-emerald-500 to-teal-500',
      benefits: [
        'تقسيم حسب المنطقة الجغرافية والمحافظة',
        'أولوية حسب قيمة الطلب ونوع العميل',
        'توزيع عادل بين الوكلاء حسب الحمولة',
        'تخصيص وكلاء حسب خبرتهم في المنتجات',
        'إعادة توزيع تلقائية في حالة عدم الرد',
        'نظام نقاط لتحفيز الأداء المتميز'
      ]
    },
    {
      icon: BarChart3,
      title: 'تحليلات الأداء الشاملة',
      description: 'مؤشرات أداء مفصلة لكل وكيل وفريق',
      color: 'from-purple-500 to-indigo-500',
      benefits: ['معدل نجاح المكالمات', 'متوسط وقت المعالجة', 'رضا العملاء']
    },
    {
      icon: MessageSquare,
      title: 'تكامل واتساب للأعمال',
      description: 'إرسال واستقبال رسائل واتساب مباشرة من النظام',
      color: 'from-green-500 to-emerald-500',
      benefits: ['رسائل تلقائية للعملاء', 'تتبع حالة الطلبات', 'دعم الوسائط المتعددة']
    },
    {
      icon: Target,
      title: 'إدارة الأهداف والحوافز',
      description: 'نظام أهداف ذكي مع حوافز تلقائية',
      color: 'from-orange-500 to-red-500',
      benefits: ['أهداف شخصية وجماعية', 'حوافز تلقائية', 'مسابقات شهرية']
    },
    {
      icon: Shield,
      title: 'مراقبة الجودة',
      description: 'تسجيل وتقييم المكالمات لضمان أعلى جودة خدمة',
      color: 'from-pink-500 to-rose-500',
      benefits: ['تسجيل تلقائي للمكالمات', 'تقييم الأداء', 'تدريب مستمر']
    }
  ];

  const upcomingFeatures = [
    'تقسيم ذكي للطلبات حسب التخصص والخبرة',
    'ذكاء اصطناعي لتحليل مشاعر العملاء',
    'روبوت محادثة ذكي للإجابة على الاستفسارات الأساسية',
    'تكامل مع منصات التواصل الاجتماعي',
    'نظام تذاكر الدعم الفني المتقدم',
    'تقارير تنبؤية لتوقع أحجام المكالمات',
    'نظام التدريب التفاعلي للوكلاء الجدد',
    'تقسيم الطلبات حسب أولوية العملاء VIP',
    'نظام مكافآت تلقائية للأداء المتميز'
  ];

  return (
    <Layout>
      <Helmet>
        <title>مركز الاتصالات - قريباً | سطوكيها</title>
      </Helmet>
      
      <div className="space-y-6" dir="rtl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col gap-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                  <Phone className="h-6 w-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                  <Sparkles className="h-2 w-2 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">مركز الاتصالات المتقدم</h1>
                <p className="text-muted-foreground">
                  نظام شامل لإدارة مراكز الاتصالات مع ميزات متقدمة لتحسين الأداء وزيادة رضا العملاء
                </p>
              </div>
            </div>
            
            <Badge className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
              <Clock className="w-4 h-4 ml-2" />
              قريباً - الربع الأول 2025
            </Badge>
          </div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card className="h-full hover:shadow-lg transition-all duration-300 border-border/50">
                <CardHeader className="pb-4">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4`}>
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-lg font-bold">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4 leading-relaxed">
                    {feature.description}
                  </p>
                  <div className="space-y-2">
                    {feature.benefits.map((benefit, idx) => (
                      <div key={idx} className="flex items-center text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 ml-2 flex-shrink-0" />
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Upcoming Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <Card className="border-0 bg-gradient-to-r from-indigo-500 to-purple-600 text-white dark:from-indigo-600 dark:to-purple-700">
            <CardHeader>
              <CardTitle className="text-2xl font-bold flex items-center text-white">
                <Zap className="h-6 w-6 ml-3" />
                المميزات القادمة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingFeatures.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                    className="flex items-center"
                  >
                    <ArrowRight className="h-4 w-4 ml-2 text-blue-200" />
                    <span className="text-blue-100">{feature}</span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-center"
        >
          <Card className="border-border/50">
            <CardContent className="py-12">
              <h3 className="text-2xl font-bold mb-4">
                كن من أول المستخدمين
              </h3>
              <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                سجل اهتمامك الآن للحصول على إشعار فور إطلاق مركز الاتصالات وكن من أول المستفيدين من هذه التقنية المتقدمة
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 px-8"
                >
                  <Bell className="h-5 w-5 ml-2" />
                  تنبيهني عند الإطلاق
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="px-8"
                >
                  <FileText className="h-5 w-5 ml-2" />
                  اطلب عرض تجريبي
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-center flex items-center justify-center">
                <Calendar className="h-5 w-5 ml-2" />
                خريطة الطريق
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto rounded-full bg-green-500 flex items-center justify-center mb-3">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="font-bold text-green-700 dark:text-green-400 mb-2">المرحلة الأولى</h4>
                  <p className="text-sm text-muted-foreground">النواة الأساسية وإدارة الوكلاء</p>
                  <Badge variant="secondary" className="mt-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">مكتملة</Badge>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto rounded-full bg-blue-500 flex items-center justify-center mb-3">
                    <Settings className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="font-bold text-blue-700 dark:text-blue-400 mb-2">المرحلة الثانية</h4>
                  <p className="text-sm text-muted-foreground">تقسيم الطلبات والتحليلات</p>
                  <Badge variant="secondary" className="mt-2 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">قيد التطوير</Badge>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto rounded-full bg-purple-500 flex items-center justify-center mb-3">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="font-bold text-purple-700 dark:text-purple-400 mb-2">المرحلة الثالثة</h4>
                  <p className="text-sm text-muted-foreground">الذكاء الاصطناعي والتكامل</p>
                  <Badge variant="secondary" className="mt-2 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">مخطط لها</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
};

export default CallCenterComingSoon;
