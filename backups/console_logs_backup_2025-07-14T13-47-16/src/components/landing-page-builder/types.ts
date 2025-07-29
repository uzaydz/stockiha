/**
 * أنواع وواجهات المكونات المستخدمة في محرر صفحات الهبوط
 */

/**
 * مكون صفحة الهبوط
 */
export interface LandingPageComponent {
  id: string;
  type: string;
  isActive: boolean;
  settings: Record<string, any>;
}

/**
 * صفحة الهبوط
 */
export interface LandingPage {
  id: string;
  name: string;
  slug: string;
  components: LandingPageComponent[];
  settings: PageSettings;
}

/**
 * إعدادات صفحة الهبوط
 */
export interface PageSettings {
  title: string;
  description: string;
  keywords: string;
  isPublished: boolean;
}

/**
 * أنواع مكونات صفحة الهبوط المدعومة
 */
export type ComponentType = 
  | 'hero' 
  | 'text' 
  | 'form' 
  | 'image' 
  | 'beforeAfter'
  | 'productBenefits'
  | 'guarantees'
  | 'productHero'
  | 'whyChooseUs'
  | 'problemSolution'
  | 'ctaButton'
  | 'testimonials';

/**
 * الحصول على إعدادات افتراضية لمكون جديد حسب نوعه
 */
