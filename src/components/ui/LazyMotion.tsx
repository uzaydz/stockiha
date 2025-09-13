import React, { useState, useEffect, forwardRef } from 'react';

interface LazyMotionProps {
  children: React.ReactNode;
  initial?: any;
  animate?: any;
  exit?: any;
  transition?: any;
  variants?: any;
  whileHover?: any;
  whileTap?: any;
  whileInView?: any;
  layout?: boolean;
  layoutId?: string;
  className?: string;
  style?: React.CSSProperties;
  [key: string]: any;
}

/**
 * Lazy-loaded motion component that dynamically imports framer-motion
 * This reduces initial bundle size by loading animations only when needed
 */
export const LazyMotion = forwardRef<HTMLDivElement, LazyMotionProps>(({
  children,
  initial,
  animate,
  exit,
  transition,
  variants,
  whileHover,
  whileTap,
  whileInView,
  layout,
  layoutId,
  className = "",
  style,
  ...props
}, ref) => {
  const [MotionComponent, setMotionComponent] = useState<React.ComponentType<any> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Dynamic import of framer-motion
    import('framer-motion')
      .then((module) => {
        setMotionComponent(() => module.motion.div);
        setIsLoading(false);
      })
      .catch((error) => {
        console.warn('Failed to load framer-motion:', error);
        setIsLoading(false);
      });
  }, []);

  // Show loading state (static div)
  if (isLoading || !MotionComponent) {
    return (
      <div
        ref={ref}
        className={className}
        style={style}
        {...props}
      >
        {children}
      </div>
    );
  }

  // Render with motion when loaded
  return (
    <MotionComponent
      ref={ref}
      initial={initial}
      animate={animate}
      exit={exit}
      transition={transition}
      variants={variants}
      whileHover={whileHover}
      whileTap={whileTap}
      whileInView={whileInView}
      layout={layout}
      layoutId={layoutId}
      className={className}
      style={style}
      {...props}
    >
      {children}
    </MotionComponent>
  );
});

LazyMotion.displayName = 'LazyMotion';

/**
 * Lazy AnimatePresence component
 */
export const LazyAnimatePresence: React.FC<{
  children: React.ReactNode;
  mode?: "wait" | "sync" | "popLayout";
  initial?: boolean;
  onExitComplete?: () => void;
}> = ({ children, ...props }) => {
  const [AnimatePresence, setAnimatePresence] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    import('framer-motion')
      .then((module) => {
        setAnimatePresence(() => module.AnimatePresence);
      })
      .catch((error) => {
        console.warn('Failed to load AnimatePresence:', error);
      });
  }, []);

  if (!AnimatePresence) {
    return <>{children}</>;
  }

  return <AnimatePresence {...props}>{children}</AnimatePresence>;
};

export default LazyMotion;

// Re-export motion for compatibility
const LazyMotionWrapper = React.lazy(async () => {
  const framerMotion = await import('framer-motion');
  return { default: framerMotion.motion };
});

// For hooks, we'll use a simpler approach - just re-export them directly
// This will cause them to be loaded when first used
export const useScroll = (() => {
  const [hook, setHook] = React.useState<any>(null);

  React.useEffect(() => {
    import('framer-motion').then((fm) => {
      setHook(() => fm.useScroll);
    });
  }, []);

  return hook;
})();

export const useTransform = (() => {
  const [hook, setHook] = React.useState<any>(null);

  React.useEffect(() => {
    import('framer-motion').then((fm) => {
      setHook(() => fm.useTransform);
    });
  }, []);

  return hook;
})();

export const useInView = (() => {
  const [hook, setHook] = React.useState<any>(null);

  React.useEffect(() => {
    import('framer-motion').then((fm) => {
      setHook(() => fm.useInView);
    });
  }, []);

  return hook;
})();

export { LazyMotionWrapper as motion, LazyAnimatePresence as AnimatePresence };
