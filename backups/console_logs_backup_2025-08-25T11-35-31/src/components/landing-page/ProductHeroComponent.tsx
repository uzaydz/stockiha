import React from 'react';
import { motion } from 'framer-motion';
import { Star, ArrowRight, ShoppingCart, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductHeroComponentProps {
  settings: {
    productName?: string;
    productDescription?: string;
    productPrice?: string;
    originalPrice?: string;
    productImage?: string;
    backgroundColor?: string;
    textColor?: string;
    accentColor?: string;
    buttonText?: string;
    buttonColor?: string;
    showRating?: boolean;
    rating?: number;
    reviewsCount?: number;
    showDiscount?: boolean;
    discountText?: string;
    layout?: string;
    imagePosition?: string;
    [key: string]: any;
  };
  className?: string;
}

const ProductHeroComponent: React.FC<ProductHeroComponentProps> = ({ 
  settings, 
  className = '' 
}) => {
  const { 
    productName = 'منتج رائع', 
    productDescription = 'وصف تفصيلي للمنتج وفوائده المميزة', 
    productPrice = '199',
    originalPrice = '',
    productImage = '',
    backgroundColor = '#ffffff',
    textColor = '#333333',
    accentColor = '#4f46e5',
    buttonText = 'اطلب الآن',
    buttonColor = '',
    showRating = true,
    rating = 4.5,
    reviewsCount = 128,
    showDiscount = false,
    discountText = 'خصم خاص',
    layout = 'split',
    imagePosition = 'right'
  } = settings;

  // حساب نسبة الخصم
  const calculateDiscount = () => {
    if (!originalPrice || !productPrice) return 0;
    const original = parseFloat(originalPrice);
    const current = parseFloat(productPrice);
    return Math.round(((original - current) / original) * 100);
  };

  // رندر النجوم
  const renderStars = () => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const stars = [];

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={i} size={16} className="fill-yellow-400 text-yellow-400" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <div key="half" className="relative">
          <Star size={16} className="text-gray-300" />
          <div className="absolute inset-0 overflow-hidden w-1/2">
            <Star size={16} className="fill-yellow-400 text-yellow-400" />
          </div>
        </div>
      );
    }

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} size={16} className="text-gray-300" />
      );
    }

    return stars;
  };

  const discount = calculateDiscount();

  return (
    <section className={cn("py-16", className)} style={{ backgroundColor }}>
      <div className="container mx-auto px-4">
        <div className={cn(
          "flex items-center gap-8",
          layout === 'split' 
            ? (imagePosition === 'right' ? 'flex-col lg:flex-row' : 'flex-col lg:flex-row-reverse')
            : 'flex-col text-center'
        )}>
          {/* محتوى المنتج */}
          <motion.div 
            initial={{ opacity: 0, x: imagePosition === 'right' ? -30 : 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className={cn(
              layout === 'split' ? 'flex-1' : 'w-full',
              layout === 'centered' ? 'text-center max-w-3xl mx-auto' : ''
            )}
          >
            {/* بادج الخصم */}
            {showDiscount && (discount > 0 || discountText) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full text-sm font-medium mb-4"
              >
                {discount > 0 ? `خصم ${discount}%` : discountText}
              </motion.div>
            )}

            {/* اسم المنتج */}
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4"
              style={{ color: textColor }}
            >
              {productName}
            </motion.h1>

            {/* التقييم والمراجعات */}
            {showRating && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="flex items-center gap-2 mb-4"
              >
                <div className="flex items-center gap-1">
                  {renderStars()}
                </div>
                <span className="text-sm" style={{ color: textColor }}>
                  {rating} ({reviewsCount} مراجعة)
                </span>
              </motion.div>
            )}

            {/* وصف المنتج */}
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              className="text-lg leading-relaxed mb-6 opacity-80"
              style={{ color: textColor }}
            >
              {productDescription}
            </motion.p>

            {/* السعر */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
              className="flex items-center gap-4 mb-8"
            >
              <span 
                className="text-3xl font-bold"
                style={{ color: accentColor }}
              >
                {productPrice} ريال
              </span>
              {originalPrice && (
                <span 
                  className="text-xl line-through opacity-60"
                  style={{ color: textColor }}
                >
                  {originalPrice} ريال
                </span>
              )}
            </motion.div>

            {/* أزرار العمل */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              viewport={{ once: true }}
              className="flex items-center gap-4 flex-wrap"
            >
              <button
                className="inline-flex items-center gap-2 px-8 py-4 rounded-lg font-medium text-white hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
                style={{ 
                  backgroundColor: buttonColor || accentColor,
                  boxShadow: `0 4px 20px ${buttonColor || accentColor}30`
                }}
              >
                <ShoppingCart size={20} />
                {buttonText}
                <ArrowRight size={20} />
              </button>
              
              <button
                className="inline-flex items-center gap-2 px-6 py-4 rounded-lg font-medium border-2 hover:bg-gray-50 transition-all duration-300"
                style={{ 
                  borderColor: accentColor,
                  color: accentColor 
                }}
              >
                <Heart size={20} />
                إضافة للمفضلة
              </button>
            </motion.div>
          </motion.div>

          {/* صورة المنتج */}
          {productImage && (
            <motion.div 
              initial={{ opacity: 0, x: imagePosition === 'right' ? 30 : -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className={cn(
                layout === 'split' ? 'flex-1' : 'w-full max-w-lg mx-auto',
                'relative'
              )}
            >
              <div className="relative">
                <img
                  src={productImage}
                  alt={productName}
                  className="w-full h-auto rounded-2xl shadow-2xl"
                />
                
                {/* تأثير الإضاءة */}
                <div 
                  className="absolute inset-0 rounded-2xl opacity-20"
                  style={{
                    background: `linear-gradient(135deg, ${accentColor}20, transparent)`
                  }}
                />
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ProductHeroComponent;
