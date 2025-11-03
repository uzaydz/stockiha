import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Scan, AlertTriangle, Smartphone } from 'lucide-react';

declare global {
  interface Window {
    BarcodeDetector?: new (config?: { formats?: string[] }) => {
      detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
    };
  }
}

interface MobileBarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBarcodeDetected: (barcode: string) => void;
  hasCameraAccess?: boolean;
  hasNativeDetector?: boolean;
  isProcessing?: boolean;
}

const SUPPORTED_FORMATS = ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e'];

const MobileBarcodeScanner: React.FC<MobileBarcodeScannerProps> = ({
  open,
  onOpenChange,
  onBarcodeDetected,
  hasCameraAccess = false,
  hasNativeDetector = false,
  isProcessing = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number>();
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [detectedValue, setDetectedValue] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = undefined;
    }

    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
  }, []);

  const handleDetection = useCallback((value: string) => {
    if (!value || value === detectedValue) {
      return;
    }

    setDetectedValue(value);
    stopCamera();
    onBarcodeDetected(value);
    onOpenChange(false);
  }, [detectedValue, onBarcodeDetected, onOpenChange, stopCamera]);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setDetectedValue(null);
      setError(null);
      return;
    }

    if (!hasCameraAccess) {
      setError('⚠️ الكاميرا غير متاحة في هذا الجهاز أو تم رفض الإذن.');
      return;
    }

    let isMounted = true;

    const startCamera = async () => {
      try {
        setIsInitializing(true);
        setError(null);

        const stream = await navigator.mediaDevices?.getUserMedia?.({
          video: { facingMode: { ideal: 'environment' } },
          audio: false
        });

        if (!isMounted) {
          stream?.getTracks().forEach((track) => track.stop());
          return;
        }

        if (!stream) {
          setError('⚠️ تعذر الوصول إلى الكاميرا.');
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        if (hasNativeDetector && window.BarcodeDetector) {
          const detector = new window.BarcodeDetector({ formats: SUPPORTED_FORMATS });

          const detect = async () => {
            if (!videoRef.current) {
              frameRef.current = requestAnimationFrame(detect);
              return;
            }

            try {
              const results = await detector.detect(videoRef.current);
              const firstResult = results?.[0];

              if (firstResult?.rawValue) {
                handleDetection(firstResult.rawValue);
                return;
              }
            } catch (detectorError) {
              console.error('Barcode detection failed', detectorError);
            }

            frameRef.current = requestAnimationFrame(detect);
          };

          frameRef.current = requestAnimationFrame(detect);
        } else {
          setError('ℹ️ المتصفح لا يدعم قراءة الباركود مباشرة. استخدم الإدخال اليدوي بعد مشاهدة الكاميرا.');
        }
      } catch (cameraError: any) {
        console.error('Camera error', cameraError);
        setError('⚠️ تعذر تشغيل الكاميرا. تحقق من الأذونات أو جرب متصفحاً آخر.');
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [open, hasCameraAccess, hasNativeDetector, handleDetection, stopCamera]);

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (!value) {
        stopCamera();
      }
      onOpenChange(value);
    }}>
      <DialogContent className="w-[95%] max-w-xl border border-border/40 bg-background p-0 sm:max-w-2xl" dir="rtl">
        <DialogHeader className="px-3 pt-3 sm:px-4 sm:pt-4 md:px-5 md:pt-5">
          <DialogTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <Scan className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            سكان الباركود
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2.5 sm:gap-3 md:gap-4 px-3 pb-3 sm:px-4 sm:pb-4 md:px-5 md:pb-5">
          {hasCameraAccess ? (
            <div className="relative aspect-video w-full overflow-hidden rounded-xl sm:rounded-2xl border border-primary/30 bg-black/80">
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                playsInline
                muted
              />
              <div className="pointer-events-none absolute inset-4 sm:inset-6 rounded-xl sm:rounded-2xl border-2 border-primary/60 shadow-[0_0_0_2000px_rgba(0,0,0,0.35)]" />
              <div className="pointer-events-none absolute left-0 right-0 bottom-2 sm:bottom-3 md:bottom-4 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-white/90 px-2">
                <Scan className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="text-center">وجّه الكاميرا نحو الباركود</span>
              </div>
              {(isInitializing || isProcessing) && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-white" />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl border border-dashed border-amber-300 bg-amber-50/70 p-4 sm:p-6 text-center text-amber-800">
              <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8" />
              <p className="text-xs sm:text-sm font-medium">لا يمكن الوصول إلى الكاميرا</p>
              <p className="text-[10px] sm:text-xs">تحقق من الأذونات أو استخدم الإدخال اليدوي</p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg sm:rounded-xl border border-red-300/70 bg-red-50/80 p-2 sm:p-3 text-xs sm:text-sm text-red-700">
              <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 mt-0.5" />
              <span className="flex-1">{error}</span>
            </div>
          )}

          {detectedValue && (
            <div className="flex items-center justify-between rounded-lg sm:rounded-xl border border-emerald-300/70 bg-emerald-50/80 p-2 sm:p-3 text-xs sm:text-sm text-emerald-700">
              <div className="flex flex-col gap-0.5">
                <span className="font-medium text-xs sm:text-sm">تم التقاط الباركود</span>
                <span className="font-mono text-sm sm:text-base md:text-lg">{detectedValue}</span>
              </div>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-[10px] sm:text-xs h-5 sm:h-6">تم</Badge>
            </div>
          )}

          <div className="flex flex-col gap-1.5 sm:gap-2 md:gap-3 rounded-lg sm:rounded-xl border border-border/40 bg-muted/30 p-2 sm:p-2.5 md:p-3 text-[10px] sm:text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Smartphone className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
              <span className="font-medium">نصائح:</span>
            </div>
            <ul className="list-disc space-y-0.5 sm:space-y-1 pr-4 sm:pr-5">
              <li>إضاءة جيدة والباركود داخل الإطار</li>
              <li>ثبّت الهاتف حتى يظهر الكود</li>
              <li>يمكنك الإدخال يدوياً إذا لم ينجح</li>
            </ul>
          </div>

          <div className="flex items-center justify-end pt-1">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 sm:h-9 text-xs sm:text-sm px-4 sm:px-6"
            >
              إغلاق
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default React.memo(MobileBarcodeScanner);
