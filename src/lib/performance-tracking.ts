/**
 * نظام تتبع أداء صفحات المتجر
 * يجمع بيانات حول وقت التحميل وتفاعل المستخدم مع المكونات المختلفة
 */

import { supabase } from '@/lib/supabase-client';

interface PerformanceMetric {
  page_url: string;
  load_time: number;
  component_render_time?: number;
  ttfb?: number; // Time to First Byte
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  organization_id?: string;
  subdomain?: string;
  user_agent?: string;
  device_type?: string;
  connection_type?: string;
  session_id?: string;
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
    
    // Prepare metrics object
    const metrics: PerformanceMetric = {
      page_url: url,
      load_time: loadTime,
      ttfb,
      organization_id: organizationId,
      subdomain,
      user_agent: userAgent,
      device_type: deviceType,
      connection_type: connectionType,
      session_id: sessionId
    };
    
    // Track first contentful paint if available
    const paintMetrics = performance.getEntriesByType('paint');
    const fcpMetric = paintMetrics.find(entry => entry.name === 'first-contentful-paint');
    if (fcpMetric) {
      metrics.fcp = fcpMetric.startTime;
    }
    
    // Store metrics in the database
    await supabase.from('performance_metrics').insert(metrics);
    
    console.log('Performance metrics tracked:', metrics);
  } catch (error) {
    console.error('Error tracking performance metrics:', error);
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
    console.error(`Error tracking render time for ${componentName}:`, error);
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