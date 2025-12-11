/**
 * 📈 Performance Review Card Component - مكون بطاقة تقييم الأداء
 */

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Star,
  StarHalf,
  Target,
  TrendingUp,
  Calendar,
  User,
  CheckCircle,
  Clock,
  Edit,
  Eye,
} from 'lucide-react';
import type { PerformanceReviewWithDetails, EmployeeGoalWithUpdates } from '@/types/hr/performance';

// ============================================
// Performance Review Card
// ============================================

interface PerformanceReviewCardProps {
  review: PerformanceReviewWithDetails;
  onView?: () => void;
  onEdit?: () => void;
  compact?: boolean;
}

export function PerformanceReviewCard({
  review,
  onView,
  onEdit,
  compact = false,
}: PerformanceReviewCardProps) {
  const statusConfig = {
    draft: { label: 'مسودة', variant: 'secondary' as const, color: 'text-gray-500' },
    submitted: { label: 'مقدم', variant: 'outline' as const, color: 'text-blue-500' },
    acknowledged: { label: 'معتمد', variant: 'default' as const, color: 'text-green-500' },
  };

  const status = statusConfig[review.status] || statusConfig.draft;

  if (compact) {
    return (
      <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onView}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={review.employee?.avatar_url} />
                <AvatarFallback>{review.employee?.name?.charAt(0) || '?'}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{review.employee?.name}</p>
                <p className="text-xs text-muted-foreground">{review.period?.name}</p>
              </div>
            </div>
            <div className="text-center">
              <ScoreDisplay score={review.overall_score} size="sm" />
              <Badge variant={status.variant} className="mt-1">{status.label}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={review.employee?.avatar_url} />
              <AvatarFallback>{review.employee?.name?.charAt(0) || '?'}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-lg">{review.employee?.name}</p>
              <p className="text-sm text-muted-foreground">{review.employee?.job_title}</p>
            </div>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* فترة التقييم */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{review.period?.name || 'تقييم الأداء'}</span>
        </div>

        {/* التقييم الإجمالي */}
        <div className="text-center p-6 bg-muted/50 rounded-lg">
          <ScoreDisplay score={review.overall_score} size="lg" />
          <p className="text-sm text-muted-foreground mt-2">التقييم الإجمالي</p>
        </div>

        {/* تفاصيل التقييم */}
        {review.criteria_scores && review.criteria_scores.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">تفاصيل التقييم</h4>
            {review.criteria_scores.slice(0, 3).map((criterion, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{criterion.criteria?.name_ar || criterion.criteria?.name}</span>
                  <span className="font-medium">{criterion.score}/5</span>
                </div>
                <Progress value={(criterion.score / 5) * 100} className="h-1.5" />
              </div>
            ))}
            {review.criteria_scores.length > 3 && (
              <p className="text-xs text-muted-foreground text-center">
                +{review.criteria_scores.length - 3} معايير أخرى
              </p>
            )}
          </div>
        )}

        {/* نقاط القوة والضعف */}
        {(review.strengths || review.improvements) && (
          <>
            <Separator />
            <div className="grid grid-cols-2 gap-4 text-sm">
              {review.strengths && (
                <div>
                  <p className="font-medium text-green-600 mb-1">نقاط القوة</p>
                  <p className="text-muted-foreground line-clamp-2">{review.strengths}</p>
                </div>
              )}
              {review.improvements && (
                <div>
                  <p className="font-medium text-orange-600 mb-1">نقاط التحسين</p>
                  <p className="text-muted-foreground line-clamp-2">{review.improvements}</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* المقيّم */}
        {review.reviewer && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
            <User className="h-4 w-4" />
            <span>المقيّم: {review.reviewer.name}</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="gap-2">
        {onView && (
          <Button variant="outline" className="flex-1" onClick={onView}>
            <Eye className="h-4 w-4 ml-2" />
            عرض التفاصيل
          </Button>
        )}
        {onEdit && review.status === 'draft' && (
          <Button className="flex-1" onClick={onEdit}>
            <Edit className="h-4 w-4 ml-2" />
            تعديل
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

// ============================================
// Goal Card Component
// ============================================

interface GoalCardProps {
  goal: EmployeeGoalWithUpdates;
  onUpdateProgress?: () => void;
  onView?: () => void;
}

export function GoalCard({ goal, onUpdateProgress, onView }: GoalCardProps) {
  const statusConfig = {
    pending: { label: 'لم يبدأ', variant: 'secondary' as const, color: 'text-gray-500' },
    in_progress: { label: 'قيد التنفيذ', variant: 'outline' as const, color: 'text-blue-500' },
    completed: { label: 'مكتمل', variant: 'default' as const, color: 'text-green-500' },
    cancelled: { label: 'ملغي', variant: 'destructive' as const, color: 'text-red-500' },
  };

  const status = statusConfig[goal.status] || statusConfig.pending;
  const isOverdue = goal.due_date && new Date(goal.due_date) < new Date() && goal.status !== 'completed';

  return (
    <Card className={isOverdue ? 'border-red-200 dark:border-red-800' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Target className={`h-5 w-5 ${status.color}`} />
            <CardTitle className="text-base">{goal.title}</CardTitle>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* الوصف */}
        {goal.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{goal.description}</p>
        )}

        {/* شريط التقدم */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>التقدم</span>
            <span className="font-medium">{goal.progress_percentage}%</span>
          </div>
          <Progress
            value={goal.progress_percentage}
            className={`h-2 ${isOverdue ? 'bg-red-100' : ''}`}
          />
        </div>

        {/* التواريخ */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>البداية: {formatDate(goal.start_date)}</span>
          </div>
          <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : ''}`}>
            <Clock className="h-3 w-3" />
            <span>الانتهاء: {formatDate(goal.due_date)}</span>
          </div>
        </div>

        {/* آخر تحديث */}
        {goal.updates && goal.updates.length > 0 && (
          <div className="p-2 bg-muted/50 rounded text-sm">
            <p className="text-xs text-muted-foreground mb-1">آخر تحديث</p>
            <p className="line-clamp-2">{goal.updates[0].notes}</p>
          </div>
        )}
      </CardContent>

      <CardFooter className="gap-2">
        {onView && (
          <Button variant="outline" size="sm" className="flex-1" onClick={onView}>
            <Eye className="h-4 w-4 ml-2" />
            التفاصيل
          </Button>
        )}
        {onUpdateProgress && goal.status === 'in_progress' && (
          <Button size="sm" className="flex-1" onClick={onUpdateProgress}>
            <TrendingUp className="h-4 w-4 ml-2" />
            تحديث التقدم
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

// ============================================
// Score Display Component
// ============================================

interface ScoreDisplayProps {
  score: number | null;
  size?: 'sm' | 'md' | 'lg';
}

export function ScoreDisplay({ score, size = 'md' }: ScoreDisplayProps) {
  if (score === null || score === undefined) {
    return <span className="text-muted-foreground">-</span>;
  }

  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-3xl',
    lg: 'text-4xl',
  };

  const getScoreColor = (s: number) => {
    if (s >= 4) return 'text-green-500';
    if (s >= 3) return 'text-blue-500';
    if (s >= 2) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreLabel = (s: number) => {
    if (s >= 4.5) return 'ممتاز';
    if (s >= 3.5) return 'جيد جداً';
    if (s >= 2.5) return 'جيد';
    if (s >= 1.5) return 'مقبول';
    return 'ضعيف';
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-1">
        <span className={`font-bold ${sizeClasses[size]} ${getScoreColor(score)}`}>
          {score.toFixed(1)}
        </span>
        <span className="text-muted-foreground">/5</span>
      </div>
      <div className="flex gap-0.5 mt-1">
        {[1, 2, 3, 4, 5].map((star) => {
          if (score >= star) {
            return <Star key={star} className={`h-4 w-4 fill-yellow-400 text-yellow-400`} />;
          } else if (score >= star - 0.5) {
            return <StarHalf key={star} className={`h-4 w-4 fill-yellow-400 text-yellow-400`} />;
          } else {
            return <Star key={star} className={`h-4 w-4 text-gray-300`} />;
          }
        })}
      </div>
      {size === 'lg' && (
        <p className={`text-sm mt-1 ${getScoreColor(score)}`}>{getScoreLabel(score)}</p>
      )}
    </div>
  );
}

// ============================================
// Goals List Component
// ============================================

interface GoalsListProps {
  goals: EmployeeGoalWithUpdates[];
  isLoading?: boolean;
  onUpdateProgress?: (goalId: string) => void;
  onView?: (goalId: string) => void;
  emptyMessage?: string;
}

export function GoalsList({
  goals,
  isLoading,
  onUpdateProgress,
  onView,
  emptyMessage = 'لا توجد أهداف',
}: GoalsListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-5 w-32 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-2 w-full bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="text-center py-12">
        <Target className="h-12 w-12 mx-auto text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {goals.map((goal) => (
        <GoalCard
          key={goal.id}
          goal={goal}
          onUpdateProgress={onUpdateProgress ? () => onUpdateProgress(goal.id) : undefined}
          onView={onView ? () => onView(goal.id) : undefined}
        />
      ))}
    </div>
  );
}

// ============================================
// Utility Functions
// ============================================

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ar-SA', {
    day: 'numeric',
    month: 'short',
  });
}

export default PerformanceReviewCard;
