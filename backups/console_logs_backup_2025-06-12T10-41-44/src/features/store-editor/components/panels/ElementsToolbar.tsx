import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Layers, 
  Type, 
  Square, 
  Image, 
  Layout, 
  ShoppingCart, 
  Grid3X3, 
  Clock, 
  MessageSquare, 
  Info, 
  Phone, 
  Star,
  Settings
} from 'lucide-react'
import { useEditorStore } from '../../stores/editor-store'

// أنواع البيانات للعناصر
interface StoreElementConfig {
  id: string
  name: string
  type: string
  icon: React.ElementType
  description: string
  properties: any
}

interface StoreElementCategory {
  id: string
  name: string
  icon: React.ElementType
  elements: StoreElementConfig[]
}

const storeElements: StoreElementCategory[] = [
  {
    id: 'basic',
    name: 'العناصر الأساسية',
    icon: Layers,
    elements: [
      {
        id: 'hero',
        name: 'البانر الأساسي',
        type: 'hero',
        icon: Image,
        description: 'بانر رئيسي مع صورة وعنوان وأزرار',
        properties: {
          storeSettings: {
            template: 'classic',
            title: 'أحدث المنتجات',
            description: 'تسوق أحدث منتجاتنا المختارة بعناية بأفضل الأسعار التنافسية.',
            imageUrl: 'https://images.unsplash.com/photo-1522204523234-8729aa6e3d5f?q=80&w=2070&auto=format&fit=crop',
            primaryButton: { 
              text: 'تصفح الكل', 
              link: '/products' 
            },
            secondaryButton: { 
              text: 'العروض الخاصة', 
              link: '/offers' 
            },
            primaryButtonStyle: 'primary',
            secondaryButtonStyle: 'primary',
            trustBadges: [
              { icon: 'truck', text: 'توصيل سريع' },
              { icon: 'shield', text: 'دفع آمن' },
              { icon: 'gem', text: 'جودة عالية' },
            ],
          },
        },
      },
      {
        id: 'text',
        name: 'نص',
        type: 'text',
        icon: Type,
        description: 'عنصر نص بسيط',
        properties: {
          text: 'نص تجريبي',
        },
      },
      {
        id: 'button',
        name: 'زر',
        type: 'button',
        icon: Square,
        description: 'زر قابل للنقر',
        properties: {
          text: 'اضغط هنا',
          href: '#',
        },
      },
      {
        id: 'footer',
        name: 'تذييل الصفحة',
        type: 'footer',
        icon: Layout,
        description: 'تذييل الصفحة مع الروابط',
        properties: {
          storeSettings: {
            storeName: 'متجري',
            description: 'أفضل المنتجات بأفضل الأسعار',
          },
        },
      },
      {
        id: 'section',
        name: 'قسم مخصص',
        type: 'section',
        icon: Layout,
        description: 'قسم فارغ للمحتوى المخصص',
        properties: {
          backgroundColor: '#ffffff',
          padding: '40px',
        },
      },
    ],
  },
  {
    id: 'ecommerce',
    name: 'التجارة الإلكترونية',
    icon: ShoppingCart,
    elements: [
      {
        id: 'featured_products',
        name: 'منتجات مميزة',
        type: 'featured_products',
        icon: Star,
        description: 'عرض المنتجات المميزة',
        properties: {
          storeSettings: {
            title: 'منتجات مميزة',
            description: 'اكتشف أفضل منتجاتنا',
            displayCount: 4,
            showPrices: true,
            showAddToCart: true,
          },
        },
      },
      {
        id: 'categories',
        name: 'فئات المنتجات',
        type: 'categories',
        icon: Grid3X3,
        description: 'عرض فئات المنتجات',
        properties: {
          storeSettings: {
            title: 'فئات المنتجات',
            description: 'تصفح فئاتنا المتنوعة',
            displayCount: 6,
            layout: 'grid',
          },
        },
      },
      {
        id: 'countdownoffers',
        name: 'عروض محدودة',
        type: 'countdownoffers',
        icon: Clock,
        description: 'عروض محدودة بوقت',
        properties: {
          storeSettings: {
            title: 'عروض محدودة بوقت',
            subtitle: 'استعجل قبل انتهاء العروض',
            maxItems: 3,
            showCountdown: true,
          },
        },
      },
    ],
  },
  {
    id: 'content',
    name: 'مكونات المحتوى',
    icon: Type,
    elements: [
      {
        id: 'about',
        name: 'عن المتجر',
        type: 'about',
        icon: Info,
        description: 'قسم معلومات عن المتجر',
        properties: {
          storeSettings: {
            title: 'عن متجرنا',
            description: 'نحن متخصصون في تقديم أفضل المنتجات والخدمات',
            features: [
              'جودة عالية',
              'أسعار منافسة',
              'خدمة عملاء ممتازة',
              'توصيل سريع',
            ],
          },
        },
      },
      {
        id: 'services',
        name: 'خدماتنا',
        type: 'services',
        icon: Settings,
        description: 'عرض خدمات المتجر',
        properties: {
          storeSettings: {
            title: 'خدماتنا',
            services: [
              { title: 'شحن سريع', description: 'توصيل مجاني', icon: 'truck' },
              { title: 'دفع آمن', description: 'طرق دفع متعددة', icon: 'shield' },
              { title: 'ضمان الجودة', description: 'منتجات معتمدة', icon: 'award' },
              { title: 'دعم 24/7', description: 'مساعدة متاحة', icon: 'clock' },
            ],
          },
        },
      },
      {
        id: 'contact',
        name: 'تواصل معنا',
        type: 'contact',
        icon: Phone,
        description: 'نموذج التواصل ومعلومات الاتصال',
        properties: {
          storeSettings: {
            title: 'اتصل بنا',
            description: 'نحن هنا لمساعدتك',
            showContactForm: true,
            showContactInfo: true,
            contactInfo: {
              phone: '+213 123 456 789',
              email: 'info@store.com',
              address: 'العنوان',
            },
          },
        },
      },
    ],
  },
  {
    id: 'marketing',
    name: 'التسويق',
    icon: MessageSquare,
    elements: [
      {
        id: 'testimonials',
        name: 'آراء العملاء',
        type: 'testimonials',
        icon: MessageSquare,
        description: 'عرض تقييمات وآراء العملاء',
        properties: {
          storeSettings: {
            title: 'آراء العملاء',
            description: 'ماذا يقول عملاؤنا',
            testimonials: [
              { name: 'أحمد محمد', rating: 5, comment: 'خدمة ممتازة' },
              { name: 'فاطمة علي', rating: 5, comment: 'منتجات عالية الجودة' },
            ],
          },
        },
      },
    ],
  },
]

