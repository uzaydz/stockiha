import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  FileText, 
  Bot, 
  Map, 
  Code, 
  BarChart, 
  Settings
} from 'lucide-react';
import { GeneralSettings } from '@/components/seo/GeneralSettings';
import { PageMetaManager } from '@/components/seo/PageMetaManager';
import { RobotsManager } from '@/components/seo/RobotsManager';
import { SitemapManager } from '@/components/seo/SitemapManager';
import { StructuredDataManager } from '@/components/seo/StructuredDataManager';
import { SEOAnalytics } from '@/components/seo/SEOAnalytics';

export default function SuperAdminSEO() {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Search className="h-8 w-8" />
          إدارة SEO والأرشفة
        </h1>
        <p className="text-muted-foreground mt-2">
          إدارة شاملة لتحسين محركات البحث وأرشفة الموقع
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 lg:grid-cols-6 gap-2 h-auto">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            عام
          </TabsTrigger>
          <TabsTrigger value="meta" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Meta Tags
          </TabsTrigger>
          <TabsTrigger value="robots" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Robots.txt
          </TabsTrigger>
          <TabsTrigger value="sitemap" className="flex items-center gap-2">
            <Map className="h-4 w-4" />
            Sitemap
          </TabsTrigger>
          <TabsTrigger value="structured" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            Schema
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart className="h-4 w-4" />
            تحليلات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralSettings />
        </TabsContent>

        <TabsContent value="meta">
          <PageMetaManager />
        </TabsContent>

        <TabsContent value="robots">
          <RobotsManager />
        </TabsContent>

        <TabsContent value="sitemap">
          <SitemapManager />
        </TabsContent>

        <TabsContent value="structured">
          <StructuredDataManager />
        </TabsContent>

        <TabsContent value="analytics">
          <SEOAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
