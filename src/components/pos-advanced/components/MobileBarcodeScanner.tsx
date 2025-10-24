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
        <DialogHeader className="px-5 pt-5">
          <DialogTitle className="text-lg font-semibold">سكان الباركود بالكاميرا</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-5 pb-5">
          {hasCameraAccess ? (
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-primary/30 bg-black/80">
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                playsInline
                muted
              />
              <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-primary/60 shadow-[0_0_0_2000px_rgba(0,0,0,0.35)]" />
              <div className="pointer-events-none absolute left-0 right-0 bottom-4 flex items-center justify-center gap-2 text-sm font-medium text-white/90">
                <Scan className="h-4 w-4" />
                وجّه الكاميرا نحو الباركود حتى يظهر بوضوح
              </div>
              {(isInitializing || isProcessing) && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="h-10 w-10 animate-spin text-white" />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-amber-300 bg-amber-50/70 p-6 text-center text-amber-800">
              <AlertTriangle className="h-8 w-8" />
              <p className="text-sm font-medium">لا يمكن الوصول إلى الكاميرا على هذا الجهاز.</p>
              <p className="text-xs">تحقق من الأذونات أو استخدم إدخال الباركود اليدوي.</p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-300/70 bg-red-50/80 p-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {detectedValue && (
            <div className="flex items-center justify-between rounded-xl border border-emerald-300/70 bg-emerald-50/80 p-3 text-sm text-emerald-700">
              <div className="flex flex-col">
                <span className="font-medium">تم التقاط الباركود</span>
                <span className="font-mono text-lg">{detectedValue}</span>
              </div>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">تم</Badge>
            </div>
          )}

          <div className="flex flex-col gap-3 rounded-xl border border-border/40 bg-muted/30 p-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              <span>نصائح:</span>
            </div>
            <ul className="list-disc space-y-1 pr-5">
              <li>اجعل الباركود داخل الإطار مع إضاءة جيدة.</li>
              <li>حافظ على ثبات الهاتف حتى يظهر الكود بوضوح.</li>
              <li>يمكنك دائماً إدخال الباركود يدوياً إذا لم ينجح السكانر.</li>
            </ul>
          </div>

          <div className="flex items-center justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              إغلاق
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default React.memo(MobileBarcodeScanner);
