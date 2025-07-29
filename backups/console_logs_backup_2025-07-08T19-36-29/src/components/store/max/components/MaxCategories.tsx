import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Grid, List, ChevronLeft, Package, Tag } from 'lucide-react';
import { StoreData, Category } from '@/api/optimized-store-api';

interface MaxCategoriesProps {
  settings: any;
  categories: Category[];
  storeData: StoreData;
}

export const MaxCategories: React.FC<MaxCategoriesProps> = ({ 
  settings, 
  categories, 
  storeData 
}) => {
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [showAll, setShowAll] = useState(false);

  const defaultSettings = {
    title: 'تسوق حسب الفئة',
    subtitle: 'اكتشف مجموعة واسعة من المنتجات المتنوعة',
    maxVisible: 6,
    showViewToggle: true,
    showProductCount: true,
    animationDelay: 0.1
  };

  const categorySettings = { ...defaultSettings, ...settings };
  const displayCategories = showAll ? categories : categories.slice(0, categorySettings.maxVisible);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: categorySettings.animationDelay }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  // الفئات الافتراضية إذا لم توجد فئات
  const defaultCategories = [
    { id: '1', name: 'الإلكترونيات', slug: 'electronics', product_count: 25, image_url: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?q=80&w=1901' },
    { id: '2', name: 'الملابس', slug: 'clothing', product_count: 40, image_url: 'https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=1471' },
    { id: '3', name: 'المنزل والحديقة', slug: 'home-garden', product_count: 30, image_url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=1558' },
    { id: '4', name: 'الرياضة', slug: 'sports', product_count: 20, image_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=1470' },
    { id: '5', name: 'الكتب', slug: 'books', product_count: 15, image_url: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=1528' },
    { id: '6', name: 'الجمال والعناية', slug: 'beauty', product_count: 35, image_url: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=1480' }
  ];

  const categoriesToShow = displayCategories.length > 0 ? displayCategories : defaultCategories;

  return (
    <section className="py-16 md:py-20 lg:py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* رأس القسم */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-6">
            <motion.h2 
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              {categorySettings.title}
            </motion.h2>
            
            <motion.p 
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {categorySettings.subtitle}
            </motion.p>
          </div>

          {/* أدوات التحكم */}
          {categorySettings.showViewToggle && (
            <motion.div 
              className="flex justify-center items-center gap-2"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className="flex items-center bg-muted/50 rounded-full p-1">
                <button
                  onClick={() => setViewType('grid')}
                  className={`p-2 rounded-full transition-all ${
                    viewType === 'grid' 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  aria-label="عرض شبكي"
                >
                  <Grid size={18} />
                </button>
                <button
                  onClick={() => setViewType('list')}
                  className={`p-2 rounded-full transition-all ${
                    viewType === 'list' 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  aria-label="عرض قائمة"
                >
                  <List size={18} />
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* شبكة الفئات */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className={`grid gap-6 ${
            viewType === 'grid' 
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
              : 'grid-cols-1 max-w-4xl mx-auto'
          }`}
        >
          {categoriesToShow.map((category, index) => (
            <motion.div
              key={category.id}
              variants={itemVariants}
              className="group relative"
            >
              <a
                href={`/category/${category.slug}`}
                className={`block bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-primary/20 ${
                  viewType === 'list' ? 'flex items-center' : ''
                }`}
              >
                {/* صورة الفئة */}
                <div className={`relative bg-muted/50 ${
                  viewType === 'grid' ? 'aspect-square' : 'w-24 h-24 flex-shrink-0'
                }`}>
                  {category.image_url ? (
                    <img
                      src={category.image_url}
                      alt={category.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                      <Package className="h-12 w-12 text-primary/60" />
                    </div>
                  )}
                  
                  {/* تراكب عند التمرير */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white">
                      <ChevronLeft className="h-8 w-8" />
                    </div>
                  </div>
                </div>

                {/* محتوى الفئة */}
                <div className={`p-6 ${viewType === 'list' ? 'flex-1' : ''}`}>
                  <div className={`${viewType === 'list' ? 'flex items-center justify-between' : 'text-center'}`}>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                        {category.name}
                      </h3>
                      
                      {categorySettings.showProductCount && (
                        <p className="text-muted-foreground">
                          {category.product_count || 0} منتج
                        </p>
                      )}
                    </div>
                    
                    {viewType === 'list' && (
                      <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    )}
                  </div>
                </div>
              </a>
            </motion.div>
          ))}
        </motion.div>

        {/* زر عرض المزيد */}
        {categories.length > categorySettings.maxVisible && (
          <motion.div 
            className="text-center mt-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <button
              onClick={() => setShowAll(!showAll)}
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-full font-semibold hover:bg-primary/90 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <Tag className="h-5 w-5" />
              {showAll ? 'إخفاء بعض الفئات' : `عرض جميع الفئات (${categories.length})`}
            </button>
          </motion.div>
        )}

        {/* رسالة إذا لم توجد فئات حقيقية */}
        {displayCategories.length === 0 && (
          <motion.div 
            className="mt-12 mx-auto max-w-2xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <div className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200/50 dark:border-amber-800/50 rounded-2xl backdrop-blur-sm shadow-lg">
              <div className="flex items-center justify-center mb-3">
                <div className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center ml-3">
                  <Tag className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <span className="font-semibold text-amber-800 dark:text-amber-200">
                  فئات تجريبية
                </span>
              </div>
              <p className="text-amber-700 dark:text-amber-300 text-sm leading-relaxed text-center">
                هذه فئات تجريبية لعرض التصميم. يمكنك إضافة فئاتك الخاصة من لوحة التحكم.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}; 