import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  RefreshCw,
  Eye,
  Edit,
  Package,
  Trash2,
  MapPin,
  MoreHorizontal,
  FileText,
  AlertCircle
} from 'lucide-react';
import {
  formatCurrency,
  getStatusBadge,
  getTypeIcon,
  getTypeLabel,
  getCategoryLabel,
  getCategoryBadgeVariant
} from '@/lib/losses/utils';
import type { Loss } from '@/types/losses';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface LossTableProps {
  losses: Loss[];
  loading: boolean;
  onView: (loss: Loss) => void;
  onEdit: (loss: Loss) => void;
  onAction: (loss: Loss) => void;
  onDelete: (loss: Loss) => void;
}

const LossTable: React.FC<LossTableProps> = ({
  losses,
  loading,
  onView,
  onEdit,
  onAction,
  onDelete
}) => {
  return (
    <Card className="border-0 shadow-sm bg-white/50 backdrop-blur-sm overflow-hidden">
      <CardHeader className="border-b bg-muted/30 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold tracking-tight text-foreground">جدول تصاريح الخسائر</CardTitle>
            <CardDescription className="mt-1">عرض وإدارة جميع تصاريح الخسائر والتلف</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="px-3 py-1 text-xs font-mono h-7">
              {losses.length} تصريح
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4 text-muted-foreground animate-pulse">
            <RefreshCw className="h-10 w-10 animate-spin opacity-50" />
            <p className="text-sm">جاري تحميل البيانات...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent border-b-slate-100">
                  <TableHead className="w-[100px] text-right font-semibold">رقم التصريح</TableHead>
                  <TableHead className="text-right font-semibold">التفاصيل (النوع & الفئة)</TableHead>
                  <TableHead className="text-right font-semibold">الموقع & التاريخ</TableHead>
                  <TableHead className="text-center font-semibold">العناصر</TableHead>
                  <TableHead className="text-right font-semibold">التكلفة (شراء / بيع)</TableHead>
                  <TableHead className="text-center font-semibold">الحالة</TableHead>
                  <TableHead className="w-[80px] text-center font-semibold">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {losses.map((loss) => {
                  const TypeIcon = getTypeIcon(loss.loss_type);
                  const isSynced = loss._synced !== false;
                  const hasError = loss._syncStatus === 'error';

                  return (
                    <TableRow key={loss.id} className="group hover:bg-muted/30 transition-colors border-b-slate-50">
                      {/* رقم التصريح */}
                      <TableCell className="font-medium align-top py-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-sm group-hover:text-primary transition-colors">
                            {loss.loss_number || '---'}
                          </span>
                          {!isSynced && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="w-fit text-[10px] bg-orange-50 text-orange-600 border-orange-200 px-1 gap-1 h-5">
                                    <RefreshCw className="h-2 w-2 animate-spin" />
                                    مزامنة
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>جاري المزامنة...</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {hasError && (
                            <Badge variant="destructive" className="w-fit text-[10px] px-1 h-5">
                              خطأ
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* التفاصيل (النوع والفئة) */}
                      <TableCell className="align-top py-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 font-medium text-foreground">
                            <div className={`p-1.5 rounded-md bg-muted group-hover:bg-primary/10 group-hover:text-primary transition-colors`}>
                              <TypeIcon className="h-4 w-4" />
                            </div>
                            <span>{getTypeLabel(loss.loss_type)}</span>
                          </div>
                          {loss.loss_category && (
                            <Badge
                              variant={getCategoryBadgeVariant(loss.loss_category) || 'outline'}
                              className="w-fit text-[10px] font-normal opacity-80"
                            >
                              {getCategoryLabel(loss.loss_category)}
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* الموقع والتاريخ */}
                      <TableCell className="align-top py-4 text-muted-foreground">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 text-sm">
                            <FileText className="h-3.5 w-3.5 opacity-70" />
                            <span>{new Date(loss.incident_date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                          </div>
                          {loss.location_description ? (
                            <div className="flex items-center gap-2 text-xs">
                              <MapPin className="h-3.5 w-3.5 opacity-70" />
                              <span className="truncate max-w-[150px]" title={loss.location_description}>
                                {loss.location_description}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs opacity-50 mr-5.5">-- لا يوجد موقع --</span>
                          )}
                        </div>
                      </TableCell>

                      {/* عدد العناصر */}
                      <TableCell className="text-center align-top py-4">
                        <div className="inline-flex items-center justify-center min-w-[2rem] h-8 px-2 rounded-full bg-slate-100 text-slate-700 font-medium text-sm">
                          {loss.total_items_count || loss.items_count || 0}
                        </div>
                      </TableCell>

                      {/* القيم المالية */}
                      <TableCell className="text-right align-top py-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-red-600 tabular-nums">
                            {formatCurrency(loss.total_cost_value)}
                          </span>
                          <span className="text-xs text-muted-foreground tabular-nums flex items-center justify-end gap-1">
                            بيــــع: {formatCurrency(loss.total_selling_value)}
                          </span>
                        </div>
                      </TableCell>

                      {/* الحالة */}
                      <TableCell className="text-center align-top py-4">
                        <div className="flex justify-center">
                          {getStatusBadge(loss.status)}
                        </div>
                      </TableCell>

                      {/* الإجراءات */}
                      <TableCell className="align-top py-4 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted">
                              <span className="sr-only">فتح القائمة</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[160px]">
                            <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => onView(loss)} className="cursor-pointer">
                              <Eye className="ml-2 h-4 w-4 text-muted-foreground" />
                              عرض التفاصيل
                            </DropdownMenuItem>

                            {loss.status !== 'rejected' && loss.status !== 'processed' && (
                              <DropdownMenuItem onClick={() => onEdit(loss)} className="cursor-pointer">
                                <Edit className="ml-2 h-4 w-4 text-muted-foreground" />
                                تعديل
                              </DropdownMenuItem>
                            )}

                            {(loss.status === 'pending' || loss.status === 'approved') && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => onAction(loss)} className="cursor-pointer text-blue-600 focus:text-blue-700 focus:bg-blue-50">
                                  <Package className="ml-2 h-4 w-4" />
                                  معالجة
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => onDelete(loss)} className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50">
                                  <Trash2 className="ml-2 h-4 w-4" />
                                  حذف
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {losses.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                <div className="bg-muted/50 p-4 rounded-full">
                  <AlertCircle className="h-10 w-10 text-muted-foreground/50" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg text-foreground">لا توجد تصاريح خسائر</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                    لم يتم العثور على أي تصاريح خسائر. يمكنك إضافة تصريح جديد للبدء.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LossTable;














































