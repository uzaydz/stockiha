import React from 'react';

interface UseSmartAnimationReturn {
  shouldAnimate: boolean;
  animationConfig: {
    duration: number;
    ease: string;
    reducedMotion: boolean;
  };
}

export const useSmartAnimation = (): UseSmartAnimationReturn => {
  const [shouldAnimate, setShouldAnimate] = React.useState(true);
  const [animationConfig, setAnimationConfig] = React.useState({
    duration: 0.4,
    ease: "easeOut",
    reducedMotion: false
  });

  React.useEffect(() => {
    // التحقق من تفضيل المستخدم لتقليل الحركة
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // التحقق من نوع الجهاز (low-end device detection)
    const hardwareConcurrency = navigator.hardwareConcurrency || 2;
    const deviceMemory = (navigator as any).deviceMemory || 4;
    const connection = (navigator as any).connection;
    const isSlowConnection = connection &&
      (connection.effectiveType === 'slow-2g' ||
       connection.effectiveType === '2g' ||
       connection.saveData === true);

    const isLowEndDevice = hardwareConcurrency <= 2 || deviceMemory <= 2 || isSlowConnection;
    const reducedMotion = prefersReducedMotion || isLowEndDevice;

    setShouldAnimate(!reducedMotion);
    setAnimationConfig({
      duration: reducedMotion ? 0 : 0.4,
      ease: "easeOut",
      reducedMotion
    });
  }, []);

  return {
    shouldAnimate,
    animationConfig
  };
};
