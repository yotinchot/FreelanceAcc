
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAccount } from '../context/AccountContext';
import { Transaction, TransactionType, EXPENSE_CATEGORIES } from '../types';
import { getTransactions, addTransaction, updateTransaction, deleteTransaction, exportTransactionsToCSV } from '../services/transactionService';
import { Search, Download, Edit2, Trash2, TrendingDown, Wallet, X, Loader2, ArrowDownLeft, Image, PlusCircle, AlertCircle } from 'lucide-react';

const TransactionsPage: React.FC = () => {
  const { user } = useAuth();
  const { currentAccount } = useAccount();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState<string>(new Date().toISOString().substring(0, 7)); // YYYY-MM

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [showImageModal, setShowImageModal] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    type: TransactionType;
    date: string;
    amount: string;
    category: string;
    description: string;
    referenceNo: string;
    attachmentUrl: string;
  }>({
    type: 'expense',
    date: new Date().toISOString().split('T')[0],
    amount: '',
    category: EXPENSE_CATEGORIES[0],
    description: '',
    referenceNo: '',
    attachmentUrl: ''
  });

  const fetchTransactions = async () => {
    if (!user || !currentAccount) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getTransactions(user.uid, currentAccount.id);
      // Only show expenses for this specific view
      setTransactions(data.filter(t => t.type === 'expense'));
    } catch (err: any) {
      console.error(err);
      let msg = "เกิดข้อผิดพลาด";
      if (err instanceof Error) {
        msg = err.message;
      } else if (typeof err === 'object' && err !== null) {
        msg = err.message || err.error_description || JSON.stringify(err);
      } else {
        msg = String(err);
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [user, currentAccount]);

  // Computed
  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.category.includes(searchQuery) ||
                          (t.referenceNo && t.referenceNo.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesMonth = new Date(t.date).toISOString().startsWith(monthFilter);
    
    return matchesSearch && matchesMonth;
  });

  const totalExpense = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Handlers
  const handleOpenModal = (tx?: Transaction) => {
    if (tx) {
      setEditingTx(tx);
      setFormData({
        type: 'expense',
        date: new Date(tx.date).toISOString().split('T')[0],
        amount: tx.amount.toString(),
        category: tx.category,
        description: tx.description,
        referenceNo: tx.referenceNo || '',
        attachmentUrl: tx.attachmentUrl || ''
      });
    } else {
      setEditingTx(null);
      setFormData({
        type: 'expense',
        date: new Date().toISOString().split('T')[0],
        amount: '',
        category: EXPENSE_CATEGORIES[0],
        description: '',
        referenceNo: '',
        attachmentUrl: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTx(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) { // 500KB limit
          alert("ขออภัย ไฟล์รูปภาพต้องมีขนาดไม่เกิน 500KB");
          return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, attachmentUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveTransaction = async () => {
    if (!user || !currentAccount) return;
    
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
        alert("กรุณาระบุจำนวนเงินให้ถูกต้อง");
        return;
    }
    if (!formData.description.trim()) {
        alert("กรุณาระบุรายละเอียด");
        return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        ...formData,
        date: new Date(formData.date),
        amount: amount,
        user_id: user.uid,
        account_id: currentAccount.id
      };

      if (editingTx && editingTx.id) {
        await updateTransaction(editingTx.id, payload);
      } else {
        await addTransaction(payload);
      }
      
      await fetchTransactions();
      handleCloseModal();
    } catch (error: any) {
      console.error(error);
      const msg = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
      alert("บันทึกไม่สำเร็จ: " + msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('ยืนยันการลบรายการนี้?')) {
      try {
        await deleteTransaction(id);
        setTransactions(prev => prev.filter(t => t.id !== id));
      } catch (e) {
        alert("ลบไม่สำเร็จ");
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 tracking-tight">
            <span className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm"><Wallet className="text-primary-600" /></span>
            บันทึกรายจ่าย
          </h1>
          <p className="text-slate-500 text-sm mt-1 ml-12">บันทึกค่าใช้จ่ายต่างๆ เพื่อนำไปคำนวณกำไรสุทธิใน Dashboard</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <button 
                onClick={() => exportTransactionsToCSV(filteredTransactions)}
                className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md flex-1 md:flex-none"
            >
                <Download size={18} /> <span className="hidden sm:inline">Export</span>
            </button>
            <button 
                onClick={() => handleOpenModal()}
                className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 flex-1 md:flex-none"
            >
                <PlusCircle size={18} /> <span className="hidden sm:inline">จดรายจ่ายใหม่</span>
            </button>
        </div>
      </div>

      {/* Summary Card - Only Expense */}
      <div className="grid grid-cols-1 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between max-w-md hover:shadow-md transition-shadow">
              <div>
                  <p className="text-sm text-slate-500 font-semibold mb-1 uppercase tracking-wider">รายจ่ายรวม (เดือนนี้)</p>
                  <h3 className="text-3xl font-bold text-red-600">฿{totalExpense.toLocaleString()}</h3>
              </div>
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center border border-red-100">
                  <TrendingDown className="text-red-600 w-8 h-8" />
              </div>
          </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 sticky top-20 z-10">
        <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                    type="text"
                    placeholder="ค้นหารายการ, หมวดหมู่..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all placeholder:text-slate-400 text-slate-800"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <div className="flex gap-2 shrink-0">
                <select 
                    className="px-4 py-2.5 border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white w-full md:w-auto text-slate-700 cursor-pointer"
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                >
                    {Array.from({ length: 12 }).map((_, i) => {
                        const d = new Date();
                        d.setMonth(d.getMonth() - i);
                        const val = d.toISOString().substring(0, 7);
                        const label = d.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
                        return <option key={val} value={val}>{label}</option>;
                    })}
                </select>
            </div>
        </div>
      </div>

      {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
              <AlertCircle className="shrink-0" />
              <div>
                  <p className="font-bold">เกิดข้อผิดพลาด</p>
                  <p className="text-sm break-words font-mono bg-white/50 p-1 rounded">{error}</p>
              </div>
          </div>
      )}

      {/* Transactions List */}
      {loading ? (
         <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary-600 w-10 h-10" /></div>
      ) : filteredTransactions.length === 0 ? (
         <div className="text-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <Wallet className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">ไม่พบข้อมูลรายจ่าย</h3>
            <p className="text-slate-500 mb-6">ไม่มีรายจ่ายในเดือนนี้ หรือไม่ตรงกับคำค้นหา</p>
         </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-600 text-sm font-semibold uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4 rounded-tl-xl w-32">วันที่</th>
                            <th className="px-6 py-4 w-16 text-center">หลักฐาน</th>
                            <th className="px-6 py-4">รายการ / หมวดหมู่</th>
                            <th className="px-6 py-4 text-right">จำนวนเงิน</th>
                            <th className="px-6 py-4 rounded-tr-xl text-right w-28">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredTransactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-4 text-slate-600 text-sm align-top font-medium">
                                    {new Date(tx.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                                </td>
                                <td className="px-6 py-4 text-center align-top">
                                    {tx.attachmentUrl ? (
                                        <button onClick={() => setShowImageModal(tx.attachmentUrl!)} className="text-slate-400 hover:text-primary-600 transition-colors p-1 hover:bg-slate-100 rounded">
                                            <Image size={18} />
                                        </button>
                                    ) : (
                                        <span className="text-slate-300 text-xs">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 align-top">
                                    <div className="font-bold text-slate-800">{tx.description}</div>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100 font-medium">
                                            {tx.category}
                                        </span>
                                        {tx.referenceNo && (
                                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">Ref: {tx.referenceNo}</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right font-bold text-lg align-top text-red-600">
                                    -{tx.amount.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-right align-top">
                                    <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleOpenModal(tx)} className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                                            <Edit2 size={18} />
                                        </button>
                                        <button onClick={() => tx.id && handleDelete(tx.id)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b flex justify-between items-center shrink-0 bg-white">
              <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800">
                <div className="p-2 bg-red-50 rounded-full text-red-600"><ArrowDownLeft size={20} /></div>
                {editingTx ? 'แก้ไขรายการรายจ่าย' : 'บันทึกรายจ่ายใหม่'}
              </h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100">
                <X size={24} />
              </button>
            </div>
            
            {/* Use Div instead of Form to avoid default submit issues */}
            <div className="flex flex-col overflow-hidden h-full">
                <div className="overflow-y-auto p-6 bg-slate-50/30 space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">จำนวนเงิน (บาท) <span className="text-red-500">*</span></label>
                        <input
                            required
                            type="number"
                            step="0.01"
                            className="w-full px-4 py-3.5 border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-2xl font-bold text-slate-900 placeholder:text-slate-300 transition-all bg-white"
                            placeholder="0.00"
                            value={formData.amount}
                            onChange={e => setFormData({...formData, amount: e.target.value})}
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">วันที่</label>
                            <input
                                type="date"
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-white transition-all"
                                value={formData.date}
                                onChange={e => setFormData({...formData, date: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">หมวดหมู่</label>
                            <select
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-white transition-all cursor-pointer"
                                value={formData.category}
                                onChange={e => setFormData({...formData, category: e.target.value})}
                            >
                                {EXPENSE_CATEGORIES.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">รายละเอียด <span className="text-red-500">*</span></label>
                        <input
                            required
                            type="text"
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-white transition-all"
                            placeholder="เช่น ค่ากาแฟ, ค่า BTS, ค่าเน็ต"
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">อ้างอิง (ถ้ามี)</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-white transition-all"
                                placeholder="เช่น เลขที่ใบเสร็จ"
                                value={formData.referenceNo}
                                onChange={e => setFormData({...formData, referenceNo: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">รูปหลักฐาน (Max 500KB)</label>
                            <div className="relative">
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer"
                                    onChange={handleFileChange}
                                />
                            </div>
                        </div>
                    </div>
                    
                    {formData.attachmentUrl && (
                        <div className="mt-2 relative w-full h-32 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-inner">
                            <img src={formData.attachmentUrl} alt="Preview" className="w-full h-full object-contain" />
                            <button 
                                type="button"
                                onClick={() => setFormData({...formData, attachmentUrl: ''})}
                                className="absolute top-2 right-2 bg-white text-slate-500 rounded-full p-1 shadow-md hover:bg-red-50 hover:text-red-500 transition-colors border border-slate-100"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-slate-100 bg-white flex gap-3 justify-end shrink-0 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={handleCloseModal}
                        className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors text-sm"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="button"
                        onClick={handleSaveTransaction}
                        disabled={isSubmitting}
                        className="px-6 py-2.5 text-white font-semibold rounded-lg transition-all shadow-lg shadow-red-500/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 text-sm bg-red-600 hover:bg-red-700 hover:-translate-y-0.5"
                    >
                        {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                        บันทึกข้อมูล
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Image View Modal */}
      {showImageModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowImageModal(null)}>
              <div className="relative max-w-3xl max-h-[90vh] w-full">
                  <img src={showImageModal} alt="Evidence" className="w-full h-full object-contain rounded-lg shadow-2xl" />
                  <button className="absolute -top-12 right-0 text-white/70 hover:text-white transition-colors p-2">
                      <X size={32} />
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};

export default TransactionsPage;
