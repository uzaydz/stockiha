import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Check, Loader2, UserPlus } from 'lucide-react';

export interface CustomerFormWidgetProps {
    data?: {
        initialName?: string;
        initialPhone?: string;
    };
    onAction?: (action: string, payload: any) => void;
}

export const CustomerFormWidget: React.FC<CustomerFormWidgetProps> = ({ data, onAction }) => {
    const [name, setName] = useState(data?.initialName || '');
    const [phone, setPhone] = useState(data?.initialPhone || '');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !onAction) return;

        setLoading(true);
        setTimeout(() => {
            onAction('submit_customer', {
                name,
                phone
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
                    <p className="font-semibold text-emerald-700 dark:text-emerald-300">تم إضافة العميل!</p>
                    <p className="text-xs text-muted-foreground">{name}</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-sm border-border/60 shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <UserPlus size={16} className="text-blue-500" />
                    إضافة عميل جديد
                </CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="p-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="c-name" className="text-xs font-medium text-muted-foreground">اسم العميل</Label>
                        <Input
                            id="c-name"
                            placeholder="الاسم الكامل"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="h-9 bg-background/50"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="c-phone" className="text-xs font-medium text-muted-foreground">رقم الهاتف (اختياري)</Label>
                        <Input
                            id="c-phone"
                            placeholder="05 XX XX XX XX"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="h-9 bg-background/50"
                            dir="ltr"
                        />
                    </div>
                </CardContent>
                <CardFooter className="p-4 pt-0">
                    <Button
                        type="submit"
                        disabled={loading || !name}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        size="sm"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ العميل'}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
};
