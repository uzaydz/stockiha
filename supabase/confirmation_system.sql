-- ============================================================
-- Stockiha Confirmation System Schema
-- Author: Codex (auto-generated)
-- Description:
--   Comprehensive schema for the order confirmation workforce
--   management module (agents, distribution, compensation,
--   analytics). Designed to be isolated from legacy call center
--   structures and integrated directly with the dashboard.
-- ============================================================

-- Ensure UUID helpers are available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Reusable updated_at trigger helper
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1) Core Agents Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.confirmation_agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'inactive', 'invited', 'archived')),
  access_scope JSONB NOT NULL DEFAULT '["orders_v2","blocked_customers","abandoned_orders"]'::jsonb,
  assignment_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  compensation_mode TEXT NOT NULL DEFAULT 'monthly' CHECK (compensation_mode IN ('monthly','per_order','hybrid')),
  compensation_settings JSONB NOT NULL DEFAULT '{"currency":"DZD","monthly_amount":0,"per_order_amount":0,"payment_cycle":"monthly"}'::jsonb,
  workload_settings JSONB NOT NULL DEFAULT '{"daily_target":30,"max_queue_size":50,"rotation_mode":"fair"}'::jsonb,
  default_queue JSONB NOT NULL DEFAULT '{"type":"priority","sequence":[]}'::jsonb,
  notification_settings JSONB NOT NULL DEFAULT '{"email":true,"sms":false,"in_app":true}'::jsonb,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  invitation_sent_at TIMESTAMPTZ,
  onboarding_completed_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.confirmation_agents IS 'Primary catalog of confirmation specialists with access, compensation, and assignment preferences.';
COMMENT ON COLUMN public.confirmation_agents.access_scope IS 'Pages and modules the agent can access (orders_v2, blocked_customers, abandoned_orders, analytics).';
COMMENT ON COLUMN public.confirmation_agents.assignment_preferences IS 'JSON structure describing product/category preferences, skill tags, regions, etc.';
COMMENT ON COLUMN public.confirmation_agents.compensation_settings IS 'Snapshot of the current compensation plan (amounts, cycle, bonuses).';
COMMENT ON COLUMN public.confirmation_agents.workload_settings IS 'Queue and target configuration used for distribution balancing.';

CREATE INDEX IF NOT EXISTS idx_confirmation_agents_org ON public.confirmation_agents (organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS uid_confirmation_agents_org_user ON public.confirmation_agents (organization_id, user_id) WHERE user_id IS NOT NULL;

CREATE TRIGGER set_timestamp_confirmation_agents
BEFORE UPDATE ON public.confirmation_agents
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

-- ============================================================
-- 2) Compensation Plans History
-- ============================================================

CREATE TABLE IF NOT EXISTS public.confirmation_agent_compensation_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.confirmation_agents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('monthly','per_order','hybrid')),
  currency TEXT NOT NULL DEFAULT 'DZD',
  monthly_amount NUMERIC(12,2),
  per_order_amount NUMERIC(12,2),
  bonus_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.confirmation_agent_compensation_plans IS 'Historical record of compensation plans assigned to confirmation agents.';

CREATE INDEX IF NOT EXISTS idx_compensation_plans_agent ON public.confirmation_agent_compensation_plans (agent_id);
CREATE INDEX IF NOT EXISTS idx_compensation_plans_org ON public.confirmation_agent_compensation_plans (organization_id, effective_from DESC);

CREATE TRIGGER set_timestamp_confirmation_comp_plans
BEFORE UPDATE ON public.confirmation_agent_compensation_plans
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

-- ============================================================
-- 3) Assignment Rules (Segmentation + Distribution)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.confirmation_assignment_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('product','category','fair_rotation','priority','region','custom')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  priority INT NOT NULL DEFAULT 1,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  fallback_rule_id UUID REFERENCES public.confirmation_assignment_rules(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.confirmation_assignment_rules IS 'Declarative distribution engine rules to map orders to confirmation agents.';

CREATE INDEX IF NOT EXISTS idx_assignment_rules_org ON public.confirmation_assignment_rules (organization_id, is_active, priority);

CREATE TRIGGER set_timestamp_confirmation_rules
BEFORE UPDATE ON public.confirmation_assignment_rules
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

-- ============================================================
-- 3.1) Organization Level Settings
-- ============================================================

CREATE TABLE IF NOT EXISTS public.confirmation_settings (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  auto_assignment_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  default_strategy TEXT NOT NULL DEFAULT 'fair_rotation',
  escalation_minutes INTEGER NOT NULL DEFAULT 45,
  queue_rebalancing_minutes INTEGER NOT NULL DEFAULT 15,
  auto_assignment_windows JSONB NOT NULL DEFAULT '{"weekdays":["sat","sun","mon","tue","wed"],"hours":{"start":"09:00","end":"19:00"}}'::jsonb,
  segmentation_defaults JSONB NOT NULL DEFAULT '{"product":["electronics"],"priority":["vip","normal"],"regions":[]}'::jsonb,
  compensation_defaults JSONB NOT NULL DEFAULT '{"mode":"monthly","monthly_amount":45000,"per_order_amount":200}'::jsonb,
  reminders_settings JSONB NOT NULL DEFAULT '{"pending_followups":true,"bonus_alerts":true,"queue_threshold":10}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.confirmation_settings IS 'Global configuration for the confirmation workforce (strategies, automation, defaults).';

CREATE TRIGGER set_timestamp_confirmation_settings
BEFORE UPDATE ON public.confirmation_settings
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

-- ============================================================
-- 4) Order Assignments Ledger
-- ============================================================

