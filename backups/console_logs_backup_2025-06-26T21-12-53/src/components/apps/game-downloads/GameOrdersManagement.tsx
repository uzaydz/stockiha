import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, Edit, CheckCircle, XCircle, Clock, Package, Truck, Download, FileText, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/context/UserContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface GameOrder {
  id: string;
  tracking_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  game_id: string;
  device_type?: string;
  device_specs?: string;
  notes?: string;
  status: string;
  status_history: any[];
  assigned_to?: string;
  processing_started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  price: number;
  payment_status: string;
  payment_method?: string;
  amount_paid: number;
  created_at: string;
  updated_at: string;
  game?: {
    name: string;
    platform: string;
  };
  assigned_user?: {
    name: string;
  };
}

const statusOptions = [
  { value: 'pending', label: 'قيد الانتظار', color: 'bg-yellow-500' },
  { value: 'processing', label: 'قيد المعالجة', color: 'bg-blue-500' },
  { value: 'ready', label: 'جاهز للتسليم', color: 'bg-purple-500' },
  { value: 'delivered', label: 'تم التسليم', color: 'bg-green-500' },
  { value: 'cancelled', label: 'ملغي', color: 'bg-red-500' },
];

const paymentStatusOptions = [
  { value: 'unpaid', label: 'غير مدفوع', color: 'text-red-600' },
  { value: 'partial', label: 'مدفوع جزئياً', color: 'text-yellow-600' },
  { value: 'paid', label: 'مدفوع', color: 'text-green-600' },
];

