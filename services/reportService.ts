
import { Transaction, AppDocument, Account } from '../types';
import { getTransactions } from './transactionService';
import { getDocuments } from './documentService';
import * as XLSX from 'xlsx';

export interface DashboardData {
  income: number;
  expense: number;
  profit: number;
  pendingIncome: number;
  // New fields for layout
  recentDocuments: AppDocument[];
  todo: {
      overdueInvoices: AppDocument[];
      dueSoonInvoices: AppDocument[];
      pendingWht: number;
  };
  // Keep pending invoices list for bottom table
  pendingInvoices: AppDocument[];
}

export type DateRange = 'this_month' | '3_months' | '6_months' | 'year' | 'all';

export const getDashboardData = async (userId: string, accountId: string, range: DateRange): Promise<DashboardData> => {
  try {
    // 1. Fetch Data
    const [transactions, allDocs] = await Promise.all([
      getTransactions(userId, accountId),
      getDocuments(userId, accountId) 
    ]);

    // 2. Date Range Logic
    const now = new Date();
    let startDate = new Date(0); 

    if (range === 'this_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (range === '3_months') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    } else if (range === '6_months') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    } else if (range === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    // 3. Totals Calculation
    const filteredTx = transactions.filter(t => new Date(t.date) >= startDate);
    let income = 0;
    let expense = 0;

    filteredTx.forEach(t => {
      if (t.type === 'income') income += t.amount;
      else if (t.type === 'expense') expense += t.amount;
    });

    // Calculate income from documents as well for better accuracy if transactions are missing
    // But for now rely on transaction entries which are auto-created

    // 4. Pending Invoices (Sent/Overdue)
    const pendingInvoices = allDocs.filter(d => 
      d.type === 'invoice' && (d.status === 'sent' || d.status === 'overdue')
    ).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const pendingIncome = pendingInvoices.reduce((sum, doc) => sum + doc.grandTotal, 0);

    // 5. Recent Documents (Mixed types, top 5)
    // Filter only created documents (not drafts optionally, but usually drafts are fine to show)
    // Let's show everything sorted by createdAt or issueDate
    const recentDocuments = [...allDocs]
        .sort((a, b) => {
            // Prefer createdAt if available, else issueDate
            const tA = a.createdAt ? new Date(a.createdAt).getTime() : new Date(a.issueDate).getTime();
            const tB = b.createdAt ? new Date(b.createdAt).getTime() : new Date(b.issueDate).getTime();
            return tB - tA;
        })
        .slice(0, 5);

    // 6. To-Do List Stats
    const today = new Date();
    today.setHours(0,0,0,0);
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const overdueInvoices = pendingInvoices.filter(inv => {
        const d = new Date(inv.dueDate);
        d.setHours(0,0,0,0);
        return d < today;
    });

    const dueSoonInvoices = pendingInvoices.filter(inv => {
        const d = new Date(inv.dueDate);
        d.setHours(0,0,0,0);
        return d >= today && d <= nextWeek;
    });

    const pendingWht = allDocs.filter(d => 
        d.type === 'invoice' && 
        d.withholdingTaxRate && d.withholdingTaxRate > 0 && 
        !d.whtReceived
    ).length;

    return {
      income,
      expense,
      profit: income - expense,
      pendingIncome,
      recentDocuments,
      todo: {
          overdueInvoices,
          dueSoonInvoices,
          pendingWht
      },
      pendingInvoices
    };

  } catch (error) {
    console.error("Error generating dashboard data:", error);
    throw error;
  }
};

export const exportDashboardReport = (data: DashboardData, range: string) => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summaryData = [
        ['รายงานสรุปบัญชี', `ช่วงเวลา: ${range}`],
        [''],
        ['รายการ', 'จำนวนเงิน (บาท)'],
        ['รายรับรวม', data.income],
        ['รายจ่ายรวม', data.expense],
        ['กำไรสุทธิ', data.profit],
        ['ยอดรอเรียกเก็บ (Pending)', data.pendingIncome]
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "ภาพรวม");

    // Sheet 2: Pending Invoices
    const pendingData = [
        ['เลขที่เอกสาร', 'ลูกค้า', 'วันที่ครบกำหนด', 'สถานะ', 'ยอดเงิน'],
        ...data.pendingInvoices.map(inv => [
            inv.documentNo,
            inv.customerName,
            new Date(inv.dueDate).toLocaleDateString('th-TH'),
            inv.status,
            inv.grandTotal
        ])
    ];
    const wsPending = XLSX.utils.aoa_to_sheet(pendingData);
    XLSX.utils.book_append_sheet(wb, wsPending, "ใบแจ้งหนี้ค้างจ่าย");

    // Save File
    XLSX.writeFile(wb, `FreelanceAcc_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportWhtReport = (docs: AppDocument[], year: number) => {
  const wb = XLSX.utils.book_new();

  const header = [
    'เลขที่เอกสาร',
    'ลูกค้า',
    'เลขประจำตัวผู้เสียภาษี (ลูกค้า)',
    'วันที่',
    'ยอดก่อน VAT (บาท)',
    'อัตราภาษี (%)',
    'ยอดหัก ณ ที่จ่าย (บาท)',
    'สถานะใบหักภาษี',
    'วันที่ได้รับใบหัก'
  ];

  const rows = docs.map(doc => {
     const subtotal = doc.subtotal || 0;
     const whtRate = doc.withholdingTaxRate || 0;
     const whtAmount = (subtotal * whtRate) / 100;
     
     return [
        doc.documentNo,
        doc.customerName,
        doc.customerTaxId || '-',
        new Date(doc.issueDate).toLocaleDateString('th-TH'),
        subtotal,
        whtRate,
        whtAmount,
        doc.whtReceived ? 'ได้รับแล้ว' : 'ยังไม่ได้รับ',
        doc.whtReceivedDate ? new Date(doc.whtReceivedDate).toLocaleDateString('th-TH') : '-'
     ];
  });

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, `WHT_${year}`);

  XLSX.writeFile(wb, `Withholding_Tax_Report_${year}.xlsx`);
};

export interface TaxFilingData {
    account: Account;
    formType: string;
    income: {
        amount: number;
        expense: number;
        net: number;
    };
    deductions: any;
    whtList: AppDocument[];
    summary: {
        netIncome: number;
        tax: number;
        whtTotal: number;
        taxToPay: number;
    };
}

export const exportTaxFilingExcel = (data: TaxFilingData) => {
    const wb = XLSX.utils.book_new();
    const year = new Date().getFullYear();

    // --- Sheet 1: ข้อมูลทั่วไป & สรุป ---
    const infoRows = [
        ['ข้อมูลผู้เสียภาษี'],
        ['ชื่อ', data.account.name],
        ['เลขประจำตัวผู้เสียภาษี', data.account.taxId || '-'],
        ['แบบฟอร์ม', data.formType === 'pnd90' ? 'ภ.ง.ด.90 (รายได้ทั้งปี)' : 'ภ.ง.ด.94 (ครึ่งปี)'],
        [''],
        ['สรุปการคำนวณภาษี'],
        ['1. เงินได้พึงประเมิน', data.income.amount],
        ['2. หักค่าใช้จ่าย', data.income.expense],
        ['3. หักค่าลดหย่อน', Object.values(data.deductions).reduce((a: any, b: any) => a + b, 60000)], 
        ['4. เงินได้สุทธิ', data.summary.netIncome],
        ['5. ภาษีที่คำนวณได้', data.summary.tax],
        ['6. หักภาษี ณ ที่จ่าย', data.summary.whtTotal],
        [''],
        ['ยอดภาษีที่ต้องชำระเพิ่ม/ได้คืน', data.summary.taxToPay]
    ];
    const wsInfo = XLSX.utils.aoa_to_sheet(infoRows);
    XLSX.utils.book_append_sheet(wb, wsInfo, "ข้อมูลและสรุป");

    XLSX.writeFile(wb, `Tax_Filing_Data_${year}.xlsx`);
};
