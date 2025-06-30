import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface FormDataViewerProps {
  formData: Record<string, any> | null;
  title?: string;
  className?: string;
}

/**
 * مكون لعرض بيانات النموذج المخصص للطلبات
 */
const FormDataViewer: React.FC<FormDataViewerProps> = ({ 
  formData, 
  title = "بيانات النموذج المخصص", 
  className = "" 
}) => {
  if (!formData) return null;
  
  // استخراج تسميات الحقول إذا كانت موجودة
  const fieldLabels = formData.fieldLabels || {};
  
  // استبعاد بيانات التسميات من العرض
  const displayData = { ...formData };
  delete displayData.fieldLabels;
  
  // إذا لم تكن هناك بيانات للعرض
  if (Object.keys(displayData).length === 0) {
    return null;
  }
  
  /**
   * تنسيق قيمة الحقل للعرض
   */
  const formatValue = (value: any): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground text-sm">غير محدد</span>;
    }
    
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-muted-foreground text-sm">لا يوجد</span>;
      }
      return (
        <div className="flex flex-wrap gap-1">
          {value.map((item, index) => (
            <Badge key={index} variant="outline" className="bg-primary/5">
              {String(item)}
            </Badge>
          ))}
        </div>
      );
    }
    
    if (typeof value === 'object') {
      return <pre className="text-xs bg-muted p-2 rounded">{JSON.stringify(value, null, 2)}</pre>;
    }
    
    return <span>{String(value)}</span>;
  };
  
  return (
    <Card className={`shadow-sm ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-2">
          {Object.entries(displayData).map(([key, value], index, array) => (
            <React.Fragment key={key}>
              <div className="flex flex-col space-y-1">
                <span className="text-xs text-muted-foreground font-medium">
                  {fieldLabels[key] || key}
                </span>
                <div className="min-h-[1.5rem]">
                  {formatValue(value)}
                </div>
              </div>
              {index < array.length - 1 && <Separator className="my-2" />}
            </React.Fragment>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default FormDataViewer;
