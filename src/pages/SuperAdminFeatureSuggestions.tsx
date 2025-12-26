/**
 * ==========================================
 * 🔐 صفحة Super Admin - اقتراحات الميزات
 * ==========================================
 * التحكم الكامل بجميع الاقتراحات عبر جميع المؤسسات
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Search,
  Filter,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Lightbulb,
  MessageSquare,
  ThumbsUp,
  Edit,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CATEGORIES, STATUSES, PRIORITIES, getStatusConfig, getCategoryConfig, getPriorityConfig } from '@/lib/feature-suggestions-config';
import type { FeatureSuggestionDetailed, SuggestionStatus, SuggestionCategory, SuggestionPriority } from '@/types/feature-suggestions';
import { formatUserName, getInitials, formatHijriDate, formatHijriDateTime, toArabicNumbers } from '@/lib/feature-suggestions-utils';

export default function SuperAdminFeatureSuggestions() {
  const { userProfile } = useAuth();
  const [suggestions, setSuggestions] = useState<FeatureSuggestionDetailed[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedSuggestion, setSelectedSuggestion] = useState<FeatureSuggestionDetailed | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditStatusOpen, setIsEditStatusOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<SuggestionStatus>('pending');
  const [editingPriority, setEditingPriority] = useState<SuggestionPriority>('medium');
  const [adminNotes, setAdminNotes] = useState('');

  // التحقق من صلاحيات Super Admin
  if (!userProfile?.is_super_admin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">غير مصرح</h1>
          <p className="text-muted-foreground">أنت بحاجة إلى صلاحيات Super Admin للوصول إلى هذه الصفحة</p>
        </div>
      </div>
    );
  }

  // جلب جميع الاقتراحات من جميع المؤسسات
  const fetchAllSuggestions = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('feature_suggestions_detailed')
        .select('*')
        .order('created_at', { ascending: false });

      // تطبيق الفلاتر
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }
      if (priorityFilter !== 'all') {
        query = query.eq('priority', priorityFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // البحث في العنوان والوصف
      let filtered = data || [];
      if (searchTerm) {
        filtered = filtered.filter(s =>
          s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      setSuggestions(filtered as FeatureSuggestionDetailed[]);
    } catch (error) {
      console.error('خطأ في جلب الاقتراحات:', error);
      toast.error('فشل جلب الاقتراحات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllSuggestions();
  }, [statusFilter, categoryFilter, priorityFilter]);

  // البحث عند تغيير النص
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAllSuggestions();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // حذف اقتراح
  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الاقتراح؟ هذا الإجراء لا يمكن التراجع عنه.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('feature_suggestions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('تم حذف الاقتراح بنجاح');
      fetchAllSuggestions();
      if (selectedSuggestion?.id === id) {
        setIsDetailsOpen(false);
        setSelectedSuggestion(null);
      }
    } catch (error) {
      console.error('خطأ في حذف الاقتراح:', error);
      toast.error('فشل حذف الاقتراح');
    }
  };

  // تحديث حالة الاقتراح
  const handleUpdateStatus = async () => {
    if (!selectedSuggestion) return;

    try {
      const updateData: any = {
        status: editingStatus,
        priority: editingPriority,
        status_updated_at: new Date().toISOString()
      };

      if (adminNotes) {
        updateData.admin_notes = adminNotes;
      }

      const { error } = await supabase
        .from('feature_suggestions')
        .update(updateData)
        .eq('id', selectedSuggestion.id);

      if (error) throw error;

      toast.success('تم تحديث الاقتراح بنجاح');
      setIsEditStatusOpen(false);
      setAdminNotes('');
      fetchAllSuggestions();
    } catch (error) {
      console.error('خطأ في تحديث الاقتراح:', error);
      toast.error('فشل تحديث الاقتراح');
    }
  };

  // فتح تفاصيل الاقتراح
  const openDetails = (suggestion: FeatureSuggestionDetailed) => {
    setSelectedSuggestion(suggestion);
    setEditingStatus(suggestion.status);
    setEditingPriority(suggestion.priority);
    setAdminNotes(suggestion.admin_notes || '');
    setIsDetailsOpen(true);
  };

  // فتح نافذة تعديل الحالة
  const openEditStatus = (suggestion: FeatureSuggestionDetailed) => {
    setSelectedSuggestion(suggestion);
    setEditingStatus(suggestion.status);
    setEditingPriority(suggestion.priority);
    setAdminNotes(suggestion.admin_notes || '');
    setIsEditStatusOpen(true);
  };

  return (
    <div className="min-h-screen bg-background p-6" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-xl bg-orange-500/10 dark:bg-orange-500/20">
            <Lightbulb className="h-8 w-8 text-orange-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Super Admin - اقتراحات الميزات</h1>
            <p className="text-muted-foreground">التحكم الكامل بجميع الاقتراحات عبر جميع المؤسسات</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap gap-4">
          {/* البحث */}
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث في العنوان أو الوصف..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>

          {/* فلتر الحالة */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-background border-border">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              {Object.values(STATUSES).map(status => (
                <SelectItem key={status.id} value={status.id}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* فلتر الفئة */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px] bg-background border-border">
              <SelectValue placeholder="الفئة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الفئات</SelectItem>
              {Object.values(CATEGORIES).map(category => (
                <SelectItem key={category.id} value={category.id}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* فلتر الأولوية */}
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[180px] bg-background border-border">
              <SelectValue placeholder="الأولوية" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأولويات</SelectItem>
              {Object.values(PRIORITIES).map(priority => (
                <SelectItem key={priority.id} value={priority.id}>
                  {priority.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* إحصائيات */}
        <div className="flex gap-4 flex-wrap">
          <div className="bg-card rounded-lg p-4 border">
            <p className="text-sm text-muted-foreground mb-1">إجمالي الاقتراحات</p>
            <p className="text-2xl font-bold">{toArabicNumbers(suggestions.length.toString())}</p>
          </div>
          <div className="bg-card rounded-lg p-4 border">
            <p className="text-sm text-muted-foreground mb-1">قيد الانتظار</p>
            <p className="text-2xl font-bold text-gray-500">
              {toArabicNumbers(suggestions.filter(s => s.status === 'pending').length.toString())}
            </p>
          </div>
          <div className="bg-card rounded-lg p-4 border">
            <p className="text-sm text-muted-foreground mb-1">قيد التنفيذ</p>
            <p className="text-2xl font-bold text-purple-500">
              {toArabicNumbers(suggestions.filter(s => s.status === 'in_progress').length.toString())}
            </p>
          </div>
          <div className="bg-card rounded-lg p-4 border">
            <p className="text-sm text-muted-foreground mb-1">مكتملة</p>
            <p className="text-2xl font-bold text-green-500">
              {toArabicNumbers(suggestions.filter(s => s.status === 'completed').length.toString())}
            </p>
          </div>
        </div>
      </div>

      {/* قائمة الاقتراحات */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
        </div>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-12">
          <Lightbulb className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-lg text-muted-foreground">لا توجد اقتراحات</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {suggestions.map((suggestion) => {
            const statusConfig = getStatusConfig(suggestion.status);
            const categoryConfig = getCategoryConfig(suggestion.category);
            const priorityConfig = getPriorityConfig(suggestion.priority);

            return (
              <div
                key={suggestion.id}
                className="bg-card rounded-lg border p-6 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* العنوان والشارات */}
                    <div className="flex items-start gap-3 mb-3">
                      <h3 className="text-lg font-bold flex-1 text-foreground">{suggestion.title}</h3>
                      <Badge className={cn('text-xs', statusConfig.color, statusConfig.bgColor)}>
                        {statusConfig.label}
                      </Badge>
                      <Badge className={cn('text-xs', priorityConfig.color, priorityConfig.bgColor)}>
                        {priorityConfig.label}
                      </Badge>
                    </div>

                    {/* الوصف */}
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {suggestion.description}
                    </p>

                    {/* المعلومات */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <span className={cn('px-2 py-1 rounded-md', categoryConfig.bgColor, categoryConfig.color)}>
                          {categoryConfig.label}
                        </span>
                      </span>
                      <span>المؤسسة: {suggestion.organization_id}</span>
                      <span>بواسطة: {formatUserName(suggestion.user_name)}</span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3" />
                        {toArabicNumbers(suggestion.votes_count.toString())} تصويت
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {toArabicNumbers(suggestion.comments_count.toString())} تعليق
                      </span>
                      <span>{formatHijriDate(suggestion.created_at)}</span>
                    </div>
                  </div>

                  {/* الإجراءات */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDetails(suggestion)}
                    >
                      <Eye className="h-4 w-4 ml-2" />
                      عرض
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditStatus(suggestion)}
                    >
                      <Edit className="h-4 w-4 ml-2" />
                      تعديل
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(suggestion.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* ملاحظات الإدارة */}
                {suggestion.admin_notes && (
                  <div className="mt-4 p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                    <p className="text-xs font-semibold text-orange-500 mb-1">ملاحظات الإدارة:</p>
                    <p className="text-sm">{suggestion.admin_notes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* نافذة التفاصيل */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل الاقتراح</DialogTitle>
          </DialogHeader>
          {selectedSuggestion && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold mb-2">{selectedSuggestion.title}</h3>
                <p className="text-muted-foreground">{selectedSuggestion.description}</p>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Badge className={cn(getStatusConfig(selectedSuggestion.status).color, getStatusConfig(selectedSuggestion.status).bgColor)}>
                  {getStatusConfig(selectedSuggestion.status).label}
                </Badge>
                <Badge className={cn(getCategoryConfig(selectedSuggestion.category).color, getCategoryConfig(selectedSuggestion.category).bgColor)}>
                  {getCategoryConfig(selectedSuggestion.category).label}
                </Badge>
                <Badge className={cn(getPriorityConfig(selectedSuggestion.priority).color, getPriorityConfig(selectedSuggestion.priority).bgColor)}>
                  {getPriorityConfig(selectedSuggestion.priority).label}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">المؤسسة</p>
                  <p className="font-medium">{selectedSuggestion.organization_id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">بواسطة</p>
                  <p className="font-medium">{formatUserName(selectedSuggestion.user_name)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">التصويتات</p>
                  <p className="font-medium">{toArabicNumbers(selectedSuggestion.votes_count.toString())}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">التعليقات</p>
                  <p className="font-medium">{toArabicNumbers(selectedSuggestion.comments_count.toString())}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">تاريخ الإنشاء</p>
                  <p className="font-medium">{formatHijriDateTime(selectedSuggestion.created_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">آخر تحديث</p>
                  <p className="font-medium">{formatHijriDateTime(selectedSuggestion.updated_at)}</p>
                </div>
              </div>

              {selectedSuggestion.admin_notes && (
                <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                  <p className="text-xs font-semibold text-orange-500 mb-1">ملاحظات الإدارة:</p>
                  <p className="text-sm">{selectedSuggestion.admin_notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* نافذة تعديل الحالة */}
      <Dialog open={isEditStatusOpen} onOpenChange={setIsEditStatusOpen}>
        <DialogContent className="bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">تعديل الاقتراح</DialogTitle>
            <DialogDescription>
              قم بتحديث حالة وأولوية الاقتراح وإضافة ملاحظات
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* الحالة */}
            <div>
              <label className="text-sm font-medium mb-2 block">الحالة</label>
              <Select value={editingStatus} onValueChange={(value) => setEditingStatus(value as SuggestionStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(STATUSES).map(status => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* الأولوية */}
            <div>
              <label className="text-sm font-medium mb-2 block">الأولوية</label>
              <Select value={editingPriority} onValueChange={(value) => setEditingPriority(value as SuggestionPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PRIORITIES).map(priority => (
                    <SelectItem key={priority.id} value={priority.id}>
                      {priority.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ملاحظات الإدارة */}
            <div>
              <label className="text-sm font-medium mb-2 block">ملاحظات الإدارة</label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="أضف ملاحظات للمستخدمين..."
                rows={4}
              />
            </div>

            {/* الأزرار */}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsEditStatusOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleUpdateStatus}>
                حفظ التغييرات
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
