import React, { useEffect, useState } from 'react';
import UnifiedLoader from './UnifiedLoader';

interface LoadingOrchestratorProps {
  isVisible: boolean;
  phase: 'system' | 'store' | 'content';
  storeName?: string;
  logoUrl?: string;
  primaryColor?: string;
  onComplete?: () => void;
}

const LoadingOrchestrator: React.FC<LoadingOrchestratorProps> = ({
  isVisible,
  phase,
  storeName = 'المتجر',
  logoUrl,
  primaryColor = '#fc5a3e',
  onComplete
}) => {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isVisible) return;

    let targetProgress = 0;
    let targetMessage = '';

    switch (phase) {
      case 'system':
        targetProgress = 25;
        targetMessage = 'جاري تحضير النظام...';
        break;
      case 'store':
        targetProgress = 60;
        targetMessage = `جاري تحميل ${storeName}...`;
        break;
      case 'content':
        targetProgress = 100;
        targetMessage = 'جاري تحضير المحتوى...';
        break;
    }

    // تحديث التقدم بشكل تدريجي
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const diff = targetProgress - prev;
        if (diff <= 1) {
          clearInterval(progressInterval);
          if (phase === 'content' && targetProgress === 100) {
            setTimeout(() => onComplete?.(), 500);
          }
          return targetProgress;
        }
        return prev + Math.ceil(diff / 10);
      });
    }, 100);

    setMessage(targetMessage);

    return () => clearInterval(progressInterval);
  }, [isVisible, phase, storeName, onComplete]);

  if (!isVisible) return null;

  return (
    <UnifiedLoader
      isVisible={true}
      progress={progress}
      message={message}
      type="full"
      storeName={storeName}
      logoUrl={logoUrl}
      primaryColor={primaryColor}
    />
  );
};

export default LoadingOrchestrator; 