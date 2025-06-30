import React from 'react';
import { motion } from 'framer-motion';
import { 
  TruckIcon,
  MapPinIcon,
  ClockIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { CompleteProduct } from '@/lib/api/productComplete';

interface ProductShippingInfoProps {
  product: CompleteProduct;
}

const ProductShippingInfo: React.FC<ProductShippingInfoProps> = ({ product }) => {
  // فحص وجود shipping_and_templates
  if (!product?.shipping_and_templates) {
    return null;
  }

  const shippingData = product.shipping_and_templates;
  const shippingInfo = shippingData.shipping_info;

  if (!shippingInfo) {
    return null;
  }

  return (
    <motion.div 
      className="bg-blue-50 rounded-lg p-4 border border-blue-200"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-start space-x-3 space-x-reverse">
        <TruckIcon className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            معلومات الشحن
          </h3>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2 space-x-reverse">
              <MapPinIcon className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-800">
                شركة الشحن: <strong>{shippingInfo.name}</strong>
              </span>
            </div>

            {shippingInfo.type === 'provider' && shippingInfo.code && (
              <div className="flex items-center space-x-2 space-x-reverse">
                <span className="text-sm text-blue-700">
                  رمز الشركة: {shippingInfo.code.toUpperCase()}
                </span>
              </div>
            )}

            {shippingData.shipping_method_type && (
              <div className="flex items-center space-x-2 space-x-reverse">
                <ClockIcon className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-800">
                  نوع الشحن: {
                    shippingData.shipping_method_type === 'fast' 
                      ? 'شحن سريع' 
                      : shippingData.shipping_method_type === 'express'
                      ? 'شحن عاجل'
                      : 'شحن عادي'
                  }
                </span>
              </div>
            )}

            {/* أسعار الشحن */}
            {(shippingInfo.home_price || shippingInfo.desk_price) && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <h4 className="text-sm font-medium text-blue-900 mb-2">أسعار الشحن:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {shippingInfo.home_price && (
                    <div className="flex items-center justify-between bg-white rounded p-2">
                      <span className="text-sm text-gray-700">للمنزل:</span>
                      <span className="text-sm font-semibold text-blue-800">
                        {shippingInfo.home_price} دج
                      </span>
                    </div>
                  )}
                  {shippingInfo.desk_price && (
                    <div className="flex items-center justify-between bg-white rounded p-2">
                      <span className="text-sm text-gray-700">للمكتب:</span>
                      <span className="text-sm font-semibold text-blue-800">
                        {shippingInfo.desk_price} دج
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* سعر موحد */}
            {shippingInfo.unified_price && (
              <div className="flex items-center space-x-2 space-x-reverse">
                <CurrencyDollarIcon className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-800">
                  سعر موحد لجميع الولايات
                </span>
              </div>
            )}
          </div>

          {/* نصائح الشحن */}
          <div className="mt-3 pt-3 border-t border-blue-200">
            <p className="text-xs text-blue-700">
              💡 يتم التوصيل خلال 1-3 أيام عمل للولايات القريبة، و 3-7 أيام للولايات البعيدة
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductShippingInfo;