export function getDefaultSettingsForType(type: ComponentType): Record<string, any> {
  switch (type) {
    case 'hero':
      return {
        title: 'عنوان ترويجي',
        subtitle: 'النص الثانوي هنا',
        buttonText: 'اشتري الآن',
        buttonLink: '#',
        imageUrl: 'https://via.placeholder.com/800x600',
        backgroundColor: '#ffffff',
        textColor: '#000000'
      };
    case 'form':
      return {
        title: 'نموذج التواصل',
        productId: null,
        formId: null,
        buttonText: 'إرسال',
        backgroundColor: '#f9f9f9'
      };
    case 'text':
      return {
        content: '<p>أدخل المحتوى النصي هنا...</p>',
        alignment: 'right',
        textColor: '#333333',
        padding: '20px'
      };
    case 'image':
      return {
        imageUrl: '',
        altText: 'صورة',
        caption: '',
        maxWidth: '100%',
        alignment: 'center',
        border: false,
        borderColor: '#000000',
        borderWidth: 1,
        borderRadius: 8,
        shadow: false,
        shadowIntensity: 'medium',
        overlay: false,
        overlayColor: '#000000',
        overlayOpacity: 50,
        onClick: 'none',
        linkUrl: ''
      };
    case 'ctaButton':
      return {
        text: 'اضغط هنا',
        variant: 'default',
        size: 'lg',
        roundness: 'lg',
        shadow: 'md',
        animation: 'none',
        effect: 'ripple',
        scrollToId: 'form-section',
        scrollOffset: 80,
        hasRipple: true,
        hasPulsingBorder: false,
        customTextColor: '#ffffff',
        customBgColor: '#3b82f6',
        customBorderColor: '#3b82f6',
        iconPosition: 'left',
        useCustomColors: false
      };
    case 'beforeAfter':
      return {
        title: 'قبل وبعد استخدام المنتج',
        description: 'شاهد النتائج المذهلة مع منتجنا',
        backgroundColor: '#ffffff',
        textColor: '#333333',
        layout: 'horizontal',
        showLabels: true,
        slidersCount: 1,
        items: [
          {
            id: crypto.randomUUID(),
            title: 'النتيجة الأولى',
            beforeImage: 'https://picsum.photos/id/237/800/600',
            beforeLabel: 'قبل',
            afterImage: 'https://picsum.photos/id/238/800/600',
            afterLabel: 'بعد',
            description: 'نتيجة مذهلة بعد استخدام المنتج لفترة قصيرة فقط.'
          }
        ]
      };
    case 'productBenefits':
      return {
        title: 'فوائد منتجنا',
        subtitle: 'اكتشف الميزات الفريدة التي تجعل منتجنا الاختيار الأمثل',
        backgroundColor: '#f8f9fa',
        textColor: '#333333',
        accentColor: '#4f46e5',
        layout: 'grid',
        columns: 3,
        showImages: true,
        imagePosition: 'top',
        animation: 'fade',
        items: [
          {
            id: crypto.randomUUID(),
            title: 'سهولة الاستخدام',
            description: 'صمم منتجنا ليكون سهل الاستخدام للجميع، بدون أي تعقيدات.',
            icon: 'Sparkles',
            iconColor: '#4f46e5',
            image: 'https://picsum.photos/id/1/300/200'
          },
          {
            id: crypto.randomUUID(),
            title: 'توفير الوقت',
            description: 'استخدم منتجنا لتوفير الوقت وزيادة الإنتاجية بشكل ملحوظ.',
            icon: 'Clock',
            iconColor: '#4f46e5',
            image: 'https://picsum.photos/id/20/300/200'
          },
          {
            id: crypto.randomUUID(),
            title: 'نتائج مضمونة',
            description: 'نتائج مضمونة مع كل استخدام، ورضا كامل أو استرداد أموالك.',
            icon: 'CheckCircle',
            iconColor: '#4f46e5',
            image: 'https://picsum.photos/id/48/300/200'
          }
        ]
      };
    case 'guarantees':
      return {
        title: 'ضمانات المنتج والإسترجاع',
        subtitle: 'نحن نثق بجودة منتجاتنا ونقدم لك هذه الضمانات',
        backgroundColor: '#f8f9fa',
        textColor: '#333333',
        accentColor: '#4f46e5',
        layout: 'grid',
        columns: 3,
        iconStyle: 'filled',
        borderStyle: 'none',
        animation: 'fade',
        items: [
          {
            id: crypto.randomUUID(),
            title: 'ضمان استرجاع لمدة 30 يوم',
            description: 'استرداد كامل للمبلغ خلال 30 يوم إذا لم تكن راضياً عن المنتج، بدون أي أسئلة.',
            icon: 'rotateCcw',
            iconColor: '#4f46e5'
          },
          {
            id: crypto.randomUUID(),
            title: 'ضمان جودة لمدة سنة',
            description: 'ضمان شامل ضد عيوب التصنيع لمدة سنة كاملة من تاريخ الشراء.',
            icon: 'shieldCheck',
            iconColor: '#4f46e5'
          },
          {
            id: crypto.randomUUID(),
            title: 'شحن مجاني وسريع',
            description: 'شحن مجاني لجميع الطلبات وتوصيل سريع خلال 3-5 أيام عمل.',
            icon: 'truck',
            iconColor: '#4f46e5'
          }
        ]
      };
    case 'productHero':
      return {
        productTitle: 'عنوان المنتج الرئيسي',
        tagline: 'شعار تسويقي مميز للمنتج',
        description: 'وصف تفصيلي للمنتج مع إبراز أهم مميزاته وفوائده للعميل',
        price: '199',
        currency: 'دج',
        oldPrice: '299',
        showDiscount: true,
        priceLabel: 'شامل الضريبة | شحن مجاني',
        primaryButtonText: 'اطلب الآن',
        primaryButtonLink: '#order-form',
        secondaryButtonText: 'تفاصيل أكثر',
        secondaryButtonLink: '#after-hero-section',
        imageUrl: '',
        imageAlt: 'صورة المنتج',
        backgroundColor: '#ffffff',
        textColor: '#111111',
        accentColor: '#0ea5e9',
        secondaryColor: '#6b7280',
        layout: 'classic',
        textAlignment: 'right',
        containerPadding: 40,
        borderRadius: 8,
        showHighlightBadge: true,
        badgeText: 'الأكثر مبيعاً',
        badgeColor: '#ef4444',
        badgePosition: 'top-right',
        useGradient: false,
        gradientStart: '#4f46e5',
        gradientEnd: '#0ea5e9',
        gradientDirection: 'to-r',
        enableShadows: true,
        enableAnimations: true
      };
    case 'whyChooseUs':
      return {
        title: 'لماذا تختار منتجنا',
        subtitle: 'مميزات فريدة تجعلنا الخيار الأمثل لك',
        backgroundColor: '#f9f8ff',
        textColor: '#333333',
        accentColor: '#8b5cf6',
        layout: 'modern',
        animation: 'fade',
        backgroundImage: '',
        useGradient: true,
        gradientStart: '#8b5cf6',
        gradientEnd: '#6366f1',
        gradientDirection: 'to-r',
        enableShadows: true,
        borderRadius: 12,
        containerPadding: 48,
        headerAlignment: 'center',
        showDivider: true,
        dividerColor: 'rgba(139, 92, 246, 0.3)',
        itemsCount: 3,
        columns: 3,
        showcaseImage: '',
        imagePosition: 'right',
        items: [
          {
            id: crypto.randomUUID(),
            title: 'جودة استثنائية',
            description: 'نحن نقدم منتجات ذات جودة عالية تتجاوز توقعاتك وتدوم طويلاً',
            icon: 'Award',
            iconColor: '#8b5cf6',
            iconBackground: 'rgba(139, 92, 246, 0.1)',
            animation: 'fade-up',
            animationDelay: 0.1
          },
          {
            id: crypto.randomUUID(),
            title: 'خبرة متميزة',
            description: 'فريقنا من الخبراء يمتلك سنوات من الخبرة في تقديم أفضل الحلول',
            icon: 'Trophy',
            iconColor: '#8b5cf6',
            iconBackground: 'rgba(139, 92, 246, 0.1)',
            animation: 'fade-up',
            animationDelay: 0.2
          },
          {
            id: crypto.randomUUID(),
            title: 'دعم متواصل',
            description: 'نحن نقدم دعم فني على مدار الساعة لضمان تجربة مثالية لعملائنا',
            icon: 'HeadphonesIcon',
            iconColor: '#8b5cf6',
            iconBackground: 'rgba(139, 92, 246, 0.1)',
            animation: 'fade-up',
            animationDelay: 0.3
          }
        ],
        testimonial: {
          enabled: true,
          quote: 'أفضل منتج استخدمته على الإطلاق. لقد غير حياتي للأفضل!',
          author: 'أحمد محمد',
          role: 'عميل سعيد',
          image: '',
          rating: 5
        }
      };
    case 'problemSolution':
      return {
        title: 'المشكلة والحل',
        subtitle: 'اكتشف كيف يمكن لمنتجنا حل مشاكلك',
        backgroundColor: '#f8f9fa',
        textColor: '#333333',
        accentColor: '#4f46e5',
        layout: 'side-by-side',
        animation: 'fade',
        showMainImage: true,
        mainImage: '',
        useGradient: true,
        gradientStart: '#4338ca',
        gradientEnd: '#3b82f6',
        gradientDirection: 'to-r',
        enableShadows: true,
        borderRadius: 12,
        containerPadding: 48,
        headerAlignment: 'center',
        items: [
          {
            id: crypto.randomUUID(),
            problemTitle: 'المشكلة',
            problemDescription: 'وصف تفصيلي للمشكلة التي يواجهها العملاء.',
            problemImage: 'https://picsum.photos/id/36/400/300',
            problemIconName: 'AlertCircle',
            problemIconColor: '#ef4444',
            solutionTitle: 'الحل',
            solutionDescription: 'كيف يقدم منتجنا حلًا مثاليًا لهذه المشكلة.',
            solutionImage: 'https://picsum.photos/id/42/400/300',
            solutionIconName: 'CheckCircle',
            solutionIconColor: '#10b981',
            animationDelay: 0.1
          },
          {
            id: crypto.randomUUID(),
            problemTitle: 'مشكلة أخرى',
            problemDescription: 'مشكلة إضافية يعاني منها العملاء بشكل متكرر.',
            problemImage: 'https://picsum.photos/id/26/400/300',
            problemIconName: 'AlertCircle',
            problemIconColor: '#ef4444',
            solutionTitle: 'حلنا المبتكر',
            solutionDescription: 'كيف يتفوق منتجنا في حل هذه المشكلة بطريقة فريدة.',
            solutionImage: 'https://picsum.photos/id/62/400/300',
            solutionIconName: 'CheckCircle',
            solutionIconColor: '#10b981',
            animationDelay: 0.2
          }
        ]
      };
    case 'testimonials':
      return {
        title: 'آراء عملائنا',
        subtitle: 'تعرف على تجارب عملائنا السابقين مع منتجاتنا وخدماتنا',
        backgroundColor: '#f8f9fa',
        textColor: '#333333',
        accentColor: '#4f46e5',
        cardsBackgroundColor: '#ffffff',
        cardsTextColor: '#333333',
        layout: 'grid',
        columns: 3,
        showRatings: true,
        showAvatars: true,
        avatarSize: 'medium',
        animation: 'fade',
        items: [
          {
            id: crypto.randomUUID(),
            name: 'أحمد محمد',
            role: 'مدير شركة',
            avatar: 'https://i.pravatar.cc/150?img=1',
            comment: 'تجربة رائعة مع المنتج، ساعدني كثيراً في تحسين أدائي اليومي وتوفير الوقت والجهد.',
            rating: 5
          },
          {
            id: crypto.randomUUID(),
            name: 'سارة علي',
            role: 'مصممة جرافيك',
            avatar: 'https://i.pravatar.cc/150?img=5',
            comment: 'من أفضل المنتجات التي استخدمتها في حياتي. سهل الاستخدام وفعال جداً.',
            rating: 4.5
          },
          {
            id: crypto.randomUUID(),
            name: 'محمد عبدالله',
            role: 'مطور برمجيات',
            avatar: 'https://i.pravatar.cc/150?img=3',
            comment: 'خدمة عملاء ممتازة، والمنتج يستحق السعر بجدارة. سأنصح به أصدقائي بالتأكيد.',
            rating: 5
          }
        ]
      };
    default:
      return {};
  }
}
