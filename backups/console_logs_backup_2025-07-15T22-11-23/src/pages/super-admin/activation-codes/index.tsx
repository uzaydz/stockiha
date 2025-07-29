import React, { useEffect, useState } from 'react';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { KeyRound, ListFilter } from 'lucide-react';
import { ActivationService } from '@/lib/activation-service';
import { ActivationCode, ActivationCodeBatch, ActivationCodeStatus } from '@/types/activation';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import CreateActivationCodeDialog from '@/components/super-admin/activation-codes/CreateActivationCodeDialog';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const PAGE_SIZE = 10;

// دالة مساعدة لتنسيق التاريخ بشكل صحيح
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return format(date, 'yyyy-MM-dd', { locale: ar });
};

export default function ActivationCodesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('batches');
  
  // حالة دفعات الأكواد
  const [batches, setBatches] = useState<ActivationCodeBatch[]>([]);
  const [batchesTotal, setBatchesTotal] = useState(0);
  const [batchesCurrentPage, setBatchesCurrentPage] = useState(1);
  const [loadingBatches, setLoadingBatches] = useState(false);
  
  // حالة الأكواد
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [codesTotal, setCodesTotal] = useState(0);
  const [codesCurrentPage, setCodesCurrentPage] = useState(1);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | undefined>(undefined);
  
  // حالة الفلترة
  const [statusFilter, setStatusFilter] = useState<ActivationCodeStatus | undefined>(undefined);
  
  // جلب دفعات الأكواد
  const fetchBatches = async () => {
    try {
      setLoadingBatches(true);
      
      const result = await ActivationService.getActivationCodeBatches({
        limit: PAGE_SIZE,
        offset: (batchesCurrentPage - 1) * PAGE_SIZE
      });
      
      setBatches(result.batches);
      setBatchesTotal(result.total);
    } catch (error: any) {
      toast({
        title: "خطأ في جلب دفعات الأكواد",
        description: error.message || "حدث خطأ أثناء جلب دفعات أكواد التفعيل",
        variant: "destructive"
      });
    } finally {
      setLoadingBatches(false);
    }
  };
  
  // جلب الأكواد
  const fetchCodes = async () => {
    try {
      setLoadingCodes(true);
      
      const result = await ActivationService.getActivationCodes({
        batchId: selectedBatchId,
        status: statusFilter,
        limit: PAGE_SIZE,
        offset: (codesCurrentPage - 1) * PAGE_SIZE
      });
      
      setCodes(result.codes);
      setCodesTotal(result.total);
    } catch (error: any) {
      toast({
        title: "خطأ في جلب الأكواد",
        description: error.message || "حدث خطأ أثناء جلب أكواد التفعيل",
        variant: "destructive"
      });
    } finally {
      setLoadingCodes(false);
    }
  };
  
  // جلب البيانات عند تحميل الصفحة
  useEffect(() => {
    if (activeTab === 'batches') {
      fetchBatches();
    } else {
      fetchCodes();
    }
  }, [activeTab, batchesCurrentPage, codesCurrentPage, selectedBatchId, statusFilter]);
  
  // معالجة الانتقال إلى عرض دفعة معينة
  const handleViewBatch = (batchId: string) => {
    setSelectedBatchId(batchId);
    setActiveTab('codes');
    setCodesCurrentPage(1);
  };
  
  // معالجة تغيير حالة تصفية الأكواد
  const handleStatusFilterChange = (status?: ActivationCodeStatus) => {
    setStatusFilter(status);
    setCodesCurrentPage(1);
  };
  
  // معالجة إنشاء دفعة جديدة
  const handleBatchCreated = (batchId: string) => {
    fetchBatches();
    
    // الانتقال إلى تفاصيل الدفعة الجديدة
    setSelectedBatchId(batchId);
    setActiveTab('codes');
    setCodesCurrentPage(1);
  };
  
  return (
    <SuperAdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">إدارة أكواد التفعيل</h1>
        <p className="text-muted-foreground">إنشاء وإدارة أكواد تفعيل الاشتراكات</p>
      </div>
      
      <div className="space-y-4">
        <Tabs
          defaultValue="batches" 
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="batches">دفعات الأكواد</TabsTrigger>
              <TabsTrigger value="codes" disabled={loadingCodes}>
                الأكواد الفردية {selectedBatchId && '(دفعة محددة)'}
              </TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-2">
              {activeTab === 'codes' && selectedBatchId && (
                <Button 
                  variant="outline"
                  onClick={() => {
                    setSelectedBatchId(undefined);
                    fetchCodes();
                  }}
                >
                  عرض كافة الأكواد
                </Button>
              )}
              
              {activeTab === 'codes' && (
                <Button
                  variant="outline"
                  onClick={() => {
                    // عرض مرشحات الحالة
                    const nextStatus = !statusFilter
                      ? ActivationCodeStatus.ACTIVE
                      : statusFilter === ActivationCodeStatus.ACTIVE
                      ? ActivationCodeStatus.USED
                      : statusFilter === ActivationCodeStatus.USED
                      ? ActivationCodeStatus.EXPIRED
                      : statusFilter === ActivationCodeStatus.EXPIRED
                      ? ActivationCodeStatus.REVOKED
                      : undefined;
                    
                    handleStatusFilterChange(nextStatus);
                  }}
                >
                  <ListFilter className="ml-2 h-4 w-4" />
                  {!statusFilter
                    ? 'فلترة حسب الحالة'
                    : statusFilter === ActivationCodeStatus.ACTIVE
                    ? 'أكواد نشطة'
                    : statusFilter === ActivationCodeStatus.USED
                    ? 'أكواد مستخدمة'
                    : statusFilter === ActivationCodeStatus.EXPIRED
                    ? 'أكواد منتهية'
                    : 'أكواد ملغاة'
                  }
                </Button>
              )}
              
              <CreateActivationCodeDialog onSuccess={handleBatchCreated} />
            </div>
          </div>
          
          <TabsContent value="batches" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>دفعات أكواد التفعيل</CardTitle>
                <CardDescription>عرض جميع دفعات أكواد التفعيل المنشأة</CardDescription>
              </CardHeader>
              <CardContent>
                {/* هنا سيتم عرض جدول دفعات الأكواد */}
                {loadingBatches ? (
                  <div className="text-center py-4">جاري تحميل البيانات...</div>
                ) : batches.length === 0 ? (
                  <div className="text-center py-4">لا توجد دفعات أكواد حتى الآن</div>
                ) : (
                  <div className="border rounded-md">
                    <table className="w-full table-auto">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 text-right">الرقم التعريفي</th>
                          <th className="px-4 py-3 text-right">الاسم</th>
                          <th className="px-4 py-3 text-right">عدد الأكواد</th>
                          <th className="px-4 py-3 text-right">تاريخ الإنشاء</th>
                          <th className="px-4 py-3 text-right">خيارات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batches.map((batch) => (
                          <tr key={batch.id} className="border-t">
                            <td className="px-4 py-3">{batch.id}</td>
                            <td className="px-4 py-3">{batch.name}</td>
                            <td className="px-4 py-3">{batch.count || 0}</td>
                            <td className="px-4 py-3">{formatDate(batch.created_at)}</td>
                            <td className="px-4 py-3">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleViewBatch(batch.id)}
                              >
                                عرض الأكواد
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="codes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>أكواد التفعيل</CardTitle>
                <CardDescription>
                  {selectedBatchId 
                    ? "عرض الأكواد الخاصة بالدفعة المحددة" 
                    : "عرض جميع أكواد التفعيل"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* هنا سيتم عرض جدول الأكواد */}
                {loadingCodes ? (
                  <div className="text-center py-4">جاري تحميل البيانات...</div>
                ) : codes.length === 0 ? (
                  <div className="text-center py-4">لا توجد أكواد تفعيل متاحة</div>
                ) : (
                  <div className="border rounded-md">
                    <table className="w-full table-auto">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 text-right">كود التفعيل</th>
                          <th className="px-4 py-3 text-right">الحالة</th>
                          <th className="px-4 py-3 text-right">تاريخ الإنشاء</th>
                          <th className="px-4 py-3 text-right">تاريخ الاستخدام</th>
                          <th className="px-4 py-3 text-right">المنظمة المستخدمة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {codes.map((code) => (
                          <tr key={code.id} className="border-t">
                            <td className="px-4 py-3 font-mono">{code.code}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                code.status === ActivationCodeStatus.ACTIVE
                                  ? "bg-green-100 text-green-700"
                                  : code.status === ActivationCodeStatus.USED
                                  ? "bg-blue-100 text-blue-700"
                                  : code.status === ActivationCodeStatus.EXPIRED
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                              }`}>
                                {code.status === ActivationCodeStatus.ACTIVE
                                  ? "نشط"
                                  : code.status === ActivationCodeStatus.USED
                                  ? "مستخدم"
                                  : code.status === ActivationCodeStatus.EXPIRED
                                  ? "منتهي"
                                  : "ملغي"
                                }
                              </span>
                            </td>
                            <td className="px-4 py-3">{formatDate(code.created_at)}</td>
                            <td className="px-4 py-3">
                              {code.used_at ? formatDate(code.used_at) : "-"}
                            </td>
                            <td className="px-4 py-3">{code.organization_id ? "مستخدم" : "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* معلومات حول أكواد التفعيل */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">معلومات حول أكواد التفعيل</CardTitle>
            <CardDescription>
              أكواد التفعيل هي أكواد فريدة يمكن استخدامها لتفعيل اشتراك في النظام
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">خصائص أكواد التفعيل:</h3>
                <ul className="list-disc list-inside space-y-1 pr-4">
                  <li>كود فريد مكون من 16 حرف (XXXX-XXXX-XXXX-XXXX)</li>
                  <li>يستخدم مرة واحدة فقط لتفعيل اشتراك</li>
                  <li>يمكن ربطه بخطة اشتراك محددة</li>
                  <li>يمكن تحديد تاريخ انتهاء صلاحية للكود</li>
                  <li>يمكن تتبع حالة الكود (نشط، مستخدم، منتهي، ملغي)</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-medium">إدارة الأكواد:</h3>
                <ul className="list-disc list-inside space-y-1 pr-4">
                  <li>يمكن إنشاء دفعات من الأكواد دفعة واحدة</li>
                  <li>يمكن تصدير الأكواد كملف CSV</li>
                  <li>يمكن تتبع الأكواد المستخدمة والمنظمات المرتبطة بها</li>
                  <li>يمكن إلغاء الأكواد أو إعادة تنشيطها</li>
                </ul>
              </div>
            </div>
            
            <Separator />
            
            <div className="text-sm text-muted-foreground">
              لاحظ أن أكواد التفعيل تستخدم لمرة واحدة فقط ولا يمكن إعادة استخدامها. يجب المحافظة على سرية الأكواد ومشاركتها فقط مع العملاء المستهدفين.
            </div>
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
}
