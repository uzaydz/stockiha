import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ShoppingBag, Sparkles, Star } from 'lucide-react';

interface UnifiedLoaderProps {
  isVisible: boolean;
  progress?: number;
  message?: string;
  type?: 'full' | 'inline' | 'minimal';
  storeName?: string;
  logoUrl?: string;
  primaryColor?: string;
}

const UnifiedLoader: React.FC<UnifiedLoaderProps> = ({
  isVisible,
  progress = 0,
  message = 'جاري تحميل المتجر...',
  type = 'full',
  storeName = 'متجر بازار',
  logoUrl,
  primaryColor = '#fc5a3e'
}) => {
  // تحديد الرسالة بناءً على التقدم
  const getProgressMessage = (progress: number) => {
    if (progress < 25) return 'جاري تحضير المتجر...';
    if (progress < 50) return 'جاري تحميل المنتجات...';
    if (progress < 75) return 'جاري تطبيق التصميم...';
    if (progress < 95) return 'اللمسات الأخيرة...';
    return 'تم تحميل المتجر بنجاح!';
  };

  const displayMessage = progress > 0 ? getProgressMessage(progress) : message;

  if (type === 'minimal') {
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center py-4"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="w-5 h-5" style={{ color: primaryColor }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  if (type === 'inline') {
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-center py-8 bg-background/50 backdrop-blur-sm rounded-lg border"
          >
            <div className="text-center">
              {/* شعار أو أيقونة المتجر */}
              <div className="mb-4 flex justify-center">
                {logoUrl ? (
                  <motion.div
                    animate={{ 
                      scale: [1, 1.05, 1],
                      rotate: [0, 2, -2, 0]
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="w-12 h-12 rounded-full overflow-hidden border-2 shadow-lg"
                    style={{ borderColor: primaryColor }}
                  >
                    <img 
                      src={logoUrl} 
                      alt={storeName}
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: 360
                    }}
                    transition={{ 
                      scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                      rotate: { duration: 3, repeat: Infinity, ease: "linear" }
                    }}
                    className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                    style={{ backgroundColor: `${primaryColor}20`, border: `2px solid ${primaryColor}` }}
                  >
                    <ShoppingBag className="w-6 h-6" style={{ color: primaryColor }} />
                  </motion.div>
                )}
              </div>

              <motion.h3
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-lg font-semibold mb-2"
                style={{ color: primaryColor }}
              >
                {storeName}
              </motion.h3>

              <p className="text-sm text-muted-foreground mb-3">{displayMessage}</p>
              
              {progress > 0 && (
                <div className="w-48 mx-auto">
                  <div className="bg-muted rounded-full h-2 mb-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="h-2 rounded-full relative"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <motion.div
                        animate={{ x: [-20, 100] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-0 left-0 h-full w-6 bg-white/30 rounded-full"
                      />
                    </motion.div>
                  </div>
                  <p className="text-xs text-muted-foreground">{progress}%</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Full screen loader - التصميم المثالي
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}10, ${primaryColor}05, transparent)`
          }}
        >
          {/* خلفية متحركة */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              animate={{
                background: [
                  `radial-gradient(circle at 20% 80%, ${primaryColor}15 0%, transparent 50%)`,
                  `radial-gradient(circle at 80% 20%, ${primaryColor}15 0%, transparent 50%)`,
                  `radial-gradient(circle at 40% 40%, ${primaryColor}15 0%, transparent 50%)`
                ]
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0"
            />
            
            {/* نجوم متحركة */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  opacity: 0,
                  x: Math.random() * window.innerWidth,
                  y: Math.random() * window.innerHeight
                }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0],
                  rotate: [0, 180, 360]
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2
                }}
                className="absolute"
              >
                <Sparkles className="w-4 h-4" style={{ color: primaryColor }} />
              </motion.div>
            ))}
          </div>

          {/* المحتوى الرئيسي */}
          <div className="relative z-10 text-center bg-background/80 backdrop-blur-md rounded-3xl p-12 shadow-2xl border border-white/20 max-w-md mx-4">
            {/* شعار المتجر */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                type: "spring", 
                stiffness: 200, 
                damping: 15,
                delay: 0.2 
              }}
              className="mb-6 flex justify-center"
            >
              {logoUrl ? (
                <div className="relative">
                  <motion.div
                    animate={{ 
                      rotate: [0, 5, -5, 0],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{ 
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="w-20 h-20 rounded-2xl overflow-hidden shadow-2xl border-4"
                    style={{ borderColor: primaryColor }}
                  >
                    <img 
                      src={logoUrl} 
                      alt={storeName}
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                  
                  {/* حلقة متوهجة حول الشعار */}
                  <motion.div
                    animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                    transition={{ 
                      rotate: { duration: 8, repeat: Infinity, ease: "linear" },
                      scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                    }}
                    className="absolute -inset-2 rounded-2xl border-2 border-dashed opacity-50"
                    style={{ borderColor: primaryColor }}
                  />
                </div>
              ) : (
                <div className="relative">
                  <motion.div
                    animate={{ 
                      rotate: [0, 360],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      rotate: { duration: 4, repeat: Infinity, ease: "linear" },
                      scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                    }}
                    className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl border-4"
                    style={{ 
                      backgroundColor: `${primaryColor}20`,
                      borderColor: primaryColor
                    }}
                  >
                    <ShoppingBag className="w-10 h-10" style={{ color: primaryColor }} />
                  </motion.div>
                  
                  {/* نجوم حول الأيقونة */}
                  {[...Array(4)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        rotate: 360,
                        scale: [0, 1, 0]
                      }}
                      transition={{
                        rotate: { duration: 3, repeat: Infinity, ease: "linear" },
                        scale: { duration: 2, repeat: Infinity, delay: i * 0.5 }
                      }}
                      className="absolute"
                      style={{
                        top: i % 2 === 0 ? '-8px' : 'auto',
                        bottom: i % 2 === 1 ? '-8px' : 'auto',
                        left: i < 2 ? '-8px' : 'auto',
                        right: i >= 2 ? '-8px' : 'auto'
                      }}
                    >
                      <Star className="w-4 h-4" style={{ color: primaryColor }} />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* اسم المتجر */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-3xl font-bold mb-2 bg-gradient-to-r bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}80)`
              }}
            >
              {storeName}
            </motion.h1>

            {/* رسالة التحميل */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-muted-foreground mb-6 text-lg"
            >
              {displayMessage}
            </motion.p>

            {/* شريط التقدم المحسن */}
            {progress > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 }}
                className="w-full max-w-xs mx-auto mb-6"
              >
                <div className="bg-muted rounded-full h-3 mb-3 overflow-hidden shadow-inner">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-3 rounded-full relative shadow-lg"
                    style={{
                      background: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}cc, ${primaryColor})`
                    }}
                  >
                    {/* تأثير اللمعان */}
                    <motion.div
                      animate={{ x: [-30, 300] }}
                      transition={{ 
                        duration: 2, 
                        repeat: Infinity, 
                        ease: "easeInOut",
                        repeatDelay: 1
                      }}
                      className="absolute top-0 left-0 h-full w-8 bg-white/40 rounded-full blur-sm"
                    />
                  </motion.div>
                </div>
                
                <div className="flex justify-between items-center">
                  <motion.span
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-sm font-semibold"
                    style={{ color: primaryColor }}
                  >
                    {progress}%
                  </motion.span>
                  <span className="text-xs text-muted-foreground">
                    {progress === 100 ? 'مكتمل!' : 'جاري التحميل...'}
                  </span>
                </div>
              </motion.div>
            )}

            {/* نقاط التحميل المتحركة */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="flex justify-center space-x-2"
            >
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.3, 1, 0.3],
                    y: [0, -10, 0]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeInOut"
                  }}
                  className="w-3 h-3 rounded-full shadow-lg"
                  style={{ backgroundColor: primaryColor }}
                />
              ))}
            </motion.div>

            {/* رسالة تشجيعية */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ 
                duration: 3, 
                repeat: Infinity, 
                delay: 2,
                ease: "easeInOut"
              }}
              className="text-xs text-muted-foreground mt-4 font-medium"
            >
              {progress < 50 ? 'نحضر لك تجربة تسوق مميزة...' : 
               progress < 90 ? 'تجربة رائعة في انتظارك...' : 
               'تم تحضير كل شيء بعناية!'}
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default React.memo(UnifiedLoader);
