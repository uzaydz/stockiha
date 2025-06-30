import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  Users, 
  Phone, 
  Clock, 
  TrendingUp, 
  MoreHorizontal, 
  Plus, 
  Edit, 
  Trash2,
  UserCheck,
  UserX,
  Activity
} from 'lucide-react';
import { useCallCenterAgents } from '@/hooks/useCallCenterAgents';
import type { CallCenterAgent } from '@/types/call-center.types';
import AddAgentDialog from './AddAgentDialog';

interface AgentFormData {
  user_id: string;
  assigned_regions: string[];
  assigned_stores: string[];
  max_daily_orders: number;
  is_available: boolean;
  specializations: string[];
}

const CallCenterAgentsManagement: React.FC = () => {
  const { agents, loading, error, createAgent, updateAgent, deleteAgent } = useCallCenterAgents();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState<AgentFormData>({
    user_id: '',
    assigned_regions: [],
    assigned_stores: [],
    max_daily_orders: 50,
    is_available: true,
    specializations: []
  });

  // إحصائيات سريعة
  const stats = {
    total: agents.length,
    active: agents.filter(agent => agent.is_active && agent.is_available).length,
    busy: agents.filter(agent => agent.is_active && !agent.is_available).length,
    offline: agents.filter(agent => !agent.is_active).length
  };

  const handleCreateAgent = async () => {
    const success = await createAgent({
      ...formData,
      organization_id: '', // سيتم تعيينه في الـ hook
      is_active: true,
      last_activity: new Date().toISOString(),
      performance_metrics: {
        failed_calls: 0,
        successful_calls: 0,
        avg_call_duration: 0,
        total_orders_handled: 0,
        customer_satisfaction: 0,
        last_performance_update: null
      },
      work_schedule: {
        monday: { start: '09:00', end: '17:00', active: true },
        tuesday: { start: '09:00', end: '17:00', active: true },
        wednesday: { start: '09:00', end: '17:00', active: true },
        thursday: { start: '09:00', end: '17:00', active: true },
        friday: { start: '09:00', end: '17:00', active: true },
        saturday: { start: '09:00', end: '17:00', active: false },
        sunday: { start: '09:00', end: '17:00', active: false }
      }
    });

    if (success) {
      setIsAddDialogOpen(false);
      setFormData({
        user_id: '',
        assigned_regions: [],
        assigned_stores: [],
        max_daily_orders: 50,
        is_available: true,
        specializations: []
      });
    }
  };

  const handleUpdateAgent = async () => {
    if (!selectedAgent) return;

    const success = await updateAgent(selectedAgent, formData);
    if (success) {
      setIsEditDialogOpen(false);
      setSelectedAgent(null);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الوكيل؟')) {
      await deleteAgent(agentId);
    }
  };

  const getStatusBadge = (agent: any) => {
    if (!agent.is_active) {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">غير نشط</Badge>;
    }
    if (agent.is_available) {
      return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">متاح</Badge>;
    }
    return <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">مشغول</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600 dark:text-red-400">
            <p>{error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              إعادة المحاولة
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">إجمالي الوكلاء</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">متاح</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">مشغول</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.busy}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <UserX className="h-8 w-8 text-gray-600 dark:text-gray-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">غير متصل</p>
                <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.offline}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* قائمة الوكلاء */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>إدارة الوكلاء</CardTitle>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              إضافة وكيل
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {agents.map((agent) => (
              <div key={agent.id} className="flex items-center justify-between p-4 border border-border/50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${agent.users?.name || 'User'}`} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {agent.users?.name ? agent.users.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{agent.users?.name || 'غير محدد'}</h3>
                    <p className="text-sm text-muted-foreground">{agent.users?.email || 'غير محدد'}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      {getStatusBadge(agent)}
                      <span className="text-xs text-muted-foreground">
                        الحد الأقصى: {agent.max_daily_orders || 10} طلب/يوم
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {agent.performance_metrics?.successful_calls || 0} مكالمة ناجحة
                    </p>
                    <p className="text-xs text-muted-foreground">
                      معدل النجاح: {(agent.performance_metrics?.successful_calls || 0) > 0 
                        ? Math.round(((agent.performance_metrics?.successful_calls || 0) / ((agent.performance_metrics?.successful_calls || 0) + (agent.performance_metrics?.failed_calls || 0))) * 100)
                        : 0}%
                    </p>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setSelectedAgent(agent.id);
                        setFormData({
                          user_id: agent.user_id,
                          assigned_regions: agent.assigned_regions || [],
                          assigned_stores: agent.assigned_stores || [],
                          max_daily_orders: agent.max_daily_orders || 10,
                          is_available: agent.is_available || false,
                          specializations: agent.specializations || []
                        });
                        setIsEditDialogOpen(true);
                      }}>
                        <Edit className="h-4 w-4 mr-2" />
                        تعديل
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteAgent(agent.id)}
                        className="text-red-600 dark:text-red-400"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        حذف
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
            
            {agents.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد وكلاء مضافين بعد</p>
                <p className="text-sm">ابدأ بإضافة وكيل جديد</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* حوار التعديل */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل بيانات الوكيل</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_max_daily_orders">الحد الأقصى للطلبات اليومية</Label>
              <Input
                id="edit_max_daily_orders"
                type="number"
                value={formData.max_daily_orders || 10}
                onChange={(e) => setFormData(prev => ({ ...prev, max_daily_orders: parseInt(e.target.value) || 10 }))}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit_is_available"
                checked={formData.is_available}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_available: checked }))}
              />
              <Label htmlFor="edit_is_available">متاح للعمل</Label>
            </div>
            <Button onClick={handleUpdateAgent} className="w-full">
              حفظ التغييرات
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* نموذج إضافة وكيل جديد */}
      <AddAgentDialog 
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={() => {
          // سيتم تحديث قائمة الوكلاء تلقائياً من خلال الـ hook
        }}
      />
    </div>
  );
};

export default CallCenterAgentsManagement;
