import React, { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useWorkSession } from '@/context/WorkSessionContext';

interface UseOldSessionAlertOptions {
  /** تفعيل التنبيه (افتراضي: true) */
  enabled?: boolean;
  /** الحد الأقصى بالساعات قبل التنبيه (افتراضي: 12 ساعة) */
  maxHours?: number;
}

/**
 * Hook للتنبيه عند وجود جلسة قديمة مفتوحة
 * - يتحقق إذا كانت الجلسة بدأت منذ أكثر من X ساعات
 * - ينبه المستخدم لإغلاقها
 */
export const useOldSessionAlert = ({
  enabled = true,
  maxHours = 12
}: UseOldSessionAlertOptions = {}) => {
  const { activeSession, hasActiveSession } = useWorkSession();
  const hasAlertedRef = useRef(false);
  const lastSessionIdRef = useRef<string | null>(null);

  // التحقق من عمر الجلسة
  const checkSessionAge = useCallback(() => {
    if (!enabled || !hasActiveSession || !activeSession?.started_at) {
      return;
    }

    // لا تنبه مرتين لنفس الجلسة
    if (hasAlertedRef.current && lastSessionIdRef.current === activeSession.id) {
      return;
    }

    const startTime = new Date(activeSession.started_at).getTime();
    const now = Date.now();
    const hoursElapsed = (now - startTime) / (1000 * 60 * 60);

    // التحقق إذا كانت الجلسة قديمة
    if (hoursElapsed >= maxHours) {
      const hoursFormatted = Math.floor(hoursElapsed);
      const minutesFormatted = Math.floor((hoursElapsed % 1) * 60);

      console.log('[OldSessionAlert] ⚠️ جلسة قديمة مكتشفة:', {
        sessionId: activeSession.id,
        startedAt: activeSession.started_at,
        hoursElapsed: hoursFormatted
      });

      toast.warning(
        <div className="space-y-1" dir="rtl">
          <div className="font-bold">⚠️ جلسة عمل قديمة</div>
          <div className="text-sm">
            هذه الجلسة مفتوحة منذ {hoursFormatted} ساعة {minutesFormatted > 0 ? `و ${minutesFormatted} دقيقة` : ''}
          </div>
          <div className="text-xs text-muted-foreground">
            يرجى إغلاق الجلسة إذا انتهى يوم العمل
          </div>
        </div>,
        {
          duration: 15000, // 15 ثانية
          id: 'old-session-alert',
        }
      );

      hasAlertedRef.current = true;
      lastSessionIdRef.current = activeSession.id;
    }
  }, [enabled, hasActiveSession, activeSession, maxHours]);

  // التحقق عند تحميل المكون وعند تغيير الجلسة
  useEffect(() => {
    // تأخير قليل للسماح بتحميل البيانات
    const timeoutId = setTimeout(checkSessionAge, 2000);

    return () => clearTimeout(timeoutId);
  }, [checkSessionAge]);

  // إعادة تعيين حالة التنبيه عند تغيير الجلسة
  useEffect(() => {
    if (!activeSession?.id) {
      hasAlertedRef.current = false;
      lastSessionIdRef.current = null;
    } else if (activeSession.id !== lastSessionIdRef.current) {
      hasAlertedRef.current = false;
    }
  }, [activeSession?.id]);

  // التحقق أيضاً إذا كانت الجلسة من يوم سابق
  const isFromPreviousDay = useCallback(() => {
    if (!activeSession?.started_at) return false;

    const startDate = new Date(activeSession.started_at);
    const today = new Date();

    return startDate.toDateString() !== today.toDateString();
  }, [activeSession?.started_at]);

  return {
    isOldSession: hasActiveSession && activeSession?.started_at
      ? (Date.now() - new Date(activeSession.started_at).getTime()) / (1000 * 60 * 60) >= maxHours
      : false,
    isFromPreviousDay: isFromPreviousDay(),
    checkSessionAge
  };
};

export default useOldSessionAlert;
