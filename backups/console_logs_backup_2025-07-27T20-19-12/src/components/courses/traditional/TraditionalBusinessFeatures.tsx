import React from 'react';
import { 
  Store, 
  CreditCard, 
  Package, 
  BarChart3, 
  Users, 
  Monitor,
  ArrowRightLeft,
  TrendingUp,
  CheckCircle,
  Zap,
  Shield,
  Clock
} from 'lucide-react';

const TraditionalBusinessFeatures: React.FC = () => {
  const features = [
    {
      icon: Store,
      title: 'مقدمة سطوكيها للتجار',
      description: 'تعرف على كيف تخدم سطوكيها التجار التقليديين وتساعدهم في تطوير أعمالهم مع قصص نجاح حقيقية من تجار استفادوا من المنصة',
      color: 'text-blue-600 dark:text-blue-400'
    },
    {
      icon: Users,
      title: 'إعداد حسابك وبياناتك',
      description: 'خطوات مفصلة لإعداد حسابك التجاري، ربط البيانات الضريبية والقانونية، وتحديد فئة نشاطك التجاري بشكل صحيح',
      color: 'text-green-600 dark:text-green-400'
    },
    {
      icon: CreditCard,
      title: 'نقطة البيع POS المتطورة',
      description: 'إعداد وتخصيص نقطة البيع لتناسب نشاطك، ربط الأجهزة والطابعات، وتدريب الموظفين على استخدام النظام بكفاءة',
      color: 'text-orange-600 dark:text-orange-400'
    },
    {
      icon: Package,
      title: 'إدارة المخزون بذكاء',
      description: 'نظام متكامل لإدارة المخزون مع الباركود، تتبع الكميات، التنبيهات التلقائية، وإجراء الجرد بسهولة ودقة',
      color: 'text-purple-600 dark:text-purple-400'
    },
    {
      icon: BarChart3,
      title: 'المحاسبة والتقارير المالية',
      description: 'نظام محاسبي شامل يتتبع جميع المعاملات، إنشاء التقارير المالية، وإدارة ضريبة القيمة المضافة بشكل تلقائي',
      color: 'text-red-600 dark:text-red-400'
    },
    {
      icon: Monitor,
      title: 'المتجر الإلكتروني المرتبط',
      description: 'تحويل متجرك التقليدي إلى متجر إلكتروني مع الحفاظ على التزامن التام بين المخزون والمبيعات في القناتين',
      color: 'text-indigo-600 dark:text-indigo-400'
    },
    {
      icon: ArrowRightLeft,
      title: 'إدارة العملاء وبرامج الولاء',
      description: 'نظام CRM متطور لإدارة قاعدة بيانات العملاء، إنشاء برامج الولاء والنقاط، والتسويق المباشر للعملاء المميزين',
      color: 'text-cyan-600 dark:text-cyan-400'
    },
    {
      icon: TrendingUp,
      title: 'التحليلات المتقدمة',
      description: 'استخدام تقارير سطوكيها المتقدمة لتحليل أداء متجرك، فهم سلوك العملاء، وتحديد الفرص الجديدة للنمو',
      color: 'text-teal-600 dark:text-teal-400'
    }
  ];

  const benefits = [
    {
      icon: Zap,
      title: 'تحول سريع',
      description: 'من التقليدي للرقمي بسهولة'
    },
    {
      icon: Shield,
      title: 'أمان عالي',
      description: 'حماية كاملة لبياناتك ومعاملاتك'
    },
    {
      icon: CheckCircle,
      title: 'نتائج مضمونة',
      description: 'زيادة المبيعات والكفاءة'
    },
    {
      icon: Clock,
      title: 'توفير الوقت',
      description: 'أتمتة كاملة للعمليات'
    }
  ];

  const stockihaAdvantages = [
    {
      title: 'تزامن فوري',
      description: 'أي بيع في نقطة البيع ينعكس فوراً على المتجر الإلكتروني والمخزون'
    },
    {
      title: 'محاسبة تلقائية',
      description: 'جميع المعاملات تُسجل تلقائياً مع التقارير المالية الفورية'
    },
    {
      title: 'إدارة موحدة',
      description: 'إدارة المتجر التقليدي والإلكتروني من لوحة واحدة'
    }
  ];

  return (
    <div className="mb-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          رحلة التحول الرقمي مع سطوكيها
        </h2>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          دورة متكاملة تأخذ بيدك من التجارة التقليدية إلى عالم التجارة الرقمية المتطورة
          مع الحفاظ على استمرارية أعمالك
        </p>
      </div>
      
      {/* Main Features */}
      <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
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
              className="bg-gradient-to-br from-orange-50 to-blue-50 dark:from-orange-900/20 dark:to-blue-900/20 rounded-lg border border-orange-200 dark:border-orange-800 p-4 text-center"
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

      {/* Stockiha Unique Advantages */}
      <div className="bg-gradient-to-r from-blue-600 to-orange-600 text-white rounded-lg p-6 mb-8">
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold mb-2 flex items-center justify-center gap-2">
            <Store className="w-6 h-6" />
            مميزات سطوكيها الفريدة للتجار
          </h3>
          <p className="text-sm opacity-90">
            لماذا يختار آلاف التجار سطوكيها لتطوير أعمالهم؟
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {stockihaAdvantages.map((advantage, index) => (
            <div key={index} className="text-center">
              <div className="text-lg font-bold mb-2">{advantage.title}</div>
              <div className="text-sm opacity-90">{advantage.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Success Promise */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-green-200 dark:border-green-800 p-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            <span className="font-bold text-green-800 dark:text-green-300 text-lg">ضمان التحول الناجح</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
            في نهاية هذه الدورة ستكون قادراً على:
          </h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle className="w-4 h-4" />
              <span>إدارة متجرك بالكامل من سطوكيها</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle className="w-4 h-4" />
              <span>ربط التجارة التقليدية والإلكترونية</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle className="w-4 h-4" />
              <span>زيادة المبيعات والأرباح بشكل ملحوظ</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TraditionalBusinessFeatures;
