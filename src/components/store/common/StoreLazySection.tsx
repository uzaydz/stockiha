import React, { useEffect, useState, useRef } from 'react';
import { Suspense } from 'react';

interface StoreLazySectionProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
}

export const StoreLazySection = React.memo(({
  children,
  fallback = <div className="min-h-[200px] animate-pulse bg-gray-100 rounded-lg" />,
  threshold = 0.1,
  rootMargin = "100px"
}: StoreLazySectionProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return (
    <div ref={ref}>
      {isVisible ? (
        <div className="flex-1">
          <Suspense fallback={fallback}>
            {children}
          </Suspense>
        </div>
      ) : (
        fallback
      )}
    </div>
  );
});

StoreLazySection.displayName = 'StoreLazySection';
