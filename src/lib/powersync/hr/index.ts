/**
 * 👥 HR PowerSync Services Index
 * خدمات الموارد البشرية - أوفلاين فيرست
 * v4.0 - 2025-12-10
 *
 * This module exports all HR services that work offline-first using PowerSync.
 * Each service provides:
 * - CRUD operations that work offline
 * - Real-time watchers for live updates
 * - Automatic sync when online
 *
 * Usage:
 * import { attendanceService, leaveService } from '@/lib/powersync/hr';
 * const today = await attendanceService.getTodayAttendance(employeeId);
 */

// ===== Attendance Service =====
export * from './attendanceService';
import * as attendanceService from './attendanceService';
export { attendanceService };

// ===== Leave Service =====
export * from './leaveService';
import * as leaveService from './leaveService';
export { leaveService };

// ===== Payroll Service =====
export * from './payrollService';
import * as payrollService from './payrollService';
export { payrollService };

// ===== Performance Service =====
export * from './performanceService';
import * as performanceService from './performanceService';
export { performanceService };

// ===== Shifts Service =====
export * from './shiftsService';
import * as shiftsService from './shiftsService';
export { shiftsService };

// ===== Re-export commonly used types =====
// Types are imported from @/types/hr/* in each service

/**
 * HR Services Summary:
 *
 * 1. attendanceService
 *    - recordCheckIn / recordCheckOut
 *    - getAttendanceRecords
 *    - getTodayAttendance
 *    - getDailyAttendanceStats
 *    - getEmployeeAttendanceStats
 *    - watchAttendance / watchEmployeeAttendance
 *
 * 2. leaveService
 *    - getLeaveTypes / createLeaveType
 *    - getEmployeeLeaveBalances
 *    - submitLeaveRequest / reviewLeaveRequest
 *    - getLeaveRequests / getPendingLeaveRequests
 *    - getLeaveCalendar
 *    - getOfficialHolidays
 *    - watchPendingLeaveRequests / watchEmployeeLeaveBalances
 *
 * 3. payrollService
 *    - getSalaryStructures / createSalaryStructure
 *    - getPayrollRecords / createPayrollRecord
 *    - approvePayrollRecord / markPayrollAsPaid
 *    - getEmployeeLoans / createLoanRequest
 *    - approveLoan / recordLoanPayment
 *    - watchPayrollRecords / watchEmployeeLoans
 *
 * 4. performanceService
 *    - getPerformanceCriteria
 *    - getReviewPeriods / getActiveReviewPeriod
 *    - getPerformanceReviews / createPerformanceReview
 *    - getEmployeeGoals / createEmployeeGoal / updateGoalProgress
 *    - getEmployeeWarnings / createEmployeeWarning
 *    - watchEmployeeGoals / watchEmployeeWarnings
 *
 * 5. shiftsService
 *    - getWorkShifts / createWorkShift
 *    - getShiftAssignments / assignShiftToEmployee
 *    - getCurrentEmployeeShift
 *    - getShiftStatistics
 *    - watchWorkShifts / watchShiftAssignments
 */
