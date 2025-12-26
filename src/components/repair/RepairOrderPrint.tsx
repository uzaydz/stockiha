import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Printer,
  Settings,
  Ticket,
  FileText,
  QrCode,
  MapPin,
  ShieldCheck,
  Eye,
  Loader2
} from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useTenant } from '@/context/TenantContext';
import { RepairOrder } from '@/types/repair';
import RepairReceiptPrint from './RepairReceiptPrint';
import { supabase } from '@/lib/supabase';
import { buildTrackingUrl } from '@/lib/utils/store-url';
import '@/styles/repair-print.css';
import { usePrinter } from '@/hooks/usePrinter';
import { useRepairReceiptSettings } from '@/hooks/useRepairReceiptSettings';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

// ----------------------------------------------------------------------

interface RepairOrderPrintProps {
  order: RepairOrder;
  queuePosition?: number;
  showPrintButton?: boolean;
  // Controlled Dialog Props
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// ----------------------------------------------------------------------

const RepairOrderPrint: React.FC<RepairOrderPrintProps> = ({
  order,
  queuePosition,
  showPrintButton = true,
  isOpen: controlledIsOpen,
  onOpenChange: controlledOnOpenChange
}) => {
  const { organizationId } = useUser();
  const { currentOrganization } = useTenant();
  const receiptRef = useRef<HTMLDivElement>(null);

  // State (Internal)
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPrintSuccess, setIsPrintSuccess] = useState(false);
  const [calculatedQueuePosition, setCalculatedQueuePosition] = useState<number>(queuePosition || 0);
  const [fallbackPOSSettings, setFallbackPOSSettings] = useState<any>(null);

  // Derived State for Controlled vs Uncontrolled
  const isDialogOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const onDialogChange = controlledOnOpenChange || setInternalIsOpen;

  // Hooks
  const { 
    printHtml, 
    isElectron: isElectronPrint, 
    settings: printerSettings, 
    selectedPrinter, 
    printers,
    setSelectedPrinter,
    fetchPrinters,
    updateSetting: updatePrinterSetting 
  } = usePrinter();
  const { settings: receiptSettings, updateSetting: updateReceiptSetting } = useRepairReceiptSettings(organizationId);

  // 1. Fetch Fallback POS Settings
  useEffect(() => {
    const fetchPOSSettings = async () => {
      if (!organizationId) return;
      try {
        const { data } = await supabase
          .from('pos_settings')
          .select('*')
          .eq('organization_id', organizationId)
          .single();
        if (data) setFallbackPOSSettings(data);
      } catch (error) { }
    };
    fetchPOSSettings();
  }, [organizationId]);

  // Fetch printers on mount (Electron only)
  useEffect(() => {
    if (isElectronPrint) {
      fetchPrinters();
    }
  }, [isElectronPrint, fetchPrinters]);

