import React from 'react';

interface TextComponentPreviewProps {
  settings: {
    content?: string;
    textColor?: string;
    alignment?: string;
    padding?: string;
    [key: string]: any;
  };
}

/**
 * مكون معاينة للنص
 */
const TextComponentPreview: React.FC<TextComponentPreviewProps> = ({ settings }) => {
  const textStyle = {
    color: settings.textColor || '#333333',
    padding: settings.padding || '20px',
    textAlign: settings.alignment || 'right',
  } as React.CSSProperties;
  
  return (
    <section className="py-4">
      <div className="container mx-auto px-4">
        <div 
          className="prose prose-sm max-w-none mx-auto rtl"
          style={textStyle}
          dangerouslySetInnerHTML={{ __html: settings.content || '<p>أدخل المحتوى النصي هنا...</p>' }}
        />
      </div>
    </section>
  );
};

export default TextComponentPreview;
