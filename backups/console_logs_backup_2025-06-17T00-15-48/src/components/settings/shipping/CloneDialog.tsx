import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ShippingProviderWithClones } from '@/api/shippingCloneService';
import { Copy } from 'lucide-react';

interface CloneDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onClone: (name: string) => Promise<void>;
  provider: ShippingProviderWithClones | null;
  isLoading: boolean;
}

const CloneDialog: React.FC<CloneDialogProps> = ({
  isOpen,
  onClose,
  onClone,
  provider,
  isLoading
}) => {
  const [name, setName] = useState<string>('');

  // إعادة تعيين النموذج عند فتح الحوار
  useEffect(() => {
    if (isOpen && provider) {
      setName(`${provider.name} ${new Date().toLocaleDateString('ar')}`.trim());
    }
  }, [isOpen, provider]);

  const handleSubmit = async () => {
    await onClone(name);
  };

  if (!provider) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <span className="bg-primary/10 p-2 rounded-full">
              <Copy className="h-5 w-5 text-primary" />
            </span>
            استنساخ مزود التوصيل
          </DialogTitle>
          <DialogDescription className="pt-2">
            إنشاء نسخة جديدة من <span className="font-semibold">{provider.name}</span> مع إعدادات مخصصة.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              اسم النسخة الجديدة <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="أدخل اسم النسخة الجديدة"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2 mt-4">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            إلغاء
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!name.trim() || isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin -mr-1 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                جاري الاستنساخ...
              </span>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                استنساخ
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CloneDialog;
