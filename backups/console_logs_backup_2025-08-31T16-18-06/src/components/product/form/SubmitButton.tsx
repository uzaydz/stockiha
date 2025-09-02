import React, { memo } from 'react';
import { motion } from 'framer-motion';

interface SubmitButtonProps {
  disabled?: boolean;
  loading?: boolean;
  buttonText: string;
  t: (key: string) => string;
}

const SubmitButton = memo<SubmitButtonProps>(({ disabled, loading, buttonText, t }) => (
  <div className="mt-8 pt-6 border-t border-border/50">
    <motion.button
      type="submit"
      disabled={disabled}
      className="premium-submit-button"
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {loading ? (
        <>
          <div className="loading-spinner"></div>
          <span className="font-bold">{buttonText}</span>
        </>
      ) : (
        <>
          <span className="font-bold">{t('form.submit')}</span>
          <svg 
            className="submit-icon" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2.5} 
              d="M13 7l5 5m0 0l-5 5m5-5H6" 
            />
          </svg>
        </>
      )}
    </motion.button>
  </div>
));

SubmitButton.displayName = 'SubmitButton';

export default SubmitButton;
