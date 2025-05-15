import React from 'react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Truck } from 'lucide-react';

interface GeneralSettingsTabProps {
  editFormData: {
    name: string;
    is_active: boolean;
    api_token: string;
    api_key: string;
  };
  setEditFormData: React.Dispatch<React.SetStateAction<any>>;
}

const GeneralSettingsTab: React.FC<GeneralSettingsTabProps> = ({
  editFormData,
  setEditFormData
}) => {
  return (
    <div className="space-y-6">
      {/* الإعدادات الأساسية */}
      <div className="bg-card p-6 rounded-lg border shadow-sm">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Truck className="mr-2 h-5 w-5 text-primary" />
          الإعدادات الأساسية
        </h3>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              اسم النسخة <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="أدخل اسم النسخة"
              value={editFormData.name}
              onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full"
            />
          </div>
          
          <div className="pt-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label 
                  htmlFor="is-active" 
                  className="text-base font-medium"
                >
                  تفعيل النسخة
                </Label>
                <p className="text-sm text-muted-foreground">
                  تفعيل أو تعطيل استخدام هذه النسخة
                </p>
              </div>
              <Switch
                id="is-active"
                checked={editFormData.is_active}
                onCheckedChange={(checked) => setEditFormData(prev => ({ ...prev, is_active: checked }))}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* API Credentials */}
      <div className="bg-card p-6 rounded-lg border shadow-sm">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          بيانات اعتماد API
        </h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api_token" className="text-sm font-medium">
              Token (الرمز المميز)
            </Label>
            <Input
              id="api_token"
              placeholder="أدخل API Token"
              value={editFormData.api_token || ''}
              onChange={(e) => setEditFormData(prev => ({ ...prev, api_token: e.target.value }))}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              الرمز المميز للوصول إلى API الخاص بشركة التوصيل.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="api_key" className="text-sm font-medium">
              Key (المفتاح)
            </Label>
            <Input
              id="api_key"
              placeholder="أدخل API Key"
              value={editFormData.api_key || ''}
              onChange={(e) => setEditFormData(prev => ({ ...prev, api_key: e.target.value }))}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              المفتاح السري للوصول إلى API الخاص بشركة التوصيل.
            </p>
          </div>
        </div>
      </div>
      
      {/* معلومات تاريخية */}
      <div className="bg-muted/20 p-6 rounded-lg border border-dashed">
        <h3 className="text-sm font-medium mb-2 text-muted-foreground">تلميحات</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>تأكد من تفعيل النسخة إذا كنت ترغب في استخدامها</li>
          <li>يمكنك تعديل إعدادات أسعار التوصيل من خلال علامة تبويب "أسعار التوصيل"</li>
        </ul>
      </div>
    </div>
  );
};

export default GeneralSettingsTab; 