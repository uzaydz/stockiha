/**
 * 📋 Attendance Table Component - مكون جدول الحضور والانصراف
 */

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Clock,
  MoreVertical,
  Edit,
  Eye,
  Search,
  Filter,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import type { AttendanceWithEmployee, AttendanceStatus } from '@/types/hr/attendance';

interface AttendanceTableProps {
  data: AttendanceWithEmployee[];
  isLoading?: boolean;
  onEdit?: (record: AttendanceWithEmployee) => void;
  onView?: (record: AttendanceWithEmployee) => void;
  onExport?: () => void;
}

export function AttendanceTable({
  data,
  isLoading,
  onEdit,
  onView,
  onExport,
}: AttendanceTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredData = data.filter((record) => {
    const matchesSearch =
      record.employee?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.employee?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو البريد..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 ml-2" />
            <SelectValue placeholder="حالة الحضور" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            <SelectItem value="present">حاضر</SelectItem>
            <SelectItem value="absent">غائب</SelectItem>
            <SelectItem value="late">متأخر</SelectItem>
            <SelectItem value="on_leave">في إجازة</SelectItem>
            <SelectItem value="remote">عمل عن بعد</SelectItem>
          </SelectContent>
        </Select>
        {onExport && (
          <Button variant="outline" onClick={onExport}>
            <Download className="h-4 w-4 ml-2" />
            تصدير
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">الموظف</TableHead>
              <TableHead className="text-right">التاريخ</TableHead>
              <TableHead className="text-right">وقت الحضور</TableHead>
              <TableHead className="text-right">وقت الانصراف</TableHead>
              <TableHead className="text-right">ساعات العمل</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="text-right">ملاحظات</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeletonRows />
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Calendar className="h-8 w-8" />
                    <p>لا توجد سجلات حضور</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={record.employee?.avatar_url} />
                        <AvatarFallback>
                          {record.employee?.name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{record.employee?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {record.employee?.job_title}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{formatDate(record.attendance_date)}</span>
                  </TableCell>
                  <TableCell>
                    {record.check_in_time ? (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-green-500" />
                        <span>{formatTime(record.check_in_time)}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {record.check_out_time ? (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-red-500" />
                        <span>{formatTime(record.check_out_time)}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {record.work_duration_minutes ? (
                      <span>{formatDuration(record.work_duration_minutes)}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={record.status} />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground truncate max-w-[150px] block">
                      {record.notes || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onView && (
                          <DropdownMenuItem onClick={() => onView(record)}>
                            <Eye className="h-4 w-4 ml-2" />
                            عرض التفاصيل
                          </DropdownMenuItem>
                        )}
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(record)}>
                            <Edit className="h-4 w-4 ml-2" />
                            تعديل
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      {!isLoading && filteredData.length > 0 && (
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>عرض {filteredData.length} من {data.length} سجل</span>
          <div className="flex gap-4">
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              {filteredData.filter((r) => r.status === 'present').length} حاضر
            </span>
            <span className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-yellow-500" />
              {filteredData.filter((r) => r.status === 'late').length} متأخر
            </span>
            <span className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-red-500" />
              {filteredData.filter((r) => r.status === 'absent').length} غائب
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Helper Components
// ============================================

function StatusBadge({ status }: { status: AttendanceStatus }) {
  const statusConfig: Record<AttendanceStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    present: { label: 'حاضر', variant: 'default' },
    absent: { label: 'غائب', variant: 'destructive' },
    late: { label: 'متأخر', variant: 'secondary' },
    on_leave: { label: 'في إجازة', variant: 'outline' },
    sick_leave: { label: 'إجازة مرضية', variant: 'outline' },
    remote: { label: 'عن بعد', variant: 'default' },
    half_day: { label: 'نصف يوم', variant: 'secondary' },
  };

  const config = statusConfig[status] || { label: status, variant: 'outline' as const };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function TableSkeletonRows() {
  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <TableRow key={i} className="animate-pulse">
          <TableCell>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-muted" />
              <div className="space-y-1">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-3 w-16 bg-muted rounded" />
              </div>
            </div>
          </TableCell>
          <TableCell><div className="h-4 w-20 bg-muted rounded" /></TableCell>
          <TableCell><div className="h-4 w-16 bg-muted rounded" /></TableCell>
          <TableCell><div className="h-4 w-16 bg-muted rounded" /></TableCell>
          <TableCell><div className="h-4 w-12 bg-muted rounded" /></TableCell>
          <TableCell><div className="h-6 w-16 bg-muted rounded" /></TableCell>
          <TableCell><div className="h-4 w-24 bg-muted rounded" /></TableCell>
          <TableCell><div className="h-8 w-8 bg-muted rounded" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ============================================
// Utility Functions
// ============================================

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ar-SA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatTime(timeStr: string): string {
  if (!timeStr) return '-';
  // Handle both full datetime and time-only strings
  const time = timeStr.includes('T') ? timeStr.split('T')[1].substring(0, 5) : timeStr.substring(0, 5);
  return time;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}س ${mins}د`;
}

export default AttendanceTable;
