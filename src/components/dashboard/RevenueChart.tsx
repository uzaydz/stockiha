import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RevenueData {
  month: string;
  revenue: number;
}

interface RevenueChartProps {
  data: RevenueData[];
}

const RevenueChart = ({ data }: RevenueChartProps) => {
  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>تحليل المبيعات</CardTitle>
      </CardHeader>
      <CardContent className="pl-2">
        <div className="h-[200px] w-full">
          <div className="flex items-end h-full gap-2 pr-10 pl-2">
            {data.map((item, index) => (
              <div key={index} className="relative h-full flex flex-col justify-end items-center flex-1">
                <div className="text-xs text-muted-foreground absolute top-0">
                  {item.revenue.toLocaleString()} د.ج
                </div>
                <div 
                  className="bg-primary/90 rounded-t-md w-full"
                  style={{ height: `${(item.revenue / 50000) * 100}%` }}
                />
                <div className="text-xs pt-1">{item.month}</div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RevenueChart;
