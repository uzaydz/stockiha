import { ArrowLeft, Save } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { Dispatch, SetStateAction } from 'react';

interface FormBuilderHeaderProps {
  isNewForm: boolean;
  saving?: boolean;
  onSave?: () => void;
  formName: string;
  setFormName: Dispatch<SetStateAction<string>>;
  isDefault: boolean;
  setIsDefault: Dispatch<SetStateAction<boolean>>;
  isActive: boolean;
  setIsActive: Dispatch<SetStateAction<boolean>>;
  onCancel: () => void;
}

export function FormBuilderHeader({ 
  isNewForm, 
  saving = false, 
  onSave,
  formName,
  setFormName,
  isDefault,
  setIsDefault,
  isActive,
  setIsActive,
  onCancel
}: FormBuilderHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => navigate('/dashboard/form-settings')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isNewForm ? 'إنشاء نموذج جديد' : 'تعديل النموذج'}
          </h1>
          <p className="text-muted-foreground mt-1">
            قم بتخصيص حقول النموذج والمنتجات التي سيظهر فيها
          </p>
        </div>
      </div>
      <Button 
        onClick={onSave} 
        disabled={saving}
        className="min-w-[100px]"
      >
        {saving ? (
          <div className="flex items-center">
            <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent border-white rounded-full"></div>
            جاري الحفظ
          </div>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            حفظ
          </>
        )}
      </Button>
    </div>
  );
} 