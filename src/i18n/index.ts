import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

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
  "featuredProducts": {
    "title": "منتجاتنا المميزة",
    "subtitle": "اكتشف أفضل منتجاتنا المختارة بعناية",
    "addToCart": "أضف للعربة",
    "addToFavorites": "أضف للمفضلة",
    "quickView": "عرض سريع",
    "viewDetails": "عرض التفاصيل",
    "outOfStock": "نفد من المخزون",
    "onSale": "خصم",
    "new": "جديد",
    "noProducts": "لا توجد منتجات متاحة حالياً"
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
  "featuredProducts": {
    "title": "Our Featured Products",
    "subtitle": "Discover our best handpicked products",
    "addToCart": "Add to Cart",
    "addToFavorites": "Add to Favorites",
    "quickView": "Quick View",
    "viewDetails": "View Details",
    "outOfStock": "Out of Stock",
    "onSale": "On Sale",
    "new": "New",
    "noProducts": "No products available at the moment"
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
  "featuredProducts": {
    "title": "Nos produits vedettes",
    "subtitle": "Découvrez nos meilleurs produits sélectionnés",
    "addToCart": "Ajouter au panier",
    "addToFavorites": "Ajouter aux favoris",
    "quickView": "Aperçu rapide",
    "viewDetails": "Voir les détails",
    "outOfStock": "Rupture de stock",
    "onSale": "En solde",
    "new": "Nouveau",
    "noProducts": "Aucun produit disponible pour le moment"
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

// تهيئة اللغة من localStorage أو الافتراضية
const getInitialLanguage = () => {
  if (typeof window !== 'undefined') {
    const savedLanguage = localStorage.getItem('selectedLanguage');
    if (savedLanguage && ['ar', 'en', 'fr'].includes(savedLanguage)) {
      return savedLanguage;
    }
  }
  return 'ar'; // العربية كلغة افتراضية
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
      lookupLocalStorage: 'selectedLanguage'
    },
    
    // قائمة اللغات المدعومة
    supportedLngs: ['ar', 'en', 'fr']
  });

// حفظ اللغة في localStorage عند تغييرها
i18n.on('languageChanged', (lng) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('selectedLanguage', lng);
    
    // تحديث اتجاه الصفحة
    const language = lng === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = language;
    document.documentElement.lang = lng;
  }
});

export default i18n; 