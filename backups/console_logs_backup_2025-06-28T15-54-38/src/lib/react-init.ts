import React from 'react';

/**
 * التأكد من تهيئة React بشكل صحيح
 */
export function initializeReact() {
  if (typeof window !== 'undefined') {
    // تعيين React في النطاق العالمي
    (window as any).React = React;
    
    // التأكد من وجود الخصائص الأساسية
    const _React = (window as any).React;
    
    if (_React) {
      // إصلاح Children
      if (!_React.Children) {
        _React.Children = {
          map: Array.prototype.map.bind([]),
          forEach: Array.prototype.forEach.bind([]),
          count: (children: any) => (children ? (Array.isArray(children) ? children.length : 1) : 0),
          only: (children: any) => {
            if (!React.isValidElement(children)) {
              throw new Error('React.Children.only expected to receive a single React element child.');
            }
            return children;
          },
          toArray: (children: any) => (Array.isArray(children) ? children : [children].filter(Boolean)),
        };
      }
      
      // إصلاح useLayoutEffect
      if (!_React.useLayoutEffect) {
        _React.useLayoutEffect = _React.useEffect;
      }
    }
  }
}
