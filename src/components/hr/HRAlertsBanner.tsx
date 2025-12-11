/**
 * 🚨 HR Alerts Banner Component - مكون شريط تنبيهات الموارد البشرية
 */

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertTriangle,
  Calendar,
  FileText,
  DollarSign,
  Users,
  ChevronDown,
  ChevronUp,
  X,
  Clock,
  Bell,
  Cake,
} from 'lucide-react';
import type { HRAlerts } from '@/types/hr/dashboard';

interface HRAlertsBannerProps {
  alerts: HRAlerts;
  onDismiss?: () => void;
  onNavigate?: (section: string) => void;
}

export function HRAlertsBanner({ alerts, onDismiss, onNavigate }: HRAlertsBannerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  // حساب عدد التنبيهات النشطة
  const activeAlerts = [
    alerts.pending_leave_requests > 0 && 'leave',
    alerts.pending_performance_reviews > 0 && 'performance',
    alerts.expiring_documents > 0 && 'documents',
    alerts.unpaid_payroll_count > 0 && 'payroll',
    alerts.low_leave_balance_employees > 0 && 'balance',
    alerts.upcoming_birthdays > 0 && 'birthdays',
  ].filter((alert): alert is string => !!alert && !dismissedAlerts.includes(alert));

  if (activeAlerts.length === 0) {
    return null;
  }

  const dismissAlert = (alertType: string) => {
    setDismissedAlerts([...dismissedAlerts, alertType]);
  };

  return (
    <Card className="border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                <Bell className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h3 className="font-medium">تنبيهات تحتاج انتباهك</h3>
                <p className="text-sm text-muted-foreground">
                  {activeAlerts.length} تنبيه نشط
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              {onDismiss && (
                <Button variant="ghost" size="sm" onClick={onDismiss}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Alerts List */}
          <CollapsibleContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
              {/* طلبات الإجازة المعلقة */}
              {alerts.pending_leave_requests > 0 && !dismissedAlerts.includes('leave') && (
                <AlertItem
                  icon={Calendar}
                  title="طلبات إجازة معلقة"
                  count={alerts.pending_leave_requests}
                  color="blue"
                  onClick={() => onNavigate?.('leaves')}
                  onDismiss={() => dismissAlert('leave')}
                />
              )}

              {/* تقييمات الأداء المعلقة */}
              {alerts.pending_performance_reviews > 0 && !dismissedAlerts.includes('performance') && (
                <AlertItem
                  icon={Users}
                  title="تقييمات أداء معلقة"
                  count={alerts.pending_performance_reviews}
                  color="purple"
                  onClick={() => onNavigate?.('performance')}
                  onDismiss={() => dismissAlert('performance')}
                />
              )}

              {/* مستندات قاربت على الانتهاء */}
              {alerts.expiring_documents > 0 && !dismissedAlerts.includes('documents') && (
                <AlertItem
                  icon={FileText}
                  title="مستندات قاربت على الانتهاء"
                  count={alerts.expiring_documents}
                  color="orange"
                  onClick={() => onNavigate?.('documents')}
                  onDismiss={() => dismissAlert('documents')}
                />
              )}

              {/* رواتب غير مصروفة */}
              {alerts.unpaid_payroll_count > 0 && !dismissedAlerts.includes('payroll') && (
                <AlertItem
                  icon={DollarSign}
                  title="رواتب غير مصروفة"
                  count={alerts.unpaid_payroll_count}
                  color="red"
                  onClick={() => onNavigate?.('payroll')}
                  onDismiss={() => dismissAlert('payroll')}
                />
              )}

              {/* موظفين برصيد إجازات منخفض */}
              {alerts.low_leave_balance_employees > 0 && !dismissedAlerts.includes('balance') && (
                <AlertItem
                  icon={AlertTriangle}
                  title="رصيد إجازات منخفض"
                  count={alerts.low_leave_balance_employees}
                  color="yellow"
                  onClick={() => onNavigate?.('leaves')}
                  onDismiss={() => dismissAlert('balance')}
                />
              )}

              {/* أعياد ميلاد قادمة */}
              {alerts.upcoming_birthdays > 0 && !dismissedAlerts.includes('birthdays') && (
                <AlertItem
                  icon={Cake}
                  title="أعياد ميلاد هذا الأسبوع"
                  count={alerts.upcoming_birthdays}
                  color="pink"
                  onClick={() => onNavigate?.('employees')}
                  onDismiss={() => dismissAlert('birthdays')}
                />
              )}
            </div>

            {/* Critical Alerts */}
            {alerts.critical_alerts && alerts.critical_alerts.length > 0 && (
              <div className="mt-4 space-y-2">
                {alerts.critical_alerts.map((alert, index) => (
                  <Alert key={index} variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{alert}</AlertDescription>
                  </Alert>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}

// ============================================
// Alert Item Component
// ============================================

interface AlertItemProps {
  icon: React.ElementType;
  title: string;
  count: number;
  color: 'blue' | 'purple' | 'orange' | 'red' | 'yellow' | 'pink' | 'green';
  onClick?: () => void;
  onDismiss?: () => void;
}

function AlertItem({
  icon: Icon,
  title,
  count,
  color,
  onClick,
  onDismiss,
}: AlertItemProps) {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-600 dark:text-blue-400',
      badge: 'bg-blue-500',
    },
    purple: {
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      text: 'text-purple-600 dark:text-purple-400',
      badge: 'bg-purple-500',
    },
    orange: {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-600 dark:text-orange-400',
      badge: 'bg-orange-500',
    },
    red: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-600 dark:text-red-400',
      badge: 'bg-red-500',
    },
    yellow: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-600 dark:text-yellow-400',
      badge: 'bg-yellow-500',
    },
    pink: {
      bg: 'bg-pink-100 dark:bg-pink-900/30',
      text: 'text-pink-600 dark:text-pink-400',
      badge: 'bg-pink-500',
    },
    green: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-600 dark:text-green-400',
      badge: 'bg-green-500',
    },
  };

  const colors = colorClasses[color];

  return (
    <div
      className={`relative p-3 rounded-lg ${colors.bg} cursor-pointer hover:opacity-90 transition-opacity`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 ${colors.text}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${colors.text}`}>{title}</p>
        </div>
        <Badge className={`${colors.badge} text-white`}>{count}</Badge>
      </div>
      {onDismiss && (
        <button
          className="absolute top-1 left-1 p-1 rounded-full hover:bg-white/50 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
        >
          <X className="h-3 w-3 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

// ============================================
// Compact Alert Badge Component
// ============================================

interface AlertBadgeProps {
  count: number;
  onClick?: () => void;
}

export function HRAlertBadge({ count, onClick }: AlertBadgeProps) {
  if (count === 0) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="relative"
      onClick={onClick}
    >
      <Bell className="h-5 w-5" />
      <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
        {count > 9 ? '9+' : count}
      </span>
    </Button>
  );
}

// ============================================
// Quick Actions Panel
// ============================================

interface QuickActionsProps {
  onAction: (action: string) => void;
}

export function HRQuickActions({ onAction }: QuickActionsProps) {
  const actions = [
    { id: 'check-in', icon: Clock, label: 'تسجيل حضور', color: 'green' },
    { id: 'new-leave', icon: Calendar, label: 'طلب إجازة جديد', color: 'blue' },
    { id: 'new-review', icon: Users, label: 'تقييم أداء جديد', color: 'purple' },
    { id: 'payroll', icon: DollarSign, label: 'حساب الرواتب', color: 'orange' },
  ];

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-medium mb-3">إجراءات سريعة</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {actions.map((action) => (
            <Button
              key={action.id}
              variant="outline"
              className="flex flex-col gap-2 h-auto py-4"
              onClick={() => onAction(action.id)}
            >
              <action.icon className="h-5 w-5" />
              <span className="text-xs">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default HRAlertsBanner;
