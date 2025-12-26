/**
 * ==========================================
 * 📊 جدول اقتراحاتي - My Suggestions Table
 * ==========================================
 * عرض اقتراحات المستخدم منظمة حسب الحالة
 */

import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, ThumbsUp, MessageSquare, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStatusConfig, getCategoryConfig, getPriorityConfig } from '@/lib/feature-suggestions-config';
import type { FeatureSuggestionDetailed } from '@/types/feature-suggestions';
import { fetchSuggestions } from '@/api/featureSuggestionsService';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { formatUserName, formatHijriDate, toArabicNumbers } from '@/lib/feature-suggestions-utils';

interface MySuggestionsTableProps {
  onViewDetails?: (suggestion: FeatureSuggestionDetailed) => void;
}

export default function MySuggestionsTable({ onViewDetails }: MySuggestionsTableProps) {
  const { user } = useAuth();
  const { currentOrganization } = useTenant();
  const [mySuggestions, setMySuggestions] = useState<FeatureSuggestionDetailed[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMySuggestions();
  }, [user, currentOrganization]);

  const loadMySuggestions = async () => {
    if (!user || !currentOrganization) return;

    try {
      setIsLoading(true);
      const result = await fetchSuggestions(currentOrganization.id, {
        user_id: user.id,
        sort_by: 'created_at',
        sort_order: 'desc'
      });
      setMySuggestions(result.data);
    } catch (error) {
      console.error('خطأ في جلب اقتراحاتي:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // تجميع الاقتراحات حسب الحالة - يمكن استخدامها لعرض ملخص أو تصفية
  const groupedSuggestions = {
    pending: mySuggestions.filter(s => s.status === 'pending'),
    under_review: mySuggestions.filter(s => s.status === 'under_review'),
    planned: mySuggestions.filter(s => s.status === 'planned'),
    in_progress: mySuggestions.filter(s => s.status === 'in_progress'),
    completed: mySuggestions.filter(s => s.status === 'completed'),
    rejected: mySuggestions.filter(s => s.status === 'rejected'),
    duplicate: mySuggestions.filter(s => s.status === 'duplicate'),
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (mySuggestions.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-white/10 rounded-xl bg-slate-900/30">
        <p className="text-slate-400">لم تقم بإضافة أي اقتراحات بعد</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/50 rounded-lg p-4 border border-white/5">
          <p className="text-xs text-slate-400 mb-1">إجمالي اقتراحاتي</p>
          <p className="text-2xl font-bold text-white">{toArabicNumbers(mySuggestions.length.toString())}</p>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-4 border border-white/5">
          <p className="text-xs text-slate-400 mb-1">قيد المراجعة</p>
          <p className="text-2xl font-bold text-yellow-500">{toArabicNumbers(groupedSuggestions.under_review.length.toString())}</p>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-4 border border-white/5">
          <p className="text-xs text-slate-400 mb-1">قيد التنفيذ</p>
          <p className="text-2xl font-bold text-blue-500">{toArabicNumbers(groupedSuggestions.in_progress.length.toString())}</p>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-4 border border-white/5">
          <p className="text-xs text-slate-400 mb-1">مكتملة</p>
          <p className="text-2xl font-bold text-green-500">{toArabicNumbers(groupedSuggestions.completed.length.toString())}</p>
        </div>
      </div>

      {/* جدول الاقتراحات */}
      <div className="rounded-xl border border-white/10 overflow-hidden bg-slate-900/20">
        <Table>
          <TableHeader className="bg-slate-900/50">
            <TableRow className="bg-transparent hover:bg-transparent border-white/10">
              <TableHead className="w-[40%] text-slate-300">العنوان</TableHead>
              <TableHead className="text-slate-300">الفئة</TableHead>
              <TableHead className="text-slate-300">الحالة</TableHead>
              <TableHead className="text-slate-300">الأولوية</TableHead>
              <TableHead className="text-center text-slate-300">التصويتات</TableHead>
              <TableHead className="text-center text-slate-300">التعليقات</TableHead>
              <TableHead className="text-slate-300">التاريخ</TableHead>
              <TableHead className="text-center text-slate-300">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mySuggestions.map((suggestion) => {
              const statusConfig = getStatusConfig(suggestion.status);
              const categoryConfig = getCategoryConfig(suggestion.category);
              const priorityConfig = getPriorityConfig(suggestion.priority);

              return (
                <TableRow key={suggestion.id} className="hover:bg-white/5 border-white/5 transition-colors">
                  <TableCell className="font-medium text-slate-200">
                    <div>
                      <p className="font-semibold line-clamp-1">{suggestion.title}</p>
                      <p className="text-xs text-slate-400 line-clamp-1">
                        {suggestion.description}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs border-0',
                        categoryConfig.color,
                        categoryConfig.bgColor
                      )}
                    >
                      {categoryConfig.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs border-0',
                        statusConfig.color,
                        statusConfig.bgColor
                      )}
                    >
                      {statusConfig.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs border-0',
                        priorityConfig.color,
                        priorityConfig.bgColor
                      )}
                    >
                      {priorityConfig.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <ThumbsUp className="h-3 w-3 text-slate-500" />
                      <span className="text-sm text-slate-300">{toArabicNumbers(suggestion.votes_count.toString())}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <MessageSquare className="h-3 w-3 text-slate-500" />
                      <span className="text-sm text-slate-300">{toArabicNumbers(suggestion.comments_count.toString())}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Calendar className="h-3 w-3" />
                      {formatHijriDate(suggestion.created_at)}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails?.(suggestion)}
                      className="text-slate-400 hover:text-white hover:bg-white/10"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* ملاحظات الإدارة إن وجدت */}
      {mySuggestions.some(s => s.admin_notes) && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-white">ملاحظات الإدارة</h3>
          {mySuggestions
            .filter(s => s.admin_notes)
            .map((suggestion) => (
              <div
                key={suggestion.id}
                className="p-4 bg-orange-500/10 rounded-xl border border-orange-500/20"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-orange-500/20 text-orange-400 border-0">{suggestion.title}</Badge>
                </div>
                <p className="text-sm text-slate-300">{suggestion.admin_notes}</p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
