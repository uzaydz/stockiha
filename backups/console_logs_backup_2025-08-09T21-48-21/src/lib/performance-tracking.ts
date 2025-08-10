/**
 * نظام تتبع أداء صفحات المتجر
 * يجمع بيانات حول وقت التحميل وتفاعل المستخدم مع المكونات المختلفة
 */

import { supabase } from '@/lib/supabase-client';

// ملاحظة: جدول performance_metrics الحالي في Supabase يستخدم مخطط name/value/metadata
// لذلك سنقوم بمواءمة الحمولة مع هذا المخطط لتجنب 400 Bad Request
interface InsertablePerformanceMetric {
  name: string;
  value: number;
  organization_id?: string;
  user_id?: string | null;
  metadata?: Record<string, any>;
}

/**
 * Track page load metrics
 * @param url The URL of the page being tracked
 * @param organizationId Optional organization ID for the store
 * @param subdomain Optional subdomain of the store
 */
export const trackPageLoad = async (url: string, organizationId?: string, subdomain?: string): Promise<void> => {
  try {
    if (!url) return;
    
    // Get performance metrics from browser API if available
    const navigation = performance?.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (!navigation) return;
    
    // Calculate basic metrics
    const loadTime = navigation.loadEventEnd - navigation.startTime;
    const ttfb = navigation.responseStart - navigation.requestStart;
    
    // Get connection information if available
    const connection = (navigator as any).connection;
    const connectionType = connection ? connection.effectiveType : undefined;
    
    // Detect device type
    const userAgent = navigator.userAgent;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
    const deviceType = isMobile ? 'mobile' : 'desktop';
    
    // Create session ID if not exists
    const sessionId = localStorage.getItem('performance_session_id') || 
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('performance_session_id', sessionId);
    
    // بناء metadata موحّد
    const baseMetadata: Record<string, any> = {
      page_url: url,
      subdomain,
      user_agent: userAgent,
      device_type: deviceType,
      connection_type: connectionType,
      session_id: sessionId,
      timings: {
        ttfb
      }
    };
    
    // Track first contentful paint if available
    const paintMetrics = performance.getEntriesByType('paint');
    const fcpMetric = paintMetrics.find(entry => entry.name === 'first-contentful-paint');
    if (fcpMetric) {
      baseMetadata.timings.fcp = fcpMetric.startTime;
    }
    
    // إدراج سجلين: load_time و ttfb ضمن الاسم والقيمة وmetadata
    const rows: InsertablePerformanceMetric[] = [
      {
        name: 'page_load_time_ms',
        value: Math.max(0, Math.round(loadTime)),
        organization_id: organizationId,
        metadata: baseMetadata
      },
      {
        name: 'ttfb_ms',
        value: Math.max(0, Math.round(ttfb)),
        organization_id: organizationId,
        metadata: baseMetadata
      }
    ];

    await supabase.from('performance_metrics').insert(rows as any);

  } catch (error) {
    // Fail silently - don't affect user experience if tracking fails
  }
};

/**
 * Track component render time
 * @param componentName Name of the component being tracked
 * @param renderTime Time it took to render the component in milliseconds
 * @param url Current page URL
 * @param organizationId Optional organization ID
 */
export const trackComponentRender = async (
  componentName: string, 
  renderTime: number, 
  url: string,
  organizationId?: string
): Promise<void> => {
  try {
    if (!url || !componentName) return;
    
    // Add to the database
    await supabase.from('component_render_metrics').insert({
      component_name: componentName,
      render_time: renderTime,
      page_url: url,
      organization_id: organizationId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // Fail silently
  }
};

/**
 * Create a performance tracking hook for React components
 * @param componentName Name of the component to track
 * @returns Start and end tracking functions
 */
export const createComponentTracker = (componentName: string) => {
  let startTime: number | null = null;
  
  return {
    startTracking: () => {
      startTime = performance.now();
    },
    endTracking: (url: string, organizationId?: string) => {
      if (startTime === null) return;
      const renderTime = performance.now() - startTime;
      trackComponentRender(componentName, renderTime, url, organizationId);
      startTime = null;
    }
  };
};

const performanceTracking = {
  trackPageLoad,
  trackComponentRender,
  createComponentTracker
};

export default performanceTracking;
