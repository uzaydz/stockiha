import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import PurchaseTimer from "@/components/store/PurchaseTimer";
import { Clock, Smartphone, Monitor, Eye } from "lucide-react";
import type { TimerConfig } from "@/lib/api/products";

interface TimerSettingsProps {
  timerConfig: TimerConfig;
  onChange: (newConfig: TimerConfig) => void;
}

const TimerSettings = ({ timerConfig, onChange }: TimerSettingsProps) => {
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [selectedStyle, setSelectedStyle] = useState<'default' | 'minimal' | 'prominent'>(
    timerConfig.style || 'default'
  );

  const handleChange = (field: keyof TimerConfig, value: any) => {
    if (field === 'style') {
      setSelectedStyle(value);
    }
    onChange({ ...timerConfig, [field]: value });
  };

  // Calculate preview end date (24 hours from now) if not set
  const previewEndDate = timerConfig.endDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Label htmlFor="timer-enabled" className="font-medium">تفعيل المؤقت</Label>
        <Switch
          id="timer-enabled"
          checked={timerConfig.enabled}
          onCheckedChange={(checked) => handleChange('enabled', checked)}
        />
      </div>

      {timerConfig.enabled && (
        <div className="space-y-8">
          <Tabs defaultValue="settings" className="w-full">
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="settings" className="flex items-center gap-2 w-1/2">
                <Clock className="h-4 w-4" />
                <span>الإعدادات</span>
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center gap-2 w-1/2">
                <Eye className="h-4 w-4" />
                <span>معاينة</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="settings" className="space-y-5 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">إعدادات الوقت</CardTitle>
                    <CardDescription>تحديد تاريخ ووقت انتهاء العرض</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="timer-endDate">تاريخ ووقت الانتهاء</Label>
                      <Input
                        id="timer-endDate"
                        type="datetime-local"
                        value={timerConfig.endDate ? timerConfig.endDate.substring(0, 16) : ''}
                        onChange={(e) => handleChange('endDate', e.target.value ? new Date(e.target.value).toISOString() : '')}
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">حدد متى ينتهي العرض ويتوقف العداد.</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">نمط العرض</CardTitle>
                    <CardDescription>اختر كيفية ظهور المؤقت على صفحة المنتج</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Select 
                      value={selectedStyle} 
                      onValueChange={(value: 'default' | 'minimal' | 'prominent') => handleChange('style', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نمط العرض" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">قياسي</SelectItem>
                        <SelectItem value="minimal">مصغر</SelectItem>
                        <SelectItem value="prominent">بارز</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">النصوص</CardTitle>
                  <CardDescription>إضافة نصوص تظهر فوق وتحت المؤقت</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="timer-textAbove">النص فوق العداد</Label>
                    <Textarea
                      id="timer-textAbove"
                      placeholder="مثال: العرض ينتهي خلال:"
                      value={timerConfig.textAbove || ''}
                      onChange={(e) => handleChange('textAbove', e.target.value)}
                      className="mt-1 min-h-[60px]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="timer-textBelow">النص تحت العداد</Label>
                    <Textarea
                      id="timer-textBelow"
                      placeholder="مثال: لا تفوت الفرصة!"
                      value={timerConfig.textBelow || ''}
                      onChange={(e) => handleChange('textBelow', e.target.value)}
                      className="mt-1 min-h-[60px]"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="preview" className="pt-2">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">معاينة المؤقت</CardTitle>
                    <div className="flex bg-muted rounded-md overflow-hidden">
                      <button 
                        className={`p-1 px-2 text-xs ${previewDevice === 'desktop' ? 'bg-primary text-white' : ''}`}
                        onClick={() => setPreviewDevice('desktop')}
                      >
                        <Monitor className="h-4 w-4" />
                      </button>
                      <button 
                        className={`p-1 px-2 text-xs ${previewDevice === 'mobile' ? 'bg-primary text-white' : ''}`}
                        onClick={() => setPreviewDevice('mobile')}
                      >
                        <Smartphone className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <CardDescription>هذا هو شكل المؤقت كما سيظهر للعملاء</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className={previewDevice === 'mobile' ? 'max-w-[375px] mx-auto' : 'w-full'}>
                    <div className="p-4 bg-card border rounded-lg shadow-sm">
                      <PurchaseTimer 
                        endDate={previewEndDate}
                        textAbove={timerConfig.textAbove || 'العرض ينتهي خلال:'}
                        textBelow={timerConfig.textBelow || 'سارع بالطلب قبل انتهاء العرض - الكمية محدودة'}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default TimerSettings;
