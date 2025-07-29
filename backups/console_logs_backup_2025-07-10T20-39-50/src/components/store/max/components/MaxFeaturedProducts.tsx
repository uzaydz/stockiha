import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Heart, Star, Eye, ChevronLeft, Tag, Truck } from 'lucide-react';
import { StoreData, Product } from '@/api/optimized-store-api';

interface MaxFeaturedProductsProps {
  settings: any;
  products: Product[];
  storeData: StoreData;
}

export const MaxFeaturedProducts: React.FC<MaxFeaturedProductsProps> = ({ 
  settings, 
  products, 
  storeData 
}) => {
  const [showAll, setShowAll] = useState(false);

  const defaultSettings = {
    title: 'المنتجات المميزة',
    subtitle: 'اكتشف أفضل منتجاتنا المختارة بعناية',
    maxVisible: 8,
    showDiscount: true,
    showRating: true,
    animationDelay: 0.1
  };

  const productSettings = { ...defaultSettings, ...settings };
  const displayProducts = showAll ? products : products.slice(0, productSettings.maxVisible);

  // منتجات تجريبية إذا لم توجد منتجات حقيقية
  const defaultProducts = [
    {
      id: '1',
      name: 'هاتف ذكي متطور',
      slug: 'smartphone-advanced',
      price: 45000,
      compare_at_price: 55000,
      description: 'هاتف ذكي بمواصفات عالية وتقنيات متقدمة للاستخدام اليومي',
      thumbnail_image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=1480',
      stock_quantity: 15,
      is_new: true,
      category: { name: 'الإلكترونيات' }
    },
    {
      id: '2',
      name: 'ساعة ذكية رياضية',
      slug: 'smart-watch-sport',
      price: 25000,
      compare_at_price: 30000,
      description: 'ساعة ذكية مقاومة للماء مع مراقبة الصحة والأنشطة الرياضية',
      thumbnail_image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1499',
      stock_quantity: 8,
      is_new: false,
      category: { name: 'الإكسسوارات' }
    },
    {
      id: '3',
      name: 'حقيبة ظهر عملية',
      slug: 'practical-backpack',
      price: 8500,
      compare_at_price: null,
      description: 'حقيبة ظهر عملية ومريحة مناسبة للعمل والسفر',
      thumbnail_image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=1587',
      stock_quantity: 20,
      is_new: false,
      category: { name: 'الحقائب' }
    },
    {
      id: '4',
      name: 'سماعات لاسلكية',
      slug: 'wireless-headphones',
      price: 15000,
      compare_at_price: 20000,
      description: 'سماعات لاسلكية عالية الجودة مع خاصية إلغاء الضوضاء',
      thumbnail_image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1470',
      stock_quantity: 12,
      is_new: true,
      category: { name: 'الإلكترونيات' }
    }
  ];

  const productsToShow = displayProducts.length > 0 ? displayProducts : defaultProducts;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: productSettings.animationDelay }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <section className="py-16 md:py-20 lg:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* رأس القسم */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            {productSettings.title}
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            {productSettings.subtitle}
          </p>
        </motion.div>

        {/* شبكة المنتجات */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8"
        >
          {productsToShow.map((product, index) => (
            <motion.div key={product.id} variants={itemVariants}>
              <ProductCard product={product} settings={productSettings} index={index} />
            </motion.div>
          ))}
        </motion.div>

        {/* زر عرض المزيد */}
        {products.length > productSettings.maxVisible && (
          <motion.div
            className="text-center mt-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
          >
            <button
              onClick={() => setShowAll(!showAll)}
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-full font-semibold hover:bg-primary/90 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <span>{showAll ? 'عرض أقل' : `عرض المزيد من المنتجات`}</span>
              <ChevronLeft className="h-5 w-5" />
            </button>
          </motion.div>
        )}

        {/* رسالة إذا لم توجد منتجات حقيقية */}
        {displayProducts.length === 0 && (
          <motion.div 
            className="mt-12 mx-auto max-w-2xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200/50 dark:border-blue-800/50 rounded-2xl backdrop-blur-sm shadow-lg">
              <div className="flex items-center justify-center mb-3">
                <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center ml-3">
                  <ShoppingBag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="font-semibold text-blue-800 dark:text-blue-200">
                  منتجات تجريبية
                </span>
              </div>
              <p className="text-blue-700 dark:text-blue-300 text-sm leading-relaxed text-center">
                هذه منتجات تجريبية لعرض التصميم. يمكنك إضافة منتجاتك الخاصة من لوحة التحكم.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
};

interface ProductCardProps {
  product: Product;
  settings: any;
  index: number;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, settings, index }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const discountPercentage = product.compare_at_price 
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : 0;

  return (
    <motion.div
      className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-primary/20"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
    >
      {/* صورة المنتج */}
      <div className="relative aspect-square bg-muted/50 overflow-hidden">
        <a href={`/product-purchase-max-v2/${product.slug || product.id || 'unknown'}`}>
          <img 
            src={product.thumbnail_image || '/images/product-placeholder.jpg'} 
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        </a>
        
        {/* شارات المنتج */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          {product.is_new && (
            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
              جديد
            </span>
          )}
          {discountPercentage > 0 && settings.showDiscount && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold flex items-center gap-1">
              <Tag size={12} />
              -{discountPercentage}%
            </span>
          )}
        </div>

        {/* أزرار الإجراءات */}
        <motion.div
          className="absolute top-3 left-3 flex flex-col gap-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -20 }}
          transition={{ duration: 0.2 }}
        >
          <button
            onClick={() => setIsWishlisted(!isWishlisted)}
            className={`p-2 rounded-full backdrop-blur-sm transition-all ${
              isWishlisted 
                ? 'bg-red-500 text-white' 
                : 'bg-white/80 text-gray-600 hover:bg-white hover:text-red-500'
            }`}
          >
            <Heart size={16} className={isWishlisted ? 'fill-current' : ''} />
          </button>
          
          <button className="p-2 rounded-full bg-white/80 backdrop-blur-sm text-gray-600 hover:bg-white hover:text-primary transition-all">
            <Eye size={16} />
          </button>
        </motion.div>

        {/* مؤشر التوفر */}
        <div className="absolute bottom-3 left-3">
          {product.stock_quantity > 0 ? (
            <span className="inline-flex items-center gap-1 bg-green-500/90 text-white text-xs px-2 py-1 rounded-full">
              <div className="w-2 h-2 bg-green-300 rounded-full"></div>
              متوفر
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-red-500/90 text-white text-xs px-2 py-1 rounded-full">
              <div className="w-2 h-2 bg-red-300 rounded-full"></div>
              نفد المخزون
            </span>
          )}
        </div>
      </div>

      {/* محتوى المنتج */}
      <div className="p-6">
        {/* فئة المنتج */}
        <div className="text-sm text-muted-foreground mb-2">
          {product.category?.name}
        </div>
        
        {/* اسم المنتج */}
        <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
          <a href={`/product-purchase-max-v2/${product.slug || product.id || 'unknown'}`}>{product.name}</a>
        </h3>
        
        {/* وصف المنتج */}
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {product.description?.substring(0, 100)}...
        </p>

        {/* التقييم */}
        {settings.showRating && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={14}
                  className={`${star <= 4 ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">(4.0)</span>
          </div>
        )}

        {/* السعر */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl font-bold text-foreground">
            {product.price?.toLocaleString()} دج
          </span>
          {product.compare_at_price && (
            <span className="text-sm text-muted-foreground line-through">
              {product.compare_at_price.toLocaleString()} دج
            </span>
          )}
        </div>

        {/* معلومات إضافية */}
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
          <span className="flex items-center gap-1">
            <Truck size={14} />
            شحن مجاني
          </span>
          <span>
            {product.stock_quantity > 0 ? `${product.stock_quantity} قطعة` : 'نفد المخزون'}
          </span>
        </div>

        {/* زر الإضافة للسلة */}
        <button 
          className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
          disabled={product.stock_quantity === 0}
        >
          <ShoppingBag size={16} />
          {product.stock_quantity > 0 ? 'إضافة للسلة' : 'نفد المخزون'}
        </button>
      </div>
    </motion.div>
  );
};
