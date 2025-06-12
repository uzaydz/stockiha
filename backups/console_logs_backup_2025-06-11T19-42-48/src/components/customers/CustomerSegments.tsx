import { Customer } from '@/types/customer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from 'recharts';

interface CustomerSegmentsProps {
  customers: Customer[];
}

// Generate segments data based on customer join date
const generateSegments = (customers: Customer[]) => {
  const now = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(now.getMonth() - 6);
  
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(now.getMonth() - 3);
  
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(now.getMonth() - 1);
  
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(now.getDate() - 14);
  
  const segments = {
    sixMonthsPlus: 0,
    threeToSixMonths: 0,
    oneToThreeMonths: 0,
    lessThanOneMonth: 0,
    last14Days: 0
  };
  
  for (const customer of customers) {
    const joinDate = new Date(customer.created_at);
    if (joinDate < sixMonthsAgo) {
      segments.sixMonthsPlus++;
    } else if (joinDate < threeMonthsAgo) {
      segments.threeToSixMonths++;
    } else if (joinDate < oneMonthAgo) {
      segments.oneToThreeMonths++;
    } else {
      segments.lessThanOneMonth++;
      if (joinDate > twoWeeksAgo) {
        segments.last14Days++;
      }
    }
  }
  
  return segments;
};

// Generate monthly customer acquisition data
const generateMonthlyData = (customers: Customer[]) => {
  const monthlyData: { [key: string]: number } = {};
  const months = ['يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  
  // Initialize all months with 0
  const currentYear = new Date().getFullYear();
  months.forEach(month => {
    monthlyData[month] = 0;
  });
  
  // Count customers by month
  for (const customer of customers) {
    const date = new Date(customer.created_at);
    // Only consider customers from this year
    if (date.getFullYear() === currentYear) {
      const month = months[date.getMonth()];
      monthlyData[month]++;
    }
  }
  
  // Convert to chart format
  return Object.entries(monthlyData).map(([month, count]) => ({
    month,
    count
  }));
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const CustomerSegments = ({ customers }: CustomerSegmentsProps) => {
  const segments = generateSegments(customers);
  const monthlyData = generateMonthlyData(customers);
  
  const pieData = [
    { name: 'أكثر من 6 أشهر', value: segments.sixMonthsPlus },
    { name: '3-6 أشهر', value: segments.threeToSixMonths },
    { name: '1-3 أشهر', value: segments.oneToThreeMonths },
    { name: 'أقل من شهر', value: segments.lessThanOneMonth }
  ];
  
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
    
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>تحليل العملاء</CardTitle>
        <CardDescription>تقارير وإحصائيات تفصيلية عن عملاء متجرك</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="segments">
          <TabsList className="mb-6">
            <TabsTrigger value="segments">شرائح العملاء</TabsTrigger>
            <TabsTrigger value="acquisition">اكتساب العملاء</TabsTrigger>
          </TabsList>
          
          <TabsContent value="segments">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-4">توزيع العملاء حسب الأقدمية</h3>
                
                <div className="space-y-8">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>أكثر من 6 أشهر</span>
                      <span className="text-muted-foreground">
                        {segments.sixMonthsPlus} عميل 
                        ({customers.length > 0 
                          ? `${Math.round((segments.sixMonthsPlus / customers.length) * 100)}%` 
                          : '0%'})
                      </span>
                    </div>
                    <Progress value={customers.length > 0 ? (segments.sixMonthsPlus / customers.length) * 100 : 0} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>3-6 أشهر</span>
                      <span className="text-muted-foreground">
                        {segments.threeToSixMonths} عميل 
                        ({customers.length > 0 
                          ? `${Math.round((segments.threeToSixMonths / customers.length) * 100)}%` 
                          : '0%'})
                      </span>
                    </div>
                    <Progress value={customers.length > 0 ? (segments.threeToSixMonths / customers.length) * 100 : 0} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>1-3 أشهر</span>
                      <span className="text-muted-foreground">
                        {segments.oneToThreeMonths} عميل 
                        ({customers.length > 0 
                          ? `${Math.round((segments.oneToThreeMonths / customers.length) * 100)}%` 
                          : '0%'})
                      </span>
                    </div>
                    <Progress value={customers.length > 0 ? (segments.oneToThreeMonths / customers.length) * 100 : 0} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>أقل من شهر</span>
                      <span className="text-muted-foreground">
                        {segments.lessThanOneMonth} عميل 
                        ({customers.length > 0 
                          ? `${Math.round((segments.lessThanOneMonth / customers.length) * 100)}%` 
                          : '0%'})
                      </span>
                    </div>
                    <Progress value={customers.length > 0 ? (segments.lessThanOneMonth / customers.length) * 100 : 0} className="h-2" />
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-4">توزيع العملاء (رسم بياني)</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [`${value} عميل`, '']}
                        labelFormatter={(name) => `${name}`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="flex flex-wrap justify-center mt-4 gap-3">
                  {pieData.map((entry, index) => (
                    <div key={`legend-${index}`} className="flex items-center">
                      <div 
                        className="w-3 h-3 mr-1" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="acquisition">
            <div>
              <h3 className="font-medium mb-4">اكتساب العملاء الشهري</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis allowDecimals={false} />
                    <Tooltip
                      formatter={(value) => [`${value} عميل`, 'عدد العملاء']}
                      labelFormatter={(label) => `شهر ${label}`}
                    />
                    <Bar dataKey="count" name="عدد العملاء" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-6">
                <h4 className="font-medium mb-2">نمو العملاء</h4>
                <p className="text-muted-foreground">
                  {segments.last14Days} عملاء جدد تم تسجيلهم في آخر 14 يوم.
                  {customers.length > 0 && (
                    <>
                      {' '}معدل النمو الأسبوعي: {Math.round((segments.last14Days / 2) / (customers.length - segments.last14Days) * 100)}%.
                    </>
                  )}
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CustomerSegments;
