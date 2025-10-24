/**
 * دوال تصدير كشف 104 إلى Excel و PDF
 * متوافق مع التنسيق المطلوب من المديرية العامة للضرائب (DGI)
 */

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';

// أنواع البيانات
interface Etat104Client {
  commercial_name: string;
  nif: string;
  rc: string;
  article_number?: string;
  address: string;
  amount_ht: number;
  tva: number;
  amount_ttc: number;
  validation_status: 'valid' | 'warning' | 'error' | 'pending';
}

interface Etat104Declaration {
  year: number;
  declaration_number?: string;
  total_clients: number;
  total_amount_ht: number;
  total_tva: number;
  total_amount_ttc: number;
}

interface ExportOptions {
  includeErrors?: boolean;
  includeWarnings?: boolean;
  language?: 'ar' | 'fr' | 'en';
}

/**
 * تصدير كشف 104 إلى Excel
 */
export async function exportEtat104ToExcel(
  declaration: Etat104Declaration,
  clients: Etat104Client[],
  organizationInfo: any,
  options: ExportOptions = {}
): Promise<void> {
  try {
    const { includeErrors = true, includeWarnings = true } = options;

    // فلترة العملاء
    let filteredClients = [...clients];
    if (!includeErrors) {
      filteredClients = filteredClients.filter(c => c.validation_status !== 'error');
    }
    if (!includeWarnings) {
      filteredClients = filteredClients.filter(c => c.validation_status !== 'warning');
    }

    // إنشاء Workbook
    const wb = XLSX.utils.book_new();

    // ورقة DGI (التنسيق الرسمي)
    const dgiHeaders = [
      'N°',
      'Raison Sociale',
      'NIF',
      'RC',
      'N° Article',
      'Adresse',
      'Montant HT',
      'TVA',
      'Montant TTC'
    ];

    const dgiData = filteredClients.map((client, index) => [
      index + 1,
      client.commercial_name,
      client.nif,
      client.rc,
      client.article_number || '',
      client.address,
      client.amount_ht,
      client.tva,
      client.amount_ttc
    ]);

    const wsDGI = XLSX.utils.aoa_to_sheet([
      dgiHeaders,
      ...dgiData,
      [
        '',
        'TOTAL',
        '',
        '',
        '',
        '',
        filteredClients.reduce((sum, c) => sum + c.amount_ht, 0),
        filteredClients.reduce((sum, c) => sum + c.tva, 0),
        filteredClients.reduce((sum, c) => sum + c.amount_ttc, 0)
      ]
    ]);

    wsDGI['!cols'] = [
      { wch: 8 }, { wch: 30 }, { wch: 18 }, { wch: 15 },
      { wch: 15 }, { wch: 35 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
    ];

    XLSX.utils.book_append_sheet(wb, wsDGI, 'État 104');

    // حفظ الملف
    const fileName = `Etat104_${declaration.year}_${new Date().getTime()}.xlsx`;
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    
    saveAs(blob, fileName);
    toast.success(`تم تصدير الكشف: ${fileName}`);
  } catch (error: any) {
    console.error('Error exporting:', error);
    toast.error('فشل التصدير: ' + error.message);
    throw error;
  }
}

/**
 * تصدير نموذج Excel فارغ
 */
export function exportEtat104Template(): void {
  try {
    const headers = [
      'الاسم التجاري',
      'NIF',
      'RC',
      'رقم المادة',
      'العنوان',
      'HT',
      'TVA'
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'نموذج');

    const fileName = `Etat104_Template.xlsx`;
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    
    saveAs(blob, fileName);
    toast.success('تم تنزيل النموذج');
  } catch (error: any) {
    toast.error('فشل تنزيل النموذج');
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case 'valid': return 'صالح';
    case 'warning': return 'تحذير';
    case 'error': return 'خطأ';
    default: return 'قيد المراجعة';
  }
}
