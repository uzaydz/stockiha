import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle, XCircle, Users, TrendingUp, DollarSign } from "lucide-react";

interface Etat104StatisticsProps {
  totalClients: number;
  validClients: number;
  warningClients: number;
  errorClients: number;
  totalAmountHT: number;
  totalTVA: number;
}

const Etat104Statistics = ({
  totalClients,
  validClients,
  warningClients,
  errorClients,
  totalAmountHT,
  totalTVA,
}: Etat104StatisticsProps) => {
  const validPercentage = totalClients > 0 ? (validClients / totalClients) * 100 : 0;
  const warningPercentage = totalClients > 0 ? (warningClients / totalClients) * 100 : 0;
  const errorPercentage = totalClients > 0 ? (errorClients / totalClients) * 100 : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* إجمالي العملاء */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">إجمالي العملاء</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalClients.toLocaleString('ar-DZ')}</div>
          <p className="text-xs text-muted-foreground mt-1">
            عدد العملاء المسجلين في الكشف
          </p>
        </CardContent>
      </Card>

      {/* العملاء الصالحون */}
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-green-900">
            عملاء صالحون
          </CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-900">
            {validClients.toLocaleString('ar-DZ')}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 bg-green-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: `${validPercentage}%` }}
              />
            </div>
            <span className="text-xs text-green-700 font-medium">
              {validPercentage.toFixed(1)}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* عملاء بتحذيرات */}
      <Card className="border-orange-200 bg-orange-50/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-orange-900">
            عملاء بتحذيرات
          </CardTitle>
          <AlertTriangle className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-900">
            {warningClients.toLocaleString('ar-DZ')}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 bg-orange-200 rounded-full h-2">
              <div
                className="bg-orange-600 h-2 rounded-full transition-all"
                style={{ width: `${warningPercentage}%` }}
              />
            </div>
            <span className="text-xs text-orange-700 font-medium">
              {warningPercentage.toFixed(1)}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* عملاء بأخطاء */}
      <Card className="border-red-200 bg-red-50/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-red-900">
            عملاء بأخطاء
          </CardTitle>
          <XCircle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-900">
            {errorClients.toLocaleString('ar-DZ')}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 bg-red-200 rounded-full h-2">
              <div
                className="bg-red-600 h-2 rounded-full transition-all"
                style={{ width: `${errorPercentage}%` }}
              />
            </div>
            <span className="text-xs text-red-700 font-medium">
              {errorPercentage.toFixed(1)}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* المبلغ خارج الرسوم */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">المبلغ خارج الرسوم</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {totalAmountHT.toLocaleString('ar-DZ', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-1">دج (HT)</p>
        </CardContent>
      </Card>

      {/* ضريبة القيمة المضافة */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">ضريبة القيمة المضافة</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {totalTVA.toLocaleString('ar-DZ', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            دج (TVA) • الإجمالي: {(totalAmountHT + totalTVA).toLocaleString('ar-DZ', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} دج
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Etat104Statistics;
