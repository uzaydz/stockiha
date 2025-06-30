import React from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

interface PageSettings {
  title: string;
  description: string;
  keywords: string;
  isPublished: boolean;
}

interface PageSettingsFormProps {
  settings: PageSettings;
  onUpdate: (settings: PageSettings) => void;
}

/**
 * نموذج إعدادات الصفحة
 */
const PageSettingsForm: React.FC<PageSettingsFormProps> = ({ settings, onUpdate }) => {
  const { t } = useTranslation();
  
  // معالج تغييرات الإعدادات
  const handleSettingChange = (newSettings: Partial<PageSettings>) => {
    onUpdate({ ...settings, ...newSettings });
  };
  
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="page-title">{t('عنوان الصفحة')}</Label>
        <Input
          id="page-title"
          value={settings.title}
          onChange={(e) => handleSettingChange({ title: e.target.value })}
          placeholder={t('عنوان الصفحة الذي سيظهر في المتصفح')}
        />
        <p className="text-xs text-muted-foreground">
          {t('سيظهر هذا العنوان في شريط عنوان المتصفح وفي نتائج البحث.')}
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="page-description">{t('وصف الصفحة')}</Label>
        <Textarea
          id="page-description"
          value={settings.description}
          onChange={(e) => handleSettingChange({ description: e.target.value })}
          placeholder={t('وصف الصفحة لتحسين محركات البحث')}
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          {t('سيظهر هذا الوصف في نتائج البحث ويساعد على تحسين SEO.')}
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="page-keywords">{t('الكلمات المفتاحية')}</Label>
        <Input
          id="page-keywords"
          value={settings.keywords}
          onChange={(e) => handleSettingChange({ keywords: e.target.value })}
          placeholder={t('كلمات مفتاحية مفصولة بفواصل')}
        />
        <p className="text-xs text-muted-foreground">
          {t('الكلمات المفتاحية التي تساعد محركات البحث على فهم محتوى الصفحة.')}
        </p>
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="page-published">{t('نشر الصفحة')}</Label>
          <p className="text-xs text-muted-foreground">
            {t('عند التفعيل، ستكون الصفحة متاحة للزوار.')}
          </p>
        </div>
        <Switch
          id="page-published"
          checked={settings.isPublished}
          onCheckedChange={(checked) => handleSettingChange({ isPublished: checked })}
        />
      </div>
    </div>
  );
};

export default PageSettingsForm;
