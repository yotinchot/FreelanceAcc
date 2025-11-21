
import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAccount } from '../context/AccountContext';
import { useParams, useNavigate } from 'react-router-dom';
import { Customer, AppDocument, QuotationItem, DocumentType } from '../types';
import { getCustomers } from '../services/customerService';
import { createDocument, getDocumentById, updateDocument } from '../services/documentService';
import { addTransaction } from '../services/transactionService';
import { toThaiBaht } from '../utils/currency';
import { Save, Download, ChevronLeft, Plus, Trash2, Loader2, X, Printer, RefreshCw, CheckCircle2, AlertCircle, Eye, ArrowLeft } from 'lucide-react';

// Declare html2pdf from CDN
declare const html2pdf: any;

interface DocumentFormProps {
    type: DocumentType;
}

const DocumentFormPage: React.FC<DocumentFormProps> = ({ type }) => {
  const { user } = useAuth();
  const { currentAccount } = useAccount();
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [converting, setConverting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // WHT Toggle State
  const [enableWht, setEnableWht] = useState(false);

  // Dialog State
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'confirm';
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'success'
  });
  
  // Refs for PDF generation
  const previewRef = useRef<HTMLDivElement>(null); // Visible in Modal
  const hiddenRef = useRef<HTMLDivElement>(null);  // Hidden for direct download
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  const [formData, setFormData] = useState<Partial<AppDocument>>({
    type: type,
    status: type === 'quotation' ? 'draft' : (type === 'invoice' ? 'sent' : 'paid'),
    items: [],
    vatRate: 7,
    withholdingTaxRate: 0,
    notes: '',
    projectName: '',
  });

  const getDocTitle = (t: DocumentType) => {
      switch(t) {
          case 'quotation': return 'ใบเสนอราคา';
          case 'invoice': return 'ใบแจ้งหนี้ / ใบวางบิล';
          case 'receipt': return 'ใบเสร็จรับเงิน';
          case 'tax_invoice': return 'ใบกำกับภาษี';
          case 'tax_receipt': return 'ใบกำกับภาษี/ใบเสร็จรับเงิน';
          default: return 'เอกสาร';
      }
  };

  const getRoutePath = (t: DocumentType) => {
    if (t === 'tax_receipt') return 'tax-receipts';
    if (t === 'tax_invoice') return 'tax-invoices';
    return t + 's';
  }

  useEffect(() => {
    if (!id) {
        // Reset form when switching create types
        const today = new Date();
        const next = new Date();
        if (type === 'quotation') {
             next.setDate(today.getDate() + 30);
             setFormData({
                type: type,
                status: 'draft',
                items: [],
                vatRate: 7,
                withholdingTaxRate: 0,
                issueDate: today,
                dueDate: next,
                notes: '',
                projectName: ''
            });
            setEnableWht(false);
        } else {
            next.setDate(today.getDate() + 7);
            const isPaidDoc = type === 'receipt' || type === 'tax_invoice' || type === 'tax_receipt';
            setFormData({
                type: type,
                status: isPaidDoc ? 'paid' : 'sent',
                items: [],
                vatRate: 7,
                withholdingTaxRate: 0,
                issueDate: today,
                dueDate: next,
                notes: '',
                projectName: ''
            });
            setEnableWht(false);
        }
    }
  }, [id, type]);

  useEffect(() => {
    const loadData = async () => {
      if (!user || !currentAccount) return;
      setLoading(true);
      try {
        const customersData = await getCustomers(user.uid, currentAccount.id);
        setCustomers(customersData);

        if (id) {
          const doc = await getDocumentById(id);
          if (doc && doc.type === type) {
             setFormData(doc);
             if (doc.withholdingTaxRate && doc.withholdingTaxRate > 0) {
                 setEnableWht(true);
             }
          } else if (doc) {
             navigate(`/${getRoutePath(doc.type)}/edit/${id}`, { replace: true });
          } else {
             navigate(`/${getRoutePath(type)}`);
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user, currentAccount, id, navigate, type]);

  // Calculations
  const subtotal = formData.items?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
  const vatAmount = (subtotal * (formData.vatRate || 0)) / 100;
  const grandTotal = subtotal + vatAmount;
  
  const whtRate = enableWht ? (formData.withholdingTaxRate || 0) : 0;
  const whtAmount = (subtotal * whtRate) / 100;
  const netTotal = grandTotal - whtAmount;

  // Handlers
  const showDialog = (title: string, message: string, type: 'success' | 'error' | 'confirm', onConfirm?: () => void) => {
      setDialog({ isOpen: true, title, message, type, onConfirm });
  };
  const closeDialog = () => setDialog(prev => ({ ...prev, isOpen: false }));

  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
        setFormData(prev => ({
            ...prev,
            customerId: customer.id,
            customerName: customer.name,
            customerAddress: customer.address,
            customerTaxId: customer.taxId
        }));
    }
  };

  const addItem = () => {
    const newItem: QuotationItem = {
        id: Date.now().toString(),
        description: '',
        details: '',
        quantity: 1,
        price: 0,
        amount: 0
    };
    setFormData(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
  };

  const updateItem = (index: number, field: keyof QuotationItem, value: any) => {
    const newItems = [...(formData.items || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'price') {
        const qty = field === 'quantity' ? parseFloat(value) || 0 : newItems[index].quantity;
        const price = field === 'price' ? parseFloat(value) || 0 : newItems[index].price;
        newItems[index].amount = qty * price;
    }
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const removeItem = (index: number) => {
    const newItems = [...(formData.items || [])];
    newItems.splice(index, 1);
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  // Helper to record transaction
  const recordIncomeTransaction = async (docId: string, docData: any) => {
      try {
        const total = docData.grandTotal || 0;
        
        await addTransaction({
            userId: user!.uid,
            accountId: currentAccount!.id,
            type: 'income',
            amount: total, 
            date: docData.issueDate || new Date(),
            category: 'รายได้จากการขาย',
            description: `${docData.documentNo} - ${docData.customerName}`,
            referenceNo: docData.documentNo
        });
      } catch (err) {
          console.error("Error adding auto-transaction:", err);
      }
  };

  const saveDocumentToDb = async (): Promise<string | null> => {
    if (!user || !currentAccount) return null;
    if (!formData.customerId) {
        showDialog('แจ้งเตือน', 'กรุณาเลือกลูกค้า', 'error');
        return null;
    }
    if (!formData.items || formData.items.length === 0) {
        showDialog('แจ้งเตือน', 'กรุณาเพิ่มรายการอย่างน้อย 1 รายการ', 'error');
        return null;
    }

    setSaving(true);
    try {
        const finalWhtRate = enableWht ? (formData.withholdingTaxRate || 0) : 0;
        const _subtotal = formData.items.reduce((sum, item) => sum + (item.amount || 0), 0);
        const _vatAmount = (_subtotal * (formData.vatRate || 0)) / 100;
        const _grandTotal = _subtotal + _vatAmount;

        const finalData = {
            ...formData,
            withholdingTaxRate: finalWhtRate,
            type,
            userId: user.uid,
            accountId: currentAccount.id,
            subtotal: _subtotal,
            vatAmount: _vatAmount,
            grandTotal: _grandTotal
        } as any;

        let savedId = id;

        if (id) {
            await updateDocument(id, finalData);
        } else {
            savedId = await createDocument(finalData);
            
            // --- AUTO RECORD INCOME TRANSACTION ---
            if (type === 'receipt' || type === 'tax_receipt' || type === 'tax_invoice') {
                await recordIncomeTransaction(savedId!, { ...finalData, documentNo: 'PENDING', grandTotal: _grandTotal });
            }
        }
        return savedId || null;
    } catch (error) {
        console.error(error);
        showDialog('เกิดข้อผิดพลาด', 'บันทึกไม่สำเร็จ: ' + error, 'error');
        return null;
    } finally {
        setSaving(false);
    }
  };

  const handleSave = async () => {
      const savedId = await saveDocumentToDb();
      if (savedId) {
          if (!id) {
              navigate(`/${getRoutePath(type)}/edit/${savedId}`, { replace: true });
          }
          showDialog('สำเร็จ', 'บันทึกข้อมูลเรียบร้อยแล้ว', 'success');
      }
  };

  const handlePreview = async () => {
      setShowPreviewModal(true);
  };

  const handlePrint = async () => {
      setShowPreviewModal(true);
      setTimeout(() => window.print(), 500);
  };

  const handleDownloadPDF = async () => {
      const element = hiddenRef.current;
      if (!element) return;
      
      setIsGeneratingPdf(true);
      const opt = {
        margin: 0,
        filename: `${formData.documentNo || 'document'}.pdf`,
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: { scale: 2, useCORS: true, logging: false, scrollY: 0 }, 
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      if (typeof html2pdf !== 'undefined') {
        await html2pdf().set(opt).from(element).save();
      } else {
        alert("PDF Library not loaded");
      }
      setIsGeneratingPdf(false);
  };

  const handleConvert = async (targetType: DocumentType) => {
      // AUTO SAVE logic: always try to save first
      let currentId = id;
      if (!currentId || saving) {
          // If we are already saving (edge case), or it's a new doc, save first
          currentId = await saveDocumentToDb();
          if (!currentId) return; 
      } else {
          // Even if id exists, save any changes on screen
          await saveDocumentToDb();
      }
      
      executeConversion(targetType, currentId);
  };

  const executeConversion = async (targetType: DocumentType, sourceId: string) => {
    if (!user || !currentAccount) return;
    setConverting(true);
    try {
        const sourceDoc = await getDocumentById(sourceId);
        if (!sourceDoc) throw new Error("Source document not found");

        const newData: any = {
            ...sourceDoc,
            type: targetType,
            accountId: currentAccount.id,
            referenceNo: sourceDoc.documentNo, 
            referenceId: sourceId,
            status: (targetType === 'tax_receipt' || targetType === 'receipt') ? 'paid' : 'sent',
            issueDate: new Date(),
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        };
        
        delete newData.id;
        delete newData.documentNo;
        delete newData.createdAt;
        delete newData.updatedAt;
        
        const newId = await createDocument(newData);

        // Update source invoice status to paid if converting to receipt
        if (type === 'invoice' && (targetType === 'tax_receipt' || targetType === 'receipt')) {
            await updateDocument(sourceId, {
                status: 'paid',
                paidDate: new Date()
            });
        }
        
        if (targetType === 'receipt' || targetType === 'tax_receipt') {
             const createdDoc = await getDocumentById(newId);
             if (createdDoc) {
                await recordIncomeTransaction(newId, createdDoc);
             }
        }
        
        navigate(`/${getRoutePath(targetType)}/edit/${newId}`);
    } catch (error) {
        console.error(error);
        showDialog('เกิดข้อผิดพลาด', 'แปลงเอกสารไม่สำเร็จ', 'error');
    } finally {
        setConverting(false);
    }
  };

  // --- PAPER COMPONENT ---
  interface PaperProps {
      customTitle?: string;
      customSubtitle?: string;
      pageType?: 'tax' | 'receipt' | 'invoice' | 'quotation';
      copyType?: 'original' | 'copy';
      pageNumber?: number;
      totalPages?: number;
  }

  const InvoicePaperContent = ({ customTitle, customSubtitle, pageType, copyType, pageNumber, totalPages }: PaperProps) => {
      const themeColor = pageType === 'receipt' ? 'text-emerald-700 border-emerald-700' : 'text-primary-700 border-primary-700';
      const headerBg = pageType === 'receipt' ? 'bg-emerald-50 text-emerald-900' : 'bg-primary-50 text-primary-900';
      const tableHeader = pageType === 'receipt' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-primary-50 text-primary-800 border-primary-100';
      
      return (
        <div className="bg-white w-[210mm] min-h-[296mm] relative text-slate-900 p-[15mm] text-left mx-auto overflow-hidden flex flex-col select-text">
            {totalPages && totalPages > 1 && (
                <div className="absolute top-[10mm] right-[15mm] text-xs text-slate-400">
                    หน้า {pageNumber} / {totalPages}
                </div>
            )}
            <div className="flex justify-between mb-6">
                <div className="w-[60%] flex gap-4">
                     {currentAccount?.logoUrl && (
                        <img src={currentAccount.logoUrl} alt="Logo" className="w-20 h-20 object-contain shrink-0" crossOrigin="anonymous" />
                    )}
                    <div>
                        <h1 className={`text-xl font-bold ${themeColor.split(' ')[0]}`}>{currentAccount?.name}</h1>
                        <p className="text-sm text-slate-600 whitespace-pre-line mt-1 leading-tight">{currentAccount?.address}</p>
                        <div className="text-sm text-slate-600 mt-2 space-y-0.5">
                            {currentAccount?.taxId && <p>เลขประจำตัวผู้เสียภาษี: <span className="font-medium">{currentAccount.taxId}</span></p>}
                            {currentAccount?.phone && <p>โทร: <span className="font-medium">{currentAccount.phone}</span></p>}
                            {currentAccount?.email && <p>อีเมล: <span className="font-medium">{currentAccount.email}</span></p>}
                        </div>
                    </div>
                </div>
                <div className="w-[35%] text-right">
                     <div className={`text-2xl font-bold mb-1 ${themeColor.split(' ')[0]}`}>
                        {customTitle || getDocTitle(type)}
                     </div>
                     {customSubtitle && (
                        <div className="inline-block border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-500 font-medium mb-3 uppercase tracking-wide">
                            {customSubtitle}
                        </div>
                     )}
                     <div className="space-y-1 text-sm mt-2">
                         <div className="flex justify-between">
                             <span className="text-slate-500">เลขที่:</span>
                             <span className="font-semibold">{formData.documentNo || 'DRAFT'}</span>
                         </div>
                         <div className="flex justify-between">
                             <span className="text-slate-500">วันที่:</span>
                             <span className="font-medium">{formData.issueDate ? new Date(formData.issueDate).toLocaleDateString('th-TH') : '-'}</span>
                         </div>
                         {formData.referenceNo && (
                             <div className="flex justify-between">
                                 <span className="text-slate-500">อ้างอิง:</span>
                                 <span className="font-medium">{formData.referenceNo}</span>
                             </div>
                         )}
                         {pageType !== 'receipt' && pageType !== 'tax' && (
                             <div className="flex justify-between">
                                <span className="text-slate-500">ครบกำหนด:</span>
                                <span className="font-medium">{formData.dueDate ? new Date(formData.dueDate).toLocaleDateString('th-TH') : '-'}</span>
                             </div>
                         )}
                     </div>
                </div>
            </div>

            <div className="border-t border-b border-slate-200 py-4 mb-6 flex">
                 <div className="w-full flex justify-between items-start">
                     <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase mb-1">ลูกค้า (Customer)</h3>
                        <p className="font-bold text-base text-slate-800">{formData.customerName}</p>
                        <p className="text-sm text-slate-600">{formData.customerAddress}</p>
                        {formData.customerTaxId && (
                            <p className="text-sm text-slate-600 mt-1">เลขประจำตัวผู้เสียภาษี: {formData.customerTaxId}</p>
                        )}
                     </div>
                     {formData.projectName && (
                        <div className="text-right max-w-[40%]">
                            <h3 className="text-xs font-bold text-slate-400 uppercase mb-1">ชื่องาน / โปรเจค</h3>
                            <p className="font-medium text-slate-800 text-sm">{formData.projectName}</p>
                        </div>
                     )}
                 </div>
            </div>

            <div className="flex-grow">
                <table className="w-full mb-6">
                    <thead className={`${tableHeader} text-xs font-bold border-b-2`}>
                        <tr>
                            <th className="py-2 px-2 text-center w-10">#</th>
                            <th className="py-2 px-2 text-left">รายละเอียด (Description)</th>
                            <th className="py-2 px-2 text-right w-20">จำนวน</th>
                            <th className="py-2 px-2 text-right w-28">ราคา/หน่วย</th>
                            <th className="py-2 px-2 text-right w-32">จำนวนเงิน</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {formData.items?.map((item, idx) => {
                            // Safe Number Conversion Logic
                            const qty = Number(item.quantity || (item as any).qty || 0);
                            const unitPrice = Number(item.price || (item as any).unitPrice || (item as any).pricePerUnit || 0);
                            const lineTotal = Number(item.amount || (item as any).total || (item as any).lineTotal || (qty * unitPrice) || 0);
                            
                            return (
                                <tr key={idx} className="border-b border-slate-100 align-top">
                                    <td className="py-2 px-2 text-center text-slate-500">{idx + 1}</td>
                                    <td className="py-2 px-2 text-slate-800">
                                        <div className="font-medium text-slate-900">{item.description || item.name || (item as any).title || '-'}</div>
                                        {item.details && <div className="text-xs text-slate-500 mt-0.5 whitespace-pre-line">{item.details}</div>}
                                    </td>
                                    <td className="py-2 px-2 text-right text-slate-900 font-normal">
                                        {qty.toLocaleString()}
                                    </td>
                                    <td className="py-2 px-2 text-right text-slate-900 font-normal">
                                        {unitPrice.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-2 px-2 text-right font-normal text-slate-900">
                                        {lineTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            );
                        })}
                        {(!formData.items || formData.items.length < 5) && Array.from({length: 5 - (formData.items?.length || 0)}).map((_, i) => (
                             <tr key={`empty-${i}`} className="border-b border-slate-50 h-8">
                                <td className="py-2 px-2"></td>
                                <td className="py-2 px-2"></td>
                                <td className="py-2 px-2"></td>
                                <td className="py-2 px-2"></td>
                                <td className="py-2 px-2"></td>
                             </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="break-inside-avoid">
                <div className="flex border-t border-slate-200 pt-4 mb-6">
                    <div className="w-[60%] pr-8 flex flex-col justify-between">
                        <div className={`p-3 rounded ${headerBg} mb-3 border border-slate-200`}>
                             <div className="flex flex-col">
                                 <span className="text-[10px] font-semibold opacity-70 mb-1">ตัวอักษร:</span>
                                 <span className="font-bold text-[10px] break-words leading-snug">
                                    ({toThaiBaht(grandTotal)})
                                 </span>
                             </div>
                        </div>
                        <div className="text-xs text-slate-600">
                            <p className="font-bold mb-1">หมายเหตุ:</p>
                            <p className="whitespace-pre-wrap break-words">{formData.notes}</p>
                        </div>
                    </div>
                    <div className="w-[40%] text-sm space-y-2">
                        <div className="flex justify-between text-slate-600">
                            <span>รวมเป็นเงิน</span>
                            <span className="font-normal">{subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                            <span>ภาษีมูลค่าเพิ่ม 7%</span>
                            <span className="font-normal">{vatAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                        <div className={`flex justify-between font-bold text-lg ${themeColor.split(' ')[0]} pt-2 border-t border-slate-300 mt-2`}>
                            <span>จำนวนเงินรวมทั้งสิ้น</span>
                            <span>{grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                        {whtRate > 0 && (
                            <>
                                <div className="flex justify-between text-slate-600 pt-2 mt-1 border-t border-dashed border-slate-200">
                                    <span>หักภาษี ณ ที่จ่าย {whtRate}%</span>
                                    <span className="font-normal">-{whtAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                </div>
                                <div className="flex justify-between font-bold text-lg text-slate-800 pt-1">
                                    <span>ยอดรับสุทธิ</span>
                                    <span>{netTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {pageType === 'receipt' ? (
                     <div className="border border-slate-300 rounded-lg p-4 text-xs">
                        <div className="mb-4 pb-4 border-b border-slate-200 flex gap-8">
                            <div className="font-bold w-24">การชำระเงิน:</div>
                            <div className="flex gap-6">
                                <label className="flex items-center gap-1"><div className="w-3 h-3 border border-slate-400 rounded-sm"></div> เงินสด</label>
                                <label className="flex items-center gap-1"><div className="w-3 h-3 border border-slate-400 rounded-sm"></div> โอนเงิน</label>
                                <label className="flex items-center gap-1"><div className="w-3 h-3 border border-slate-400 rounded-sm"></div> เช็ค</label>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-12 mt-8">
                            <div className="text-center">
                                <div className="border-b border-dotted border-slate-400 h-8 mx-auto w-3/4"></div>
                                <div className="mt-2">ผู้จ่ายเงิน</div>
                            </div>
                            <div className="text-center">
                                {currentAccount?.signatureUrl && (
                                    <img src={currentAccount.signatureUrl} className="h-10 mx-auto object-contain mb-[-10px]" alt="signature" crossOrigin="anonymous"/>
                                 )}
                                <div className="border-b border-dotted border-slate-400 h-8 mx-auto w-3/4 relative z-10"></div>
                                <div className="mt-2">ผู้รับเงิน</div>
                            </div>
                        </div>
                     </div>
                ) : (
                     <div className="grid grid-cols-2 gap-8 text-xs mt-8">
                         <div className="border border-slate-300 rounded-lg p-4 flex flex-col justify-between h-32 text-center">
                             <div className="text-left font-semibold">ในนามลูกค้า</div>
                             <div>
                                 <div className="border-b border-dotted border-slate-400 w-3/4 mx-auto mb-2"></div>
                                 <div>ผู้รับสินค้า / ผู้ว่าจ้าง</div>
                             </div>
                         </div>
                         <div className="border border-slate-300 rounded-lg p-4 flex flex-col justify-between h-32 text-center">
                             <div className="text-left font-semibold">ในนาม {currentAccount?.name}</div>
                             <div>
                                 {currentAccount?.signatureUrl && (
                                    <img src={currentAccount.signatureUrl} className="h-10 mx-auto object-contain mb-[-10px]" alt="signature" crossOrigin="anonymous"/>
                                 )}
                                 <div className="border-b border-dotted border-slate-400 w-3/4 mx-auto mb-2 relative z-10"></div>
                                 <div>ผู้อนุมัติ</div>
                             </div>
                         </div>
                     </div>
                )}
                <div className="mt-4 text-[10px] text-slate-400 flex justify-between items-center">
                    <span>{pageType === 'tax' ? 'เอกสารออกเป็นชุด' : ''}</span>
                </div>
            </div>
        </div>
      );
  };

  const DocumentSetWrapper = ({ paperRef }: { paperRef?: React.RefObject<HTMLDivElement | null> }) => {
      const isTaxReceipt = type === 'tax_receipt';
      const pages = isTaxReceipt ? [
          { title: 'ใบกำกับภาษี', subtitle: 'ต้นฉบับ (เอกสารออกเป็นชุด)', type: 'tax' as const, copy: 'original' as const },
          { title: 'ใบกำกับภาษี', subtitle: 'สำเนา (เอกสารออกเป็นชุด)', type: 'tax' as const, copy: 'copy' as const },
          { title: 'ใบเสร็จรับเงิน', subtitle: 'ต้นฉบับ (เอกสารออกเป็นชุด)', type: 'receipt' as const, copy: 'original' as const },
          { title: 'ใบเสร็จรับเงิน', subtitle: 'สำเนา (เอกสารออกเป็นชุด)', type: 'receipt' as const, copy: 'copy' as const }
      ] : [
          { 
            title: getDocTitle(type), 
            subtitle: type === 'quotation' ? undefined : 'ต้นฉบับ', 
            type: type === 'receipt' ? 'receipt' as const : 'invoice' as const,
            copy: 'original' as const 
          }
      ];
      return (
          <div ref={paperRef} className="bg-slate-100 p-4 md:p-8">
              {pages.map((page, idx) => (
                  <div key={idx} className={`${idx < pages.length - 1 ? 'print:break-after-page break-after-page mb-8 print:mb-0' : ''} shadow-2xl print:shadow-none mx-auto w-fit`}>
                      <InvoicePaperContent 
                        customTitle={page.title} 
                        customSubtitle={page.subtitle} 
                        pageType={page.type} 
                        copyType={page.copy}
                        pageNumber={idx + 1}
                        totalPages={pages.length}
                      />
                  </div>
              ))}
          </div>
      );
  };

  if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-primary-600" /></div>;

  return (
    <div className="pb-20">
        {/* Dialog */}
        {dialog.isOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                    <div className={`px-6 py-4 border-b flex items-center gap-3 ${dialog.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-700'}`}>
                        {dialog.type === 'error' ? <AlertCircle size={24} /> : <CheckCircle2 size={24} />}
                        <h3 className="font-bold text-lg">{dialog.title}</h3>
                    </div>
                    <div className="p-6"><p className="text-slate-600">{dialog.message}</p></div>
                    <div className="px-6 py-4 bg-slate-50 flex justify-end">
                        <button onClick={closeDialog} className="px-4 py-2 bg-slate-800 text-white rounded-lg">ตกลง</button>
                    </div>
                </div>
            </div>
        )}

        {/* Hidden Render for Direct PDF Download */}
        <div className="fixed left-[-9999px] top-0 pointer-events-none opacity-0 overflow-hidden h-0 w-0">
             <div ref={hiddenRef}>
                 <DocumentSetWrapper paperRef={null} />
             </div>
        </div>

        {/* Preview Modal */}
        {showPreviewModal && (
            <div className="fixed inset-0 z-[150] bg-slate-900/95 backdrop-blur-sm flex flex-col animate-in fade-in duration-200">
                {/* Header with Back Button */}
                <div className="flex items-center justify-between p-4 bg-slate-800 border-b border-slate-700 shrink-0">
                    <button 
                        onClick={() => setShowPreviewModal(false)} 
                        className="text-white hover:bg-slate-700 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-bold text-sm"
                    >
                        <ArrowLeft size={20} /> กลับไปแก้ไข
                    </button>
                    <h2 className="text-white font-bold flex items-center gap-2 hidden sm:flex"><Eye size={20} /> ตัวอย่างเอกสาร</h2>
                    <div className="flex items-center gap-2">
                        <button onClick={handlePrint} className="bg-white text-slate-800 p-2 rounded-lg hover:bg-slate-200" title="Print"><Printer size={20} /></button>
                        <button onClick={handleDownloadPDF} className="bg-primary-600 text-white p-2 rounded-lg hover:bg-primary-700" title="Download PDF"><Download size={20} /></button>
                        <button onClick={() => setShowPreviewModal(false)} className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-700 transition-colors sm:hidden">
                            <X size={24} />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <DocumentSetWrapper paperRef={previewRef} />
                </div>
            </div>
        )}

        {/* Main Edit Form */}
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            {/* TOOLBAR */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(`/${getRoutePath(type)}`)} className="text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors">
                        <ChevronLeft size={20} /> กลับ
                    </button>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        {id ? 'แก้ไข' : 'สร้าง'}{getDocTitle(type)}
                    </h1>
                </div>

                {/* Desktop Buttons */}
                <div className="hidden md:flex gap-2">
                    <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium flex items-center gap-2 shadow-sm">
                        {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} บันทึก
                    </button>
                    <button onClick={handlePreview} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium flex items-center gap-2 shadow-sm">
                        <Eye size={18} /> ดูตัวอย่าง
                    </button>
                    <button onClick={handleDownloadPDF} disabled={isGeneratingPdf} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium flex items-center gap-2 shadow-sm">
                        {isGeneratingPdf ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />} PDF
                    </button>
                    <button onClick={handlePrint} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium flex items-center gap-2 shadow-sm">
                        <Printer size={18} /> พิมพ์
                    </button>
                    
                    {/* Convert Actions - Auto-Save Enabled */}
                    {type === 'quotation' && (
                        <button 
                            onClick={() => handleConvert('invoice')} 
                            disabled={converting}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium flex items-center gap-2 shadow-sm ml-2"
                        >
                            {converting ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />} สร้างใบแจ้งหนี้
                        </button>
                    )}
                    {type === 'invoice' && (
                        <button 
                            onClick={() => handleConvert(currentAccount?.type === 'company' ? 'tax_receipt' : 'receipt')} 
                            disabled={converting}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium flex items-center gap-2 shadow-sm ml-2"
                        >
                            {converting ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />} สร้างใบเสร็จ
                        </button>
                    )}
                </div>

                {/* Mobile Dropdown */}
                <div className="md:hidden relative z-10">
                    <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium flex items-center gap-2 shadow-sm">
                        จัดการ <Eye size={18} />
                    </button>
                    {mobileMenuOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden animate-in zoom-in-95">
                            <button onClick={() => { handleSave(); setMobileMenuOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm font-medium flex items-center gap-2"><Save size={16} /> บันทึก</button>
                            <button onClick={() => { handlePreview(); setMobileMenuOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm font-medium flex items-center gap-2"><Eye size={16} /> ดูตัวอย่าง</button>
                            <button onClick={() => { handleDownloadPDF(); setMobileMenuOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm font-medium flex items-center gap-2"><Download size={16} /> PDF</button>
                            <button onClick={() => { handlePrint(); setMobileMenuOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm font-medium flex items-center gap-2"><Printer size={16} /> พิมพ์</button>
                            {type === 'quotation' && (
                                <button onClick={() => { handleConvert('invoice'); setMobileMenuOpen(false); }} className="w-full text-left px-4 py-3 bg-indigo-50 text-indigo-700 text-sm font-medium flex items-center gap-2"><RefreshCw size={16} /> สร้างใบแจ้งหนี้</button>
                            )}
                             {type === 'invoice' && (
                                <button onClick={() => { handleConvert(currentAccount?.type === 'company' ? 'tax_receipt' : 'receipt'); setMobileMenuOpen(false); }} className="w-full text-left px-4 py-3 bg-green-50 text-green-700 text-sm font-medium flex items-center gap-2"><Plus size={16} /> สร้างใบเสร็จ</button>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            {/* Form Content */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                 {/* Header Form */}
                 <div className="p-6 border-b border-slate-100 bg-slate-50/50 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">เลือกลูกค้า <span className="text-red-500">*</span></label>
                        <select className="w-full p-2.5 border border-slate-200 rounded-lg shadow-sm bg-white text-slate-900 font-medium focus:ring-2 focus:ring-primary-500 outline-none" value={formData.customerId || ''} onChange={(e) => handleCustomerChange(e.target.value)}>
                            <option value="">-- เลือกลูกค้า --</option>
                            {customers.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                        </select>
                        {formData.customerAddress && (
                            <div className="mt-3 p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 shadow-sm">
                                <p className="font-semibold text-slate-900">{formData.customerName}</p>
                                <p className="mt-1">{formData.customerAddress}</p>
                                <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-400 flex gap-2"><span className="font-medium">TAX ID:</span> {formData.customerTaxId || '-'}</div>
                            </div>
                        )}
                        <button onClick={() => navigate('/customers')} className="text-xs text-primary-600 hover:underline mt-2 flex items-center gap-1 font-medium"><Plus size={12} /> เพิ่มลูกค้าใหม่</button>
                        
                        {/* Project Name Field */}
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">ชื่อโปรเจค / ชื่องาน</label>
                            <input type="text" className="w-full px-4 py-2.5 border border-slate-200 rounded-lg shadow-sm bg-white text-slate-900 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="เช่น ถ่ายภาพงานแต่งงาน, ออกแบบโลโก้" value={formData.projectName || ''} onChange={e => setFormData({...formData, projectName: e.target.value})} />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">วันที่ออกเอกสาร</label><input type="date" className="w-full p-2.5 border border-slate-200 rounded-lg shadow-sm bg-white text-slate-900 focus:ring-2 focus:ring-primary-500 outline-none" value={formData.issueDate ? new Date(formData.issueDate).toISOString().split('T')[0] : ''} onChange={(e) => setFormData({...formData, issueDate: new Date(e.target.value)})} /></div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">วันครบกำหนด</label><input type="date" className="w-full p-2.5 border border-slate-200 rounded-lg shadow-sm bg-white text-slate-900 focus:ring-2 focus:ring-primary-500 outline-none" value={formData.dueDate ? new Date(formData.dueDate).toISOString().split('T')[0] : ''} onChange={(e) => setFormData({...formData, dueDate: new Date(e.target.value)})} /></div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">สถานะ</label>
                            <select className="w-full p-2.5 border border-slate-200 rounded-lg shadow-sm bg-white text-slate-900 focus:ring-2 focus:ring-primary-500 outline-none" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value as any})}>
                                <option value="draft">แบบร่าง (Draft)</option>
                                <option value="sent">ส่งแล้ว (Sent)</option>
                                <option value="accepted">อนุมัติ (Accepted)</option>
                                <option value="paid">ชำระแล้ว (Paid)</option>
                                <option value="overdue">เกินกำหนด (Overdue)</option>
                                <option value="rejected">ยกเลิก (Rejected)</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                {/* Items Section */}
                <div className="p-6">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">รายการสินค้า / บริการ <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{formData.items?.length || 0} รายการ</span></h3>
                    <div className="space-y-3">
                        {formData.items?.map((item, idx) => (
                            <div key={idx} className="flex flex-col md:flex-row gap-3 items-start bg-slate-50 p-3 rounded-lg group hover:bg-slate-100 transition-colors border border-slate-100">
                                <div className="flex-grow w-full space-y-2">
                                    <input type="text" placeholder="ชื่อสินค้า / บริการ..." className="w-full p-2 border border-slate-200 rounded-md shadow-sm focus:ring-2 focus:ring-primary-500 outline-none text-sm transition-all bg-white font-medium text-slate-900" value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} />
                                    <textarea placeholder="รายละเอียด" rows={1} className="w-full p-2 border border-slate-200 rounded-md shadow-sm focus:ring-2 focus:ring-primary-500 outline-none text-xs transition-all bg-white text-slate-600 resize-none" value={item.details || ''} onChange={(e) => updateItem(idx, 'details', e.target.value)} />
                                </div>
                                <div className="flex gap-3 w-full md:w-auto">
                                    <div className="w-20"><input type="number" placeholder="จำนวน" className="w-full p-2 border border-slate-200 rounded-md shadow-sm text-right text-sm bg-white text-slate-900 focus:ring-2 focus:ring-primary-500 outline-none" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} /></div>
                                    <div className="w-28"><input type="number" placeholder="ราคา" className="w-full p-2 border border-slate-200 rounded-md shadow-sm text-right text-sm bg-white text-slate-900 focus:ring-2 focus:ring-primary-500 outline-none" value={item.price} onChange={(e) => updateItem(idx, 'price', e.target.value)} /></div>
                                    <div className="w-28 p-2 bg-white border border-slate-200 rounded-md shadow-sm text-right text-sm font-semibold text-slate-700">{item.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                                    <button onClick={() => removeItem(idx)} className="p-2 text-slate-400 hover:text-red-500 rounded"><Trash2 size={18} /></button>
                                </div>
                            </div>
                        ))}
                        <button onClick={addItem} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-lg text-slate-500 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50 transition-all flex justify-center items-center gap-2 font-medium"><Plus size={20} /> เพิ่มรายการ</button>
                    </div>
                </div>

                {/* Summary Section */}
                <div className="p-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50/30">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">หมายเหตุ / เงื่อนไขการชำระเงิน</label>
                        <textarea rows={4} className="w-full p-2.5 border border-slate-200 rounded-lg shadow-sm bg-white transition-all text-sm text-slate-900 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="หมายเหตุ..." value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                         <div className="flex justify-between text-slate-600"><span>รวมเป็นเงิน</span><span className="font-medium">{subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                         <div className="flex items-center justify-between text-slate-600">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={formData.vatRate === 7} 
                                    onChange={(e) => setFormData({...formData, vatRate: e.target.checked ? 7 : 0})} 
                                    className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer" 
                                />
                                <span className="text-slate-700 font-semibold">ภาษีมูลค่าเพิ่ม 7%</span>
                            </label>
                            <span className="font-medium">{vatAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg text-primary-700 pt-3 border-t border-slate-100 mt-2"><span>จำนวนเงินรวมทั้งสิ้น</span><span>{grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                        
                        <div className="pt-3 border-t border-dashed border-slate-200 mt-2 space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer font-semibold">
                                    <input 
                                        type="checkbox" 
                                        checked={enableWht} 
                                        onChange={(e) => setEnableWht(e.target.checked)} 
                                        className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer" 
                                    /> 
                                    หักภาษี ณ ที่จ่าย
                                </label>
                                {enableWht && (
                                    <select className="p-1 border border-slate-200 rounded shadow-sm text-sm bg-white text-slate-900 cursor-pointer outline-none" value={formData.withholdingTaxRate || 0} onChange={(e) => setFormData({...formData, withholdingTaxRate: parseFloat(e.target.value) || 0})}>
                                        <option value="0">เลือกอัตรา</option><option value="1">1%</option><option value="2">2%</option><option value="3">3%</option><option value="5">5%</option>
                                    </select>
                                )}
                            </div>
                            {enableWht && (
                                <>
                                    <div className="flex justify-between text-red-600 text-sm"><span>หัก ณ ที่จ่าย ({formData.withholdingTaxRate}%)</span><span>-{whtAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                                    <div className="flex justify-between font-bold text-base text-slate-800 pt-2 border-t border-slate-100"><span>ยอดรับสุทธิ</span><span>{netTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                                </>
                            )}
                        </div>
                        <div className="text-right text-xs text-slate-500 pt-2">({toThaiBaht(grandTotal)})</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default DocumentFormPage;