CREATE TABLE IF NOT EXISTS public.confirmation_order_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.online_orders(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.confirmation_agents(id) ON DELETE SET NULL,
  rule_id UUID REFERENCES public.confirmation_assignment_rules(id) ON DELETE SET NULL,
  assignment_strategy TEXT NOT NULL DEFAULT 'manual' CHECK (assignment_strategy IN ('manual','product_match','fair_rotation','priority','auto')),
  assignment_reason TEXT,
  queue_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  compensation_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','in_progress','confirmed','cancelled','reassigned','skipped')),
  confirmed_at TIMESTAMPTZ,
  confirmation_notes TEXT,
  reassigned_to UUID REFERENCES public.confirmation_agents(id) ON DELETE SET NULL,
  reassigned_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.confirmation_order_assignments IS 'Tracks every order assignment, the strategy used, and agent outcome.';

CREATE INDEX IF NOT EXISTS idx_confirmation_assignments_org_order ON public.confirmation_order_assignments (organization_id, order_id);
CREATE INDEX IF NOT EXISTS idx_confirmation_assignments_agent ON public.confirmation_order_assignments (agent_id, status);
CREATE INDEX IF NOT EXISTS idx_confirmation_assignments_status ON public.confirmation_order_assignments (status, created_at DESC);

CREATE TRIGGER set_timestamp_confirmation_assignments
BEFORE UPDATE ON public.confirmation_order_assignments
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

-- ============================================================
-- 5) Agent Payments & Rewards
-- ============================================================

CREATE TABLE IF NOT EXISTS public.confirmation_agent_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.confirmation_agents(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('salary','per_order','bonus','adjustment')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','cancelled')),
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'DZD',
  generated_from TEXT DEFAULT 'system',
  breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.users(id),
  approved_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.confirmation_agent_payments IS 'Payroll ledger for confirmation agents supporting salaries, per-order payouts, bonuses.';

CREATE INDEX IF NOT EXISTS idx_confirmation_payments_agent ON public.confirmation_agent_payments (agent_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_confirmation_payments_status ON public.confirmation_agent_payments (status, period_start DESC);

CREATE TRIGGER set_timestamp_confirmation_payments
BEFORE UPDATE ON public.confirmation_agent_payments
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

CREATE TABLE IF NOT EXISTS public.confirmation_agent_rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.confirmation_agents(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL,
  reward_value NUMERIC(12,2) DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  awarded_by UUID REFERENCES public.users(id),
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.confirmation_agent_rewards IS 'Stores recognition and incentive events (gamification, bonuses, badges).';

CREATE INDEX IF NOT EXISTS idx_confirmation_rewards_agent ON public.confirmation_agent_rewards (agent_id, awarded_at DESC);

CREATE TRIGGER set_timestamp_confirmation_rewards
BEFORE UPDATE ON public.confirmation_agent_rewards
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

-- ============================================================
-- 6) Daily Performance Snapshots
-- ============================================================

CREATE TABLE IF NOT EXISTS public.confirmation_agent_performance_daily (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.confirmation_agents(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_assigned INT NOT NULL DEFAULT 0,
  total_confirmed INT NOT NULL DEFAULT 0,
  total_cancelled INT NOT NULL DEFAULT 0,
  total_pending INT NOT NULL DEFAULT 0,
  contact_attempts INT NOT NULL DEFAULT 0,
  successful_contacts INT NOT NULL DEFAULT 0,
  average_response_minutes NUMERIC(10,2) NOT NULL DEFAULT 0,
  average_handling_minutes NUMERIC(10,2) NOT NULL DEFAULT 0,
  conversion_rate NUMERIC(6,3) NOT NULL DEFAULT 0,
  productivity_score NUMERIC(6,3) NOT NULL DEFAULT 0,
  queue_position INT,
  bonus_earned NUMERIC(12,2) NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (agent_id, snapshot_date)
);

COMMENT ON TABLE public.confirmation_agent_performance_daily IS 'Analytics snapshots used for leaderboards, queue visualisation, and filters.';

CREATE INDEX IF NOT EXISTS idx_confirmation_performance_org_date ON public.confirmation_agent_performance_daily (organization_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_confirmation_performance_agent ON public.confirmation_agent_performance_daily (agent_id, snapshot_date DESC);

CREATE TRIGGER set_timestamp_confirmation_perf
BEFORE UPDATE ON public.confirmation_agent_performance_daily
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

-- ============================================================
-- 7) Helper View for Analytics Dashboard
-- ============================================================

CREATE OR REPLACE VIEW public.confirmation_agent_performance_overview AS
SELECT
  perf.organization_id,
  perf.agent_id,
  a.full_name,
  a.status,
  a.compensation_mode,
  perf.snapshot_date,
  perf.total_assigned,
  perf.total_confirmed,
  perf.total_cancelled,
  perf.total_pending,
  perf.contact_attempts,
  perf.successful_contacts,
  perf.average_response_minutes,
  perf.average_handling_minutes,
  perf.conversion_rate,
  perf.productivity_score,
  perf.queue_position,
  perf.bonus_earned,
  a.workload_settings,
  a.assignment_preferences
FROM public.confirmation_agent_performance_daily perf
JOIN public.confirmation_agents a
  ON perf.agent_id = a.id
WHERE perf.snapshot_date >= (CURRENT_DATE - INTERVAL '90 days');

COMMENT ON VIEW public.confirmation_agent_performance_overview IS 'Materialised stats for UI analytics (last 90 days).';

-- ============================================================
-- TODO: Add RLS policies aligned with tenant isolation.
-- ============================================================
