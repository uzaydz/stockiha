import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, Grid3X3, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnhancedLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'apps' | 'minimal';
  text?: string;
  subText?: string;
  className?: string;
}

const EnhancedLoader: React.FC<EnhancedLoaderProps> = ({
  size = 'md',
  variant = 'default',
  text,
  subText,
  className
}) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  const containerSizes = {
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4',
    xl: 'gap-6'
  };

  // Variants
  const renderDefault = () => (
    <div className="relative">
      <Loader2 className={cn(sizeClasses[size], "animate-spin text-primary")} />
      <div className={cn(
        "absolute inset-0 rounded-full border-2 border-primary/20 animate-pulse",
        sizeClasses[size]
      )} />
    </div>
  );

  const renderApps = () => (
    <div className="relative">
      <motion.div
        className="relative"
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <Grid3X3 className={cn(sizeClasses[size], "text-primary")} />
      </motion.div>
      
      <motion.div
        className="absolute -top-1 -right-1"
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.5, 1, 0.5]
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <Sparkles className="h-4 w-4 text-primary/60" />
      </motion.div>
      
      {/* Orbiting dots */}
      <div className="absolute inset-0 flex items-center justify-center">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-primary/40 rounded-full"
            animate={{
              rotate: 360,
              x: [0, 20, 0, -20, 0],
              y: [0, -20, 0, 20, 0]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.5,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    </div>
  );

  const renderMinimal = () => (
    <motion.div
      className={cn(sizeClasses[size], "border-2 border-primary/20 border-t-primary rounded-full")}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    />
  );

  const renderLoader = () => {
    switch (variant) {
      case 'apps':
        return renderApps();
      case 'minimal':
        return renderMinimal();
      default:
        return renderDefault();
    }
  };

  return (
    <motion.div
      className={cn(
        "flex flex-col items-center justify-center",
        containerSizes[size],
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {renderLoader()}
      
      {text && (
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <p className={cn(
            "font-medium text-foreground",
            textSizes[size]
          )}>
            {text}
          </p>
          
          {subText && (
            <motion.p
              className="text-sm text-muted-foreground mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              {subText}
            </motion.p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default EnhancedLoader;
