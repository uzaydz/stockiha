import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming cn exists

export interface ExpenseFormWidgetProps {
    data?: {
        initialTitle?: string;
        initialAmount?: number;
        categories?: string[];
    };
    onAction?: (action: string, payload: any) => void;
}

export const ExpenseFormWidget: React.FC<ExpenseFormWidgetProps> = ({ data, onAction }) => {
    const [title, setTitle] = useState(data?.initialTitle || '');
    const [amount, setAmount] = useState(data?.initialAmount?.toString() || '');
    const [category, setCategory] = useState('أخرى');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const categories = data?.categories || ['سلعة', 'كراء', 'فواتير', 'رواتب', 'نقل', 'تسويق', 'صيانة', 'أخرى'];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !amount || !onAction) return;

        setLoading(true);
        // Simulate a small delay for better UX before action triggers
        setTimeout(() => {
            onAction('submit_expense', {
                title,
                amount: parseFloat(amount),
                category
            });
            setLoading(false);
            setSubmitted(true);
        }, 600);
    };

    if (submitted) {
        return (
            <Card className="w-full max-w-sm border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-900/10">
                <CardContent className="flex flex-col items-center justify-center p-6 text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-2">
                        <Check size={24} />
                    </div>
                    <p className="font-semibold text-emerald-700 dark:text-emerald-300">تم إرسال المصروف!</p>
                    <p className="text-xs text-muted-foreground">{title} - {amount} دج</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-sm border-border/60 shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    📑 تسجيل مصروف جديد
                </CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="p-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title" className="text-xs font-medium text-muted-foreground">عنوان المصروف</Label>
                        <Input
                            id="title"
                            placeholder="مثال: غداء، فاتورة كهرباء..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            className="h-9 bg-background/50"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label htmlFor="amount" className="text-xs font-medium text-muted-foreground">المبلغ (دج)</Label>
                            <Input
                                id="amount"
                                type="number"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                required
                                className="h-9 bg-background/50 font-mono text-center"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category" className="text-xs font-medium text-muted-foreground">الفئة</Label>
                            <select
                                id="category"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background/50 px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {categories.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="p-4 pt-0">
                    <Button
                        type="submit"
                        disabled={loading || !title || !amount}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                        size="sm"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ المصروف'}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
};
