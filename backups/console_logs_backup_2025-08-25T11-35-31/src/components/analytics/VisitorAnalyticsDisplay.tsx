import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  MonitorIcon, 
  SmartphoneIcon, 
  TabletIcon,
  GlobeIcon,
  EyeIcon,
  UsersIcon,
  TrendingUpIcon,
  ExternalLinkIcon
} from 'lucide-react';
import { motion } from 'framer-motion';

interface AnalyticsData {
  traffic_by_device: Record<string, number>;
  traffic_by_location: Record<string, number>;
  traffic_by_website: Record<string, number>;
  total_views: number;
  total_visits: number;
  unique_visitors: number;
}

interface VisitorAnalyticsDisplayProps {
  data: AnalyticsData;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
  onRefresh?: () => void;
}

const DeviceIcon = ({ deviceType }: { deviceType: string }) => {
  switch (deviceType.toLowerCase()) {
    case 'mobile':
      return <SmartphoneIcon className="h-4 w-4" />;
    case 'tablet':
      return <TabletIcon className="h-4 w-4" />;
    default:
      return <MonitorIcon className="h-4 w-4" />;
  }
};

const getWebsiteIcon = (source: string) => {
  const sourceLower = source.toLowerCase();
  if (sourceLower.includes('google')) return '🔍';
  if (sourceLower.includes('facebook')) return '📘';
  if (sourceLower.includes('instagram')) return '📷';
  if (sourceLower.includes('tiktok')) return '🎵';
  if (sourceLower.includes('youtube')) return '📺';
  if (sourceLower.includes('twitter') || sourceLower.includes('x.com')) return '🐦';
  if (sourceLower === 'مباشر' || sourceLower === 'direct') return '🔗';
  return '🌐';
};

const getCountryFlag = (country: string) => {
  const countryLower = country.toLowerCase();
  if (countryLower.includes('الجزائر') || countryLower.includes('algeria')) return '🇩🇿';
  if (countryLower.includes('المغرب') || countryLower.includes('morocco')) return '🇲🇦';
  if (countryLower.includes('تونس') || countryLower.includes('tunisia')) return '🇹🇳';
  if (countryLower.includes('مصر') || countryLower.includes('egypt')) return '🇪🇬';
  if (countryLower.includes('فرنسا') || countryLower.includes('france')) return '🇫🇷';
  return '🌍';
};

const formatNumber = (num: number) => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}م`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}ك`;
  }
  return num.toString();
};

