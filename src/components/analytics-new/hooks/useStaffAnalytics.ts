/**
 * ============================================
 * STOCKIHA ANALYTICS - STAFF DATA HOOK
 * جلب وتحليل بيانات الموظفين والأداء
 * ============================================
 */

import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import { useTenant } from '@/context/tenant';
import type { FilterState, StaffData, StaffPerformance } from '../types';
import { format, parseISO, differenceInMinutes } from 'date-fns';

// ==================== Types ====================

export interface UseStaffAnalyticsReturn {
  data: StaffData | null;
  isLoading: boolean;
  error: Error | null;
}

// ==================== SQL Queries ====================

const buildStaffQuery = (orgId: string) => {
  const sql = `
    SELECT
      s.id,
      s.staff_name,
      s.role,
      s.is_active,
      s.created_at
    FROM pos_staff_sessions s
    WHERE s.organization_id = ?
    ORDER BY s.staff_name
  `;

  return { sql, params: [orgId] };
};

const buildWorkSessionsQuery = (orgId: string, filters: FilterState) => {
  const { dateRange } = filters;

  const sql = `
    SELECT
      ws.id,
      ws.staff_id,
      ws.start_time,
      ws.end_time,
      ws.opening_cash,
      ws.closing_cash,
      ws.total_sales,
      ws.total_orders,
      ws.total_returns,
      ws.cash_difference,
      ws.notes,
      ws.status,
      ps.staff_name
    FROM staff_work_sessions ws
    LEFT JOIN pos_staff_sessions ps ON ws.staff_id = ps.id
    WHERE ws.organization_id = ?
      AND ws.start_time >= ?
      AND ws.start_time <= ?
    ORDER BY ws.start_time DESC
  `;

  const params = [orgId, dateRange.start.toISOString(), dateRange.end.toISOString()];

  return { sql, params };
};

const buildStaffOrdersQuery = (orgId: string, filters: FilterState) => {
  const { dateRange } = filters;

  const sql = `
    SELECT
      o.id,
      o.staff_id,
      o.total as order_total,
      o.status,
      o.created_at,
      ps.staff_name
    FROM orders o
    LEFT JOIN pos_staff_sessions ps ON o.staff_id = ps.id
    WHERE o.organization_id = ?
      AND o.status IN ('completed', 'delivered')
      AND o.created_at >= ?
      AND o.created_at <= ?
      AND o.staff_id IS NOT NULL
  `;

  const params = [orgId, dateRange.start.toISOString(), dateRange.end.toISOString()];

  return { sql, params };
};

// ==================== Data Processing ====================

const processStaffPerformance = (
  staff: any[],
  workSessions: any[],
  orders: any[]
): StaffPerformance[] => {
  const staffMap = new Map<string, {
    name: string;
    totalSales: number;
    orderCount: number;
    totalHours: number;
    sessionsCount: number;
    cashDifference: number;
  }>();

  // Initialize from staff list
  staff.forEach((s) => {
    staffMap.set(s.id, {
      name: s.staff_name,
      totalSales: 0,
      orderCount: 0,
      totalHours: 0,
      sessionsCount: 0,
      cashDifference: 0,
    });
  });

  // Process work sessions
  workSessions.forEach((ws) => {
    const staffId = ws.staff_id;
    if (!staffId || !staffMap.has(staffId)) return;

    const data = staffMap.get(staffId)!;
    data.totalSales += ws.total_sales || 0;
    data.sessionsCount += 1;
    data.cashDifference += ws.cash_difference || 0;

    // Calculate hours
    if (ws.start_time && ws.end_time) {
      const start = parseISO(ws.start_time);
      const end = parseISO(ws.end_time);
      const minutes = differenceInMinutes(end, start);
      data.totalHours += minutes / 60;
    }
  });

  // Process orders
  orders.forEach((o) => {
    const staffId = o.staff_id;
    if (!staffId || !staffMap.has(staffId)) return;

    const data = staffMap.get(staffId)!;
    data.orderCount += 1;
  });

  // Calculate performance metrics
  return Array.from(staffMap.entries())
    .map(([id, data]) => {
      const averageOrderValue = data.orderCount > 0 ? data.totalSales / data.orderCount : 0;
      const salesPerHour = data.totalHours > 0 ? data.totalSales / data.totalHours : 0;
      const ordersPerHour = data.totalHours > 0 ? data.orderCount / data.totalHours : 0;

      return {
        id,
        name: data.name,
        totalSales: data.totalSales,
        orderCount: data.orderCount,
        averageOrderValue,
        hoursWorked: Math.round(data.totalHours * 10) / 10,
        salesPerHour,
        ordersPerHour,
        cashDifference: data.cashDifference,
        returnsCount: 0, // Would need separate query
      };
    })
    .filter((s) => s.totalSales > 0 || s.orderCount > 0 || s.hoursWorked > 0)
    .sort((a, b) => b.totalSales - a.totalSales);
};

