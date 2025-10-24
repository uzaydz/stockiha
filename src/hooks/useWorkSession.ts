import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tantml:parameter>
import { useTenant } from '@/context/TenantContext';
import { useStaffSession } from '@/hooks/useStaffSession';
import type { LocalWorkSession } from '@/database/localDb';
import {
  getActiveOrPausedSession,
  startWorkSession,
  pauseWorkSession,
  resumeWorkSession,
  closeWorkSession,
  updateWorkSessionLocally,
  getTodayWorkSessions,
} from '@/api/localWorkSessionService';

/**
 * Hook لإدارة جلسات العمل مع دعم الإيقاف المؤقت
 */
export const useWorkSession = () => {
  const { currentOrganization } = useTenant();
  const { currentStaff } = useStaffSession();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  // جلب الجلسة النشطة أو المتوقفة
  const { data: currentSession, refetch: refetchSession } = useQuery({
    queryKey: ['workSession', currentStaff?.id, currentOrganization?.id],
    queryFn: async () => {
      if (!currentStaff?.id || !currentOrganization?.id) return null;
      return await getActiveOrPausedSession(currentStaff.id, currentOrganization.id);
    },
    enabled: !!currentStaff?.id && !!currentOrganization?.id,
    staleTime: 30000, // 30 ثانية
    refetchInterval: 60000, // تحديث كل دقيقة
  });

  // جلب جلسات اليوم
  const { data: todaySessions = [], refetch: refetchTodaySessions } = useQuery({
    queryKey: ['todayWorkSessions', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      return await getTodayWorkSessions(currentOrganization.id);
    },
    enabled: !!currentOrganization?.id,
    staleTime: 60000, // دقيقة
  });

  // بدء جلسة جديدة
  const startSessionMutation = useMutation({
    mutationFn: async ({ openingCash, notes }: { openingCash: number; notes?: string }) => {
      if (!currentStaff?.id || !currentStaff?.staff_name || !currentOrganization?.id) {
        throw new Error('معلومات الموظف أو المؤسسة غير متوفرة');
      }
      return await startWorkSession(
        currentStaff.id,
        currentStaff.staff_name,
        currentOrganization.id,
        openingCash,
        notes
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workSession'] });
      queryClient.invalidateQueries({ queryKey: ['todayWorkSessions'] });
    },
  });

  // إيقاف الجلسة مؤقتاً
  const pauseSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return await pauseWorkSession(sessionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workSession'] });
      queryClient.invalidateQueries({ queryKey: ['todayWorkSessions'] });
    },
  });

  // استئناف الجلسة
  const resumeSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return await resumeWorkSession(sessionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workSession'] });
      queryClient.invalidateQueries({ queryKey: ['todayWorkSessions'] });
    },
  });

  // إغلاق الجلسة
  const closeSessionMutation = useMutation({
    mutationFn: async ({ sessionId, closingCash, notes }: { sessionId: string; closingCash: number; notes?: string }) => {
      return await closeWorkSession(sessionId, closingCash, notes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workSession'] });
      queryClient.invalidateQueries({ queryKey: ['todayWorkSessions'] });
    },
  });

  // تحديث إحصائيات الجلسة محلياً
  const updateSessionStats = useCallback(
    async (updates: {
      total_sales?: number;
      total_orders?: number;
      cash_sales?: number;
      card_sales?: number;
    }) => {
      if (!currentSession?.id) return;
      await updateWorkSessionLocally(currentSession.id, updates);
      refetchSession();
    },
    [currentSession?.id, refetchSession]
  );

  // دوال مساعدة
  const startSession = useCallback(
    async (openingCash: number, notes?: string) => {
      setIsLoading(true);
      try {
        await startSessionMutation.mutateAsync({ openingCash, notes });
      } finally {
        setIsLoading(false);
      }
    },
    [startSessionMutation]
  );

  const pauseSession = useCallback(async () => {
    if (!currentSession?.id) return;
    setIsLoading(true);
    try {
      await pauseSessionMutation.mutateAsync(currentSession.id);
    } finally {
      setIsLoading(false);
    }
  }, [currentSession?.id, pauseSessionMutation]);

  const resumeSession = useCallback(async () => {
    if (!currentSession?.id) return;
    setIsLoading(true);
    try {
      await resumeSessionMutation.mutateAsync(currentSession.id);
    } finally {
      setIsLoading(false);
    }
  }, [currentSession?.id, resumeSessionMutation]);

  const closeSession = useCallback(
    async (closingCash: number, notes?: string) => {
      if (!currentSession?.id) return;
      setIsLoading(true);
      try {
        return await closeSessionMutation.mutateAsync({
          sessionId: currentSession.id,
          closingCash,
          notes,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [currentSession?.id, closeSessionMutation]
  );

  return {
    // البيانات
    currentSession,
    todaySessions,
    isLoading,
    
    // الحالات
    hasActiveSession: currentSession?.status === 'active',
    hasPausedSession: currentSession?.status === 'paused',
    hasSession: !!currentSession,
    
    // الدوال
    startSession,
    pauseSession,
    resumeSession,
    closeSession,
    updateSessionStats,
    refetchSession,
    refetchTodaySessions,
  };
};