export default function GameOrdersManagement() {
  const { organizationId, userId } = useUser();
  const [orders, setOrders] = useState<GameOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<GameOrder | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (organizationId) {
      fetchOrders();
    }
  }, [organizationId]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('game_download_orders')
        .select(`
          *,
          game:games_catalog(name, platform),
          assigned_user:users!assigned_to(name)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setOrders(data || []);
    } catch (error: any) {
      toast.error('فشل في تحميل الطلبات');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedOrder || !newStatus || !userId) return;

    try {
      setUpdatingStatus(true);

      const { error } = await supabase.rpc('update_game_order_status', {
        order_id: selectedOrder.id,
        new_status: newStatus,
        user_id: userId,
        notes: statusNotes || null,
      });

      if (error) throw error;

      toast.success('تم تحديث حالة الطلب بنجاح');
      setShowStatusDialog(false);
      setSelectedOrder(null);
      setNewStatus('');
      setStatusNotes('');
      fetchOrders();
    } catch (error: any) {
      toast.error('فشل في تحديث حالة الطلب');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const printReceipt = (receiptType: 'admin' | 'customer') => {
    if (!selectedOrder) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // استخراج تفاصيل الألعاب
    let gamesDetails = '';
    let customerNotes = '';
    let totalItems = 1;
    let gamesList = [selectedOrder.game?.name || 'غير محدد'];

    if (selectedOrder.notes && selectedOrder.notes.includes('📋 تفاصيل الطلب:')) {
      const gamesSection = selectedOrder.notes.split('📋 تفاصيل الطلب:')[1]?.split('📊 الملخص:')[0];
      const summarySection = selectedOrder.notes.split('📊 الملخص:')[1];
      customerNotes = selectedOrder.notes.split('📋 تفاصيل الطلب:')[0].trim();

      if (gamesSection) {
        const gameLines = gamesSection.split('\n').filter(line => line.trim().startsWith('•'));
        gamesList = gameLines.map(line => line.replace('•', '').trim());
        totalItems = gameLines.length;
        
        gamesDetails = gameLines.map((line, index) => `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${index + 1}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${line.replace('•', '').split('(')[0].trim()}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${line.match(/الكمية: (\d+)/)?.[1] || '1'}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: left;">${line.match(/السعر: ([\d,]+)/)?.[1] || '0'} دج</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: left;">${line.match(/المجموع: ([\d,]+)/)?.[1] || '0'} دج</td>
          </tr>
        `).join('');
      }
    } else {
      gamesDetails = `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">1</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${selectedOrder.game?.name || 'غير محدد'}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">1</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: left;">${selectedOrder.price} دج</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: left;">${selectedOrder.price} دج</td>
        </tr>
      `;
    }

    const isAdminReceipt = receiptType === 'admin';
    const receiptTitle = isAdminReceipt ? 'وصل إداري - طلب تحميل ألعاب' : 'وصل العميل - طلب تحميل ألعاب';
    
    const adminOnlySection = isAdminReceipt ? `
      <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 8px;">
        <h3 style="color: #dc3545; margin-bottom: 10px;">معلومات إدارية</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div><strong>حالة الدفع:</strong> ${paymentStatusOptions.find(opt => opt.value === selectedOrder.payment_status)?.label || selectedOrder.payment_status}</div>
          <div><strong>المبلغ المدفوع:</strong> ${selectedOrder.amount_paid} دج</div>
          <div><strong>المسؤول:</strong> ${selectedOrder.assigned_user?.name || 'غير محدد'}</div>
          <div><strong>تاريخ الإنشاء:</strong> ${format(new Date(selectedOrder.created_at), 'dd/MM/yyyy hh:mm a', { locale: ar })}</div>
        </div>
        ${selectedOrder.device_type || selectedOrder.device_specs ? `
          <div style="margin-top: 15px;">
            <h4 style="margin-bottom: 8px;">معلومات الجهاز:</h4>
            ${selectedOrder.device_type ? `<div><strong>نوع الجهاز:</strong> ${selectedOrder.device_type}</div>` : ''}
            ${selectedOrder.device_specs ? `<div><strong>المواصفات:</strong> ${selectedOrder.device_specs}</div>` : ''}
          </div>
        ` : ''}
        ${customerNotes ? `
          <div style="margin-top: 15px;">
            <h4 style="margin-bottom: 8px;">ملاحظات العميل:</h4>
            <div style="background: white; padding: 10px; border-radius: 4px; white-space: pre-wrap;">${customerNotes}</div>
          </div>
        ` : ''}
      </div>
    ` : '';

    const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>${receiptTitle}</title>
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          margin: 0; 
          padding: 20px; 
          background: white;
          color: #333;
        }
        .receipt { 
          max-width: 800px; 
          margin: 0 auto; 
          background: white; 
          border: 2px solid #ddd;
          border-radius: 10px;
          overflow: hidden;
        }
        .header { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
          color: white; 
          padding: 20px; 
          text-align: center; 
        }
        .content { padding: 20px; }
        .info-grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 15px; 
          margin-bottom: 20px; 
        }
        .info-item { 
          padding: 10px; 
          background: #f8f9fa; 
          border-radius: 5px; 
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin: 20px 0; 
          background: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        th { 
          background: #343a40; 
          color: white; 
          padding: 12px; 
          text-align: right; 
        }
        .total-row { 
          background: #e9ecef; 
          font-weight: bold; 
        }
        .footer { 
          margin-top: 30px; 
          padding-top: 20px; 
          border-top: 2px solid #eee; 
          text-align: center; 
          color: #666; 
        }
        @media print {
          body { margin: 0; padding: 10px; }
          .receipt { border: none; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">${receiptTitle}</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">رقم التتبع: ${selectedOrder.tracking_number}</p>
        </div>
        
        <div class="content">
          <div class="info-grid">
            <div class="info-item">
              <strong>اسم العميل:</strong><br>
              ${selectedOrder.customer_name}
            </div>
            <div class="info-item">
              <strong>رقم الهاتف:</strong><br>
              ${selectedOrder.customer_phone}
            </div>
            <div class="info-item">
              <strong>حالة الطلب:</strong><br>
              ${statusOptions.find(opt => opt.value === selectedOrder.status)?.label || selectedOrder.status}
            </div>
            <div class="info-item">
              <strong>التاريخ:</strong><br>
              ${format(new Date(selectedOrder.created_at), 'dd/MM/yyyy', { locale: ar })}
            </div>
          </div>

          <h3 style="color: #495057; border-bottom: 2px solid #dee2e6; padding-bottom: 8px;">تفاصيل الطلب</h3>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>اسم اللعبة</th>
                <th style="text-align: center;">الكمية</th>
                <th style="text-align: left;">السعر</th>
                <th style="text-align: left;">المجموع</th>
              </tr>
            </thead>
            <tbody>
              ${gamesDetails}
              <tr class="total-row">
                <td colspan="4" style="padding: 12px; text-align: center; font-weight: bold;">الإجمالي</td>
                <td style="padding: 12px; text-align: left; font-weight: bold; font-size: 18px;">${selectedOrder.price} دج</td>
              </tr>
            </tbody>
          </table>

          ${adminOnlySection}

          <div class="footer">
            <p style="margin: 0;">شكراً لك على اختيار خدماتنا</p>
            <p style="margin: 5px 0 0 0; font-size: 12px;">تم الطباعة في: ${format(new Date(), 'dd/MM/yyyy hh:mm a', { locale: ar })}</p>
          </div>
        </div>
      </div>

      <div class="no-print" style="text-align: center; margin-top: 20px;">
        <button onclick="window.print()" style="
          background: #007bff; 
          color: white; 
          border: none; 
          padding: 12px 24px; 
          border-radius: 5px; 
          cursor: pointer; 
          font-size: 16px;
          margin-left: 10px;
        ">طباعة</button>
        <button onclick="window.close()" style="
          background: #6c757d; 
          color: white; 
          border: none; 
          padding: 12px 24px; 
          border-radius: 5px; 
          cursor: pointer; 
          font-size: 16px;
        ">إغلاق</button>
      </div>
    </body>
    </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const getStatusBadge = (status: string) => {
    const statusOption = statusOptions.find(opt => opt.value === status);
    if (!statusOption) return null;

    return (
      <Badge className={`${statusOption.color} text-white`}>
        {statusOption.label}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const option = paymentStatusOptions.find(opt => opt.value === status);
    if (!option) return null;

    return (
      <span className={`font-medium ${option.color}`}>
        {option.label}
      </span>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'processing':
        return <Package className="h-4 w-4" />;
      case 'ready':
        return <CheckCircle className="h-4 w-4" />;
      case 'delivered':
        return <Truck className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const filteredOrders = orders.filter(order => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        order.tracking_number.toLowerCase().includes(searchLower) ||
        order.customer_name.toLowerCase().includes(searchLower) ||
        order.customer_phone.includes(searchTerm) ||
        order.game?.name.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">إدارة طلبات تحميل الألعاب</h2>
            <p className="text-muted-foreground">عرض وإدارة جميع طلبات تحميل الألعاب</p>
          </div>
          <Button onClick={fetchOrders} variant="outline">
            <Download className="ml-2 h-4 w-4" />
            تحديث
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>البحث والتصفية</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث برقم التتبع، اسم العميل، رقم الهاتف، أو اسم اللعبة..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="حالة الطلب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>قائمة الطلبات</CardTitle>
            <CardDescription>عدد الطلبات: {filteredOrders.length}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم التتبع</TableHead>
                    <TableHead>العميل</TableHead>
                    <TableHead>اللعبة/الألعاب</TableHead>
                    <TableHead>المنصة</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الدفع</TableHead>
                    <TableHead>المسؤول</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.tracking_number}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.customer_name}</div>
                          <div className="text-sm text-muted-foreground">{order.customer_phone}</div>
                          {order.customer_email && (
                            <div className="text-sm text-muted-foreground">{order.customer_email}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          // استخراج قائمة الألعاب من الملاحظات
                          if (order.notes && order.notes.includes('📋 تفاصيل الطلب:')) {
                            const gamesSection = order.notes.split('📋 تفاصيل الطلب:')[1]?.split('📊 الملخص:')[0];
                            if (gamesSection) {
                              const gameLines = gamesSection.split('\n').filter(line => line.trim().startsWith('•'));
                              if (gameLines.length > 1) {
                                return (
                                  <div className="space-y-1">
                                    <div className="font-medium text-sm">طلب متعدد الألعاب:</div>
                                    {gameLines.slice(0, 3).map((line, index) => {
                                      const gameName = line.split('(')[0].replace('•', '').trim();
                                      return (
                                        <div key={index} className="text-xs text-muted-foreground">
                                          • {gameName}
                                        </div>
                                      );
                                    })}
                                    {gameLines.length > 3 && (
                                      <div className="text-xs text-muted-foreground">
                                        و {gameLines.length - 3} ألعاب أخرى...
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                            }
                          }
                          return order.game?.name || 'غير محدد';
                        })()}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          // إذا كان طلب متعدد الألعاب، أظهر "متنوع"
                          if (order.notes && order.notes.includes('📋 تفاصيل الطلب:')) {
                            const gamesSection = order.notes.split('📋 تفاصيل الطلب:')[1]?.split('📊 الملخص:')[0];
                            if (gamesSection) {
                              const gameLines = gamesSection.split('\n').filter(line => line.trim().startsWith('•'));
                              if (gameLines.length > 1) {
                                return <span className="text-muted-foreground">متنوع</span>;
                              }
                            }
                          }
                          return order.game?.platform || 'غير محدد';
                        })()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(order.status)}
                          {getStatusBadge(order.status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          {getPaymentStatusBadge(order.payment_status)}
                          <div className="text-sm text-muted-foreground">
                            {order.amount_paid} / {order.price} دج
                          </div>
                          {(() => {
                            // إذا كان طلب متعدد الألعاب، أظهر عدد الألعاب
                            if (order.notes && order.notes.includes('📋 تفاصيل الطلب:')) {
                              const gamesSection = order.notes.split('📋 تفاصيل الطلب:')[1]?.split('📊 الملخص:')[0];
                              if (gamesSection) {
                                const gameLines = gamesSection.split('\n').filter(line => line.trim().startsWith('•'));
                                if (gameLines.length > 1) {
                                  return (
                                    <div className="text-xs text-blue-600 font-medium">
                                      {gameLines.length} ألعاب
                                    </div>
                                  );
                                }
                              }
                            }
                            return null;
                          })()}
                        </div>
                      </TableCell>
                      <TableCell>{order.assigned_user?.name || 'غير محدد'}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(order.created_at), 'dd MMM yyyy', { locale: ar })}
                          <br />
                          {format(new Date(order.created_at), 'hh:mm a', { locale: ar })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowDetailsDialog(true);
                            }}
                            title="تفاصيل الطلب"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowPrintDialog(true);
                            }}
                            title="طباعة الوصل"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedOrder(order);
                              setNewStatus(order.status);
                              setShowStatusDialog(true);
                            }}
                            title="تحديث الحالة"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredOrders.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد طلبات مطابقة للبحث
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تحديث حالة الطلب</DialogTitle>
            <DialogDescription>
              طلب رقم: {selectedOrder?.tracking_number}
              <br />
              العميل: {selectedOrder?.customer_name} - {selectedOrder?.customer_phone}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* عرض تفاصيل الألعاب */}
            {selectedOrder && (
              <div className="space-y-2">
                <Label>تفاصيل الطلب</Label>
                <div className="border rounded-lg p-3 bg-muted/30">
                  {(() => {
                    // استخراج تفاصيل الألعاب من الملاحظات
                    if (selectedOrder.notes && selectedOrder.notes.includes('📋 تفاصيل الطلب:')) {
                      const gamesSection = selectedOrder.notes.split('📋 تفاصيل الطلب:')[1]?.split('📊 الملخص:')[0];
                      const summarySection = selectedOrder.notes.split('📊 الملخص:')[1];
                      
                      if (gamesSection) {
                        const gameLines = gamesSection.split('\n').filter(line => line.trim().startsWith('•'));
                        
                        return (
                          <div className="space-y-2">
                            <div className="font-medium text-sm">الألعاب المطلوبة:</div>
                            {gameLines.map((line, index) => (
                              <div key={index} className="text-sm text-muted-foreground">
                                {line.trim()}
                              </div>
                            ))}
                            {summarySection && (
                              <div className="mt-3 pt-2 border-t">
                                <div className="font-medium text-sm mb-1">الملخص:</div>
                                {summarySection.split('\n').filter(line => line.trim().startsWith('•')).map((line, index) => (
                                  <div key={index} className="text-sm text-muted-foreground">
                                    {line.trim()}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      }
                    }
                    
                    // إذا لم تكن هناك تفاصيل متعددة، أظهر اللعبة الواحدة
                    return (
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="font-medium">اللعبة:</span> {selectedOrder.game?.name || 'غير محدد'}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">المنصة:</span> {selectedOrder.game?.platform || 'غير محدد'}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">السعر:</span> {selectedOrder.price} دج
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
            
            {/* عرض ملاحظات العميل المخصصة */}
            {selectedOrder && selectedOrder.notes && (
              <div className="space-y-2">
                <Label>ملاحظات العميل</Label>
                <div className="border rounded-lg p-3 bg-muted/30">
                  {(() => {
                    // استخراج ملاحظات العميل (النص قبل تفاصيل الطلب)
                    if (selectedOrder.notes.includes('📋 تفاصيل الطلب:')) {
                      const customerNotes = selectedOrder.notes.split('📋 تفاصيل الطلب:')[0].trim();
                      if (customerNotes) {
                        return (
                          <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {customerNotes}
                          </div>
                        );
                      } else {
                        return (
                          <div className="text-sm text-muted-foreground italic">
                            لا توجد ملاحظات من العميل
                          </div>
                        );
                      }
                    } else {
                      // إذا لم تكن هناك تفاصيل منظمة، أظهر الملاحظات كما هي
                      return (
                        <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {selectedOrder.notes}
                        </div>
                      );
                    }
                  })()}
                </div>
                             </div>
             )}
             
             {/* عرض معلومات الجهاز */}
             {selectedOrder && (selectedOrder.device_type || selectedOrder.device_specs) && (
               <div className="space-y-2">
                 <Label>معلومات الجهاز</Label>
                 <div className="border rounded-lg p-3 bg-muted/30">
                   <div className="space-y-2">
                     {selectedOrder.device_type && (
                       <div className="text-sm">
                         <span className="font-medium">نوع الجهاز:</span> {selectedOrder.device_type}
                       </div>
                     )}
                     {selectedOrder.device_specs && (
                       <div className="text-sm">
                         <span className="font-medium">مواصفات الجهاز:</span>
                         <div className="mt-1 text-muted-foreground whitespace-pre-wrap">
                           {selectedOrder.device_specs}
                         </div>
                       </div>
                     )}
                   </div>
                 </div>
               </div>
             )}
              
             <div className="space-y-2">
               <Label>الحالة الجديدة</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الحالة" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>ملاحظات (اختياري)</Label>
              <Textarea
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                placeholder="أضف ملاحظات حول تحديث الحالة..."
                rows={3}
              />
            </div>

            {selectedOrder && selectedOrder.status_history.length > 0 && (
              <div className="space-y-2">
                <Label>سجل الحالات</Label>
                <div className="max-h-40 overflow-y-auto space-y-2 border rounded-lg p-3">
                  {selectedOrder.status_history.map((history: any, index: number) => (
                    <div key={index} className="text-sm">
                      <div className="flex justify-between">
                        <span>
                          {statusOptions.find(opt => opt.value === history.from_status)?.label} → 
                          {' '}{statusOptions.find(opt => opt.value === history.to_status)?.label}
                        </span>
                        <span className="text-muted-foreground">
                          {format(new Date(history.changed_at), 'dd/MM/yyyy hh:mm a', { locale: ar })}
                        </span>
                      </div>
                      {history.notes && (
                        <div className="text-muted-foreground mt-1">{history.notes}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowStatusDialog(false);
                setSelectedOrder(null);
                setNewStatus('');
                setStatusNotes('');
              }}
            >
              إلغاء
            </Button>
            <Button onClick={handleStatusUpdate} disabled={updatingStatus || !newStatus}>
              {updatingStatus ? 'جاري التحديث...' : 'تحديث الحالة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة تفاصيل الطلب */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل الطلب</DialogTitle>
            <DialogDescription>
              طلب رقم: {selectedOrder?.tracking_number}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* معلومات العميل */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">معلومات العميل</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="font-medium">الاسم</Label>
                      <p className="text-muted-foreground">{selectedOrder.customer_name}</p>
                    </div>
                    <div>
                      <Label className="font-medium">رقم الهاتف</Label>
                      <p className="text-muted-foreground">{selectedOrder.customer_phone}</p>
                    </div>
                    {selectedOrder.customer_email && (
                      <div>
                        <Label className="font-medium">البريد الإلكتروني</Label>
                        <p className="text-muted-foreground">{selectedOrder.customer_email}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">معلومات الطلب</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="font-medium">حالة الطلب</Label>
                      <div className="mt-1">
                        {getStatusBadge(selectedOrder.status)}
                      </div>
                    </div>
                    <div>
                      <Label className="font-medium">حالة الدفع</Label>
                      <p className="text-muted-foreground">
                        {getPaymentStatusBadge(selectedOrder.payment_status)}
                      </p>
                    </div>
                    <div>
                      <Label className="font-medium">تاريخ الإنشاء</Label>
                      <p className="text-muted-foreground">
                        {format(new Date(selectedOrder.created_at), 'dd MMM yyyy - hh:mm a', { locale: ar })}
                      </p>
                    </div>
                    <div>
                      <Label className="font-medium">المسؤول</Label>
                      <p className="text-muted-foreground">{selectedOrder.assigned_user?.name || 'غير محدد'}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* تفاصيل الألعاب */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">تفاصيل الألعاب</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    if (selectedOrder.notes && selectedOrder.notes.includes('📋 تفاصيل الطلب:')) {
                      const gamesSection = selectedOrder.notes.split('📋 تفاصيل الطلب:')[1]?.split('📊 الملخص:')[0];
                      const summarySection = selectedOrder.notes.split('📊 الملخص:')[1];
                      
                      if (gamesSection) {
                        const gameLines = gamesSection.split('\n').filter(line => line.trim().startsWith('•'));
                        
                        return (
                          <div className="space-y-4">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>#</TableHead>
                                  <TableHead>اسم اللعبة</TableHead>
                                  <TableHead>الكمية</TableHead>
                                  <TableHead>السعر</TableHead>
                                  <TableHead>المجموع</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {gameLines.map((line, index) => {
                                  const gameName = line.replace('•', '').split('(')[0].trim();
                                  const quantity = line.match(/الكمية: (\d+)/)?.[1] || '1';
                                  const price = line.match(/السعر: ([\d,]+)/)?.[1] || '0';
                                  const total = line.match(/المجموع: ([\d,]+)/)?.[1] || '0';
                                  
                                  return (
                                    <TableRow key={index}>
                                      <TableCell>{index + 1}</TableCell>
                                      <TableCell className="font-medium">{gameName}</TableCell>
                                      <TableCell>{quantity}</TableCell>
                                      <TableCell>{price} دج</TableCell>
                                      <TableCell className="font-medium">{total} دج</TableCell>
                                    </TableRow>
                                  );
                                })}
                                <TableRow className="bg-muted/50">
                                  <TableCell colSpan={4} className="font-bold text-center">الإجمالي</TableCell>
                                  <TableCell className="font-bold text-lg">{selectedOrder.price} دج</TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                            
                            {summarySection && (
                              <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                                <h4 className="font-medium mb-2">ملخص الطلب:</h4>
                                {summarySection.split('\n').filter(line => line.trim().startsWith('•')).map((line, index) => (
                                  <p key={index} className="text-sm text-muted-foreground">
                                    {line.trim()}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      }
                    }
                    
                    return (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>اسم اللعبة</TableHead>
                            <TableHead>المنصة</TableHead>
                            <TableHead>السعر</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell>1</TableCell>
                            <TableCell className="font-medium">{selectedOrder.game?.name || 'غير محدد'}</TableCell>
                            <TableCell>{selectedOrder.game?.platform || 'غير محدد'}</TableCell>
                            <TableCell className="font-medium">{selectedOrder.price} دج</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* معلومات الجهاز */}
              {(selectedOrder.device_type || selectedOrder.device_specs) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">معلومات الجهاز</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedOrder.device_type && (
                      <div>
                        <Label className="font-medium">نوع الجهاز</Label>
                        <p className="text-muted-foreground">{selectedOrder.device_type}</p>
                      </div>
                    )}
                    {selectedOrder.device_specs && (
                      <div>
                        <Label className="font-medium">مواصفات الجهاز</Label>
                        <p className="text-muted-foreground whitespace-pre-wrap">{selectedOrder.device_specs}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* ملاحظات العميل */}
              {selectedOrder.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">ملاحظات العميل</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      if (selectedOrder.notes.includes('📋 تفاصيل الطلب:')) {
                        const customerNotes = selectedOrder.notes.split('📋 تفاصيل الطلب:')[0].trim();
                        if (customerNotes) {
                          return (
                            <p className="text-muted-foreground whitespace-pre-wrap">{customerNotes}</p>
                          );
                        } else {
                          return (
                            <p className="text-muted-foreground italic">لا توجد ملاحظات من العميل</p>
                          );
                        }
                      } else {
                        return (
                          <p className="text-muted-foreground whitespace-pre-wrap">{selectedOrder.notes}</p>
                        );
                      }
                    })()}
                  </CardContent>
                </Card>
              )}

              {/* سجل الحالات */}
              {selectedOrder.status_history.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">سجل تحديثات الحالة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedOrder.status_history.map((history: any, index: number) => (
                        <div key={index} className="flex justify-between items-start p-3 bg-muted/30 rounded-lg">
                          <div>
                            <div className="font-medium">
                              {statusOptions.find(opt => opt.value === history.from_status)?.label} → 
                              {' '}{statusOptions.find(opt => opt.value === history.to_status)?.label}
                            </div>
                            {history.notes && (
                              <p className="text-sm text-muted-foreground mt-1">{history.notes}</p>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(history.changed_at), 'dd/MM/yyyy hh:mm a', { locale: ar })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDetailsDialog(false);
                setSelectedOrder(null);
              }}
            >
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة خيارات الطباعة */}
      <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>طباعة الوصل</DialogTitle>
            <DialogDescription>
              اختر نوع الوصل المراد طباعته لطلب رقم: {selectedOrder?.tracking_number}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => printReceipt('admin')}>
                <CardContent className="p-6 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-blue-600" />
                  <h3 className="font-semibold mb-2">وصل إداري</h3>
                  <p className="text-sm text-muted-foreground">
                    يحتوي على جميع التفاصيل الإدارية والمالية
                  </p>
                  <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                    <li>• حالة الدفع والمبالغ</li>
                    <li>• معلومات الجهاز</li>
                    <li>• ملاحظات العميل</li>
                    <li>• المسؤول عن الطلب</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => printReceipt('customer')}>
                <CardContent className="p-6 text-center">
                  <Printer className="h-12 w-12 mx-auto mb-3 text-green-600" />
                  <h3 className="font-semibold mb-2">وصل العميل</h3>
                  <p className="text-sm text-muted-foreground">
                    وصل مبسط للعميل يحتوي على المعلومات الأساسية
                  </p>
                  <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                    <li>• تفاصيل الألعاب والأسعار</li>
                    <li>• معلومات الاتصال</li>
                    <li>• رقم التتبع</li>
                    <li>• حالة الطلب</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPrintDialog(false);
                setSelectedOrder(null);
              }}
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
