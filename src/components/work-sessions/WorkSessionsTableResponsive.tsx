import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
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
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  MoreVertical,
  Eye,
  User,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  Pause,
  ChevronLeft,
  ChevronRight,
  Calendar,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Activity,
} from 'lucide-react';
import type { LocalWorkSession } from '@/database/localDb';
import { formatPrice } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface WorkSessionsTableResponsiveProps {
  sessions: LocalWorkSession[];
  onViewDetails: (session: LocalWorkSession) => void;
}

// مكون البطاقة للموبايل
const SessionCard: React.FC<{
  session: LocalWorkSession;
  onViewDetails: (session: LocalWorkSession) => void;
}> = ({ session, onViewDetails }) => {
  // دالة تنسيق المدة
  const formatDuration = (startDate: string, endDate?: string) => {
    if (!endDate) return 'جلسة نشطة';
    const duration = (new Date(endDate).getTime() - new Date(startDate).getTime()) / 1000 / 60;
    const hours = Math.floor(duration / 60);
    const minutes = Math.floor(duration % 60);
    if (hours > 0) {
      return `${hours}س ${minutes}د`;
    }
    return `${minutes}د`;
  };

  // دالة الحصول على لون وأيقونة الحالة
  const getStatusStyle = () => {
    switch (session.status) {
      case 'active':
        return {
          gradient: 'from-green-500 to-green-600',
          icon: <Activity className="h-6 w-6 text-white" />,
          bgClass: 'bg-green-500/10',
          borderClass: 'border-green-500/20',
          textClass: 'text-green-600 dark:text-green-400'
        };
      case 'paused':
        return {
          gradient: 'from-amber-500 to-amber-600',
          icon: <Pause className="h-6 w-6 text-white" />,
          bgClass: 'bg-amber-500/10',
          borderClass: 'border-amber-500/20',
          textClass: 'text-amber-600 dark:text-amber-400'
        };
      case 'closed':
        return {
          gradient: 'from-gray-500 to-gray-600',
          icon: <XCircle className="h-6 w-6 text-white" />,
          bgClass: 'bg-gray-500/10',
          borderClass: 'border-gray-500/20',
          textClass: 'text-gray-600 dark:text-gray-400'
        };
      default:
        return {
          gradient: 'from-blue-500 to-blue-600',
          icon: <User className="h-6 w-6 text-white" />,
          bgClass: 'bg-blue-500/10',
          borderClass: 'border-blue-500/20',
          textClass: 'text-blue-600 dark:text-blue-400'
        };
    }
  };

  const statusStyle = getStatusStyle();
  const hasProfit = session.cash_difference && session.cash_difference > 0;
  const hasLoss = session.cash_difference && session.cash_difference < 0;

  return (
    <div className={cn(
      "relative bg-card border rounded-xl overflow-hidden",
      session.status === 'active'
        ? "border-green-500/30 shadow-md"
        : session.status === 'paused'
        ? "border-amber-500/30"
        : "border-border shadow-sm hover:shadow-md",
      "transition-all duration-200"
    )}>
      {/* رأس البطاقة مع التدرج اللوني */}
      <div className={cn("bg-gradient-to-r", statusStyle.gradient, "p-3")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              {statusStyle.icon}
            </div>
            <div>
              <p className="font-semibold text-white text-base">{session.staff_name}</p>
              <p className="text-xs text-white/80">#{session.id.substring(0, 8)}</p>
            </div>
          </div>
          <Badge
            variant="secondary"
            className={cn(
              "bg-white/90 text-gray-800 text-xs px-2 py-0.5",
              "hover:bg-white"
            )}
          >
            {session.status === 'active' ? 'نشط' :
             session.status === 'paused' ? 'متوقف' :
             'مغلق'}
          </Badge>
        </div>
      </div>

      {/* محتوى البطاقة */}
      <div className="p-4 space-y-3">
        {/* معلومات الوقت */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span className="text-xs">
              {format(new Date(session.started_at), 'dd/MM', { locale: ar })}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium">
              {format(new Date(session.started_at), 'HH:mm', { locale: ar })}
              {session.ended_at && (
                <span className="text-muted-foreground">
                  {' - '}
                  {format(new Date(session.ended_at), 'HH:mm', { locale: ar })}
                </span>
              )}
            </span>
          </div>
        </div>

        {/* المدة */}
        <div className={cn(
          "text-center py-1.5 px-2 rounded-md text-xs font-medium",
          statusStyle.bgClass
        )}>
          <span className={statusStyle.textClass}>
            {formatDuration(session.started_at, session.ended_at)}
          </span>
        </div>

        {/* إحصائيات سريعة */}
        <div className="grid grid-cols-3 gap-2">
          {/* الطلبات */}
          <div className="text-center p-2 bg-muted/30 rounded-lg">
            <ShoppingCart className="h-4 w-4 mx-auto mb-1 text-blue-500" />
            <p className="text-xs text-muted-foreground mb-0.5">طلبات</p>
            <p className="font-semibold text-sm">{session.total_orders}</p>
          </div>

          {/* المبيعات */}
          <div className="text-center p-2 bg-muted/30 rounded-lg">
            <DollarSign className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <p className="text-xs text-muted-foreground mb-0.5">مبيعات</p>
            <p className="font-semibold text-sm text-blue-600 dark:text-blue-400">
              {formatPrice(session.total_sales).replace(' ر.س', '')}
            </p>
          </div>

          {/* الفرق */}
          <div className="text-center p-2 bg-muted/30 rounded-lg">
            {session.cash_difference !== undefined && session.cash_difference >= 0 ? (
              <TrendingUp className="h-4 w-4 mx-auto mb-1 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 mx-auto mb-1 text-red-500" />
            )}
            <p className="text-xs text-muted-foreground mb-0.5">الفرق</p>
            <p className={cn(
              "font-semibold text-sm",
              session.status === 'closed' && session.cash_difference !== undefined
                ? session.cash_difference >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
                : "text-muted-foreground"
            )}>
              {session.status === 'closed' && session.cash_difference !== undefined ? (
                <>
                  {session.cash_difference >= 0 ? '+' : ''}
                  {formatPrice(session.cash_difference).replace(' ر.س', '')}
                </>
              ) : (
                '-'
              )}
            </p>
          </div>
        </div>

        {/* أزرار الإجراءات */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="default"
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={() => onViewDetails(session)}
          >
            <Eye className="h-3.5 w-3.5 ml-1" />
            عرض التفاصيل
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => onViewDetails(session)}
                className="cursor-pointer text-xs"
              >
                <Eye className="ml-2 h-3.5 w-3.5" />
                عرض التفاصيل الكاملة
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* شارة حالة خاصة */}
      {hasProfit && (
        <div className="absolute -top-1 -right-1">
          <div className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-bl-lg rounded-tr-lg shadow-md">
            <TrendingUp className="h-3 w-3 inline ml-0.5" />
            ربح
          </div>
        </div>
      )}
      {hasLoss && (
        <div className="absolute -top-1 -right-1">
          <div className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-bl-lg rounded-tr-lg shadow-md">
            <TrendingDown className="h-3 w-3 inline ml-0.5" />
            خسارة
          </div>
        </div>
      )}
    </div>
  );
};

const WorkSessionsTableResponsive: React.FC<WorkSessionsTableResponsiveProps> = ({
  sessions,
  onViewDetails,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // تصفية الجلسات
  const filteredSessions = useMemo(() => {
    let filtered = sessions;

    // فلترة حسب البحث
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(session =>
        session.staff_name.toLowerCase().includes(query) ||
        session.id.toLowerCase().includes(query)
      );
    }

    // فلترة حسب الحالة
    if (statusFilter !== 'all') {
      filtered = filtered.filter(session => session.status === statusFilter);
    }

    return filtered;
  }, [sessions, searchQuery, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredSessions.length / pageSize);
  const paginatedSessions = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredSessions.slice(startIndex, startIndex + pageSize);
  }, [filteredSessions, currentPage, pageSize]);

  // إعادة تعيين الصفحة عند تغيير الفلاتر
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, pageSize]);

  // دالة تنسيق المدة
  const formatDuration = (startDate: string, endDate?: string) => {
    if (!endDate) return '-';
    const duration = (new Date(endDate).getTime() - new Date(startDate).getTime()) / 1000 / 60;
    const hours = Math.floor(duration / 60);
    const minutes = Math.floor(duration % 60);
    if (hours > 0) {
      return `${hours}س ${minutes}د`;
    }
    return `${minutes}د`;
  };

  // دالة الحصول على Badge الحالة
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 border-green-500/20">
            <CheckCircle className="ml-1 h-3 w-3" />
            نشط
          </Badge>
        );
      case 'paused':
        return (
          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border-amber-500/20">
            <Pause className="ml-1 h-3 w-3" />
            متوقف
          </Badge>
        );
      case 'closed':
        return (
          <Badge variant="secondary">
            <XCircle className="ml-1 h-3 w-3" />
            مغلق
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* شريط البحث والفلاتر */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-full sm:max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="ابحث عن موظف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10 w-full"
          />
        </div>

        <div className="flex gap-2 items-center flex-wrap w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[110px] text-xs sm:text-sm">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="active">نشط</SelectItem>
              <SelectItem value="paused">متوقف</SelectItem>
              <SelectItem value="closed">مغلق</SelectItem>
            </SelectContent>
          </Select>

          <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="w-[80px] text-xs sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* عرض البطاقات للموبايل والجدول للشاشات الكبيرة */}
      <div className="block lg:hidden">
        {/* عرض البطاقات للموبايل */}
        {paginatedSessions.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg border border-border">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchQuery || statusFilter !== 'all'
                ? 'لا توجد نتائج للبحث'
                : 'لا توجد جلسات مسجلة'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {paginatedSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onViewDetails={onViewDetails}
              />
            ))}
          </div>
        )}
      </div>

      {/* الجدول للشاشات الك��يرة */}
      <div className="hidden lg:block rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold">الموظف</TableHead>
              <TableHead className="font-semibold text-center">الحالة</TableHead>
              <TableHead className="font-semibold text-center">وقت البداية</TableHead>
              <TableHead className="font-semibold text-center">المدة</TableHead>
              <TableHead className="font-semibold text-center">الطلبات</TableHead>
              <TableHead className="font-semibold text-center">المبيعات</TableHead>
              <TableHead className="font-semibold text-center">الفرق</TableHead>
              <TableHead className="w-[80px] text-center font-semibold">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedSessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  {searchQuery || statusFilter !== 'all'
                    ? 'لا توجد نتائج للبحث'
                    : 'لا توجد جلسات مسجلة'}
                </TableCell>
              </TableRow>
            ) : (
              paginatedSessions.map((session) => (
                <TableRow key={session.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{session.staff_name}</p>
                        <p className="text-xs text-muted-foreground">#{session.id.substring(0, 8)}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(session.status)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-sm font-medium">
                        {format(new Date(session.started_at), 'HH:mm', { locale: ar })}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(session.started_at), 'dd/MM/yyyy', { locale: ar })}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1 text-sm">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      {formatDuration(session.started_at, session.ended_at)}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="font-normal">
                      {session.total_orders}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {formatPrice(session.total_sales)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {session.status === 'closed' && session.cash_difference !== undefined ? (
                      <span
                        className={cn(
                          'font-semibold',
                          session.cash_difference >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        )}
                      >
                        {session.cash_difference >= 0 ? '+' : ''}
                        {formatPrice(session.cash_difference)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => onViewDetails(session)}
                          className="cursor-pointer"
                        >
                          <Eye className="ml-2 h-4 w-4" />
                          عرض التفاصيل
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between px-2">
          <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-right">
            عرض {((currentPage - 1) * pageSize) + 1} إلى {Math.min(currentPage * pageSize, filteredSessions.length)} من {filteredSessions.length}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-7 sm:h-8 text-xs sm:text-sm"
            >
              <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              السابق
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-xs sm:text-sm"
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-7 sm:h-8 text-xs sm:text-sm"
            >
              التالي
              <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkSessionsTableResponsive;