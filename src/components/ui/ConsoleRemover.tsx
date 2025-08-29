import { useEffect } from 'react';

// مكون لإزالة console.log في production
export const ConsoleRemover = () => {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      // إزالة جميع console methods في production
      const methods = ['log', 'debug', 'warn', 'info', 'error'] as const;

      methods.forEach(method => {
        console[method] = () => {};
      });

      // إزالة console.table أيضاً
      console.table = () => {};
      console.group = () => {};
      console.groupEnd = () => {};
      console.time = () => {};
      console.timeEnd = () => {};
    }
  }, []);

  return null;
};
