/**
 * ==========================================
 * 🌍 مركز الميزات العالمي (Global Feature Hub)
 * ==========================================
 * تصميم بمواصفات عالمية (Linear/Stripe/Vercel inspired).
 * المميزات:
 * - تواريخ ميلادية وأرقام قياسية (1, 2, 3)
 * - عرض مزدوج: قائمة (Feed) ولوحة (Roadmap)
 * - تفاعلات دقيقة ورسوم متحركة
 * - طباعة نظيفة تركز على المحتوى
 */

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  ArrowUp,
  MessageSquare,
  CheckCircle2,
  Clock,
  Circle,
  Loader2,
  ChevronDown,
  LayoutList,
  LayoutGrid,
  MoreHorizontal,
  Calendar,
  BarChart3,
  Grip,
  Flame,
  Zap,
  ArrowLeft
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
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import { motion, AnimatePresence } from 'framer-motion';

// API & Types
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
  checkUserVote,
} from '@/api/featureSuggestionsService';
import {
  CATEGORIES,
  PRIORITIES,
  getCategoryConfig,
  getStatusConfig,
} from '@/lib/feature-suggestions-config';
import { formatUserName, getInitials } from '@/lib/feature-suggestions-utils';

// --- Utils (Standard Global Formats) ---

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'الآن';
  if (diffInSeconds < 3600) return `منذ ${Math.floor(diffInSeconds / 60)} دقيقة`;
  if (diffInSeconds < 86400) return `منذ ${Math.floor(diffInSeconds / 3600)} ساعة`;
  if (diffInSeconds < 604800) return `منذ ${Math.floor(diffInSeconds / 86400)} يوم`;
  return formatDate(dateString);
};

// --- Sub-components ---

const StatusDot = ({ status, className }: { status: SuggestionStatus, className?: string }) => {
  const config = getStatusConfig(status);
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className={cn("w-2.5 h-2.5 rounded-full shadow-sm ring-1 ring-background/50", config.color.replace('text-', 'bg-'))} />
      <span className="text-xs font-semibold text-muted-foreground capitalize">{config.label}</span>
      {/* status === 'planned' && <div className="h-px w-3 bg-muted-foreground/30" /> */}
    </div>
  );
};

const VoteControl = ({ count, active, onClick, compact = false }: { count: number, active: boolean, onClick: (e: any) => void, compact?: boolean }) => (
  <button
    onClick={onClick}
    className={cn(
      "group flex items-center justify-center rounded-lg border transition-all duration-300 select-none transformactive:scale-95",
      active
        ? "bg-primary border-primary text-primary-foreground shadow-sm hover:bg-primary/90"
        : "bg-background border-border text-muted-foreground hover:border-foreground/20 hover:bg-muted/50",
      compact
        ? "h-8 px-2.5 gap-1.5 text-xs font-medium"
        : "flex-col w-12 h-14 md:w-14 md:h-16 gap-0.5"
    )}
  >
    <ArrowUp className={cn(
      "transition-transform duration-300",
      compact ? "w-3.5 h-3.5" : "w-5 h-5 mb-0.5 group-hover:-translate-y-0.5",
      active && !compact && "text-primary-foreground"
    )} />
    <span className={cn("font-bold tracking-tight", compact ? "text-xs" : "text-base")}>{count}</span>
  </button>
);

