import React, { useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';

interface LazySectionProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    height?: string | number;
    className?: string;
    threshold?: number;
    rootMargin?: string;
}

/**
 * LazySection: High-performance wrapper that only renders (and thus fetches) 
 * its children when they approach the viewport.
 * 
 * This significantly reduces initial bundle size and main thread blocking time.
 */
export const LazySection: React.FC<LazySectionProps> = ({
    children,
    fallback,
    height = 'min-h-[500px]', // scalable default
    className = "",
    rootMargin = "400px 0px" // Load 400px before scrolling into view to avoid layout jumps
}) => {
    const [hasLoaded, setHasLoaded] = useState(false);
    const { ref, inView } = useInView({
        triggerOnce: true,
        rootMargin,
    });

    useEffect(() => {
        if (inView) {
            setHasLoaded(true);
        }
    }, [inView]);

    // We keep the component mounted once loaded
    const shouldRender = hasLoaded || inView;

    return (
        <div
            ref={ref}
            className={`w-full ${className}`}
            // If not loaded, apply minimum height to prevent layout thrashing
            style={!shouldRender && typeof height === 'number' ? { minHeight: height } : undefined}
        >
            {shouldRender ? (
                <React.Suspense fallback={fallback || <DefaultLoader />}>
                    {children}
                </React.Suspense>
            ) : (
                // Placeholder
                <div className={`${typeof height === 'string' ? height : ''} w-full`} />
            )}
        </div>
    );
};

const DefaultLoader = () => (
    <div className="py-24 flex justify-center items-center bg-transparent">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
    </div>
);
