import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { getSupabaseClient } from '@/lib/supabase';

// ملفات الترجمة مضمنة
const arTranslations = {
  "navbar": {
    "home": "الرئيسية",
    "products": "المنتجات",
    "categories": "الفئات",
    "about": "عن المتجر",
    "contact": "اتصل بنا",
    "cart": "العربة",
    "search": "البحث",
    "searchPlaceholder": "ابحث عن المنتجات...",
    "menu": "القائمة",
    "account": "الحساب",
    "login": "تسجيل الدخول",
    "register": "إنشاء حساب",
    "collapseSidebar": "طي القائمة الجانبية",
    "expandSidebar": "توسيع القائمة الجانبية",
    "dashboard": "لوحة التحكم",
    "orders": "الطلبات",
    "repairTracking": "تتبع التصليح",
    "consoles": "أجهزة",
    "games": "ألعاب",
    "accessories": "إكسسوارات",
    "repairServices": "خدمات الإصلاح",
    "browse": "تصفح",
    "browseAllProducts": "تصفح كل المنتجات"
  },
  "banner": {
    "welcomeTitle": "مرحباً بك في متجرنا",
    "welcomeSubtitle": "اكتشف أفضل المنتجات بأسعار مميزة",
    "shopNow": "تسوق الآن",
    "learnMore": "اعرف المزيد",
    "fastShipping": "شحن سريع",
    "securePayment": "دفع آمن",
    "qualityGuarantee": "ضمان الجودة",
    "customerSupport": "دعم العملاء"
  },
  "categories": {
    "title": "تسوق حسب الفئة",
    "subtitle": "استكشف مجموعتنا المتنوعة من المنتجات",
    "viewAll": "عرض الكل",
    "productsCount": "منتج",
    "noCategories": "لا توجد فئات متاحة حالياً"
  },
  "productCategories": {
    "title": "تصفح فئات منتجاتنا",
    "description": "أفضل الفئات المختارة لتلبية احتياجاتك",
    "browseNow": "تصفح الآن",
    "products": "منتج",
    "productsSingular": "منتج",
    "productsPlural": "منتجات",
    "demoMessage": "🌟 فئات تجريبية:",
    "demoDescription": "هذه فئات تجريبية للعرض. يمكنك إضافة فئاتك الخاصة من لوحة التحكم.",
    "defaultCategories": {
      "electronics": {
        "name": "إلكترونيات",
        "description": "أحدث الأجهزة الإلكترونية والمنتجات التقنية"
      },
      "computers": {
        "name": "أجهزة كمبيوتر", 
        "description": "حواسيب محمولة ومكتبية بأحدث المواصفات"
      },
      "smartphones": {
        "name": "هواتف ذكية",
        "description": "تشكيلة واسعة من أحدث الهواتف الذكية"
      },
      "headphones": {
        "name": "سماعات",
        "description": "سماعات سلكية ولاسلكية عالية الجودة"
      },
      "monitors": {
        "name": "شاشات",
        "description": "شاشات بأحجام مختلفة ودقة عالية"
      },
      "accessories": {
        "name": "إكسسوارات",
        "description": "ملحقات وإكسسوارات متنوعة للأجهزة الإلكترونية"
      }
    },
    "fallbackDescription": "تصفح المنتجات في هذه الفئة"
  },
  "featuredProducts": {
    "title": "منتجاتنا المميزة",
    "subtitle": "اكتشف أفضل منتجاتنا المختارة بعناية",
    "description": "اكتشف أفضل منتجاتنا المختارة بعناية لتناسب احتياجاتك",
    "featuredLabel": "منتجات مميزة",
    "allProducts": "كل المنتجات",
    "browseAllProducts": "تصفح جميع المنتجات",
    "viewProduct": "عرض المنتج",
    "addToCart": "أضف للعربة",
    "addToFavorites": "أضف للمفضلة",
    "quickView": "عرض سريع",
    "viewDetails": "عرض التفاصيل",
    "outOfStock": "نفد من المخزون",
    "onSale": "خصم",
    "new": "جديد",
    "loading": "جاري تحميل المنتجات...",
    "noProducts": "لا توجد منتجات متاحة حالياً",
    "noProductsMessage": "لم يتم العثور على منتجات مميزة في هذا القسم.",
    "gridView": "عرض شبكي",
    "listView": "عرض قائمة",
    "currency": "د.ج",
    "stock": {
      "outOfStock": "نفذ",
      "limitedQuantity": "كمية محدودة",
      "available": "متوفر"
    },
    "defaultProducts": {
      "headphones": {
        "name": "سماعات لاسلكية احترافية",
        "description": "سماعات لاسلكية احترافية بجودة صوت عالية"
      },
      "laptop": {
        "name": "حاسوب محمول فائق السرعة",
        "description": "حاسوب محمول فائق السرعة مع معالج قوي"
      },
      "smartwatch": {
        "name": "ساعة ذكية متطورة",
        "description": "ساعة ذكية متطورة مع العديد من المميزات"
      },
      "camera": {
        "name": "كاميرا احترافية عالية الدقة",
        "description": "كاميرا احترافية عالية الدقة لالتقاط أفضل الصور"
      }
    }
  },
  "storeAbout": {
    "title": "عن متجرنا",
    "subtitle": "متجر إلكترونيات وتقنية متميز",
    "description": "تأسس متجرنا منذ أكثر من عشر سنوات بهدف تقديم أحدث منتجات التكنولوجيا بأسعار منافسة وجودة عالية. نحن نفخر بتوفير تجربة تسوق متميزة لعملائنا من خلال فريق متخصص يقدم المشورة والدعم الفني المستمر. نلتزم بتوفير منتجات أصلية بضمان الوكيل ونسعى دائماً لتلبية احتياجات عملائنا وتجاوز توقعاتهم.",
    "learnMore": "تعرف على المزيد عنا",
    "imageAlt": "صورة المتجر",
    "stats": {
      "yearFounded": "سنة التأسيس",
      "customersCount": "عميل سعيد",
      "productsCount": "منتج متنوع",
      "branches": "فروع في الجزائر"
    },
    "defaultFeatures": [
      "منتجات أصلية بضمان الوكيل",
      "شحن سريع لجميع ولايات الجزائر",
      "دعم فني متخصص",
      "خدمة ما بعد البيع"
    ]
  },
  "customerTestimonials": {
    "title": "آراء عملائنا",
    "description": "استمع إلى تجارب عملائنا الحقيقية مع منتجاتنا وخدماتنا",
    "loading": "جاري تحميل آراء العملاء...",
    "noTestimonials": "لا توجد آراء للعملاء متاحة حالياً.",
    "previousItem": "العنصر السابق",
    "nextItem": "العنصر التالي",
    "item": "العنصر",
    "defaultTestimonials": [
      {
        "customerName": "أحمد بن يوسف",
        "comment": "منتج رائع جداً! لقد استخدمته لمدة شهر وأنا سعيد جداً بالنتائج. التوصيل كان سريعاً لولاية الجزائر والتغليف كان ممتازاً.",
        "productName": "سماعات بلوتوث لاسلكية"
      },
      {
        "customerName": "فاطمة بن علي",
        "comment": "جودة المنتج ممتازة والسعر مناسب جداً مقارنة بالمنتجات المماثلة في السوق الجزائري. أنصح الجميع بتجربته!",
        "productName": "ساعة ذكية"
      },
      {
        "customerName": "محمد سعيد",
        "comment": "خدمة العملاء ممتازة والرد سريع على الاستفسارات. المنتج وصل لولاية وهران بحالة ممتازة وبدون أي خدوش.",
        "productName": "تلفزيون ذكي 55 بوصة"
      },
      {
        "customerName": "نورا عبد الرحمن",
        "comment": "المنتج جيد ولكن التوصيل تأخر قليلاً عن الموعد المحدد في ولاية قسنطينة. بشكل عام أنا راضية عن التجربة.",
        "productName": "مكنسة كهربائية روبوتية"
      },
      {
        "customerName": "عمر حسان",
        "comment": "من أفضل المنتجات التي اشتريتها على الإطلاق! الجودة عالية جداً والأداء ممتاز. سأشتري منه مرة أخرى بالتأكيد.",
        "productName": "لابتوب للألعاب"
      },
      {
        "customerName": "ليلى أحمد زهراني",
        "comment": "تجربة تسوق رائعة! المنتج مطابق للمواصفات المذكورة وسعره مناسب. التوصيل لولاية تيزي وزو كان سريعاً. أنصح به بشدة.",
        "productName": "آلة صنع القهوة"
      }
    ]
  },
  "storeFooter": {
    "storeName": "متجرنا",
    "description": "متجر إلكتروني متخصص في بيع أحدث المنتجات التقنية والإلكترونية بأفضل الأسعار وجودة عالية.",
    "logoAlt": "شعار",
    "paymentMethods": "وسائل الدفع",
    "copyrightText": "جميع الحقوق محفوظة.",
    "newsletter": {
      "title": "النشرة البريدية",
      "description": "اشترك في نشرتنا البريدية للحصول على آخر العروض والتحديثات.",
      "placeholder": "البريد الإلكتروني",
      "buttonText": "اشتراك"
    },
    "defaultFeatures": [
      {
        "title": "شحن سريع",
        "description": "توصيل مجاني للطلبات +5000 د.ج"
      },
      {
        "title": "دفع آمن",
        "description": "طرق دفع متعددة 100% آمنة"
      },
      {
        "title": "ضمان الجودة",
        "description": "منتجات عالية الجودة معتمدة"
      },
      {
        "title": "دعم 24/7",
        "description": "مساعدة متوفرة طول اليوم"
      }
    ],
    "quickLinks": "روابط سريعة",
    "customerService": "خدمة العملاء",
    "helpCenter": "مركز المساعدة",
    "shippingPolicy": "سياسة الشحن",
    "faq": "الأسئلة الشائعة",
    "home": "الصفحة الرئيسية",
    "products": "المنتجات",
    "contact": "اتصل بنا",
    "offers": "العروض"
  },
  "storeProducts": {
    "title": "متجر المنتجات",
    "subtitle": "اكتشف مجموعة واسعة من المنتجات عالية الجودة بأفضل الأسعار",
    "stats": {
      "productsAvailable": "منتج متاح",
      "category": "فئة",
      "categories": "فئات",
      "currentPage": "في الصفحة الحالية"
    },
    "search": {
      "placeholder": "ابحث عن المنتجات...",
      "clear": "مسح البحث",
      "quickFilter": "فلترة سريعة:",
      "resultsInfo": "عرض {showing} من أصل {total} منتج",
      "pageInfo": "(صفحة {current} من {total})",
      "activeFilters": "الفلاتر النشطة:",
      "searchFilter": "بحث: {query}",
      "categoryFilter": "فئة: {category}"
    },
    "filters": {
      "category": {
        "label": "الفئة",
        "all": "كل الفئات",
        "placeholder": "اختر الفئة"
      },
      "sort": {
        "label": "ترتيب",
        "placeholder": "اختر الترتيب",
        "newest": "الأحدث",
        "priceLow": "السعر: من الأقل للأعلى",
        "priceHigh": "السعر: من الأعلى للأقل",
        "nameAsc": "الاسم: أ-ي",
        "nameDesc": "الاسم: ي-أ"
      },
      "stock": {
        "label": "التوفر",
        "placeholder": "حالة المخزون",
        "all": "الكل",
        "inStock": "متوفر",
        "outOfStock": "غير متوفر",
        "lowStock": "مخزون قليل"
      },
      "reset": "إعادة تعيين ({count})",
      "clear": "مسح الفلاتر"
    },
    "view": {
      "grid": "عرض شبكي",
      "list": "عرض قائمة",
      "columns": "أعمدة"
    },
    "pagination": {
      "previous": "السابق",
      "next": "التالي",
      "page": "صفحة {page}",
      "loading": "جاري التحميل..."
    },
    "states": {
      "loading": "جاري التحميل...",
      "error": {
        "title": "حدث خطأ",
        "message": "حدث خطأ أثناء تحميل المنتجات",
        "retry": "إعادة المحاولة",
        "categoriesError": "حدث خطأ أثناء تحميل الفئات"
      },
      "empty": {
        "title": "لا توجد منتجات مطابقة",
        "message": "لم نتمكن من العثور على منتجات تطابق معايير البحث الحالية. جرب تعديل الفلاتر أو البحث بكلمات مختلفة.",
        "resetFilters": "إعادة تعيين الفلاتر"
      }
    }
  },
  "productCard": {
    "buyNow": "شراء الآن",
    "outOfStock": "نفذ من المخزن",
    "quickView": "عرض سريع",
    "new": "جديد",
    "limited": "كمية محدودة",
    "available": "متوفر",
    "addedToWishlist": "تم إضافة المنتج للمفضلة",
    "removedFromWishlist": "تم إزالة المنتج من المفضلة",
    "buyingProduct": "جاري الانتقال لشراء {productName}",
    "noProducts": "لا توجد منتجات",
    "noProductsMessage": "لم يتم العثور على منتجات تطابق معايير البحث الخاصة بك. يرجى تجربة معايير بحث مختلفة."
  },
  "productInfo": {
    "new": "جديد",
    "discount": "خصم {percentage}%",
    "available": "متوفر",
    "unavailable": "غير متوفر",
    "rating": "{rating} ({count} تقييم)",
    "purchaseCount": "لقد اشترى {count} شخص هذا المنتج من الجزائر.",
    "currency": "د.ج",
    "inStock": "متوفر في المخزون",
    "pieces": "قطعة",
    "outOfStock": "غير متوفر حالياً",
    "productDescription": "وصف المنتج",
    "customerReviews": "تقييمات العملاء ({count})",
    "verifiedPurchase": "شراء موثوق"
  },
  "productOptions": {
    "color": "اللون",
    "size": "المقاس",
    "quantity": "الكمية",
    "loadingSizes": "جاري تحميل المقاسات...",
    "noSizesAvailable": "لا توجد مقاسات متاحة لهذا اللون",
    "available": "متوفر: {{count}} قطعة",
    "unavailable": "غير متوفر",
    "totalPrice": "السعر الإجمالي: {{price}} د.ج"
  },
  "productPurchase": {
    "orderProduct": "طلب المنتج",
    "specialOffers": "عروض مميزة لك",
    "alternativeOptions": "خيارات بديلة قد تهمك",
    "productDescription": "وصف المنتج"
  },
  "orderForm": {
    "orderInfo": "معلومات الطلب",
    "submittingOrder": "جاري إرسال الطلب...",
    "submitOrder": "إرسال الطلب",
    "completeOrder": "إتمام الطلب",
    "fillDetails": "املأ البيانات التالية لإتمام طلبك",
    "fullName": "الاسم واللقب",
    "fullNamePlaceholder": "أدخل الاسم واللقب",
    "phoneNumber": "رقم الهاتف",
    "phoneNumberPlaceholder": "أدخل رقم الهاتف",
    "deliveryType": "نوع التوصيل",
    "homeDelivery": "توصيل للمنزل",
    "homeDeliveryDesc": "توصيل الطلب مباشرة إلى عنوانك",
    "officePickup": "استلام من مكتب شركة التوصيل",
    "officePickupDesc": "استلام الطلب من مكتب شركة التوصيل",
    "state": "الولاية",
    "orderSummary": "ملخص الطلب",
    "color": "اللون:",
    "size": "الحجم:",
    "product": "المنتج ({{count}} قطعة)",
    "deliveryFees": "رسوم التوصيل",
    "toHome": "للمنزل",
    "totalAmount": "المجموع الكلي",
    "currency": "دج",
    "required": "*",
    "fixedDeliveryType": "نوع التوصيل الثابت",
    "selectMunicipalityForPickup": "اختر البلدية للاستلام منها",
    "importantSelectMunicipality": "مهم: اختر البلدية المناسبة للاستلام منها",
    "deliveryInfo": "معلومات التوصيل",
    "deliveryOption": "خيار التوصيل",
    "province": "الولاية",
    "municipality": "البلدية",
    "selectProvince": "اختر الولاية",
    "selectMunicipality": "اختر البلدية",
    "selectOption": "اختر...",
    "loadingMunicipalities": "جاري تحميل البلديات...",
    "noMunicipalitiesAvailable": "لا توجد بلديات متاحة للتوصيل المنزلي",
    "enterMunicipalityName": "أدخل اسم البلدية",
    "municipalityForPickup": "البلدية للاستلام منها",
    "noMunicipalitiesForProvince": "لا توجد بلديات متاحة لهذه الولاية",
    "selectProvinceFirst": "الرجاء اختيار الولاية أولاً لعرض البلديات",
    "pleaseSelectMunicipality": "يرجى اختيار البلدية",
    "loadingDeliveryOptions": "جاري تحميل خيارات التوصيل...",
    "deliveryMethod": "طريقة التوصيل",
    "freeShipping": "شحن مجاني!",
    "shippingPrice": "سعر الشحن",
    "orderInfo": "معلومات الطلب",
    "submittingOrder": "جاري إرسال الطلب...",
    "deliveryOptions": "خيارات التوصيل"
  },
  "common": {
    "loading": "جاري التحميل...",
    "error": "حدث خطأ",
    "tryAgain": "حاول مرة أخرى",
    "save": "حفظ",
    "cancel": "إلغاء",
    "edit": "تعديل",
    "delete": "حذف",
    "view": "عرض",
    "close": "إغلاق",
    "next": "التالي",
    "previous": "السابق",
    "search": "بحث",
    "filter": "تصفية",
    "sort": "ترتيب",
    "currency": "ر.س"
  },
  "app": {
    "title": "stockiha",
    "loading": "جاري التحميل...",
    "error": "حدث خطأ",
    "success": "تمت العملية بنجاح",
    "welcome": "مرحبًا بك في بازار"
  },
  "nav": {
    "home": "الرئيسية",
    "products": "المنتجات",
    "orders": "الطلبات",
    "customers": "العملاء",
    "dashboard": "لوحة التحكم",
    "settings": "الإعدادات"
  },
  "button": {
    "save": "حفظ",
    "cancel": "إلغاء",
    "delete": "حذف",
    "edit": "تعديل",
    "add": "إضافة",
    "submit": "إرسال",
    "back": "رجوع",
    "next": "التالي",
    "login": "تسجيل الدخول",
    "logout": "تسجيل الخروج"
  },
  "auth": {
    "login": "تسجيل الدخول",
    "signup": "إنشاء حساب",
    "email": "البريد الإلكتروني",
    "password": "كلمة المرور",
    "forgotPassword": "نسيت كلمة المرور؟",
    "invalidCredentials": "بيانات الاعتماد غير صحيحة"
  }
};

