import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { Share2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { buildTrackingUrl } from '@/lib/utils/store-url';
import { useAuth } from '@/context/AuthContext';

interface ShareRepairDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackingCode: string;
  orderId: string;
}

export const ShareRepairDialog: React.FC<ShareRepairDialogProps> = ({
  open,
  onOpenChange,
  trackingCode,
  orderId,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const { currentOrganization } = useAuth();
  
  // بناء رابط التتبع باستخدام النطاق المخصص أو النطاق الفرعي
  const trackingUrl = buildTrackingUrl(trackingCode, currentOrganization);

  // نسخ الرابط إلى الحافظة
  const copyToClipboard = () => {
    navigator.clipboard.writeText(trackingUrl)
      .then(() => {
        setIsCopied(true);
        toast.success('تم نسخ رابط التتبع');
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch(() => {
        toast.error('فشل في نسخ الرابط');
      });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            مشاركة رابط تتبع الطلبية
          </DialogTitle>
          <DialogDescription>
            يمكنك مشاركة الرابط التالي مع العميل لتتبع حالة طلبية التصليح
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-lg mb-2 text-sm break-all font-mono ltr text-gray-700 dark:text-gray-300">
            {trackingUrl}
          </div>
          
          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <QRCodeSVG 
                value={trackingUrl} 
                size={150}
                bgColor="white"
                fgColor="black"
              />
            </div>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
            <p className="text-sm text-blue-600 dark:text-blue-400 text-center">
              💡 سيتمكن العميل من متابعة حالة الطلبية وتحديثاتها من خلال هذا الرابط
            </p>
          </div>
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="sm:flex-1"
          >
            إغلاق
          </Button>
          <Button 
            onClick={copyToClipboard} 
            className="gap-2 sm:flex-1"
          >
            {isCopied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            نسخ رابط التتبع
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShareRepairDialog;
