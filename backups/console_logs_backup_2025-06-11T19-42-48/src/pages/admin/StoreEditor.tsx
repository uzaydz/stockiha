import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, Save, Settings, ArrowLeft, Monitor, Tablet, Smartphone, RefreshCw } from 'lucide-react';
import { useTenant } from '@/context/TenantContext';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import Layout from '@/components/Layout';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// المحرر المحسن الجديد
import { ImprovedStoreEditor } from '@/components/store-editor/improved';
import StoreSettings from '@/components/settings/StoreSettings';

interface StoreEditorProps {
  className?: string;
}

const StoreEditor: React.FC<StoreEditorProps> = ({ className }) => {
  const { currentOrganization, isOrgAdmin } = useTenant();
  const { toast } = useToast();
  
  // المحرر المحسن هو الوحيد المتاح الآن

  // عرض شاشة التحميل
  if (!currentOrganization) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4"
          >
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <h3 className="text-lg font-semibold">جاري تحميل محرر المتجر...</h3>
            <p className="text-muted-foreground">يرجى الانتظار لحظات</p>
          </motion.div>
        </div>
      </Layout>
    );
  }

  // المحرر المحسن هو الافتراضي والوحيد
    return (
      <div className={cn("h-screen overflow-hidden bg-background", className)}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="h-full"
        >
        {/* شريط العلوي */}
          <div className="bg-background border-b px-6 py-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-bold">🏪</span>
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-foreground">
                  محرر المتجر
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {currentOrganization?.name || 'متجرك'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                  محفوظ تلقائياً
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/store/${currentOrganization?.id}`, '_blank')}
                className="gap-2"
              >
                <Eye className="w-4 h-4" />
                عرض المتجر
              </Button>
              
              <StoreSettings />
            </div>
          </div>

          {/* المحرر المحسن */}
          <div className="h-[calc(100vh-64px)]">
            <ImprovedStoreEditor
              organizationId={currentOrganization?.id || ''}
            />
          </div>
        </motion.div>
      </div>
  );
};

export default StoreEditor;