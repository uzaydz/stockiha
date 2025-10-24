import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, Download, Eye, FileCheck, Clock } from "lucide-react";
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface HistoryItem {
  id: string;
  year: number;
  submissionDate: string;
  totalClients: number;
  totalAmountHT: number;
  status: 'submitted' | 'draft' | 'corrected';
}

interface Etat104HistoryListProps {
  selectedYear: number;
}

const Etat104HistoryList = ({ selectedYear }: Etat104HistoryListProps) => {
  // بيانات تجريبية
  const historyItems: HistoryItem[] = [
    {
      id: '1',
      year: 2023,
      submissionDate: '2024-04-15',
      totalClients: 145,
      totalAmountHT: 12500000,
      status: 'submitted',
    },
    {
      id: '2',
      year: 2022,
      submissionDate: '2023-04-20',
      totalClients: 132,
      totalAmountHT: 10800000,
      status: 'submitted',
    },
    {
      id: '3',
      year: 2024,
      submissionDate: '',
      totalClients: 0,
      totalAmountHT: 0,
      status: 'draft',
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <FileCheck className="h-3 w-3 ml-1" />
            مُقدم
          </Badge>
        );
      case 'draft':
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <Clock className="h-3 w-3 ml-1" />
            مسودة
          </Badge>
        );
      case 'corrected':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <FileCheck className="h-3 w-3 ml-1" />
            مُصحح
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          السجل التاريخي للكشوفات
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">السنة</TableHead>
                <TableHead className="text-right">تاريخ التقديم</TableHead>
                <TableHead className="text-right">عدد العملاء</TableHead>
                <TableHead className="text-right">المبلغ الإجمالي</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-center">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <p className="text-muted-foreground">لا يوجد سجل تاريخي</p>
                  </TableCell>
                </TableRow>
              ) : (
                historyItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.year}</TableCell>
                    <TableCell>
                      {item.submissionDate
                        ? format(new Date(item.submissionDate), 'dd MMMM yyyy', {
                            locale: ar,
                          })
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {item.totalClients > 0
                        ? item.totalClients.toLocaleString('ar-DZ')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {item.totalAmountHT > 0
                        ? `${item.totalAmountHT.toLocaleString('ar-DZ', {
                            minimumFractionDigits: 2,
                          })} دج`
                        : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={item.status === 'draft'}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={item.status === 'draft'}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default Etat104HistoryList;
