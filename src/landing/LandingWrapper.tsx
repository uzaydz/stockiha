/**
 * 🎯 Landing Page Wrapper - بدون Desktop Titlebar
 * Wrapper خفيف ومعزول لصفحة الهبوط
 */

import React, { useEffect } from 'react';
import './landing.css';

interface LandingWrapperProps {
  children: React.ReactNode;
}

export const LandingWrapper: React.FC<LandingWrapperProps> = ({ children }) => {
  useEffect(() => {
    // Set dark theme for landing page
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');

    // Ensure body allows scrolling
    document.body.style.overflow = 'auto';
    document.body.style.height = 'auto';
    document.documentElement.style.overflow = 'auto';
    document.documentElement.style.height = 'auto';

    return () => {
      // Cleanup on unmount
      document.body.style.overflow = '';
      document.body.style.height = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
    };
  }, []);

  return (
    <div className="landing-page-wrapper">
      {children}
    </div>
  );
};

LandingWrapper.displayName = 'LandingWrapper';
