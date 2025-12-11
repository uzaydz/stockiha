/**
 * 📈 Performance Management Page - صفحة إدارة الأداء
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  TrendingUp,
  Target,
  Award,
  Star,
  Plus,
  RefreshCw,
  Eye,
  Edit,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  PerformanceReviewCard,
  GoalsList,
  ScoreDisplay,
} from '@/components/hr/PerformanceReviewCard';
import {
  createReview,
  submitReview,
  getReviews,
  getPerformanceCriteria,
  createGoal,
  getEmployeeGoals,
  updateGoalProgress,
  getReviewPeriods,
} from '@/lib/api/hr/performanceService';
import type {
  PerformanceReviewWithDetails,
  EmployeeGoalWithUpdates,
  PerformanceCriteria,
  PerformanceReviewPeriod,
} from '@/types/hr/performance';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';

export default function PerformanceManagement() {
  const { userProfile } = useAuth();
  const { currentOrganization } = useTenant();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState('reviews');
  const [isNewReviewDialogOpen, setIsNewReviewDialogOpen] = useState(false);
  const [isNewGoalDialogOpen, setIsNewGoalDialogOpen] = useState(false);
  const [reviewingReview, setReviewingReview] = useState<PerformanceReviewWithDetails | null>(null);
  const [updatingGoal, setUpdatingGoal] = useState<EmployeeGoalWithUpdates | null>(null);

  const organizationId = currentOrganization?.id || '';
  const isManager = userProfile?.role === 'admin' || userProfile?.role === 'manager';

  // استعلامات البيانات
  const { data: myReviewsData, isLoading: isLoadingReviews } = useQuery({
    queryKey: ['my-performance-reviews', organizationId, userProfile?.id],
    queryFn: () => getReviews(organizationId, { employee_id: userProfile?.id }),
    enabled: !!organizationId && !!userProfile?.id,
  });
  const myReviews = myReviewsData?.data || [];

  const { data: pendingReviewsData } = useQuery({
    queryKey: ['pending-performance-reviews', organizationId],
    queryFn: () => getReviews(organizationId, { status: 'submitted' }),
    enabled: !!organizationId && isManager,
  });
  const pendingReviews = pendingReviewsData?.data || [];

  const { data: myGoals = [], isLoading: isLoadingGoals } = useQuery({
    queryKey: ['my-goals', userProfile?.id],
    queryFn: () => getEmployeeGoals(userProfile?.id || ''),
    enabled: !!userProfile?.id,
  });

  const { data: criteria = [] } = useQuery({
    queryKey: ['performance-criteria', organizationId],
    queryFn: () => getPerformanceCriteria(organizationId),
    enabled: !!organizationId,
  });

  const { data: reviewPeriods = [] } = useQuery({
    queryKey: ['review-periods', organizationId],
    queryFn: () => getReviewPeriods(organizationId),
    enabled: !!organizationId,
  });

  // إنشاء تقييم جديد
  const createReviewMutation = useMutation({
    mutationFn: (data: any) => createReview(organizationId, data),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('تم إنشاء التقييم بنجاح');
        setIsNewReviewDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: ['my-performance-reviews'] });
      } else {
        toast.error(result.error || 'فشل إنشاء التقييم');
      }
    },
  });

  // تقديم التقييم
  const submitReviewMutation = useMutation({
    mutationFn: submitReview,
    onSuccess: (result) => {
      if (result.success) {
        toast.success('تم تقديم التقييم بنجاح');
        setReviewingReview(null);
        queryClient.invalidateQueries({ queryKey: ['my-performance-reviews'] });
        queryClient.invalidateQueries({ queryKey: ['pending-performance-reviews'] });
      } else {
        toast.error(result.error || 'فشل تقديم التقييم');
      }
    },
  });

  // إنشاء هدف جديد
  const createGoalMutation = useMutation({
    mutationFn: (data: any) => createGoal(organizationId, data),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('تم إنشاء الهدف بنجاح');
        setIsNewGoalDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: ['my-goals'] });
      } else {
        toast.error(result.error || 'فشل إنشاء الهدف');
      }
    },
  });

  // تحديث تقدم الهدف
  const updateGoalMutation = useMutation({
    mutationFn: (data: { goalId: string; progress: number; notes: string }) =>
      updateGoalProgress({ goal_id: data.goalId, new_value: data.progress, notes: data.notes }, userProfile?.id || ''),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('تم تحديث التقدم بنجاح');
        setUpdatingGoal(null);
        queryClient.invalidateQueries({ queryKey: ['my-goals'] });
      } else {
        toast.error(result.error || 'فشل تحديث التقدم');
      }
    },
  });

  // إحصائيات الأداء
  const performanceStats = {
    totalReviews: myReviews.length,
    averageScore: myReviews.length
      ? myReviews.reduce((sum, r) => sum + (r.overall_score || 0), 0) / myReviews.length
      : 0,
    activeGoals: myGoals.filter((g) => g.status === 'in_progress').length,
    completedGoals: myGoals.filter((g) => g.status === 'completed').length,
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة الأداء</h1>
          <p className="text-muted-foreground">
            تقييم الأداء وإدارة الأهداف والتطوير المهني
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => queryClient.invalidateQueries()}>
            <RefreshCw className="h-4 w-4 ml-2" />
            تحديث
          </Button>
          {isManager && (
            <Dialog open={isNewReviewDialogOpen} onOpenChange={setIsNewReviewDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 ml-2" />
                  تقييم جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>إنشاء تقييم أداء جديد</DialogTitle>
                </DialogHeader>
                <NewReviewForm
                  criteria={criteria}
                  periods={reviewPeriods}
                  reviewerId={userProfile?.id || ''}
                  organizationId={organizationId}
                  onSubmit={(data) => createReviewMutation.mutate(data)}
                  isLoading={createReviewMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="التقييمات"
          value={performanceStats.totalReviews}
          icon={Award}
          color="blue"
        />
        <StatsCard
          title="متوسط التقييم"
          value={performanceStats.averageScore.toFixed(1)}
          suffix="/5"
          icon={Star}
          color="yellow"
        />
        <StatsCard
          title="أهداف نشطة"
          value={performanceStats.activeGoals}
          icon={Target}
          color="purple"
        />
        <StatsCard
          title="أهداف مكتملة"
          value={performanceStats.completedGoals}
          icon={CheckCircle}
          color="green"
        />
      </div>

      {/* تنبيه للمديرين */}
      {isManager && pendingReviews.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-900/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="font-medium">تقييمات تحتاج مراجعتك</p>
                <p className="text-sm text-muted-foreground">
                  {pendingReviews.length} تقييم بانتظار الاعتماد
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => setSelectedTab('pending')}>
              مراجعة التقييمات
            </Button>
          </CardContent>
        </Card>
      )}

      {/* التبويبات */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="reviews">تقييماتي</TabsTrigger>
          <TabsTrigger value="goals">أهدافي</TabsTrigger>
          {isManager && (
            <TabsTrigger value="pending">
              التقييمات المعلقة
              {pendingReviews.length > 0 && (
                <Badge variant="destructive" className="mr-2 h-5 w-5 p-0 justify-center">
                  {pendingReviews.length}
                </Badge>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="criteria">معايير التقييم</TabsTrigger>
        </TabsList>

        <TabsContent value="reviews" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                تقييمات الأداء
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingReviews ? (
                <div className="text-center py-8">جاري التحميل...</div>
              ) : myReviews.length === 0 ? (
                <div className="text-center py-12">
                  <Award className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">لا توجد تقييمات بعد</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myReviews.map((review) => (
                    <PerformanceReviewCard
                      key={review.id}
                      review={review}
                      onView={() => setReviewingReview(review)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                الأهداف والمهام
              </CardTitle>
              <Dialog open={isNewGoalDialogOpen} onOpenChange={setIsNewGoalDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 ml-2" />
                    هدف جديد
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>إنشاء هدف جديد</DialogTitle>
                  </DialogHeader>
                  <NewGoalForm
                    employeeId={userProfile?.id || ''}
                    organizationId={organizationId}
                    onSubmit={(data) => createGoalMutation.mutate(data)}
                    isLoading={createGoalMutation.isPending}
                  />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <GoalsList
                goals={myGoals}
                isLoading={isLoadingGoals}
                onUpdateProgress={(goalId) => {
                  const goal = myGoals.find((g) => g.id === goalId);
                  if (goal) setUpdatingGoal(goal);
                }}
                emptyMessage="لم تحدد أي أهداف بعد"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {isManager && (
          <TabsContent value="pending" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  تقييمات بانتظار الاعتماد
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingReviews.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
                    <p className="mt-4 text-muted-foreground">لا توجد تقييمات معلقة</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingReviews.map((review) => (
                      <PerformanceReviewCard
                        key={review.id}
                        review={review}
                        onView={() => setReviewingReview(review)}
                        onEdit={() => setReviewingReview(review)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="criteria" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                معايير التقييم
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {criteria.map((criterion) => (
                  <CriteriaCard key={criterion.id} criteria={criterion} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog تفاصيل التقييم */}
      <Dialog open={!!reviewingReview} onOpenChange={() => setReviewingReview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تفاصيل التقييم</DialogTitle>
          </DialogHeader>
          {reviewingReview && <ReviewDetailView review={reviewingReview} />}
        </DialogContent>
      </Dialog>

      {/* Dialog تحديث التقدم */}
      <Dialog open={!!updatingGoal} onOpenChange={() => setUpdatingGoal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تحديث تقدم الهدف</DialogTitle>
          </DialogHeader>
          {updatingGoal && (
            <UpdateGoalProgressForm
              goal={updatingGoal}
              onSubmit={(data) =>
                updateGoalMutation.mutate({
                  goalId: updatingGoal.id,
                  progress: data.progress,
                  notes: data.notes,
                })
              }
              isLoading={updateGoalMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================
// Sub Components
// ============================================

interface StatsCardProps {
  title: string;
  value: number | string;
  suffix?: string;
  icon: React.ElementType;
  color: 'blue' | 'yellow' | 'purple' | 'green';
}

function StatsCard({ title, value, suffix, icon: Icon, color }: StatsCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30',
    yellow: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30',
  };

  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">
            {value}
            {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
          </p>
          <p className="text-xs text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface CriteriaCardProps {
  criteria: PerformanceCriteria;
}

function CriteriaCard({ criteria }: CriteriaCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-medium">{criteria.name_ar || criteria.name}</h4>
          <Badge variant="outline">{criteria.weight}%</Badge>
        </div>
        {criteria.description && (
          <p className="text-sm text-muted-foreground">{criteria.description}</p>
        )}
      </CardContent>
    </Card>
  );
}

interface ReviewDetailViewProps {
  review: PerformanceReviewWithDetails;
}

function ReviewDetailView({ review }: ReviewDetailViewProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <ScoreDisplay score={review.overall_score} size="lg" />
      </div>

      {review.criteria_scores && review.criteria_scores.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium">تفاصيل التقييم</h4>
          {review.criteria_scores.map((score, index) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{score.criteria?.name_ar || score.criteria?.name}</span>
                <span className="font-medium">{score.score}/5</span>
              </div>
              <Progress value={(score.score / 5) * 100} className="h-2" />
              {score.comments && (
                <p className="text-xs text-muted-foreground">{score.comments}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {review.strengths && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <h5 className="font-medium text-green-700 dark:text-green-400 mb-2">نقاط القوة</h5>
            <p className="text-sm">{review.strengths}</p>
          </div>
        )}
        {review.improvements && (
          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <h5 className="font-medium text-orange-700 dark:text-orange-400 mb-2">نقاط التحسين</h5>
            <p className="text-sm">{review.improvements}</p>
          </div>
        )}
      </div>

      {review.manager_comments && (
        <div className="p-3 bg-muted/50 rounded-lg">
          <h5 className="font-medium mb-2">ملاحظات المدير</h5>
          <p className="text-sm">{review.manager_comments}</p>
        </div>
      )}
    </div>
  );
}

interface NewReviewFormProps {
  criteria: PerformanceCriteria[];
  periods: PerformanceReviewPeriod[];
  reviewerId: string;
  organizationId: string;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

function NewReviewForm({
  criteria,
  periods,
  reviewerId,
  organizationId,
  onSubmit,
  isLoading,
}: NewReviewFormProps) {
  const [formData, setFormData] = useState({
    employee_id: '',
    period_id: '',
    criteria_scores: criteria.map((c) => ({ criteria_id: c.id, score: 3, comments: '' })),
    strengths: '',
    improvements: '',
    manager_comments: '',
  });

  const handleScoreChange = (criteriaId: string, score: number) => {
    setFormData({
      ...formData,
      criteria_scores: formData.criteria_scores.map((cs) =>
        cs.criteria_id === criteriaId ? { ...cs, score } : cs
      ),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      reviewer_id: reviewerId,
      organization_id: organizationId,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>الموظف</Label>
          <Input
            value={formData.employee_id}
            onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
            placeholder="معرف الموظف"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>فترة التقييم</Label>
          <Select
            value={formData.period_id}
            onValueChange={(value) => setFormData({ ...formData, period_id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر الفترة" />
            </SelectTrigger>
            <SelectContent>
              {periods.map((period) => (
                <SelectItem key={period.id} value={period.id}>
                  {period.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium">تقييم المعايير</h4>
        {criteria.map((criterion) => {
          const score = formData.criteria_scores.find((cs) => cs.criteria_id === criterion.id);
          return (
            <div key={criterion.id} className="space-y-2 p-3 border rounded-lg">
              <div className="flex justify-between">
                <span className="font-medium">{criterion.name_ar || criterion.name}</span>
                <span className="text-primary font-bold">{score?.score}/5</span>
              </div>
              <Slider
                value={[score?.score || 3]}
                onValueChange={([value]) => handleScoreChange(criterion.id, value)}
                min={1}
                max={5}
                step={0.5}
              />
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <Label>نقاط القوة</Label>
        <Textarea
          value={formData.strengths}
          onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
          placeholder="اذكر نقاط القوة..."
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>نقاط التحسين</Label>
        <Textarea
          value={formData.improvements}
          onChange={(e) => setFormData({ ...formData, improvements: e.target.value })}
          placeholder="اذكر نقاط التحسين..."
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>ملاحظات إضافية</Label>
        <Textarea
          value={formData.manager_comments}
          onChange={(e) => setFormData({ ...formData, manager_comments: e.target.value })}
          placeholder="أي ملاحظات أخرى..."
          rows={2}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'جاري الحفظ...' : 'حفظ التقييم'}
      </Button>
    </form>
  );
}

interface NewGoalFormProps {
  employeeId: string;
  organizationId: string;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

function NewGoalForm({ employeeId, organizationId, onSubmit, isLoading }: NewGoalFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    due_date: '',
    weight: 100,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      employee_id: employeeId,
      organization_id: organizationId,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>عنوان الهدف</Label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="مثال: إتمام مشروع X"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>الوصف</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="وصف تفصيلي للهدف..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>تاريخ البدء</Label>
          <Input
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>تاريخ الانتهاء</Label>
          <Input
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            min={formData.start_date}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>الوزن النسبي (%)</Label>
        <Input
          type="number"
          value={formData.weight}
          onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) })}
          min={1}
          max={100}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'جاري الإنشاء...' : 'إنشاء الهدف'}
      </Button>
    </form>
  );
}

interface UpdateGoalProgressFormProps {
  goal: EmployeeGoalWithUpdates;
  onSubmit: (data: { progress: number; notes: string }) => void;
  isLoading: boolean;
}

function UpdateGoalProgressForm({ goal, onSubmit, isLoading }: UpdateGoalProgressFormProps) {
  const [progress, setProgress] = useState(goal.progress_percentage);
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ progress, notes });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h4 className="font-medium mb-2">{goal.title}</h4>
        <p className="text-sm text-muted-foreground">{goal.description}</p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <Label>نسبة الإنجاز</Label>
          <span className="text-primary font-bold">{progress}%</span>
        </div>
        <Slider
          value={[progress]}
          onValueChange={([value]) => setProgress(value)}
          min={0}
          max={100}
          step={5}
        />
      </div>

      <div className="space-y-2">
        <Label>ملاحظات التحديث</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="ما الذي تم إنجازه؟"
          rows={3}
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'جاري التحديث...' : 'تحديث التقدم'}
      </Button>
    </form>
  );
}
