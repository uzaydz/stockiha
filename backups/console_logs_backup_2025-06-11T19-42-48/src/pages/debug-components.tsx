import React, { useState } from 'react';
import { debugStoreComponentsCreation, cleanupTestComponents } from '@/lib/debug-store-components';
import { monitorStoreComponents, fixMissingComponents } from '@/lib/store-components-monitor';

const DebugComponentsPage = () => {
  const [organizationId, setOrganizationId] = useState('b099d410-0994-453d-bd7d-88c3c46a3f2f'); // ID للاختبار
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runDiagnostics = async () => {
    if (!organizationId.trim()) {
      alert('يرجى إدخال معرف المؤسسة');
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      console.log('🔍 بدء تشخيص شامل...');
      
      // 1. مراقبة الوضع الحالي
      console.log('📊 مراقبة الوضع الحالي...');
      const currentReport = await monitorStoreComponents(organizationId);
      
      // 2. تشخيص مفصل
      console.log('🧪 تشخيص مفصل...');
      const debugResults = await debugStoreComponentsCreation(organizationId);
      
      // 3. محاولة إصلاح المكونات المفقودة
      console.log('🔧 محاولة إصلاح المكونات المفقودة...');
      const fixResult = await fixMissingComponents(organizationId);
      
      // 4. مراقبة نهائية
      console.log('📋 مراقبة نهائية...');
      const finalReport = await monitorStoreComponents(organizationId);
      
      setResults({
        currentReport,
        debugResults,
        fixResult,
        finalReport
      });
      
    } catch (error) {
      console.error('خطأ في التشخيص:', error);
      alert('حدث خطأ أثناء التشخيص');
    } finally {
      setLoading(false);
    }
  };

  const cleanup = async () => {
    if (!organizationId.trim()) return;
    
    setLoading(true);
    try {
      await cleanupTestComponents(organizationId);
      alert('تم تنظيف المكونات التجريبية');
    } catch (error) {
      console.error('خطأ في التنظيف:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🔍 تشخيص مكونات المتجر</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              معرف المؤسسة:
            </label>
            <input
              type="text"
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="أدخل معرف المؤسسة"
            />
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={runDiagnostics}
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'جاري التشخيص...' : '🔍 بدء التشخيص الشامل'}
            </button>
            
            <button
              onClick={cleanup}
              disabled={loading}
              className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 disabled:opacity-50"
            >
              🧹 تنظيف المكونات التجريبية
            </button>
          </div>
        </div>
      </div>

      {results && (
        <div className="space-y-6">
          {/* التقرير الحالي */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">📊 الوضع الحالي</h3>
            <pre className="text-sm bg-white p-3 rounded border overflow-auto">
              {JSON.stringify(results.currentReport, null, 2)}
            </pre>
          </div>

          {/* نتائج التشخيص */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">🧪 نتائج التشخيص المفصل</h3>
            <pre className="text-sm bg-white p-3 rounded border overflow-auto">
              {JSON.stringify(results.debugResults, null, 2)}
            </pre>
          </div>

          {/* نتيجة الإصلاح */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">🔧 نتيجة الإصلاح</h3>
            <p className={`text-lg font-medium ${results.fixResult ? 'text-green-600' : 'text-red-600'}`}>
              {results.fixResult ? '✅ تم الإصلاح بنجاح' : '❌ فشل في الإصلاح'}
            </p>
          </div>

          {/* التقرير النهائي */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">📋 التقرير النهائي</h3>
            <pre className="text-sm bg-white p-3 rounded border overflow-auto">
              {JSON.stringify(results.finalReport, null, 2)}
            </pre>
          </div>
        </div>
      )}

      <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
        <h4 className="font-semibold text-yellow-800 mb-2">💡 تعليمات:</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• تأكد من فتح Console (F12) لرؤية السجلات المفصلة</li>
          <li>• معرف المؤسسة الافتراضي هو للحساب التجريبي x558822@gmail.com</li>
          <li>• التشخيص سيختبر إنشاء المكونات واحد تلو الآخر</li>
          <li>• استخدم "تنظيف المكونات التجريبية" لحذف أي مكونات اختبار</li>
        </ul>
      </div>
    </div>
  );
};

export default DebugComponentsPage; 