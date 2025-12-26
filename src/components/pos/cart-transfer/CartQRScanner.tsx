/**
 * CartQRScanner - مكون قراءة QR Code للسلة
 *
 * يستخدم كاميرا الجهاز لقراءة QR Code
 * أو يمكن إدخال الكود يدوياً
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScanner } from 'html5-qrcode';
import { cn } from '@/lib/utils';
import {
  Camera,
  CameraOff,
  Keyboard,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  FlipHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { p2pCartService, CartTransferData } from '@/services/P2PCartService';
import { toast } from 'sonner';

interface CartQRScannerProps {
  onCartScanned: (cart: CartTransferData) => void;
  onError?: (error: string) => void;
  className?: string;
  autoStart?: boolean;
}

export function CartQRScanner({
  onCartScanned,
  onError,
  className,
  autoStart = false,
}: CartQRScannerProps) {
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scanResult, setScanResult] = useState<'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerContainerId = 'cart-qr-scanner';

  // الحصول على الكاميرات المتاحة
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((cameras) => {
        if (cameras && cameras.length > 0) {
          setAvailableCameras(cameras);
          // تفضيل الكاميرا الخلفية
          const backCamera = cameras.find(
            (c) => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('خلف')
          );
          setSelectedCameraId(backCamera?.id || cameras[0].id);
        }
      })
      .catch((err) => {
        console.error('Error getting cameras:', err);
      });
  }, []);

  // بدء/إيقاف المسح
  const toggleScanning = useCallback(async () => {
    if (isScanning) {
      // إيقاف المسح
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
          scannerRef.current = null;
        } catch (e) {
          console.error('Error stopping scanner:', e);
        }
      }
      setIsScanning(false);
    } else {
      // بدء المسح
      if (!selectedCameraId) {
        toast.error('لم يتم العثور على كاميرا');
        return;
      }

      try {
        scannerRef.current = new Html5Qrcode(scannerContainerId);

        await scannerRef.current.start(
          selectedCameraId,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          handleQrCodeSuccess,
          handleQrCodeError
        );

        setIsScanning(true);
        setScanResult(null);
        setErrorMessage(null);
      } catch (error) {
        console.error('Error starting scanner:', error);
        toast.error('فشل تشغيل الكاميرا');
        onError?.('فشل تشغيل الكاميرا');
      }
    }
  }, [isScanning, selectedCameraId]);

  // معالجة نجاح القراءة
  const handleQrCodeSuccess = useCallback(
    async (decodedText: string) => {
      // إيقاف المسح فوراً
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
          scannerRef.current = null;
        } catch (e) {
          console.error('Error stopping scanner:', e);
        }
      }
      setIsScanning(false);

      // معالجة البيانات
      processQrData(decodedText);
    },
    [onCartScanned, onError]
  );

  // معالجة خطأ القراءة
  const handleQrCodeError = useCallback((error: string) => {
    // تجاهل أخطاء عدم العثور على QR (طبيعية أثناء المسح)
    if (!error.includes('No QR code found')) {
      console.warn('QR scan error:', error);
    }
  }, []);

  // معالجة بيانات QR
  const processQrData = useCallback(
    (data: string) => {
      const cart = p2pCartService.decodeCartFromQR(data);

      if (cart) {
        setScanResult('success');
        setErrorMessage(null);
        toast.success(`تم استلام سلة بها ${cart.items.length} منتج`);
        onCartScanned(cart);
      } else {
        setScanResult('error');
        setErrorMessage('كود QR غير صالح');
        toast.error('كود QR غير صالح');
        onError?.('كود QR غير صالح');
      }
    },
    [onCartScanned, onError]
  );

  // معالجة الإدخال اليدوي
  const handleManualSubmit = useCallback(() => {
    if (!manualCode.trim()) {
      toast.error('يرجى إدخال الكود');
      return;
    }

    processQrData(manualCode.trim());
  }, [manualCode, processQrData]);

  // تبديل الكاميرا
  const switchCamera = useCallback(async () => {
    if (availableCameras.length <= 1) return;

    const currentIndex = availableCameras.findIndex((c) => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    const nextCamera = availableCameras[nextIndex];

    // إيقاف الكاميرا الحالية
    if (scannerRef.current && isScanning) {
      await scannerRef.current.stop();
      scannerRef.current = null;
    }

    setSelectedCameraId(nextCamera.id);

    // إعادة التشغيل إذا كان المسح نشطاً
    if (isScanning) {
      setTimeout(toggleScanning, 100);
    }
  }, [availableCameras, selectedCameraId, isScanning, toggleScanning]);

  // تنظيف عند الإزالة
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  // بدء تلقائي
  useEffect(() => {
    if (autoStart && selectedCameraId && !isScanning) {
      toggleScanning();
    }
  }, [autoStart, selectedCameraId]);

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'camera' | 'manual')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="camera" className="gap-2">
            <Camera className="h-4 w-4" />
            <span>كاميرا</span>
          </TabsTrigger>
          <TabsTrigger value="manual" className="gap-2">
            <Keyboard className="h-4 w-4" />
            <span>يدوي</span>
          </TabsTrigger>
        </TabsList>

        {/* مسح بالكاميرا */}
        <TabsContent value="camera" className="mt-4">
          <div className="flex flex-col items-center gap-4">
            {/* منطقة الكاميرا */}
            <div
              ref={containerRef}
              className="relative w-full max-w-[300px] aspect-square rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 border-2 border-dashed border-primary/30"
            >
              <div id={scannerContainerId} className="w-full h-full" />

              {!isScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
                  {scanResult === 'success' ? (
                    <div className="text-center">
                      <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-2" />
                      <p className="text-green-600 font-medium">تم بنجاح!</p>
                    </div>
                  ) : scanResult === 'error' ? (
                    <div className="text-center">
                      <XCircle className="h-16 w-16 text-red-500 mx-auto mb-2" />
                      <p className="text-red-600 font-medium">{errorMessage}</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">اضغط لبدء المسح</p>
                    </div>
                  )}
                </div>
              )}

              {isScanning && (
                <div className="absolute inset-0 pointer-events-none">
                  {/* إطار المسح */}
                  <div className="absolute inset-[15%] border-2 border-primary rounded-lg">
                    {/* زوايا متحركة */}
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg animate-pulse" />
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg animate-pulse" />
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg animate-pulse" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg animate-pulse" />
                  </div>

                  {/* خط المسح المتحرك */}
                  <div className="absolute left-[15%] right-[15%] h-0.5 bg-primary/80 animate-scan-line" />
                </div>
              )}
            </div>

            {/* أزرار التحكم */}
            <div className="flex items-center gap-2">
              <Button
                onClick={toggleScanning}
                variant={isScanning ? 'destructive' : 'default'}
                className="gap-2"
              >
                {isScanning ? (
                  <>
                    <CameraOff className="h-4 w-4" />
                    <span>إيقاف</span>
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4" />
                    <span>بدء المسح</span>
                  </>
                )}
              </Button>

              {availableCameras.length > 1 && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={switchCamera}
                  disabled={!isScanning}
                  title="تبديل الكاميرا"
                >
                  <FlipHorizontal className="h-4 w-4" />
                </Button>
              )}

              {scanResult && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setScanResult(null);
                    setErrorMessage(null);
                  }}
                  title="إعادة المحاولة"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </TabsContent>

        {/* الإدخال اليدوي */}
        <TabsContent value="manual" className="mt-4">
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">أدخل كود السلة:</label>
              <Input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="CART:..."
                className="font-mono text-sm"
                dir="ltr"
              />
            </div>

            <Button onClick={handleManualSubmit} className="w-full gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>استلام السلة</span>
            </Button>

            {scanResult === 'success' && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-green-700 dark:text-green-300">تم استلام السلة بنجاح!</span>
              </div>
            )}

            {scanResult === 'error' && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="text-red-700 dark:text-red-300">{errorMessage}</span>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* تعليمات */}
      <div className="text-center text-xs text-muted-foreground space-y-1">
        <p>وجّه الكاميرا نحو QR Code المعروض على الجهاز الآخر</p>
        <p>أو أدخل الكود يدوياً إذا لم تتوفر كاميرا</p>
      </div>

      {/* CSS للرسوم المتحركة */}
      <style>{`
        @keyframes scan-line {
          0%, 100% { top: 15%; }
          50% { top: 85%; }
        }
        .animate-scan-line {
          animation: scan-line 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default CartQRScanner;
