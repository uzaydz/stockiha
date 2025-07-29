import React from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  Type, 
  Square, 
  Layout, 
  Layers, 
  ShoppingBag, 
  MessageSquare, 
  Info, 
  Image,
  Clock,
  Star,
  PhoneCall,
  Grid3x3,
  Crown,
  Timer,
  Award,
  Truck,
  Users
} from 'lucide-react'
import { useEditorStore } from '../../stores/editor-store'
import { ElementConfig, ElementType } from '../../types/editor.types'

const storeElementTypes = [
  // المكونات الأساسية
  {
    type: 'hero' as ElementType,
    label: 'البانر الرئيسي',
    icon: Layout,
    category: 'basic',
    popular: true,
    defaultProps: {
      text: 'أحدث المنتجات'
    },
    defaultStyles: {
      desktop: {
        backgroundColor: '#3b82f6',
        color: '#ffffff',
        padding: '64px 32px',
        textAlign: 'center' as const,
        borderRadius: '12px',
        fontSize: '32px',
        fontWeight: 'bold',
        backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }
    },
    storeSettings: {
      title: 'أحدث المنتجات',
      imageUrl: 'https://images.unsplash.com/photo-1522204523234-8729aa6e3d5f?q=80&w=2070&auto=format&fit=crop',
      description: 'تسوق أحدث منتجاتنا المختارة بعناية بأفضل الأسعار التنافسية.',
      trustBadges: [
        { id: '1', icon: 'Truck', text: 'توصيل سريع' },
        { id: '2', icon: 'ShieldCheck', text: 'دفع آمن' },
        { id: '3', icon: 'Gem', text: 'جودة عالية' }
      ],
      primaryButton: { link: '/products', text: 'تصفح الكل' },
      secondaryButton: { link: '/offers', text: 'العروض الخاصة' },
      primaryButtonStyle: 'primary',
      secondaryButtonStyle: 'primary'
    }
  },
  {
    type: 'text' as ElementType,
    label: 'نص',
    icon: Type,
    category: 'basic',
    defaultProps: {
      text: 'نص جديد'
    },
    defaultStyles: {
      desktop: {
        fontSize: '16px',
        color: '#000000',
        textAlign: 'right' as const,
        padding: '8px',
      }
    }
  },
  {
    type: 'button' as ElementType,
    label: 'زر',
    icon: Square,
    category: 'basic',
    defaultProps: {
      text: 'انقر هنا'
    },
    defaultStyles: {
      desktop: {
        backgroundColor: '#3b82f6',
        color: '#ffffff',
        borderRadius: '8px',
        padding: '12px 24px',
        fontSize: '14px',
        fontWeight: '500',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'center' as const,
      }
    }
  },

  // مكونات التجارة الإلكترونية
  {
    type: 'featured_products' as ElementType,
    label: 'المنتجات المميزة',
    icon: Crown,
    category: 'commerce',
    popular: true,
    defaultProps: {},
    defaultStyles: {
      desktop: {
        padding: '32px',
        backgroundColor: '#ffffff',
      }
    },
    storeSettings: {
      title: 'منتجاتنا المميزة',
      description: 'اكتشف أفضل منتجاتنا المختارة بعناية لتناسب احتياجاتك',
      displayType: 'grid',
      displayCount: 4,
      selectionCriteria: 'featured'
    }
  },
  {
    type: 'categories' as ElementType,
    label: 'فئات المنتجات',
    icon: Grid3x3,
    category: 'commerce',
    popular: true,
    defaultProps: {},
    defaultStyles: {
      desktop: {
        padding: '32px',
        backgroundColor: '#f9fafb',
      }
    },
    storeSettings: {
      title: 'تصفح فئات منتجاتنا',
      description: 'أفضل الفئات المختارة لتلبية احتياجاتك',
      displayType: 'grid',
      displayCount: 6
    }
  },
  {
    type: 'countdownoffers' as ElementType,
    label: 'عروض محدودة بوقت',
    icon: Timer,
    category: 'commerce',
    defaultProps: {},
    defaultStyles: {
      desktop: {
        padding: '32px',
        backgroundColor: '#fef3c7',
        borderRadius: '12px',
      }
    },
    storeSettings: {
      theme: 'light',
      title: 'عروض محدودة بوقت',
      layout: 'grid',
      offers: [],
      currency: 'دج',
      maxItems: 3,
      subtitle: 'تسوق الآن قبل انتهاء العروض الحصرية',
      buttonText: 'تسوق الآن',
      viewAllUrl: '/offers',
      showViewAll: false
    }
  },

  // مكونات المحتوى
  {
    type: 'about' as ElementType,
    label: 'عن المتجر',
    icon: Info,
    category: 'content',
    defaultProps: {},
    defaultStyles: {
      desktop: {
        padding: '32px',
        backgroundColor: '#ffffff',
      }
    },
    storeSettings: {
      image: 'https://images.unsplash.com/photo-1612690669207-fed642192c40?q=80&w=1740',
      title: 'عن متجرنا',
      features: [
        'منتجات أصلية بضمان الوكيل',
        'شحن سريع لجميع مناطق الجزائر',
        'دعم فني متخصص',
        'خدمة ما بعد البيع'
      ],
      subtitle: 'متجر إلكتروني موثوق به منذ سنوات',
      storeInfo: {
        branches: 2,
        yearFounded: 2022,
        productsCount: 150,
        customersCount: 500
      },
      description: 'تأسس متجرنا بهدف تقديم منتجات عالية الجودة وخدمات متميزة للعملاء.'
    }
  },
  {
    type: 'services' as ElementType,
    label: 'الخدمات',
    icon: Truck,
    category: 'content',
    defaultProps: {},
    defaultStyles: {
      desktop: {
        padding: '32px',
        backgroundColor: '#f8fafc',
      }
    },
    storeSettings: {
      title: 'خدماتنا المميزة',
      services: [
        {
          id: '1',
          icon: 'Truck',
          title: 'شحن سريع',
          description: 'توصيل مجاني للطلبات +5000 د.ج'
        },
        {
          id: '2',
          icon: 'CreditCard',
          title: 'دفع آمن',
          description: 'طرق دفع متعددة 100% آمنة'
        },
        {
          id: '3',
          icon: 'Heart',
          title: 'ضمان الجودة',
          description: 'منتجات عالية الجودة معتمدة'
        },
        {
          id: '4',
          icon: 'ShieldCheck',
          title: 'دعم 24/7',
          description: 'مساعدة متوفرة طول اليوم'
        }
      ]
    }
  },
  {
    type: 'contact' as ElementType,
    label: 'اتصل بنا',
    icon: PhoneCall,
    category: 'content',
    defaultProps: {},
    defaultStyles: {
      desktop: {
        padding: '32px',
        backgroundColor: '#ffffff',
      }
    },
    storeSettings: {
      title: 'تواصل معنا',
      description: 'نحن هنا لمساعدتك في أي استفسار',
      showContactForm: true,
      showContactInfo: true,
      contactInfo: {
        phone: '+213 123 456 789',
        email: 'info@store.com',
        address: 'الجزائر العاصمة، الجزائر'
      }
    }
  },

  // مكونات التسويق
  {
    type: 'testimonials' as ElementType,
    label: 'آراء العملاء',
    icon: Users,
    category: 'marketing',
    defaultProps: {},
    defaultStyles: {
      desktop: {
        padding: '32px',
        backgroundColor: '#f1f5f9',
      }
    },
    storeSettings: {
      title: 'ماذا يقول عملاؤنا',
      description: 'تجارب حقيقية من عملائنا الكرام',
      testimonials: [
        {
          id: '1',
          name: 'أحمد محمد',
          rating: 5,
          comment: 'خدمة ممتازة ومنتجات عالية الجودة',
          avatar: '/placeholder-avatar.jpg'
        },
        {
          id: '2',
          name: 'فاطمة علي',
          rating: 5,
          comment: 'تسوق آمن وتوصيل سريع',
          avatar: '/placeholder-avatar.jpg'
        }
      ]
    }
  },

  // مكونات أساسية إضافية
  {
    type: 'footer' as ElementType,
    label: 'فوتر المتجر',
    icon: Layout,
    category: 'basic',
    defaultProps: {},
    defaultStyles: {
      desktop: {
        backgroundColor: '#1f2937',
        color: '#ffffff',
        padding: '32px',
      }
    },
    storeSettings: {
      storeName: 'متجرك الإلكتروني',
      description: 'أفضل المنتجات بأفضل الأسعار',
      socialLinks: {
        facebook: '',
        twitter: '',
        instagram: '',
        youtube: ''
      },
      footerSections: [
        {
          id: '1',
          title: 'روابط سريعة',
          links: [
            { id: '1-1', text: 'الصفحة الرئيسية', url: '/', isExternal: false },
            { id: '1-2', text: 'المنتجات', url: '/products', isExternal: false },
            { id: '1-3', text: 'اتصل بنا', url: '/contact', isExternal: false }
          ]
        }
      ],
      showSocialLinks: true,
      showContactInfo: true,
      showFeatures: true,
      showNewsletter: true
    }
  },

  // مكونات عامة
  {
    type: 'section' as ElementType,
    label: 'قسم مخصص',
    icon: Layers,
    category: 'basic',
    defaultProps: {},
    defaultStyles: {
      desktop: {
        padding: '32px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        minHeight: '200px',
      }
    }
  }
]

