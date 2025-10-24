import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Plus, 
  Edit, 
  Trash2, 
  FileText,
  Eye,
  EyeOff
} from 'lucide-react';
import { seoService, SEOPageMeta } from '@/api/seoService';

export function PageMetaManager() {
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState<SEOPageMeta[]>([]);
  const [editingPage, setEditingPage] = useState<SEOPageMeta | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    try {
      setLoading(true);
      const data = await seoService.getPageMeta();
      setPages(data || []);
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : (typeof error === 'string' ? error : 'حدث خطأ غير متوقع'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingPage) return;
    
    try {
      setSaving(true);
      await seoService.upsertPageMeta(editingPage);
      toast({
        title: 'تم الحفظ',
        description: 'تم حفظ بيانات Meta للصفحة بنجاح'
      });
      setDialogOpen(false);
      loadPages();
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : (typeof error === 'string' ? error : 'حدث خطأ غير متوقع'),
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الصفحة؟')) return;
    
    try {
      await seoService.deletePageMeta(id);
      toast({
        title: 'تم الحذف',
        description: 'تم حذف بيانات Meta للصفحة'
      });
      loadPages();
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : (typeof error === 'string' ? error : 'حدث خطأ غير متوقع'),
        variant: 'destructive'
      });
    }
  };

  const handleAddKeyword = () => {
    if (keywordInput.trim() && editingPage) {
      setEditingPage({
        ...editingPage,
        keywords: [...(editingPage.keywords || []), keywordInput.trim()]
      });
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (index: number) => {
    if (!editingPage) return;
    const keywords = [...(editingPage.keywords || [])];
    keywords.splice(index, 1);
    setEditingPage({ ...editingPage, keywords });
  };

  const openDialog = (page?: SEOPageMeta) => {
    setEditingPage(page || {
      page_path: '',
      title: '',
      description: '',
      keywords: [],
      og_title: '',
      og_description: '',
      og_image: '',
      og_type: 'website',
      twitter_card: 'summary_large_image',
      canonical_url: '',
      no_index: false,
      no_follow: false
    });
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                إدارة Meta Tags للصفحات
              </CardTitle>
              <CardDescription>
                تخصيص Meta Tags لكل صفحة في الموقع
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => openDialog()}>
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة صفحة
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingPage?.id ? 'تعديل' : 'إضافة'} Meta Tags للصفحة
                  </DialogTitle>
                  <DialogDescription>
                    تخصيص بيانات Meta للصفحة لتحسين ظهورها في محركات البحث
                  </DialogDescription>
                </DialogHeader>
                
                {editingPage && (
                  <div className="space-y-6 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="page_path">مسار الصفحة</Label>
                      <Input
                        id="page_path"
                        value={editingPage.page_path}
                        onChange={(e) => setEditingPage({ ...editingPage, page_path: e.target.value })}
                        placeholder="/about"
                        dir="ltr"
                        disabled={!!editingPage.id}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="title">العنوان (Title)</Label>
                      <Input
                        id="title"
                        value={editingPage.title || ''}
                        onChange={(e) => setEditingPage({ ...editingPage, title: e.target.value })}
                        placeholder="عنوان الصفحة"
                        dir="rtl"
                      />
                      <p className="text-xs text-muted-foreground">
                        {editingPage.title?.length || 0}/60 حرف
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">الوصف (Description)</Label>
                      <Textarea
                        id="description"
                        value={editingPage.description || ''}
                        onChange={(e) => setEditingPage({ ...editingPage, description: e.target.value })}
                        placeholder="وصف محتوى الصفحة"
                        rows={3}
                        dir="rtl"
                      />
                      <p className="text-xs text-muted-foreground">
                        {editingPage.description?.length || 0}/160 حرف
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>الكلمات المفتاحية</Label>
                      <div className="flex gap-2">
                        <Input
                          value={keywordInput}
                          onChange={(e) => setKeywordInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyword())}
                          placeholder="أضف كلمة مفتاحية"
                          dir="rtl"
                        />
                        <Button onClick={handleAddKeyword} size="sm">
                          إضافة
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {editingPage.keywords?.map((keyword, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={() => handleRemoveKeyword(index)}
                          >
                            {keyword} ×
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="canonical_url">Canonical URL</Label>
                      <Input
                        id="canonical_url"
                        type="url"
                        value={editingPage.canonical_url || ''}
                        onChange={(e) => setEditingPage({ ...editingPage, canonical_url: e.target.value })}
                        placeholder="https://example.com/page"
                        dir="ltr"
                      />
                    </div>

                    <div className="border rounded-lg p-4 space-y-4">
                      <h4 className="font-medium">Open Graph</h4>
                      
                      <div className="space-y-2">
                        <Label htmlFor="og_title">OG Title</Label>
                        <Input
                          id="og_title"
                          value={editingPage.og_title || ''}
                          onChange={(e) => setEditingPage({ ...editingPage, og_title: e.target.value })}
                          placeholder="عنوان Open Graph"
                          dir="rtl"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="og_description">OG Description</Label>
                        <Textarea
                          id="og_description"
                          value={editingPage.og_description || ''}
                          onChange={(e) => setEditingPage({ ...editingPage, og_description: e.target.value })}
                          placeholder="وصف Open Graph"
                          rows={2}
                          dir="rtl"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="og_image">OG Image</Label>
                        <Input
                          id="og_image"
                          type="url"
                          value={editingPage.og_image || ''}
                          onChange={(e) => setEditingPage({ ...editingPage, og_image: e.target.value })}
                          placeholder="https://example.com/image.jpg"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>No Index</Label>
                        <p className="text-sm text-muted-foreground">
                          منع محركات البحث من أرشفة هذه الصفحة
                        </p>
                      </div>
                      <Switch
                        checked={editingPage.no_index}
                        onCheckedChange={(checked) => setEditingPage({ ...editingPage, no_index: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>No Follow</Label>
                        <p className="text-sm text-muted-foreground">
                          منع محركات البحث من تتبع الروابط في هذه الصفحة
                        </p>
                      </div>
                      <Switch
                        checked={editingPage.no_follow}
                        onCheckedChange={(checked) => setEditingPage({ ...editingPage, no_follow: checked })}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setDialogOpen(false)}>
                        إلغاء
                      </Button>
                      <Button onClick={handleSave} disabled={saving}>
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin ml-2" />
                        ) : null}
                        حفظ
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المسار</TableHead>
                <TableHead>العنوان</TableHead>
                <TableHead>الوصف</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="text-left">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map((page) => (
                <TableRow key={page.id}>
                  <TableCell className="font-mono text-sm">
                    {page.page_path}
                  </TableCell>
                  <TableCell>{page.title || '-'}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {page.description || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {page.no_index && (
                        <Badge variant="secondary" className="text-xs">
                          <EyeOff className="h-3 w-3 mr-1" />
                          No Index
                        </Badge>
                      )}
                      {page.no_follow && (
                        <Badge variant="secondary" className="text-xs">
                          No Follow
                        </Badge>
                      )}
                      {!page.no_index && !page.no_follow && (
                        <Badge variant="outline" className="text-xs">
                          <Eye className="h-3 w-3 mr-1" />
                          مفهرس
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openDialog(page)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(page.id!)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {pages.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد صفحات مضافة بعد
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
