// =====================================================
// بطاقة كود الإحالة - Referral Code Card
// =====================================================

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Copy,
  Check,
  Share2,
  Link2,
  MessageCircle,
  Facebook,
  QrCode,
  Eye,
  MousePointer,
  UserPlus,
  CreditCard,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useReferralCode } from '@/hooks/useReferralCode';
import { QRCodeSVG } from 'qrcode.react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ReferralCodeCardProps {
  className?: string;
}

export function ReferralCodeCard({ className }: ReferralCodeCardProps) {
  const {
    code,
    referralLink,
    isLoading,
    isActive,
    hasCode,
    isCreating,
    totalClicks,
    totalSignups,
    totalSubscriptions,
    createCode,
    copyCode,
    copyLink,
    shareViaWhatsApp,
    shareViaFacebook,
  } = useReferralCode();

  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [showQR, setShowQR] = useState(false);

  const handleCopyCode = async () => {
    const success = await copyCode();
    if (success) {
      setCopied('code');
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const handleCopyLink = async () => {
    const success = await copyLink();
    if (success) {
      setCopied('link');
      setTimeout(() => setCopied(null), 2000);
    }
  };

  if (isLoading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader>
          <div className="h-6 w-32 rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="h-12 w-full rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (!hasCode) {
    return (
      <Card className={cn('text-center', className)}>
        <CardContent className="py-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Share2 className="h-8 w-8 text-primary" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">ابدأ برنامج الإحالة</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            أنشئ كود الإحالة الخاص بك وابدأ بكسب النقاط عند دعوة أصدقائك
          </p>
          <Button onClick={() => createCode()} disabled={isCreating}>
            {isCreating ? 'جاري الإنشاء...' : 'إنشاء كود الإحالة'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Link2 className="h-5 w-5" />
            كود الإحالة الخاص بك
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* عرض الكود */}
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-lg border bg-muted/50 px-4 py-3 text-center">
              <span className="font-mono text-2xl font-bold tracking-widest">
                {code}
              </span>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyCode}
                  >
                    {copied === 'code' ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>نسخ الكود</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* أزرار المشاركة */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleCopyLink}
            >
              {copied === 'link' ? (
                <Check className="ml-2 h-4 w-4 text-green-600" />
              ) : (
                <Link2 className="ml-2 h-4 w-4" />
              )}
              نسخ الرابط
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setShowQR(true)}
            >
              <QrCode className="ml-2 h-4 w-4" />
              QR Code
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1">
                  <Share2 className="ml-2 h-4 w-4" />
                  مشاركة
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={shareViaWhatsApp}>
                  <MessageCircle className="ml-2 h-4 w-4 text-green-600" />
                  واتساب
                </DropdownMenuItem>
                <DropdownMenuItem onClick={shareViaFacebook}>
                  <Facebook className="ml-2 h-4 w-4 text-blue-600" />
                  فيسبوك
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* إحصائيات الكود */}
          <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/30 p-3">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground">
                <MousePointer className="h-3 w-3" />
                <span className="text-xs">نقرات</span>
              </div>
              <p className="text-lg font-semibold">{totalClicks}</p>
            </div>
            <div className="text-center border-x">
              <div className="flex items-center justify-center gap-1 text-muted-foreground">
                <UserPlus className="h-3 w-3" />
                <span className="text-xs">تسجيلات</span>
              </div>
              <p className="text-lg font-semibold">{totalSignups}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground">
                <CreditCard className="h-3 w-3" />
                <span className="text-xs">اشتراكات</span>
              </div>
              <p className="text-lg font-semibold">{totalSubscriptions}</p>
            </div>
          </div>

          {!isActive && (
            <p className="text-center text-sm text-yellow-600 dark:text-yellow-500">
              كود الإحالة معطل حالياً
            </p>
          )}
        </CardContent>
      </Card>

      {/* حوار QR Code */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">رمز QR للإحالة</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {referralLink && (
              <div className="rounded-lg bg-white p-4">
                <QRCodeSVG
                  value={referralLink}
                  size={200}
                  level="H"
                  includeMargin
                />
              </div>
            )}
            <p className="text-center text-sm text-muted-foreground">
              امسح الرمز للتسجيل والحصول على خصم 20%
            </p>
            <p className="font-mono text-lg font-bold">{code}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ReferralCodeCard;