export const ElementsToolbar = () => {
  const { createElement, isLayersPanelOpen } = useEditorStore()

  if (!isLayersPanelOpen) {
    return null
  }

  const handleAddElement = (elementConfig: StoreElementConfig) => {
    createElement({
      type: elementConfig.type as any,
      name: elementConfig.name,
      order: Date.now(),
      parentId: null,
      properties: elementConfig.properties,
      styles: {
        desktop: {},
        tablet: {},
        mobile: {},
      },
    })
  }

  return (
    <div className="w-80 bg-background border-r border-border">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold">عناصر المتجر</h2>
        <p className="text-sm text-muted-foreground">اسحب العناصر إلى الصفحة</p>
      </div>

      <ScrollArea className="h-[calc(100vh-120px)]">
        <div className="p-4 space-y-6">
          {storeElements.map((category) => (
            <div key={category.id}>
              <div className="flex items-center gap-2 mb-3">
                <category.icon className="h-4 w-4" />
                <h3 className="font-medium text-sm">{category.name}</h3>
                <Badge variant="secondary" className="text-xs">
                  {category.elements.length}
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {category.elements.map((element) => (
                  <Card
                    key={element.id}
                    className="cursor-pointer hover:shadow-md transition-shadow duration-200 border-dashed"
                    onClick={() => handleAddElement(element)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="bg-primary/10 p-2 rounded-lg">
                          <element.icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm text-right">
                            {element.name}
                          </h4>
                          <p className="text-xs text-muted-foreground text-right mt-1">
                            {element.description}
                          </p>
                        </div>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
