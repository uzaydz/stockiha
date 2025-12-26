import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Check, Loader2, DollarSign, ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface DebtFormWidgetProps {
    data?: {
        initialCustomerName?: string;
        initialCustomerId?: string;
        initialAmount?: number;
        mode?: 'add_debt' | 'pay_debt'; // 'add_debt' = increase debt, 'pay_debt' = decrease debt
    };
    onAction?: (action: string, payload: any) => void;
}

export const DebtFormWidget: React.FC<DebtFormWidgetProps> = ({ data, onAction }) => {
    const [customerName, setCustomerName] = useState(data?.initialCustomerName || '');
    // We ideally need a customer ID, but for now we might rely on the AI finding it or this form being simple
    // If we build a robust one, we'd need an autocomplete here. 
    // For specific "selected customer" flows, the ID should be passed.

    const [customerId, setCustomerId] = useState(data?.initialCustomerId || '');
    const [amount, setAmount] = useState(data?.initialAmount?.toString() || '');
    const [type, setType] = useState<'debt' | 'payment'>(data?.mode === 'pay_debt' ? 'payment' : 'debt');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // If ID is missing but we have a name, we assume the parent handler will try to Fuzzy match or create?
    // Actually, handling debt usually requires an existing customer.
    // Let's assume for this MVP widget, if no ID is passed, we rely on the backend to find exact name match or we fail.
    // Enhanced version would act as a search.

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!customerName || !amount || !onAction) return;

        setLoading(true);
        setTimeout(() => {
            onAction('submit_debt', {
                customerId, // Might be empty if new/unknown
                customerName,
                amount: parseFloat(amount),
                type, // 'debt' (add) or 'payment' (sub)
                notes
            });
            setLoading(false);
            setSubmitted(true);
        }, 600);
    };

    if (submitted) {
        return (
            <Card className={cn("w-full max-w-sm border-opacity-30 bg-opacity-10", type === 'debt' ? "border-red-500 bg-red-50" : "border-emerald-500 bg-emerald-50")}>
                <CardContent className="flex flex-col items-center justify-center p-6 text-center space-y-2">
                    <div className={cn("w-12 h-12 rounded-full flex items-center justify-center mb-2", type === 'debt' ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600")}>
                        <Check size={24} />
                    </div>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">
                        {type === 'debt' ? 'تم تسجيل الدين' : 'تم تسجيل الدفعة'}
                    </p>
                    <p className="text-xs text-muted-foreground">{customerName} - {amount} دج</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-sm border-border/60 shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <DollarSign size={16} className="text-amber-500" />
                    إدارة ديون العملاء
                </CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="p-4 space-y-4">

                    {/* Operation Type Toggle */}
                    <div className="flex bg-muted/50 p-1 rounded-lg">
                        <button
                            type="button"
                            onClick={() => setType('debt')}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 text-xs font-medium py-1.5 rounded-md transition-all",
                                type === 'debt' ? "bg-red-100 text-red-700 shadow-sm" : "text-muted-foreground hover:bg-white/10"
                            )}
                        >
                            <ArrowUp size={12} />
                            إضافة دين (تسليف)
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('payment')}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 text-xs font-medium py-1.5 rounded-md transition-all",
                                type === 'payment' ? "bg-emerald-100 text-emerald-700 shadow-sm" : "text-muted-foreground hover:bg-white/10"
                            )}
                        >
                            <ArrowDown size={12} />
                            استلام دفعة (خلاص)
                        </button>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="d-customer" className="text-xs font-medium text-muted-foreground">اسم العميل</Label>
                        <Input
                            id="d-customer"
                            placeholder="ابحث عن العميل..."
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            required
                            disabled={!!data?.initialCustomerId} // Lock if specific customer selected
                            className="h-9 bg-background/50"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="d-amount" className="text-xs font-medium text-muted-foreground">المبلغ (دج)</Label>
                        <Input
                            id="d-amount"
                            type="number"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                            className="h-9 bg-background/50 font-mono text-center text-lg"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="d-notes" className="text-xs font-medium text-muted-foreground">ملاحظات (اختياري)</Label>
                        <Input
                            id="d-notes"
                            placeholder="مثال: دين قديم، دفعة جزئية..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="h-9 bg-background/50"
                        />
                    </div>
                </CardContent>
                <CardFooter className="p-4 pt-0">
                    <Button
                        type="submit"
                        disabled={loading || !customerName || !amount}
                        className={cn(
                            "w-full text-white",
                            type === 'debt' ? "bg-red-500 hover:bg-red-600" : "bg-emerald-500 hover:bg-emerald-600"
                        )}
                        size="sm"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (type === 'debt' ? 'تسجيل الدين' : 'تسجيل الدفعة')}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
};