const enTranslations = {
  "navbar": {
    "home": "Home",
    "products": "Products",
    "categories": "Categories",
    "about": "About Store",
    "contact": "Contact Us",
    "cart": "Cart",
    "search": "Search",
    "searchPlaceholder": "Search for products...",
    "menu": "Menu",
    "account": "Account",
    "login": "Login",
    "register": "Register",
    "collapseSidebar": "Collapse Sidebar",
    "expandSidebar": "Expand Sidebar",
    "dashboard": "Dashboard",
    "orders": "Orders",
    "repairTracking": "Repair Tracking",
    "consoles": "Consoles",
    "games": "Games",
    "accessories": "Accessories",
    "repairServices": "Repair Services",
    "browse": "Browse",
    "browseAllProducts": "Browse All Products"
  },
  "banner": {
    "welcomeTitle": "Welcome to Our Store",
    "welcomeSubtitle": "Discover the best products at amazing prices",
    "shopNow": "Shop Now",
    "learnMore": "Learn More",
    "fastShipping": "Fast Shipping",
    "securePayment": "Secure Payment",
    "qualityGuarantee": "Quality Guarantee",
    "customerSupport": "Customer Support"
  },
  "categories": {
    "title": "Shop by Category",
    "subtitle": "Explore our diverse range of products",
    "viewAll": "View All",
    "productsCount": "product",
    "noCategories": "No categories available at the moment"
  },
  "productCategories": {
    "title": "Browse Product Categories",
    "description": "Discover the best categories for your needs",
    "browseNow": "Browse Now",
    "products": "products",
    "productsSingular": "product",
    "productsPlural": "products",
    "demoMessage": "🌟 Demo Categories:",
    "demoDescription": "These are demo categories for display. You can add your own categories from the dashboard.",
    "defaultCategories": {
      "electronics": {
        "name": "Electronics",
        "description": "The latest electronic devices and tech products"
      },
      "computers": {
        "name": "Computers", 
        "description": "Portable and desktop laptops with the latest specifications"
      },
      "smartphones": {
        "name": "Smartphones",
        "description": "A wide range of the latest smartphones"
      },
      "headphones": {
        "name": "Headphones",
        "description": "High quality wired and wireless headphones"
      },
      "monitors": {
        "name": "Monitors",
        "description": "Monitors with various sizes and high resolution"
      },
      "accessories": {
        "name": "Accessories",
        "description": "A variety of accessories for electronic devices"
      }
    },
    "fallbackDescription": "Browse products in this category"
  },
  "featuredProducts": {
    "title": "Our Featured Products",
    "subtitle": "Discover our best handpicked products",
    "description": "Discover our best handpicked products to meet your needs",
    "featuredLabel": "Featured Products",
    "allProducts": "All Products",
    "browseAllProducts": "Browse All Products",
    "viewProduct": "View Product",
    "addToCart": "Add to Cart",
    "addToFavorites": "Add to Favorites",
    "quickView": "Quick View",
    "viewDetails": "View Details",
    "outOfStock": "Out of Stock",
    "onSale": "On Sale",
    "new": "New",
    "loading": "Loading products...",
    "noProducts": "No products available at the moment",
    "noProductsMessage": "No featured products found in this section.",
    "gridView": "Grid View",
    "listView": "List View",
    "currency": "DZD",
    "stock": {
      "outOfStock": "Out of Stock",
      "limitedQuantity": "Limited Quantity",
      "available": "Available"
    },
    "defaultProducts": {
      "headphones": {
        "name": "Professional Wireless Headphones",
        "description": "Professional wireless headphones with high sound quality"
      },
      "laptop": {
        "name": "High-Speed Laptop",
        "description": "High-speed laptop with powerful processor"
      },
      "smartwatch": {
        "name": "Advanced Smart Watch",
        "description": "Advanced smart watch with many features"
      },
      "camera": {
        "name": "Professional High-Resolution Camera",
        "description": "Professional high-resolution camera for capturing the best photos"
      }
    }
  },
  "storeAbout": {
    "title": "About Our Store",
    "subtitle": "Distinguished Electronics and Technology Store",
    "description": "Our store was founded over ten years ago with the goal of providing the latest technology products at competitive prices and high quality. We pride ourselves on providing an exceptional shopping experience for our customers through a specialized team that provides ongoing advice and technical support. We are committed to providing original products with dealer warranty and always strive to meet our customers' needs and exceed their expectations.",
    "learnMore": "Learn More About Us",
    "imageAlt": "Store Image",
    "stats": {
      "yearFounded": "Year Founded",
      "customersCount": "Happy Customers",
      "productsCount": "Diverse Products",
      "branches": "Branches in Algeria"
    },
    "defaultFeatures": [
      "Original products with dealer warranty",
      "Fast shipping to all Algerian states",
      "Specialized technical support",
      "After-sales service"
    ]
  },
  "customerTestimonials": {
    "title": "Customer Reviews",
    "description": "Listen to our customers' real experiences with our products and services",
    "loading": "Loading customer reviews...",
    "noTestimonials": "No customer reviews available at the moment.",
    "previousItem": "Previous Item",
    "nextItem": "Next Item",
    "item": "Item",
    "defaultTestimonials": [
      {
        "customerName": "Ahmed Ben Youssef",
        "comment": "Amazing product! I've been using it for a month and I'm very happy with the results. Delivery was fast to Algiers province and packaging was excellent.",
        "productName": "Wireless Bluetooth Headphones"
      },
      {
        "customerName": "Fatima Ben Ali",
        "comment": "Excellent product quality and very reasonable price compared to similar products in the Algerian market. I recommend everyone to try it!",
        "productName": "Smart Watch"
      },
      {
        "customerName": "Mohammed Said",
        "comment": "Excellent customer service and quick response to inquiries. The product arrived in Oran province in excellent condition without any scratches.",
        "productName": "55-inch Smart TV"
      },
      {
        "customerName": "Nora Abdul Rahman",
        "comment": "Good product but delivery was slightly delayed from the scheduled time in Constantine province. Overall I'm satisfied with the experience.",
        "productName": "Robotic Vacuum Cleaner"
      },
      {
        "customerName": "Omar Hassan",
        "comment": "One of the best products I've ever bought! Very high quality and excellent performance. I will definitely buy from them again.",
        "productName": "Gaming Laptop"
      },
      {
        "customerName": "Layla Ahmed Zahrani",
        "comment": "Great shopping experience! The product matches the specifications mentioned and its price is reasonable. Delivery to Tizi Ouzou province was fast. Highly recommend.",
        "productName": "Coffee Maker"
      }
    ]
  },
  "storeFooter": {
    "storeName": "Our Store",
    "description": "An electronic store specialized in selling the latest technology and electronic products at the best prices and high quality.",
    "logoAlt": "Logo",
    "paymentMethods": "Payment Methods",
    "copyrightText": "All rights reserved.",
    "newsletter": {
      "title": "Newsletter",
      "description": "Subscribe to our newsletter to get the latest offers and updates.",
      "placeholder": "Email Address",
      "buttonText": "Subscribe"
    },
    "defaultFeatures": [
      {
        "title": "Fast Shipping",
        "description": "Free delivery for orders +5000 DZD"
      },
      {
        "title": "Secure Payment",
        "description": "Multiple 100% secure payment methods"
      },
      {
        "title": "Quality Guarantee",
        "description": "High quality certified products"
      },
      {
        "title": "24/7 Support",
        "description": "Help available all day long"
      }
    ],
    "quickLinks": "Quick Links",
    "customerService": "Customer Service",
    "helpCenter": "Help Center",
    "shippingPolicy": "Shipping Policy",
    "faq": "FAQ",
    "home": "Home",
    "products": "Products",
    "contact": "Contact Us",
    "offers": "Offers"
  },
  "storeProducts": {
    "title": "Products Store",
    "subtitle": "Discover a wide range of high-quality products at the best prices",
    "stats": {
      "productsAvailable": "products available",
      "category": "category",
      "categories": "categories",
      "currentPage": "on current page"
    },
    "search": {
      "placeholder": "Search for products...",
      "clear": "Clear search",
      "quickFilter": "Quick filter:",
      "resultsInfo": "Showing {showing} of {total} products",
      "pageInfo": "(page {current} of {total})",
      "activeFilters": "Active filters:",
      "searchFilter": "Search: {query}",
      "categoryFilter": "Category: {category}"
    },
    "filters": {
      "category": {
        "label": "Category",
        "all": "All Categories",
        "placeholder": "Choose category"
      },
      "sort": {
        "label": "Sort",
        "placeholder": "Choose sorting",
        "newest": "Newest",
        "priceLow": "Price: Low to High",
        "priceHigh": "Price: High to Low",
        "nameAsc": "Name: A-Z",
        "nameDesc": "Name: Z-A"
      },
      "stock": {
        "label": "Availability",
        "placeholder": "Stock status",
        "all": "All",
        "inStock": "In Stock",
        "outOfStock": "Out of Stock",
        "lowStock": "Low Stock"
      },
      "reset": "Reset ({count})",
      "clear": "Clear filters"
    },
    "view": {
      "grid": "Grid view",
      "list": "List view",
      "columns": "columns"
    },
    "pagination": {
      "previous": "Previous",
      "next": "Next",
      "page": "Page {page}",
      "loading": "Loading..."
    },
    "states": {
      "loading": "Loading...",
      "error": {
        "title": "An error occurred",
        "message": "An error occurred while loading products",
        "retry": "Try again",
        "categoriesError": "An error occurred while loading categories"
      },
      "empty": {
        "title": "No matching products",
        "message": "We couldn't find products matching the current search criteria. Try adjusting the filters or searching with different keywords.",
        "resetFilters": "Reset filters"
      }
    }
  },
  "productCard": {
    "buyNow": "Buy Now",
    "outOfStock": "Out of Stock",
    "quickView": "Quick View",
    "new": "New",
    "limited": "Limited Quantity",
    "available": "Available",
    "addedToWishlist": "Product added to wishlist",
    "removedFromWishlist": "Product removed from wishlist",
    "buyingProduct": "Redirecting to purchase {productName}",
    "noProducts": "No products",
    "noProductsMessage": "No products found matching your search criteria. Please try different search criteria."
  },
  "productInfo": {
    "new": "New",
    "discount": "{percentage}% Off",
    "available": "Available",
    "unavailable": "Unavailable",
    "rating": "{rating} ({count} reviews)",
    "purchaseCount": "{count} people have purchased this product from Algeria.",
    "currency": "DZD",
    "inStock": "In Stock",
    "pieces": "pieces",
    "outOfStock": "Currently Out of Stock",
    "productDescription": "Product Description",
    "customerReviews": "Customer Reviews ({count})",
    "verifiedPurchase": "Verified Purchase"
  },
  "productOptions": {
    "color": "Color",
    "size": "Size",
    "quantity": "Quantity",
    "loadingSizes": "Loading sizes...",
    "noSizesAvailable": "No sizes available for this color",
    "available": "Available: {{count}} pieces",
    "unavailable": "Unavailable",
    "totalPrice": "Total Price: {{price}} DZD"
  },
  "productPurchase": {
    "orderProduct": "Order Product",
    "specialOffers": "Special Offers for You",
    "alternativeOptions": "Alternative Options You Might Like",
    "productDescription": "Product Description"
  },
  "orderForm": {
    "orderInfo": "Order Information",
    "submittingOrder": "Submitting order...",
    "submitOrder": "Submit Order",
    "completeOrder": "Complete Order",
    "fillDetails": "Fill in the following details to complete your order",
    "fullName": "Full Name",
    "fullNamePlaceholder": "Enter full name",
    "phoneNumber": "Phone Number",
    "phoneNumberPlaceholder": "Enter phone number",
    "deliveryType": "Delivery Type",
    "homeDelivery": "Home Delivery",
    "homeDeliveryDesc": "Deliver the order directly to your address",
    "officePickup": "Pickup from Shipping Company Office",
    "officePickupDesc": "Pick up the order from the shipping company office",
    "state": "State",
    "municipality": "Municipality",
    "selectMunicipality": "Select Municipality",
    "selectProvince": "Select Province",
    "selectMunicipalityForPickup": "Select Municipality for Pickup",
    "province": "Province",
    "municipality": "Municipality",
    "fixedDeliveryType": "Fixed Delivery Type",
    "loadingDeliveryOptions": "Loading delivery options...",
    "deliveryMethod": "Delivery Method",
    "freeShipping": "Free Shipping!",
    "shippingPrice": "Shipping Price",
    "deliveryOptions": "Delivery Options",
    "orderSummary": "Order Summary",
    "color": "Color:",
    "size": "Size:",
    "product": "Product ({{count}} piece)",
    "deliveryFees": "Delivery Fees",
    "toHome": "To Home",
    "totalAmount": "Total Amount",
    "currency": "DZD",
    "required": "*"
  },
  "common": {
    "loading": "Loading...",
    "error": "Error occurred",
    "tryAgain": "Try Again",
    "save": "Save",
    "cancel": "Cancel",
    "edit": "Edit",
    "delete": "Delete",
    "view": "View",
    "close": "Close",
    "next": "Next",
    "previous": "Previous",
    "search": "Search",
    "filter": "Filter",
    "sort": "Sort",
    "currency": "SAR"
  },
  "app": {
    "title": "Bazaar Console",
    "loading": "Loading...",
    "error": "An error occurred",
    "success": "Operation successful",
    "welcome": "Welcome to Bazaar"
  },
  "nav": {
    "home": "Home",
    "products": "Products",
    "orders": "Orders",
    "customers": "Customers",
    "dashboard": "Dashboard",
    "settings": "Settings"
  },
  "button": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "add": "Add",
    "submit": "Submit",
    "back": "Back",
    "next": "Next",
    "login": "Login",
    "logout": "Logout"
  },
  "auth": {
    "login": "Login",
    "signup": "Sign Up",
    "email": "Email",
    "password": "Password",
    "forgotPassword": "Forgot Password?",
    "invalidCredentials": "Invalid credentials"
  }
};

