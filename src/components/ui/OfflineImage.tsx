import React, { useEffect, useMemo, useState } from 'react';

interface OfflineImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
  src?: string;
  alt?: string;
  fallbackSrc?: string;
}

const OfflineImage: React.FC<OfflineImageProps> = ({ src, alt = '', fallbackSrc = './images/logo.webp', ...rest }) => {
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(src || fallbackSrc);

  const isOffline = useMemo(() => {
    try { return typeof navigator !== 'undefined' && navigator.onLine === false; } catch { return false; }
  }, []);

  useEffect(() => {
    if (!src) {
      setCurrentSrc(fallbackSrc);
      return;
    }
    if (isOffline && /^https?:\/\//i.test(src)) {
      setCurrentSrc(fallbackSrc);
      return;
    }
    setCurrentSrc(src);
  }, [src, fallbackSrc, isOffline]);

  return (
    <img
      src={currentSrc}
      alt={alt}
      onError={() => {
        if (currentSrc !== fallbackSrc) setCurrentSrc(fallbackSrc);
      }}
      {...rest}
    />
  );
};

export default OfflineImage;
