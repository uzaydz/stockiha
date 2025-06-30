import React from 'react';
import { motion } from 'framer-motion';
import { 
  TruckIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import { CompleteProduct } from '@/lib/api/productComplete';

interface ProductFeaturesProps {
  product: CompleteProduct;
}

const ProductFeatures: React.FC<ProductFeaturesProps> = ({ product }) => {
  // فحص وجود features_and_specs
  if (!product?.features_and_specs) {
    return null;
  }

  const features = [];
  const featuresData = product.features_and_specs;

  // إضافة الميزات المختلفة
  if (featuresData.has_fast_shipping) {
    features.push({
      icon: TruckIcon,
      title: 'شحن سريع',
      description: featuresData.fast_shipping_text || 'شحن سريع لجميع الولايات',
      color: 'text-blue-500'
    });
  }

  if (featuresData.has_money_back) {
    features.push({
      icon: ShieldCheckIcon,
      title: 'ضمان الاسترداد',
      description: featuresData.money_back_text || 'ضمان استرداد المال',
      color: 'text-green-500'
    });
  }

  if (featuresData.has_quality_guarantee) {
    features.push({
      icon: CheckCircleIcon,
      title: 'ضمان الجودة',
      description: featuresData.quality_guarantee_text || 'ضمان جودة المنتج',
      color: 'text-purple-500'
    });
  }

  // إضافة الميزات من قائمة features
  if (featuresData.features && Array.isArray(featuresData.features)) {
    featuresData.features.forEach((feature, index) => {
      features.push({
        icon: StarIcon,
        title: feature,
        description: '',
        color: 'text-yellow-500'
      });
    });
  }

  if (features.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">مميزات المنتج</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((feature, index) => (
          <motion.div
            key={index}
            className="flex items-start space-x-3 space-x-reverse p-3 bg-gray-50 rounded-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <feature.icon className={`w-5 h-5 ${feature.color} flex-shrink-0 mt-0.5`} />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900">
                {feature.title}
              </h4>
              {feature.description && (
                <p className="text-xs text-gray-600 mt-1">
                  {feature.description}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* المواصفات */}
      {featuresData.specifications && Object.keys(featuresData.specifications).length > 0 && (
        <div className="mt-6">
          <h4 className="text-md font-medium text-gray-900 mb-3">المواصفات</h4>
          <div className="bg-gray-50 rounded-lg p-4">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(featuresData.specifications).map(([key, value]) => (
                <div key={key} className="flex flex-col sm:flex-row sm:justify-between">
                  <dt className="text-sm font-medium text-gray-600">{key}:</dt>
                  <dd className="text-sm text-gray-900 mt-1 sm:mt-0">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductFeatures; 