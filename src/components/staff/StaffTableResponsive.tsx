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
  Mail,
  Key,
  Settings,
  Filter,
  UserCheck,
  UserX,
  Hash,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { POSStaffSession } from '@/services/staffService';
import { cn } from '@/lib/utils';

interface StaffTableProps {
  staff: POSStaffSession[];
  onEdit: (staff: POSStaffSession) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, currentStatus: boolean) => void;
  offlineStatus?: Record<string, 'saved' | 'outdated' | 'not_saved'>;
  onUpdateOffline?: (staff: POSStaffSession) => void;
  onCustomizePermissions?: (staff: POSStaffSession) => void;
}

// تصميم البطاقة للموبايل
const StaffCard: React.FC<{
  staffMember: POSStaffSession;
  onEdit: (staff: POSStaffSession) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, currentStatus: boolean) => void;
  offlineStatus?: 'saved' | 'outdated' | 'not_saved';
  onUpdateOffline?: (staff: POSStaffSession) => void;
  onCustomizePermissions?: (staff: POSStaffSession) => void;
}> = ({
  staffMember,
  onEdit,
  onDelete,
  onToggleActive,
  offlineStatus,
  onUpdateOffline,
  onCustomizePermissions,
}) => {
  const getPermissionInfo = () => {
    if (staffMember.permissions?.canManageSettings) {
      return { label: 'مدير', color: 'from-purple-500 to-purple-600', icon: Shield };
    }
    if (staffMember.permissions?.canAccessPosAdvanced) {
      return { label: 'كاشير', color: 'from-blue-500 to-blue-600', icon: UserCheck };
    }
    return { label: 'موظف', color: 'from-gray-500 to-gray-600', icon: User };
  };

  const permissionInfo = getPermissionInfo();
  const PermissionIcon = permissionInfo.icon;

  return (
    <div className={cn(
      "relative bg-card border rounded-xl p-4 space-y-4 transition-all duration-300",
      staffMember.is_active
        ? "border-border shadow-sm hover:shadow-md"
        : "border-dashed border-muted-foreground/30 opacity-80"
    )}>
      {/* رأس البطاقة */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          {/* الأيقونة الرئيسية */}
          <div className={cn(
            "relative h-12 w-12 rounded-xl flex items-center justify-center shadow-lg",
            `bg-gradient-to-br ${permissionInfo.color}`
          )}>
            <PermissionIcon className="h-6 w-6 text-white" />
            {/* مؤشر الحالة */}
            <div className={cn(
              "absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-background",
              staffMember.is_active ? "bg-green-500" : "bg-red-500"
            )} />
          </div>

          {/* معلومات الموظف */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate">{staffMember.staff_name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant={staffMember.is_active ? "default" : "secondary"}
                className="text-[10px] px-1.5 py-0"
              >
                {permissionInfo.label}
              </Badge>
              {offlineStatus && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1.5 py-0",
                    offlineStatus === 'saved' && "border-green-500/50 text-green-600",
                    offlineStatus === 'outdated' && "border-yellow-500/50 text-yellow-600"
                  )}
                >
                  {offlineStatus === 'saved' ? <Wifi className="h-2.5 w-2.5 ml-1" /> :
                   offlineStatus === 'outdated' ? <WifiOff className="h-2.5 w-2.5 ml-1" /> : null}
                  {offlineStatus === 'saved' ? 'محفوظ' :
                   offlineStatus === 'outdated' ? 'يحتاج تحديث' : 'غير محفوظ'}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* قائمة الإجراءات */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-muted"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onEdit(staffMember)}>
              <Edit className="ml-2 h-4 w-4" />
              تعديل البيانات
            </DropdownMenuItem>

            {onCustomizePermissions && (
              <DropdownMenuItem onClick={() => onCustomizePermissions(staffMember)}>
                <Settings className="ml-2 h-4 w-4" />
                تخصيص الصلاحيات
              </DropdownMenuItem>
            )}

            {onUpdateOffline && (
              <DropdownMenuItem onClick={() => onUpdateOffline(staffMember)}>
                <Key className="ml-2 h-4 w-4" />
                تحديث PIN الأوفلاين
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => onToggleActive(staffMember.id, staffMember.is_active)}
              className={staffMember.is_active ? "text-orange-600" : "text-green-600"}
            >
              {staffMember.is_active ? (
                <>
                  <UserX className="ml-2 h-4 w-4" />
                  تعطيل الحساب
                </>
              ) : (
                <>
                  <UserCheck className="ml-2 h-4 w-4" />
                  تفعيل الحساب
                </>
              )}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => onDelete(staffMember.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="ml-2 h-4 w-4" />
              حذف نهائياً
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* تفاصيل البطاقة */}
      <div className="space-y-2 pt-2 border-t border-border/50">
        {/* البريد الإلكتروني */}
        {staffMember.email && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{staffMember.email}</span>
          </div>
        )}

        {/* معرف الموظف */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Hash className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="font-mono text-xs">{staffMember.id.substring(0, 12)}...</span>
        </div>

        {/* حالة النشاط */}
        <div className="flex items-center gap-2 text-sm">
          {staffMember.is_active ? (
            <>
              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
              <span className="text-green-600 font-medium">حساب نشط</span>
            </>
          ) : (
            <>
              <XCircle className="h-3.5 w-3.5 text-red-500" />
              <span className="text-red-600 font-medium">حساب معطل</span>
            </>
          )}
        </div>
      </div>

      {/* أزرار سريعة */}
      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => onEdit(staffMember)}
        >
          <Edit className="h-3.5 w-3.5 ml-1" />
          تعديل
        </Button>
        <Button
          variant={staffMember.is_active ? "destructive" : "default"}
          size="sm"
          className="flex-1"
          onClick={() => onToggleActive(staffMember.id, staffMember.is_active)}
        >
          {staffMember.is_active ? (
            <>
              <UserX className="h-3.5 w-3.5 ml-1" />
              تعطيل
            </>
          ) : (
            <>
              <UserCheck className="h-3.5 w-3.5 ml-1" />
              تفعيل
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

const StaffTableResponsive: React.FC<StaffTableProps> = ({
  staff,
  onEdit,
  onDelete,
  onToggleActive,
  offlineStatus = {},
  onUpdateOffline,
  onCustomizePermissions,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [permissionFilter, setPermissionFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showFilters, setShowFilters] = useState(false);

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
      } else if (permissionFilter === 'employee') {
        filtered = filtered.filter(s =>
          !s.permissions?.canManageSettings &&
          !s.permissions?.canAccessPosAdvanced
        );
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

  // دالة الحصول على Badge الصلاحيات للجدول
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
          <UserCheck className="ml-1 h-3 w-3" />
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

  return (
    <div className="space-y-4">
      {/* شريط البحث والفلاتر - محسّن للموبايل */}
      <div className="space-y-3">
        {/* البحث وزر الفلاتر */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="ابحث بالاسم أو البريد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className="lg:hidden"
          >
            <Filter className={cn("h-4 w-4", showFilters && "text-primary")} />
          </Button>
        </div>

        {/* الفلاتر - مخفية على الموبايل بشكل افتراضي */}
        <div className={cn(
          "flex flex-col sm:flex-row gap-2 transition-all duration-300",
          !showFilters && "hidden lg:flex"
        )}>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="active">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  نشط
                </div>
              </SelectItem>
              <SelectItem value="inactive">
                <div className="flex items-center gap-2">
                  <XCircle className="h-3 w-3 text-red-500" />
                  معطل
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <Select value={permissionFilter} onValueChange={setPermissionFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="الصلاحيات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الصلاحيات</SelectItem>
              <SelectItem value="admin">
                <div className="flex items-center gap-2">
                  <Shield className="h-3 w-3 text-purple-500" />
                  مدير
                </div>
              </SelectItem>
              <SelectItem value="cashier">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-3 w-3 text-blue-500" />
                  كاشير
                </div>
              </SelectItem>
              <SelectItem value="employee">
                <div className="flex items-center gap-2">
                  <User className="h-3 w-3 text-gray-500" />
                  موظف
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="w-full sm:w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 نتائج</SelectItem>
              <SelectItem value="10">10 نتائج</SelectItem>
              <SelectItem value="20">20 نتيجة</SelectItem>
              <SelectItem value="50">50 نتيجة</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ملخص النتائج */}
        {(searchQuery || statusFilter !== 'all' || permissionFilter !== 'all') && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>عدد النتائج: {filteredStaff.length}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setPermissionFilter('all');
              }}
            >
              مسح الفلاتر
            </Button>
          </div>
        )}
      </div>

      {/* عرض البطاقات للموبايل والجدول للشاشات الكبيرة */}
      <div>
        {/* البطاقات - للموبايل */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:hidden">
          {paginatedStaff.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground bg-card rounded-lg border">
              {searchQuery || statusFilter !== 'all' || permissionFilter !== 'all'
                ? 'لا توجد نتائج للبحث'
                : 'لا يوجد موظفين مسجلين'}
            </div>
          ) : (
            paginatedStaff.map((staffMember) => (
              <StaffCard
                key={staffMember.id}
                staffMember={staffMember}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleActive={onToggleActive}
                offlineStatus={offlineStatus[staffMember.id]}
                onUpdateOffline={onUpdateOffline}
                onCustomizePermissions={onCustomizePermissions}
              />
            ))
          )}
        </div>

        {/* الجدول - للشاشات الكبيرة */}
        <div className="hidden lg:block rounded-lg border border-border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold">الموظف</TableHead>
                <TableHead className="font-semibold text-center">البريد الإلكتروني</TableHead>
                <TableHead className="font-semibold text-center">الصلاحيات</TableHead>
                <TableHead className="font-semibold text-center">الحالة</TableHead>
                <TableHead className="font-semibold text-center">الأوفلاين</TableHead>
                <TableHead className="w-[100px] text-center font-semibold">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedStaff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
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
                      <Badge
                        variant={staffMember.is_active ? "default" : "destructive"}
                        className={cn(
                          staffMember.is_active
                            ? "bg-green-500/10 text-green-600 border-green-500/20"
                            : "bg-red-500/10 text-red-600 border-red-500/20"
                        )}
                      >
                        {staffMember.is_active ? (
                          <>
                            <CheckCircle className="ml-1 h-3 w-3" />
                            نشط
                          </>
                        ) : (
                          <>
                            <XCircle className="ml-1 h-3 w-3" />
                            معطل
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {(() => {
                        const st = offlineStatus[staffMember.id];
                        if (st === 'saved') {
                          return (
                            <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 border-green-500/20">
                              <Wifi className="ml-1 h-3 w-3" />
                              محفوظ
                            </Badge>
                          );
                        }
                        if (st === 'outdated') {
                          return (
                            <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/20 border-yellow-500/20">
                              <WifiOff className="ml-1 h-3 w-3" />
                              يحتاج تحديث
                            </Badge>
                          );
                        }
                        return <Badge variant="outline">غير محفوظ</Badge>;
                      })()}
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(staffMember)}>
                            <Edit className="ml-2 h-4 w-4" />
                            تعديل
                          </DropdownMenuItem>
                          {onCustomizePermissions && (
                            <DropdownMenuItem onClick={() => onCustomizePermissions(staffMember)}>
                              <Settings className="ml-2 h-4 w-4" />
                              تخصيص الصلاحيات
                            </DropdownMenuItem>
                          )}
                          {onUpdateOffline && (
                            <DropdownMenuItem onClick={() => onUpdateOffline(staffMember)}>
                              <Key className="ml-2 h-4 w-4" />
                              تحديث الأوفلاين
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => onToggleActive(staffMember.id, staffMember.is_active)}
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
                            className="text-red-600"
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
      </div>

      {/* Pagination - محسّن للموبايل */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
          <div className="text-sm text-muted-foreground text-center sm:text-right">
            عرض {((currentPage - 1) * pageSize) + 1} إلى {Math.min(currentPage * pageSize, filteredStaff.length)} من {filteredStaff.length}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-9 px-3"
            >
              <ChevronRight className="h-4 w-4 sm:ml-1" />
              <span className="hidden sm:inline">السابق</span>
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
                    className="h-9 w-9 p-0"
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
              className="h-9 px-3"
            >
              <span className="hidden sm:inline">التالي</span>
              <ChevronLeft className="h-4 w-4 sm:mr-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffTableResponsive;