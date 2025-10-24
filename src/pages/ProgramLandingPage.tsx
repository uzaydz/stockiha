import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  ShoppingCart, 
  Users, 
  Package, 
  TrendingUp, 
  Settings, 
  Store, 
  CreditCard,
  Headphones,
  Shield,
  Zap,
  Star,
  ArrowRight,
  Play,
  CheckCircle,
  Globe,
  Smartphone,
  Laptop,
  Monitor
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

/**
 * صفحة الهبوط الجديدة للبرنامج - تصميم احترافي برتقالي
 * مستوحاة من تصميم Steam مع نظام ألوان برتقالي احترافي
 */
const ProgramLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, userProfile, organization } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // محاكاة تحميل البيانات
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">جاري تحميل البرنامج...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-orange-600/5"></div>
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-500/10 via-transparent to-transparent"></div>
      
      {/* Header */}
      <header className="relative bg-gray-800/60 backdrop-blur-md border-b border-orange-500/30 shadow-lg shadow-orange-500/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/25">
                <Store className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">Bazaar Console</h1>
            </div>
            
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/25">
                  <span className="text-white text-sm font-semibold">
                    {userProfile?.name?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-white text-sm font-medium">{userProfile?.name || 'المستخدم'}</p>
                  <p className="text-orange-400 text-xs">{organization?.name || 'المؤسسة'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-16 relative">
          {/* Floating Elements */}
          <div className="absolute top-10 left-10 w-20 h-20 bg-orange-500/10 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute top-20 right-20 w-16 h-16 bg-orange-600/10 rounded-full blur-lg animate-pulse delay-1000"></div>
          <div className="absolute bottom-10 left-1/4 w-12 h-12 bg-orange-400/10 rounded-full blur-md animate-pulse delay-2000"></div>
          
          <div className="relative z-10">
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              مرحباً بك في
              <span className="block bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 bg-clip-text text-transparent animate-pulse">
                Bazaar Console
              </span>
            </h2>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-4xl mx-auto leading-relaxed">
              نظام إدارة شامل للمتاجر والأعمال التجارية - كل ما تحتاجه لإدارة عملك في مكان واحد
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <button 
                onClick={() => navigate('/dashboard')}
                className="group bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-10 py-5 rounded-xl font-bold text-xl transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-orange-500/30 relative overflow-hidden"
              >
                <span className="relative z-10 flex items-center">
                  ابدأ الآن
                  <ArrowRight className="w-6 h-6 mr-3 rtl:ml-3 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
              <button className="group border-2 border-orange-500 text-orange-400 hover:bg-orange-500 hover:text-white px-10 py-5 rounded-xl font-bold text-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-orange-500/20">
                <span className="flex items-center">
                  <Play className="w-6 h-6 mr-3 rtl:ml-3 group-hover:scale-110 transition-transform" />
                  شاهد الفيديو التعريفي
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {/* إدارة المنتجات */}
          <div className="group bg-gray-800/60 backdrop-blur-md rounded-2xl p-8 border border-orange-500/20 hover:border-orange-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-orange-500/20 hover:-translate-y-2 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-orange-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg shadow-orange-500/25">
                <Package className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-orange-400 transition-colors">إدارة المنتجات</h3>
              <p className="text-gray-300 mb-6 text-lg leading-relaxed">
                إدارة شاملة للمنتجات والمخزون مع تتبع دقيق للحركات والتحليلات المتقدمة
              </p>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-center text-base">
                  <CheckCircle className="w-5 h-5 text-orange-500 mr-3 rtl:ml-3 flex-shrink-0" />
                  إضافة وتعديل المنتجات
                </li>
                <li className="flex items-center text-base">
                  <CheckCircle className="w-5 h-5 text-orange-500 mr-3 rtl:ml-3 flex-shrink-0" />
                  تتبع المخزون الذكي
                </li>
                <li className="flex items-center text-base">
                  <CheckCircle className="w-5 h-5 text-orange-500 mr-3 rtl:ml-3 flex-shrink-0" />
                  إدارة الفئات المتقدمة
                </li>
                <li className="flex items-center text-base">
                  <CheckCircle className="w-5 h-5 text-orange-500 mr-3 rtl:ml-3 flex-shrink-0" />
                  رموز الباركود
                </li>
              </ul>
            </div>
          </div>

          {/* المبيعات والطلبات */}
          <div className="group bg-gray-800/60 backdrop-blur-md rounded-2xl p-8 border border-orange-500/20 hover:border-orange-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-orange-500/20 hover:-translate-y-2 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-orange-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg shadow-orange-500/25">
                <ShoppingCart className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-orange-400 transition-colors">المبيعات والطلبات</h3>
              <p className="text-gray-300 mb-6 text-lg leading-relaxed">
                نظام متكامل لإدارة المبيعات والطلبات مع تتبع الحالة والتحليلات المتقدمة
              </p>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-center text-base">
                  <CheckCircle className="w-5 h-5 text-orange-500 mr-3 rtl:ml-3 flex-shrink-0" />
                  إدارة الطلبات المتقدمة
                </li>
                <li className="flex items-center text-base">
                  <CheckCircle className="w-5 h-5 text-orange-500 mr-3 rtl:ml-3 flex-shrink-0" />
                  تتبع المبيعات في الوقت الفعلي
                </li>
                <li className="flex items-center text-base">
                  <CheckCircle className="w-5 h-5 text-orange-500 mr-3 rtl:ml-3 flex-shrink-0" />
                  تقارير مفصلة ومخصصة
                </li>
                <li className="flex items-center text-base">
                  <CheckCircle className="w-5 h-5 text-orange-500 mr-3 rtl:ml-3 flex-shrink-0" />
                  إشعارات تلقائية
                </li>
              </ul>
            </div>
          </div>

          {/* العملاء */}
          <div className="group bg-gray-800/60 backdrop-blur-md rounded-2xl p-8 border border-orange-500/20 hover:border-orange-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-orange-500/20 hover:-translate-y-2 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-orange-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg shadow-orange-500/25">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-orange-400 transition-colors">إدارة العملاء</h3>
              <p className="text-gray-300 mb-6 text-lg leading-relaxed">
                قاعدة بيانات شاملة للعملاء مع تتبع تاريخ الشراء والتحليلات المتقدمة
              </p>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-center text-base">
                  <CheckCircle className="w-5 h-5 text-orange-500 mr-3 rtl:ml-3 flex-shrink-0" />
                  ملفات العملاء المتكاملة
                </li>
                <li className="flex items-center text-base">
                  <CheckCircle className="w-5 h-5 text-orange-500 mr-3 rtl:ml-3 flex-shrink-0" />
                  تتبع المشتريات والسلوك
                </li>
                <li className="flex items-center text-base">
                  <CheckCircle className="w-5 h-5 text-orange-500 mr-3 rtl:ml-3 flex-shrink-0" />
                  إدارة الديون والمدفوعات
                </li>
                <li className="flex items-center text-base">
                  <CheckCircle className="w-5 h-5 text-orange-500 mr-3 rtl:ml-3 flex-shrink-0" />
                  برامج الولاء
                </li>
              </ul>
            </div>
          </div>

          {/* التقارير والتحليلات */}
          <div className="group bg-gray-800/60 backdrop-blur-md rounded-2xl p-8 border border-orange-500/20 hover:border-orange-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-orange-500/20 hover:-translate-y-2 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-orange-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg shadow-orange-500/25">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-orange-400 transition-colors">التقارير والتحليلات</h3>
              <p className="text-gray-300 mb-6 text-lg leading-relaxed">
                تقارير مفصلة ورسوم بيانية متقدمة لتحليل الأداء واتخاذ القرارات
              </p>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-center text-base">
                  <CheckCircle className="w-5 h-5 text-orange-500 mr-3 rtl:ml-3 flex-shrink-0" />
                  تقارير المبيعات التفاعلية
                </li>
                <li className="flex items-center text-base">
                  <CheckCircle className="w-5 h-5 text-orange-500 mr-3 rtl:ml-3 flex-shrink-0" />
                  تحليل الأداء المتقدم
                </li>
                <li className="flex items-center text-base">
                  <CheckCircle className="w-5 h-5 text-orange-500 mr-3 rtl:ml-3 flex-shrink-0" />
                  مؤشرات KPI مخصصة
                </li>
                <li className="flex items-center text-base">
                  <CheckCircle className="w-5 h-5 text-orange-500 mr-3 rtl:ml-3 flex-shrink-0" />
                  تنبؤات ذكية
                </li>
              </ul>
            </div>
          </div>

          {/* نقطة البيع */}
          <div className="group bg-gray-800/60 backdrop-blur-md rounded-2xl p-8 border border-orange-500/20 hover:border-orange-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-orange-500/20 hover:-translate-y-2 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-orange-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg shadow-orange-500/25">
                <CreditCard className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-orange-400 transition-colors">نقطة البيع</h3>
              <p className="text-gray-300 mb-6 text-lg leading-relaxed">
                نظام نقطة بيع متطور مع دعم الباركود والدفع والطباعة المتقدمة
              </p>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-center text-base">
                  <CheckCircle className="w-5 h-5 text-orange-500 mr-3 rtl:ml-3 flex-shrink-0" />
                  فحص الباركود السريع
                </li>
                <li className="flex items-center text-base">
                  <CheckCircle className="w-5 h-5 text-orange-500 mr-3 rtl:ml-3 flex-shrink-0" />
                  طرق دفع متعددة ومتقدمة
                </li>
                <li className="flex items-center text-base">
                  <CheckCircle className="w-5 h-5 text-orange-500 mr-3 rtl:ml-3 flex-shrink-0" />
                  طباعة الفواتير الذكية
                </li>
                <li className="flex items-center text-base">
                  <CheckCircle className="w-5 h-5 text-orange-500 mr-3 rtl:ml-3 flex-shrink-0" />
                  إدارة النقدية
                </li>
              </ul>
            </div>
          </div>

          {/* المتجر الإلكتروني */}
          <div className="group bg-gray-800/60 backdrop-blur-md rounded-2xl p-8 border border-orange-500/20 hover:border-orange-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-orange-500/20 hover:-translate-y-2 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-orange-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg shadow-orange-500/25">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-orange-400 transition-colors">المتجر الإلكتروني</h3>
              <p className="text-gray-300 mb-6 text-lg leading-relaxed">
                متجر إلكتروني احترافي مع تصميم متجاوب وتجربة مستخدم متميزة
              </p>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-center text-base">
                  <CheckCircle className="w-5 h-5 text-orange-500 mr-3 rtl:ml-3 flex-shrink-0" />
                  تصميم متجاوب ومتقدم
                </li>
                <li className="flex items-center text-base">
                  <CheckCircle className="w-5 h-5 text-orange-500 mr-3 rtl:ml-3 flex-shrink-0" />
                  سلة التسوق الذكية
                </li>
                <li className="flex items-center text-base">
                  <CheckCircle className="w-5 h-5 text-orange-500 mr-3 rtl:ml-3 flex-shrink-0" />
                  نظام الطلبات المتكامل
                </li>
                <li className="flex items-center text-base">
                  <CheckCircle className="w-5 h-5 text-orange-500 mr-3 rtl:ml-3 flex-shrink-0" />
                  SEO محسن
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-r from-orange-500/10 via-orange-600/5 to-orange-500/10 rounded-3xl p-10 border border-orange-500/30 shadow-2xl shadow-orange-500/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-orange-600/5"></div>
          <div className="relative z-10">
            <h3 className="text-3xl font-bold text-white mb-8 text-center">الوصول السريع</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <button 
                onClick={() => navigate('/dashboard/products')}
                className="group bg-gray-800/60 hover:bg-orange-500/20 border border-orange-500/30 hover:border-orange-500 rounded-2xl p-6 text-center transition-all duration-500 hover:scale-105 hover:shadow-lg hover:shadow-orange-500/20"
              >
                <Package className="w-10 h-10 text-orange-500 mx-auto mb-3 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300" />
                <p className="text-white font-semibold text-lg">المنتجات</p>
              </button>
              
              <button 
                onClick={() => navigate('/dashboard/orders')}
                className="group bg-gray-800/60 hover:bg-orange-500/20 border border-orange-500/30 hover:border-orange-500 rounded-2xl p-6 text-center transition-all duration-500 hover:scale-105 hover:shadow-lg hover:shadow-orange-500/20"
              >
                <ShoppingCart className="w-10 h-10 text-orange-500 mx-auto mb-3 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300" />
                <p className="text-white font-semibold text-lg">الطلبات</p>
              </button>
              
              <button 
                onClick={() => navigate('/dashboard/customers')}
                className="group bg-gray-800/60 hover:bg-orange-500/20 border border-orange-500/30 hover:border-orange-500 rounded-2xl p-6 text-center transition-all duration-500 hover:scale-105 hover:shadow-lg hover:shadow-orange-500/20"
              >
                <Users className="w-10 h-10 text-orange-500 mx-auto mb-3 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300" />
                <p className="text-white font-semibold text-lg">العملاء</p>
              </button>
              
              <button 
                onClick={() => navigate('/dashboard/analytics')}
                className="group bg-gray-800/60 hover:bg-orange-500/20 border border-orange-500/30 hover:border-orange-500 rounded-2xl p-6 text-center transition-all duration-500 hover:scale-105 hover:shadow-lg hover:shadow-orange-500/20"
              >
                <BarChart3 className="w-10 h-10 text-orange-500 mx-auto mb-3 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300" />
                <p className="text-white font-semibold text-lg">التقارير</p>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center group">
            <div className="text-5xl font-bold text-orange-500 mb-3 group-hover:scale-110 transition-transform duration-300">100%</div>
            <p className="text-gray-300 text-lg">نسبة الأمان</p>
            <div className="w-16 h-1 bg-gradient-to-r from-orange-500 to-orange-600 mx-auto mt-2 rounded-full"></div>
          </div>
          <div className="text-center group">
            <div className="text-5xl font-bold text-orange-500 mb-3 group-hover:scale-110 transition-transform duration-300">24/7</div>
            <p className="text-gray-300 text-lg">دعم فني</p>
            <div className="w-16 h-1 bg-gradient-to-r from-orange-500 to-orange-600 mx-auto mt-2 rounded-full"></div>
          </div>
          <div className="text-center group">
            <div className="text-5xl font-bold text-orange-500 mb-3 group-hover:scale-110 transition-transform duration-300">99.9%</div>
            <p className="text-gray-300 text-lg">وقت التشغيل</p>
            <div className="w-16 h-1 bg-gradient-to-r from-orange-500 to-orange-600 mx-auto mt-2 rounded-full"></div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800/60 backdrop-blur-md border-t border-orange-500/30 mt-20 shadow-2xl shadow-orange-500/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/25">
                <Store className="w-7 h-7 text-white" />
              </div>
              <h4 className="text-2xl font-bold text-white mr-4 rtl:ml-4">Bazaar Console</h4>
            </div>
            <p className="text-gray-300 text-lg mb-6 max-w-2xl mx-auto">
              نظام إدارة شامل ومتطور للمتاجر والأعمال التجارية - مصمم لتحقيق أقصى استفادة من عملك
            </p>
            <div className="flex justify-center space-x-8 rtl:space-x-reverse mb-8">
              <button className="group text-gray-400 hover:text-orange-500 transition-all duration-300 hover:scale-110">
                <Headphones className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                <span className="block text-sm mt-1">الدعم</span>
              </button>
              <button className="group text-gray-400 hover:text-orange-500 transition-all duration-300 hover:scale-110">
                <Settings className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                <span className="block text-sm mt-1">الإعدادات</span>
              </button>
              <button className="group text-gray-400 hover:text-orange-500 transition-all duration-300 hover:scale-110">
                <Shield className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                <span className="block text-sm mt-1">الأمان</span>
              </button>
            </div>
            <div className="border-t border-orange-500/20 pt-6">
              <p className="text-gray-400">
                © 2024 Bazaar Console. جميع الحقوق محفوظة.
              </p>
              <p className="text-orange-400 text-sm mt-2">
                مصمم ومطور بـ ❤️ لخدمة الأعمال التجارية
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ProgramLandingPage;
