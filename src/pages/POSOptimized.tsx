// =================================================================
// 🚀 POS Optimized - نسخة محسنة من POS باستخدام النظام الموحد الجديد
// =================================================================

import React, { useEffect, useState } from 'react';
import { usePOSData, useAppData } from '@/context/UnifiedDataContext';
import { useIsDataRequired } from '@/hooks/useSmartDataLoading';
import { AlertCircle, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

// تحميل POSWrapper المحسن (يحتوي على POSDataProvider)
import POSWrapper from '../components/pos/POSWrapper';

const POSOptimized: React.FC = () => {
  // استخدام النظام الموحد الجديد
  const { posData, isLoading: isPOSLoading, error: posError, refresh: refreshPOS } = usePOSData();
  const { appData, isLoading: isAppLoading } = useAppData();
  const { isPOSDataRequired } = useIsDataRequired();

  // استخراج البيانات من النظام الموحد
  const products = posData?.products || [];
  const stats = posData?.stats;
  const settings = posData?.settings;
  const categories = posData?.categories || [];
  const subscriptionServices = posData?.subscription_services || [];
  
  const organization = appData?.organization;
  const user = appData?.user;

  // التحقق من حالة التحميل
  const isLoading = isPOSLoading || isAppLoading || !isPOSDataRequired;

  // عرض مؤشر تحميل محسن
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">تحميل نظام نقطة البيع</h3>
          <p className="text-gray-600 mb-4">جاري تحميل البيانات المحسنة...</p>
          
          {/* مؤشر تقدم بصري */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
          </div>
          
          <div className="mt-4 text-sm text-gray-500">
            <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>جاري التحميل...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // عرض رسالة خطأ محسنة
  if (posError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">خطأ في تحميل البيانات</h3>
          <p className="text-gray-600 mb-4">{posError}</p>
          
          <button
            onClick={refreshPOS}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            إعادة المحاولة
          </button>
          
          <div className="mt-4 text-sm text-gray-500">
            <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              <span>يمكنك المحاولة مرة أخرى</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // عرض معلومات النظام الجديد (في بيئة التطوير)
  if (import.meta.env.DEV) {
  }

  // عرض إحصائيات سريعة قبل POSWrapper
  return (
    <div className="pos-optimized-container">

      {/* POSWrapper الأصلي */}
      <POSWrapper />
    </div>
  );
};

export default POSOptimized;
