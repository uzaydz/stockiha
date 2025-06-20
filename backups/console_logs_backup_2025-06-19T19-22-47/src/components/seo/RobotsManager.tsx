import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Plus, 
  Edit, 
  Trash2, 
  Bot,
  FileCode,
  Copy,
  Download
} from 'lucide-react';
import { seoService, SEORobotsRule } from '@/api/seoService';

export function RobotsManager() {
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<SEORobotsRule[]>([]);
  const [editingRule, setEditingRule] = useState<SEORobotsRule | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pathInput, setPathInput] = useState('');
  const [pathType, setPathType] = useState<'allow' | 'disallow'>('disallow');
  const [robotsTxt, setRobotsTxt] = useState('');
  const [generatingRobots, setGeneratingRobots] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const data = await seoService.getRobotsRules();
      setRules((data || []) as SEORobotsRule[]);
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

  const generateRobotsTxt = async () => {
    try {
      setGeneratingRobots(true);
      const content = await seoService.generateRobotsTxt();
      setRobotsTxt(content || '');
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setGeneratingRobots(false);
    }
  };

  const handleSave = async () => {
    if (!editingRule) return;
    
    try {
      setSaving(true);
      await seoService.upsertRobotsRule(editingRule);
      toast({
        title: 'تم الحفظ',
        description: 'تم حفظ قاعدة robots.txt بنجاح'
      });
      setDialogOpen(false);
      loadRules();
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
    if (!confirm('هل أنت متأكد من حذف هذه القاعدة؟')) return;
    
    try {
      await seoService.deleteRobotsRule(id);
      toast({
        title: 'تم الحذف',
        description: 'تم حذف القاعدة'
      });
      loadRules();
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleAddPath = () => {
    if (pathInput.trim() && editingRule) {
      if (pathType === 'allow') {
        setEditingRule({
          ...editingRule,
          allow_paths: [...(editingRule.allow_paths || []), pathInput.trim()]
        });
      } else {
        setEditingRule({
          ...editingRule,
          disallow_paths: [...(editingRule.disallow_paths || []), pathInput.trim()]
        });
      }
      setPathInput('');
    }
  };

  const handleRemovePath = (type: 'allow' | 'disallow', index: number) => {
    if (!editingRule) return;
    
    if (type === 'allow') {
      const paths = [...(editingRule.allow_paths || [])];
      paths.splice(index, 1);
      setEditingRule({ ...editingRule, allow_paths: paths });
    } else {
      const paths = [...(editingRule.disallow_paths || [])];
      paths.splice(index, 1);
      setEditingRule({ ...editingRule, disallow_paths: paths });
    }
  };

  const openDialog = (rule?: SEORobotsRule) => {
    setEditingRule(rule || {
      user_agent: '*',
      allow_paths: [],
      disallow_paths: [],
      crawl_delay: undefined,
      is_active: true,
      priority: 0
    });
    setDialogOpen(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(robotsTxt);
    toast({
      title: 'تم النسخ',
      description: 'تم نسخ محتوى robots.txt'
    });
  };

  const downloadRobotsTxt = () => {
    const blob = new Blob([robotsTxt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'robots.txt';
    a.click();
    URL.revokeObjectURL(url);
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
      <Tabs defaultValue="rules" onValueChange={(value) => {
        if (value === 'preview') {
          generateRobotsTxt();
        }
      }}>
        <TabsList>
          <TabsTrigger value="rules">القواعد</TabsTrigger>
          <TabsTrigger value="preview">معاينة robots.txt</TabsTrigger>
        </TabsList>
        
        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    إدارة قواعد robots.txt
                  </CardTitle>
                  <CardDescription>
                    تحديد القواعد للروبوتات ومحركات البحث
                  </CardDescription>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => openDialog()}>
                      <Plus className="h-4 w-4 ml-2" />
                      إضافة قاعدة
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {editingRule?.id ? 'تعديل' : 'إضافة'} قاعدة robots.txt
                      </DialogTitle>
                      <DialogDescription>
                        تحديد قواعد الوصول للروبوتات
                      </DialogDescription>
                    </DialogHeader>
                    
                    {editingRule && (
                      <div className="space-y-6 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="user_agent">User-Agent</Label>
                          <Input
                            id="user_agent"
                            value={editingRule.user_agent}
                            onChange={(e) => setEditingRule({ ...editingRule, user_agent: e.target.value })}
                            placeholder="* أو Googlebot"
                            dir="ltr"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>المسارات</Label>
                          <div className="flex gap-2">
                            <select
                              className="px-3 py-1 border rounded-md"
                              value={pathType}
                              onChange={(e) => setPathType(e.target.value as 'allow' | 'disallow')}
                            >
                              <option value="disallow">Disallow</option>
                              <option value="allow">Allow</option>
                            </select>
                            <Input
                              value={pathInput}
                              onChange={(e) => setPathInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddPath())}
                              placeholder="/admin/"
                              dir="ltr"
                              className="flex-1"
                            />
                            <Button onClick={handleAddPath} size="sm">
                              إضافة
                            </Button>
                          </div>
                          
                          {editingRule.disallow_paths && editingRule.disallow_paths.length > 0 && (
                            <div className="mt-2">
                              <p className="text-sm font-medium mb-1">Disallow:</p>
                              <div className="flex flex-wrap gap-2">
                                {editingRule.disallow_paths.map((path, index) => (
                                  <Badge
                                    key={index}
                                    variant="secondary"
                                    className="cursor-pointer"
                                    onClick={() => handleRemovePath('disallow', index)}
                                  >
                                    {path} ×
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {editingRule.allow_paths && editingRule.allow_paths.length > 0 && (
                            <div className="mt-2">
                              <p className="text-sm font-medium mb-1">Allow:</p>
                              <div className="flex flex-wrap gap-2">
                                {editingRule.allow_paths.map((path, index) => (
                                  <Badge
                                    key={index}
                                    variant="outline"
                                    className="cursor-pointer"
                                    onClick={() => handleRemovePath('allow', index)}
                                  >
                                    {path} ×
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="crawl_delay">Crawl-delay (ثانية)</Label>
                          <Input
                            id="crawl_delay"
                            type="number"
                            value={editingRule.crawl_delay || ''}
                            onChange={(e) => setEditingRule({ 
                              ...editingRule, 
                              crawl_delay: e.target.value ? parseInt(e.target.value) : undefined 
                            })}
                            placeholder="10"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="priority">الأولوية</Label>
                          <Input
                            id="priority"
                            type="number"
                            value={editingRule.priority}
                            onChange={(e) => setEditingRule({ 
                              ...editingRule, 
                              priority: parseInt(e.target.value) || 0 
                            })}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>تفعيل القاعدة</Label>
                            <p className="text-sm text-muted-foreground">
                              تطبيق هذه القاعدة في ملف robots.txt
                            </p>
                          </div>
                          <Switch
                            checked={editingRule.is_active}
                            onCheckedChange={(checked) => setEditingRule({ ...editingRule, is_active: checked })}
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
                    <TableHead>User-Agent</TableHead>
                    <TableHead>القواعد</TableHead>
                    <TableHead>Crawl-delay</TableHead>
                    <TableHead>الأولوية</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="text-left">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-mono">{rule.user_agent}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {rule.disallow_paths?.map((path, i) => (
                            <div key={i} className="text-sm">
                              <span className="text-muted-foreground">Disallow:</span> {path}
                            </div>
                          ))}
                          {rule.allow_paths?.map((path, i) => (
                            <div key={i} className="text-sm">
                              <span className="text-muted-foreground">Allow:</span> {path}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{rule.crawl_delay || '-'}</TableCell>
                      <TableCell>{rule.priority}</TableCell>
                      <TableCell>
                        <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                          {rule.is_active ? 'مفعل' : 'معطل'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDialog(rule)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(rule.id!)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {rules.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد قواعد مضافة بعد
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileCode className="h-5 w-5" />
                  معاينة robots.txt
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyToClipboard}>
                    <Copy className="h-4 w-4 ml-2" />
                    نسخ
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadRobotsTxt}>
                    <Download className="h-4 w-4 ml-2" />
                    تحميل
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {generatingRobots ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <code>{robotsTxt || 'لا يوجد محتوى'}</code>
                </pre>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
