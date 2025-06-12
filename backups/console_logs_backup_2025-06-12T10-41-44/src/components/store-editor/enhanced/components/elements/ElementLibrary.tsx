import React from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Star, Truck, ShieldCheck, Gem, ArrowRight, Clock, MapPin, Phone, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ElementConfig } from '../../types'

interface ElementRendererProps {
  element: ElementConfig
  isSelected?: boolean
}

export const ElementRenderer: React.FC<ElementRendererProps> = ({
  element,
  isSelected = false,
}) => {
  const renderElement = () => {
    switch (element.type) {
      case 'hero':
        return <HeroElement element={element} />
      case 'featured_products':
        return <FeaturedProductsElement element={element} />
      case 'product_categories':
        return <ProductCategoriesElement element={element} />
      case 'testimonials':
        return <TestimonialsElement element={element} />
      case 'about':
        return <AboutElement element={element} />
      case 'services':
        return <ServicesElement element={element} />
      case 'contact':
        return <ContactElement element={element} />
      case 'footer':
        return <FooterElement element={element} />
      case 'countdownoffers':
        return <CountdownOffersElement element={element} />
      case 'newsletter':
        return <NewsletterElement element={element} />
      case 'text':
        return <TextElement element={element} />
      case 'image':
        return <ImageElement element={element} />
      case 'button':
        return <ButtonElement element={element} />
      case 'spacer':
        return <SpacerElement element={element} />
      case 'divider':
        return <DividerElement element={element} />
      default:
        return <DefaultElement element={element} />
    }
  }

  return (
    <div
      className={cn(
        "relative",
        isSelected && "ring-2 ring-primary ring-offset-2 rounded-lg",
        !element.isVisible && "opacity-50"
      )}
    >
      {renderElement()}
      
      {isSelected && (
        <div className="absolute -top-2 -left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded z-10">
          {element.name}
        </div>
      )}
    </div>
  )
}