const frTranslations = {
  "navbar": {
    "home": "Accueil",
    "products": "Produits",
    "categories": "Catégories",
    "about": "À propos",
    "contact": "Contact",
    "cart": "Panier",
    "search": "Recherche",
    "searchPlaceholder": "Rechercher des produits...",
    "menu": "Menu",
    "account": "Compte",
    "login": "Connexion",
    "register": "S'inscrire",
    "collapseSidebar": "Réduire la barre latérale",
    "expandSidebar": "Développer la barre latérale",
    "dashboard": "Tableau de bord",
    "orders": "Commandes",
    "repairTracking": "Suivi des réparations",
    "consoles": "Consoles",
    "games": "Jeux",
    "accessories": "Accessoires",
    "repairServices": "Services de réparation",
    "browse": "Parcourir",
    "browseAllProducts": "Parcourir tous les produits"
  },
  "banner": {
    "welcomeTitle": "Bienvenue dans notre boutique",
    "welcomeSubtitle": "Découvrez les meilleurs produits à des prix exceptionnels",
    "shopNow": "Acheter maintenant",
    "learnMore": "En savoir plus",
    "fastShipping": "Livraison rapide",
    "securePayment": "Paiement sécurisé",
    "qualityGuarantee": "Garantie qualité",
    "customerSupport": "Support client"
  },
  "categories": {
    "title": "Acheter par catégorie",
    "subtitle": "Explorez notre gamme variée de produits",
    "viewAll": "Voir tout",
    "productsCount": "produit",
    "noCategories": "Aucune catégorie disponible pour le moment"
  },
  "productCategories": {
    "title": "Parcourir les catégories de produits",
    "description": "Découvrez les meilleures catégories pour répondre à vos besoins",
    "browseNow": "Parcourir maintenant",
    "products": "produits",
    "productsSingular": "produit",
    "productsPlural": "produits",
    "demoMessage": "🌟 Catégories de démonstration:",
    "demoDescription": "Ces sont des catégories de démonstration. Vous pouvez ajouter vos propres catégories depuis le tableau de bord.",
    "defaultCategories": {
      "electronics": {
        "name": "Électronique",
        "description": "Les derniers appareils électroniques et les produits technologiques"
      },
      "computers": {
        "name": "Ordinateurs",
        "description": "Ordinateurs portables et de bureau avec les dernières spécifications"
      },
      "smartphones": {
        "name": "Smartphones",
        "description": "Une large gamme des derniers smartphones"
      },
      "headphones": {
        "name": "Écouteurs",
        "description": "Écouteurs filaires et sans fil de haute qualité"
      },
      "monitors": {
        "name": "Moniteurs",
        "description": "Moniteurs de différentes tailles et haute résolution"
      },
      "accessories": {
        "name": "Accessoires",
        "description": "Une variété d'accessoires pour appareils électroniques"
      }
    },
    "fallbackDescription": "Parcourir les produits de cette catégorie"
  },
  "featuredProducts": {
    "title": "Nos produits vedettes",
    "subtitle": "Découvrez nos meilleurs produits sélectionnés",
    "description": "Découvrez nos meilleurs produits sélectionnés pour répondre à vos besoins",
    "featuredLabel": "Produits vedettes",
    "allProducts": "Tous les produits",
    "browseAllProducts": "Parcourir tous les produits",
    "viewProduct": "Voir le produit",
    "addToCart": "Ajouter au panier",
    "addToFavorites": "Ajouter aux favoris",
    "quickView": "Aperçu rapide",
    "viewDetails": "Voir les détails",
    "outOfStock": "Rupture de stock",
    "onSale": "En solde",
    "new": "Nouveau",
    "loading": "Chargement des produits...",
    "noProducts": "Aucun produit disponible pour le moment",
    "noProductsMessage": "Aucun produit vedette trouvé dans cette section.",
    "gridView": "Vue grille",
    "listView": "Vue liste",
    "currency": "DZD",
    "stock": {
      "outOfStock": "Rupture de stock",
      "limitedQuantity": "Quantité limitée",
      "available": "Disponible"
    },
    "defaultProducts": {
      "headphones": {
        "name": "Écouteurs sans fil professionnels",
        "description": "Écouteurs sans fil professionnels avec une qualité sonore élevée"
      },
      "laptop": {
        "name": "Ordinateur portable haute vitesse",
        "description": "Ordinateur portable haute vitesse avec processeur puissant"
      },
      "smartwatch": {
        "name": "Montre intelligente avancée",
        "description": "Montre intelligente avancée avec de nombreuses fonctionnalités"
      },
      "camera": {
        "name": "Caméra professionnelle haute résolution",
        "description": "Caméra professionnelle haute résolution pour capturer les meilleures photos"
      }
    }
  },
  "storeAbout": {
    "title": "À Propos de Notre Magasin",
    "subtitle": "Magasin d'Électronique et de Technologie Distingué",
    "description": "Notre magasin a été fondé il y a plus de dix ans dans le but de fournir les derniers produits technologiques à des prix compétitifs et de haute qualité. Nous sommes fiers d'offrir une expérience d'achat exceptionnelle à nos clients grâce à une équipe spécialisée qui fournit des conseils et un support technique continus. Nous nous engageons à fournir des produits originaux avec garantie du concessionnaire et nous nous efforçons toujours de répondre aux besoins de nos clients et de dépasser leurs attentes.",
    "learnMore": "En Savoir Plus Sur Nous",
    "imageAlt": "Image du Magasin",
    "stats": {
      "yearFounded": "Année de Fondation",
      "customersCount": "Clients Satisfaits",
      "productsCount": "Produits Divers",
      "branches": "Succursales en Algérie"
    },
    "defaultFeatures": [
      "Produits originaux avec garantie du concessionnaire",
      "Livraison rapide dans toutes les wilayas d'Algérie",
      "Support technique spécialisé",
      "Service après-vente"
    ]
  },
  "customerTestimonials": {
    "title": "Avis de Nos Clients",
    "description": "Écoutez les expériences réelles de nos clients avec nos produits et services",
    "loading": "Chargement des avis clients...",
    "noTestimonials": "Aucun avis client disponible pour le moment.",
    "previousItem": "Élément Précédent",
    "nextItem": "Élément Suivant",
    "item": "Élément",
    "defaultTestimonials": [
      {
        "customerName": "Ahmed Ben Youssef",
        "comment": "Produit fantastique ! Je l'utilise depuis un mois et je suis très satisfait des résultats. La livraison était rapide vers la wilaya d'Alger et l'emballage était excellent.",
        "productName": "Écouteurs Bluetooth Sans Fil"
      },
      {
        "customerName": "Fatima Ben Ali",
        "comment": "Excellente qualité du produit et prix très raisonnable par rapport aux produits similaires sur le marché algérien. Je recommande à tous de l'essayer !",
        "productName": "Montre Intelligente"
      },
      {
        "customerName": "Mohammed Said",
        "comment": "Excellent service client et réponse rapide aux questions. Le produit est arrivé à la wilaya d'Oran en excellent état sans aucune rayure.",
        "productName": "TV Intelligente 55 Pouces"
      },
      {
        "customerName": "Nora Abdul Rahman",
        "comment": "Bon produit mais la livraison a été légèrement retardée par rapport à l'heure prévue dans la wilaya de Constantine. Dans l'ensemble, je suis satisfaite de l'expérience.",
        "productName": "Aspirateur Robotique"
      },
      {
        "customerName": "Omar Hassan",
        "comment": "L'un des meilleurs produits que j'aie jamais achetés ! Très haute qualité et excellentes performances. Je rachèterai certainement chez eux.",
        "productName": "Ordinateur Portable Gaming"
      },
      {
        "customerName": "Layla Ahmed Zahrani",
        "comment": "Excellente expérience d'achat ! Le produit correspond aux spécifications mentionnées et son prix est raisonnable. La livraison vers la wilaya de Tizi Ouzou était rapide. Je recommande vivement.",
        "productName": "Machine à Café"
      }
    ]
  },
  "storeFooter": {
    "storeName": "Notre Magasin",
    "description": "Un magasin électronique spécialisé dans la vente des derniers produits technologiques et électroniques aux meilleurs prix et de haute qualité.",
    "logoAlt": "Logo",
    "paymentMethods": "Moyens de Paiement",
    "copyrightText": "Tous droits réservés.",
    "newsletter": {
      "title": "Newsletter",
      "description": "Abonnez-vous à notre newsletter pour recevoir les dernières offres et mises à jour.",
      "placeholder": "Adresse Email",
      "buttonText": "S'abonner"
    },
    "defaultFeatures": [
      {
        "title": "Livraison Rapide",
        "description": "Livraison gratuite pour les commandes +5000 DZD"
      },
      {
        "title": "Paiement Sécurisé",
        "description": "Plusieurs méthodes de paiement 100% sécurisées"
      },
      {
        "title": "Garantie Qualité",
        "description": "Produits certifiés de haute qualité"
      },
      {
        "title": "Support 24/7",
        "description": "Aide disponible toute la journée"
      }
    ],
    "quickLinks": "Liens Rapides",
    "customerService": "Service Client",
    "helpCenter": "Centre d'Aide",
    "shippingPolicy": "Politique d'Expédition",
    "faq": "FAQ",
    "home": "Accueil",
    "products": "Produits",
    "contact": "Contactez-nous",
    "offers": "Offres"
  },
  "storeProducts": {
    "title": "Magasin de Produits",
    "subtitle": "Découvrez une large gamme de produits de haute qualité aux meilleurs prix",
    "stats": {
      "productsAvailable": "produits disponibles",
      "category": "catégorie",
      "categories": "catégories",
      "currentPage": "sur la page actuelle"
    },
    "search": {
      "placeholder": "Rechercher des produits...",
      "clear": "Effacer la recherche",
      "quickFilter": "Filtre rapide:",
      "resultsInfo": "Affichage de {showing} sur {total} produits",
      "pageInfo": "(page {current} sur {total})",
      "activeFilters": "Filtres actifs:",
      "searchFilter": "Recherche: {query}",
      "categoryFilter": "Catégorie: {category}"
    },
    "filters": {
      "category": {
        "label": "Catégorie",
        "all": "Toutes les Catégories",
        "placeholder": "Choisir une catégorie"
      },
      "sort": {
        "label": "Trier",
        "placeholder": "Choisir le tri",
        "newest": "Plus récent",
        "priceLow": "Prix: Croissant",
        "priceHigh": "Prix: Décroissant",
        "nameAsc": "Nom: A-Z",
        "nameDesc": "Nom: Z-A"
      },
      "stock": {
        "label": "Disponibilité",
        "placeholder": "État du stock",
        "all": "Tous",
        "inStock": "En Stock",
        "outOfStock": "Rupture de Stock",
        "lowStock": "Stock Faible"
      },
      "reset": "Réinitialiser ({count})",
      "clear": "Effacer les filtres"
    },
    "view": {
      "grid": "Vue grille",
      "list": "Vue liste",
      "columns": "colonnes"
    },
    "pagination": {
      "previous": "Précédent",
      "next": "Suivant",
      "page": "Page {page}",
      "loading": "Chargement..."
    },
    "states": {
      "loading": "Chargement...",
      "error": {
        "title": "Une erreur s'est produite",
        "message": "Une erreur s'est produite lors du chargement des produits",
        "retry": "Réessayer",
        "categoriesError": "Une erreur s'est produite lors du chargement des catégories"
      },
      "empty": {
        "title": "Aucun produit correspondant",
        "message": "Nous n'avons pas trouvé de produits correspondant aux critères de recherche actuels. Essayez d'ajuster les filtres ou de rechercher avec des mots-clés différents.",
        "resetFilters": "Réinitialiser les filtres"
      }
    }
  },
  "productCard": {
    "buyNow": "Acheter Maintenant",
    "outOfStock": "Rupture de Stock",
    "quickView": "Aperçu Rapide",
    "new": "Nouveau",
    "limited": "Quantité Limitée",
    "available": "Disponible",
    "addedToWishlist": "Produit ajouté à la liste de souhaits",
    "removedFromWishlist": "Produit retiré de la liste de souhaits",
    "buyingProduct": "Redirection vers l'achat de {productName}",
    "noProducts": "Aucun produit",
    "noProductsMessage": "Aucun produit trouvé correspondant à vos critères de recherche. Veuillez essayer différents critères de recherche."
  },
  "productInfo": {
    "new": "Nouveau",
    "discount": "{percentage}% de Réduction",
    "available": "Disponible",
    "unavailable": "Indisponible",
    "rating": "{rating} ({count} avis)",
    "purchaseCount": "{count} personnes ont acheté ce produit depuis l'Algérie.",
    "currency": "DZD",
    "inStock": "En Stock",
    "pieces": "pièces",
    "outOfStock": "Actuellement en Rupture de Stock",
    "productDescription": "Description du Produit",
    "customerReviews": "Avis Clients ({count})",
    "verifiedPurchase": "Achat Vérifié"
  },
  "productOptions": {
    "color": "Couleur",
    "size": "Taille",
    "quantity": "Quantité",
    "loadingSizes": "Chargement des tailles...",
    "noSizesAvailable": "Aucune taille disponible pour cette couleur",
    "available": "Disponible: {{count}} pièces",
    "unavailable": "Indisponible",
    "totalPrice": "Prix Total: {{price}} DZD"
  },
  "productPurchase": {
    "orderProduct": "Commander le Produit",
    "specialOffers": "Offres Spéciales pour Vous",
    "alternativeOptions": "Options Alternatives qui Pourraient Vous Intéresser",
    "productDescription": "Description du Produit"
  },
  "orderForm": {
    "orderInfo": "Informations de Commande",
    "submittingOrder": "Envoi de la commande...",
    "submitOrder": "Envoyer la Commande",
    "completeOrder": "Finaliser la Commande",
    "fillDetails": "Remplissez les détails suivants pour finaliser votre commande",
    "fullName": "Nom Complet",
    "fullNamePlaceholder": "Entrez le nom complet",
    "phoneNumber": "Numéro de Téléphone",
    "phoneNumberPlaceholder": "Entrez le numéro de téléphone",
    "deliveryType": "Type de Livraison",
    "homeDelivery": "Livraison à Domicile",
    "homeDeliveryDesc": "Livrer la commande directement à votre adresse",
    "officePickup": "Retrait au Bureau de la Compagnie de Livraison",
    "officePickupDesc": "Retirer la commande au bureau de la compagnie de livraison",
    "state": "État",
    "municipality": "Municipalité",
    "selectMunicipality": "Sélectionner la Municipalité",
    "selectProvince": "Sélectionner la Province",
    "selectMunicipalityForPickup": "Sélectionner la Municipalité pour le Retrait",
    "province": "Province",
    "fixedDeliveryType": "Type de Livraison Fixe",
    "loadingDeliveryOptions": "Chargement des options de livraison...",
    "deliveryMethod": "Méthode de Livraison",
    "freeShipping": "Livraison Gratuite!",
    "shippingPrice": "Prix de Livraison",
    "deliveryOptions": "Options de Livraison",
    "orderInfo": "Informations de Commande",
    "submittingOrder": "Envoi de la commande...",
    "orderSummary": "Résumé de la Commande",
    "color": "Couleur:",
    "size": "Taille:",
    "product": "Produit ({{count}} pièce)",
    "deliveryFees": "Frais de Livraison",
    "toHome": "À Domicile",
    "totalAmount": "Montant Total",
    "currency": "DZD",
    "required": "*"
  },
  "common": {
    "loading": "Chargement...",
    "error": "Erreur survenue",
    "tryAgain": "Réessayer",
    "save": "Enregistrer",
    "cancel": "Annuler",
    "edit": "Modifier",
    "delete": "Supprimer",
    "view": "Voir",
    "close": "Fermer",
    "next": "Suivant",
    "previous": "Précédent",
    "search": "Rechercher",
    "filter": "Filtrer",
    "sort": "Trier",
    "currency": "SAR"
  },
  "app": {
    "title": "Console Bazaar",
    "loading": "Chargement...",
    "error": "Une erreur s'est produite",
    "success": "Opération réussie",
    "welcome": "Bienvenue dans Bazaar"
  },
  "nav": {
    "home": "Accueil",
    "products": "Produits",
    "orders": "Commandes",
    "customers": "Clients",
    "dashboard": "Tableau de bord",
    "settings": "Paramètres"
  },
  "button": {
    "save": "Enregistrer",
    "cancel": "Annuler",
    "delete": "Supprimer",
    "edit": "Modifier",
    "add": "Ajouter",
    "submit": "Soumettre",
    "back": "Retour",
    "next": "Suivant",
    "login": "Connexion",
    "logout": "Déconnexion"
  },
  "auth": {
    "login": "Connexion",
    "signup": "S'inscrire",
    "email": "Email",
    "password": "Mot de passe",
    "forgotPassword": "Mot de passe oublié?",
    "invalidCredentials": "Identifiants invalides"
  }
};