const SuggestionListItem = ({
  suggestion,
  onVote,
  onView,
  hasVoted
}: {
  suggestion: FeatureSuggestionDetailed,
  onVote: (id: string) => void,
  onView: (s: FeatureSuggestionDetailed) => void,
  hasVoted: boolean
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      onClick={() => onView(suggestion)}
      className="group flex gap-4 md:gap-6 p-6 bg-card hover:bg-muted/30 border-b border-border last:border-0 transition-colors cursor-pointer"
    >
      {/* Desktop Vote */}
      <div className="hidden md:block shrink-0 pt-1">
        <VoteControl count={suggestion.votes_count} active={hasVoted} onClick={(e) => { e.stopPropagation(); onVote(suggestion.id); }} />
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-2.5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h3 className="text-base md:text-xl font-bold text-foreground leading-snug group-hover:text-primary transition-colors">
              {suggestion.title}
            </h3>
            <div className="flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground">
              <StatusDot status={suggestion.status} />
              <span className="text-border">|</span>
              <span className="font-semibold text-foreground/70 bg-muted/40 px-2 py-0.5 rounded-md">{getCategoryConfig(suggestion.category).label}</span>
              <span className="text-border">|</span>
              <span>{formatTimeAgo(suggestion.created_at)}</span>
            </div>
          </div>

          {/* Mobile Vote Overlay or standard */}
          <div className="md:hidden">
            <VoteControl count={suggestion.votes_count} active={hasVoted} onClick={(e) => { e.stopPropagation(); onVote(suggestion.id); }} compact />
          </div>
        </div>

        <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed max-w-4xl">
          {suggestion.description}
        </p>

        <div className="flex items-center gap-4 pt-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium">
            <Avatar className="w-5 h-5 ring-1 ring-border/50">
              <AvatarFallback className="text-[9px] bg-background">{getInitials(suggestion.user_name)}</AvatarFallback>
            </Avatar>
            {formatUserName(suggestion.user_name)}
          </div>

          {suggestion.comments_count > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/40 px-2 py-1 rounded-md transition-colors group-hover:bg-muted/60">
              <MessageSquare className="w-3.5 h-3.5" />
              {suggestion.comments_count}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const BoardCard = ({ suggestion, onVote, onView, hasVoted }: any) => (
  <motion.div
    layout
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    onClick={() => onView(suggestion)}
    className="bg-card hover:bg-muted/30 border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col gap-4 group h-auto"
  >
    <div className="flex justify-between items-start">
      <span className="text-[10px] font-semibold bg-primary/5 text-primary px-2 py-1 rounded-md border border-primary/10">
        {getCategoryConfig(suggestion.category).label}
      </span>
      {suggestion.is_hot && <Flame className="w-4 h-4 text-orange-500 fill-orange-500/10" />}
    </div>

    <h3 className="font-bold text-sm leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-3">
      {suggestion.title}
    </h3>

    <div className="mt-auto pt-3 flex items-center justify-between border-t border-border/40">
      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
        <Clock className="w-3.5 h-3.5" />
        {formatDate(suggestion.created_at)}
      </div>
      <VoteControl count={suggestion.votes_count} active={hasVoted} onClick={(e) => { e.stopPropagation(); onVote(suggestion.id); }} compact />
    </div>
  </motion.div>
);

const RoadmapColumn = ({ title, status, suggestions, ...props }: any) => {
  const items = suggestions.filter((s: any) => s.status === status);
  const config = getStatusConfig(status as SuggestionStatus);

  return (
    <div className="flex-1 min-w-[300px] flex flex-col gap-4">
      <div className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10 py-3 border-b border-border/50 px-1">
        <div className="flex items-center gap-2.5">
          <div className={cn("w-2.5 h-2.5 rounded-full ring-2 ring-opacity-20", config.color.replace('text-', 'bg-'), config.color.replace('text-', 'ring-'))} />
          <h4 className="font-bold text-sm text-foreground">{title}</h4>
          <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full ml-1">{items.length}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 pb-4 px-1">
        {items.map((s: any) => (
          <BoardCard key={s.id} suggestion={s} {...props} />
        ))}
        {items.length === 0 && (
          <div className="h-32 rounded-xl border-2 border-dashed border-border/40 flex flex-col items-center justify-center gap-2 text-muted-foreground bg-muted/5">
            <div className="p-2 rounded-full bg-muted/20">
              <LayoutList className="w-5 h-5 opacity-40" />
            </div>
            <span className="text-xs font-medium">لا توجد عناصر</span>
          </div>
        )}
      </div>
    </div>
  );
};


// --- Main Page Component ---

export default function FeatureSuggestionsEnhanced() {
  const { user, userProfile } = useAuth();
  const { currentOrganization } = useTenant();

  // State
  const [suggestions, setSuggestions] = useState<FeatureSuggestionDetailed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [filterCategory, setFilterCategory] = useState<SuggestionCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'newest'>('popular');

  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<FeatureSuggestionDetailed | null>(null);
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set());

  // Forms
  const [formData, setFormData] = useState<CreateSuggestionInput>({ title: '', description: '', category: 'pos', priority: 'medium' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comments, setComments] = useState<FeatureComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  // Load Data
  useEffect(() => {
    if (currentOrganization?.id) {
      loadData();
    }
  }, [currentOrganization, filterCategory, searchQuery, sortBy]);

  const loadData = async () => {
    if (!currentOrganization?.id) return;
    setIsLoading(true);
    try {
      const result = await fetchSuggestions(currentOrganization.id, {
        category: filterCategory !== 'all' ? filterCategory : undefined,
        search: searchQuery || undefined,
        limit: 100
      });

      let data = result.data;
      if (sortBy === 'popular') {
        data.sort((a, b) => b.votes_count - a.votes_count);
      } else {
        data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
      setSuggestions(data);

      if (user) {
        // Simple distinct vote check
        const votesSet = new Set<string>();
        const votedIds = await Promise.all(
          data.slice(0, 50).map(s => checkUserVote(s.id, user.id).then(v => v ? s.id : null))
        );
        votedIds.forEach(id => id && votesSet.add(id));
        setUserVotes(votesSet);
      }
    } catch (error) {
      toast.error('خطأ في الاتصال');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVote = async (id: string) => {
    if (!user || !currentOrganization) return toast.error('يجب تسجيل الدخول');
    const isVoted = userVotes.has(id);

    // Optimistic
    setUserVotes(prev => { const n = new Set(prev); isVoted ? n.delete(id) : n.add(id); return n; });
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, votes_count: s.votes_count + (isVoted ? -1 : 1) } : s));

    try {
      if (isVoted) await unvoteSuggestion(id, user.id);
      else await voteSuggestion(id, currentOrganization.id, user.id);
    } catch (e) { loadData(); }
  };

  const handleSubmit = async () => {
    if (!user || !currentOrganization || !formData.title.trim()) return;
    setIsSubmitting(true);
    try {
      const name = userProfile?.store_name || user.email?.split('@')[0] || 'User';
      await createSuggestion(currentOrganization.id, user.id, name, formData);
      toast.success('تمت إضافة الاقتراح بنجاح');
      setIsCreateOpen(false);
      setFormData({ title: '', description: '', category: 'pos', priority: 'medium' });
      loadData();
    } catch (e) { toast.error('خطأ في إنشاء الاقتراح'); }
    finally { setIsSubmitting(false); }
  };

  const openDetails = async (s: FeatureSuggestionDetailed) => {
    setSelectedSuggestion(s);
    setIsLoadingComments(true);
    try { setComments(await fetchComments(s.id)); } catch (e) { }
    setIsLoadingComments(false);
  };

  const submitComment = async () => {
    if (!user || !currentOrganization || !selectedSuggestion || !newComment.trim()) return;
    try {
      const name = userProfile?.store_name || user.email?.split('@')[0] || 'User';
      await createComment(currentOrganization.id, user.id, name, { suggestion_id: selectedSuggestion.id, comment: newComment });
      setNewComment('');
      setComments(await fetchComments(selectedSuggestion.id));
      setSuggestions(prev => prev.map(s => s.id === selectedSuggestion.id ? { ...s, comments_count: s.comments_count + 1 } : s));
    } catch (e) { toast.error('خطأ في نشر التعليق'); }
  };

  return (
    <POSPureLayout>
      <div className="h-full flex flex-col bg-background text-foreground transition-colors duration-300 font-sans" dir="rtl">

        {/* Header - Global Standard */}
        <div className="shrink-0 border-b border-border bg-background/80 backdrop-blur-md pb-0 sticky top-0 z-30 supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center ring-1 ring-primary/20 shadow-sm">
                <Zap className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight leading-none text-foreground">مركز التطوير</h1>
                <p className="text-sm font-medium text-muted-foreground mt-1.5 opacity-80">شاركنا في بناء مستقبل المنصة</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border border-border/50">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-semibold text-muted-foreground">التحديث v2.4.0</span>
              </div>
              <Button onClick={() => setIsCreateOpen(true)} className="font-bold shadow-sm rounded-xl px-5 h-10 gap-2">
                <Plus className="w-4 h-4" />
                فكرة جديدة
              </Button>
            </div>
          </div>

          {/* Sub-header / Controls */}
          <div className="px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-3 bg-muted/10 border-t border-border/50">
            {/* Left: View & Search */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex p-1 bg-muted/40 rounded-xl border border-border/50 shrink-0">
                <button
                  onClick={() => setViewMode('list')}
                  className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-background shadow-sm text-foreground ring-1 ring-black/5" : "text-muted-foreground hover:text-foreground")}
                  title="عرض القائمة"
                >
                  <LayoutList className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('board')}
                  className={cn("p-2 rounded-lg transition-all", viewMode === 'board' ? "bg-background shadow-sm text-foreground ring-1 ring-black/5" : "text-muted-foreground hover:text-foreground")}
                  title="عرض اللوحة"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>

              <div className="relative flex-1 md:w-72">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-70" />
                <Input
                  placeholder="بحث في الاقتراحات والمناقشات..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 pl-4 pr-9 text-sm bg-background border-border/60 hover:border-border focus:ring-2 focus:ring-primary/10 transition-all rounded-xl shadow-sm"
                />
              </div>
            </div>

            {/* Right: Filters */}
            <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 md:pb-0 hide-scrollbar">
              <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v as any)}>
                <SelectTrigger className="h-9 gap-2 border-border/60 bg-background text-xs font-semibold min-w-[130px] rounded-lg shadow-sm hover:bg-muted/30">
                  <span>التصنيفات</span>
                </SelectTrigger>
                <SelectContent className="min-w-[160px] p-1 text-right" dir="rtl">
                  <SelectItem value="all" className="font-semibold">كل التصنيفات</SelectItem>
                  <Separator className="my-1" />
                  {Object.values(CATEGORIES).map(c => <SelectItem key={c.id} value={c.id} className="text-right">{c.label}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <SelectTrigger className="h-9 gap-2 border-border/60 bg-background text-xs font-semibold rounded-lg shadow-sm hover:bg-muted/30">
                  <ArrowUp className="w-3.5 h-3.5" />
                  <span>ترتيب</span>
                </SelectTrigger>
                <SelectContent align="end" className="p-1" dir="rtl">
                  <SelectItem value="popular" className="font-medium text-right">الأكثر تصويتاً</SelectItem>
                  <SelectItem value="newest" className="font-medium text-right">الأحدث</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-muted/5 scroll-smooth">
          {viewMode === 'list' && (
            <div className="max-w-5xl mx-auto py-8 px-4 md:px-0">
              {isLoading ? (
                <div className="flex justify-center py-32"><Loader2 className="w-10 h-10 animate-spin text-primary/30" /></div>
              ) : suggestions.length > 0 ? (
                <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden divide-y divide-border/40">
                  {suggestions.map(s => (
                    <SuggestionListItem
                      key={s.id}
                      suggestion={s}
                      onVote={handleVote}
                      onView={openDetails}
                      hasVoted={userVotes.has(s.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-32 opacity-60">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Search className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">لا توجد نتائج</h3>
                  <p className="text-sm font-medium text-muted-foreground mt-2">كن أول من يقترح شيئاً مذهلاً!</p>
                  <Button variant="link" onClick={() => { setSearchQuery(''); setFilterCategory('all'); }} className="mt-4">مسح الفلاتر</Button>
                </div>
              )}
            </div>
          )}

          {viewMode === 'board' && (
            <div className="h-full overflow-x-auto overflow-y-hidden p-6 md:p-8">
              {isLoading ? (
                <div className="flex justify-center items-center h-full"><Loader2 className="w-10 h-10 animate-spin text-primary/30" /></div>
              ) : (
                <div className="flex gap-6 h-full min-w-max pb-4">
                  <RoadmapColumn title="مقترح" status="pending" suggestions={suggestions} onVote={handleVote} onView={openDetails} hasVoted={userVotes} />
                  <RoadmapColumn title="مخطط له" status="planned" suggestions={suggestions} onVote={handleVote} onView={openDetails} hasVoted={userVotes} />
                  <RoadmapColumn title="جاري العمل" status="in_progress" suggestions={suggestions} onVote={handleVote} onView={openDetails} hasVoted={userVotes} />
                  <RoadmapColumn title="مكتمل" status="completed" suggestions={suggestions} onVote={handleVote} onView={openDetails} hasVoted={userVotes} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Create Modal */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="sm:max-w-[650px] border-border shadow-2xl p-0 gap-0 overflow-hidden" dir="rtl">
            <DialogHeader className="p-6 pb-4 bg-muted/10 border-b border-border/50 text-right">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                شاركنا بكرة جديدة
              </DialogTitle>
              <DialogDescription className="text-sm font-medium opacity-80 mt-1.5">
                أرسل تقريراً عن خطأ، طلب ميزة، أو تعليق عام لتحسين المنصة.
              </DialogDescription>
            </DialogHeader>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">عنوان الاقتراح</label>
                <Input
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="مثال: إضافة الوضع الداكن، تحسين التقارير..."
                  className="bg-background h-11 rounded-lg font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground">التصنيف</label>
                  <Select value={formData.category} onValueChange={(v: any) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger className="bg-background h-11 rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent className="text-right" dir="rtl">{Object.values(CATEGORIES).map(c => <SelectItem key={c.id} value={c.id} className="text-right font-medium">{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground">الأولوية</label>
                  <Select value={formData.priority} onValueChange={(v: any) => setFormData({ ...formData, priority: v })}>
                    <SelectTrigger className="bg-background h-11 rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent className="text-right" dir="rtl">{Object.values(PRIORITIES).map(p => <SelectItem key={p.id} value={p.id} className="text-right font-medium">{p.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">الوصف التفصيلي</label>
                <Textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="يرجى تقديم أكبر قدر ممكن من التفاصيل لمساعدتنا في فهم طلبك..."
                  className="min-h-[160px] resize-none bg-background rounded-lg p-4 leading-relaxed font-medium"
                />
              </div>
            </div>
            <DialogFooter className="p-5 border-t border-border/50 bg-muted/10 gap-3 sm:justify-between items-center" dir="rtl">
              <Button variant="ghost" onClick={() => setIsCreateOpen(false)} className="rounded-lg h-10 px-6 font-semibold opacity-70 hover:opacity-100">إلغاء</Button>
              <Button onClick={handleSubmit} disabled={isSubmitting} className="rounded-lg h-10 px-8 font-bold shadow-md shadow-primary/20">
                {isSubmitting && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                إرسال الاقتراح
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Details Modal */}
        <Dialog open={!!selectedSuggestion} onOpenChange={() => setSelectedSuggestion(null)}>
          <DialogContent className="sm:max-w-[750px] h-[85vh] p-0 overflow-hidden flex flex-col gap-0 border-border shadow-2xl bg-background" dir="rtl">
            {selectedSuggestion && (
              <>
                <div className="p-8 border-b border-border bg-background sticky top-0 z-10 text-right shadow-sm">
                  <div className="flex items-center gap-3 mb-5">
                    <StatusDot status={selectedSuggestion.status} />
                    <span className="text-border">|</span>
                    <span className="text-xs font-semibold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">{formatDate(selectedSuggestion.created_at)}</span>
                  </div>
                  <h2 className="text-2xl font-black leading-snug mb-3 tracking-tight text-foreground">{selectedSuggestion.title}</h2>
                  <div className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground">
                    <Avatar className="w-6 h-6 ring-1 ring-border"><AvatarFallback className="text-[10px] bg-background">{getInitials(selectedSuggestion.user_name)}</AvatarFallback></Avatar>
                    <span className="text-foreground/80">{formatUserName(selectedSuggestion.user_name)}</span>
                  </div>
                </div>

                <ScrollArea className="flex-1 bg-muted/5" dir="rtl">
                  <div className="max-w-4xl mx-auto p-8 text-right">
                    <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-foreground/90 leading-8">
                      <p className="whitespace-pre-wrap font-medium">{selectedSuggestion.description}</p>
                    </div>

                    <Separator className="my-10" />

                    <div className="space-y-8">
                      <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        المناقشة ({selectedSuggestion.comments_count})
                      </h3>
                      {isLoadingComments ? (
                        <div className="py-6 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto opacity-50" /></div>
                      ) : (
                        <div className="space-y-6">
                          {comments.map(c => (
                            <div key={c.id} className="flex gap-4 group">
                              <Avatar className="w-9 h-9 mt-1 border border-border shadow-sm"><AvatarFallback className="text-xs bg-background font-bold">{getInitials(c.user_name)}</AvatarFallback></Avatar>
                              <div className="flex-1 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-bold text-foreground">{formatUserName(c.user_name)}</span>
                                  <span className="text-xs font-medium text-muted-foreground opacity-70">{formatTimeAgo(c.created_at)}</span>
                                </div>
                                <div className="text-sm font-medium text-foreground/80 leading-relaxed bg-white/5 p-3 rounded-2xl rounded-tr-none border border-border/20">
                                  {c.comment}
                                </div>
                              </div>
                            </div>
                          ))}
                          {comments.length === 0 && (
                            <div className="text-center py-10 opacity-60 border-2 border-dashed border-border/40 rounded-xl">
                              <p className="text-sm font-semibold">لا توجد تعليقات بعد.</p>
                              <p className="text-xs mt-1">كن أول من يشارك رأيه في هذا الاقتراح.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>

                <div className="p-5 border-t border-border bg-background flex gap-4 items-center shadow-[0_-5px_20px_rgba(0,0,0,0.02)]" dir="rtl">
                  <Avatar className="w-9 h-9 ring-1 ring-border shrink-0">
                    <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">أنت</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 relative">
                    <Input
                      placeholder="أضف تعليقاً..."
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && submitComment()}
                      className="bg-muted/30 border-transparent hover:bg-muted/50 focus:bg-background focus:border-border h-11 rounded-xl pl-12 font-medium"
                    />
                    <Button
                      size="sm"
                      onClick={submitComment}
                      disabled={!newComment.trim()}
                      className="absolute left-1.5 top-1.5 h-8 w-8 p-0 rounded-lg shadow-none"
                      variant="ghost"
                    >
                      <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </POSPureLayout>
  );
}
