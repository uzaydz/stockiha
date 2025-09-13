import { z } from 'zod';

// أنواع المكونات المختلفة للوصف المتقدم
export type AdvancedDescriptionComponentType = 
  | 'image' 
  | 'slideshow' 
  | 'gif' 
  | 'video'
  | 'reviews' 
  | 'text' 
  | 'features'
  | 'specifications'
  | 'before-after'
  | 'gallery'
  | 'price'
  | 'quantity'
  | 'buy-now';

// مكون الصورة الواحدة
export const imageComponentSchema = z.object({
  id: z.string(),
  type: z.literal('image'),
  data: z.object({
    url: z.string(),
    alt: z.string().optional(),
    caption: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    alignment: z.enum(['left', 'center', 'right']).default('center'),
    borderRadius: z.number().default(8),
    shadow: z.boolean().default(true),
    // خيارات الحجم الجديدة
    sizeMode: z.enum(['custom', 'responsive', 'full-width', 'contain', 'cover']).default('responsive'),
    maxWidth: z.number().optional(),
    maxHeight: z.number().optional(),
    aspectRatio: z.enum(['auto', '1:1', '4:3', '16:9', '3:2']).default('auto'),
    // خيارات ملء الشاشة
    fitMode: z.enum(['contain', 'cover', 'fill', 'none', 'scale-down']).default('contain'),
    objectPosition: z.enum(['center', 'top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right']).default('center'),
  }),
  order: z.number(),
  settings: z.object({
    showCaption: z.boolean().default(true),
    clickToEnlarge: z.boolean().default(true),
    lazyLoad: z.boolean().default(true),
    // إعدادات إضافية للعرض
    responsiveBreakpoints: z.object({
      mobile: z.number().default(100),
      tablet: z.number().default(80),
      desktop: z.number().default(60),
    }).default({
      mobile: 100,
      tablet: 80,
      desktop: 60,
    }),
    enableLightbox: z.boolean().default(true),
    lightboxZoom: z.boolean().default(true),
  }),
});

// مكون السلايد شو
export const slideshowComponentSchema = z.object({
  id: z.string(),
  type: z.literal('slideshow'),
  data: z.object({
    images: z.array(z.object({
      url: z.string(),
      alt: z.string().optional(),
      caption: z.string().optional(),
    })),
    autoPlay: z.boolean().default(true),
    autoPlayInterval: z.number().default(5000),
    showDots: z.boolean().default(true),
    showArrows: z.boolean().default(true),
    loop: z.boolean().default(true),
  }),
  order: z.number(),
  settings: z.object({
    height: z.number().default(400),
    borderRadius: z.number().default(12),
    transitionEffect: z.enum(['slide', 'fade']).default('slide'),
  }),
});

// مكون الـ GIF
export const gifComponentSchema = z.object({
  id: z.string(),
  type: z.literal('gif'),
  data: z.object({
    url: z.string(),
    alt: z.string().optional(),
    caption: z.string().optional(),
    autoPlay: z.boolean().default(true),
  }),
  order: z.number(),
  settings: z.object({
    maxWidth: z.number().default(500),
    alignment: z.enum(['left', 'center', 'right']).default('center'),
    borderRadius: z.number().default(8),
    controls: z.boolean().default(true),
  }),
});

// مكون الفيديو
export const videoComponentSchema = z.object({
  id: z.string(),
  type: z.literal('video'),
  data: z.object({
    url: z.string(),
    thumbnail: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    autoPlay: z.boolean().default(false),
    loop: z.boolean().default(false),
    muted: z.boolean().default(true),
  }),
  order: z.number(),
  settings: z.object({
    controls: z.boolean().default(true),
    aspectRatio: z.enum(['16:9', '4:3', '1:1']).default('16:9'),
    borderRadius: z.number().default(8),
  }),
});

// مكون آراء العملاء
export const reviewsComponentSchema = z.object({
  id: z.string(),
  type: z.literal('reviews'),
  data: z.object({
    reviews: z.array(z.object({
      id: z.string(),
      customerName: z.string(),
      customerAvatar: z.string().optional(),
      rating: z.number().min(1).max(5),
      comment: z.string(),
      date: z.string(),
      verified: z.boolean().default(false),
    })),
    title: z.string().default('آراء العملاء'),
    showAverageRating: z.boolean().default(true),
  }),
  order: z.number(),
  settings: z.object({
    layout: z.enum(['grid', 'list', 'slider']).default('grid'),
    showPhotos: z.boolean().default(true),
    maxReviews: z.number().default(6),
    showVerificationBadge: z.boolean().default(true),
  }),
});

// مكون النص المنسق
export const textComponentSchema = z.object({
  id: z.string(),
  type: z.literal('text'),
  data: z.object({
    content: z.string(),
    title: z.string().optional(),
  }),
  order: z.number(),
  settings: z.object({
    fontSize: z.enum(['sm', 'base', 'lg', 'xl']).default('base'),
    alignment: z.enum(['left', 'center', 'right']).default('right'),
    backgroundColor: z.string().optional(),
    textColor: z.string().optional(),
    padding: z.number().default(16),
    borderRadius: z.number().default(8),
  }),
});

// مكون المميزات
export const featuresComponentSchema = z.object({
  id: z.string(),
  type: z.literal('features'),
  data: z.object({
    title: z.string().default('مميزات المنتج'),
    features: z.array(z.object({
      id: z.string(),
      title: z.string(),
      description: z.string().optional(),
      icon: z.string().optional(),
      highlighted: z.boolean().default(false),
    })),
  }),
  order: z.number(),
  settings: z.object({
    layout: z.enum(['grid', 'list']).default('grid'),
    columns: z.number().min(1).max(4).default(2),
    showIcons: z.boolean().default(true),
    backgroundColor: z.string().optional(),
  }),
});

// مكون المواصفات
export const specificationsComponentSchema = z.object({
  id: z.string(),
  type: z.literal('specifications'),
  data: z.object({
    title: z.string().default('المواصفات التقنية'),
    subtitle: z.string().optional(),
    layoutType: z.enum(['simple', 'categorized', 'table']).default('simple'),
    specifications: z.array(z.object({
      id: z.string(),
      name: z.string(),
      value: z.string(),
      unit: z.string().optional(),
      description: z.string().optional(),
      category: z.string().optional(),
    })),
    categories: z.array(z.object({
      id: z.string(),
      name: z.string(),
      specifications: z.array(z.object({
        name: z.string(),
        value: z.string(),
        unit: z.string().optional(),
      })),
    })).default([]),
  }),
  order: z.number(),
  settings: z.object({
    layout: z.enum(['table', 'cards']).default('table'),
    showCategories: z.boolean().default(true),
    alternatingRows: z.boolean().default(true),
    showUnits: z.boolean().default(true),
    showDescriptions: z.boolean().default(true),
    alternatingColors: z.boolean().default(true),
    borderStyle: z.enum(['none', 'bordered', 'separated']).default('bordered'),
    backgroundColor: z.string().default('transparent'),
    padding: z.number().default(16),
    borderRadius: z.enum(['none', 'sm', 'md', 'lg', 'xl', 'full']).default('md'),
  }),
});

// مكون قبل وبعد
export const beforeAfterComponentSchema = z.object({
  id: z.string(),
  type: z.literal('before-after'),
  data: z.object({
    beforeImage: z.string(),
    afterImage: z.string(),
    beforeLabel: z.string().default('قبل'),
    afterLabel: z.string().default('بعد'),
    title: z.string().optional(),
    description: z.string().optional(),
  }),
  order: z.number(),
  settings: z.object({
    dividerColor: z.string().default('#ffffff'),
    showLabels: z.boolean().default(true),
    borderRadius: z.number().default(12),
  }),
});

// Gallery Component (Product Images) - Uses ProductImageGalleryV2
export const galleryComponentSchema = z.object({
  id: z.string(),
  type: z.literal('gallery'),
  data: z.object({
    title: z.string().default('معرض صور المنتج'),
    description: z.string().optional(),
  }),
  order: z.number(),
  settings: z.object({
    // No settings needed - uses ProductImageGalleryV2 as is
  }),
});

// Price Component - Uses ProductPriceDisplay
export const priceComponentSchema = z.object({
  id: z.string(),
  type: z.literal('price'),
  data: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
  }),
  order: z.number(),
  settings: z.object({
    // No settings needed - uses ProductPriceDisplay as is
  }),
});

