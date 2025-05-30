import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Eye,
  Users,
  MousePointer,
  Search,
  Download
} from 'lucide-react';
import { seoService, SEOPerformanceMetric } from '@/api/seoService';
import {
  LineChart,
  Line,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export function SEOAnalytics() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<SEOPerformanceMetric[]>([]);
  const [dateRange, setDateRange] = useState('30');
  const [selectedPage, setSelectedPage] = useState('all');
  const [pages, setPages] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadMetrics();
  }, [dateRange, selectedPage]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));
      
      const data = await seoService.getPerformanceMetrics(
        selectedPage === 'all' ? undefined : selectedPage,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
      
      setMetrics((data || []) as SEOPerformanceMetric[]);
      
      // Extract unique pages
      const uniquePages = [...new Set((data || []).map((m: any) => m.page_url))];
      setPages(uniquePages);
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

  const calculateTotalMetrics = () => {
    const totals = metrics.reduce((acc, metric) => ({
      page_views: acc.page_views + metric.page_views,
      unique_visitors: acc.unique_visitors + metric.unique_visitors,
      organic_traffic: acc.organic_traffic + metric.organic_traffic,
      impressions: acc.impressions + metric.impressions
    }), {
      page_views: 0,
      unique_visitors: 0,
      organic_traffic: 0,
      impressions: 0
    });

    const avgBounceRate = metrics.length > 0 
      ? metrics.reduce((sum, m) => sum + (m.bounce_rate || 0), 0) / metrics.length 
      : 0;

    const avgCTR = metrics.length > 0
      ? metrics.reduce((sum, m) => sum + (m.click_through_rate || 0), 0) / metrics.length
      : 0;

    return { ...totals, avgBounceRate, avgCTR };
  };

  const prepareChartData = () => {
    const groupedByDate: { [key: string]: any } = {};
    
    metrics.forEach(metric => {
      if (!groupedByDate[metric.metric_date]) {
        groupedByDate[metric.metric_date] = {
          date: metric.metric_date,
          page_views: 0,
          unique_visitors: 0,
          organic_traffic: 0,
          impressions: 0
        };
      }
      
      groupedByDate[metric.metric_date].page_views += metric.page_views;
      groupedByDate[metric.metric_date].unique_visitors += metric.unique_visitors;
      groupedByDate[metric.metric_date].organic_traffic += metric.organic_traffic;
      groupedByDate[metric.metric_date].impressions += metric.impressions;
    });
    
    return Object.values(groupedByDate).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  };

  const preparePagePerformanceData = () => {
    const pageData: { [key: string]: any } = {};
    
    metrics.forEach(metric => {
      if (!pageData[metric.page_url]) {
        pageData[metric.page_url] = {
          page: metric.page_url,
          views: 0,
          visitors: 0,
          avgPosition: 0,
          positionCount: 0
        };
      }
      
      pageData[metric.page_url].views += metric.page_views;
      pageData[metric.page_url].visitors += metric.unique_visitors;
      if (metric.position) {
        pageData[metric.page_url].avgPosition += metric.position;
        pageData[metric.page_url].positionCount += 1;
      }
    });
    
    return Object.values(pageData).map(page => ({
      ...page,
      avgPosition: page.positionCount > 0 ? page.avgPosition / page.positionCount : 0
    })).sort((a, b) => b.views - a.views).slice(0, 10);
  };

  const exportData = () => {
    const csv = [
      ['التاريخ', 'الصفحة', 'المشاهدات', 'الزوار الفريدون', 'الترافيك العضوي', 'معدل الارتداد', 'CTR', 'الانطباعات', 'الموضع'],
      ...metrics.map(m => [
        m.metric_date,
        m.page_url,
        m.page_views,
        m.unique_visitors,
        m.organic_traffic,
        m.bounce_rate || '',
        m.click_through_rate || '',
        m.impressions,
        m.position || ''
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seo-analytics-${new Date().toISOString().split('T')[0]}.csv`;
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

  const totals = calculateTotalMetrics();
  const chartData = prepareChartData();
  const pagePerformance = preparePagePerformanceData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold">تحليلات SEO</h3>
          <p className="text-muted-foreground">مراقبة أداء الموقع في محركات البحث</p>
        </div>
        <div className="flex gap-4">
          <Select value={selectedPage} onValueChange={setSelectedPage}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="جميع الصفحات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الصفحات</SelectItem>
              {pages.map(page => (
                <SelectItem key={page} value={page}>{page}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">آخر 7 أيام</SelectItem>
              <SelectItem value="30">آخر 30 يوم</SelectItem>
              <SelectItem value="90">آخر 90 يوم</SelectItem>
              <SelectItem value="365">آخر سنة</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4 ml-2" />
            تصدير
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              المشاهدات
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.page_views.toLocaleString('ar-DZ')}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              الزوار الفريدون
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.unique_visitors.toLocaleString('ar-DZ')}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              الترافيك العضوي
              <Search className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.organic_traffic.toLocaleString('ar-DZ')}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              معدل النقر (CTR)
              <MousePointer className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.avgCTR.toFixed(2)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>الترافيك بمرور الوقت</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('ar-DZ')}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString('ar-DZ')}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="page_views" 
                  stroke="#8884d8" 
                  name="المشاهدات"
                />
                <Line 
                  type="monotone" 
                  dataKey="unique_visitors" 
                  stroke="#82ca9d" 
                  name="الزوار"
                />
                <Line 
                  type="monotone" 
                  dataKey="organic_traffic" 
                  stroke="#ffc658" 
                  name="عضوي"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>أفضل الصفحات</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsBarChart data={pagePerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis 
                  dataKey="page" 
                  type="category" 
                  width={100}
                  tickFormatter={(value) => value.split('/').pop() || value}
                />
                <Tooltip />
                <Bar dataKey="views" fill="#8884d8" name="المشاهدات" />
              </RechartsBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>التفاصيل</CardTitle>
          <CardDescription>
            بيانات مفصلة لأداء الصفحات
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>التاريخ</TableHead>
                <TableHead>الصفحة</TableHead>
                <TableHead>المشاهدات</TableHead>
                <TableHead>الزوار</TableHead>
                <TableHead>معدل الارتداد</TableHead>
                <TableHead>CTR</TableHead>
                <TableHead>الموضع</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.slice(0, 20).map((metric, index) => (
                <TableRow key={index}>
                  <TableCell>
                    {new Date(metric.metric_date).toLocaleDateString('ar-DZ')}
                  </TableCell>
                  <TableCell className="font-mono text-sm max-w-xs truncate">
                    {metric.page_url}
                  </TableCell>
                  <TableCell>{metric.page_views.toLocaleString('ar-DZ')}</TableCell>
                  <TableCell>{metric.unique_visitors.toLocaleString('ar-DZ')}</TableCell>
                  <TableCell>
                    {metric.bounce_rate ? `${metric.bounce_rate.toFixed(1)}%` : '-'}
                  </TableCell>
                  <TableCell>
                    {metric.click_through_rate ? `${metric.click_through_rate.toFixed(2)}%` : '-'}
                  </TableCell>
                  <TableCell>
                    {metric.position ? (
                      <Badge variant={metric.position <= 10 ? 'default' : 'secondary'}>
                        {metric.position.toFixed(1)}
                      </Badge>
                    ) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}