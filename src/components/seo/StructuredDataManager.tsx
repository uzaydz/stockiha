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
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Plus, 
  Edit, 
  Trash2, 
  Code,
  Eye,
  Copy
} from 'lucide-react';
import { seoService, SEOStructuredData } from '@/api/seoService';
import Editor from '@monaco-editor/react';

const schemaTemplates = {
  Organization: {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "",
    "url": "",
    "logo": "",
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "",
      "contactType": "customer service"
    }
  },
  Article: {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "",
    "datePublished": "",
    "dateModified": "",
    "author": {
      "@type": "Person",
      "name": ""
    },
    "publisher": {
      "@type": "Organization",
      "name": "",
      "logo": {
        "@type": "ImageObject",
        "url": ""
      }
    },
    "description": ""
  },
  Event: {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": "",
    "startDate": "",
    "location": {
      "@type": "Place",
      "name": "",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "",
        "addressLocality": "",
        "addressCountry": "DZ"
      }
    },
    "description": ""
  },
  LocalBusiness: {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "",
      "addressLocality": "",
      "addressRegion": "",
      "postalCode": "",
      "addressCountry": "DZ"
    },
    "telephone": "",
    "openingHours": []
  },
  FAQPage: {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [{
      "@type": "Question",
      "name": "",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": ""
      }
    }]
  }
};

export function StructuredDataManager() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SEOStructuredData[]>([]);
  const [editingData, setEditingData] = useState<SEOStructuredData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewData, setPreviewData] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await seoService.getStructuredData();
      setData((result || []) as SEOStructuredData[]);
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

  const handleSave = async () => {
    if (!editingData) return;
    
    try {
      setSaving(true);
      await seoService.upsertStructuredData(editingData);
      toast({
        title: 'تم الحفظ',
        description: 'تم حفظ البيانات المنظمة بنجاح'
      });
      setDialogOpen(false);
      loadData();
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
    if (!confirm('هل أنت متأكد من حذف هذه البيانات؟')) return;
    
    try {
      await seoService.deleteStructuredData(id);
      toast({
        title: 'تم الحذف',
        description: 'تم حذف البيانات المنظمة'
      });
      loadData();
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const openDialog = (item?: SEOStructuredData) => {
    setEditingData(item || {
      page_path: '',
      schema_type: 'Organization',
      schema_data: {},
      is_active: true
    });
    setSelectedTemplate('');
    setDialogOpen(true);
  };

  const applyTemplate = () => {
    if (selectedTemplate && editingData) {
      setEditingData({
        ...editingData,
        schema_type: selectedTemplate,
        schema_data: schemaTemplates[selectedTemplate as keyof typeof schemaTemplates]
      });
    }
  };

  const previewStructuredData = (item: SEOStructuredData) => {
    setPreviewData(JSON.stringify(item.schema_data, null, 2));
    setPreviewDialogOpen(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(previewData);
    toast({
      title: 'تم النسخ',
      description: 'تم نسخ البيانات المنظمة'
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                إدارة البيانات المنظمة (Schema.org)
              </CardTitle>
              <CardDescription>
                إضافة وإدارة البيانات المنظمة لتحسين عرض الموقع في نتائج البحث
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => openDialog()}>
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة بيانات منظمة
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingData?.id ? 'تعديل' : 'إضافة'} بيانات منظمة
                  </DialogTitle>
                  <DialogDescription>
                    إضافة Schema markup لتحسين فهم محركات البحث للمحتوى
                  </DialogDescription>
                </DialogHeader>
                
                {editingData && (
                  <div className="space-y-6 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="page_path">مسار الصفحة (اختياري)</Label>
                      <Input
                        id="page_path"
                        value={editingData.page_path || ''}
                        onChange={(e) => setEditingData({ ...editingData, page_path: e.target.value })}
                        placeholder="/about أو اتركه فارغاً لتطبيقه على جميع الصفحات"
                        dir="ltr"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>قالب جاهز</Label>
                      <div className="flex gap-2">
                        <Select
                          value={selectedTemplate}
                          onValueChange={setSelectedTemplate}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختر قالب" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.keys(schemaTemplates).map((template) => (
                              <SelectItem key={template} value={template}>
                                {template}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button onClick={applyTemplate} variant="outline">
                          تطبيق القالب
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="schema_type">نوع البيانات المنظمة</Label>
                      <Input
                        id="schema_type"
                        value={editingData.schema_type}
                        onChange={(e) => setEditingData({ ...editingData, schema_type: e.target.value })}
                        placeholder="Organization, Article, Event, etc."
                        dir="ltr"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>محتوى JSON-LD</Label>
                      <div className="h-96 border rounded-lg overflow-hidden">
                        <Editor
                          defaultLanguage="json"
                          value={JSON.stringify(editingData.schema_data, null, 2)}
                          onChange={(value) => {
                            try {
                              if (value) {
                                setEditingData({ 
                                  ...editingData, 
                                  schema_data: JSON.parse(value) 
                                });
                              }
                            } catch (e) {
                              // Invalid JSON, ignore
                            }
                          }}
                          theme="vs-dark"
                          options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            wordWrap: 'on',
                            formatOnPaste: true,
                            formatOnType: true
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>تفعيل البيانات المنظمة</Label>
                        <p className="text-sm text-muted-foreground">
                          إضافة هذه البيانات إلى الصفحات
                        </p>
                      </div>
                      <Switch
                        checked={editingData.is_active}
                        onCheckedChange={(checked) => setEditingData({ ...editingData, is_active: checked })}
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
                <TableHead>النوع</TableHead>
                <TableHead>الصفحة</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="text-left">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Badge variant="outline">{item.schema_type}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {item.page_path || 'جميع الصفحات'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.is_active ? 'default' : 'secondary'}>
                      {item.is_active ? 'مفعل' : 'معطل'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => previewStructuredData(item)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openDialog(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(item.id!)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {data.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد بيانات منظمة مضافة بعد
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>معاينة البيانات المنظمة</DialogTitle>
              <Button variant="outline" size="sm" onClick={copyToClipboard}>
                <Copy className="h-4 w-4 ml-2" />
                نسخ
              </Button>
            </div>
          </DialogHeader>
          <div className="mt-4">
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
              <code>{previewData}</code>
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}