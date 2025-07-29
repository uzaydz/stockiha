import React from 'react';
import { Store, TruckIcon, CreditCard, BarChart3, Shield, Headphones, MapPin, DollarSign } from 'lucide-react';

const ECommerceFeatures: React.FC = () => {
  const features = [
    {
      icon: Store,
      title: 'إنشاء متجرك مع سطوكيها',
      description: 'تعلم خطوة بخطوة كيفية إنشاء متجرك الإلكتروني باستخدام منصة سطوكيها المتخصصة في السوق الجزائري',
      color: 'text-blue-600 dark:text-blue-400'
    },
    {
      icon: CreditCard,
      title: 'نظام الدفع عند الاستلام',
      description: 'فهم كامل لنظام COD وكيفية إدارته بنجاح في الجزائر مع تقليل المخاطر وزيادة معدل التحويل',
      color: 'text-orange-600 dark:text-orange-400'
    },
    {
      icon: TruckIcon,
      title: 'شركات التوصيل المحلية',
      description: 'التعرف على أفضل شركات التوصيل في الجزائر مثل يالدين وإيكو تراك وكيفية التعامل معها',
      color: 'text-green-600 dark:text-green-400'
    },
    {
      icon: BarChart3,
      title: 'تحليل الأداء والمبيعات',
      description: 'استخدام أدوات التحليل لفهم سلوك عملائك الجزائريين وتحسين أداء متجرك باستمرار',
      color: 'text-purple-600 dark:text-purple-400'
    },
    {
      icon: MapPin,
      title: 'التسويق المحلي',
      description: 'استراتيجيات تسويق مخصصة للسوق الجزائري تراعي الثقافة والعادات والسلوك الشرائي المحلي',
      color: 'text-red-600 dark:text-red-400'
    },
    {
      icon: Headphones,
      title: 'خدمة العملاء المتميزة',
      description: 'تعلم كيفية بناء نظام خدمة عملاء فعال يناسب توقعات العملاء الجزائريين ويزيد من ولائهم',
      color: 'text-indigo-600 dark:text-indigo-400'
    },
    {
      icon: Shield,
      title: 'إدارة المخاطر',
      description: 'تطوير استراتيجيات للتعامل مع المخاطر المرتبطة بالدفع عند الاستلام وحماية عملك من الخسائر',
      color: 'text-emerald-600 dark:text-emerald-400'
    },
    {
      icon: DollarSign,
      title: 'تحقيق الربحية',
      description: 'نصائح وخطط عملية لتحقيق الربحية وتوسيع نشاطك التجاري في السوق الجزائري',
      color: 'text-yellow-600 dark:text-yellow-400'
    }
  ];

  return (
    <div className="mb-8">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          ماذا ستتعلم في هذه الدورة؟
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          دورة شاملة مصممة خصيصاً للسوق الجزائري مع التركيز على سطوكيها والدفع عند الاستلام
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-4">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-shadow"
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

      {/* Success Guarantee */}
      <div className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-green-200 dark:border-green-800 p-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="font-semibold text-green-800 dark:text-green-300">ضمان النجاح</span>
          </div>
          <p className="text-green-700 dark:text-green-300 text-sm">
            بعد إكمال هذه الدورة، ستكون قادراً على إنشاء وإدارة متجرك الإلكتروني بنجاح في الجزائر
            مع سطوكيها ونظام الدفع عند الاستلام
          </p>
        </div>
      </div>
    </div>
  );
};

export default ECommerceFeatures;