const resources = {
  ar: { translation: arTranslations },
  en: { translation: enTranslations },
  fr: { translation: frTranslations }
};

// جلب اللغة الافتراضية من قاعدة البيانات
const getDefaultLanguageFromDatabase = async () => {
  try {
    // الحصول على subdomain من URL الحالي
    const currentHost = window.location.hostname;
    let subdomain = currentHost.split('.')[0];
    
    // للتطوير المحلي، استخدم subdomain ثابت للاختبار
    if (subdomain === 'localhost' || subdomain === '127' || currentHost.includes('localhost')) {
      subdomain = 'testfinalfinalvhio'; // subdomain للاختبار
      console.log('🌐 وضع التطوير المحلي - استخدام subdomain للاختبار:', subdomain);
    }
    
    const supabase = getSupabaseClient();
    
    // جلب معرف المؤسسة من subdomain
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('subdomain', subdomain)
      .single();
    
    if (orgError || !orgData) {
      console.log('🌐 لم يتم العثور على المؤسسة للـ subdomain:', subdomain);
      return 'ar';
    }
    
    console.log('🌐 تم العثور على المؤسسة:', orgData.id);
    
    // جلب اللغة الافتراضية للمؤسسة مباشرة من organizations table
    const { data: orgWithSettings, error: orgSettingsError } = await supabase
      .from('organizations')
      .select('id, organization_settings(default_language)')
      .eq('id', orgData.id)
      .single();
    
    console.log('🌐 نتيجة استعلام إعدادات المؤسسة:', { orgWithSettings, orgSettingsError });
    console.log('🌐 تفاصيل البيانات الكاملة:', JSON.stringify(orgWithSettings, null, 2));
    
    if (orgSettingsError || !orgWithSettings) {
      console.log('🌐 خطأ في جلب إعدادات المؤسسة:', orgSettingsError);
      // fallback: محاولة الوصول المباشر
      try {
        const { data: directData, error: directError } = await supabase
          .from('organization_settings')
          .select('default_language')
          .eq('organization_id', orgData.id)
          .limit(1);
        
        console.log('🌐 نتيجة الوصول المباشر:', { directData, directError });
        
        if (!directError && directData && directData.length > 0) {
          console.log('🌐 تم جلب اللغة الافتراضية بالوصول المباشر:', directData[0].default_language);
          return directData[0].default_language || 'ar';
        }
      } catch (fallbackError) {
        console.log('🌐 فشل الوصول المباشر أيضاً:', fallbackError);
      }
      return 'ar';
    }
    
    // استخراج اللغة الافتراضية
    const organizationSettings = (orgWithSettings as any).organization_settings;
    console.log('🌐 إعدادات المؤسسة المستخرجة:', organizationSettings);
    console.log('🌐 نوع البيانات:', typeof organizationSettings, Array.isArray(organizationSettings));
    
    if (!organizationSettings || (Array.isArray(organizationSettings) && organizationSettings.length === 0)) {
      console.log('🌐 لم يتم العثور على إعدادات المؤسسة:', orgData.id);
      return 'ar';
    }
    
    let defaultLanguage;
    if (Array.isArray(organizationSettings)) {
      defaultLanguage = organizationSettings[0]?.default_language;
    } else {
      defaultLanguage = organizationSettings?.default_language;
    }
    
    console.log('🌐 تم جلب اللغة الافتراضية من قاعدة البيانات:', defaultLanguage);
    return defaultLanguage || 'ar';
    
  } catch (error) {
    console.error('خطأ في جلب اللغة الافتراضية:', error);
    return 'ar'; // fallback للعربية
  }
};

