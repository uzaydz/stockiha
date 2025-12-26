/**
 * ==========================================
 * 💡 صفحة اقتراحات الميزات - Feature Suggestions Page
 * ==========================================
 * صفحة متكاملة لعرض الاقتراحات، التصويت، والتعليق
 * مع تصميم أنيق ومتناسق مع تصميم الموقع الأساسي
 */

import React, { useState, useEffect } from 'react';
import {
  Lightbulb,
  Plus,
  Search,
  Filter,
  TrendingUp,
  Clock,
  MessageSquare,
  ThumbsUp,
  Send,
  X,
  Edit2,
  Trash2,
  Eye,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import type {
  FeatureSuggestionDetailed,
  CreateSuggestionInput,
  FeatureComment,
  SuggestionCategory,
  SuggestionStatus
} from '@/types/feature-suggestions';
import {
  fetchSuggestions,
  createSuggestion,
  voteSuggestion,
  unvoteSuggestion,
  fetchComments,
  createComment,
  fetchStatsSummary
} from '@/api/featureSuggestionsService';
import {
  CATEGORIES,
  STATUSES,
  PRIORITIES,
  getCategoryConfig,
  getStatusConfig,
  getPriorityConfig
} from '@/lib/feature-suggestions-config';

/**
 * ==========================================
 * 🎨 المكون الرئيسي
 * ==========================================
 */
export default function FeatureSuggestionsPage() {
  const { user } = useAuth();
  const { currentOrganization } = useTenant();

  // الحالة
  const [suggestions, setSuggestions] = useState<FeatureSuggestionDetailed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SuggestionCategory | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<SuggestionStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'votes' | 'recent' | 'comments'>('votes');

  // إحصائيات
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    total_votes: 0
  });

  // نافذة إنشاء اقتراح
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newSuggestion, setNewSuggestion] = useState<CreateSuggestionInput>({
    title: '',
    description: '',
    category: 'pos',
    priority: 'medium'
  });

  // نافذة عرض تفاصيل الاقتراح
  const [selectedSuggestion, setSelectedSuggestion] = useState<FeatureSuggestionDetailed | null>(null);
  const [comments, setComments] = useState<FeatureComment[]>([]);
  const [newComment, setNewComment] = useState('');

  // ==========================================
  // تحميل البيانات
  // ==========================================
  useEffect(() => {
    if (currentOrganization?.id) {
      loadSuggestions();
      loadStats();
    }
  }, [currentOrganization, selectedCategory, selectedStatus, sortBy, searchQuery]);

  const loadSuggestions = async () => {
    if (!currentOrganization?.id) return;

    setIsLoading(true);
    try {
      const result = await fetchSuggestions(currentOrganization.id, {
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        search: searchQuery || undefined,
        sort_by: sortBy === 'votes' ? 'votes_count' : sortBy === 'recent' ? 'created_at' : 'comments_count',
        sort_order: 'desc',
        limit: 50
      });

      setSuggestions(result.data);
    } catch (error) {
      console.error('خطأ في تحميل الاقتراحات:', error);
      toast.error('فشل تحميل الاقتراحات');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    if (!currentOrganization?.id) return;

    try {
      const summary = await fetchStatsSummary(currentOrganization.id);
      setStats(summary);
    } catch (error) {
      console.error('خطأ في تحميل الإحصائيات:', error);
    }
  };

  // ==========================================
  // إنشاء اقتراح جديد
  // ==========================================
  const handleCreateSuggestion = async () => {
    if (!currentOrganization?.id || !user) return;

    if (!newSuggestion.title.trim() || newSuggestion.title.length < 5) {
      toast.error('العنوان يجب أن يكون على الأقل 5 أحرف');
      return;
    }

    if (!newSuggestion.description.trim() || newSuggestion.description.length < 10) {
      toast.error('الوصف يجب أن يكون على الأقل 10 أحرف');
      return;
    }

    try {
      await createSuggestion(
        currentOrganization.id,
        user.id,
        user.email || 'مستخدم',
        newSuggestion
      );

      toast.success('تم إضافة الاقتراح بنجاح! ✨');
      setIsCreateDialogOpen(false);
      setNewSuggestion({
        title: '',
        description: '',
        category: 'pos',
        priority: 'medium'
      });
      loadSuggestions();
      loadStats();
    } catch (error) {
      console.error('خطأ في إنشاء الاقتراح:', error);
      toast.error('فشل إضافة الاقتراح');
    }
  };

  // ==========================================
  // التصويت
  // ==========================================
  const handleVote = async (suggestionId: string, currentlyVoted: boolean) => {
    if (!currentOrganization?.id || !user) return;

    try {
      if (currentlyVoted) {
        await unvoteSuggestion(suggestionId, user.id);
        toast.success('تم إلغاء التصويت');
      } else {
        await voteSuggestion(suggestionId, currentOrganization.id, user.id);
        toast.success('تم التصويت بنجاح! 👍');
      }

      loadSuggestions();
    } catch (error: any) {
      toast.error(error.message || 'فشل التصويت');
    }
  };

  // ==========================================
  // التعليقات
  // ==========================================
  const handleOpenDetails = async (suggestion: FeatureSuggestionDetailed) => {
    setSelectedSuggestion(suggestion);

    try {
      const suggestionComments = await fetchComments(suggestion.id);
      setComments(suggestionComments);
    } catch (error) {
      console.error('خطأ في تحميل التعليقات:', error);
    }
  };

  const handleAddComment = async () => {
    if (!selectedSuggestion || !currentOrganization?.id || !user) return;

    if (!newComment.trim()) {
      toast.error('لا يمكن إضافة تعليق فارغ');
      return;
    }

    try {
      await createComment(
        currentOrganization.id,
        user.id,
        user.email || 'مستخدم',
        {
          suggestion_id: selectedSuggestion.id,
          comment: newComment
        }
      );

      toast.success('تم إضافة التعليق بنجاح!');
      setNewComment('');

      // إعادة تحميل التعليقات
      const updatedComments = await fetchComments(selectedSuggestion.id);
      setComments(updatedComments);
      loadSuggestions();
    } catch (error) {
      console.error('خطأ في إضافة التعليق:', error);
      toast.error('فشل إضافة التعليق');
    }
  };

  // ==========================================
  // العرض
  // ==========================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pt-16 pb-8">
      <div className="container mx-auto px-4 max-w-7xl">

        {/* 🎨 الهيدر */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/20">
              <Lightbulb className="h-7 w-7 text-orange-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">اقتراحات الميزات</h1>
              <p className="text-slate-400 text-sm">شاركنا أفكارك لتطوير المنصة</p>
            </div>
          </div>

          {/* 📊 الإحصائيات السريعة */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">إجمالي الاقتراحات</p>
                    <p className="text-2xl font-bold text-white">{stats.total}</p>
                  </div>
                  <Sparkles className="h-8 w-8 text-orange-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">قيد الانتظار</p>
                    <p className="text-2xl font-bold text-white">{stats.pending}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">مكتملة</p>
                    <p className="text-2xl font-bold text-white">{stats.completed}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">إجمالي الأصوات</p>
                    <p className="text-2xl font-bold text-white">{stats.total_votes}</p>
                  </div>
                  <ThumbsUp className="h-8 w-8 text-blue-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 🔍 البحث والتصفية */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="ابحث عن اقتراح..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-orange-500/50"
              />
            </div>

            <Select value={selectedCategory} onValueChange={(val) => setSelectedCategory(val as any)}>
              <SelectTrigger className="w-full md:w-[180px] bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="الفئة" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                <SelectItem value="all">جميع الفئات</SelectItem>
                {Object.values(CATEGORIES).map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={(val) => setSelectedStatus(val as any)}>
              <SelectTrigger className="w-full md:w-[180px] bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                <SelectItem value="all">جميع الحالات</SelectItem>
                {Object.values(STATUSES).map(status => (
                  <SelectItem key={status.id} value={status.id}>{status.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(val) => setSortBy(val as any)}>
              <SelectTrigger className="w-full md:w-[180px] bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="الترتيب" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                <SelectItem value="votes">الأكثر تصويتاً</SelectItem>
                <SelectItem value="recent">الأحدث</SelectItem>
                <SelectItem value="comments">الأكثر تعليقاً</SelectItem>
              </SelectContent>
            </Select>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white gap-2">
                  <Plus className="h-4 w-4" />
                  <span className="hidden md:inline">اقتراح جديد</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl flex items-center gap-2">
                    <Lightbulb className="h-6 w-6 text-orange-500" />
                    اقتراح ميزة جديدة
                  </DialogTitle>
                  <DialogDescription className="text-slate-400">
                    شاركنا فكرتك لتطوير المنصة وجعلها أفضل
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-2 block">العنوان *</label>
                    <Input
                      placeholder="مثال: إضافة تقارير مفصلة للمبيعات اليومية"
                      value={newSuggestion.title}
                      onChange={(e) => setNewSuggestion({ ...newSuggestion, title: e.target.value })}
                      className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-2 block">الوصف *</label>
                    <Textarea
                      placeholder="اشرح فكرتك بالتفصيل... ما الفائدة منها؟ كيف ستحسّن تجربة الاستخدام؟"
                      value={newSuggestion.description}
                      onChange={(e) => setNewSuggestion({ ...newSuggestion, description: e.target.value })}
                      className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 min-h-[120px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-300 mb-2 block">الفئة</label>
                      <Select value={newSuggestion.category} onValueChange={(val) => setNewSuggestion({ ...newSuggestion, category: val as any })}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700">
                          {Object.values(CATEGORIES).map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-300 mb-2 block">الأولوية</label>
                      <Select value={newSuggestion.priority} onValueChange={(val) => setNewSuggestion({ ...newSuggestion, priority: val as any })}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700">
                          {Object.values(PRIORITIES).map(priority => (
                            <SelectItem key={priority.id} value={priority.id}>{priority.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsCreateDialogOpen(false)} className="text-slate-400 hover:text-white">
                    إلغاء
                  </Button>
                  <Button onClick={handleCreateSuggestion} className="bg-orange-500 hover:bg-orange-600 text-white">
                    إضافة الاقتراح
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* 📋 قائمة الاقتراحات */}
        <div className="grid gap-4">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-slate-400">جاري التحميل...</p>
            </div>
          ) : suggestions.length === 0 ? (
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardContent className="py-12 text-center">
                <Lightbulb className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 text-lg mb-2">لا توجد اقتراحات بعد</p>
                <p className="text-slate-500 text-sm">كن أول من يقترح ميزة جديدة!</p>
              </CardContent>
            </Card>
          ) : (
            suggestions.map((suggestion) => {
              const categoryConfig = getCategoryConfig(suggestion.category);
              const statusConfig = getStatusConfig(suggestion.status);
              const priorityConfig = getPriorityConfig(suggestion.priority);

              return (
                <Card key={suggestion.id} className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 group">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={cn("text-xs", categoryConfig.bgColor, categoryConfig.color)}>
                            {categoryConfig.label}
                          </Badge>
                          <Badge className={cn("text-xs", statusConfig.bgColor, statusConfig.color)}>
                            {statusConfig.label}
                          </Badge>
                          <Badge className={cn("text-xs", priorityConfig.bgColor, priorityConfig.color)}>
                            {priorityConfig.label}
                          </Badge>
                        </div>
                        <CardTitle className="text-white text-lg mb-2 group-hover:text-orange-400 transition-colors cursor-pointer" onClick={() => handleOpenDetails(suggestion)}>
                          {suggestion.title}
                        </CardTitle>
                        <CardDescription className="text-slate-400 line-clamp-2">
                          {suggestion.description}
                        </CardDescription>
                      </div>

                      {/* زر التصويت */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleVote(suggestion.id, suggestion.user_has_voted || false)}
                        className={cn(
                          "flex-col h-auto py-2 px-3 gap-1 transition-all",
                          suggestion.user_has_voted
                            ? "bg-orange-500/20 text-orange-500 hover:bg-orange-500/30"
                            : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <ThumbsUp className={cn("h-5 w-5", suggestion.user_has_voted && "fill-current")} />
                        <span className="text-xs font-bold">{suggestion.votes_count}</span>
                      </Button>
                    </div>
                  </CardHeader>

                  <CardFooter className="border-t border-white/5 pt-4">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span>بواسطة {suggestion.user_name}</span>
                        <span>•</span>
                        <span>{new Date(suggestion.created_at).toLocaleDateString('ar-DZ')}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDetails(suggestion)} className="text-slate-400 hover:text-white gap-2">
                          <MessageSquare className="h-4 w-4" />
                          <span className="text-xs">{suggestion.comments_count}</span>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDetails(suggestion)} className="text-slate-400 hover:text-orange-400 gap-2">
                          <Eye className="h-4 w-4" />
                          <span className="text-xs">عرض</span>
                        </Button>
                      </div>
                    </div>
                  </CardFooter>
                </Card>
              );
            })
          )}
        </div>

        {/* 🔍 نافذة التفاصيل */}
        <Dialog open={!!selectedSuggestion} onOpenChange={() => setSelectedSuggestion(null)}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedSuggestion && (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge className={cn("text-xs", getCategoryConfig(selectedSuggestion.category).bgColor, getCategoryConfig(selectedSuggestion.category).color)}>
                          {getCategoryConfig(selectedSuggestion.category).label}
                        </Badge>
                        <Badge className={cn("text-xs", getStatusConfig(selectedSuggestion.status).bgColor, getStatusConfig(selectedSuggestion.status).color)}>
                          {getStatusConfig(selectedSuggestion.status).label}
                        </Badge>
                        <Badge className={cn("text-xs", getPriorityConfig(selectedSuggestion.priority).bgColor, getPriorityConfig(selectedSuggestion.priority).color)}>
                          {getPriorityConfig(selectedSuggestion.priority).label}
                        </Badge>
                      </div>
                      <DialogTitle className="text-2xl mb-2">{selectedSuggestion.title}</DialogTitle>
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <span>بواسطة {selectedSuggestion.user_name}</span>
                        <span>•</span>
                        <span>{new Date(selectedSuggestion.created_at).toLocaleDateString('ar-DZ')}</span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => handleVote(selectedSuggestion.id, selectedSuggestion.user_has_voted || false)}
                      className={cn(
                        "flex-col h-auto py-3 px-4 gap-1",
                        selectedSuggestion.user_has_voted
                          ? "bg-orange-500/20 border-orange-500 text-orange-500 hover:bg-orange-500/30"
                          : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <ThumbsUp className={cn("h-6 w-6", selectedSuggestion.user_has_voted && "fill-current")} />
                      <span className="text-sm font-bold">{selectedSuggestion.votes_count}</span>
                    </Button>
                  </div>
                </DialogHeader>

                <div className="space-y-6 py-6">
                  <div>
                    <h3 className="text-sm font-medium text-slate-400 mb-2">الوصف</h3>
                    <p className="text-slate-200 whitespace-pre-wrap">{selectedSuggestion.description}</p>
                  </div>

                  <Separator className="bg-white/10" />

                  {/* التعليقات */}
                  <div>
                    <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-orange-500" />
                      التعليقات ({selectedSuggestion.comments_count})
                    </h3>

                    {/* نموذج إضافة تعليق */}
                    <div className="mb-6 bg-white/5 rounded-lg p-4 border border-white/10">
                      <Textarea
                        placeholder="أضف تعليقك..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="bg-transparent border-0 text-white placeholder:text-slate-500 mb-3 resize-none"
                        rows={3}
                      />
                      <div className="flex justify-end">
                        <Button onClick={handleAddComment} className="bg-orange-500 hover:bg-orange-600 text-white gap-2">
                          <Send className="h-4 w-4" />
                          إرسال
                        </Button>
                      </div>
                    </div>

                    {/* قائمة التعليقات */}
                    <div className="space-y-4">
                      {comments.length === 0 ? (
                        <p className="text-center text-slate-500 py-8">لا توجد تعليقات بعد</p>
                      ) : (
                        comments.map((comment) => (
                          <div key={comment.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                            <div className="flex items-start gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-orange-500/20 text-orange-500 text-xs">
                                  {comment.user_name[0].toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-white text-sm">{comment.user_name}</span>
                                  <span className="text-xs text-slate-500">
                                    {new Date(comment.created_at).toLocaleDateString('ar-DZ')}
                                  </span>
                                  {comment.is_edited && (
                                    <Badge variant="outline" className="text-xs border-slate-600 text-slate-500">معدّل</Badge>
                                  )}
                                </div>
                                <p className="text-slate-300 text-sm">{comment.comment}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
