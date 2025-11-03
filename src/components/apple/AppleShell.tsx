import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import MacOSShell from './MacOSShell';
import IOSShell from './IOSShell';

interface AppleShellProps {
  children: React.ReactNode;
}

/**
 * AppleShell
 * Responsive shell that renders macOS-like UI on large screens and iOS-like UI on small screens.
 * It wraps the existing application content without changing routes/pages.
 */
const AppleShell: React.FC<AppleShellProps> = ({ children }) => {
  const isMobile = useMediaQuery('(max-width: 900px)');
  const location = useLocation();
  const [mobileHomeVisible, setMobileHomeVisible] = useState(true);

  // Mark shell as active to allow CSS overrides (e.g., hide legacy titlebar)
  useEffect(() => {
    document.body.classList.add('appleshell-active');
    return () => document.body.classList.remove('appleshell-active');
  }, []);

  // Keep home visibility under user control; no auto-hide on route change.

  const content = useMemo(() => children, [children]);

  if (isMobile) {
    return (
      <IOSShell
        homeVisible={mobileHomeVisible}
        onRequestOpenApp={() => setMobileHomeVisible(false)}
        onRequestShowHome={() => setMobileHomeVisible(true)}
      >
        {content}
      </IOSShell>
    );
  }

  return <MacOSShell>{content}</MacOSShell>;
};

export default AppleShell;
