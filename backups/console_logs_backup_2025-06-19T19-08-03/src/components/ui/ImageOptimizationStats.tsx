import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  FileImage, 
  Zap, 
  TrendingDown, 
  Clock, 
  Maximize2,
  FileType
} from 'lucide-react';

interface OptimizationStats {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  originalDimensions: { width: number; height: number };
  newDimensions: { width: number; height: number };
  originalFormat: string;
  newFormat: string;
  processingTime?: number;
}

interface ImageOptimizationStatsProps {
  stats: OptimizationStats;
  className?: string;
}

export function ImageOptimizationStats({ stats, className = "" }: ImageOptimizationStatsProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCompressionColor = (ratio: number): string => {
    if (ratio >= 80) return 'bg-green-500';
    if (ratio >= 60) return 'bg-blue-500';
    if (ratio >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getCompressionLabel = (ratio: number): string => {
    if (ratio >= 80) return 'ممتاز';
    if (ratio >= 60) return 'جيد جداً';
    if (ratio >= 40) return 'جيد';
    return 'متوسط';
  };

  return (
    <Card className={`w-full max-w-2xl ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5 text-green-600" />
          إحصائيات تحسين الصورة
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* نسبة الضغط الرئيسية */}
        <div className="text-center p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 rounded-lg border">
          <div className="text-3xl font-bold text-green-600 mb-1">
            {stats.compressionRatio.toFixed(1)}%
          </div>
          <div className="text-sm text-muted-foreground">
            توفير في الحجم - {getCompressionLabel(stats.compressionRatio)}
          </div>
          <Progress 
            value={stats.compressionRatio} 
            className="mt-2 h-2"
          />
        </div>

        {/* تفاصيل الأحجام */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileImage className="h-4 w-4 text-gray-500" />
              الحجم الأصلي
            </div>
            <div className="text-lg font-semibold text-red-600">
              {formatFileSize(stats.originalSize)}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <TrendingDown className="h-4 w-4 text-green-500" />
              الحجم المحسن
            </div>
            <div className="text-lg font-semibold text-green-600">
              {formatFileSize(stats.compressedSize)}
            </div>
          </div>
        </div>

        {/* تفاصيل الأبعاد */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Maximize2 className="h-4 w-4 text-gray-500" />
              الأبعاد الأصلية
            </div>
            <div className="text-sm">
              {stats.originalDimensions.width} × {stats.originalDimensions.height}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Maximize2 className="h-4 w-4 text-blue-500" />
              الأبعاد المحسنة
            </div>
            <div className="text-sm">
              {stats.newDimensions.width} × {stats.newDimensions.height}
            </div>
          </div>
        </div>

        {/* تفاصيل التنسيق */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileType className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">التنسيق:</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {stats.originalFormat.toUpperCase()}
            </Badge>
            <span className="text-gray-400">→</span>
            <Badge variant="default" className="text-xs bg-green-600">
              {stats.newFormat.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* وقت المعالجة */}
        {stats.processingTime && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">وقت المعالجة:</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {stats.processingTime.toFixed(0)}ms
            </div>
          </div>
        )}

        {/* شريط التوفير */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>التوفير المحقق</span>
            <span>{formatFileSize(stats.originalSize - stats.compressedSize)}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${getCompressionColor(stats.compressionRatio)}`}
              style={{ width: `${stats.compressionRatio}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ImageOptimizationStats;