// تصنيف المكونات
const categories = {
  basic: {
    label: 'أساسي',
    color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
  },
  content: {
    label: 'محتوى',
    color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400'
  },
  commerce: {
    label: 'تجارة إلكترونية',
    color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
  },
  marketing: {
    label: 'تسويق',
    color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'
  }
}

export const ElementsToolbar = () => {
  const { createElement, currentPage } = useEditorStore()

  const handleAddElement = (elementType: ElementType) => {
    if (!currentPage) return

    const elementDef = storeElementTypes.find(el => el.type === elementType)
    if (!elementDef) return

    const newElement: Omit<ElementConfig, 'id' | 'createdAt' | 'updatedAt'> = {
      type: elementType,
      name: elementDef.label,
      properties: { 
        ...elementDef.defaultProps,
        // إضافة إعدادات المتجر إذا كانت موجودة
        ...(elementDef.storeSettings && { storeSettings: elementDef.storeSettings })
      },
      styles: elementDef.defaultStyles,
      order: currentPage.elements.length,
      parentId: null,
    }

    const elementId = createElement(newElement)
  }

  // تجميع العناصر حسب الفئة
  const getElementsByCategory = (category: string) => {
    return storeElementTypes.filter(el => el.category === category)
  }

  // العناصر الشائعة
  const popularElements = storeElementTypes.filter(el => el.popular)

  return (
    <div className="flex flex-col gap-4 p-4 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 w-80 max-h-full overflow-y-auto">
      <div className="sticky top-0 bg-white dark:bg-gray-800 pb-2 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
          عناصر المتجر
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          أضف وخصص عناصر متجرك الإلكتروني
        </p>
      </div>

      {/* العناصر الشائعة */}
      {popularElements.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500" />
            الأكثر استخداماً
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {popularElements.map((element) => {
              const IconComponent = element.icon
              return (
                <Tooltip key={element.type}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-20 flex flex-col gap-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-dashed border-2"
                      onClick={() => handleAddElement(element.type)}
                    >
                      <div className={`p-2 rounded-lg ${categories[element.category].color}`}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-medium text-center leading-tight">
                        {element.label}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>إضافة {element.label}</p>
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        </div>
      )}

      {/* العناصر مقسمة حسب الفئات */}
      {Object.entries(categories).map(([categoryKey, categoryInfo]) => {
        const categoryElements = getElementsByCategory(categoryKey)
        if (categoryElements.length === 0) return null

        return (
          <div key={categoryKey} className="space-y-3">
            <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <div className={`p-1 rounded ${categoryInfo.color}`}>
                <Layers className="w-3 h-3" />
              </div>
              {categoryInfo.label}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {categoryElements.map((element) => {
                const IconComponent = element.icon
                return (
                  <Tooltip key={element.type}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-20 flex flex-col gap-1 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        onClick={() => handleAddElement(element.type)}
                      >
                        <div className={`p-2 rounded-lg ${categoryInfo.color}`}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-medium text-center leading-tight">
                          {element.label}
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <p>إضافة {element.label}</p>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* نصائح الاستخدام */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <h4 className="font-medium text-xs text-gray-700 dark:text-gray-300">
          💡 نصائح سريعة
        </h4>
        <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <li>• اضغط على العنصر لتحديده وتخصيصه</li>
          <li>• اضغط مرتين على النص للتحرير المباشر</li>
          <li>• اسحب العناصر لإعادة ترتيبها</li>
          <li>• استخدم لوحة الخصائص لتخصيص التصميم</li>
        </ul>
      </div>
    </div>
  )
}