// مكون البانر الرئيسي
const HeroElement: React.FC<{ element: ElementConfig }> = ({ element }) => {
  const props = element.properties as any
  
  const {
    title = 'أحدث المنتجات',
    description = 'تسوق أحدث منتجاتنا المختارة بعناية بأفضل الأسعار التنافسية.',
    primaryButton = { text: 'تصفح الكل', link: '/products' },
    secondaryButton = { text: 'العروض الخاصة', link: '/offers' },
    imageUrl = 'https://images.unsplash.com/photo-1522204523234-8729aa6e3d5f?q=80&w=2070&auto=format&fit=crop',
    trustBadges = [
      { id: '1', text: 'توصيل سريع', icon: 'Truck' },
      { id: '2', text: 'دفع آمن', icon: 'ShieldCheck' },
      { id: '3', text: 'جودة عالية', icon: 'Gem' }
    ]
  } = props

  const getIcon = (iconName: string) => {
    const icons = { Truck, ShieldCheck, Gem }
    return icons[iconName as keyof typeof icons] || Truck
  }

  return (
    <div className="relative bg-gradient-to-br from-blue-50 to-indigo-100 min-h-[500px] overflow-hidden">
      <div className="container mx-auto px-6 py-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* النص */}
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-4"
            >
              <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 leading-tight">
                {title}
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                {description}
              </p>
            </motion.div>

            {/* الأزرار */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Button size="lg" className="text-lg px-8 py-4">
                {primaryButton.text}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-4">
                {secondaryButton.text}
              </Button>
            </motion.div>

            {/* شارات الثقة */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-6"
            >
              {trustBadges.map((badge: any, index: number) => {
                const Icon = getIcon(badge.icon)
                return (
                  <div key={badge.id} className="flex items-center gap-2 text-gray-700">
                    <Icon className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">{badge.text}</span>
                  </div>
                )
              })}
            </motion.div>
          </div>

          {/* الصورة */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="relative"
          >
            <img
              src={imageUrl}
              alt={title}
              className="rounded-2xl shadow-2xl w-full h-auto"
            />
          </motion.div>
        </div>
      </div>
    </div>
  )
}

// مكون المنتجات المميزة
const FeaturedProductsElement: React.FC<{ element: ElementConfig }> = ({ element }) => {
  const props = element.properties as any
  
  const {
    title = 'منتجاتنا المميزة',
    description = 'اكتشف أفضل منتجاتنا المختارة بعناية لتناسب احتياجاتك',
    displayCount = 4
  } = props

  // منتجات تجريبية
  const products = [
    {
      id: '1',
      name: 'هاتف ذكي متقدم',
      price: 50000,
      originalPrice: 60000,
      image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400',
      rating: 4.8,
      reviews: 156
    },
    {
      id: '2',
      name: 'لابتوب عالي الأداء',
      price: 120000,
      originalPrice: 140000,
      image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400',
      rating: 4.9,
      reviews: 89
    },
    {
      id: '3',
      name: 'سماعات لاسلكية',
      price: 15000,
      originalPrice: 20000,
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
      rating: 4.7,
      reviews: 203
    },
    {
      id: '4',
      name: 'ساعة ذكية',
      price: 25000,
      originalPrice: 30000,
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
      rating: 4.6,
      reviews: 127
    }
  ].slice(0, displayCount)

  return (
    <div className="py-16 bg-white">
      <div className="container mx-auto px-6">
        {/* الرأس */}
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {title}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {description}
          </p>
        </div>

        {/* المنتجات */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden group"
            >
              <div className="relative overflow-hidden">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {product.originalPrice > product.price && (
                  <Badge className="absolute top-4 right-4 bg-red-500">
                    وفر {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                  </Badge>
                )}
              </div>
              
              <div className="p-6">
                <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2">
                  {product.name}
                </h3>
                
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "w-4 h-4",
                          i < Math.floor(product.rating) ? "text-yellow-400 fill-current" : "text-gray-300"
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-500">({product.reviews})</span>
                </div>
                
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl font-bold text-blue-600">
                    {product.price.toLocaleString('ar-DZ')} د.ج
                  </span>
                  {product.originalPrice > product.price && (
                    <span className="text-lg text-gray-500 line-through">
                      {product.originalPrice.toLocaleString('ar-DZ')} د.ج
                    </span>
                  )}
                </div>
                
                <Button className="w-full">
                  أضف للسلة
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* زر عرض المزيد */}
        <div className="text-center mt-12">
          <Button variant="outline" size="lg">
            عرض جميع المنتجات
            <ArrowRight className="mr-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// مكون فئات المنتجات
const ProductCategoriesElement: React.FC<{ element: ElementConfig }> = ({ element }) => {
  const props = element.properties as any
  
  const {
    title = 'تصفح فئات منتجاتنا',
    description = 'أفضل الفئات المختارة لتلبية احتياجاتك',
    displayCount = 6
  } = props

  const categories = [
    {
      id: '1',
      name: 'الهواتف الذكية',
      image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400',
      productCount: 45
    },
    {
      id: '2',
      name: 'أجهزة الكمبيوتر',
      image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400',
      productCount: 32
    },
    {
      id: '3',
      name: 'الإكسسوارات',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
      productCount: 78
    },
    {
      id: '4',
      name: 'الساعات الذكية',
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
      productCount: 23
    },
    {
      id: '5',
      name: 'الأجهزة المنزلية',
      image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400',
      productCount: 41
    },
    {
      id: '6',
      name: 'الكاميرات',
      image: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400',
      productCount: 19
    }
  ].slice(0, displayCount)

  return (
    <div className="py-16 bg-gray-50">
      <div className="container mx-auto px-6">
        {/* الرأس */}
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {title}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {description}
          </p>
        </div>

        {/* الفئات */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {categories.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer"
            >
              <div className="relative overflow-hidden h-48">
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black bg-opacity-40 group-hover:bg-opacity-30 transition-all duration-300" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <h3 className="text-2xl font-bold mb-2">{category.name}</h3>
                    <p className="text-lg opacity-90">{category.productCount} منتج</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

// المكونات الأخرى (مبسطة للمساحة)
const TestimonialsElement: React.FC<{ element: ElementConfig }> = ({ element }) => (
  <div className="py-16 bg-blue-50">
    <div className="container mx-auto px-6 text-center">
      <h2 className="text-3xl font-bold mb-8">آراء عملائنا</h2>
      <p className="text-gray-600">تجارب حقيقية من عملائنا الكرام</p>
    </div>
  </div>
)

const AboutElement: React.FC<{ element: ElementConfig }> = ({ element }) => (
  <div className="py-16 bg-white">
    <div className="container mx-auto px-6 text-center">
      <h2 className="text-3xl font-bold mb-8">عن متجرنا</h2>
      <p className="text-gray-600">نحن متجر إلكترونيات متخصص في أحدث التقنيات</p>
    </div>
  </div>
)

const ServicesElement: React.FC<{ element: ElementConfig }> = ({ element }) => (
  <div className="py-16 bg-gray-50">
    <div className="container mx-auto px-6 text-center">
      <h2 className="text-3xl font-bold mb-8">خدماتنا</h2>
      <p className="text-gray-600">نقدم خدمات متنوعة لتلبية جميع احتياجاتكم</p>
    </div>
  </div>
)

const ContactElement: React.FC<{ element: ElementConfig }> = ({ element }) => (
  <div className="py-16 bg-white">
    <div className="container mx-auto px-6 text-center">
      <h2 className="text-3xl font-bold mb-8">تواصل معنا</h2>
      <div className="flex justify-center gap-8">
        <div className="flex items-center gap-2">
          <Phone className="w-5 h-5 text-blue-600" />
          <span>0540240886</span>
        </div>
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-blue-600" />
          <span>info@stockiha.com</span>
        </div>
      </div>
    </div>
  </div>
)

const FooterElement: React.FC<{ element: ElementConfig }> = ({ element }) => (
  <footer className="bg-gray-900 text-white py-12">
    <div className="container mx-auto px-6 text-center">
      <h3 className="text-2xl font-bold mb-4">Stockiha</h3>
      <p className="text-gray-400 mb-8">مع سطوكيها... كلشي فبلاصتو!</p>
      <p className="text-gray-500">© 2024 جميع الحقوق محفوظة</p>
    </div>
  </footer>
)

const CountdownOffersElement: React.FC<{ element: ElementConfig }> = ({ element }) => (
  <div className="py-16 bg-red-50">
    <div className="container mx-auto px-6 text-center">
      <h2 className="text-3xl font-bold mb-8 text-red-600">عروض محدودة الوقت</h2>
      <div className="flex justify-center gap-4">
        <div className="bg-red-600 text-white p-4 rounded-lg">
          <div className="text-2xl font-bold">24</div>
          <div className="text-sm">ساعة</div>
        </div>
        <div className="bg-red-600 text-white p-4 rounded-lg">
          <div className="text-2xl font-bold">15</div>
          <div className="text-sm">دقيقة</div>
        </div>
      </div>
    </div>
  </div>
)

const NewsletterElement: React.FC<{ element: ElementConfig }> = ({ element }) => (
  <div className="py-16 bg-blue-600 text-white">
    <div className="container mx-auto px-6 text-center">
      <h2 className="text-3xl font-bold mb-4">النشرة البريدية</h2>
      <p className="mb-8">اشترك للحصول على آخر العروض والمنتجات الجديدة</p>
      <div className="max-w-md mx-auto flex gap-4">
        <input
          type="email"
          placeholder="بريدك الإلكتروني"
          className="flex-1 px-4 py-2 rounded-lg text-gray-900"
        />
        <Button variant="secondary">اشتراك</Button>
      </div>
    </div>
  </div>
)

const TextElement: React.FC<{ element: ElementConfig }> = ({ element }) => {
  const props = element.properties as any
  return (
    <div className="py-8">
      <p className="text-gray-900">{props.text || 'نص تجريبي'}</p>
    </div>
  )
}

const ImageElement: React.FC<{ element: ElementConfig }> = ({ element }) => {
  const props = element.properties as any
  return (
    <div className="py-8">
      <img
        src={props.src || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=200&fit=crop'}
        alt={props.alt || 'صورة'}
        className="w-full h-auto rounded-lg"
      />
    </div>
  )
}

const ButtonElement: React.FC<{ element: ElementConfig }> = ({ element }) => {
  const props = element.properties as any
  return (
    <div className="py-8 text-center">
      <Button>{props.text || 'انقر هنا'}</Button>
    </div>
  )
}

const SpacerElement: React.FC<{ element: ElementConfig }> = ({ element }) => {
  const props = element.properties as any
  return <div style={{ height: props.height || '50px' }} />
}

const DividerElement: React.FC<{ element: ElementConfig }> = ({ element }) => (
  <div className="py-8">
    <hr className="border-gray-300" />
  </div>
)

const DefaultElement: React.FC<{ element: ElementConfig }> = ({ element }) => (
  <div className="py-8 text-center">
    <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8">
      <div className="text-4xl mb-4">📦</div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{element.name}</h3>
      <p className="text-gray-500">مكون {element.type}</p>
    </div>
  </div>
)
