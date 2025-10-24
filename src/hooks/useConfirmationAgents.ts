import { useMemo } from 'react';
import { useConfirmation } from '@/context/ConfirmationContext';

export const useConfirmationAgents = () => {
  const {
    agents,
    agentById,
    createAgent,
    updateAgent,
    toggleAgentStatus,
    loading,
    refreshing,
    missingSchema,
    error,
  } = useConfirmation();

  const totals = useMemo(() => {
    const total = agents.length;
    const active = agents.filter((agent) => agent.status === 'active').length;
    const paused = agents.filter((agent) => agent.status === 'paused').length;
    const invited = agents.filter((agent) => agent.status === 'invited').length;
    return { total, active, paused, invited };
  }, [agents]);

  return {
    agents,
    agentById,
    totals,
    loading,
    refreshing,
    missingSchema,
    error,
    createAgent,
    updateAgent,
    toggleAgentStatus,
  };
};

export default useConfirmationAgents;
