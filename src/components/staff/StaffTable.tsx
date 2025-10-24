import React, { useState, useMemo } from 'react';
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
  DropdownMenuSeparator,
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
  Edit,
  Trash2,
  User,
  Shield,
  ShieldOff,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { POSStaffSession } from '@/services/staffService';
import { cn } from '@/lib/utils';

interface StaffTableProps {
  staff: POSStaffSession[];
  onEdit: (staff: POSStaffSession) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, currentStatus: boolean) => void;
}

const StaffTable: React.FC<StaffTableProps> = ({
  staff,
  onEdit,
  onDelete,
  onToggleActive,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [permissionFilter, setPermissionFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // تصفية الموظفين
  const filteredStaff = useMemo(() => {
    let filtered = staff;

    // فلترة حسب البحث
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.staff_name.toLowerCase().includes(query) ||
        s.email?.toLowerCase().includes(query) ||
        s.id.toLowerCase().includes(query)
      );
    }

    // فلترة حسب الحالة
    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      filtered = filtered.filter(s => s.is_active === isActive);
    }

    // فلترة حسب الصلاحيات
    if (permissionFilter !== 'all') {
      if (permissionFilter === 'admin') {
        filtered = filtered.filter(s => s.permissions?.canManageSettings === true);
      } else if (permissionFilter === 'cashier') {
        filtered = filtered.filter(s => s.permissions?.canAccessPosAdvanced === true);
      }
    }

    return filtered;
  }, [staff, searchQuery, statusFilter, permissionFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredStaff.length / pageSize);
  const paginatedStaff = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredStaff.slice(startIndex, startIndex + pageSize);
  }, [filteredStaff, currentPage, pageSize]);

  // إعادة تعيين الصفحة عند تغيير الفلاتر
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, permissionFilter, pageSize]);

  // دالة الحصول على Badge الصلاحيات
  const getPermissionBadge = (permissions: any) => {
    if (permissions?.canManageSettings) {
      return (
        <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 border-purple-500/20">
          <Shield className="ml-1 h-3 w-3" />
          مدير
        </Badge>
      );
    }
    if (permissions?.canAccessPosAdvanced) {
      return (
        <Badge variant="secondary">
          <User className="ml-1 h-3 w-3" />
          كاشير
        </Badge>
      );
    }
    return (
      <Badge variant="outline">
        <User className="ml-1 h-3 w-3" />
        موظف
      </Badge>
    );
  };

  // دالة الحصول على Badge الحالة
  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 border-green-500/20">
          <CheckCircle className="ml-1 h-3 w-3" />
          نشط
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 border-red-500/20">
        <XCircle className="ml-1 h-3 w-3" />
        معطل
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* شريط البحث والفلاتر */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="ابحث عن موظف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="active">نشط</SelectItem>
              <SelectItem value="inactive">معطل</SelectItem>
            </SelectContent>
          </Select>

          <Select value={permissionFilter} onValueChange={setPermissionFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="الصلاحيات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الصلاحيات</SelectItem>
              <SelectItem value="admin">مدير</SelectItem>
              <SelectItem value="cashier">كاشير</SelectItem>
            </SelectContent>
          </Select>

          <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="w-[100px]">
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

      {/* الجدول */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold">الموظف</TableHead>
              <TableHead className="font-semibold text-center">البريد الإلكتروني</TableHead>
              <TableHead className="font-semibold text-center">الصلاحيات</TableHead>
              <TableHead className="font-semibold text-center">الحالة</TableHead>
              <TableHead className="w-[100px] text-center font-semibold">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedStaff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  {searchQuery || statusFilter !== 'all' || permissionFilter !== 'all'
                    ? 'لا توجد نتائج للبحث'
                    : 'لا يوجد موظفين مسجلين'}
                </TableCell>
              </TableRow>
            ) : (
              paginatedStaff.map((staffMember) => (
                <TableRow key={staffMember.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center",
                        staffMember.is_active ? "bg-primary/10" : "bg-muted"
                      )}>
                        <User className={cn(
                          "h-5 w-5",
                          staffMember.is_active ? "text-primary" : "text-muted-foreground"
                        )} />
                      </div>
                      <div>
                        <p className="font-medium">{staffMember.staff_name}</p>
                        <p className="text-xs text-muted-foreground">#{staffMember.id.substring(0, 8)}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">
                    {staffMember.email || '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    {getPermissionBadge(staffMember.permissions)}
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(staffMember.is_active)}
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
                          onClick={() => onEdit(staffMember)}
                          className="cursor-pointer"
                        >
                          <Edit className="ml-2 h-4 w-4" />
                          تعديل
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onToggleActive(staffMember.id, staffMember.is_active)}
                          className="cursor-pointer"
                        >
                          {staffMember.is_active ? (
                            <>
                              <ShieldOff className="ml-2 h-4 w-4" />
                              تعطيل
                            </>
                          ) : (
                            <>
                              <Shield className="ml-2 h-4 w-4" />
                              تفعيل
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(staffMember.id)}
                          className="cursor-pointer text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="ml-2 h-4 w-4" />
                          حذف
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
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            عرض {((currentPage - 1) * pageSize) + 1} إلى {Math.min(currentPage * pageSize, filteredStaff.length)} من {filteredStaff.length}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronRight className="h-4 w-4" />
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
                    className="h-8 w-8 p-0"
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
            >
              التالي
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffTable;