// مكون محدد الكمية
export const quantityComponentSchema = z.object({
  id: z.string(),
  type: z.literal('quantity'),
  data: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
  }),
  order: z.number(),
  settings: z.object({
    // No settings needed - uses ProductQuantitySelector as is
  }),
});

// مكون أطلب الآن
export const buyNowComponentSchema = z.object({
  id: z.string(),
  type: z.literal('buy-now'),
  data: z.object({
    title: z.string().default('أطلب الآن'),
    description: z.string().optional(),
    buttonText: z.string().default('أطلب الآن'),
  }),
  order: z.number(),
  settings: z.object({
    buttonColor: z.string().default('#3b82f6'), // blue-500
    buttonTextColor: z.string().default('#ffffff'), // white
    buttonSize: z.enum(['sm', 'md', 'lg']).default('lg'),
    showIcon: z.boolean().default(true),
    fullWidth: z.boolean().default(true),
    borderRadius: z.number().default(12),
  }),
});

// مخطط الاتحاد لجميع المكونات
export const advancedDescriptionComponentSchema = z.discriminatedUnion('type', [
  imageComponentSchema,
  slideshowComponentSchema,
  gifComponentSchema,
  videoComponentSchema,
  reviewsComponentSchema,
  textComponentSchema,
  featuresComponentSchema,
  specificationsComponentSchema,
  beforeAfterComponentSchema,
  galleryComponentSchema,
  priceComponentSchema,
  quantityComponentSchema,
  buyNowComponentSchema,
]);

// مخطط الوصف المتقدم الكامل
export const advancedDescriptionSchema = z.object({
  version: z.string().default('1.0'),
  components: z.array(advancedDescriptionComponentSchema),
  settings: z.object({
    backgroundColor: z.string().optional(),
    padding: z.number().default(20),
    maxWidth: z.number().default(800),
    centerContent: z.boolean().default(true),
  }),
  metadata: z.object({
    createdAt: z.string(),
    updatedAt: z.string(),
    createdBy: z.string().optional(),
  }),
});

// TypeScript types من المخططات
export type ImageComponent = z.infer<typeof imageComponentSchema>;
export type SlideshowComponent = z.infer<typeof slideshowComponentSchema>;
export type GifComponent = z.infer<typeof gifComponentSchema>;
export type VideoComponent = z.infer<typeof videoComponentSchema>;
export type ReviewsComponent = z.infer<typeof reviewsComponentSchema>;
export type TextComponent = z.infer<typeof textComponentSchema>;
export type FeaturesComponent = z.infer<typeof featuresComponentSchema>;
export type SpecificationsComponent = z.infer<typeof specificationsComponentSchema>;
export type BeforeAfterComponent = z.infer<typeof beforeAfterComponentSchema>;
export type GalleryComponent = z.infer<typeof galleryComponentSchema>;
export type PriceComponent = z.infer<typeof priceComponentSchema>;
export type QuantityComponent = z.infer<typeof quantityComponentSchema>;
export type BuyNowComponent = z.infer<typeof buyNowComponentSchema>;

export type AdvancedDescriptionComponent = z.infer<typeof advancedDescriptionComponentSchema>;
export type AdvancedDescription = z.infer<typeof advancedDescriptionSchema>;

// دوال مساعدة لإنشاء مكونات جديدة
export const createImageComponent = (order: number): ImageComponent => ({
  id: crypto.randomUUID(),
  type: 'image',
  data: {
    url: '',
    alignment: 'center',
    borderRadius: 8,
    shadow: true,
    sizeMode: 'responsive',
    aspectRatio: 'auto',
    fitMode: 'contain',
    objectPosition: 'center',
  },
  order,
  settings: {
    showCaption: true,
    clickToEnlarge: true,
    lazyLoad: true,
    responsiveBreakpoints: {
      mobile: 100,
      tablet: 80,
      desktop: 60,
    },
    enableLightbox: true,
    lightboxZoom: true,
  },
});

