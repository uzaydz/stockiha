/**
 * تصدير كشف 104 بالتنسيق الرسمي G3-BIS من DGI
 * متوافق 100% مع النموذج الرسمي
 */

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface Etat104Client {
  commercial_name: string;
  nif: string;
  rc: string;
  article_number?: string;
  address: string;
  amount_ht: number;
  tva: number;
}

interface OrganizationInfo {
  name: string;
  nif?: string;
  rc?: string;
  nis?: string;
  address?: string;
}

/**
 * تصدير كشف 104 بالتنسيق الرسمي G3-BIS
 */
export async function exportEtat104OfficialG3(
  clients: Etat104Client[],
  organizationInfo: OrganizationInfo,
  year: number
): Promise<void> {
  try {
    const workbook = XLSX.utils.book_new();
    
    // إنشاء البيانات بالتنسيق الرسمي
    const data: any[][] = [];
    
    // الرأس (Header) - 3 صفوف
    data.push([
      'رقم السجل التجاري',
      'رقم المادة الضريبية', 
      'رقم التعريف الجبائي',
      'الإسم الكامل للعميل (1) DÉSIGNATION EXACTE DU CLIENT',
      '',
      'مجموع السنوي',
      'مبلغ القيمة المضافة'
    ]);
    
    data.push([
      'Numéro du registre',
      "Numéro d'Article",
      "Numéro d'Identification",
      'اللقب - الاسم - أو إسم الشركة',
      'العنوان الكامل (الرقم، الحي، البلدية)',
      'MONTANT ANNUEL',
      'MONTANT DE LA TAXE'
    ]);
    
    data.push([
      'de commerce',
      'Fiscale',
      'Fiscale',
      'NOM, Prénoms ou Raison Sociale',
      'Adresse Complète (Rue, n°, Bt, Commune)',
      'des Opérations Réalisées',
      'sur la Valeur Ajoutée'
    ]);
    
    data.push([
      '',
      '',
      '',
      '',
      '',
      'avec Chaque Client',
      'facturée à chaque client'
    ]);
    
    data.push([
      '',
      '',
      '',
      '',
      '',
      'DA',
      'DA'
    ]);
    
    // صف فارغ
    data.push(['', '', '', '', '', '', '']);
    
    // البيانات - كل عميل
    let totalHT = 0;
    let totalTVA = 0;
    let rowNumber = 1;
    
    clients.forEach((client) => {
      // تقسيم المبلغ إلى دينار وسنتيم
      const htDA = Math.floor(client.amount_ht);
      const tvaDA = Math.floor(client.tva);
      
      data.push([
        client.rc || '',
        client.article_number || '',
        client.nif || '',
        client.commercial_name || '',
        client.address || '',
        htDA.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        tvaDA.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      ]);
      
      totalHT += client.amount_ht;
      totalTVA += client.tva;
      rowNumber++;
    });
    
    // صف فارغ
    data.push(['', '', '', '', '', '', '']);
    
    // صف الإجمالي
    data.push([
      '',
      '',
      '',
      '',
      'المجموع الذي يحمل - Total à reporter',
      Math.floor(totalHT).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      Math.floor(totalTVA).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    ]);
    
    // إنشاء الورقة
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    
    // تنسيق العرض (Column Widths)
    worksheet['!cols'] = [
      { wch: 20 }, // رقم السجل التجاري
      { wch: 18 }, // رقم المادة
      { wch: 20 }, // NIF
      { wch: 35 }, // الاسم
      { wch: 40 }, // العنوان
      { wch: 18 }, // المبلغ HT
      { wch: 18 }  // TVA
    ];
    
    // دمج الخلايا للرأس
    worksheet['!merges'] = [
      // دمج عنوان "الإسم الكامل" مع "العنوان"
      { s: { r: 0, c: 3 }, e: { r: 0, c: 4 } },
    ];
    
    // إضافة الورقة إلى الكتاب
    XLSX.utils.book_append_sheet(workbook, worksheet, `État 104 - ${year}`);
    
    // إنشاء ورقة معلومات المؤسسة
    const infoData: any[][] = [];
    infoData.push(['معلومات المؤسسة المصرحة', '']);
    infoData.push(['']);
    infoData.push(['اسم المؤسسة', organizationInfo.name || '']);
    infoData.push(['رقم التعريف الجبائي (NIF)', organizationInfo.nif || '']);
    infoData.push(['رقم السجل التجاري (RC)', organizationInfo.rc || '']);
    infoData.push(['رقم التعريف الإحصائي (NIS)', organizationInfo.nis || '']);
    infoData.push(['العنوان', organizationInfo.address || '']);
    infoData.push(['']);
    infoData.push(['السنة المالية', year.toString()]);
    infoData.push(['عدد العملاء', clients.length.toString()]);
    infoData.push(['']);
    infoData.push(['المبلغ الإجمالي HT', Math.floor(totalHT).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' DA']);
    infoData.push(['المبلغ الإجمالي TVA', Math.floor(totalTVA).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' DA']);
    infoData.push(['المبلغ الإجمالي TTC', Math.floor(totalHT + totalTVA).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' DA']);
    
    const infoWorksheet = XLSX.utils.aoa_to_sheet(infoData);
    infoWorksheet['!cols'] = [{ wch: 35 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(workbook, infoWorksheet, 'معلومات المؤسسة');
    
    // حفظ الملف
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const fileName = `Etat_104_G3_${year}_${organizationInfo.name?.replace(/\s+/g, '_') || 'Export'}.xlsx`;
    saveAs(blob, fileName);
    
    toast.success(`تم تصدير كشف 104 بنجاح بالتنسيق الرسمي G3-BIS`);
  } catch (error: any) {
    console.error('Error exporting État 104:', error);
    toast.error('فشل تصدير الكشف: ' + error.message);
    throw error;
  }
}

/**
 * تنزيل نموذج فارغ بالتنسيق الرسمي G3-BIS
 */
export function downloadOfficialG3Template(): void {
  try {
    const workbook = XLSX.utils.book_new();
    
    const data: any[][] = [];
    
    // الرأس
    data.push([
      'رقم السجل التجاري',
      'رقم المادة الضريبية',
      'رقم التعريف الجبائي',
      'الإسم الكامل للعميل',
      'العنوان الكامل',
      'المبلغ HT',
      'TVA'
    ]);
    
    data.push([
      'Numéro RC',
      "N° Article",
      "NIF",
      'Raison Sociale',
      'Adresse Complète',
      'Montant HT (DA)',
      'TVA (DA)'
    ]);
    
    // 20 صف فارغ للبيانات
    for (let i = 0; i < 20; i++) {
      data.push(['', '', '', '', '', '', '']);
    }
    
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    worksheet['!cols'] = [
      { wch: 20 },
      { wch: 18 },
      { wch: 20 },
      { wch: 35 },
      { wch: 40 },
      { wch: 18 },
      { wch: 18 }
    ];
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'État 104 - Template');
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    saveAs(blob, 'Etat_104_G3_Template_Officiel.xlsx');
    toast.success('تم تنزيل النموذج الرسمي بنجاح');
  } catch (error: any) {
    console.error('Error downloading template:', error);
    toast.error('فشل تنزيل النموذج');
  }
}

/**
 * تصدير كشف 104 إلى PDF باستخدام jsPDF
 */
export async function exportEtat104ToPDF(
  clients: Etat104Client[],
  organizationInfo: OrganizationInfo,
  year: number
): Promise<void> {
  try {
    // إنشاء مستند PDF أفقي
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // إضافة خط عربي (افتراضي)
    doc.setFont('helvetica');
    
    // العنوان
    doc.setFontSize(16);
    doc.text('État 104 - Kachf Hisab 104', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    
    // معلومات المؤسسة
    doc.setFontSize(10);
    let yPos = 25;
    doc.text(`Organization: ${organizationInfo.name || ''}`, 15, yPos);
    doc.text(`Year: ${year}`, 15, yPos + 5);
    doc.text(`NIF: ${organizationInfo.nif || 'N/A'}`, 15, yPos + 10);
    doc.text(`RC: ${organizationInfo.rc || 'N/A'}`, 150, yPos);
    doc.text(`NIS: ${organizationInfo.nis || 'N/A'}`, 150, yPos + 5);
    doc.text(`Total Clients: ${clients.length}`, 150, yPos + 10);
    
    // إعداد بيانات الجدول
    const tableData = clients.map((client) => [
      client.rc || '',
      client.article_number || '',
      client.nif || '',
      client.commercial_name || '',
      client.address || '',
      Math.floor(client.amount_ht).toLocaleString('fr-FR', { minimumFractionDigits: 2 }),
      Math.floor(client.tva).toLocaleString('fr-FR', { minimumFractionDigits: 2 })
    ]);
    
    // حساب الإجماليات
    const totalHT = clients.reduce((sum, c) => sum + c.amount_ht, 0);
    const totalTVA = clients.reduce((sum, c) => sum + c.tva, 0);
    
    // إضافة صف الإجمالي
    tableData.push([
      '', '', '', '', 'TOTAL',
      Math.floor(totalHT).toLocaleString('fr-FR', { minimumFractionDigits: 2 }),
      Math.floor(totalTVA).toLocaleString('fr-FR', { minimumFractionDigits: 2 })
    ]);
    
    // إنشاء الجدول
    (doc as any).autoTable({
      startY: yPos + 20,
      head: [[
        'RC',
        'N° Article',
        'NIF',
        'Raison Sociale',
        'Adresse',
        'Montant HT (DA)',
        'TVA (DA)'
      ]],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2,
        halign: 'center'
      },
      headStyles: {
        fillColor: [200, 200, 200],
        textColor: [0, 0, 0],
        fontStyle: 'bold'
      },
      columnStyles: {
        3: { cellWidth: 50 }, // Raison Sociale
        4: { cellWidth: 60 }, // Adresse
        5: { halign: 'right' }, // Montant HT
        6: { halign: 'right' }  // TVA
      },
      footStyles: {
        fillColor: [220, 220, 220],
        fontStyle: 'bold'
      }
    });
    
    // التذييل
    const finalY = (doc as any).lastAutoTable.finalY || 200;
    doc.setFontSize(8);
    doc.text('Direction Generale des Impots - DGI', doc.internal.pageSize.getWidth() / 2, finalY + 10, { align: 'center' });
    
    // حفظ الملف
    const fileName = `Etat_104_${year}_${organizationInfo.name?.replace(/\s+/g, '_') || 'Export'}.pdf`;
    doc.save(fileName);
    
    toast.success('تم تصدير الكشف بصيغة PDF بنجاح');
  } catch (error: any) {
    console.error('Error exporting to PDF:', error);
    toast.error('فشل تصدير PDF: ' + error.message);
    throw error;
  }
}