// تهيئة اللغة - بدء بالعربية ثم التحديث من قاعدة البيانات
const getInitialLanguage = () => {
  if (typeof window !== 'undefined') {
    // فحص إذا كان المستخدم اختار لغة خلال آخر ساعة
    const savedLanguage = localStorage.getItem('i18nextLng');
    const languageTimestamp = localStorage.getItem('i18nextLng_timestamp');
    
    if (savedLanguage && languageTimestamp) {
      const timeSinceManualChange = Date.now() - parseInt(languageTimestamp);
      // إذا اختار المستخدم لغة خلال آخر ساعة، احترم اختياره
      if (timeSinceManualChange < 3600000 && ['ar', 'en', 'fr'].includes(savedLanguage)) {
        console.log('🌐 استخدام اللغة المحفوظة من المستخدم:', savedLanguage);
        return savedLanguage;
      }
    }
  }
  
  // ابدأ بالعربية كافتراضية، ثم سيتم التحديث من قاعدة البيانات
  return 'ar';
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLanguage(),
    fallbackLng: 'ar',
    debug: true, // تفعيل التتبع للتشخيص
    
    interpolation: {
      escapeValue: false,
    },
    
    // إعدادات كشف اللغة
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng'
    },
    
    // قائمة اللغات المدعومة
    supportedLngs: ['ar', 'en', 'fr']
  });

