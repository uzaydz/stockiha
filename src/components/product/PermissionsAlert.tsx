import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface PermissionsAlertProps {
  show: boolean;
  title?: string;
  description?: string;
}

const PermissionsAlert: React.FC<PermissionsAlertProps> = ({
  show,
  title = "غير مصرح",
  description = "ليس لديك الصلاحية الكافية لتعديل هذا المنتج."
}) => {
  if (!show) return null;
  
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
};

export default PermissionsAlert;
