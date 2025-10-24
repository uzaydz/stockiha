import { useEffect, useMemo } from 'react';
import { useConfirmation } from '@/context/ConfirmationContext';

export const useConfirmationAssignments = (orderIds?: string[]) => {
  const {
    assignments,
    assignmentsByOrderId,
    refreshAssignments,
    agentById,
    loading,
    missingSchema,
    error,
  } = useConfirmation();

  useEffect(() => {
    if (!orderIds || orderIds.length === 0) return;
    refreshAssignments(orderIds).catch(() => {});
  }, [orderIds, refreshAssignments]);

  const selectedAssignments = useMemo(() => {
    if (!orderIds || orderIds.length === 0) return assignments;
    return orderIds
      .map((orderId) => assignmentsByOrderId[orderId])
      .filter(Boolean);
  }, [orderIds, assignments, assignmentsByOrderId]);

  return {
    assignments,
    assignmentsByOrderId,
    selectedAssignments,
    agentById,
    loading,
    missingSchema,
    error,
  };
};

export default useConfirmationAssignments;