const calculateAttendanceStats = (workSessions: any[], staff: any[]) => {
  const activeStaff = staff.filter((s) => s.is_active).length;

  // Calculate days with sessions
  const daysWithSessions = new Set(
    workSessions.map((ws) => format(parseISO(ws.start_time), 'yyyy-MM-dd'))
  ).size;

  // Calculate average daily staff
  const totalSessionsPerStaff = new Map<string, number>();
  workSessions.forEach((ws) => {
    const staffId = ws.staff_id;
    totalSessionsPerStaff.set(staffId, (totalSessionsPerStaff.get(staffId) || 0) + 1);
  });

  const averageDailyStaff = daysWithSessions > 0
    ? workSessions.length / daysWithSessions
    : 0;

  // Calculate total hours
  let totalHours = 0;
  workSessions.forEach((ws) => {
    if (ws.start_time && ws.end_time) {
      const start = parseISO(ws.start_time);
      const end = parseISO(ws.end_time);
      totalHours += differenceInMinutes(end, start) / 60;
    }
  });

  return {
    totalStaff: staff.length,
    activeStaff,
    averageDailyStaff: Math.round(averageDailyStaff * 10) / 10,
    totalWorkHours: Math.round(totalHours * 10) / 10,
    averageHoursPerSession: workSessions.length > 0
      ? Math.round((totalHours / workSessions.length) * 10) / 10
      : 0,
  };
};

// ==================== Main Hook ====================

export function useStaffAnalytics(filters: FilterState): UseStaffAnalyticsReturn {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id || '';

  // Build queries
  const staffQuery = useMemo(() => buildStaffQuery(orgId), [orgId]);
  const sessionsQuery = useMemo(() => buildWorkSessionsQuery(orgId, filters), [orgId, filters]);
  const ordersQuery = useMemo(() => buildStaffOrdersQuery(orgId, filters), [orgId, filters]);

  // Execute queries
  const {
    data: staffData,
    isLoading: staffLoading,
    error: staffError
  } = useQuery(staffQuery.sql, staffQuery.params);

  const {
    data: sessionsData,
    isLoading: sessionsLoading,
    error: sessionsError
  } = useQuery(sessionsQuery.sql, sessionsQuery.params);

  const {
    data: ordersData,
    isLoading: ordersLoading,
    error: ordersError
  } = useQuery(ordersQuery.sql, ordersQuery.params);

  // Process data
  const data = useMemo((): StaffData | null => {
    if (!staffData) return null;

    const staff = staffData as any[];
    const sessions = (sessionsData as any[]) || [];
    const orders = (ordersData as any[]) || [];

    // Calculate staff performance
    const staffPerformance = processStaffPerformance(staff, sessions, orders);

    // Calculate attendance stats
    const attendanceStats = calculateAttendanceStats(sessions, staff);

    // Calculate totals
    const totalSales = staffPerformance.reduce((sum, s) => sum + s.totalSales, 0);
    const totalOrders = staffPerformance.reduce((sum, s) => sum + s.orderCount, 0);

    // Top performer
    const topPerformer = staffPerformance.length > 0 ? staffPerformance[0] : null;

    return {
      totalStaff: attendanceStats.totalStaff,
      activeStaff: attendanceStats.activeStaff,
      averageDailyStaff: attendanceStats.averageDailyStaff,
      totalWorkHours: attendanceStats.totalWorkHours,
      staffPerformance,
      salesByStaff: staffPerformance.map((s) => ({
        id: s.id,
        name: s.name,
        value: s.totalSales,
        count: s.orderCount,
        percentage: totalSales > 0 ? (s.totalSales / totalSales) * 100 : 0,
      })),
      attendanceRate: 0, // Would need scheduled shifts
      topPerformer: topPerformer ? {
        id: topPerformer.id,
        name: topPerformer.name,
        metric: topPerformer.totalSales,
        metricLabel: 'المبيعات',
      } : null,
    };
  }, [staffData, sessionsData, ordersData]);

  return {
    data,
    isLoading: staffLoading || sessionsLoading || ordersLoading,
    error: staffError || sessionsError || ordersError,
  };
}

export default useStaffAnalytics;
