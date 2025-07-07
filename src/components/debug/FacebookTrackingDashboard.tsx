import React, { useState } from 'react';
import { FacebookPixelChecker } from './FacebookPixelChecker';
import { FacebookCookieManager } from './FacebookCookieManager';
import { FacebookURLTracker } from './FacebookURLTracker';
import { ConversionAPIMonitor } from './ConversionAPIMonitor';
import { DuplicateEventDetector } from './DuplicateEventDetector';
import { QuickTrackingCheck } from './QuickTrackingCheck';

interface FacebookTrackingDashboardProps {
  productId?: string;
  organizationId?: string;
}

export const FacebookTrackingDashboard: React.FC<FacebookTrackingDashboardProps> = ({
  productId = 'demo',
  organizationId = 'demo'
}) => {
  const [activeSection, setActiveSection] = useState('overview');
  const [isMinimized, setIsMinimized] = useState(false);

  const sections = [
    { id: 'overview', name: 'نظرة عامة', icon: '📊' },
    { id: 'pixel', name: 'Facebook Pixel', icon: '🎯' },
    { id: 'cookies', name: 'إدارة الكوكيز', icon: '🍪' },
    { id: 'urls', name: 'مراقب الروابط', icon: '🔗' },
    { id: 'api', name: 'Conversion API', icon: '🔄' },
    { id: 'duplicates', name: 'الأحداث المكررة', icon: '🔍' },
    { id: 'quick', name: 'فحص سريع', icon: '⚡' }
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">🚀 لوحة تحكم Facebook Tracking</h2>
              <p className="text-gray-700 mb-4">
                أدوات شاملة لمراقبة وتشخيص Facebook Pixel و Conversion API
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 shadow-sm border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Facebook Pixel</span>
                    <span className="text-lg">🎯</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    مراقبة حالة البكسل والأحداث المرسلة
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4 shadow-sm border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">إدارة الكوكيز</span>
                    <span className="text-lg">🍪</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    إدارة _fbp و _fbc cookies تلقائياً
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4 shadow-sm border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">مراقب الروابط</span>
                    <span className="text-lg">🔗</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    تتبع fbclid والروابط من Facebook
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4 shadow-sm border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Conversion API</span>
                    <span className="text-lg">🔄</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    مراقبة طلبات Server-Side API
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4 shadow-sm border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">كشف التكرار</span>
                    <span className="text-lg">🔍</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    اكتشاف ومنع الأحداث المكررة
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4 shadow-sm border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">فحص سريع</span>
                    <span className="text-lg">⚡</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    تشخيص سريع لجميع الأنظمة
                  </div>
                </div>
              </div>
            </div>

            {/* فحص سريع مدمج */}
            <QuickTrackingCheck />
          </div>
        );
      
      case 'pixel':
        return <FacebookPixelChecker />;
      
      case 'cookies':
        return <FacebookCookieManager />;
      
      case 'urls':
        return <FacebookURLTracker />;
      
      case 'api':
        return <ConversionAPIMonitor />;
      
      case 'duplicates':
        return <DuplicateEventDetector />;
      
      case 'quick':
        return <QuickTrackingCheck />;
      
      default:
        return <div>القسم غير موجود</div>;
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2"
        >
          <span>🚀</span>
          <span>Facebook Tracking</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-4 z-50 bg-white rounded-lg shadow-2xl border flex max-h-[90vh] overflow-hidden">
      {/* الشريط الجانبي */}
      <div className="w-64 bg-gray-50 border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xl">🚀</span>
              <div>
                <h3 className="font-bold text-gray-900">Facebook Tracking</h3>
                <p className="text-xs text-gray-600">لوحة التحكم الشاملة</p>
              </div>
            </div>
            <button
              onClick={() => setIsMinimized(true)}
              className="text-gray-400 hover:text-gray-600"
            >
              ➖
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <nav className="p-2 space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeSection === section.id
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-lg">{section.icon}</span>
                <span>{section.name}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t bg-gray-100">
          <div className="text-xs text-gray-600 space-y-1">
            <div>المنتج: {productId}</div>
            <div>المؤسسة: {organizationId}</div>
          </div>
        </div>
      </div>

      {/* المحتوى الرئيسي */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b bg-white">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {sections.find(s => s.id === activeSection)?.icon} {sections.find(s => s.id === activeSection)?.name}
            </h2>
            <div className="flex items-center space-x-2">
              <div className="text-xs text-gray-500">
                آخر تحديث: {new Date().toLocaleTimeString('ar-DZ')}
              </div>
              <button
                onClick={() => setIsMinimized(true)}
                className="text-gray-400 hover:text-gray-600 px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default FacebookTrackingDashboard; 