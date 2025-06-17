import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  Users, 
  Settings, 
  BarChart3, 
  Monitor,
  Phone,
  Activity,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';

interface CallCenterAdminLayoutProps {
  children: React.ReactNode;
}

const CallCenterAdminLayout: React.FC<CallCenterAdminLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // تحديد التبويب النشط بناءً على المسار
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/agents')) return 'agents';
    if (path.includes('/distribution')) return 'distribution';
    if (path.includes('/reports')) return 'reports';
    if (path.includes('/monitoring')) return 'monitoring';
    return 'agents';
  };

  // التنقل عند تغيير التبويب
  const handleTabChange = (value: string) => {
    switch (value) {
      case 'agents':
        navigate('/dashboard/call-center/agents');
        break;
      case 'distribution':
        navigate('/dashboard/call-center/distribution');
        break;
      case 'reports':
        navigate('/dashboard/call-center/reports');
        break;
      case 'monitoring':
        navigate('/dashboard/call-center/monitoring');
        break;
    }
  };

  // إحصائيات سريعة (mock data)
  const quickStats = {
    activeAgents: 12,
    totalCalls: 156,
    avgResponseTime: '2.3 دقيقة',
    successRate: '94%'
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          {/* Breadcrumb */}
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">لوحة التحكم</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>إدارة مركز الاتصال</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
          {/* Page Title */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Phone className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">إدارة مركز الاتصال</h1>
              <p className="text-muted-foreground">إدارة شاملة لوكلاء مركز الاتصال والعمليات</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Activity className="h-3 w-3 mr-1" />
            نشط
          </Badge>
          <Button variant="outline" size="sm">
            <Monitor className="h-4 w-4 mr-2" />
            المراقبة المباشرة
          </Button>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">الوكلاء النشطون</p>
                <p className="text-2xl font-bold text-green-600">{quickStats.activeAgents}</p>
              </div>
              <div className="p-2 rounded-lg bg-green-100">
                <Users className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">إجمالي المكالمات</p>
                <p className="text-2xl font-bold text-blue-600">{quickStats.totalCalls}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-100">
                <Phone className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">متوسط وقت الاستجابة</p>
                <p className="text-2xl font-bold text-orange-600">{quickStats.avgResponseTime}</p>
              </div>
              <div className="p-2 rounded-lg bg-orange-100">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">معدل النجاح</p>
                <p className="text-2xl font-bold text-purple-600">{quickStats.successRate}</p>
              </div>
              <div className="p-2 rounded-lg bg-purple-100">
                <BarChart3 className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={getActiveTab()} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="agents" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            إدارة الوكلاء
          </TabsTrigger>
          <TabsTrigger value="distribution" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            إعدادات التوزيع
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            التقارير
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            المراقبة المباشرة
          </TabsTrigger>
        </TabsList>

        {/* Content Area */}
        <div className="mt-6">
          {children}
        </div>
      </Tabs>
    </div>
  );
};

export default CallCenterAdminLayout; 