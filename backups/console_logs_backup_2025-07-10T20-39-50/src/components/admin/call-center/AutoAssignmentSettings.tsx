import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings, 
  Zap, 
  Users, 
  Clock, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  RotateCcw,
  Brain,
  Target,
  Star
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase';

interface DistributionRule {
  id: string;
  distribution_type: 'round_robin' | 'smart' | 'availability' | 'priority' | 'expert';
  auto_assign_enabled: boolean;
  is_active: boolean;
  priority: number;
  settings: any;
}

interface AutoAssignmentStats {
  total_orders: number;
  auto_assigned: number;
  manual_assigned: number;
  unassigned: number;
  success_rate: number;
  avg_assignment_time_seconds: number;
}

const DISTRIBUTION_TYPES = [
  {
    value: 'round_robin',
    label: 'التوزيع الدائري',
    description: 'توزيع الطلبيات بالتناوب على جميع الوكلاء المتاحين',
    icon: RotateCcw,
    color: 'blue'
  },
  {
    value: 'smart',
    label: 'التوزيع الذكي',
    description: 'توزيع بناءً على عبء العمل والخبرة والأداء',
    icon: Brain,
    color: 'purple'
  },
  {
    value: 'availability',
    label: 'حسب التوفر',
    description: 'توزيع على الوكلاء الأقل انشغالاً',
    icon: Clock,
    color: 'green'
  },
  {
    value: 'priority',
    label: 'حسب الأولوية',
    description: 'توزيع بناءً على أولوية الطلب ومستوى الوكيل',
    icon: Target,
    color: 'orange'
  },
  {
    value: 'expert',
    label: 'الخبراء فقط',
    description: 'توزيع على الوكلاء ذوي الخبرة العالية',
    icon: Star,
    color: 'yellow'
  }
];

const AutoAssignmentSettings = () => {
  const { currentOrganization } = useTenant();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rule, setRule] = useState<DistributionRule | null>(null);
  const [stats, setStats] = useState<AutoAssignmentStats | null>(null);

  // جلب الإعدادات الحالية
  const fetchSettings = async () => {
    if (!currentOrganization?.id) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('call_center_distribution_rules')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setRule(data || {
        id: '',
        distribution_type: 'round_robin',
        auto_assign_enabled: false,
        is_active: true,
        priority: 1,
        settings: {}
      });

    } catch (err: any) {
      toast({
        title: "خطأ",
        description: "فشل في جلب إعدادات التوزيع التلقائي",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // جلب الإحصائيات
  const fetchStats = async () => {
    if (!currentOrganization?.id) return;

    try {
      const { data, error } = await supabase.rpc('get_auto_assignment_stats', {
        p_organization_id: currentOrganization.id
      });

      if (error) throw error;

      setStats(data);
    } catch (err: any) {
    }
  };

  // تفعيل/إلغاء تفعيل التوزيع التلقائي
  const toggleAutoAssignment = async (enabled: boolean) => {
    if (!currentOrganization?.id) return;

    try {
      setSaving(true);

      const { data, error } = await supabase.rpc('toggle_auto_assignment', {
        p_organization_id: currentOrganization.id,
        p_enabled: enabled
      });

      if (error) throw error;

      setRule(prev => prev ? { ...prev, auto_assign_enabled: enabled } : null);

      toast({
        title: enabled ? "تم التفعيل" : "تم الإلغاء",
        description: enabled 
          ? "تم تفعيل التوزيع التلقائي للطلبيات" 
          : "تم إلغاء تفعيل التوزيع التلقائي",
      });

    } catch (err: any) {
      toast({
        title: "خطأ",
        description: "فشل في تحديث إعدادات التوزيع التلقائي",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // تحديث نوع التوزيع
  const updateDistributionType = async (type: string) => {
    if (!currentOrganization?.id || !rule) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('call_center_distribution_rules')
        .upsert({
          organization_id: currentOrganization.id,
          distribution_type: type,
          auto_assign_enabled: rule.auto_assign_enabled,
          is_active: true,
          priority: 1,
          settings: {},
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setRule(prev => prev ? { ...prev, distribution_type: type as any } : null);

      toast({
        title: "تم التحديث",
        description: "تم تحديث نوع التوزيع بنجاح",
      });

    } catch (err: any) {
      toast({
        title: "خطأ",
        description: "فشل في تحديث نوع التوزيع",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchStats();
  }, [currentOrganization?.id]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const selectedType = DISTRIBUTION_TYPES.find(t => t.value === rule?.distribution_type);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            إعدادات التوزيع التلقائي
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* تفعيل/إلغاء التوزيع التلقائي */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">التوزيع التلقائي للطلبيات</Label>
              <p className="text-sm text-muted-foreground">
                توزيع الطلبيات الجديدة تلقائياً على الوكلاء المتاحين
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={rule?.auto_assign_enabled || false}
                onCheckedChange={toggleAutoAssignment}
                disabled={saving}
              />
              <Badge variant={rule?.auto_assign_enabled ? "default" : "secondary"}>
                {rule?.auto_assign_enabled ? "مفعل" : "معطل"}
              </Badge>
            </div>
          </div>

          {rule?.auto_assign_enabled && (
            <Alert>
              <Zap className="h-4 w-4" />
              <AlertDescription>
                التوزيع التلقائي مفعل. سيتم توزيع الطلبيات الجديدة تلقائياً على الوكلاء المتاحين.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* أنواع التوزيع */}
      <Card>
        <CardHeader>
          <CardTitle>نوع التوزيع</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DISTRIBUTION_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = rule?.distribution_type === type.value;
              
              return (
                <div
                  key={type.value}
                  className={`
                    relative p-4 border rounded-lg cursor-pointer transition-all
                    ${isSelected 
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                      : 'border-border hover:border-primary/50'
                    }
                  `}
                  onClick={() => updateDistributionType(type.value)}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-5 w-5 text-${type.color}-600`} />
                      <h3 className="font-medium">{type.label}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {type.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedType && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <selectedType.icon className={`h-4 w-4 text-${selectedType.color}-600`} />
                <span className="font-medium">النوع المحدد: {selectedType.label}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {selectedType.description}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* الإحصائيات */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              إحصائيات التوزيع (آخر 30 يوم)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.total_orders}
                </div>
                <div className="text-sm text-blue-600">إجمالي الطلبيات</div>
              </div>

              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {stats.auto_assigned}
                </div>
                <div className="text-sm text-green-600">توزيع تلقائي</div>
              </div>

              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {stats.manual_assigned}
                </div>
                <div className="text-sm text-orange-600">توزيع يدوي</div>
              </div>

              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {stats.unassigned}
                </div>
                <div className="text-sm text-red-600">غير مُكلف</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="font-medium">معدل النجاح</span>
                </div>
                <div className="text-2xl font-bold text-primary">
                  {stats.success_rate.toFixed(1)}%
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="font-medium">متوسط وقت التكليف</span>
                </div>
                <div className="text-2xl font-bold text-primary">
                  {stats.avg_assignment_time_seconds 
                    ? `${Math.round(stats.avg_assignment_time_seconds)}ث`
                    : 'غير متاح'
                  }
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* تحديث الإحصائيات */}
      <div className="flex justify-end">
        <Button
          onClick={() => {
            fetchSettings();
            fetchStats();
          }}
          variant="outline"
          disabled={loading}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          تحديث البيانات
        </Button>
      </div>
    </div>
  );
};

export default AutoAssignmentSettings;
