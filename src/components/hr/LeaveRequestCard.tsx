/**
 * 📝 Leave Request Card Component - مكون بطاقة طلب الإجازة
 */

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Briefcase,
} from 'lucide-react';
import type { LeaveRequestWithDetails } from '@/types/hr/leave';

interface LeaveRequestCardProps {
  request: LeaveRequestWithDetails;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onView?: (id: string) => void;
  isManager?: boolean;
}

export function LeaveRequestCard({
  request,
  onApprove,
  onReject,
  onView,
  isManager = false,
}: LeaveRequestCardProps) {
  const statusConfig = {
    pending: {
      label: 'قيد الانتظار',
      variant: 'secondary' as const,
      icon: Clock,
      color: 'text-yellow-500',
    },
    approved: {
      label: 'موافق عليه',
      variant: 'default' as const,
      icon: CheckCircle,
      color: 'text-green-500',
    },
    rejected: {
      label: 'مرفوض',
      variant: 'destructive' as const,
      icon: XCircle,
      color: 'text-red-500',
    },
    cancelled: {
      label: 'ملغي',
      variant: 'outline' as const,
      icon: AlertCircle,
      color: 'text-gray-500',
    },
  };

  const status = statusConfig[request.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={request.employee?.avatar_url} />
              <AvatarFallback>
                {request.employee?.name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{request.employee?.name}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Briefcase className="h-3 w-3" />
                {request.employee?.job_title || 'موظف'}
              </p>
            </div>
          </div>
          <Badge variant={status.variant} className="flex items-center gap-1">
            <StatusIcon className={`h-3 w-3 ${status.color}`} />
            {status.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* نوع الإجازة */}
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
          <Calendar className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">نوع الإجازة</p>
            <p className="font-medium">
              {request.leave_type?.name_ar || request.leave_type?.name || 'إجازة'}
            </p>
          </div>
        </div>

        {/* التواريخ */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 border rounded-lg">
            <p className="text-xs text-muted-foreground">من</p>
            <p className="font-medium">{formatDate(request.start_date)}</p>
          </div>
          <div className="p-3 border rounded-lg">
            <p className="text-xs text-muted-foreground">إلى</p>
            <p className="font-medium">{formatDate(request.end_date)}</p>
          </div>
        </div>

        {/* المدة */}
        <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
          <span className="text-sm">إجمالي الأيام</span>
          <span className="font-bold text-lg text-primary">{request.total_days} يوم</span>
        </div>

        {/* السبب */}
        {request.reason && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <FileText className="h-4 w-4" />
              السبب
            </p>
            <p className="text-sm p-3 bg-muted/30 rounded-lg">{request.reason}</p>
          </div>
        )}

        {/* معلومات المراجعة */}
        {request.status !== 'pending' && request.reviewed_by && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">تمت المراجعة بواسطة</p>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{request.reviewer?.name || 'غير معروف'}</span>
                {request.reviewed_at && (
                  <span className="text-xs text-muted-foreground mr-auto">
                    {formatDateTime(request.reviewed_at)}
                  </span>
                )}
              </div>
              {request.rejection_reason && (
                <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-600 dark:text-red-400">
                  سبب الرفض: {request.rejection_reason}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>

      <CardFooter className="pt-4 gap-2">
        {isManager && request.status === 'pending' && (
          <>
            {onApprove && (
              <Button
                className="flex-1"
                onClick={() => onApprove(request.id)}
              >
                <CheckCircle className="h-4 w-4 ml-2" />
                موافقة
              </Button>
            )}
            {onReject && (
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => onReject(request.id)}
              >
                <XCircle className="h-4 w-4 ml-2" />
                رفض
              </Button>
            )}
          </>
        )}
        {onView && (
          <Button
            variant="outline"
            className={isManager && request.status === 'pending' ? '' : 'w-full'}
            onClick={() => onView(request.id)}
          >
            عرض التفاصيل
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

// ============================================
// Leave Requests List Component
// ============================================

interface LeaveRequestsListProps {
  requests: LeaveRequestWithDetails[];
  isLoading?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onView?: (id: string) => void;
  isManager?: boolean;
  emptyMessage?: string;
}

export function LeaveRequestsList({
  requests,
  isLoading,
  onApprove,
  onReject,
  onView,
  isManager,
  emptyMessage = 'لا توجد طلبات إجازة',
}: LeaveRequestsListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-3 w-16 bg-muted rounded" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-16 bg-muted rounded" />
                <div className="h-12 bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 mx-auto text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {requests.map((request) => (
        <LeaveRequestCard
          key={request.id}
          request={request}
          onApprove={onApprove}
          onReject={onReject}
          onView={onView}
          isManager={isManager}
        />
      ))}
    </div>
  );
}

// ============================================
// Utility Functions
// ============================================

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ar-SA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ar-SA', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default LeaveRequestCard;
