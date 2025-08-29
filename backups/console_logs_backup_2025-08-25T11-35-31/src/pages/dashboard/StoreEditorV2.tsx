import React from 'react';
import { useTenant } from '@/context/TenantContext';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import StoreEditorV2 from '@/components/store-editor-v2';

const StoreEditorV2Page: React.FC = () => {
  const { currentOrganization } = useTenant();

  // عرض شاشة التحميل
  if (!currentOrganization) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/30">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4"
        >
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto" />
            <div className="absolute inset-0 h-12 w-12 border-4 border-indigo-200 dark:border-indigo-800 rounded-full mx-auto"></div>
          </div>
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">
            جاري تحميل محرر المتجر V2...
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            يرجى الانتظار لحظات
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <StoreEditorV2 
      organizationId={currentOrganization.id} 
      className="h-screen"
    />
  );
};

export default StoreEditorV2Page;
