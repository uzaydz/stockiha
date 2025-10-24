import React, { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ProductFormValues } from '@/types/product';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  History, 
  Facebook, 
  Play, 
  CheckCircle2, 
  Clock, 
  Server,
  Eye,
  Package,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { usePreviousPixelsLazy, FacebookPixelData, GoogleTrackingData, TikTokPixelData } from '@/hooks/usePreviousPixels';
import { cn } from '@/lib/utils';

// أيقونة Google
const GoogleAdsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18"/>
    <path d="M7 12v5h12V8l-5 5-4-4Z"/>
  </svg>
);

interface PreviousPixelsSelectorProps {
  form: UseFormReturn<ProductFormValues>;
  organizationId: string;
  platform: 'facebook' | 'google' | 'tiktok';
}

export const PreviousPixelsSelector: React.FC<PreviousPixelsSelectorProps> = ({
  form,
  organizationId,
  platform
}) => {
  const [open, setOpen] = useState(false);
  const { data, loading, error, fetchPreviousPixels } = usePreviousPixelsLazy();
  const [selectedPixel, setSelectedPixel] = useState<any>(null);

  // جلب البيانات عند فتح الـ Dialog
  useEffect(() => {
    if (open && !data) {
      fetchPreviousPixels(organizationId);
    }
  }, [open, organizationId]);

  const handleSelectPixel = () => {
    if (!selectedPixel) return;

    if (platform === 'facebook') {
      const pixel = selectedPixel as FacebookPixelData;
      form.setValue('marketingSettings.facebook_pixel_id', pixel.pixel_id);
      form.setValue('marketingSettings.enable_facebook_conversion_api', pixel.conversion_api_enabled || false);
      if (pixel.access_token) {
        form.setValue('marketingSettings.facebook_access_token', pixel.access_token);
      }
      if (pixel.test_event_code) {
        form.setValue('marketingSettings.facebook_test_event_code', pixel.test_event_code);
      }
    } else if (platform === 'google') {
      const tracking = selectedPixel as GoogleTrackingData;
      if (tracking.gtag_id) {
        form.setValue('marketingSettings.google_gtag_id', tracking.gtag_id);
      }
      if (tracking.conversion_id) {
        form.setValue('marketingSettings.google_ads_conversion_id', tracking.conversion_id);
      }
      if (tracking.conversion_label) {
        form.setValue('marketingSettings.google_ads_conversion_label', tracking.conversion_label);
      }
      form.setValue('marketingSettings.google_ads_enhanced_conversions_enabled', tracking.enhanced_conversions || false);
    } else if (platform === 'tiktok') {
      const pixel = selectedPixel as TikTokPixelData;
      form.setValue('marketingSettings.tiktok_pixel_id', pixel.pixel_id);
      form.setValue('marketingSettings.tiktok_events_api_enabled', pixel.events_api_enabled || false);
      if (pixel.access_token) {
        form.setValue('marketingSettings.tiktok_access_token', pixel.access_token);
      }
      if (pixel.test_event_code) {
        form.setValue('marketingSettings.tiktok_test_event_code', pixel.test_event_code);
      }
    }

    setOpen(false);
    setSelectedPixel(null);
  };

  const getPlatformData = () => {
    if (!data) return [];
    
    switch (platform) {
      case 'facebook':
        return data.facebook_pixels || [];
      case 'google':
        return data.google_tracking || [];
      case 'tiktok':
        return data.tiktok_pixels || [];
      default:
        return [];
    }
  };

  const platformConfig = {
    facebook: {
      title: 'بكسلات فيسبوك السابقة',
      description: 'اختر من البكسلات المستخدمة سابقاً في منتجاتك',
      icon: Facebook,
      color: 'bg-blue-100 dark:bg-blue-900/60',
      textColor: 'text-blue-600 dark:text-blue-400'
    },
    google: {
      title: 'تتبع جوجل السابق',
      description: 'اختر من معرفات جوجل المستخدمة سابقاً',
      icon: GoogleAdsIcon,
      color: 'bg-green-100 dark:bg-green-900/60',
      textColor: 'text-green-600 dark:text-green-400'
    },
    tiktok: {
      title: 'بكسلات تيك توك السابقة',
      description: 'اختر من البكسلات المستخدمة سابقاً في منتجاتك',
      icon: Play,
      color: 'bg-pink-100 dark:bg-pink-900/60',
      textColor: 'text-pink-600 dark:text-pink-400'
    }
  };

  const config = platformConfig[platform];
  const PlatformIcon = config.icon;
  const pixelsData = getPlatformData();

  const renderPixelCard = (pixel: any, index: number) => {
    const isSelected = selectedPixel === pixel;

    if (platform === 'facebook') {
      const fbPixel = pixel as FacebookPixelData;
      return (
        <div
          key={index}
          onClick={() => setSelectedPixel(pixel)}
          className={cn(
            "p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md",
            isSelected 
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30" 
              : "border-border hover:border-blue-300"
          )}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-600" />
                <span className="font-mono text-sm font-medium">{fbPixel.pixel_id}</span>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600 ml-auto" />}
              </div>
              
              {fbPixel.conversion_api_enabled && (
                <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950/30">
                  <Server className="w-3 h-3 mr-1" />
                  Conversion API
                </Badge>
              )}

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  <span>{fbPixel.product_count} منتج</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(fbPixel.last_used).toLocaleDateString('ar-DZ')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    } else if (platform === 'google') {
      const googleTracking = pixel as GoogleTrackingData;
      return (
        <div
          key={index}
          onClick={() => setSelectedPixel(pixel)}
          className={cn(
            "p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md",
            isSelected 
              ? "border-green-500 bg-green-50 dark:bg-green-950/30" 
              : "border-border hover:border-green-300"
          )}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              {googleTracking.gtag_id && (
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-green-600" />
                  <span className="font-mono text-sm font-medium">{googleTracking.gtag_id}</span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-green-600 ml-auto" />}
                </div>
              )}
              
              {googleTracking.conversion_id && (
                <div className="text-xs text-muted-foreground font-mono">
                  {googleTracking.conversion_id}
                </div>
              )}

              {googleTracking.enhanced_conversions && (
                <Badge variant="outline" className="text-xs bg-purple-50 dark:bg-purple-950/30">
                  Enhanced Conversions
                </Badge>
              )}

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  <span>{googleTracking.product_count} منتج</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(googleTracking.last_used).toLocaleDateString('ar-DZ')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    } else if (platform === 'tiktok') {
      const ttPixel = pixel as TikTokPixelData;
      return (
        <div
          key={index}
          onClick={() => setSelectedPixel(pixel)}
          className={cn(
            "p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md",
            isSelected 
              ? "border-pink-500 bg-pink-50 dark:bg-pink-950/30" 
              : "border-border hover:border-pink-300"
          )}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-pink-600" />
                <span className="font-mono text-sm font-medium">{ttPixel.pixel_id}</span>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-pink-600 ml-auto" />}
              </div>
              
              {ttPixel.events_api_enabled && (
                <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950/30">
                  <Server className="w-3 h-3 mr-1" />
                  Events API
                </Badge>
              )}

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  <span>{ttPixel.product_count} منتج</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(ttPixel.last_used).toLocaleDateString('ar-DZ')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <History className="w-4 h-4" />
          اختيار من السابق
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", config.color)}>
              <PlatformIcon className={cn("w-5 h-5", config.textColor)} />
            </div>
            <div>
              <DialogTitle>{config.title}</DialogTitle>
              <DialogDescription>{config.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <ScrollArea className="max-h-[400px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">جاري التحميل...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8 text-destructive">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span className="text-sm">{error}</span>
            </div>
          ) : pixelsData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <History className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">لا توجد بكسلات سابقة</p>
              <p className="text-xs mt-1">ستظهر هنا البكسلات بعد استخدامها في منتجات أخرى</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pixelsData.map((pixel, index) => renderPixelCard(pixel, index))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            إلغاء
          </Button>
          <Button 
            onClick={handleSelectPixel} 
            disabled={!selectedPixel}
            className="gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            تطبيق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PreviousPixelsSelector;

