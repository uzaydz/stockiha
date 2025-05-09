-- Create performance_metrics table for storing page load metrics
CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_url TEXT NOT NULL,
  load_time NUMERIC NOT NULL,
  ttfb NUMERIC,
  fcp NUMERIC,
  lcp NUMERIC,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  subdomain TEXT,
  user_agent TEXT,
  device_type TEXT,
  connection_type TEXT,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS performance_metrics_organization_id_idx ON public.performance_metrics(organization_id);
CREATE INDEX IF NOT EXISTS performance_metrics_subdomain_idx ON public.performance_metrics(subdomain);
CREATE INDEX IF NOT EXISTS performance_metrics_created_at_idx ON public.performance_metrics(created_at);

-- Create component_render_metrics table for component-level metrics
CREATE TABLE IF NOT EXISTS public.component_render_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_name TEXT NOT NULL,
  render_time NUMERIC NOT NULL,
  page_url TEXT NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS component_render_metrics_component_name_idx ON public.component_render_metrics(component_name);
CREATE INDEX IF NOT EXISTS component_render_metrics_organization_id_idx ON public.component_render_metrics(organization_id);

-- Add RLS policies to protect access to metrics data

-- For performance_metrics table
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

-- Super admins can see all metrics
CREATE POLICY "Super admins can see all performance metrics" 
  ON public.performance_metrics 
  FOR SELECT 
  USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE is_super_admin = true
    )
  );

-- Organization admins can only see their org's metrics
CREATE POLICY "Organization admins can see their org's performance metrics" 
  ON public.performance_metrics 
  FOR SELECT 
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.organization_users 
      WHERE organization_id = performance_metrics.organization_id 
        AND (is_admin = true OR is_owner = true)
    )
  );

-- For component_render_metrics table
ALTER TABLE public.component_render_metrics ENABLE ROW LEVEL SECURITY;

-- Super admins can see all component metrics
CREATE POLICY "Super admins can see all component metrics" 
  ON public.component_render_metrics 
  FOR SELECT 
  USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE is_super_admin = true
    )
  );

-- Organization admins can only see their org's component metrics
CREATE POLICY "Organization admins can see their org's component metrics" 
  ON public.component_render_metrics 
  FOR SELECT 
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.organization_users 
      WHERE organization_id = component_render_metrics.organization_id 
        AND (is_admin = true OR is_owner = true)
    )
  );

-- Allow anonymous inserts to both tables for public tracking
-- This is necessary for store pages that are public
CREATE POLICY "Allow anonymous inserts to performance metrics" 
  ON public.performance_metrics 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow anonymous inserts to component metrics" 
  ON public.component_render_metrics 
  FOR INSERT 
  WITH CHECK (true);

-- Function to clean up old metrics data (older than 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_metrics()
RETURNS void AS $$
BEGIN
  -- Delete performance metrics older than 30 days
  DELETE FROM public.performance_metrics 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Delete component render metrics older than 30 days
  DELETE FROM public.component_render_metrics 
  WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a comment for the function
COMMENT ON FUNCTION public.cleanup_old_metrics IS 'Removes performance metrics older than 30 days to prevent database bloat';

-- Grant execution permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.cleanup_old_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_metrics TO service_role; 