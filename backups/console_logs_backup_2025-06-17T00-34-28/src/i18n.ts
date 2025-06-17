import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// الموارد اللغوية
const resources = {
  ar: {
    translation: {
      // قسم الواجهة العامة
      'app.title': 'stockiha',
      'app.loading': 'جاري التحميل...',
      'app.error': 'حدث خطأ',
      'app.success': 'تمت العملية بنجاح',
      'app.welcome': 'مرحبًا بك في بازار',
      
      // قسم التنقل
      'nav.home': 'الرئيسية',
      'nav.products': 'المنتجات',
      'nav.orders': 'الطلبات',
      'nav.customers': 'العملاء',
      'nav.dashboard': 'لوحة التحكم',
      'nav.settings': 'الإعدادات',
      
      // قسم المنتجات
      'product.title': 'المنتجات',
      'product.add': 'إضافة منتج',
      'product.edit': 'تعديل المنتج',
      'product.name': 'اسم المنتج',
      'product.price': 'السعر',
      'product.discount': 'الخصم',
      'product.description': 'الوصف',
      'product.category': 'الفئة',
      'product.quantity': 'الكمية',
      'product.color': 'اللون',
      'product.size': 'المقاس',
      'product.images': 'الصور',
      'product.available': 'متوفر',
      'product.notAvailable': 'غير متوفر',
      'product.rating': 'التقييم',
      
      // قسم الطلبات
      'order.title': 'الطلبات',
      'order.new': 'طلب جديد',
      'order.customer': 'العميل',
      'order.total': 'المجموع',
      'order.status': 'الحالة',
      'order.date': 'التاريخ',
      'order.details': 'التفاصيل',
      'order.payment': 'الدفع',
      'order.shipping': 'الشحن',
      
      // قسم العملاء
      'customer.title': 'العملاء',
      'customer.name': 'الاسم',
      'customer.phone': 'الهاتف',
      'customer.email': 'البريد الإلكتروني',
      'customer.address': 'العنوان',
      'customer.orders': 'الطلبات',
      
      // قسم الأزرار والإجراءات
      'button.save': 'حفظ',
      'button.cancel': 'إلغاء',
      'button.delete': 'حذف',
      'button.edit': 'تعديل',
      'button.add': 'إضافة',
      'button.submit': 'إرسال',
      'button.back': 'رجوع',
      'button.next': 'التالي',
      'button.login': 'تسجيل الدخول',
      'button.logout': 'تسجيل الخروج',
      
      // رسائل المصادقة
      'auth.login': 'تسجيل الدخول',
      'auth.signup': 'إنشاء حساب',
      'auth.email': 'البريد الإلكتروني',
      'auth.password': 'كلمة المرور',
      'auth.forgotPassword': 'نسيت كلمة المرور؟',
      'auth.invalidCredentials': 'بيانات الاعتماد غير صحيحة',
    }
  },
  en: {
    translation: {
      // General UI Section
      'app.title': 'Bazaar Console',
      'app.loading': 'Loading...',
      'app.error': 'An error occurred',
      'app.success': 'Operation successful',
      'app.welcome': 'Welcome to Bazaar',
      
      // Navigation Section
      'nav.home': 'Home',
      'nav.products': 'Products',
      'nav.orders': 'Orders',
      'nav.customers': 'Customers',
      'nav.dashboard': 'Dashboard',
      'nav.settings': 'Settings',
      
      // Products Section
      'product.title': 'Products',
      'product.add': 'Add Product',
      'product.edit': 'Edit Product',
      'product.name': 'Product Name',
      'product.price': 'Price',
      'product.discount': 'Discount',
      'product.description': 'Description',
      'product.category': 'Category',
      'product.quantity': 'Quantity',
      'product.color': 'Color',
      'product.size': 'Size',
      'product.images': 'Images',
      'product.available': 'Available',
      'product.notAvailable': 'Not Available',
      'product.rating': 'Rating',
      
      // Orders Section
      'order.title': 'Orders',
      'order.new': 'New Order',
      'order.customer': 'Customer',
      'order.total': 'Total',
      'order.status': 'Status',
      'order.date': 'Date',
      'order.details': 'Details',
      'order.payment': 'Payment',
      'order.shipping': 'Shipping',
      
      // Customers Section
      'customer.title': 'Customers',
      'customer.name': 'Name',
      'customer.phone': 'Phone',
      'customer.email': 'Email',
      'customer.address': 'Address',
      'customer.orders': 'Orders',
      
      // Buttons and Actions Section
      'button.save': 'Save',
      'button.cancel': 'Cancel',
      'button.delete': 'Delete',
      'button.edit': 'Edit',
      'button.add': 'Add',
      'button.submit': 'Submit',
      'button.back': 'Back',
      'button.next': 'Next',
      'button.login': 'Login',
      'button.logout': 'Logout',
      
      // Authentication Messages
      'auth.login': 'Login',
      'auth.signup': 'Sign Up',
      'auth.email': 'Email',
      'auth.password': 'Password',
      'auth.forgotPassword': 'Forgot Password?',
      'auth.invalidCredentials': 'Invalid credentials',
    }
  }
};

// إعداد i18n
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ar', // اللغة الافتراضية
    fallbackLng: 'ar',
    interpolation: {
      escapeValue: false, // لا داعي للهروب من React
    },
    react: {
      useSuspense: true, // استخدام Suspense في React
    },
  });

export default i18n;
