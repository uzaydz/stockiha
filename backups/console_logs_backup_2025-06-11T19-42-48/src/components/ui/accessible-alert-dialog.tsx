import * as React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  VisuallyHidden,
} from '@/components/ui/alert-dialog'

interface AccessibleAlertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  children: React.ReactNode
  hideTitle?: boolean
  hideDescription?: boolean
}

const AccessibleAlertDialog = ({
  open,
  onOpenChange,
  title = "تنبيه",
  description = "هذا تنبيه يتطلب انتباهك",
  children,
  hideTitle = false,
  hideDescription = false,
  ...props
}: AccessibleAlertDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange} {...props}>
      <AlertDialogContent>
        <AlertDialogHeader>
          {hideTitle ? (
            <VisuallyHidden>
              <AlertDialogTitle>{title}</AlertDialogTitle>
            </VisuallyHidden>
          ) : (
            <AlertDialogTitle>{title}</AlertDialogTitle>
          )}
          {hideDescription ? (
            <VisuallyHidden>
              <AlertDialogDescription>{description}</AlertDialogDescription>
            </VisuallyHidden>
          ) : (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        {children}
      </AlertDialogContent>
    </AlertDialog>
  )
}

export { AccessibleAlertDialog }
export type { AccessibleAlertDialogProps } 