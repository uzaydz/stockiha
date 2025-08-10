import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, ShoppingBag, Package, Truck } from 'lucide-react';

interface MaxLoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'dots' | 'pulse' | 'shopping' | 'delivery';
  message?: string;
  fullScreen?: boolean;
  overlay?: boolean;
  className?: string;
}

export const MaxLoadingSpinner: React.FC<MaxLoadingSpinnerProps> = ({
  size = 'md',
  variant = 'spinner',
  message,
  fullScreen = false,
  overlay = false,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const containerClasses = fullScreen
    ? 'fixed inset-0 flex items-center justify-center z-50'
    : 'flex items-center justify-center';

  const backgroundClasses = overlay
    ? 'bg-background/80 backdrop-blur-sm'
    : 'bg-transparent';

  const SpinnerComponent = () => {
    switch (variant) {
      case 'dots':
        return (
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className={`${sizeClasses[size]} bg-primary rounded-full`}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2
                }}
              />
            ))}
          </div>
        );

      case 'pulse':
        return (
          <motion.div
            className={`${sizeClasses[size]} bg-primary rounded-full`}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [1, 0.5, 1]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        );

      case 'shopping':
        return (
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <ShoppingBag className={`${sizeClasses[size]} text-primary`} />
            </motion.div>
            <motion.div
              className="absolute -top-1 -right-1 w-3 h-3 bg-secondary rounded-full"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{
                duration: 1,
                repeat: Infinity
              }}
            />
          </div>
        );

      case 'delivery':
        return (
          <div className="flex items-center space-x-2">
            <motion.div
              animate={{ x: [-10, 10, -10] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Truck className={`${sizeClasses[size]} text-primary`} />
            </motion.div>
            <div className="flex space-x-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1 h-1 bg-primary rounded-full"
                  animate={{
                    opacity: [0.3, 1, 0.3]
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.3
                  }}
                />
              ))}
            </div>
          </div>
        );

      default:
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className={`${sizeClasses[size]} text-primary`} />
          </motion.div>
        );
    }
  };

  return (
    <div className={`${containerClasses} ${backgroundClasses} ${className}`}>
      <div className="flex flex-col items-center space-y-4">
        <SpinnerComponent />
        {message && (
          <motion.p
            className="text-muted-foreground text-center max-w-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {message}
          </motion.p>
        )}
      </div>
    </div>
  );
};

// مكونات تحميل متخصصة
export const MaxPageLoader: React.FC<{ message?: string }> = ({ 
  message = "جاري تحميل الصفحة..." 
}) => (
  <MaxLoadingSpinner
    size="lg"
    variant="shopping"
    message={message}
    fullScreen
    overlay
  />
);

export const MaxProductLoader: React.FC<{ message?: string }> = ({ 
  message = "جاري تحميل المنتجات..." 
}) => (
  <MaxLoadingSpinner
    size="md"
    variant="dots"
    message={message}
    className="py-8"
  />
);

export const MaxOrderLoader: React.FC<{ message?: string }> = ({ 
  message = "جاري معالجة الطلب..." 
}) => (
  <MaxLoadingSpinner
    size="md"
    variant="delivery"
    message={message}
    className="py-8"
  />
);

export const MaxButtonLoader: React.FC<{ size?: 'sm' | 'md' }> = ({ 
  size = 'sm' 
}) => (
  <MaxLoadingSpinner
    size={size}
    variant="spinner"
    className="mx-2"
  />
);
