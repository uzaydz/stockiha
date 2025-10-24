import { useMemo } from 'react';
import { useConfirmation } from '@/context/ConfirmationContext';

interface AnalyticsFilters {
  period?: 'today' | 'week' | 'month' | 'custom';
  agents?: string[];
  from?: string;
  to?: string;
}

export const useConfirmationAnalytics = (filters?: AnalyticsFilters) => {
  const { performanceSnapshots, agents, rewards, missingSchema, error, loading } = useConfirmation();

  const filteredSnapshots = useMemo(() => {
    if (!filters) return performanceSnapshots;
    let result = [...performanceSnapshots];
    if (filters.agents?.length) {
      result = result.filter((snapshot) => filters.agents!.includes(snapshot.agent_id));
    }
    if (filters.from) {
      result = result.filter((snapshot) => snapshot.snapshot_date >= filters.from!);
    }
    if (filters.to) {
      result = result.filter((snapshot) => snapshot.snapshot_date <= filters.to!);
    }
    return result;
  }, [performanceSnapshots, filters]);

  const leaderboard = useMemo(() => {
    const grouped: Record<string, { confirmed: number; conversion: number; productivity: number }> = {};
    filteredSnapshots.forEach((snapshot) => {
      if (!grouped[snapshot.agent_id]) {
        grouped[snapshot.agent_id] = { confirmed: 0, conversion: 0, productivity: 0 };
      }
      grouped[snapshot.agent_id].confirmed += snapshot.total_confirmed;
      grouped[snapshot.agent_id].conversion += snapshot.conversion_rate;
      grouped[snapshot.agent_id].productivity += snapshot.productivity_score;
    });
    return Object.entries(grouped)
      .map(([agentId, stats]) => ({
        agentId,
        agent: agents.find((agent) => agent.id === agentId),
        confirmed: stats.confirmed,
        conversion: stats.conversion,
        productivity: stats.productivity,
        rewardCount: rewards.filter((reward) => reward.agent_id === agentId).length,
      }))
      .sort((a, b) => b.confirmed - a.confirmed);
  }, [filteredSnapshots, agents, rewards]);

  const totals = useMemo(() => {
    const confirmed = filteredSnapshots.reduce((acc, snapshot) => acc + snapshot.total_confirmed, 0);
    const assigned = filteredSnapshots.reduce((acc, snapshot) => acc + snapshot.total_assigned, 0);
    const pending = filteredSnapshots.reduce((acc, snapshot) => acc + snapshot.total_pending, 0);
    const cancelled = filteredSnapshots.reduce((acc, snapshot) => acc + snapshot.total_cancelled, 0);
    return {
      confirmed,
      assigned,
      pending,
      cancelled,
      conversionRate: assigned ? confirmed / assigned : 0,
    };
  }, [filteredSnapshots]);

  return {
    loading,
    missingSchema,
    error,
    snapshots: filteredSnapshots,
    leaderboard,
    totals,
    agents,
    rewards,
  };
};

export default useConfirmationAnalytics;
