import React from 'react';
import { ProductListWidget } from './ProductListWidget';
import { StatsWidget } from './StatsWidget';
import { ActionChips } from './ActionChips';
import { ChartWidget } from './ChartWidget';
import { ExpenseFormWidget } from './ExpenseFormWidget';
import { CustomerFormWidget } from './CustomerFormWidget';
import { DebtFormWidget } from './DebtFormWidget';

export type WidgetType = 'product_list' | 'stats_card' | 'action_chips' | 'chart_line' | 'chart_pie' | 'chart' | 'expense_form' | 'customer_form' | 'debt_form';

export interface WidgetData {
    type: WidgetType;
    title?: string;
    description?: string;
    data: any;
    actions?: any[];
}

interface WidgetRendererProps {
    widget: WidgetData;
    onAction?: (action: string, payload?: any) => void;
}

export const WidgetRenderer: React.FC<WidgetRendererProps> = ({ widget, onAction }) => {
    switch (widget.type) {
        case 'product_list':
            return <ProductListWidget data={widget.data} title={widget.title} onAction={onAction} />;
        case 'stats_card':
            return <StatsWidget data={widget.data} title={widget.title} />;
        case 'action_chips':
            return <ActionChips actions={widget.data} onAction={onAction} />;
        case 'chart':
            return <ChartWidget
                title={widget.title || ''}
                description={widget.description}
                chartType={widget.data.type || 'area'}
                data={widget.data.points}
                trend={widget.data.trend}
            />;
        case 'expense_form':
            return <ExpenseFormWidget data={widget.data} onAction={onAction} />;
        case 'customer_form':
            return <CustomerFormWidget data={widget.data} onAction={onAction} />;
        case 'debt_form':
            return <DebtFormWidget data={widget.data} onAction={onAction} />;
        default:
            console.warn('Unknown widget type:', widget.type);
            return null;
    }
};
