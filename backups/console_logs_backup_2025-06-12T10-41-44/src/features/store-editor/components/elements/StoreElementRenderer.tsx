import React from 'react'
import { ElementConfig } from '../../types/editor.types'
import { HeroElement } from './HeroElement'

// مكونات المتجر الافتراضية للمعاينة
const FeaturedProductsPreview: React.FC<{ element: ElementConfig }> = ({ element }) => {
  const settings = element.properties.storeSettings as any
  return (
    <div className="bg-white p-6 rounded-lg border">
      <h2 className="text-2xl font-bold mb-4 text-center">{settings?.title || 'منتجات مميزة'}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-lg p-4 text-center">
            <div className="aspect-square bg-gray-200 rounded-lg mb-3"></div>
            <h3 className="font-semibold">منتج {i}</h3>
            <p className="text-gray-600">100 ريال</p>
          </div>
        ))}
      </div>
    </div>
  )
}

const CategoriesPreview: React.FC<{ element: ElementConfig }> = ({ element }) => {
  const settings = element.properties.storeSettings as any
  return (
    <div className="bg-white p-6 rounded-lg border">
      <h2 className="text-2xl font-bold mb-4 text-center">{settings?.title || 'فئات المنتجات'}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['الإلكترونيات', 'الملابس', 'المنزل', 'الكتب'].map((category, i) => (
          <div key={i} className="text-center">
            <div className="aspect-square bg-gray-200 rounded-lg mb-2"></div>
            <p className="font-medium">{category}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

const CountdownOffersPreview: React.FC<{ element: ElementConfig }> = ({ element }) => {
  const settings = element.properties.storeSettings as any
  return (
    <div className="bg-red-50 p-6 rounded-lg border border-red-200">
      <h2 className="text-2xl font-bold mb-4 text-center text-red-800">{settings?.title || 'عروض محدودة'}</h2>
      <div className="text-center">
        <div className="text-4xl font-bold text-red-600 mb-2">23:59:45</div>
        <p className="text-red-700">متبقي على انتهاء العرض</p>
      </div>
    </div>
  )
}

const TestimonialsPreview: React.FC<{ element: ElementConfig }> = ({ element }) => {
  const settings = element.properties.storeSettings as any
  return (
    <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
      <h2 className="text-2xl font-bold mb-4 text-center">{settings?.title || 'آراء العملاء'}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white p-4 rounded-lg">
            <div className="flex items-center mb-2">
              <div className="w-10 h-10 bg-gray-300 rounded-full mr-3"></div>
              <div>
                <p className="font-semibold">عميل {i}</p>
                <div className="text-yellow-500">★★★★★</div>
              </div>
            </div>
            <p className="text-gray-600">تجربة رائعة مع المتجر...</p>
          </div>
        ))}
      </div>
    </div>
  )
}

const AboutPreview: React.FC<{ element: ElementConfig }> = ({ element }) => {
  const settings = element.properties.storeSettings as any
  return (
    <div className="bg-gray-50 p-6 rounded-lg border">
      <h2 className="text-2xl font-bold mb-4 text-center">{settings?.title || 'عن المتجر'}</h2>
      <div className="grid md:grid-cols-2 gap-6 items-center">
        <div>
          <p className="text-gray-600 mb-4">
            {settings?.content || 'نحن متجر متخصص في تقديم أفضل المنتجات بجودة عالية وأسعار مناسبة...'}
          </p>
        </div>
        <div className="aspect-video bg-gray-200 rounded-lg"></div>
      </div>
    </div>
  )
}

const ServicesPreview: React.FC<{ element: ElementConfig }> = ({ element }) => {
  const settings = element.properties.storeSettings as any
  return (
    <div className="bg-green-50 p-6 rounded-lg border border-green-200">
      <h2 className="text-2xl font-bold mb-4 text-center">{settings?.title || 'خدماتنا'}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['توصيل سريع', 'دفع آمن', 'ضمان الجودة'].map((service, i) => (
          <div key={i} className="text-center p-4">
            <div className="w-12 h-12 bg-green-500 rounded-full mx-auto mb-2"></div>
            <p className="font-semibold">{service}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

const ContactPreview: React.FC<{ element: ElementConfig }> = ({ element }) => {
  const settings = element.properties.storeSettings as any
  return (
    <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
      <h2 className="text-2xl font-bold mb-4 text-center">{settings?.title || 'تواصل معنا'}</h2>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <p className="mb-2"><strong>البريد الإلكتروني:</strong> {settings?.email || 'info@store.com'}</p>
          <p className="mb-2"><strong>الهاتف:</strong> 123456789</p>
          <p><strong>العنوان:</strong> الرياض، المملكة العربية السعودية</p>
        </div>
        <div className="space-y-2">
          <input className="w-full p-2 border rounded" placeholder="الاسم" />
          <input className="w-full p-2 border rounded" placeholder="البريد الإلكتروني" />
          <textarea className="w-full p-2 border rounded" rows={3} placeholder="الرسالة"></textarea>
          <button className="bg-purple-600 text-white px-4 py-2 rounded">إرسال</button>
        </div>
      </div>
    </div>
  )
}

const FooterPreview: React.FC<{ element: ElementConfig }> = ({ element }) => {
  const settings = element.properties.storeSettings as any
  return (
    <div className="bg-gray-800 text-white p-6 rounded-lg">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <h3 className="font-bold mb-2">عن المتجر</h3>
          <p className="text-gray-300 text-sm">متجر إلكتروني متخصص في تقديم أفضل المنتجات</p>
        </div>
        <div>
          <h3 className="font-bold mb-2">روابط سريعة</h3>
          <ul className="text-gray-300 text-sm space-y-1">
            <li>الصفحة الرئيسية</li>
            <li>المنتجات</li>
            <li>من نحن</li>
            <li>تواصل معنا</li>
          </ul>
        </div>
        <div>
          <h3 className="font-bold mb-2">تابعنا</h3>
          <div className="flex gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded"></div>
            <div className="w-8 h-8 bg-blue-400 rounded"></div>
            <div className="w-8 h-8 bg-pink-500 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

const DefaultPreview: React.FC<{ element: ElementConfig }> = ({ element }) => {
  return (
    <div className="bg-gray-50 p-6 rounded-lg border border-dashed border-gray-300">
      <div className="text-center text-gray-500">
        <h3 className="font-semibold mb-2">عنصر غير معروف</h3>
        <p className="text-sm">نوع العنصر: {element.type}</p>
        <p className="text-sm">الاسم: {element.name}</p>
      </div>
    </div>
  )
}

interface StoreElementRendererProps {
  element: ElementConfig
  isSelected?: boolean
  onEdit?: () => void
  onSelect?: () => void
}

export const StoreElementRenderer: React.FC<StoreElementRendererProps> = ({
  element,
  isSelected = false,
  onEdit,
  onSelect,
}) => {
  // تحديد المكون المناسب بناءً على نوع العنصر
  const renderElement = () => {
    switch (element.type) {
      case 'hero':
        return (
          <HeroElement
            element={element}
            isSelected={isSelected}
            onEdit={onEdit}
            onSelect={onSelect}
          />
        )
      case 'featured_products':
        return <FeaturedProductsPreview element={element} />
      case 'categories':
      case 'product_categories':
        return <CategoriesPreview element={element} />
      case 'countdownoffers':
        return <CountdownOffersPreview element={element} />
      case 'testimonials':
        return <TestimonialsPreview element={element} />
      case 'about':
        return <AboutPreview element={element} />
      case 'services':
        return <ServicesPreview element={element} />
      case 'contact':
        return <ContactPreview element={element} />
      case 'footer':
        return <FooterPreview element={element} />
      default:
        return <DefaultPreview element={element} />
    }
  }

  // للعناصر غير الـ hero، نطبق معالجات التحديد العادية
  if (element.type !== 'hero') {
    return (
      <div
        className={`relative cursor-pointer transition-all duration-200 ${
          isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
        }`}
        onClick={(e) => {
          e.stopPropagation()
          onSelect?.()
        }}
        onDoubleClick={(e) => {
          e.stopPropagation()
          onEdit?.()
        }}
      >
        {renderElement()}
        {isSelected && (
          <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium">
            تم التحديد
          </div>
        )}
      </div>
    )
  }

  // لعنصر الـ hero، يتم التعامل مع التحديد داخل المكون نفسه
  return renderElement()
}