const StatCard: React.FC<{
  title: string;
  value: number;
  icon: React.ReactNode;
  change?: number;
  changeType?: 'increase' | 'decrease';
}> = ({ title, value, icon, change, changeType }) => (
  <Card className="overflow-hidden">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-center space-x-2">
            <p className="text-2xl font-bold">{formatNumber(value)}</p>
            {change !== undefined && (
              <Badge 
                variant={changeType === 'increase' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {changeType === 'increase' ? '+' : '-'}{Math.abs(change)}%
              </Badge>
            )}
          </div>
        </div>
        <div className="text-muted-foreground">
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

const DataListCard: React.FC<{
  title: string;
  data: Record<string, number>;
  icon: React.ReactNode;
  renderItem?: (key: string, value: number) => React.ReactNode;
  maxItems?: number;
}> = ({ title, data, icon, renderItem, maxItems = 5 }) => {
  const sortedData = Object.entries(data)
    .sort(([, a], [, b]) => b - a)
    .slice(0, maxItems);

  const total = Object.values(data).reduce((sum, value) => sum + value, 0);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          {icon}
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {sortedData.length > 0 ? (
            sortedData.map(([key, value]) => {
              const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
              
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between space-x-2"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {renderItem ? renderItem(key, value) : (
                      <>
                        <span className="text-sm font-medium truncate">{key}</span>
                        <Badge variant="outline" className="text-xs">
                          {percentage}%
                        </Badge>
                      </>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-right">
                    {formatNumber(value)}
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">لا توجد بيانات متاحة</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const LoadingSkeleton: React.FC = () => (
  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
    {/* إحصائيات رئيسية */}
    <div className="md:col-span-2 lg:col-span-3">
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>

    {/* بطاقات البيانات */}
    {[1, 2, 3].map((i) => (
      <Card key={i}>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

export const VisitorAnalyticsDisplay: React.FC<VisitorAnalyticsDisplayProps> = ({
  data,
  isLoading = false,
  error = null,
  className = '',
  onRefresh
}) => {
  if (isLoading) {
    return (
      <div className={className}>
        <LoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center p-8`}>
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <div className="text-red-500 mb-2">⚠️</div>
            <h3 className="font-semibold mb-2">خطأ في تحميل البيانات</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition-colors"
              >
                إعادة المحاولة
              </button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* إحصائيات رئيسية */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="إجمالي المشاهدات"
            value={data.total_views}
            icon={<EyeIcon className="h-8 w-8" />}
          />
          <StatCard
            title="إجمالي الزيارات"
            value={data.total_visits}
            icon={<TrendingUpIcon className="h-8 w-8" />}
          />
          <StatCard
            title="الزوار الفريدون"
            value={data.unique_visitors}
            icon={<UsersIcon className="h-8 w-8" />}
          />
        </div>
      </motion.div>

      {/* بطاقات البيانات المفصلة */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        {/* الزيارات حسب الجهاز */}
        <DataListCard
          title="الزيارات حسب الجهاز"
          data={data.traffic_by_device}
          icon={<MonitorIcon className="h-5 w-5" />}
          renderItem={(device, count) => {
            const percentage = Object.values(data.traffic_by_device).reduce((sum, val) => sum + val, 0);
            const devicePercentage = percentage > 0 ? Math.round((count / percentage) * 100) : 0;
            
            return (
              <>
                <div className="flex items-center gap-2">
                  <DeviceIcon deviceType={device} />
                  <span className="text-sm font-medium">
                    {device === 'desktop' ? 'سطح المكتب' : 
                     device === 'mobile' ? 'الهاتف المحمول' : 
                     device === 'tablet' ? 'الجهاز اللوحي' : device}
                  </span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {devicePercentage}%
                </Badge>
              </>
            );
          }}
        />

        {/* الزيارات حسب الموقع */}
        <DataListCard
          title="الزيارات حسب البلد"
          data={data.traffic_by_location}
          icon={<GlobeIcon className="h-5 w-5" />}
          renderItem={(location, count) => {
            const percentage = Object.values(data.traffic_by_location).reduce((sum, val) => sum + val, 0);
            const locationPercentage = percentage > 0 ? Math.round((count / percentage) * 100) : 0;
            
            return (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getCountryFlag(location)}</span>
                  <span className="text-sm font-medium">{location}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {locationPercentage}%
                </Badge>
              </>
            );
          }}
        />

        {/* الزيارات حسب المصدر */}
        <DataListCard
          title="الزيارات حسب المصدر"
          data={data.traffic_by_website}
          icon={<ExternalLinkIcon className="h-5 w-5" />}
          renderItem={(source, count) => {
            const percentage = Object.values(data.traffic_by_website).reduce((sum, val) => sum + val, 0);
            const sourcePercentage = percentage > 0 ? Math.round((count / percentage) * 100) : 0;
            
            return (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getWebsiteIcon(source)}</span>
                  <span className="text-sm font-medium">{source}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {sourcePercentage}%
                </Badge>
              </>
            );
          }}
        />
      </motion.div>

      {/* معلومات إضافية */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="text-center"
      >
        <p className="text-sm text-muted-foreground">
          آخر تحديث: {new Date().toLocaleString('ar-SA')}
        </p>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="mt-2 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            تحديث البيانات
          </button>
        )}
      </motion.div>
    </div>
  );
};

export default VisitorAnalyticsDisplay;
