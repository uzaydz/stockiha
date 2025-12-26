import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTenant } from '@/context/TenantContext';
import { usePrinter } from '@/hooks/usePrinter';
import { useRepairReceiptSettings } from '@/hooks/useRepairReceiptSettings';
import { isElectronApp } from '@/lib/platform';

export function RepairPrintSettingsPanel() {
  const { currentOrganization } = useTenant();
  const organizationId = currentOrganization?.id;

  const {
    printers,
    selectedPrinter,
    isLoading,
    isPrinting,
    settings: printerSettings,
    isElectron,
    setSelectedPrinter,
    updateSetting,
    saveSettings,
    printTest,
  } = usePrinter();

  const {
    settings: receiptSettings,
    updateSetting: updateReceiptSetting,
    reset: resetReceiptSettings,
  } = useRepairReceiptSettings(organizationId);

  const canUseElectronPrinting = isElectronApp() && isElectron;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">إعدادات الطباعة والاتصال</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!canUseElectronPrinting && (
            <div className="text-xs text-muted-foreground">
              اختيار الطابعة والطباعة الصامتة تعمل بشكل أفضل داخل تطبيق سطح المكتب (Electron).
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>الطابعة</Label>
              <Select
                value={selectedPrinter || printerSettings.printer_name || ''}
                onValueChange={(value) => setSelectedPrinter(value)}
                disabled={!canUseElectronPrinting || isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoading ? 'جاري تحميل الطابعات...' : 'اختر طابعة'} />
                </SelectTrigger>
                <SelectContent>
                  {printers.map((p) => (
                    <SelectItem key={p.name} value={p.name}>
                      {p.displayName || p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>عرض الورق (mm)</Label>
              <Select
                value={String(printerSettings.paper_width || 80)}
                onValueChange={(value) => updateSetting('paper_width', Number(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="48">48</SelectItem>
                  <SelectItem value="58">58</SelectItem>
                  <SelectItem value="80">80</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>عدد النسخ</Label>
              <Input
                type="number"
                min={1}
                value={printerSettings.print_copies || 1}
                onChange={(e) => updateSetting('print_copies', Math.max(1, Number(e.target.value) || 1))}
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-md border p-3">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">طباعة صامتة</div>
                <div className="text-xs text-muted-foreground">بدون نافذة طباعة</div>
              </div>
              <Switch
                checked={Boolean(printerSettings.silent_print)}
                onCheckedChange={(checked) => updateSetting('silent_print', checked)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-2">
              <Label>هامش أعلى (mm)</Label>
              <Input
                type="number"
                min={0}
                value={printerSettings.margin_top || 0}
                onChange={(e) => updateSetting('margin_top', Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
            <div className="space-y-2">
              <Label>هامش يمين (mm)</Label>
              <Input
                type="number"
                min={0}
                value={printerSettings.margin_right || 0}
                onChange={(e) => updateSetting('margin_right', Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
            <div className="space-y-2">
              <Label>هامش أسفل (mm)</Label>
              <Input
                type="number"
                min={0}
                value={printerSettings.margin_bottom || 0}
                onChange={(e) => updateSetting('margin_bottom', Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
            <div className="space-y-2">
              <Label>هامش يسار (mm)</Label>
              <Input
                type="number"
                min={0}
                value={printerSettings.margin_left || 0}
                onChange={(e) => updateSetting('margin_left', Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => saveSettings()} disabled={isPrinting}>
              حفظ إعدادات الطباعة
            </Button>
            <Button variant="outline" onClick={() => printTest()} disabled={!canUseElectronPrinting || isPrinting}>
              طباعة اختبار
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">إعدادات الوصل (وصل التصليح)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <SettingSwitch
              label="إظهار إيصال العميل"
              checked={receiptSettings.showCustomerReceipt}
              onChange={(v) => updateReceiptSetting('showCustomerReceipt', v)}
            />
            <SettingSwitch
              label="إظهار إيصال المسؤول"
              checked={receiptSettings.showAdminReceipt}
              onChange={(v) => updateReceiptSetting('showAdminReceipt', v)}
            />
            <SettingSwitch
              label="إظهار شعار المتجر"
              checked={receiptSettings.showStoreLogo}
              onChange={(v) => updateReceiptSetting('showStoreLogo', v)}
            />
            <SettingSwitch
              label="إظهار معلومات المتجر"
              checked={receiptSettings.showStoreInfo}
              onChange={(v) => updateReceiptSetting('showStoreInfo', v)}
            />
            <SettingSwitch
              label="إظهار QR تتبع العميل"
              checked={receiptSettings.showTrackingQr}
              onChange={(v) => updateReceiptSetting('showTrackingQr', v)}
            />
            <SettingSwitch
              label="إظهار QR إنهاء التصليح"
              checked={receiptSettings.showCompleteQr}
              onChange={(v) => updateReceiptSetting('showCompleteQr', v)}
            />
            <SettingSwitch
              label="إظهار رقم الترتيب"
              checked={receiptSettings.showQueuePosition}
              onChange={(v) => updateReceiptSetting('showQueuePosition', v)}
            />
            <SettingSwitch
              label="إظهار الضمان/الشروط"
              checked={receiptSettings.showWarrantyAndTerms}
              onChange={(v) => updateReceiptSetting('showWarrantyAndTerms', v)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>حجم QR التتبع</Label>
              <Input
                type="number"
                min={40}
                max={200}
                value={receiptSettings.trackingQrSize}
                onChange={(e) => updateReceiptSetting('trackingQrSize', clampNumber(e.target.value, 40, 200))}
              />
            </div>
            <div className="space-y-2">
              <Label>حجم QR الإنهاء</Label>
              <Input
                type="number"
                min={40}
                max={200}
                value={receiptSettings.completeQrSize}
                onChange={(e) => updateReceiptSetting('completeQrSize', clampNumber(e.target.value, 40, 200))}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => resetReceiptSettings()}>
              إعادة تعيين إعدادات الوصل
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingSwitch(props: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border p-3">
      <div className="text-sm font-medium">{props.label}</div>
      <Switch checked={props.checked} onCheckedChange={props.onChange} />
    </div>
  );
}

function clampNumber(value: string, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

