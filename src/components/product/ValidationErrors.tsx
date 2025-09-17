import React from 'react';
import { motion } from 'framer-motion';

interface ValidationErrorsProps {
  errors: { [key: string]: string };
  className?: string;
}

const errorVariants = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
};

export const ValidationErrors: React.FC<ValidationErrorsProps> = ({
  errors,
  className
}) => {
  const errorEntries = Object.entries(errors).filter(([_, message]) => message);

  if (errorEntries.length === 0) return null;

  return (
    <div className={className}>
      {errorEntries.map(([key, message]) => (
        <motion.div
          key={key}
          initial={errorVariants.initial}
          animate={errorVariants.animate}
          exit={errorVariants.exit}
          className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm font-medium"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{message}</span>
        </motion.div>
      ))}
    </div>
  );
};