  // 2. Calculate Queue Position if missing
  useEffect(() => {
    const calculateQueuePosition = async () => {
      if (!organizationId || !order || queuePosition) return;
      try {
        const activeStatuses = ['قيد الانتظار', 'جاري التصليح'];
        if (!activeStatuses.includes(order.status)) {
          setCalculatedQueuePosition(0);
          return;
        }
        const { data: allOrders } = await supabase
          .from('repair_orders')
          .select('id')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: true });

        const index = allOrders?.findIndex(o => o.id === order.id);
        setCalculatedQueuePosition((index ?? -1) + 1);
      } catch (err) {
        setCalculatedQueuePosition(1);
      }
    };
    calculateQueuePosition();
  }, [order, organizationId, queuePosition]);

  // 3. Prepare Data
  const trackingCode = order.repair_tracking_code || order.order_number || order.id;

  // Fix: Pass correct subdomain or org object to utility
  const getSubdomain = (org: any) => {
    if (!org) return '';
    if (typeof org === 'string') return org;
    return org.subdomain || org.slug || org.domain || 'www';
  };
  const subdomain = getSubdomain(currentOrganization);

  // We use buildTrackingUrl helper but ensure it uses the correct context
  // Or manually build it to be safe
  // Build tracking URL using subdomain
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? `https://${subdomain || 'www'}.stockiha.com`
    : `http://${subdomain || 'www'}.localhost:8080`;
  const trackingUrl = `${baseUrl}/repair-tracking/${trackingCode}`;

  const activePOSSettings = fallbackPOSSettings;
  const storeInfo = {
    storeName: activePOSSettings?.store_name || currentOrganization?.name || 'Store Name',
    storePhone: activePOSSettings?.store_phone || currentOrganization?.settings?.phone || '',
    storeAddress: activePOSSettings?.store_address || currentOrganization?.settings?.address || '',
    storeLogo: activePOSSettings?.store_logo_url || currentOrganization?.logo_url || ''
  };

  // 4. Print Logic
  const handlePrint = async () => {
    if (isPrinting || !receiptRef.current) return;

    try {
      setIsPrinting(true);
      const content = receiptRef.current.innerHTML;

      const widthMm = printerSettings.paper_width || 80;
      const marginTop = printerSettings.margin_top || 0;
      const marginRight = printerSettings.margin_right || 0;
      const marginBottom = printerSettings.margin_bottom || 0;
      const marginLeft = printerSettings.margin_left || 0;
      const margin = `${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm`;

      // ⚡ Embed Critical CSS Directly
      const criticalCSS = `
        /* ==========================================================================
           THERMAL PRINT RESET & BASE
           ========================================================================== */
        @media print {
          @page { 
            size: ${widthMm}mm auto; 
            margin: ${margin}; 
            padding: 0; 
          }
          body { 
            margin: 0 !important; 
            padding: 0 !important; 
            background-color: #fff !important; 
            width: ${widthMm}mm !important;
          }
          /* Hide everything except info inside the print wrapper */
          body > *:not(#print-root) { display: none !important; }
          #print-root { 
            display: block !important; 
            width: 100% !important; 
            max-width: ${widthMm}mm !important;
            margin: 0 auto !important;
          }
        }

        /* ==========================================================================
           REPAIR RECEIPT WRAPPER
           ========================================================================== */
        .repair-receipt {
          font-family: 'Tajawal', sans-serif;
          direction: rtl;
          width: 100%;
          color: #000;
          background: #fff;
          font-size: 12px;
          line-height: 1.4;
          box-sizing: border-box;
          padding: 0 2px;
        }

        .repair-receipt * {
          box-sizing: border-box;
        }

        /* CARD HEADER (Black) */
        .rr-header { text-align: center; padding-bottom: 8px; border-bottom: 2px solid #000; margin-bottom: 8px; }
        .rr-logo { max-width: 60%; height: auto; margin: 0 auto 5px auto; filter: grayscale(100%) contrast(120%); }
        .rr-meta-strip { display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; border-bottom: 1px dashed #000; padding-bottom: 4px; margin-bottom: 8px; }
        
        /* HERO BLOCK */
        .rr-hero-block { text-align: center; margin-bottom: 12px; border: 3px solid #000; border-radius: 8px; padding: 8px 4px; background: #fff; position: relative; }
        .rr-hero-label { position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #fff; padding: 0 8px; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
        .rr-hero-value { font-size: 28px; font-weight: 900; line-height: 1; }

        /* CARDS */
        .rr-card { border: 1px solid #000; border-radius: 6px; margin-bottom: 8px; overflow: hidden; }
        .rr-card-header { background: #000; color: #fff; padding: 4px 8px; font-weight: 800; font-size: 11px; display: flex; justify-content: space-between; align-items: center; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .rr-card-body { padding: 6px 8px; }

        /* ROWS */
        .rr-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
        .rr-row:last-child { margin-bottom: 0; }
        .rr-label { font-weight: 500; font-size: 11px; color: #333; }
        .rr-value { font-weight: 800; font-size: 12px; text-align: left; }
        .rr-value.ltr { direction: ltr; unicode-bidi: embed; }
        .rr-value.xl { font-size: 14px; }
        .rr-desc-text { font-size: 11px; font-weight: 600; line-height: 1.3; margin-top: 2px; }

        /* TOTAL */
        .rr-total-block { border-top: 2px dashed #000; padding-top: 8px; margin-top: 8px; }
        .rr-total-row { display: flex; justify-content: space-between; align-items: center; font-size: 14px; font-weight: 900; }

        /* TRACKING */
        .rr-tracking-block { margin-top: 12px; text-align: center; padding: 10px; border: 2px dotted #000; border-radius: 8px; }

        /* ADMIN STUB */
        .rr-cut-separator { margin: 20px 0 10px 0; border-top: 2px dashed #000; position: relative; text-align: center; }
        .rr-cut-icon { position: absolute; top: -12px; left: 20px; background: #fff; padding: 0 4px; font-size: 16px; }
        .rr-admin-stub { border: 4px solid #000; padding: 8px; text-align: center; }
        .rr-admin-header { background: #000; color: #fff; font-weight: bold; font-size: 12px; padding: 2px; margin: -8px -8px 8px -8px; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      `;

      const printCSS = `
        @page { 
          size: ${widthMm}mm auto; 
          margin: ${margin}; 
        }
        html, body { 
          margin: 0; 
          padding: 0; 
          background: #fff; 
          width: ${widthMm}mm; 
          max-width: ${widthMm}mm;
        }
        ${criticalCSS}
      `;

      const fullHtml = `
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
          <meta charset="UTF-8">
          <title>Repair Receipt #${order.order_number}</title>
          <style>
             @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@200;300;400;500;700;800;900&display=swap');
             body { font-family: 'Tajawal', sans-serif; }
             ${printCSS}
          </style>
        </head>
        <body>
          <div id="print-root">${content}</div>
        </body>
        </html>
      `;

      if (isElectronPrint) {
        // Convert paper width to pageSize format
        let pageSize: string | { width: number; height: number } = `${widthMm}mm`;
        
        await printHtml(fullHtml, {
          printerName: selectedPrinter || undefined,
          silent: printerSettings.silent_print || false,
          pageSize: pageSize
        });
      } else {
        // Browser print with proper settings
        const printWindow = window.open('', '_blank', 'width=400,height=600');
        if (!printWindow) {
          console.error('Failed to open print window');
          setIsPrinting(false);
          return;
        }

        printWindow.document.write(fullHtml);
        printWindow.document.close();

        // Wait for content to load then print
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            // Close window after print dialog closes
            setTimeout(() => {
              if (!printWindow.closed) {
                printWindow.close();
              }
            }, 1000);
          }, 500);
        };

        // Fallback if onload doesn't fire
        setTimeout(() => {
          if (!printWindow.closed && printWindow.document.readyState === 'complete') {
            printWindow.print();
            setTimeout(() => {
              if (!printWindow.closed) {
                printWindow.close();
              }
            }, 1000);
          }
        }, 1000);
      }

      setIsPrintSuccess(true);
      setTimeout(() => setIsPrintSuccess(false), 2000);
      onDialogChange(false);

    } catch (e) {
      console.error("Print failed", e);
    } finally {
      setIsPrinting(false);
    }
  };

  // ----------------------------------------------------------------------
  // UI Components
  // ----------------------------------------------------------------------

  const SettingToggle = ({
    label,
    checked,
    onChange,
    icon: Icon
  }: {
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    icon?: any;
  }) => (
    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-colors">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-gray-500" />}
        <Label className="cursor-pointer text-sm font-medium">{label}</Label>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );

  // The main layout content (Sidebar + Preview)
  const MainContent = (
    <div className="flex-1 grid md:grid-cols-[280px_1fr] overflow-hidden bg-white h-full max-h-[600px] md:max-h-[700px]">

      {/* LEFT: SETTINGS SIDEBAR */}
      <div className="border-l bg-gray-50/50 overflow-y-auto p-4 space-y-6">
        {/* Main Sections */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <Printer className="h-3 w-3" />
            إعدادات الطابعة
          </h4>
          <div className="space-y-3 bg-white p-3 rounded-lg border shadow-sm">
            {/* Printer Selection (Electron Only) */}
            {isElectronPrint && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-700">اختر الطابعة</Label>
                <Select
                  value={selectedPrinter || undefined}
                  onValueChange={(value) => {
                    setSelectedPrinter(value);
                    updatePrinterSetting('printer_name', value);
                  }}
                  disabled={printers.length === 0}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="اختر الطابعة" />
                  </SelectTrigger>
                  <SelectContent>
                    {printers.length === 0 ? (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground text-center">
                        لا توجد طابعات متاحة
                      </div>
                    ) : (
                      printers.map((printer) => (
                        <SelectItem key={printer.name} value={printer.name}>
                          {printer.displayName || printer.name} {printer.isDefault && '(افتراضي)'}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Paper Size Options */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">حجم الورق</Label>
              <Select
                value={String(printerSettings.paper_width || 80)}
                onValueChange={(value) => {
                  updatePrinterSetting('paper_width', parseInt(value, 10));
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="58">58mm (ورق حراري صغير)</SelectItem>
                  <SelectItem value="80">80mm (ورق حراري قياسي)</SelectItem>
                  <SelectItem value="110">110mm (ورق حراري كبير)</SelectItem>
                  <SelectItem value="210">A4 (210mm)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Margins Settings */}
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-xs font-medium text-gray-700">الهوامش (mm)</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-gray-500">أعلى</Label>
                  <Input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={printerSettings.margin_top || 0}
                    onChange={(e) => updatePrinterSetting('margin_top', parseFloat(e.target.value) || 0)}
                    className="h-7 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-gray-500">أسفل</Label>
                  <Input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={printerSettings.margin_bottom || 0}
                    onChange={(e) => updatePrinterSetting('margin_bottom', parseFloat(e.target.value) || 0)}
                    className="h-7 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-gray-500">يمين</Label>
                  <Input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={printerSettings.margin_right || 0}
                    onChange={(e) => updatePrinterSetting('margin_right', parseFloat(e.target.value) || 0)}
                    className="h-7 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-gray-500">يسار</Label>
                  <Input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={printerSettings.margin_left || 0}
                    onChange={(e) => updatePrinterSetting('margin_left', parseFloat(e.target.value) || 0)}
                    className="h-7 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Connection Settings */}
            {isElectronPrint && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <Settings className="h-3 w-3 text-gray-500" />
                  <Label className="text-xs font-medium text-gray-700">إعدادات الاتصال</Label>
                </div>
                <div className="space-y-1">
                  <SettingToggle
                    label="الطباعة الصامتة"
                    checked={printerSettings.silent_print || false}
                    onChange={(v) => updatePrinterSetting('silent_print', v)}
                  />
                  <SettingToggle
                    label="فتح درج النقود"
                    checked={printerSettings.open_cash_drawer || false}
                    onChange={(v) => updatePrinterSetting('open_cash_drawer', v)}
                  />
                  <SettingToggle
                    label="صوت بعد الطباعة"
                    checked={printerSettings.beep_after_print || false}
                    onChange={(v) => updatePrinterSetting('beep_after_print', v)}
                  />
                  <SettingToggle
                    label="قطع تلقائي"
                    checked={printerSettings.auto_cut || false}
                    onChange={(v) => updatePrinterSetting('auto_cut', v)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <Ticket className="h-3 w-3" />
            أقسام الوصل
          </h4>
          <div className="space-y-1">
            <SettingToggle
              label="إيصال العميل"
              icon={FileText}
              checked={receiptSettings.showCustomerReceipt}
              onChange={(v) => updateReceiptSetting('showCustomerReceipt', v)}
            />
            <SettingToggle
              label="ملصق المسؤول"
              icon={Settings}
              checked={receiptSettings.showAdminReceipt}
              onChange={(v) => updateReceiptSetting('showAdminReceipt', v)}
            />
          </div>
        </div>

        <Separator />

        {/* Content Options */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <Eye className="h-3 w-3" />
            خيارات العرض
          </h4>
          <div className="space-y-1">
            <SettingToggle
              label="شعار المتجر"
              checked={receiptSettings.showStoreLogo}
              onChange={(v) => updateReceiptSetting('showStoreLogo', v)}
            />
            <SettingToggle
              label="معلومات الاتصال"
              icon={MapPin}
              checked={receiptSettings.showStoreInfo}
              onChange={(v) => updateReceiptSetting('showStoreInfo', v)}
            />
            <SettingToggle
              label="شروط الضمان"
              icon={ShieldCheck}
              checked={receiptSettings.showWarrantyAndTerms}
              onChange={(v) => updateReceiptSetting('showWarrantyAndTerms', v)}
            />
            <SettingToggle
              label="رقم الطابور"
              checked={receiptSettings.showQueuePosition}
              onChange={(v) => updateReceiptSetting('showQueuePosition', v)}
            />
          </div>
        </div>

        <Separator />

        {/* QR Codes */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <QrCode className="h-3 w-3" />
            الرموز (QR)
          </h4>
          <div className="space-y-1">
            <SettingToggle
              label="QR التتبع"
              checked={receiptSettings.showTrackingQr}
              onChange={(v) => updateReceiptSetting('showTrackingQr', v)}
            />
            <SettingToggle
              label="QR الإدارة"
              checked={receiptSettings.showCompleteQr}
              onChange={(v) => updateReceiptSetting('showCompleteQr', v)}
            />
          </div>
        </div>
      </div>

      {/* RIGHT: PREVIEW AREA */}
      <div className="bg-gray-100/50 relative flex flex-col items-center">
    <div className="absolute top-2 right-2 z-10 hidden md:block">
      <Badge variant="outline" className="bg-white/80 backdrop-blur text-[10px] font-mono shadow-sm">
        {printerSettings.paper_width || 80}mm PREVIEW
      </Badge>
    </div>

    <ScrollArea className="flex-1 w-full p-4 md:p-8">
      <div className="flex justify-center min-h-full pb-8">

        {/* Visual Representation of Paper */}
        <div
          className="bg-white shadow-xl relative transition-all duration-300 ease-in-out print-preview-paper"
          style={{
            width: `${printerSettings.paper_width === 58 ? '58mm' : '80mm'}`,
            transform: 'scale(1)',
            minHeight: '100mm'
          }}
        >
          {/* ⚡ KEY: The Actual Class for legacy scoping if needed: repair-receipt-print-area */}
          <div ref={receiptRef} className="repair-receipt-print-area">
            <RepairReceiptPrint
              order={order}
              storeName={storeInfo.storeName}
              storePhone={storeInfo.storePhone}
              storeAddress={storeInfo.storeAddress}
              storeLogo={storeInfo.storeLogo}
              trackingUrl={trackingUrl}
              queuePosition={calculatedQueuePosition}
              receiptSettings={receiptSettings}
            />
          </div>

          {/* Paper Tear Effect */}
          <div
            className="absolute -bottom-2 left-0 w-full h-4 bg-white"
            style={{
              clipPath: 'polygon(0% 0%, 5% 100%, 10% 0%, 15% 100%, 20% 0%, 25% 100%, 30% 0%, 35% 100%, 40% 0%, 45% 100%, 50% 0%, 55% 100%, 60% 0%, 65% 100%, 70% 0%, 75% 100%, 80% 0%, 85% 100%, 90% 0%, 95% 100%, 100% 0%)'
            }}
          />
        </div>
      </div>
    </ScrollArea>
      </div>
    </div>
  );

// 1. CONTROLLED DIALOG MODE (External Open/Close)
if (controlledIsOpen !== undefined) {
  return (
    <Dialog open={isDialogOpen} onOpenChange={onDialogChange}>
      <DialogContent className="max-w-4xl h-[90vh] md:h-auto overflow-hidden flex flex-col p-0 gap-0 border-0 shadow-2xl">
        {/* HEADER */}
        <DialogHeader className="p-4 border-b bg-white flex flex-row items-center justify-between space-y-0 z-20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/5 text-primary rounded-xl">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">طباعة وصل التصليح</DialogTitle>
              <DialogDescription className="text-xs">
                #{order.order_number || order.id?.slice(0, 5)} • {order.customer_name}
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {printerSettings.printer_name && (
              <Badge variant="secondary" className="gap-1 font-normal opacity-80">
                <Printer className="h-3 w-3" />
                {printerSettings.printer_name}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* BODY */}
        {MainContent}

        {/* FOOTER */}
        <DialogFooter className="p-4 border-t bg-white gap-2 z-20">
          <Button variant="ghost" onClick={() => onDialogChange(false)} className="hover:bg-gray-100">
            إغلاق
          </Button>
          <Button
            onClick={handlePrint}
            className="min-w-[140px] gap-2 shadow-lg shadow-primary/20"
            disabled={isPrinting}
          >
            {isPrinting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
            {isPrinting ? 'جاري الطباعة...' : 'تأكيد وطباعة'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 2. INLINE MODE (Used when embedding purely for display, rarely used now)
if (!showPrintButton) {
  return MainContent;
}

// 3. UNCONTROLLED DIALOG MODE (Button Trigger)
return (
  <Dialog open={isDialogOpen} onOpenChange={onDialogChange}>
    {/* TRIGGER */}
    <DialogTrigger asChild>
      <Button variant="outline" className="gap-2 h-9 px-4 shadow-sm border-gray-200 hover:bg-white hover:text-primary hover:border-primary/50 transition-all">
        <Printer className="h-4 w-4" />
        <span>طباعة الوصل</span>
      </Button>
    </DialogTrigger>

    {/* Same Dialog Content as Controlled Mode */}
    <DialogContent className="max-w-4xl h-[90vh] md:h-auto overflow-hidden flex flex-col p-0 gap-0 border-0 shadow-2xl">
      <DialogHeader className="p-4 border-b bg-white flex flex-row items-center justify-between space-y-0 z-20">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/5 text-primary rounded-xl">
            <Printer className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="text-base font-bold">طباعة وصل التصليح</DialogTitle>
            <DialogDescription className="text-xs">
              #{order.order_number || order.id?.slice(0, 5)} • {order.customer_name}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      {MainContent}

      <DialogFooter className="p-4 border-t bg-white gap-2 z-20">
        <Button variant="ghost" onClick={() => onDialogChange(false)}>إغلاق</Button>
        <Button onClick={handlePrint} className="min-w-[140px] gap-2" disabled={isPrinting}>
          {isPrinting ? 'جاري...' : 'طباعة'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
};

export default RepairOrderPrint;
