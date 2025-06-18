import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

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
    "expandSidebar": "توسيع القائمة الجانبية"
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
    "expandSidebar": "Expand Sidebar"
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
    "expandSidebar": "Développer la barre latérale"
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
  }
};

const resources = {
  ar: { translation: arTranslations },
  en: { translation: enTranslations },
  fr: { translation: frTranslations }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ar', // العربية كلغة افتراضية
    fallbackLng: 'ar',
    debug: false,
    
    interpolation: {
      escapeValue: false,
    }
  });

export default i18n; 