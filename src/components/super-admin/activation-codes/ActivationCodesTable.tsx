import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { 
  Ban,
  CheckCircle2,
  ChevronLeft, 
  ChevronRight, 
  Copy, 
  MoreHorizontal, 
  RefreshCw,
  X,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  ActivationCode, 
  ActivationCodeStatus, 
  UpdateActivationCodeDto 
} from '@/types/activation';
import { ActivationService } from '@/lib/activation-service';
import { useToast } from '@/components/ui/use-toast';

interface Props {
  codes: ActivationCode[];
  total: number;
  pageSize: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  isLoading: boolean;
  batchId?: string;
  planId?: string;
}

export default function ActivationCodesTable({
  codes,
  total,
  pageSize,
  currentPage,
  onPageChange,
  onRefresh,
  isLoading,
  batchId,
  planId
}: Props) {
  const { toast } = useToast();
  const [selectedCode, setSelectedCode] = useState<ActivationCode | null>(null);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // حساب إجمالي عدد الصفحات
  const totalPages = Math.ceil(total / pageSize);
  
  // إنشاء نطاق الصفحات التي سيتم عرضها في الصفحات
  const getPageRange = () => {
    const range: number[] = [];
    const maxVisiblePages = 5;
    const startPage = Math.max(1, Math.min(
      currentPage - Math.floor(maxVisiblePages / 2),
      totalPages - maxVisiblePages + 1
    ));
    const endPage = Math.min(startPage + maxVisiblePages - 1, totalPages);
    
    for (let i = startPage; i <= endPage; i++) {
      range.push(i);
    }
    
    return range;
  };
  
  // نسخ كود التفعيل
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
      .then(() => {
        toast({
          title: "تم نسخ الكود",
          description: "تم نسخ كود التفعيل إلى الحافظة",
        });
      })
      .catch((error) => {
        console.error('Error copying code:', error);
        toast({
          title: "خطأ في نسخ الكود",
          description: "تعذر نسخ الكود إلى الحافظة",
          variant: "destructive",
        });
      });
  };
  
  // تغيير حالة كود التفعيل
  const handleStatusChange = async (codeId: string, status: ActivationCodeStatus) => {
    try {
      setLoading(true);
      
      const data: UpdateActivationCodeDto = {
        status
      };
      
      await ActivationService.updateActivationCode(codeId, data);
      
      toast({
        title: "تم تحديث حالة الكود",
        description: `تم تغيير حالة كود التفعيل بنجاح`,
      });
      
      // تحديث قائمة الأكواد
      onRefresh();
    } catch (error: any) {
      console.error('Error updating code status:', error);
      toast({
        title: "خطأ في تحديث حالة الكود",
        description: error.message || "حدث خطأ أثناء تحديث حالة كود التفعيل",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setShowRevokeDialog(false);
      setSelectedCode(null);
    }
  };
  
  // عرض حالة الكود في شارة ملونة
  const renderStatusBadge = (status: ActivationCodeStatus) => {
    switch (status) {
      case ActivationCodeStatus.ACTIVE:
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle2 className="ml-1 h-3 w-3" />
            نشط
          </Badge>
        );
      case ActivationCodeStatus.USED:
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-100">
            <CheckCircle2 className="ml-1 h-3 w-3" />
            مستخدم
          </Badge>
        );
      case ActivationCodeStatus.EXPIRED:
        return (
          <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-100">
            <Ban className="ml-1 h-3 w-3" />
            منتهي
          </Badge>
        );
      case ActivationCodeStatus.REVOKED:
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-800 hover:bg-gray-100">
            <XCircle className="ml-1 h-3 w-3" />
            ملغي
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            {status}
          </Badge>
        );
    }
  };
  
  return (
    <>
      <Card>
        <CardContent className="p-0">
          <div className="relative">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">كود التفعيل</TableHead>
                  <TableHead>خطة الاشتراك</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>المنظمة</TableHead>
                  <TableHead>تاريخ الاستخدام</TableHead>
                  <TableHead>تاريخ الانتهاء</TableHead>
                  <TableHead>تاريخ الإنشاء</TableHead>
                  <TableHead className="text-left">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  // عرض صفوف التحميل
                  Array.from({ length: pageSize }).map((_, index) => (
                    <TableRow key={`loading-${index}`}>
                      <TableCell colSpan={8} className="h-14">
                        <div className="w-full h-4 bg-gray-200 animate-pulse rounded"></div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : codes.length > 0 ? (
                  // عرض الأكواد
                  codes.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell className="font-mono">
                        <div className="flex items-center">
                          <span>{code.code}</span>
                          <Button 
                            variant="ghost" 
                            className="h-6 w-6 p-0 ml-2"
                            onClick={() => handleCopyCode(code.code)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {code.subscription_plans?.name || '-'}
                      </TableCell>
                      <TableCell>
                        {renderStatusBadge(code.status)}
                      </TableCell>
                      <TableCell>
                        {code.organizations ? (
                          <Badge variant="outline" className="border-primary/50 text-primary">
                            {code.organizations.name}
                          </Badge>
                        ) : ('-')}
                      </TableCell>
                      <TableCell>
                        {code.used_at ? format(new Date(code.used_at), 'yyyy-MM-dd') : '-'}
                      </TableCell>
                      <TableCell>
                        {code.expires_at ? format(new Date(code.expires_at), 'yyyy-MM-dd') : '-'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(code.created_at), 'yyyy-MM-dd')}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleCopyCode(code.code)}>
                              <Copy className="ml-2 h-4 w-4" />
                              نسخ الكود
                            </DropdownMenuItem>
                            
                            {code.status === ActivationCodeStatus.ACTIVE && (
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedCode(code);
                                  setShowRevokeDialog(true);
                                }}
                                disabled={loading}
                              >
                                <Ban className="ml-2 h-4 w-4" />
                                إلغاء الكود
                              </DropdownMenuItem>
                            )}
                            
                            {code.status === ActivationCodeStatus.REVOKED && (
                              <DropdownMenuItem 
                                onClick={() => handleStatusChange(code.id, ActivationCodeStatus.ACTIVE)}
                                disabled={loading}
                              >
                                <CheckCircle2 className="ml-2 h-4 w-4" />
                                تنشيط الكود
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      لا توجد أكواد تفعيل
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            
            {/* التحكم في الصفحات */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 bg-secondary/15">
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1 || isLoading}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  
                  {getPageRange().map((page) => (
                    <Button
                      key={page}
                      variant={page === currentPage ? "default" : "outline"}
                      size="sm"
                      className="w-8"
                      onClick={() => onPageChange(page)}
                      disabled={isLoading}
                    >
                      {page}
                    </Button>
                  ))}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || isLoading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  {total} كود | صفحة {currentPage} من {totalPages}
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* مربع حوار تأكيد إلغاء الكود */}
      <AlertDialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد إلغاء كود التفعيل</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من رغبتك في إلغاء كود التفعيل؟ لن يمكن استخدام هذا الكود بعد الإلغاء.
              {selectedCode && (
                <div className="mt-2 p-2 bg-muted rounded font-mono text-center">
                  {selectedCode.code}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              disabled={loading}
              onClick={() => {
                if (selectedCode) {
                  handleStatusChange(selectedCode.id, ActivationCodeStatus.REVOKED);
                }
              }}
            >
              {loading ? (
                <>
                  <span className="animate-spin ml-2">&#9696;</span>
                  جاري الإلغاء...
                </>
              ) : (
                <>
                  <X className="ml-2 h-4 w-4" />
                  نعم، إلغاء الكود
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 