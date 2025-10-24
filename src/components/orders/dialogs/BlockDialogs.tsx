import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Ban, ShieldOff, Loader2 } from "lucide-react";

// تحسين الأداء بإلغاء التحديثات غير الضرورية
const MemoizedTextarea = memo(Textarea);
const MemoizedLabel = memo(Label);

interface BlockDialogsProps {
  showBlockDialog: boolean;
  showUnblockDialog: boolean;
  blockingCustomer: boolean;
  blockReason: string;
  selectedOrderForBlock: any;
  onBlockDialogChange: (open: boolean) => void;
  onUnblockDialogChange: (open: boolean) => void;
  onBlockReasonChange: (reason: string) => void;
  onBlockCustomer: () => void;
  onUnblockCustomer: () => void;
}

const BlockDialogs = memo(({
  showBlockDialog,
  showUnblockDialog,
  blockingCustomer,
  blockReason,
  selectedOrderForBlock,
  onBlockDialogChange,
  onUnblockDialogChange,
  onBlockReasonChange,
  onBlockCustomer,
  onUnblockCustomer
}: BlockDialogsProps) => {
  return (
    <>
      {/* حوار تأكيد الحظر */}
      <AlertDialog open={showBlockDialog} onOpenChange={onBlockDialogChange}>
        <AlertDialogContent 
          dir="rtl" 
          className="w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] sm:max-w-md rounded-xl shadow-2xl border-0 p-4 sm:p-6 gap-4"
        >
          <AlertDialogHeader className="space-y-2 sm:space-y-3">
            <AlertDialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
              <div className="p-1.5 sm:p-2 bg-red-100 dark:bg-red-900/20 rounded-lg flex-shrink-0">
                <Ban className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400" />
              </div>
              <span className="flex-1">تأكيد حظر العميل</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm leading-relaxed text-right">
              سيتم منع هذا العميل من إنشاء طلبات جديدة باستخدام نفس رقم الهاتف.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 sm:space-y-3">
            <MemoizedLabel htmlFor="block-reason" className="text-xs sm:text-sm font-medium">
              سبب الحظر (اختياري)
            </MemoizedLabel>
            <MemoizedTextarea
              id="block-reason"
              value={blockReason}
              onChange={(e) => onBlockReasonChange(e.target.value)}
              placeholder="مثال: طلبات وهمية، عدم استلام الطلبات..."
              className="resize-none text-xs sm:text-sm min-h-[70px] sm:min-h-[80px]"
              rows={3}
            />
          </div>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-3 mt-2">
            <AlertDialogCancel 
              disabled={blockingCustomer}
              className="w-full sm:w-auto h-10 sm:h-11 text-xs sm:text-sm"
            >
              تراجع
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onBlockCustomer}
              disabled={blockingCustomer}
              className="w-full sm:w-auto bg-red-600 text-white hover:bg-red-700 gap-2 h-10 sm:h-11 text-xs sm:text-sm"
            >
              {blockingCustomer ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>جاري الحظر...</span>
                </>
              ) : (
                <>
                  <Ban className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>تأكيد الحظر</span>
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* حوار تأكيد إلغاء الحظر */}
      <AlertDialog open={showUnblockDialog} onOpenChange={onUnblockDialogChange}>
        <AlertDialogContent 
          dir="rtl" 
          className="w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] sm:max-w-md rounded-xl shadow-2xl border-0 p-4 sm:p-6 gap-4"
        >
          <AlertDialogHeader className="space-y-2 sm:space-y-3">
            <AlertDialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
              <div className="p-1.5 sm:p-2 bg-green-100 dark:bg-green-900/20 rounded-lg flex-shrink-0">
                <ShieldOff className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
              </div>
              <span className="flex-1">إلغاء حظر العميل</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm leading-relaxed text-right">
              سيتمكن هذا العميل من إنشاء طلبات جديدة مرة أخرى.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-3 mt-2">
            <AlertDialogCancel 
              disabled={blockingCustomer}
              className="w-full sm:w-auto h-10 sm:h-11 text-xs sm:text-sm"
            >
              تراجع
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onUnblockCustomer}
              disabled={blockingCustomer}
              className="w-full sm:w-auto bg-green-600 text-white hover:bg-green-700 gap-2 h-10 sm:h-11 text-xs sm:text-sm"
            >
              {blockingCustomer ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>جاري الإلغاء...</span>
                </>
              ) : (
                <>
                  <ShieldOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>تأكيد إلغاء الحظر</span>
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});

BlockDialogs.displayName = "BlockDialogs";

export default BlockDialogs;