export const createSlideshowComponent = (order: number): SlideshowComponent => ({
  id: crypto.randomUUID(),
  type: 'slideshow',
  data: {
    images: [],
    autoPlay: true,
    autoPlayInterval: 5000,
    showDots: true,
    showArrows: true,
    loop: true,
  },
  order,
  settings: {
    height: 400,
    borderRadius: 12,
    transitionEffect: 'slide',
  },
});

export const createReviewsComponent = (order: number): ReviewsComponent => ({
  id: crypto.randomUUID(),
  type: 'reviews',
  data: {
    reviews: [],
    title: 'آراء العملاء',
    showAverageRating: true,
  },
  order,
  settings: {
    layout: 'grid',
    showPhotos: true,
    maxReviews: 6,
    showVerificationBadge: true,
  },
});

export const createTextComponent = (order: number): TextComponent => ({
  id: crypto.randomUUID(),
  type: 'text',
  data: {
    content: '',
  },
  order,
  settings: {
    fontSize: 'base',
    alignment: 'right',
    padding: 16,
    borderRadius: 8,
  },
});

export const createFeaturesComponent = (order: number): FeaturesComponent => ({
  id: crypto.randomUUID(),
  type: 'features',
  data: {
    title: 'مميزات المنتج',
    features: [],
  },
  order,
  settings: {
    layout: 'grid',
    columns: 2,
    showIcons: true,
  },
});

export const createSpecificationsComponent = (order: number): SpecificationsComponent => ({
  id: crypto.randomUUID(),
  type: 'specifications',
  data: {
    title: 'المواصفات التقنية',
    subtitle: '',
    layoutType: 'simple',
    specifications: [],
    categories: [],
  },
  order,
  settings: {
    layout: 'table',
    showCategories: true,
    alternatingRows: true,
    showUnits: true,
    showDescriptions: true,
    alternatingColors: true,
    borderStyle: 'bordered',
    backgroundColor: 'transparent',
    padding: 16,
    borderRadius: 'md',
  },
});

export const createGifComponent = (order: number): GifComponent => ({
  id: crypto.randomUUID(),
  type: 'gif',
  data: {
    url: '',
    autoPlay: true,
  },
  order,
  settings: {
    maxWidth: 500,
    alignment: 'center',
    borderRadius: 8,
    controls: true,
  },
});

export const createVideoComponent = (order: number): VideoComponent => ({
  id: crypto.randomUUID(),
  type: 'video',
  data: {
    url: '',
    autoPlay: false,
    loop: false,
    muted: true,
  },
  order,
  settings: {
    controls: true,
    aspectRatio: '16:9',
    borderRadius: 8,
  },
});

export const createBeforeAfterComponent = (order: number): BeforeAfterComponent => ({
  id: crypto.randomUUID(),
  type: 'before-after',
  data: {
    beforeImage: '',
    afterImage: '',
    beforeLabel: 'قبل',
    afterLabel: 'بعد',
  },
  order,
  settings: {
    dividerColor: '#ffffff',
    showLabels: true,
    borderRadius: 12,
  },
});

export const createGalleryComponent = (order: number): GalleryComponent => ({
  id: crypto.randomUUID(),
  type: 'gallery',
  data: {
    title: 'معرض صور المنتج',
    description: '',
  },
  order,
  settings: {},
});

export const createPriceComponent = (order: number): PriceComponent => ({
  id: crypto.randomUUID(),
  type: 'price',
  data: {
    title: 'سعر المنتج',
    description: 'عرض سعر المنتج الحالي',
  },
  order,
  settings: {},
});

export const createQuantityComponent = (order: number): QuantityComponent => ({
  id: crypto.randomUUID(),
  type: 'quantity',
  data: {
    title: 'محدد الكمية',
    description: 'محدد كمية المنتج',
  },
  order,
  settings: {},
});

export const createBuyNowComponent = (order: number): BuyNowComponent => ({
  id: crypto.randomUUID(),
  type: 'buy-now',
  data: {
    title: 'أطلب الآن',
    description: 'زر الطلب السريع',
    buttonText: 'أطلب الآن',
  },
  order,
  settings: {
    buttonColor: '#3b82f6',
    buttonTextColor: '#ffffff',
    buttonSize: 'lg',
    showIcon: true,
    fullWidth: true,
    borderRadius: 12,
  },
});
