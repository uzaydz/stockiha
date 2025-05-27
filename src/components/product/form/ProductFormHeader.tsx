import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface ProductFormHeaderProps {
  title: string;
  isEditMode: boolean;
  isSubmitting: boolean;
  onBack: () => void;
}

const ProductFormHeader: React.FC<ProductFormHeaderProps> = ({
  title,
  isEditMode,
  isSubmitting,
  onBack,
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
      <div className="space-y-4 flex-1">
        {/* Breadcrumbs */}
        <Breadcrumb>
          <BreadcrumbList className="text-sm">
            <BreadcrumbItem>
              <BreadcrumbLink 
                onClick={() => navigate('/dashboard')} 
                className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors duration-200 flex items-center gap-1"
              >
                <span className="w-2 h-2 rounded-full bg-primary/40" />
                الرئيسية
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="text-muted-foreground/50" />
            <BreadcrumbItem>
              <BreadcrumbLink 
                onClick={onBack} 
                className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors duration-200 flex items-center gap-1"
              >
                <span className="w-2 h-2 rounded-full bg-secondary/40" />
                المنتجات
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="text-muted-foreground/50" />
            <BreadcrumbItem>
              <BreadcrumbLink className="text-foreground font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary" />
                {isEditMode ? 'تعديل' : 'إضافة جديد'}
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        {/* Title Section */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl blur-xl" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 backdrop-blur-sm border border-primary/20 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-foreground via-foreground/90 to-foreground/80 bg-clip-text text-transparent leading-tight">
              {title}
            </h1>
            <p className="text-muted-foreground mt-1 text-lg">
              {isEditMode ? 'قم بتحديث معلومات المنتج' : 'أضف منتجاً جديداً إلى متجرك'}
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons - Hidden on mobile as they appear in sticky footer */}
      <div className="hidden lg:flex gap-3">
        <Button 
          variant="outline" 
          onClick={onBack}
          size="lg"
          className="px-6 h-12 border-2 bg-background/80 backdrop-blur-sm hover:bg-muted/50 transition-all duration-300 group"
        >
          <ArrowLeft className="ml-2 h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
          العودة
        </Button>

        <Button
          type="submit"
          variant="default"
          disabled={isSubmitting}
          size="lg"
          className="px-8 h-12 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 border-0 group"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              جاري المعالجة...
            </>
          ) : (
            <>
              <Save className="ml-2 h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
              {isEditMode ? 'حفظ التغييرات' : 'إنشاء المنتج'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ProductFormHeader;
