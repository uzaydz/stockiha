import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { DeviceType } from '../layouts/StoreEditorLayout';

interface StoreEditorCanvasProps {
  deviceType: DeviceType;
  isPreviewMode: boolean;
  children?: React.ReactNode;
}

const StoreEditorCanvas: React.FC<StoreEditorCanvasProps> = memo(({ 
  deviceType, 
  isPreviewMode, 
  children 
}) => {
  const canvasStyles = useMemo(() => {
    switch (deviceType) {
      case 'mobile':
        return {
          width: '375px',
          height: '812px',
          className: 'rounded-3xl shadow-xl border-8 border-gray-800 dark:border-gray-600',
          scale: 0.7
        };
      case 'tablet':
        return {
          width: '768px',
          height: '1024px',
          className: 'rounded-2xl shadow-xl border-4 border-gray-700 dark:border-gray-500',
          scale: 0.6
        };
      case 'desktop':
      default:
        return {
          width: '100%',
          height: '100%',
          className: 'rounded-lg shadow-lg border border-gray-200 dark:border-gray-700',
          scale: 1
        };
    }
  }, [deviceType]);

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-800 p-6 overflow-auto">
      {/* الشبكة الخلفية - محسنة للأداء */}
      {!isPreviewMode && (
        <div 
          className="absolute inset-0 opacity-30 dark:opacity-20 pointer-events-none"
          style={{
            backgroundImage: `
              radial-gradient(circle at 2px 2px, rgba(156, 163, 175, 0.3) 1px, transparent 0)
            `,
            backgroundSize: '32px 32px',
          }}
        />
      )}
      
      {/* حاوية الجهاز */}
      <div className="flex items-center justify-center h-full relative">
        <motion.div
          key={deviceType}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ 
            opacity: 1, 
            scale: canvasStyles.scale,
          }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 25,
            duration: 0.3
          }}
          className="relative bg-white dark:bg-gray-900"
          style={{
            width: canvasStyles.width,
            height: deviceType === 'desktop' ? 'calc(100vh - 180px)' : canvasStyles.height,
          }}
        >
          {/* إطار الجهاز */}
          <div className={cn(
            "w-full h-full overflow-auto relative",
            canvasStyles.className,
            !isPreviewMode && deviceType === 'desktop' && "ring-2 ring-indigo-200 dark:ring-indigo-800"
          )}>
            {/* شريط عنوان المتصفح للديسكتوب */}
            {deviceType === 'desktop' && !isPreviewMode && (
              <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                <div className="flex gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <div className="flex-1 bg-white dark:bg-gray-700 rounded-md px-4 py-2 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <div className="w-4 h-4 text-gray-400">🔒</div>
                  <span>https://متجرك.com</span>
                </div>
                <div className="text-gray-400">⋯</div>
              </div>
            )}
            
            {/* محتوى المتجر */}
            <div className="h-full relative overflow-auto bg-white dark:bg-gray-900">
              {children || (
                <div className="h-full flex items-center justify-center p-8">
                  <div className="text-center space-y-6 max-w-md">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 rounded-2xl flex items-center justify-center mx-auto shadow-lg"
                    >
                      <span className="text-4xl">🏪</span>
                    </motion.div>
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-3">
                        ابدأ في تصميم متجرك
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-6">
                        استخدم شريط الأدوات العلوي لإضافة وتخصيص عناصر متجرك الإلكتروني.
                        يمكنك البدء بالتصميم أو إضافة المكونات.
                      </p>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">🎨 التصميم</div>
                          <div className="text-gray-500 dark:text-gray-400">الألوان والخلفيات</div>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">🧩 المكونات</div>
                          <div className="text-gray-500 dark:text-gray-400">عناصر المتجر</div>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">📝 النصوص</div>
                          <div className="text-gray-500 dark:text-gray-400">الخطوط والتنسيق</div>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">🖼️ الوسائط</div>
                          <div className="text-gray-500 dark:text-gray-400">الصور والفيديو</div>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              )}
              
              {/* مؤشر الجهاز */}
              {!isPreviewMode && deviceType !== 'desktop' && (
                <div className="absolute top-4 right-4 bg-gray-800/80 dark:bg-gray-700/80 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  {deviceType === 'tablet' && '📱 تابلت - 768×1024'}
                  {deviceType === 'mobile' && '📱 جوال - 375×812'}
                </div>
              )}
            </div>
          </div>
          
          {/* تأثير الإضاءة للأجهزة المحمولة */}
          {deviceType !== 'desktop' && (
            <div 
              className="absolute inset-0 rounded-3xl opacity-10 dark:opacity-5 -z-10 blur-2xl"
              style={{
                background: `radial-gradient(ellipse at center, rgba(99, 102, 241, 0.4), transparent 70%)`
              }}
            />
          )}
        </motion.div>
        
        {/* معلومات إضافية للأجهزة */}
        {deviceType !== 'desktop' && !isPreviewMode && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 shadow-lg rounded-lg px-4 py-2 border border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-3">
              <span>المقياس: {Math.round(canvasStyles.scale * 100)}%</span>
              <span>•</span>
              <span>الدقة: {canvasStyles.width} × {canvasStyles.height}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

StoreEditorCanvas.displayName = 'StoreEditorCanvas';

export { StoreEditorCanvas };
