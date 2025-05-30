import React from 'react';
import { Settings2, Info } from 'lucide-react';

export const PageHeader: React.FC = () => {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">إعدادات تقسيم الطلبيات</h1>
      </div>
      
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 sm:p-6 border-2 border-blue-200/50 dark:border-blue-800/30 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 rounded-lg shadow-inner">
            <Settings2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              حدد نوع الخطة المناسبة لمؤسستك لتوزيع الطلبات الخاصة على الموظفين بطريقة أوتوماتيكية. 
              يتم تطبيق هذه الإعدادات في صفحة الطلبيات.
            </p>
            
            <div className="mt-4 flex items-start sm:items-center gap-2 text-xs sm:text-sm text-blue-700 dark:text-blue-300 bg-blue-100/50 dark:bg-blue-900/20 p-3 rounded-lg">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5 sm:mt-0" />
              <span>لا يتم التوزيع اليدوي في هذه الصفحة، جميع التوزيعات تتم بشكل تلقائي حسب الخطة المختارة.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};