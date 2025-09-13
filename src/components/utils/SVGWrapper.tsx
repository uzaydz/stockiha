import React from 'react';

/**
 * Wrapper للمكونات التي تحتوي على SVG لمنع Million.js من التدخل
 * يضمن عمل SVG elements بشكل صحيح مع Million.js
 */
interface SVGWrapperProps {
  children: React.ReactNode;
  className?: string;
}

const SVGWrapper: React.FC<SVGWrapperProps> = ({ children, className }) => {
  return (
    <div className={className} data-million-ignore="true">
      {children}
    </div>
  );
};

// منع Million.js من تحسين هذا المكون
SVGWrapper.displayName = 'SVGWrapper';

export default SVGWrapper;
