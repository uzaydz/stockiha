import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  TruckIcon,
  MapPinIcon,
  ClockIcon,
  CurrencyDollarIcon,
  HomeIcon,
  BuildingOfficeIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { CompleteProduct } from '@/lib/api/productComplete';
import { cn } from '@/lib/utils';

interface ProductShippingInfoProps {
  product: CompleteProduct;
  className?: string;
}

// تحسين الانميشن للأداء
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
      staggerChildren: 0.1
    }
  }
};

const infoVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { 
      duration: 0.3,
      ease: "easeOut"
    }
  }
};

const priceVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      type: "spring",
      stiffness: 300,
      damping: 30
    }
  }
};

const ProductShippingInfo = memo<ProductShippingInfoProps>(({ product, className }) => {
  
  // تحسين معالجة بيانات الشحن بـ useMemo
  const shippingData = useMemo(() => {
    if (!product?.shipping_and_templates?.shipping_info) {
      return { hasShipping: false, info: null, methodType: null };
    }

    const shippingInfo = product.shipping_and_templates.shipping_info;
    const methodType = product.shipping_and_templates.shipping_method_type;

    // تحديد نوع الشحن
    const getShippingTypeLabel = (type: string) => {
      switch (type) {
        case 'fast': return { label: 'شحن سريع', icon: '⚡', color: 'text-blue-600' };
        case 'express': return { label: 'شحن عاجل', icon: '🚀', color: 'text-purple-600' };
        default: return { label: 'شحن عادي', icon: '📦', color: 'text-green-600' };
      }
    };

    return {
      hasShipping: true,
      info: shippingInfo,
      methodType,
      typeInfo: methodType ? getShippingTypeLabel(methodType) : null
    };
  }, [product]);

  if (!shippingData.hasShipping) {
    return null;
  }

  const { info, typeInfo } = shippingData;

  return (
    <motion.div 
      className={cn(
        "p-6 rounded-2xl border-2 shadow-lg",
        "bg-gradient-to-br from-blue-50/80 via-white to-sky-50/80",
        "border-blue-200/50 dark:from-blue-900/20 dark:via-background dark:to-sky-900/20",
        "dark:border-blue-700/30 dark:bg-gradient-to-br",
        className
      )}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* العنوان */}
      <motion.div 
        className="flex items-center gap-3 mb-6"
        variants={infoVariants}
      >
        <motion.div
          className={cn(
            "p-2 rounded-xl",
            "bg-blue-100 dark:bg-blue-900/30",
            "border border-blue-200 dark:border-blue-700"
          )}
          whileHover={{ rotate: 360 }}
          transition={{ duration: 0.3 }}
        >
          <TruckIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </motion.div>
        
        <div>
          <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100">
            معلومات الشحن
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            تفاصيل التوصيل والأسعار
          </p>
        </div>
      </motion.div>
      
      {/* معلومات الشركة */}
      <motion.div 
        className="space-y-4 mb-6"
        variants={containerVariants}
      >
        <motion.div 
          className="flex items-center gap-3"
          variants={infoVariants}
        >
          <MapPinIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <div>
            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
              شركة الشحن: 
            </span>
            <span className="font-bold text-blue-900 dark:text-blue-100 mr-2">
              {info.name}
            </span>
          </div>
        </motion.div>

        {info.type === 'provider' && info.code && (
          <motion.div 
            className="flex items-center gap-3"
            variants={infoVariants}
          >
            <span className={cn(
              "px-3 py-1 rounded-full text-xs font-bold",
              "bg-blue-100 text-blue-800 border border-blue-200",
              "dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700"
            )}>
              {info.code.toUpperCase()}
            </span>
          </motion.div>
        )}

        {typeInfo && (
          <motion.div 
            className="flex items-center gap-3"
            variants={infoVariants}
          >
            <ClockIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div className="flex items-center gap-2">
              <span className="text-2xl">{typeInfo.icon}</span>
              <span className={cn("font-semibold", typeInfo.color)}>
                {typeInfo.label}
              </span>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* أسعار الشحن */}
      {(info.home_price || info.desk_price) && (
        <motion.div 
          className="mb-6"
          variants={infoVariants}
        >
          <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
            <CurrencyDollarIcon className="w-5 h-5" />
            أسعار الشحن
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {info.home_price && (
              <motion.div 
                className={cn(
                  "p-4 rounded-xl border-2 transition-all duration-300",
                  "bg-white/80 border-green-200/50 hover:border-green-300",
                  "dark:bg-background/50 dark:border-green-700/30",
                  "hover:shadow-md"
                )}
                variants={priceVariants}
                whileHover={{ scale: 1.02, y: -2 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HomeIcon className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      للمنزل
                    </span>
                  </div>
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    {info.home_price} دج
                  </span>
                </div>
              </motion.div>
            )}
            
            {info.desk_price && (
              <motion.div 
                className={cn(
                  "p-4 rounded-xl border-2 transition-all duration-300",
                  "bg-white/80 border-orange-200/50 hover:border-orange-300",
                  "dark:bg-background/50 dark:border-orange-700/30",
                  "hover:shadow-md"
                )}
                variants={priceVariants}
                whileHover={{ scale: 1.02, y: -2 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BuildingOfficeIcon className="w-5 h-5 text-orange-600" />
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      للمكتب
                    </span>
                  </div>
                  <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                    {info.desk_price} دج
                  </span>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* سعر موحد */}
      {info.unified_price && (
        <motion.div 
          className={cn(
            "p-4 rounded-xl mb-6",
            "bg-gradient-to-r from-emerald-50 to-green-50",
            "border-2 border-emerald-200/50",
            "dark:from-emerald-900/20 dark:to-green-900/20",
            "dark:border-emerald-700/30"
          )}
          variants={infoVariants}
        >
          <div className="flex items-center gap-3">
            <CurrencyDollarIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h5 className="font-semibold text-emerald-800 dark:text-emerald-300">
                سعر موحد لجميع الولايات
              </h5>
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                نفس السعر في كل مكان في الجزائر
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* نصائح الشحن */}
      <motion.div 
        className={cn(
          "p-4 rounded-xl",
          "bg-gradient-to-r from-indigo-50 to-blue-50",
          "border-2 border-indigo-200/50",
          "dark:from-indigo-900/20 dark:to-blue-900/20",
          "dark:border-indigo-700/30"
        )}
        variants={infoVariants}
      >
        <div className="flex items-start gap-3">
          <InformationCircleIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h5 className="font-semibold text-indigo-800 dark:text-indigo-300">
              معلومات مهمة عن التوصيل
            </h5>
            <ul className="text-sm text-indigo-700 dark:text-indigo-400 space-y-1">
              <li>📅 يتم التوصيل خلال 1-3 أيام عمل للولايات القريبة</li>
              <li>🗺️ التوصيل خلال 3-7 أيام للولايات البعيدة</li>
              <li>📞 سيتم الاتصال بك قبل التوصيل</li>
              <li>💳 إمكانية الدفع عند الاستلام</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
});

ProductShippingInfo.displayName = 'ProductShippingInfo';

export default ProductShippingInfo;
