import React from 'react';
import { TrendingUp, Package, CreditCard, BarChart3, ShoppingCart, Users, Clock, CheckCircle, AlertCircle, DollarSign } from 'lucide-react';

export default function DashboardPreview() {
  return (
    <div className="mt-16 max-w-5xl mx-auto">
      <div className="relative">
        {/* Main Dashboard Container */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          {/* Browser Header */}
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            </div>
            <div className="flex-1 bg-gray-50 rounded-lg px-4 py-2 text-center">
              <span className="text-gray-600 text-sm font-medium">yourstore.stockiha.com/dashboard</span>
            </div>
          </div>
          
          {/* Dashboard Header */}
          <div className="flex items-center justify-between mb-6" dir="rtl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">لوحة التحكم الرئيسية</h3>
                <p className="text-gray-600 text-sm">مرحباً بك، أحمد</p>
              </div>
            </div>
            <div className="text-left">
              <div className="text-2xl font-black text-green-600">247,500 دج</div>
              <div className="text-sm text-gray-500">إجمالي المبيعات اليوم</div>
            </div>
          </div>
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6" dir="rtl">
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200 text-center">
              <TrendingUp className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <div className="text-xl font-black text-green-600 mb-1">47</div>
              <div className="text-xs text-gray-600 font-medium">طلبات جديدة</div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200 text-center">
              <Package className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <div className="text-xl font-black text-blue-600 mb-1">234</div>
              <div className="text-xs text-gray-600 font-medium">منتجات متوفرة</div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200 text-center">
              <BarChart3 className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <div className="text-xl font-black text-purple-600 mb-1">89%</div>
              <div className="text-xs text-gray-600 font-medium">معدل التحويل</div>
            </div>
            
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200 text-center">
              <CreditCard className="w-6 h-6 text-orange-600 mx-auto mb-2" />
              <div className="text-xl font-black text-orange-600 mb-1">12</div>
              <div className="text-xs text-gray-600 font-medium">عمليات دفع</div>
            </div>
          </div>

          {/* Sales Chart */}
          <div className="bg-gray-50 rounded-xl p-5 mb-6" dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-gray-800">نمو المبيعات الأسبوعية</h4>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-600 font-bold text-sm">+24%</span>
              </div>
            </div>
            <div className="flex items-end justify-between gap-2 h-20">
              {[45, 70, 55, 85, 65, 95, 80, 90].map((height, i) => (
                <div
                  key={i}
                  className="bg-gradient-to-t from-orange-400 to-orange-500 rounded-t-lg flex-1"
                  style={{ 
                    height: `${height}%`,
                    animationDelay: `${i * 0.1}s`
                  }}
                ></div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>السبت</span>
              <span>الأحد</span>
              <span>الاثنين</span>
              <span>الثلاثاء</span>
              <span>الأربعاء</span>
              <span>الخميس</span>
              <span>الجمعة</span>
              <span>اليوم</span>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="grid md:grid-cols-2 gap-6 mb-6" dir="rtl">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-gray-800">الطلبات الأخيرة</h4>
                <span className="text-xs text-gray-500">آخر تحديث: الآن</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">طلب #1247</div>
                      <div className="text-xs text-gray-600">فاطمة الزهراء</div>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-green-600">4,500 دج</div>
                    <div className="text-xs text-gray-500">مكتمل</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-yellow-600" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">طلب #1248</div>
                      <div className="text-xs text-gray-600">محمد الطاهر</div>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-yellow-600">2,800 دج</div>
                    <div className="text-xs text-gray-500">قيد التحضير</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-gray-800">المنتجات الأكثر مبيعاً</h4>
                <span className="text-xs text-gray-500">هذا الأسبوع</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-500 rounded-lg"></div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">جهاز لابتوب</div>
                      <div className="text-xs text-gray-600">23 قطعة مباعة</div>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-gray-900">89,000 دج</div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-500 rounded-lg"></div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">هاتف ذكي</div>
                      <div className="text-xs text-gray-600">18 قطعة مباعة</div>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-gray-900">45,000 دج</div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-500 rounded-lg"></div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">ساعة ذكية</div>
                      <div className="text-xs text-gray-600">15 قطعة مباعة</div>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-gray-900">12,000 دج</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3" dir="rtl">
            <button className="bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 px-4 rounded-xl text-sm font-medium">
              طلب جديد
            </button>
            <button className="bg-gray-100 text-gray-700 py-3 px-4 rounded-xl text-sm font-medium border border-gray-200">
              إدارة المخزون
            </button>
            <button className="bg-blue-100 text-blue-700 py-3 px-4 rounded-xl text-sm font-medium border border-blue-200">
              التقارير
            </button>
            <button className="bg-purple-100 text-purple-700 py-3 px-4 rounded-xl text-sm font-medium border border-purple-200">
              العملاء
            </button>
          </div>
        </div>

        {/* Floating Feature Badges */}
        <div className="absolute -top-4 left-6 bg-white rounded-xl px-4 py-2 border border-gray-200">
          <span className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            متصل الآن
          </span>
        </div>
        <div className="absolute -top-4 right-6 bg-white rounded-xl px-4 py-2 border border-gray-200">
          <span className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-orange-500" />
            +15 مبيعة اليوم
          </span>
        </div>
      </div>
    </div>
  );
}
