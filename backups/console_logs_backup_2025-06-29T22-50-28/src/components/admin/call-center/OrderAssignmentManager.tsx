import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  MoreHorizontal,
  UserPlus,
  Zap,
  ArrowRight,
  Phone,
  MapPin,
  DollarSign,
  Calendar,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  RotateCcw,
  Edit,
  Trash2,
  Download,
  Upload,
  Plus
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCallCenterDistribution } from '@/hooks/useCallCenterDistribution';
import { useCallCenterAgents } from '@/hooks/useCallCenterAgents';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Order {
  id: string;
  form_data: any; // JSON data from database
  total: number;
  status: string;
  created_at: string;
  assignment?: {
    id: string;
    agent_id: string;
    status: string;
    priority_level: number;
    call_attempts: number;
    agent_name?: string;
  };
}

const OrderAssignmentManager: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [provinceFilter, setProvinceFilter] = useState('all');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignmentType, setAssignmentType] = useState<'manual' | 'bulk' | 'auto'>('manual');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const {
    assignOrderToAgent,
    autoAssignOrder,
    transferAssignment,
    updateAssignmentStatus,
    saving
  } = useCallCenterDistribution();

  const { agents } = useCallCenterAgents();

  // جلب الطلبات
  useEffect(() => {
    fetchOrders();
  }, []);

  // تطبيق الفلاتر
  useEffect(() => {
    let filtered = orders;

    if (searchTerm) {
      filtered = filtered.filter(order => 
        (order.form_data?.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.form_data?.phone || '').includes(searchTerm) ||
        order.id.includes(searchTerm)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => {
        if (statusFilter === 'unassigned') return !order.assignment;
        if (statusFilter === 'assigned') return order.assignment?.status === 'assigned';
        if (statusFilter === 'in_progress') return order.assignment?.status === 'in_progress';
        if (statusFilter === 'completed') return order.assignment?.status === 'completed';
        return true;
      });
    }

    if (provinceFilter !== 'all') {
      filtered = filtered.filter(order => order.form_data?.province === provinceFilter);
    }

    setFilteredOrders(filtered);
  }, [orders, searchTerm, statusFilter, provinceFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('online_orders')
        .select(`
          *,
          call_center_order_assignments (
            id,
            agent_id,
            status,
            priority_level,
            call_attempts,
            call_center_agents (
              users (name)
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const formattedOrders = data.map(order => ({
        id: order.id,
        form_data: order.form_data,
        total: order.total,
        status: order.status,
        created_at: order.created_at,
        assignment: order.call_center_order_assignments?.[0] ? {
          id: order.call_center_order_assignments[0].id,
          agent_id: order.call_center_order_assignments[0].agent_id,
          status: order.call_center_order_assignments[0].status,
          priority_level: order.call_center_order_assignments[0].priority_level,
          call_attempts: order.call_center_order_assignments[0].call_attempts,
          agent_name: order.call_center_order_assignments[0].call_center_agents?.users?.name
        } : undefined
      }));

      setOrders(formattedOrders);
    } catch (error) {
      toast.error('فشل في جلب الطلبات');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignOrder = async (orderId: string, agentId: string, priority: number = 3) => {
    const success = await assignOrderToAgent(orderId, agentId, priority);
    if (success) {
      await fetchOrders();
      setShowAssignDialog(false);
      setSelectedOrder(null);
    }
  };

  const handleAutoAssign = async (orderId: string) => {
    const success = await autoAssignOrder(orderId);
    if (success) {
      await fetchOrders();
    }
  };

  const handleBulkAutoAssign = async () => {
    if (selectedOrders.length === 0) {
      toast.error('يرجى اختيار طلبات للتوزيع');
      return;
    }

    const promises = selectedOrders.map(orderId => autoAssignOrder(orderId));
    const results = await Promise.allSettled(promises);
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    if (successful > 0) {
      toast.success(`تم توزيع ${successful} طلب بنجاح`);
    }
    if (failed > 0) {
      toast.error(`فشل في توزيع ${failed} طلب`);
    }

    await fetchOrders();
    setSelectedOrders([]);
  };

  const AssignmentDialog = () => {
    const [selectedAgent, setSelectedAgent] = useState('');
    const [priority, setPriority] = useState(3);
    const [notes, setNotes] = useState('');

    const handleSubmit = async () => {
      if (!selectedOrder) return;

      if (assignmentType === 'auto') {
        await handleAutoAssign(selectedOrder.id);
      } else if (selectedAgent) {
        await handleAssignOrder(selectedOrder.id, selectedAgent, priority);
      } else {
        toast.error('يرجى اختيار وكيل');
      }
    };

    return (
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>توزيع الطلب</DialogTitle>
            <DialogDescription>
              توزيع الطلب #{selectedOrder?.id.slice(-6)} على وكيل مركز الاتصالات
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>طريقة التوزيع</Label>
              <Select value={assignmentType} onValueChange={(value: any) => setAssignmentType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">توزيع تلقائي (مستحسن)</SelectItem>
                  <SelectItem value="manual">توزيع يدوي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {assignmentType === 'manual' && (
              <>
                <div className="space-y-2">
                  <Label>اختيار الوكيل</Label>
                  <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر وكيل" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.filter(a => a.is_available).map(agent => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.user?.name || agent.user?.email}
                          <span className="text-muted-foreground ml-2">
                            (متاح)
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>مستوى الأولوية</Label>
                  <Select value={priority.toString()} onValueChange={(value) => setPriority(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">منخفضة جداً</SelectItem>
                      <SelectItem value="2">منخفضة</SelectItem>
                      <SelectItem value="3">متوسطة</SelectItem>
                      <SelectItem value="4">عالية</SelectItem>
                      <SelectItem value="5">عالية جداً</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>ملاحظات (اختياري)</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="ملاحظات خاصة بالطلب"
                    rows={3}
                  />
                </div>
              </>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                إلغاء
              </Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? 'جاري التوزيع...' : 'توزيع الطلب'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* العنوان والإحصائيات */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">إدارة توزيع الطلبات</h1>
          <p className="text-muted-foreground">
            توزيع الطلبات على وكلاء مركز الاتصالات
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{orders.filter(o => !o.assignment).length}</p>
              <p className="text-sm text-muted-foreground">غير موزعة</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{orders.filter(o => o.assignment?.status === 'assigned').length}</p>
              <p className="text-sm text-muted-foreground">مخصصة</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{orders.filter(o => o.assignment?.status === 'completed').length}</p>
              <p className="text-sm text-muted-foreground">مكتملة</p>
            </div>
          </div>
        </div>
      </div>

      {/* أدوات التحكم */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="البحث بالاسم، الهاتف، أو رقم الطلب..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="unassigned">غير موزعة</SelectItem>
                  <SelectItem value="assigned">مخصصة</SelectItem>
                  <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                  <SelectItem value="completed">مكتملة</SelectItem>
                </SelectContent>
              </Select>

              <Select value={provinceFilter} onValueChange={setProvinceFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المناطق</SelectItem>
                  <SelectItem value="الرياض">الرياض</SelectItem>
                  <SelectItem value="جدة">جدة</SelectItem>
                  <SelectItem value="الدمام">الدمام</SelectItem>
                  <SelectItem value="مكة">مكة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              {selectedOrders.length > 0 && (
                <Button onClick={handleBulkAutoAssign} disabled={saving}>
                  <Zap className="h-4 w-4 mr-2" />
                  توزيع تلقائي ({selectedOrders.length})
                </Button>
              )}
              
              <Button variant="outline" onClick={fetchOrders}>
                <RotateCcw className="h-4 w-4 mr-2" />
                تحديث
              </Button>
              
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                تصدير
              </Button>
            </div>
          </div>

          {/* جدول الطلبات */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedOrders.length === filteredOrders.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedOrders(filteredOrders.map(o => o.id));
                      } else {
                        setSelectedOrders([]);
                      }
                    }}
                  />
                </TableHead>
                <TableHead>الطلب</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>المنطقة</TableHead>
                <TableHead>القيمة</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الوكيل المخصص</TableHead>
                <TableHead>المحاولات</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedOrders.includes(order.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOrders([...selectedOrders, order.id]);
                        } else {
                          setSelectedOrders(selectedOrders.filter(id => id !== order.id));
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    #{order.id.slice(-6)}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{order.form_data?.fullName || 'غير محدد'}</p>
                      <p className="text-sm text-muted-foreground">{order.form_data?.phone || 'غير محدد'}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
                      {order.form_data?.province || 'غير محدد'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-1 text-muted-foreground" />
                      {order.total?.toLocaleString() || '0'} دج
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                      {new Date(order.created_at).toLocaleDateString('ar-SA')}
                    </div>
                  </TableCell>
                  <TableCell>
                    {order.assignment ? (
                      <Badge variant={
                        order.assignment.status === 'completed' ? 'default' :
                        order.assignment.status === 'in_progress' ? 'secondary' :
                        order.assignment.status === 'assigned' ? 'outline' : 'destructive'
                      }>
                        {order.assignment.status === 'assigned' && 'مخصصة'}
                        {order.assignment.status === 'in_progress' && 'قيد التنفيذ'}
                        {order.assignment.status === 'completed' && 'مكتملة'}
                        {order.assignment.status === 'cancelled' && 'ملغية'}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">غير موزعة</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {order.assignment?.agent_name ? (
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1 text-muted-foreground" />
                        {order.assignment.agent_name}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">غير مخصص</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {order.assignment ? (
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-1 text-muted-foreground" />
                        {order.assignment.call_attempts}/3
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {!order.assignment ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedOrder(order);
                              setAssignmentType('auto');
                              setShowAssignDialog(true);
                            }}
                          >
                            <Zap className="h-3 w-3 mr-1" />
                            توزيع تلقائي
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedOrder(order);
                              setAssignmentType('manual');
                              setShowAssignDialog(true);
                            }}
                          >
                            <UserPlus className="h-3 w-3 mr-1" />
                            تخصيص
                          </Button>
                        </>
                      ) : (
                        <>
                          {order.assignment.status === 'assigned' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateAssignmentStatus(order.assignment!.id, 'in_progress')}
                            >
                              <ArrowRight className="h-3 w-3 mr-1" />
                              بدء
                            </Button>
                          )}
                          {order.assignment.status === 'in_progress' && (
                            <Button
                              size="sm"
                              onClick={() => updateAssignmentStatus(order.assignment!.id, 'completed')}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              إنهاء
                            </Button>
                          )}
                          <Button size="sm" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredOrders.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد طلبات تطابق المعايير المحددة</p>
              <p className="text-sm">جرب تغيير الفلاتر أو البحث</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* حوار التوزيع */}
      <AssignmentDialog />
    </div>
  );
};

export default OrderAssignmentManager;
