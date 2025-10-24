import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Lightbulb,
  BookOpen,
  Calculator,
  Target,
  TrendingUp,
  Shield,
  Users,
  Heart,
  Star,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';

const ZakatIdeas: React.FC = () => {
  const ideas = {
    calculation_ideas: [
      {
        title: "حساب الزكاة الدوري",
        description: "قم بحساب الزكاة كل 3 أشهر لتجنب تراكم المبالغ الكبيرة",
        icon: <Calculator className="h-5 w-5 text-blue-600" />,
        benefits: ["تجنب المفاجآت", "تسهيل الدفع", "تتبع أفضل"]
      },
      {
        title: "استخدام تقويم هجري",
        description: "استخدم التقويم الهجري لحساب السنة الزكوية بدقة",
        icon: <BookOpen className="h-5 w-5 text-green-600" />,
        benefits: ["دقة شرعية", "تجنب الأخطاء", "موافقة للسنة"]
      },
      {
        title: "حساب المتوسطات",
        description: "استخدم متوسط أسعار الذهب على مدار السنة للحساب الأكثر دقة",
        icon: <TrendingUp className="h-5 w-5 text-purple-600" />,
        benefits: ["دقة أعلى", "عدالة أكثر", "مرونة في التسعير"]
      }
    ],
    optimization_ideas: [
      {
        title: "تحسين إدارة المخزون",
        description: "راجع المخزون بانتظام لضمان دقة حساب الزكاة",
        icon: <Target className="h-5 w-5 text-orange-600" />,
        benefits: ["دقة الحساب", "تجنب الزيادة", "تحسين التدفق النقدي"]
      },
      {
        title: "تسجيل المشتريات بدقة",
        description: "احتفظ بسجلات دقيقة لجميع المشتريات والمبيعات",
        icon: <Shield className="h-5 w-5 text-red-600" />,
        benefits: ["تتبع أفضل", "حساب صحيح", "مراجعة سهلة"]
      },
      {
        title: "فصل الحسابات",
        description: "افصل حسابات الزكاة عن الحسابات التشغيلية",
        icon: <CheckCircle className="h-5 w-5 text-teal-600" />,
        benefits: ["وضوح أكبر", "تسهيل المراجعة", "تنظيم أفضل"]
      }
    ],
    distribution_ideas: [
      {
        title: "الأولويات في التوزيع",
        description: "ابدأ بالأقارب والجيران ثم المجتمع المحلي",
        icon: <Users className="h-5 w-5 text-pink-600" />,
        benefits: ["بركة أكبر", "تأثير مباشر", "علاقات أفضل"]
      },
      {
        title: "المشاريع المستدامة",
        description: "ادعم المشاريع التي توفر دخلاً مستمراً للمستفيدين",
        icon: <Heart className="h-5 w-5 text-rose-600" />,
        benefits: ["تأثير طويل الأمد", "استقلالية", "تنمية مستدامة"]
      },
      {
        title: "التبرع الموسمي",
        description: "ركز على المناسبات الخاصة مثل رمضان والأعياد",
        icon: <Star className="h-5 w-5 text-yellow-600" />,
        benefits: ["أجر مضاعف", "مساعدة أكبر", "روابط اجتماعية"]
      }
    ],
    legal_considerations: [
      {
        title: "التوثيق الشرعي",
        description: "احتفظ بإيصالات وشهادات من الجهات المختصة",
        icon: <BookOpen className="h-5 w-5 text-indigo-600" />,
        benefits: ["حفظ الحقوق", "مرجع للمستقبل", "ثقة أكبر"]
      },
      {
        title: "استشارة العلماء",
        description: "استشر أهل العلم في المسائل المستجدة",
        icon: <Info className="h-5 w-5 text-cyan-600" />,
        benefits: ["دقة شرعية", "اطمئنان", "تجنب الأخطاء"]
      },
      {
        title: "المراجعة الدورية",
        description: "قم بمراجعة حسابات الزكاة مع محاسب شرعي",
        icon: <CheckCircle className="h-5 w-5 text-emerald-600" />,
        benefits: ["دقة أكبر", "تحسين مستمر", "خبرة متخصصة"]
      }
    ]
  };

  return (
    <div className="space-y-6">
      {/* رأس مبسط */}
      <div className="py-4 text-center">
        <h2 className="text-xl md:text-2xl font-semibold mb-1">أفكار مساعدة في الزكاة</h2>
        <p className="text-sm text-muted-foreground">نصائح مختصرة ومحايدة لتحسين الحساب والتوزيع</p>
      </div>

      {/* التبويبات */}
      <Tabs defaultValue="calculation" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto p-1">
          <TabsTrigger value="calculation" className="flex items-center gap-2 h-12 px-4">
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">الحساب</span>
          </TabsTrigger>
          <TabsTrigger value="optimization" className="flex items-center gap-2 h-12 px-4">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">التحسين</span>
          </TabsTrigger>
          <TabsTrigger value="distribution" className="flex items-center gap-2 h-12 px-4">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">التوزيع</span>
          </TabsTrigger>
          <TabsTrigger value="legal" className="flex items-center gap-2 h-12 px-4">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">الاعتبارات</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calculation" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ideas.calculation_ideas.map((idea, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-sm transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      {idea.icon}
                      <CardTitle className="text-lg">{idea.title}</CardTitle>
                    </div>
                    <CardDescription>{idea.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <h5 className="font-medium text-sm text-muted-foreground">الفوائد:</h5>
                      <div className="flex flex-wrap gap-1">
                        {idea.benefits.map((benefit, benefitIndex) => (
                          <Badge key={benefitIndex} variant="secondary" className="text-xs">
                            {benefit}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ideas.optimization_ideas.map((idea, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-sm transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      {idea.icon}
                      <CardTitle className="text-lg">{idea.title}</CardTitle>
                    </div>
                    <CardDescription>{idea.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <h5 className="font-medium text-sm text-muted-foreground">الفوائد:</h5>
                      <div className="flex flex-wrap gap-1">
                        {idea.benefits.map((benefit, benefitIndex) => (
                          <Badge key={benefitIndex} variant="secondary" className="text-xs">
                            {benefit}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ideas.distribution_ideas.map((idea, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-sm transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      {idea.icon}
                      <CardTitle className="text-lg">{idea.title}</CardTitle>
                    </div>
                    <CardDescription>{idea.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <h5 className="font-medium text-sm text-muted-foreground">الفوائد:</h5>
                      <div className="flex flex-wrap gap-1">
                        {idea.benefits.map((benefit, benefitIndex) => (
                          <Badge key={benefitIndex} variant="secondary" className="text-xs">
                            {benefit}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="legal" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ideas.legal_considerations.map((idea, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-sm transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      {idea.icon}
                      <CardTitle className="text-lg">{idea.title}</CardTitle>
                    </div>
                    <CardDescription>{idea.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <h5 className="font-medium text-sm text-muted-foreground">الفوائد:</h5>
                      <div className="flex flex-wrap gap-1">
                        {idea.benefits.map((benefit, benefitIndex) => (
                          <Badge key={benefitIndex} variant="secondary" className="text-xs">
                            {benefit}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* نصائح إضافية */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              نصائح عامة مهمة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-start gap-3 p-3 border rounded-md">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h5 className="font-medium">الزكاة عبادة مالية</h5>
                    <p className="text-sm text-muted-foreground">تذكر أن الزكاة ليست مجرد واجب مالي، بل هي عبادة تقربك إلى الله</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 border rounded-md">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h5 className="font-medium">الإخلاص في النية</h5>
                    <p className="text-sm text-muted-foreground">اجعل نيتك خالصة لله تعالى في دفع الزكاة</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-3 p-3 border rounded-md">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h5 className="font-medium">التعلم المستمر</h5>
                    <p className="text-sm text-muted-foreground">تابع التطورات في أحكام الزكاة واستشر أهل العلم</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 border rounded-md">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h5 className="font-medium">التوازن والاعتدال</h5>
                    <p className="text-sm text-muted-foreground">لا تبالغ في الحساب ولا تفرط، بل اتبع الوسطية</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ZakatIdeas;
