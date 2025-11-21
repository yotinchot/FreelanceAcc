
import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { Customer, Quotation, QuotationItem, SellerProfile } from '../types';
import { getCustomers } from '../services/customerService';
import { createQuotation, getQuotationById, updateQuotation } from '../services/quotationService';
import { getSellerProfile } from '../services/settingService';
import { Save, Download, ChevronLeft, Plus, Trash2, AlertTriangle, Loader2, X, Printer } from 'lucide-react';
import { toThaiBaht } from '../utils/currency';

// Declare html2pdf from CDN
declare const html2pdf: any;

const QuotationFormPage: React.FC = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // Ref for PDF generation
  const quotationRef = useRef<HTMLDivElement>(null);
  
  // Data States
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  
  // Form States
  const [formData, setFormData] = useState<Partial<Quotation>>({
    status: 'draft',
    items: [],
    vatRate: 7,
    notes: '',
  });

  // Helper for formatting numbers safely
  const formatNumber = (num: number | string | undefined) => {
    if (num === undefined || num === null || num === '') return '0.00';
    const value = parseFloat(String(num));
    return isNaN(value) ? '0.00' : value.toLocaleString('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Init Dates
  useEffect(() => {
    if (!id) {
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 30); // Valid for 30 days default
        setFormData(prev => ({
            ...prev,
            issueDate: today,
            dueDate: nextWeek
        }));
    }
  }, [id]);

  // Load Data
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      setLoading(true);
      window.scrollTo(0, 0); // Ensure page starts at top
      try {
        // 1. Load Customers
        const customersData = await getCustomers(user.uid);
        setCustomers(customersData);

        // 2. Load Seller Profile
        const profile = await getSellerProfile(user.uid);
        setSellerProfile(profile);

        // 3. Load Quotation if Edit mode
        if (id) {
          const quote = await getQuotationById(id);
          if (quote) {
             setFormData(quote);
          } else {
             navigate('/quotations');
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user, id, navigate]);

  // Calculations
  const subtotal = formData.items?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
  const vatAmount = (subtotal * (formData.vatRate || 0)) / 100;
  const grandTotal = subtotal + vatAmount;

  // Handlers
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
    
    // Recalc Amount
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

  const handleSave = async () => {
    if (!user) return;
    if (!formData.customerId) {
        alert('กรุณาเลือกลูกค้า');
        return;
    }
    if (!formData.items || formData.items.length === 0) {
        alert('กรุณาเพิ่มรายการอย่างน้อย 1 รายการ');
        return;
    }

    setSaving(true);
    try {
        const finalData = {
            ...formData,
            userId: user.uid,
            subtotal,
            vatAmount,
            grandTotal
        } as any;

        if (id) {
            await updateQuotation(id, finalData);
        } else {
            const newId = await createQuotation(finalData);
            navigate(`/quotations/edit/${newId}`, { replace: true });
        }
        setPreviewMode(true);
        window.scrollTo(0, 0);
    } catch (error) {
        console.error(error);
        alert('บันทึกไม่สำเร็จ');
    } finally {
        setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSavePDF = () => {
    const element = quotationRef.current;
    if (!element) return;
    
    setIsGeneratingPdf(true);

    // Option setup:
    const opt = {
        margin: 0,
        filename: `Quotation-${formData.documentNo || 'draft'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, scrollY: 0 }, 
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    if (typeof html2pdf !== 'undefined') {
        html2pdf().set(opt).from(element).save().then(() => {
            setIsGeneratingPdf(false);
        }).catch((err: any) => {
            console.error("PDF Error:", err);
            alert("เกิดข้อผิดพลาดในการสร้าง PDF");
            setIsGeneratingPdf(false);
        });
    } else {
        alert("ไม่สามารถโหลดไลบรารี PDF ได้ กรุณารีเฟรชหน้าจอ");
        setIsGeneratingPdf(false);
    }
  };

  // Component to render the Paper Content
  const InvoicePaper = ({ paperRef }: { paperRef?: React.RefObject<HTMLDivElement | null> }) => (
    <div ref={paperRef} className="bg-white w-[210mm] min-h-[296mm] relative text-slate-900 p-[15mm] text-left mx-auto overflow-hidden flex flex-col select-text">
        {/* Header */}
        <div className="flex justify-between mb-8">
            <div className="w-[60%] flex gap-4">
                {sellerProfile?.logoUrl && (
                    <img 
                        src={sellerProfile.logoUrl} 
                        alt="Logo" 
                        className="w-20 h-20 object-contain shrink-0" 
                        crossOrigin="anonymous" // Important for html2canvas
                    />
                )}
                <div>
                    <h1 className="text-xl font-bold text-primary-700">{sellerProfile?.companyName || user?.displayName}</h1>
                    <p className="text-sm text-slate-600 whitespace-pre-line mt-1">{sellerProfile?.address}</p>
                    <div className="text-sm text-slate-600 mt-1">
                        {sellerProfile?.taxId && <span>เลขประจำตัวผู้เสียภาษี: {sellerProfile.taxId}</span>}
                        {sellerProfile?.phone && <span className="ml-3">โทร: {sellerProfile.phone}</span>}
                    </div>
                </div>
            </div>
            <div className="text-right">
                <div className="text-2xl font-bold text-slate-800 mb-2">ใบเสนอราคา</div>
                <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded border border-slate-100 inline-block text-right">
                    <p><span className="font-semibold">เลขที่:</span> {formData.documentNo || 'DRAFT'}</p>
                    <p className="mt-1"><span className="font-semibold">วันที่:</span> {formData.issueDate ? new Date(formData.issueDate).toLocaleDateString('th-TH') : '-'}</p>
                    <p className="mt-1"><span className="font-semibold">ยืนราคาถึง:</span> {formData.dueDate ? new Date(formData.dueDate).toLocaleDateString('th-TH') : '-'}</p>
                </div>
            </div>
        </div>

        <hr className="border-slate-200 mb-8" />

        {/* Customer Info */}
        <div className="mb-8 flex">
            <div className="w-1/2 pr-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">ลูกค้า (Customer)</h3>
            <div className="text-sm">
                <p className="font-bold text-lg">{formData.customerName}</p>
                <p className="text-slate-600 whitespace-pre-line">{formData.customerAddress}</p>
                {formData.customerTaxId && <p className="text-slate-600 mt-1">เลขภาษี: {formData.customerTaxId}</p>}
            </div>
            </div>
        </div>

        {/* Items Table */}
        <div className="flex-grow">
            <table className="w-full mb-8">
                <thead className="bg-primary-50 text-primary-800 text-sm font-semibold border-b-2 border-primary-100">
                    <tr>
                        <th className="py-2 px-3 text-center w-12">#</th>
                        <th className="py-2 px-3 text-left">รายละเอียด</th>
                        <th className="py-2 px-3 text-right w-24">จำนวน</th>
                        <th className="py-2 px-3 text-right w-32">ราคา/หน่วย</th>
                        <th className="py-2 px-3 text-right w-32">รวมเงิน</th>
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
                                <td className="py-3 px-3 text-center text-slate-500">{idx + 1}</td>
                                <td className="py-3 px-3 text-slate-800">
                                    <div className="font-medium text-slate-900">{item.description}</div>
                                    {item.details && <div className="text-xs text-slate-500 mt-0.5 whitespace-pre-line">{item.details}</div>}
                                </td>
                                <td className="py-3 px-3 text-right text-slate-900 font-normal">
                                    {qty.toLocaleString()}
                                </td>
                                <td className="py-3 px-3 text-right text-slate-900 font-normal">
                                    {unitPrice.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="py-3 px-3 text-right font-normal text-slate-900">
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

        {/* Totals */}
        <div className="flex border-t border-slate-200 pt-4 mb-6 break-inside-avoid">
            <div className="w-[60%] pr-8 flex flex-col justify-between">
                 <div className={`p-3 rounded bg-primary-50 mb-3 border border-slate-200`}>
                    <div className="text-[10px] font-semibold opacity-70 mb-1">ตัวอักษร:</div>
                    <div className="font-bold text-xs break-words leading-snug">
                        ({toThaiBaht(grandTotal)})
                    </div>
                </div>
            </div>
            <div className="w-[40%] space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                    <span>รวมเป็นเงิน</span>
                    <span className="font-normal">{subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                    <span>ภาษีมูลค่าเพิ่ม 7%</span>
                    <span className="font-normal">{vatAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                <div className="flex justify-between font-bold text-lg text-primary-800 pt-2 border-t border-primary-200 mt-2">
                    <span>จำนวนเงินรวมทั้งสิ้น</span>
                    <span>{grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
            </div>
        </div>

        {/* Footer / Notes */}
        <div className="grid grid-cols-2 gap-12 text-sm break-inside-avoid">
            <div>
                <h4 className="font-bold text-slate-800 mb-2">หมายเหตุ / เงื่อนไข</h4>
                <div className="p-3 bg-slate-50 rounded border border-slate-100 text-slate-600 whitespace-pre-wrap h-full text-xs break-words">
                    {formData.notes}
                </div>
                {sellerProfile?.paymentInfo && (
                    <div className="mt-4">
                        <h4 className="font-bold text-slate-800 mb-1">ข้อมูลการชำระเงิน</h4>
                        <p className="text-xs text-slate-600 whitespace-pre-wrap">{sellerProfile.paymentInfo}</p>
                    </div>
                )}
            </div>
            <div className="flex flex-col justify-end text-center gap-16">
                <div className="border-b border-slate-300 w-3/4 mx-auto"></div>
                <p className="text-slate-600">ผู้เสนอราคา</p>
            </div>
        </div>
    </div>
  );

  if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-primary-600" /></div>;

  return (
    <>
        {/* ------------------- SCREEN PREVIEW AREA ------------------- */}
        {previewMode && (
            <div className="fixed inset-0 z-[100] bg-slate-800/95 backdrop-blur-sm flex flex-col print:static print:bg-white print:h-auto print:overflow-visible">
                {/* Toolbar */}
                <div className="flex items-center justify-between p-4 bg-slate-900 border-b border-slate-700 shadow-lg shrink-0 print:hidden">
                    <div className="text-slate-300 text-sm font-medium">
                        Preview Mode
                    </div>
                    <div className="flex gap-3">
                        <button 
                            type="button"
                            onClick={() => setPreviewMode(false)} 
                            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2 transition-colors text-sm"
                        >
                            <ChevronLeft size={16} /> กลับไปแก้ไข
                        </button>

                        <button 
                            type="button"
                            onClick={handlePrint}
                            className="px-4 py-2 bg-white text-slate-700 rounded-lg hover:bg-slate-50 flex items-center gap-2 transition-colors text-sm font-medium"
                        >
                            <Printer size={18} />
                            พิมพ์เอกสาร
                        </button>

                        <button 
                            type="button"
                            onClick={handleSavePDF}
                            disabled={isGeneratingPdf}
                            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 flex items-center gap-2 transition-colors shadow-lg text-sm font-medium disabled:opacity-70"
                        >
                            {isGeneratingPdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                            บันทึก PDF
                        </button>
                    </div>
                </div>
                
                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center print:p-0 print:m-0 print:overflow-visible print:block">
                    {/* Wrapper for Shadow */}
                    <div className="shadow-2xl print:shadow-none">
                        <InvoicePaper paperRef={quotationRef} />
                    </div>
                </div>
            </div>
        )}

        {/* ------------------- EDIT FORM AREA ------------------- */}
        <div className={`container mx-auto px-4 py-8 max-w-5xl ${previewMode ? 'hidden' : ''} print:hidden`}>
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6">
                <button onClick={() => navigate('/quotations')} className="text-slate-500 hover:text-slate-700 flex items-center gap-1">
                    <ChevronLeft size={20} /> กลับ
                </button>
                <div className="flex gap-3">
                    <button 
                        type="button"
                        onClick={() => setPreviewMode(true)} 
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium flex items-center gap-2"
                    >
                        <Download size={18} /> ตัวอย่าง / พิมพ์
                    </button>
                    <button 
                        type="button"
                        onClick={handleSave} 
                        disabled={saving}
                        className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium flex items-center gap-2 shadow-md disabled:opacity-70"
                    >
                        {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        บันทึก
                    </button>
                </div>
            </div>

            {!sellerProfile?.companyName && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-xl mb-6 flex items-start gap-3">
                    <AlertTriangle className="shrink-0 mt-0.5" size={20} />
                    <div>
                        <p className="font-bold">ยังไม่ได้ตั้งค่าข้อมูลผู้ขาย</p>
                        <p className="text-sm mt-1">กรุณาไปที่หน้าตั้งค่าเพื่อใส่ข้อมูลบริษัท/ร้านค้าของคุณ ข้อมูลนี้จะแสดงบนหัวกระดาษ</p>
                    </div>
                    <button onClick={() => navigate('/settings')} className="text-sm underline whitespace-nowrap ml-auto">ไปตั้งค่า</button>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Header Form */}
                <div className="p-6 border-b border-slate-100 bg-slate-50 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">เลือกลูกค้า <span className="text-red-500">*</span></label>
                        <select 
                            className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white text-slate-900"
                            value={formData.customerId || ''}
                            onChange={(e) => handleCustomerChange(e.target.value)}
                        >
                            <option value="">-- เลือกลูกค้า --</option>
                            {customers.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        {formData.customerAddress && (
                            <div className="mt-3 p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-600">
                                <p className="font-medium text-slate-900">{formData.customerName}</p>
                                <p>{formData.customerAddress}</p>
                                <p className="text-xs mt-1 text-slate-400">TAX ID: {formData.customerTaxId || '-'}</p>
                            </div>
                        )}
                        <button onClick={() => navigate('/customers')} className="text-xs text-primary-600 hover:underline mt-2 flex items-center gap-1">
                            <Plus size={12} /> เพิ่มลูกค้าใหม่
                        </button>
                    </div>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">วันที่ออกเอกสาร</label>
                                <input 
                                    type="date" 
                                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white text-slate-900"
                                    value={formData.issueDate ? new Date(formData.issueDate).toISOString().split('T')[0] : ''}
                                    onChange={(e) => setFormData({...formData, issueDate: new Date(e.target.value)})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">วันครบกำหนด</label>
                                <input 
                                    type="date" 
                                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white text-slate-900"
                                    value={formData.dueDate ? new Date(formData.dueDate).toISOString().split('T')[0] : ''}
                                    onChange={(e) => setFormData({...formData, dueDate: new Date(e.target.value)})}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">สถานะ</label>
                            <select 
                                className="w-full p-2.5 border border-slate-200 rounded-lg outline-none bg-white text-slate-900"
                                value={formData.status}
                                onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                            >
                                <option value="draft">แบบร่าง (Draft)</option>
                                <option value="sent">ส่งแล้ว (Sent)</option>
                                <option value="accepted">อนุมัติ (Accepted)</option>
                                <option value="rejected">ปฏิเสธ (Rejected)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Items */}
                <div className="p-6">
                    <h3 className="font-bold text-slate-800 mb-4">รายการสินค้า / บริการ</h3>
                    <div className="space-y-3">
                        {formData.items?.map((item, idx) => (
                            <div key={idx} className="flex flex-col md:flex-row gap-3 items-start bg-slate-50 p-3 rounded-lg group">
                                <div className="flex-grow w-full space-y-2">
                                    <input 
                                        type="text" 
                                        placeholder="ชื่อสินค้า / บริการ..."
                                        className="w-full p-2 border border-slate-200 rounded focus:ring-2 focus:ring-primary-500 outline-none text-sm font-medium bg-white text-slate-900"
                                        value={item.description}
                                        onChange={(e) => updateItem(idx, 'description', e.target.value)}
                                    />
                                    <textarea 
                                        placeholder="รายละเอียด (กด Shift+Enter เพื่อขึ้นบรรทัดใหม่)"
                                        rows={2}
                                        className="w-full p-2 border border-slate-200 rounded focus:ring-2 focus:ring-primary-500 outline-none text-xs text-slate-600 resize-none bg-white"
                                        value={item.details || ''}
                                        onChange={(e) => updateItem(idx, 'details', e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-3 w-full md:w-auto">
                                    <div className="w-20">
                                        <input 
                                            type="number" 
                                            placeholder="จำนวน"
                                            className="w-full p-2 border border-slate-200 rounded text-right text-sm bg-white text-slate-900"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                                        />
                                    </div>
                                    <div className="w-28">
                                        <input 
                                            type="number" 
                                            placeholder="ราคา/หน่วย"
                                            className="w-full p-2 border border-slate-200 rounded text-right text-sm bg-white text-slate-900"
                                            value={item.price}
                                            onChange={(e) => updateItem(idx, 'price', e.target.value)}
                                        />
                                    </div>
                                    <div className="w-28 p-2 bg-white border border-slate-200 rounded text-right text-sm font-medium text-slate-700">
                                        {item.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                    </div>
                                    <button 
                                        onClick={() => removeItem(idx)}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        
                        <button 
                            onClick={addItem}
                            className="w-full py-3 border-2 border-dashed border-slate-200 rounded-lg text-slate-500 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50 transition-all flex justify-center items-center gap-2 font-medium"
                        >
                            <Plus size={20} /> เพิ่มรายการ
                        </button>
                    </div>
                </div>

                {/* Summary */}
                <div className="p-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุ / เงื่อนไขการชำระเงิน</label>
                        <textarea 
                            rows={4}
                            className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-white text-slate-900"
                            placeholder="ระบุเงื่อนไขการชำระเงิน..."
                            value={formData.notes}
                            onChange={(e) => setFormData({...formData, notes: e.target.value})}
                        />
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                        <div className="flex justify-between text-slate-600">
                            <span>รวมเป็นเงิน</span>
                            <span className="font-medium">{subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                        
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
                        <div className="flex justify-between font-bold text-lg text-primary-700 pt-3 border-t border-slate-200">
                            <span>ยอดรวมสุทธิ</span>
                            <span>{grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                        <div className="text-right text-xs text-slate-500">
                            ({toThaiBaht(grandTotal)})
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </>
  );
};

export default QuotationFormPage;
