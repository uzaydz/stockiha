import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Plus, 
  Edit, 
  Trash2, 
  Map,
  FileCode,
  Copy,
  Download,
  RefreshCw,
  BarChart3,
  Zap
} from 'lucide-react';
import { seoService, SEOSitemapEntry } from '@/api/seoService';
import { SitemapAnalysisDialog } from './SitemapAnalysisDialog';
import { sitemapAnalysisService } from '@/api/sitemapAnalysisService';

export function SitemapManager() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<SEOSitemapEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<SEOSitemapEntry | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sitemap, setSitemap] = useState('');
  const [generatingSitemap, setGeneratingSitemap] = useState(false);
  const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadEntries();
    loadStatistics();
  }, []);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const data = await seoService.getSitemapEntries();
      setEntries((data || []) as SEOSitemapEntry[]);
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const generateSitemap = async () => {
    try {
      setGeneratingSitemap(true);
      const content = await seoService.generateSitemap();
      setSitemap(content || '');
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setGeneratingSitemap(false);
    }
  };

  const handleSave = async () => {
    if (!editingEntry) return;
    
    try {
      setSaving(true);
      await seoService.upsertSitemapEntry(editingEntry);
      toast({
        title: 'تم الحفظ',
        description: 'تم حفظ إدخال Sitemap بنجاح'
      });
      setDialogOpen(false);
      loadEntries();
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الإدخال؟')) return;
    
    try {
      await seoService.deleteSitemapEntry(id);
      toast({
        title: 'تم الحذف',
        description: 'تم حذف الإدخال'
      });
      loadEntries();
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const openDialog = (entry?: SEOSitemapEntry) => {
    setEditingEntry(entry || {
      url: '',
      last_modified: new Date().toISOString(),
      change_frequency: 'weekly',
      priority: 0.5,
      include_in_sitemap: true
    });
    setDialogOpen(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sitemap);
    toast({
      title: 'تم النسخ',
      description: 'تم نسخ محتوى sitemap.xml'
    });
  };

  const downloadSitemap = () => {
    const blob = new Blob([sitemap], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sitemap.xml';
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadStatistics = async () => {
    try {
      const stats = await sitemapAnalysisService.getContentStatistics();
      setStatistics(stats);
    } catch (error: any) {
    }
  };

  const autoGenerateEntries = () => {
    setAnalysisDialogOpen(true);
  };

  const handleAnalysisComplete = () => {
    loadEntries();
    loadStatistics();
    toast({
      title: 'تم بنجاح',
      description: 'تم تحديث خريطة الموقع'
    });
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
      <Tabs defaultValue="entries" onValueChange={(value) => {
        if (value === 'preview') {
          generateSitemap();
        }
      }}>
        <TabsList>
          <TabsTrigger value="entries">الإدخالات</TabsTrigger>
          <TabsTrigger value="preview">معاينة sitemap.xml</TabsTrigger>
        </TabsList>
        
        <TabsContent value="entries">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Map className="h-5 w-5" />
                    إدارة Sitemap
                  </CardTitle>
                  <CardDescription>
                    إدارة الصفحات المضمنة في خريطة الموقع
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={autoGenerateEntries}>
                    <Zap className="h-4 w-4 ml-2" />
                    توليد ذكي
                  </Button>
                  <Button variant="outline" onClick={() => setAnalysisDialogOpen(true)}>
                    <BarChart3 className="h-4 w-4 ml-2" />
                    تحليل متقدم
                  </Button>
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => openDialog()}>
                        <Plus className="h-4 w-4 ml-2" />
                        إضافة URL
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {editingEntry?.id ? 'تعديل' : 'إضافة'} URL إلى Sitemap
                        </DialogTitle>
                        <DialogDescription>
                          إضافة صفحة جديدة إلى خريطة الموقع
                        </DialogDescription>
                      </DialogHeader>
                      
                      {editingEntry && (
                        <div className="space-y-6 mt-4">
                          <div className="space-y-2">
                            <Label htmlFor="url">URL</Label>
                            <Input
                              id="url"
                              type="url"
                              value={editingEntry.url}
                              onChange={(e) => setEditingEntry({ ...editingEntry, url: e.target.value })}
                              placeholder="https://example.com/page"
                              dir="ltr"
                              disabled={!!editingEntry.id}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="last_modified">آخر تعديل</Label>
                            <Input
                              id="last_modified"
                              type="datetime-local"
                              value={editingEntry.last_modified?.slice(0, 16) || ''}
                              onChange={(e) => setEditingEntry({ 
                                ...editingEntry, 
                                last_modified: new Date(e.target.value).toISOString() 
                              })}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="change_frequency">تكرار التغيير</Label>
                            <Select
                              value={editingEntry.change_frequency || 'weekly'}
                              onValueChange={(value) => setEditingEntry({ 
                                ...editingEntry, 
                                change_frequency: value as any 
                              })}
                            >
                              <SelectTrigger id="change_frequency">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="always">دائماً</SelectItem>
                                <SelectItem value="hourly">كل ساعة</SelectItem>
                                <SelectItem value="daily">يومي</SelectItem>
                                <SelectItem value="weekly">أسبوعي</SelectItem>
                                <SelectItem value="monthly">شهري</SelectItem>
                                <SelectItem value="yearly">سنوي</SelectItem>
                                <SelectItem value="never">أبداً</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="priority">الأولوية</Label>
                            <Input
                              id="priority"
                              type="number"
                              min="0"
                              max="1"
                              step="0.1"
                              value={editingEntry.priority || 0.5}
                              onChange={(e) => setEditingEntry({ 
                                ...editingEntry, 
                                priority: parseFloat(e.target.value) 
                              })}
                            />
                            <p className="text-xs text-muted-foreground">
                              قيمة بين 0.0 و 1.0 (الافتراضي 0.5)
                            </p>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label>تضمين في Sitemap</Label>
                              <p className="text-sm text-muted-foreground">
                                إظهار هذه الصفحة في خريطة الموقع
                              </p>
                            </div>
                            <Switch
                              checked={editingEntry.include_in_sitemap}
                              onCheckedChange={(checked) => setEditingEntry({ 
                                ...editingEntry, 
                                include_in_sitemap: checked 
                              })}
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
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>URL</TableHead>
                    <TableHead>آخر تعديل</TableHead>
                    <TableHead>التكرار</TableHead>
                    <TableHead>الأولوية</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="text-left">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono text-sm max-w-xs truncate">
                        {entry.url}
                      </TableCell>
                      <TableCell>
                        {entry.last_modified 
                          ? new Date(entry.last_modified).toLocaleDateString('ar-DZ')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {entry.change_frequency || 'weekly'}
                        </Badge>
                      </TableCell>
                      <TableCell>{entry.priority || 0.5}</TableCell>
                      <TableCell>
                        <Badge variant={entry.include_in_sitemap ? 'default' : 'secondary'}>
                          {entry.include_in_sitemap ? 'مضمن' : 'مستبعد'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDialog(entry)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(entry.id!)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {entries.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد إدخالات مضافة بعد
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statistics */}
          {statistics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">إجمالي الصفحات</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statistics.totalPages}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">أكثر الأنواع</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-medium">
                    {Object.entries(statistics.pageTypes).sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'غير محدد'}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">أولوية عالية</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {statistics.priorityDistribution['عالية (0.8-1.0)'] || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">آخر تحديث</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    {new Date(statistics.lastAnalysis).toLocaleDateString('ar-DZ')}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileCode className="h-5 w-5" />
                  معاينة sitemap.xml
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyToClipboard}>
                    <Copy className="h-4 w-4 ml-2" />
                    نسخ
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadSitemap}>
                    <Download className="h-4 w-4 ml-2" />
                    تحميل
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {generatingSitemap ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <code>{sitemap || 'لا يوجد محتوى'}</code>
                </pre>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Analysis Dialog */}
      <SitemapAnalysisDialog
        open={analysisDialogOpen}
        onOpenChange={setAnalysisDialogOpen}
        onComplete={handleAnalysisComplete}
      />
    </div>
  );
}
