import React, { useEffect, useState } from 'react';

/**
 * DEPRECATED: This component's logic has been moved into AuthContext
 * for a more streamlined and reliable session handling process.
 * It now simply renders its children.
 */
interface CrossDomainSessionReceiverProps {
  onSessionReceived?: () => void;
  onSessionFailed?: () => void;
  children: React.ReactNode;
}

export const CrossDomainSessionReceiver: React.FC<CrossDomainSessionReceiverProps> = ({ children }) => {
  return <>{children}</>;
};

/**
 * Hook لاستخدام نظام نقل الجلسة
 */
export const useCrossDomainSession = () => {
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferStatus, setTransferStatus] = useState<'idle' | 'success' | 'failed'>('idle');

  const handleSessionTransfer = async (targetUrl: string) => {
    setIsTransferring(true);
    
    try {
      const { redirectWithSession } = await import('@/lib/cross-domain-auth');
      await redirectWithSession(targetUrl);
      setTransferStatus('success');
    } catch (error) {
      setTransferStatus('failed');
      setIsTransferring(false);
    }
  };

  return {
    isTransferring,
    transferStatus,
    transferSession: handleSessionTransfer
  };
};
