import { useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { strategicPreloader } from '../utils/strategicPreloader';

interface RoutePreloaderOptions {
  enabled?: boolean;
  preloadOnHover?: boolean;
  preloadRelated?: boolean;
  hoverDelay?: number;
}

export const useRoutePreloader = (options: RoutePreloaderOptions = {}) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const {
    enabled = true,
    preloadOnHover = true,
    preloadRelated = true,
    hoverDelay = 150
  } = options;

  // Preload related routes when location changes
  useEffect(() => {
    if (!enabled || !preloadRelated) return;

    const currentRoute = location.pathname;
    strategicPreloader.preloadRelatedRoutes(currentRoute);
  }, [location.pathname, enabled, preloadRelated]);

  // Setup hover preloading for navigation links
  useEffect(() => {
    if (!enabled || !preloadOnHover) return;

    let hoverTimeout: NodeJS.Timeout;

    const handleLinkHover = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a[href]') as HTMLAnchorElement;
      
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }

      // Clear any existing timeout
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }

      // Preload after hover delay
      hoverTimeout = setTimeout(() => {
        strategicPreloader.preloadRouteOnDemand(href);
      }, hoverDelay);
    };

    const handleLinkLeave = () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
    };

    // Add event listeners
    document.addEventListener('mouseover', handleLinkHover, { passive: true });
    document.addEventListener('mouseleave', handleLinkLeave, { passive: true });

    return () => {
      document.removeEventListener('mouseover', handleLinkHover);
      document.removeEventListener('mouseleave', handleLinkLeave);
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
    };
  }, [enabled, preloadOnHover, hoverDelay]);

  // Manual preload function
  const preloadRoute = useCallback((route: string) => {
    if (!enabled) return Promise.resolve();
    return strategicPreloader.preloadRouteOnDemand(route);
  }, [enabled]);

  // Enhanced navigation with preloading
  const navigateWithPreload = useCallback((route: string, options?: { replace?: boolean }) => {
    // Preload the route first, then navigate
    strategicPreloader.preloadRouteOnDemand(route).finally(() => {
      navigate(route, options);
    });
  }, [navigate]);

  // Get preload statistics
  const getPreloadStats = useCallback(() => {
    return strategicPreloader.getPreloadStats();
  }, []);

  return {
    preloadRoute,
    navigateWithPreload,
    getPreloadStats,
    currentRoute: location.pathname
  };
};

// Hook for preloading specific component patterns
export const useComponentPreloader = () => {
  const preloadCharts = useCallback(async () => {
    const chartDeps = [
      () => import('@nivo/bar'),
      () => import('@nivo/line'),
      () => import('@nivo/pie'),
      () => import('recharts'),
      () => import('chart.js'),
      () => import('react-chartjs-2')
    ];

    return Promise.allSettled(
      chartDeps.map(dep => dep().catch(() => {}))
    );
  }, []);

  const preloadEditors = useCallback(async () => {
    const editorDeps = [
      () => import('@monaco-editor/react'),
      () => import('@tinymce/tinymce-react')
    ];

    return Promise.allSettled(
      editorDeps.map(dep => dep().catch(() => {}))
    );
  }, []);

  const preloadPDF = useCallback(async () => {
    const pdfDeps = [
      () => import('jspdf'),
      () => import('jspdf-autotable'),
      () => import('html2canvas')
    ];

    return Promise.allSettled(
      pdfDeps.map(dep => dep().catch(() => {}))
    );
  }, []);

  const preloadDragDrop = useCallback(async () => {
    const dndDeps = [
      () => import('@dnd-kit/core'),
      () => import('@dnd-kit/sortable'),
      () => import('@dnd-kit/utilities'),
      () => import('react-dnd'),
      () => import('react-dnd-html5-backend')
    ];

    return Promise.allSettled(
      dndDeps.map(dep => dep().catch(() => {}))
    );
  }, []);

  return {
    preloadCharts,
    preloadEditors,
    preloadPDF,
    preloadDragDrop
  };
};

// Hook for intersection-based preloading
export const useIntersectionPreloader = (routes: string[], options: IntersectionObserverInit = {}) => {
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const target = entry.target as HTMLElement;
          const route = target.dataset.preloadRoute;
          
          if (route) {
            strategicPreloader.preloadRouteOnDemand(route);
            observer.unobserve(target);
          }
        }
      });
    }, {
      rootMargin: '100px',
      threshold: 0.1,
      ...options
    });

    // Find elements with data-preload-route attribute
    const elementsToWatch = document.querySelectorAll('[data-preload-route]');
    elementsToWatch.forEach(el => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [routes]);
};

// Performance monitoring hook
export const usePreloadPerformance = () => {
  const getMetrics = useCallback(() => {
    const stats = strategicPreloader.getPreloadStats();
    
    return {
      ...stats,
      memoryUsage: 'performance' in window && 'memory' in (performance as any) 
        ? (performance as any).memory 
        : null,
      navigationTiming: performance.getEntriesByType('navigation')[0] || null
    };
  }, []);

  const logMetrics = useCallback(() => {
    const metrics = getMetrics();
    console.group('🚀 Preload Performance Metrics');
    
    
    
    if (metrics.memoryUsage) {
    }
    
    console.groupEnd();
  }, [getMetrics]);

  return {
    getMetrics,
    logMetrics
  };
};