// حفظ اللغة في localStorage عند تغييرها
i18n.on('languageChanged', (lng) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('i18nextLng', lng);
    
    // إزالة المفاتيح القديمة للتوحيد
    localStorage.removeItem('selectedLanguage');
    
    // تحديث اتجاه الصفحة
    const language = lng === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = language;
    document.documentElement.lang = lng;
  }
});

// تحديث اللغة من قاعدة البيانات بعد التهيئة
const updateLanguageFromDatabase = async () => {
  if (typeof window !== 'undefined') {
    try {
      const defaultLanguage = await getDefaultLanguageFromDatabase();
      
      // فحص إذا كان المستخدم اختار لغة يدوياً مؤخراً
      const savedLanguage = localStorage.getItem('i18nextLng');
      const languageTimestamp = localStorage.getItem('i18nextLng_timestamp');
      
      let shouldUseDefaultLanguage = true;
      
      if (savedLanguage && languageTimestamp) {
        const timeSinceManualChange = Date.now() - parseInt(languageTimestamp);
        // إذا اختار المستخدم لغة خلال آخر ساعة، احترم اختياره
        if (timeSinceManualChange < 3600000) {
          shouldUseDefaultLanguage = false;
          console.log('🌐 احترام اختيار المستخدم الحديث:', savedLanguage);
        }
      }
      
      // تطبيق اللغة الافتراضية إذا لزم الأمر
      if (shouldUseDefaultLanguage && defaultLanguage !== i18n.language) {
        console.log('🌐 تطبيق اللغة الافتراضية من قاعدة البيانات:', defaultLanguage);
        await i18n.changeLanguage(defaultLanguage);
      }
      
    } catch (error) {
      console.error('خطأ في تحديث اللغة من قاعدة البيانات:', error);
    }
  }
};

// تشغيل تحديث اللغة بعد تهيئة i18n
setTimeout(updateLanguageFromDatabase, 100);

export default i18n;
