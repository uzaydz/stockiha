import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Globe, Printer, Download, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InvoicePrintLanguageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectLanguage: (language: 'ar' | 'fr' | 'en') => void;
  onPrint?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
}

type Language = 'ar' | 'fr' | 'en';

const languages: Array<{
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
  description: string;
}> = [
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    flag: '🇸🇦',
    description: 'اللغة العربية',
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    description: 'اللغة الفرنسية',
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    description: 'اللغة الإنجليزية',
  },
];

const InvoicePrintLanguageDialog = ({
  open,
  onOpenChange,
  onSelectLanguage,
  onPrint,
  onDownload,
  onShare,
}: InvoicePrintLanguageDialogProps) => {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('ar');

  const handleConfirm = () => {
    onSelectLanguage(selectedLanguage);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            اختر لغة الفاتورة
          </DialogTitle>
          <DialogDescription>
            اختر اللغة المفضلة لطباعة الفاتورة
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* اختيار اللغة */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setSelectedLanguage(lang.code)}
                className={cn(
                  'p-4 rounded-lg border-2 transition-all text-left',
                  selectedLanguage === lang.code
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-primary/50'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{lang.flag}</span>
                  <div>
                    <p className="font-bold text-lg">{lang.nativeName}</p>
                    <p className="text-sm text-muted-foreground">{lang.name}</p>
                  </div>
                </div>
                {selectedLanguage === lang.code && (
                  <Badge className="mt-2 w-full justify-center">
                    مختار
                  </Badge>
                )}
              </button>
            ))}
          </div>

          {/* معلومات اللغة المختارة */}
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              {languages.find((l) => l.code === selectedLanguage)?.description}
            </p>
          </div>

          {/* أزرار الإجراءات */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-4">
            <Button
              onClick={() => {
                handleConfirm();
                onPrint?.();
              }}
              className="gap-2"
              variant="default"
            >
              <Printer className="h-4 w-4" />
              طباعة
            </Button>
            <Button
              onClick={() => {
                handleConfirm();
                onDownload?.();
              }}
              className="gap-2"
              variant="secondary"
            >
              <Download className="h-4 w-4" />
              تنزيل PDF
            </Button>
            <Button
              onClick={() => {
                handleConfirm();
                onShare?.();
              }}
              className="gap-2"
              variant="outline"
            >
              <Share2 className="h-4 w-4" />
              مشاركة
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoicePrintLanguageDialog;
