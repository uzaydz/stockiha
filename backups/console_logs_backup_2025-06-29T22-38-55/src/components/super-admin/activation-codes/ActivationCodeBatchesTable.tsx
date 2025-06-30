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
  ChevronLeft, 
  ChevronRight, 
  Download, 
  EyeIcon, 
  MoreHorizontal, 
  RefreshCw,
  TagIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { ActivationCodeBatch } from '@/types/activation';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

interface Props {
  batches: ActivationCodeBatch[];
  total: number;
  pageSize: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onViewBatch: (batchId: string) => void;
  isLoading: boolean;
}

export default function ActivationCodeBatchesTable({
  batches,
  total,
  pageSize,
  currentPage,
  onPageChange,
  onRefresh,
  onViewBatch,
  isLoading
}: Props) {
  const { toast } = useToast();
  const [downloadingBatchId, setDownloadingBatchId] = useState<string | null>(null);
  
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
  
  // تنزيل أكواد الدفعة كملف CSV
  const handleDownloadBatchCodes = async (batchId: string) => {
    try {
      setDownloadingBatchId(batchId);
      
      // تحديد اسم الدفعة للاستخدام في اسم الملف
      const batch = batches.find(b => b.id === batchId);
      
      // جلب الأكواد من قاعدة البيانات
      const { data, error } = await supabase
        .from('activation_codes')
        .select('code, status, created_at')
        .eq('batch_id', batchId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        toast({
          title: "لا توجد أكواد",
          description: "لا توجد أكواد في هذه الدفعة",
          variant: "destructive"
        });
        return;
      }
      
      // تحويل البيانات إلى تنسيق CSV
      const headers = ['رقم', 'كود التفعيل', 'الحالة', 'تاريخ الإنشاء'];
      
      const csvContent = [
        headers.join(','),
        ...data.map((code, index) => [
          index + 1,
          code.code,
          code.status,
          format(new Date(code.created_at), 'yyyy-MM-dd HH:mm')
        ].join(','))
      ].join('\n');
      
      // إنشاء ملف للتنزيل
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      // تكوين اسم الملف
      const batchName = batch?.name.replace(/[^a-zA-Z0-9]/g, '_') || 'activation_codes';
      const date = format(new Date(), 'yyyy-MM-dd');
      const fileName = `${batchName}_${date}.csv`;
      
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "تم تنزيل الأكواد",
        description: `تم تنزيل ${data.length} كود بنجاح`
      });
    } catch (error: any) {
      toast({
        title: "خطأ في تنزيل الأكواد",
        description: error.message || "حدث خطأ أثناء تنزيل أكواد التفعيل",
        variant: "destructive"
      });
    } finally {
      setDownloadingBatchId(null);
    }
  };
  
  return (
    <Card>
      <CardContent className="p-0">
        <div className="relative">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">اسم الدفعة</TableHead>
                <TableHead>خطة الاشتراك</TableHead>
                <TableHead>عدد الأكواد</TableHead>
                <TableHead>مستخدم</TableHead>
                <TableHead>متاح</TableHead>
                <TableHead>منتهي</TableHead>
                <TableHead>ملغي</TableHead>
                <TableHead>تاريخ الإنشاء</TableHead>
                <TableHead className="text-left">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // عرض صفوف التحميل
                Array.from({ length: pageSize }).map((_, index) => (
                  <TableRow key={`loading-${index}`}>
                    <TableCell colSpan={9} className="h-14">
                      <div className="w-full h-4 bg-gray-200 animate-pulse rounded"></div>
                    </TableCell>
                  </TableRow>
                ))
              ) : batches.length > 0 ? (
                // عرض الدفعات
                batches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-medium">{batch.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-primary/50 text-primary">
                        <TagIcon className="ml-1 h-3 w-3" />
                        {batch.plan_name}
                      </Badge>
                    </TableCell>
                    <TableCell>{batch.total_codes}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-100">
                        {batch.used_codes}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
                        {batch.active_codes}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-100">
                        {batch.expired_codes}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-gray-100 text-gray-800 hover:bg-gray-100">
                        {batch.revoked_codes}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(batch.created_at), 'yyyy-MM-dd')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onViewBatch(batch.id)}>
                            <EyeIcon className="ml-2 h-4 w-4" />
                            عرض الأكواد
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDownloadBatchCodes(batch.id)}
                            disabled={downloadingBatchId === batch.id}
                          >
                            {downloadingBatchId === batch.id ? (
                              <>
                                <span className="ml-2 animate-spin">&#9696;</span>
                                جاري التنزيل...
                              </>
                            ) : (
                              <>
                                <Download className="ml-2 h-4 w-4" />
                                تنزيل CSV
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    لا توجد دفعات أكواد تفعيل
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
                {total} دفعة | صفحة {currentPage} من {totalPages}
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
  );
}
