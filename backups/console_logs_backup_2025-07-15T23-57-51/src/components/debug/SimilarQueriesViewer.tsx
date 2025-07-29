import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SimilarQueriesGroup, QueryPerformanceInfo } from './types';
import { similarQueriesGroups, performanceInfo } from './queryAnalytics';

// مكون لعرض مجموعات الاستعلامات المتشابهة
export const SimilarQueriesViewer = () => {
  // التحقق من وجود مجموعات
  if (similarQueriesGroups.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        لم يتم العثور على مجموعات استعلامات متشابهة بعد. يحتاج التحليل إلى وجود 5 استعلامات على الأقل.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المجموعات المتشابهة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{similarQueriesGroups.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">الوقت المحتمل توفيره</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(performanceInfo.potentialTimeSaved / 1000).toFixed(2)} ثانية</div>
          </CardContent>
        </Card>
      </div>

      {/* قائمة المجموعات */}
      <div className="space-y-4">
        {similarQueriesGroups.map(group => (
          <SimilarQueryGroupCard key={group.id} group={group} />
        ))}
      </div>
    </div>
  );
};

// مكون لعرض بطاقة مجموعة استعلامات متشابهة
interface SimilarQueryGroupCardProps {
  group: SimilarQueriesGroup;
}

export const SimilarQueryGroupCard: React.FC<SimilarQueryGroupCardProps> = ({ group }) => {
  return (
    <Card className="overflow-hidden border border-muted">
      <CardHeader className="pb-2 bg-muted/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            {group.tableName && <span className="font-bold">{group.tableName}</span>}
            {" - "}
            <span>{group.queryType}</span>
          </CardTitle>
          <div className="flex gap-2">
            <Badge>{group.count} استعلامات</Badge>
            <Badge variant="outline">{Math.round(group.avgDuration)}ms</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3 text-sm">
          <div>
            <span className="font-medium">النمط:</span>
            <code className="text-xs bg-muted mx-1 p-1 rounded">{group.pattern}</code>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-2">
            <span className="font-medium">المكونات:</span>
            {group.components.map(component => (
              <Badge key={component} variant="secondary" className="text-xs">
                {component}
              </Badge>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-medium">قابلية التخزين المؤقت:</span>
              <div className="flex items-center mt-1">
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      group.cacheability > 7 ? 'bg-green-500' : 
                      group.cacheability > 4 ? 'bg-yellow-500' : 'bg-red-500'
                    }`} 
                    style={{ width: `${group.cacheability * 10}%` }}
                  />
                </div>
                <span className="ml-2 text-sm">{group.cacheability}/10</span>
              </div>
            </div>
            
            {group.suggestedTTL && (
              <div>
                <span className="font-medium">مدة التخزين المقترحة:</span>
                <div className="mt-1 font-mono">
                  {group.suggestedTTL} ثانية
                  {group.suggestedTTL >= 60 && ` (${Math.floor(group.suggestedTTL / 60)} دقيقة)`}
                </div>
              </div>
            )}
          </div>

          <div>
            <span className="font-medium">التوصية:</span>
            <p className="mt-1 text-muted-foreground">{group.cacheReason}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// مكون لعرض توصيات الأداء
export const PerformanceRecommendations = () => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4 mb-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الاستعلامات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceInfo.totalQueries}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">الاستعلامات البطيئة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceInfo.slowQueries}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">متوسط وقت الاستعلام</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceInfo.avgQueryTime.toFixed(2)}ms</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">مرشحات التخزين المؤقت</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceInfo.cacheableCandidates}</div>
          </CardContent>
        </Card>
      </div>

      {/* قائمة التوصيات */}
      <h3 className="text-lg font-semibold mb-3">توصيات لتحسين الأداء</h3>
      <div className="space-y-4">
        {performanceInfo.recommendations.length === 0 ? (
          <div className="text-center p-4 text-muted-foreground">
            لا توجد توصيات حاليًا. قم بتنفيذ المزيد من الاستعلامات للحصول على تحليل أفضل.
          </div>
        ) : (
          performanceInfo.recommendations.map((rec, idx) => (
            <Card key={idx} className={`border-l-4 ${
              rec.impact === 'high' ? 'border-l-red-500' :
              rec.impact === 'medium' ? 'border-l-yellow-500' : 'border-l-green-500'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    {rec.type === 'cache' && (
                      <span className="text-blue-500">تحسين التخزين المؤقت</span>
                    )}
                    {rec.type === 'optimize' && (
                      <span className="text-orange-500">تحسين الاستعلامات</span>
                    )}
                    {rec.type === 'index' && (
                      <span className="text-violet-500">تحسين الفهارس</span>
                    )}
                    {rec.type === 'refactor' && (
                      <span className="text-teal-500">إعادة هيكلة</span>
                    )}
                  </h4>
                  <Badge variant={
                    rec.impact === 'high' ? 'destructive' :
                    rec.impact === 'medium' ? 'default' : 'outline'
                  }>
                    {rec.impact === 'high' && 'تأثير عالي'}
                    {rec.impact === 'medium' && 'تأثير متوسط'}
                    {rec.impact === 'low' && 'تأثير منخفض'}
                  </Badge>
                </div>
                <p className="text-sm">{rec.description}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
