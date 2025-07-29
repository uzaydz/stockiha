import React from 'react';
import { 
  Wrench, 
  QrCode, 
  MessageSquare, 
  Clock, 
  Printer,
  Smartphone,
  BarChart2,
  Users,
  CheckCircle,
  Zap,
  Shield,
  TrendingUp,
  Eye
} from 'lucide-react';

const ServiceProvidersFeatures: React.FC = () => {
  const features = [
    {
      icon: Wrench,
      title: 'مقدمة النظام الثوري',
      description: 'تعرف على النظام الأول من نوعه في المنطقة لإدارة مراكز الخدمات والتصليحات، والذي يحول طريقة عملك إلى نظام رقمي متطور ومتكامل',
      color: 'text-blue-600 dark:text-blue-400'
    },
    {
      icon: Users,
      title: 'إعداد مركز الخدمة',
      description: 'خطوات مفصلة لإعداد حسابك كمقدم خدمات، تحديد أنواع الخدمات التي تقدمها، وضبط معلومات المركز وساعات العمل',
      color: 'text-green-600 dark:text-green-400'
    },
    {
      icon: QrCode,
      title: 'تسجيل وتتبع الطلبيات',
      description: 'استقبال العملاء الجدد، تسجيل معلوماتهم وتفاصيل الأجهزة، وإنشاء أرقام تتبع فريدة مع نظام الباركود المتطور',
      color: 'text-purple-600 dark:text-purple-400'
    },
    {
      icon: Printer,
      title: 'نظام الطباعة الذكي',
      description: 'طباعة ورقة التتبع للعميل وورقة العمل للفني، إعداد الطابعات الحرارية، وتخصيص تصميم الأوراق حسب احتياجاتك',
      color: 'text-orange-600 dark:text-orange-400'
    },
    {
      icon: MessageSquare,
      title: 'إدارة حالات الطلبيات',
      description: 'تتبع مراحل التنفيذ المختلفة، تحديث حالة الطلبيات، وإرسال الإشعارات التلقائية للعملاء عند تغيير أي حالة',
      color: 'text-red-600 dark:text-red-400'
    },
    {
      icon: Smartphone,
      title: 'المسح الضوئي والإشعارات',
      description: 'استخدام الماسح الضوئي لتحديث الطلبيات فورياً، إكمال الخدمات بسكان واحد، وإرسال SMS تلقائي للعملاء عند الانتهاء',
      color: 'text-indigo-600 dark:text-indigo-400'
    },
    {
      icon: Clock,
      title: 'الطابور الذكي التفاعلي',
      description: 'نظام فريد يتيح للعملاء مراقبة موقعهم في الطابور، معرفة عدد الأشخاص أمامهم، وتوقع وقت تسليم خدمتهم',
      color: 'text-cyan-600 dark:text-cyan-400'
    },
    {
      icon: BarChart2,
      title: 'التقارير والتحليلات',
      description: 'تحليل أداء مركز الخدمة، قياس رضا العملاء، تتبع أوقات التنفيذ، ومراجعة الإيرادات لتحسين كفاءة العمليات',
      color: 'text-teal-600 dark:text-teal-400'
    }
  ];

  const benefits = [
    {
      icon: Zap,
      title: 'كفاءة عالية',
      description: 'تسريع جميع العمليات'
    },
    {
      icon: Shield,
      title: 'أمان تام',
      description: 'حماية بيانات العملاء'
    },
    {
      icon: CheckCircle,
      title: 'رضا العملاء',
      description: 'خدمة متميزة ومتابعة مستمرة'
    },
    {
      icon: TrendingUp,
      title: 'زيادة الأرباح',
      description: 'تحسين الإنتاجية والأداء'
    }
  ];

  const systemFlow = [
    {
      step: '1',
      title: 'استقبال العميل',
      description: 'تسجيل معلومات العميل والجهاز في النظام',
      icon: Users
    },
    {
      step: '2',
      title: 'طباعة الأوراق',
      description: 'ورقة تتبع للعميل + ورقة عمل للفني',
      icon: Printer
    },
    {
      step: '3',
      title: 'تتبع الحالة',
      description: 'العميل يتابع طلبيته والطابور',
      icon: Eye
    },
    {
      step: '4',
      title: 'الإنجاز والإشعار',
      description: 'مسح الكود + SMS تلقائي للعميل',
      icon: MessageSquare
    }
  ];

  return (
    <div className="mb-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          النظام الأول من نوعه لإدارة الخدمات
        </h2>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          نظام ثوري متكامل يجمع بين التتبع الذكي والطوابير التفاعلية مع الإشعارات التلقائية
          لتحويل مركز خدمتك إلى تجربة رقمية متطورة
        </p>
      </div>

      {/* System Flow */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 text-center">
          كيف يعمل النظام؟
        </h3>
        <div className="grid md:grid-cols-4 gap-4">
          {systemFlow.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="text-center">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-3 border">
                  <div className="bg-blue-100 dark:bg-blue-900/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-lg font-bold text-primary mb-1">{step.step}</div>
                  <div className="font-semibold text-gray-900 dark:text-white text-sm mb-2">{step.title}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-300">{step.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Main Features */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <Icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Benefits */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {benefits.map((benefit, index) => {
          const Icon = benefit.icon;
          return (
            <div
              key={index}
              className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4 text-center"
            >
              <Icon className="w-8 h-8 mx-auto mb-2 text-primary" />
              <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                {benefit.title}
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                {benefit.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Innovation Highlight */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6 mb-8">
        <div className="text-center">
          <h3 className="text-xl font-bold mb-4 flex items-center justify-center gap-2">
            <Wrench className="w-6 h-6" />
            لماذا هذا النظام ثوري؟
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="text-2xl font-bold mb-1">🔄</div>
              <div className="text-lg font-bold mb-2">تتبع تلقائي</div>
              <div className="text-sm opacity-90">العميل يعرف حالة طلبيته لحظة بلحظة</div>
            </div>
            <div>
              <div className="text-2xl font-bold mb-1">📱</div>
              <div className="text-lg font-bold mb-2">إشعارات ذكية</div>
              <div className="text-sm opacity-90">SMS تلقائي عند إكمال الخدمة</div>
            </div>
            <div>
              <div className="text-2xl font-bold mb-1">⏰</div>
              <div className="text-lg font-bold mb-2">طابور تفاعلي</div>
              <div className="text-sm opacity-90">مراقبة الانتظار في الوقت الفعلي</div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Promise */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-green-200 dark:border-green-800 p-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            <span className="font-bold text-green-800 dark:text-green-300 text-lg">ضمان التطوير</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
            في نهاية هذه الدورة ستكون قادراً على:
          </h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle className="w-4 h-4" />
              <span>إدارة مركز خدمة رقمي متطور</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle className="w-4 h-4" />
              <span>تقديم تجربة عملاء استثنائية</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle className="w-4 h-4" />
              <span>زيادة الكفاءة والأرباح بشكل ملحوظ</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceProvidersFeatures; 