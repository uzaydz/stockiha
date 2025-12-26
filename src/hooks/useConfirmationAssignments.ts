import { useEffect, useMemo, useRef } from 'react';
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

  const requestedOrderIdsRef = useRef<Set<string>>(new Set());

  const missingOrderIds = useMemo(() => {
    if (!orderIds || orderIds.length === 0) return [];
    return orderIds.filter((orderId) => !assignmentsByOrderId[orderId]);
  }, [orderIds, assignmentsByOrderId]);

  const pendingOrderIds = useMemo(() => {
    if (!missingOrderIds || missingOrderIds.length === 0) return [];
    return missingOrderIds.filter((orderId) => !requestedOrderIdsRef.current.has(orderId));
  }, [missingOrderIds]);

  const pendingOrderIdsKey = useMemo(() => pendingOrderIds.join('|'), [pendingOrderIds]);

  useEffect(() => {
    if (missingSchema) return;
    if (!pendingOrderIds || pendingOrderIds.length === 0) return;

    for (const orderId of pendingOrderIds) {
      requestedOrderIdsRef.current.add(orderId);
    }

    refreshAssignments(pendingOrderIds).catch(() => {
      for (const orderId of pendingOrderIds) {
        requestedOrderIdsRef.current.delete(orderId);
      }
    });
  }, [pendingOrderIdsKey, refreshAssignments, missingSchema]);

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
